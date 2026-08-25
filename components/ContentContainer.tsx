/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {useSettings} from '@/context';
import {parseHTML, parseJSON} from '@/lib/parse';
import {
  SPEC_FROM_VIDEO_PROMPT,
  SPEC_RESPONSE_SCHEMA,
  buildSpecAddendum,
} from '@/lib/prompts';
import {
  type RejectionReason,
  type Screening,
  VideoRejectedError,
  assertUsable,
} from '@/lib/screening';
import {currentPalette, haptic, notify} from '@/lib/telegram';
import {
  OverloadedError,
  acrossModels,
  generateText,
  generateTextStream,
  resolveModels,
} from '@/lib/textGeneration';
import {useCallback, useEffect, useRef, useState} from 'react';

interface ContentContainerProps {
  contentBasis: string;
  onLoadingStateChange?: (isLoading: boolean) => void;
}

type LoadingState = 'loading-spec' | 'loading-code' | 'ready' | 'error';

const TABS = ['app', 'spec'] as const;

export default function ContentContainer({
  contentBasis,
  onLoadingStateChange,
}: ContentContainerProps) {
  const {t, lang, apiKey} = useSettings();

  const [spec, setSpec] = useState('');
  const [code, setCode] = useState('');
  const [streamed, setStreamed] = useState('');
  const [loadingState, setLoadingState] =
    useState<LoadingState>('loading-spec');
  const [error, setError] = useState<string | null>(null);
  const [rejection, setRejection] = useState<VideoRejectedError | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  const [isEditingSpec, setIsEditingSpec] = useState(false);
  const [editedSpec, setEditedSpec] = useState('');
  const [iframeKey, setIframeKey] = useState(0);
  const [fullScreen, setFullScreen] = useState(false);

  // Generation is expensive and paid for out of the user's own quota, so it
  // must fire exactly once per mount no matter how often effects re-run.
  const startedRef = useRef(false);
  const streamTailRef = useRef<HTMLPreElement>(null);

  useEffect(() => {
    onLoadingStateChange?.(
      loadingState === 'loading-spec' || loadingState === 'loading-code',
    );
  }, [loadingState, onLoadingStateChange]);

  const generateSpecFromVideo = useCallback(
    async (videoUrl: string) => {
      const models = await resolveModels(apiKey!);
      const chain = [
        models.spec,
        ...models.chain.filter((id) => id !== models.spec),
      ];

      const response = await acrossModels(
        chain,
        (modelName) =>
          generateText({
            apiKey: apiKey!,
            modelName,
            prompt: SPEC_FROM_VIDEO_PROMPT,
            videoUrl,
            config: {
              responseMimeType: 'application/json',
              responseSchema: SPEC_RESPONSE_SCHEMA as never,
            },
          }),
        {
          onSwitch: (nextModel) =>
            setNotice(`${t.switchingModel}: ${nextModel}`),
          onWait: (waitMs) =>
            setNotice(`${t.allBusy} ${Math.round(waitMs / 1000)}s`),
        },
      );

      const screening = parseJSON(response) as Screening;
      console.info('Video screening:', screening);

      // Throws VideoRejectedError when the video breaks one of the guards.
      assertUsable(screening);

      return screening.spec;
    },
    [apiKey, t.switchingModel, t.allBusy],
  );

  const generateCodeFromSpec = useCallback(
    async (baseSpec: string) => {
      const prompt = baseSpec + buildSpecAddendum(currentPalette(), lang);
      const models = await resolveModels(apiKey!);

      // Start at the model best suited to writing code, then walk outward to
      // older, less contended ones.
      const chain = [
        models.code,
        ...models.chain.filter((id) => id !== models.code),
      ];

      const html = await acrossModels(
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

      return parseHTML(html);
    },
    [apiKey, lang, t.switchingModel, t.allBusy],
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

      const generatedSpec = await generateSpecFromVideo(contentBasis);
      setSpec(generatedSpec);
      setLoadingState('loading-code');

      const generatedCode = await generateCodeFromSpec(generatedSpec);
      setCode(generatedCode);
      setStreamed('');
      setLoadingState('ready');
      notify('success');
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
  }, [contentBasis, generateSpecFromVideo, generateCodeFromSpec, t.busyGaveUp]);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    void runGeneration();
  }, [runGeneration]);

  // Remount the preview whenever the code changes, including manual edits.
  useEffect(() => {
    if (code) setIframeKey((k) => k + 1);
  }, [code]);

  // Keep the streaming view pinned to the newest output.
  useEffect(() => {
    const el = streamTailRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [streamed]);

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
        {loadingState === 'loading-spec' ? t.loadingSpec : t.loadingCode}
      </p>
      {notice && <p className="state-notice">{notice}</p>}
      {loadingState === 'loading-code' && streamed && (
        <pre ref={streamTailRef} className="stream-tail">
          {streamed.slice(-1400)}
        </pre>
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
    };
    return messages[err.reason].replace('{lang}', err.detail ?? '');
  };

  const renderRejection = (err: VideoRejectedError) => (
    <div className="state-panel">
      <p className="state-title reject-title">{t.rejectTitle}</p>
      <p className="state-detail reject-detail">{rejectionMessage(err)}</p>
    </div>
  );

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
        <button
          className="button-secondary preview-toggle"
          onClick={() => {
            haptic();
            setFullScreen((v) => !v);
          }}>
          {fullScreen ? t.closeFull : t.openFull}
        </button>
      </div>
    );
  };

  const renderSpec = () => {
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
      <div className="pane">
        <div className="spec-text">{spec}</div>
        <div className="pane-actions">
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
        </div>
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
      </div>

      <div className="tab-body">
        {activeTab === 0 && renderApp()}
        {activeTab === 1 && renderSpec()}
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
          height: 100dvh;
          left: 0;
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

        .preview-toggle {
          bottom: 0.65rem;
          font-size: 0.8rem;
          min-height: 36px;
          opacity: 0.9;
          padding: 0.35rem 0.7rem;
          position: absolute;
          right: 0.65rem;
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
