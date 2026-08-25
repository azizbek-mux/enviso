/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {useSettings} from '@/context';
import {parseHTML, parseJSON} from '@/lib/parse';
import {RefusedIllustration} from '@/components/Illustrations';
import {creditsFromFacts} from '@/lib/creditsFallback';
import {
  EXPLAINER_SECTIONS,
  buildSectionPrompt,
  buildShellPrompt,
  clearMarkers,
  stitchSection,
} from '@/lib/explainerPrompts';
import {
  JSON_ONLY_INSTRUCTION,
  PAPER_RESPONSE_SCHEMA,
  SPEC_FROM_PAPER_PROMPT,
  SPEC_FROM_VIDEO_PROMPT,
  SPEC_RESPONSE_SCHEMA,
  VARIATIONS,
  type VariationKind,
  buildSpecAddendum,
  paperUrlInstruction,
} from '@/lib/prompts';
import {
  type RejectionReason,
  type Screening,
  VideoRejectedError,
  assertUsable,
} from '@/lib/screening';
import {type SaveOutcome, saveHtml, toFileName} from '@/lib/download';
import {saveHistory} from '@/lib/history';
import {shareLink} from '@/lib/deeplink';
import {expandPaperUrl, type Source} from '@/lib/source';
import {currentPalette, haptic, notify, shareToChat} from '@/lib/telegram';
import {
  OverloadedError,
  acrossModels,
  filePart,
  generateText,
  generateTextStream,
  resolveModels,
  videoPart,
} from '@/lib/textGeneration';
import {useCallback, useEffect, useRef, useState} from 'react';

interface ContentContainerProps {
  source: Source;
  /** A finished generation reopened from history, rather than a new one. */
  restored?: {spec: string; code: string; summaryUz?: string; summaryEn?: string; title?: string};
  onLoadingStateChange?: (isLoading: boolean) => void;
}

type LoadingState = 'loading-spec' | 'loading-code' | 'ready' | 'error';

const TABS = ['app', 'spec'] as const;

export default function ContentContainer({
  source,
  restored,
  onLoadingStateChange,
}: ContentContainerProps) {
  const {t, lang, apiKey} = useSettings();

  const [spec, setSpec] = useState(restored?.spec ?? '');
  const [code, setCode] = useState(restored?.code ?? '');
  const factsRef = useRef('');
  const [summary, setSummary] = useState<{uz?: string; en?: string; title?: string}>(
    restored
      ? {uz: restored.summaryUz, en: restored.summaryEn, title: restored.title}
      : {},
  );
  const [streamed, setStreamed] = useState('');
  const [loadingState, setLoadingState] = useState<LoadingState>(
    restored ? 'ready' : 'loading-spec',
  );
  const [showPlan, setShowPlan] = useState(false);
  const [saveState, setSaveState] = useState<SaveOutcome | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rejection, setRejection] = useState<VideoRejectedError | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  const [isEditingSpec, setIsEditingSpec] = useState(false);
  const [editedSpec, setEditedSpec] = useState('');
  const [iframeKey, setIframeKey] = useState(0);
  // Mounting means Generate was just pressed, so the output takes the screen
  // immediately -- the wait and the result both deserve the whole viewport.
  const [fullScreen, setFullScreen] = useState(true);

  // Generation is expensive and paid for out of the user's own quota, so it
  // must fire exactly once per mount no matter how often effects re-run.
  const startedRef = useRef(false);

  useEffect(() => {
    onLoadingStateChange?.(
      loadingState === 'loading-spec' || loadingState === 'loading-code',
    );
  }, [loadingState, onLoadingStateChange]);

  /**
   * Build the screening request for whichever source we were given.
   *
   * A file or a video can use structured output, but the URL path needs the
   * retrieval tool, and tools do not combine reliably with a response schema
   * -- so that one asks for JSON in words and leans on the tolerant parser.
   */
  const screeningRequest = useCallback(() => {
    if (source.kind === 'video') {
      return {
        prompt: SPEC_FROM_VIDEO_PROMPT,
        attachments: [videoPart(source.url)],
        config: {
          responseMimeType: 'application/json',
          responseSchema: SPEC_RESPONSE_SCHEMA as never,
        },
      };
    }

    if (source.via === 'file') {
      return {
        prompt: SPEC_FROM_PAPER_PROMPT,
        attachments: [filePart(source.mimeType, source.base64)],
        config: {
          responseMimeType: 'application/json',
          responseSchema: PAPER_RESPONSE_SCHEMA as never,
        },
      };
    }

    return {
      prompt:
        SPEC_FROM_PAPER_PROMPT +
        paperUrlInstruction(expandPaperUrl(source.url)) +
        JSON_ONLY_INSTRUCTION,
      attachments: [],
      config: {tools: [{urlContext: {}}]},
    };
  }, [source]);

  const generateSpecFromSource = useCallback(async () => {
    const models = await resolveModels(apiKey!);
    const chain = [
      models.spec,
      ...models.chain.filter((id) => id !== models.spec),
    ];
    const request = screeningRequest();

    const response = await acrossModels(
      chain,
      (modelName) =>
        generateText({
          apiKey: apiKey!,
          modelName,
          prompt: request.prompt,
          attachments: request.attachments,
          config: request.config,
        }),
      {
        onSwitch: (nextModel) => setNotice(`${t.switchingModel}: ${nextModel}`),
        onWait: (waitMs) =>
          setNotice(`${t.allBusy} ${Math.round(waitMs / 1000)}s`),
      },
    );

    const screening = parseJSON(response) as Screening;
    console.info('Screening:', screening);

    // Throws VideoRejectedError when the source breaks one of the guards.
    assertUsable(screening, source.kind);

    // Extracted numbers drive every later visual, so they are kept verbatim.
    factsRef.current = screening.facts ?? '';

    // The summary is ready long before the app is, so it fills the wait.
    setSummary({
      uz: screening.summaryUz,
      en: screening.summaryEn,
      title: screening.title,
    });

    return screening.spec;
  }, [apiKey, source, screeningRequest, t.switchingModel, t.allBusy]);

  /** One streamed call against the best model the key can reach. */
  const runOnBestModel = useCallback(
    async (prompt: string) => {
      const models = await resolveModels(apiKey!);
      const chain = [
        models.code,
        ...models.chain.filter((id) => id !== models.code),
      ];

      return acrossModels(
        chain,
        (modelName) =>
          generateTextStream({
            apiKey: apiKey!,
            modelName,
            prompt,
            onChunk: setStreamed,
          }),
        {
          onSwitch: (nextModel) => {
            setStreamed('');
            setNotice(`${t.switchingModel}: ${nextModel}`);
          },
          onWait: (waitMs) =>
            setNotice(`${t.allBusy} ${Math.round(waitMs / 1000)}s`),
        },
      );
    },
    [apiKey, t.switchingModel, t.allBusy],
  );

  /**
   * Explainer sites are written in parts: a shell, then each section.
   *
   * One generation has one output budget, and a whole site does not fit in it
   * -- the hero, the 3D scene, every chart and all the prose end up competing
   * for the same ceiling. Per-section calls each get their own.
   */
  const generateExplainer = useCallback(
    async (baseSpec: string) => {
      const facts = factsRef.current;
      const total = EXPLAINER_SECTIONS.length + 1;

      setNotice(`${t.buildingPart} 1/${total}`);
      const shell = parseHTML(
        await runOnBestModel(buildShellPrompt(baseSpec, facts, lang)),
      );

      let document = shell;

      for (let i = 0; i < EXPLAINER_SECTIONS.length; i++) {
        const section = EXPLAINER_SECTIONS[i];
        setNotice(`${t.buildingPart} ${i + 2}/${total}`);

        const prompt = buildSectionPrompt(section, baseSpec, facts, shell);
        let html: string | null = null;

        // One retry before giving up. Silently skipping cost a real explainer
        // its credits section, which is where the authors and the citation
        // live -- the worst part of a research page to lose.
        for (let attempt = 0; attempt < 2 && html === null; attempt++) {
          try {
            html = parseHTML(await runOnBestModel(prompt));
          } catch (err) {
            console.warn(
              `Section "${section.key}" failed (attempt ${attempt + 1}):`,
              err,
            );
          }
        }

        if (html) {
          document = stitchSection(document, section.key, html);
          // Show the site filling in rather than a blank wait.
          setCode(clearMarkers(document));
        } else if (section.key === 'credits') {
          // Attribution is pure data, so it never needs a model to survive.
          document = stitchSection(
            document,
            section.key,
            creditsFromFacts(facts),
          );
        }
      }

      return clearMarkers(document);
    },
    [runOnBestModel, lang, t.buildingPart],
  );

  const generateCodeFromSpec = useCallback(
    async (baseSpec: string) => {
      if (source.kind === 'paper') return generateExplainer(baseSpec);

      const prompt = baseSpec + buildSpecAddendum(currentPalette(), lang, 'video');
      return parseHTML(await runOnBestModel(prompt));
    },
    [source.kind, lang, runOnBestModel, generateExplainer],
  );

  const runGeneration = useCallback(async () => {
    try {
      setLoadingState('loading-spec');
      setError(null);
      setRejection(null);
      setNotice(null);
      setSpec('');
      setCode('');
      setStreamed('');

      const generatedSpec = await generateSpecFromSource();
      setSpec(generatedSpec);
      setLoadingState('loading-code');

      const generatedCode = await generateCodeFromSpec(generatedSpec);
      setCode(generatedCode);
      setStreamed('');
      setLoadingState('ready');
      notify('success');
      void remember(generatedSpec, generatedCode);
    } catch (err) {
      if (err instanceof VideoRejectedError) {
        console.info('Video rejected:', err.reason, err.detail ?? '');
        setRejection(err);
        setLoadingState('error');
        notify('warning');
        return;
      }

      console.error('Generation failed:', err);
      setError(
        err instanceof OverloadedError
          ? t.busyGaveUp
          : err instanceof Error
            ? err.message
            : String(err),
      );
      setLoadingState('error');
      notify('error');
    }
  }, [generateSpecFromSource, generateCodeFromSpec, t.busyGaveUp]);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    // A restored item is already finished; regenerating it would spend quota
    // to reproduce something the user is looking at.
    if (restored) return;
    void runGeneration();
  }, [runGeneration, restored]);

  useEffect(() => {
    if (!fullScreen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [fullScreen]);

  // Remount the preview whenever the code changes, including manual edits.
  useEffect(() => {
    if (code) setIframeKey((k) => k + 1);
  }, [code]);

  /** Store a finished generation so closing the app does not lose it. */
  const remember = async (finalSpec: string, finalCode: string) => {
    const sourceUrl =
      source.kind === 'video'
        ? source.url
        : source.via === 'url'
          ? source.url
          : undefined;

    await saveHistory({
      kind: source.kind,
      title: summaryTitle(),
      sourceUrl,
      spec: finalSpec,
      code: finalCode,
      summaryUz: summary.uz,
      summaryEn: summary.en,
    });
  };

  const summaryTitle = () =>
    summary.title?.trim() ||
    (source.kind === 'video'
      ? source.url
      : source.via === 'url'
        ? source.url
        : source.name);

  /** Rebuild from the same plan with a nudge -- one call, not two. */
  const handleVariation = async (kind: VariationKind) => {
    if (isBusy || !spec) return;
    haptic('medium');
    setActiveTab(0);

    try {
      setLoadingState('loading-code');
      setError(null);
      setStreamed('');
      const generated = await generateCodeFromSpec(spec + VARIATIONS[kind]);
      setCode(generated);
      setStreamed('');
      setLoadingState('ready');
      notify('success');
      void remember(spec, generated);
    } catch (err) {
      console.error('Variation failed:', err);
      setError(err instanceof Error ? err.message : String(err));
      setLoadingState('error');
      notify('error');
    }
  };

  const handleSave = async () => {
    if (!code) return;
    haptic('medium');
    const outcome = await saveHtml(toFileName(summaryTitle()), code);
    setSaveState(outcome);
    notify(outcome === 'failed' ? 'error' : 'success');
  };

  const saveLabel =
    saveState === 'saved'
      ? t.saved
      : saveState === 'copied'
        ? t.savedCopied
        : saveState === 'failed'
          ? t.saveFailedMsg
          : t.save;

  const canShare = shareLink(source) !== null;

  const handleShare = () => {
    const link = shareLink(source);
    if (!link) return;
    haptic();
    shareToChat(link, `${t.shareText} ${summaryTitle()}`);
  };

  const handleRetry = () => {
    haptic();
    void runGeneration();
  };

  const handleSpecSave = async () => {
    const trimmed = editedSpec.trim();
    setIsEditingSpec(false);

    if (!trimmed || trimmed === spec) return;

    haptic();
    setSpec(trimmed);
    setActiveTab(0);

    try {
      setLoadingState('loading-code');
      setError(null);
      setStreamed('');
      const generatedCode = await generateCodeFromSpec(trimmed);
      setCode(generatedCode);
      setStreamed('');
      setLoadingState('ready');
      notify('success');
    } catch (err) {
      console.error('Rebuild failed:', err);
      setError(err instanceof Error ? err.message : String(err));
      setLoadingState('error');
      notify('error');
    }
  };

  const isBusy =
    loadingState === 'loading-spec' || loadingState === 'loading-code';

  const renderProgress = () => (
    <div className="state-panel">
      <div className="spinner" />
      <p className="state-text">
        {loadingState === 'loading-spec'
          ? source.kind === 'video'
            ? t.loadingSpec
            : t.loadingPaper
          : t.loadingCode}
      </p>
      {notice && <p className="state-notice">{notice}</p>}

      {/* The plan lands well before the app does, so the wait is spent
          reading what is coming rather than watching a spinner. */}
      {loadingState === 'loading-code' && activeSummary() && (
        <div className="wait-summary">
          {summary.title && <p className="wait-title display">{summary.title}</p>}
          <p className="wait-text">{activeSummary()}</p>
          {streamed && (
            <p className="wait-progress">
              {t.buildingNow} {Math.round(streamed.length / 1024)} KB
            </p>
          )}
        </div>
      )}

      <p className="hint state-sub">{t.stillWorking}</p>
    </div>
  );

  const rejectionMessage = (err: VideoRejectedError) => {
    const messages: Record<RejectionReason, string> = {
      tooLong: t.rejectTooLong,
      language: t.rejectLanguage,
      music: t.rejectMusic,
      noisy: t.rejectNoisy,
      notEducational: t.rejectNotEducational,
      unreadable: t.rejectUnreadable,
      notResearch: t.rejectNotResearch,
    };
    return messages[err.reason].replace('{lang}', err.detail ?? '');
  };

  const renderRejection = (err: VideoRejectedError) => (
    <div className="state-panel">
      <RefusedIllustration className="state-art" />
      <p className="state-title reject-title display">{t.rejectTitle}</p>
      <p className="state-detail reject-detail">{rejectionMessage(err)}</p>
    </div>
  );

  const activeSummary = () => (lang === 'uz' ? summary.uz : summary.en);

  const renderError = () => (
    <div className="state-panel">
      <p className="state-title">{t.error}</p>
      <p className="state-detail">{error}</p>
      <button className="button-primary" onClick={handleRetry}>
        {t.retry}
      </button>
    </div>
  );

  const renderApp = () => {
    if (rejection) return renderRejection(rejection);
    if (loadingState === 'error') return renderError();
    if (loadingState !== 'ready') return renderProgress();
    return (
      <div className={fullScreen ? 'preview preview-full' : 'preview'}>
        <iframe
          key={iframeKey}
          srcDoc={code}
          title="generated-app"
          sandbox="allow-scripts allow-popups"
          className="preview-frame"
        />
      </div>
    );
  };

  /**
   * The learner-facing tab.
   *
   * It used to show the raw build brief -- English, technical, written for a
   * developer -- inside an app whose users are Uzbek students. The plan is
   * still reachable, but it is now a disclosure rather than the default.
   */
  const renderAbout = () => {
    if (rejection) return renderRejection(rejection);
    if (loadingState === 'loading-spec') return renderProgress();
    if (loadingState === 'error' && !spec) return renderError();

    if (isEditingSpec) {
      return (
        <div className="pane">
          <textarea
            className="spec-editor"
            value={editedSpec}
            onChange={(e) => setEditedSpec(e.target.value)}
          />
          <div className="pane-actions">
            <button
              className="button-primary"
              onClick={handleSpecSave}
              disabled={isBusy}>
              {t.saveRegenerate}
            </button>
            <button
              className="button-secondary"
              onClick={() => setIsEditingSpec(false)}>
              {t.cancel}
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="pane about-pane">
        <div className="about-scroll">
          {summary.title && <h3 className="about-title display">{summary.title}</h3>}
          <div className="rule" />
          <p className="about-heading">{t.aboutHeading}</p>
          <p className="about-text">{activeSummary() || spec.slice(0, 400)}</p>

          {loadingState === 'ready' && (
            <div className="variations">
              <p className="about-heading">{t.variationsTitle}</p>
              <div className="variation-row">
                <button
                  className="button-secondary variation"
                  disabled={isBusy}
                  onClick={() => handleVariation('simpler')}>
                  {t.variationSimpler}
                </button>
                <button
                  className="button-secondary variation"
                  disabled={isBusy}
                  onClick={() => handleVariation('visual')}>
                  {t.variationVisual}
                </button>
                <button
                  className="button-secondary variation"
                  disabled={isBusy}
                  onClick={() => handleVariation('quiz')}>
                  {t.variationQuiz}
                </button>
              </div>
            </div>
          )}

          <button
            className="button-ghost plan-toggle"
            onClick={() => {
              haptic();
              setShowPlan((open) => !open);
            }}>
            {showPlan ? `− ${t.tabPlan}` : `+ ${t.tabPlan}`}
          </button>

          {showPlan && (
            <>
              <div className="spec-text">{spec}</div>
              <button
                className="button-secondary"
                disabled={isBusy || !spec}
                onClick={() => {
                  haptic();
                  setEditedSpec(spec);
                  setIsEditingSpec(true);
                }}>
                {t.edit}
              </button>
            </>
          )}
        </div>

        {loadingState === 'ready' && (
          <div className="pane-actions">
            <button className="button-primary" onClick={handleSave}>
              {saveLabel}
            </button>
            {canShare && (
              <button className="button-secondary" onClick={handleShare}>
                {t.share}
              </button>
            )}
          </div>
        )}
      </div>
    );
  };

  const labels = [t.tabApp, t.tabSpec];

  return (
    <div className={fullScreen ? 'container container-full' : 'container'}>
      <div className="tabs" role="tablist">
        {TABS.map((tab, index) => (
          <button
            key={tab}
            role="tab"
            aria-selected={activeTab === index}
            className={activeTab === index ? 'tab tab-active' : 'tab'}
            onClick={() => {
              haptic();
              setActiveTab(index);
            }}>
            {labels[index]}
          </button>
        ))}
        <button
          className="tab-action"
          aria-label={fullScreen ? t.closeFull : t.openFull}
          title={fullScreen ? t.closeFull : t.openFull}
          onClick={() => {
            haptic();
            setFullScreen((v) => !v);
          }}>
          {fullScreen ? '✕' : '⤡'}
        </button>
      </div>

      <div className="tab-body">
        {activeTab === 0 && renderApp()}
        {activeTab === 1 && renderAbout()}
      </div>

      <style>{`
        .container {
          border: 1px solid var(--color-border);
          border-radius: var(--radius);
          display: flex;
          flex-direction: column;
          min-height: 420px;
          height: 100%;
          overflow: hidden;
        }

        .container-full {
          background: var(--color-background);
          border: none;
          border-radius: 0;
          bottom: 0;
          /* Telegram's usable height, which is not the same as the viewport
             once its own header is accounted for. */
          height: var(--tg-viewport-height, 100dvh);
          left: 0;
          padding-bottom: env(safe-area-inset-bottom);
          position: fixed;
          right: 0;
          top: 0;
          z-index: 50;
        }

        .tabs {
          border-bottom: 1px solid var(--color-border);
          display: flex;
          flex: 0 0 auto;
          gap: 0.25rem;
          padding: 0.35rem;
        }

        .tab {
          background: transparent;
          border-radius: 8px;
          color: var(--color-hint);
          flex: 1;
          font-size: 0.9rem;
          min-height: 38px;
          padding: 0.4rem 0.5rem;
        }

        .tab-active {
          background: var(--color-surface);
          color: var(--color-text);
        }

        .tab-body {
          display: flex;
          flex: 1;
          flex-direction: column;
          min-height: 0;
        }

        .pane {
          display: flex;
          flex: 1;
          flex-direction: column;
          gap: 0.6rem;
          min-height: 0;
          padding: 0.75rem;
        }

        .pane-actions {
          align-items: center;
          display: flex;
          flex: 0 0 auto;
          flex-wrap: wrap;
          gap: 0.5rem;
        }

        .preview {
          flex: 1;
          min-height: 0;
          position: relative;
        }

        .preview-frame {
          border: none;
          display: block;
          height: 100%;
          width: 100%;
        }

        .tab-action {
          background: transparent;
          border-radius: 8px;
          color: var(--color-hint);
          flex: 0 0 auto;
          font-size: 1rem;
          line-height: 1;
          min-height: 38px;
          padding: 0.4rem 0.7rem;
        }

        .tab-action:active {
          background: var(--color-surface);
        }

        .spec-editor {
          flex: 1;
          font-family: var(--font-primary);
          font-size: 15px;
          line-height: 1.5;
          min-height: 240px;
          overflow: auto;
          resize: none;
          white-space: pre-wrap;
        }

        .spec-text {
          flex: 1;
          line-height: 1.6;
          min-height: 0;
          overflow: auto;
          white-space: pre-wrap;
        }

        .state-art {
          color: var(--color-hint);
          height: auto;
          max-width: 150px;
          opacity: 0.9;
        }

        .about-pane {
          gap: 0.9rem;
        }

        .about-scroll {
          display: flex;
          flex: 1;
          flex-direction: column;
          gap: 0.75rem;
          min-height: 0;
          overflow: auto;
        }

        .about-title {
          font-size: 1.25rem;
        }

        .about-heading {
          color: var(--color-hint);
          font-size: 0.75rem;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .about-text {
          font-size: 1rem;
          line-height: 1.6;
        }

        .variations {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .variation-row {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
        }

        .variation {
          flex: 1 1 30%;
          font-size: 0.85rem;
          font-weight: 500;
          min-height: 40px;
          padding: 0.4rem 0.6rem;
        }

        .plan-toggle {
          align-self: flex-start;
          padding-left: 0;
        }

        .wait-summary {
          background: var(--color-surface);
          border-radius: var(--radius);
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          max-width: 42ch;
          padding: 0.9rem 1rem;
          text-align: left;
        }

        .wait-title {
          font-size: 1.05rem;
        }

        .wait-text {
          font-size: 0.92rem;
          line-height: 1.55;
        }

        .wait-progress {
          color: var(--color-hint);
          font-size: 0.75rem;
        }

        .state-panel {
          align-items: center;
          display: flex;
          flex: 1;
          flex-direction: column;
          gap: 0.75rem;
          justify-content: center;
          padding: 1.5rem 1rem;
          text-align: center;
        }

        .state-text {
          font-size: 1rem;
          font-weight: 600;
        }

        .reject-title {
          color: var(--color-text);
        }

        .reject-detail {
          font-size: 0.95rem;
          max-width: 40ch;
        }

        .state-title {
          color: var(--color-error);
          font-size: 1.1rem;
          font-weight: 700;
        }

        .state-detail {
          color: var(--color-hint);
          font-size: 0.9rem;
          max-width: 34ch;
          word-break: break-word;
        }

        .state-notice {
          background: var(--color-surface);
          border-radius: 8px;
          color: var(--color-hint);
          font-size: 0.8rem;
          padding: 0.4rem 0.65rem;
        }

        .state-sub {
          font-size: 0.8rem;
        }

        .stream-tail {
          background: var(--color-surface);
          border-radius: 8px;
          color: var(--color-hint);
          font-family: var(--font-mono);
          font-size: 10px;
          line-height: 1.4;
          margin: 0;
          max-height: 130px;
          overflow: hidden;
          padding: 0.6rem;
          text-align: left;
          white-space: pre-wrap;
          width: 100%;
          word-break: break-all;
        }
      `}</style>
    </div>
  );
}
