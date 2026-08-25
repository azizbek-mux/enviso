/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import ContentContainer from '@/components/ContentContainer';
import HistoryList from '@/components/HistoryList';
import {EmptyIllustration, PaperIllustration} from '@/components/Illustrations';
import KeyGate from '@/components/KeyGate';
import {useSettings} from '@/context';
import {LANGUAGES, type Lang} from '@/lib/i18n';
import {lookupPaper} from '@/lib/paperLookup';
import {isTooLong} from '@/lib/screening';
import {
  type LinkHint,
  MAX_PDF_BYTES,
  type Source,
  type SourceKind,
  linkHintFor,
  looksLikeUrl,
  readFileAsBase64,
} from '@/lib/source';
import {decodeSource} from '@/lib/deeplink';
import {type HistoryItem, listHistory} from '@/lib/history';
import {
  haptic,
  isTelegram,
  setMainButton,
  showBackButton,
  startParam,
} from '@/lib/telegram';
import {
  getVideoDurationSeconds,
  getYoutubeEmbedUrl,
  validateYoutubeUrl,
} from '@/lib/youtube';
import {useEffect, useRef, useState} from 'react';

export default function App() {
  const {t, lang, setLang, apiKey, keyLoading} = useSettings();

  const [mode, setMode] = useState<SourceKind>('video');
  const [source, setSource] = useState<Source | null>(null);
  const [pdf, setPdf] = useState<{name: string; mimeType: string; base64: string} | null>(null);
  const [linkHint, setLinkHint] = useState<LinkHint | null>(null);
  const [resolved, setResolved] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [restored, setRestored] = useState<HistoryItem | null>(null);
  const [urlError, setUrlError] = useState<string | null>(null);
  const [contentLoading, setContentLoading] = useState(false);
  const [reloadCounter, setReloadCounter] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [checkingVideo, setCheckingVideo] = useState(false);
  // A source that passed its checks but is waiting for the user to add a key.
  const [pendingSource, setPendingSource] = useState<Source | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const videoUrl = source?.kind === 'video' ? source.url : '';

  const busy = contentLoading || checkingVideo;

  const handleSubmit = async () => {
    if (busy) return;
    haptic('medium');
    setUrlError(null);

    const next =
      mode === 'video' ? await prepareVideo() : await preparePaper();
    if (!next) return;

    // The key is asked for here rather than on the first screen: by now the
    // user has chosen something and wants a result, so the detour to AI Studio
    // buys them one instead of blocking a result they have not imagined yet.
    if (!apiKey) {
      setPendingSource(next);
      return;
    }

    start(next);
  };

  /** Validate a YouTube URL and check its length before anything is spent. */
  const prepareVideo = async (): Promise<Source | null> => {
    const value = inputRef.current?.value.trim() || '';
    if (!value) {
      inputRef.current?.focus();
      return null;
    }

    const {isValid} = await validateYoutubeUrl(value);
    if (!isValid) {
      setUrlError(t.invalidUrl);
      return null;
    }

    // Length is checked here, before Gemini sees anything: watching an hour of
    // video is the most expensive request the app can make, and refusing it
    // afterwards would already have spent the user's quota.
    setCheckingVideo(true);
    const seconds = await getVideoDurationSeconds(value);
    setCheckingVideo(false);

    if (isTooLong(seconds)) {
      setUrlError(`${t.rejectTooLong} (${Math.round((seconds ?? 0) / 60)} min)`);
      return null;
    }

    return {kind: 'video', url: value};
  };

  /** An uploaded PDF wins over a link: it is the more reliable of the two. */
  const preparePaper = async (): Promise<Source | null> => {
    if (pdf) {
      return {kind: 'paper', via: 'file', ...pdf};
    }

    const value = inputRef.current?.value.trim() || '';
    if (!value || !looksLikeUrl(value)) {
      setUrlError(t.paperNeedInput);
      return null;
    }

    // A PubMed page is only ever an abstract and a DOI is only a redirect, so
    // look the paper up and hand the model somewhere the full text lives.
    setCheckingVideo(true);
    const record = await lookupPaper(value);
    setCheckingVideo(false);

    if (record?.title) setResolved(record.title);

    if (record?.openAccess) {
      // The warning was about the link, and the link has been replaced.
      setLinkHint(null);
    } else if (record) {
      // Known in advance, so say it now rather than after a spent generation.
      setLinkHint('paywall');
    }

    return {
      kind: 'paper',
      via: 'url',
      url: value,
      candidates: record?.candidates,
      title: record?.title,
    };
  };

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setUrlError(null);

    if (file.size > MAX_PDF_BYTES) {
      setPdf(null);
      setUrlError(t.paperTooBig);
      return;
    }

    try {
      setPdf(await readFileAsBase64(file));
      // The PDF supersedes the link, so its warning no longer applies.
      setLinkHint(null);
      haptic();
    } catch (error) {
      console.error('Could not read the PDF:', error);
      setUrlError(t.paperTooBig);
    }
  };

  const mainButtonLabel = checkingVideo
    ? t.checkingVideo
    : contentLoading
      ? t.generating
      : source
        ? t.regenerate
        : mode === 'video'
          ? t.generate
          : t.generatePaper;

  // Telegram's bottom bar is where a Mini App user reaches for the primary
  // action, so the in-page button steps aside whenever it exists.
  useEffect(() => {
    if (!isTelegram || panelOpen) return;
    return setMainButton(
      {text: mainButtonLabel, visible: true, busy: busy},
      () => void handleSubmit(),
    );
  });

  const hintMessage = (hint: LinkHint) =>
    ({
      paywall: t.hintPaywall,
      abstractOnly: t.hintAbstractOnly,
      blocked: t.hintBlocked,
      doi: t.hintDoi,
    })[hint];

  const switchMode = (next: SourceKind) => {
    if (next === mode) return;
    haptic();
    setMode(next);
    setSource(null);
    setPdf(null);
    setUrlError(null);
    setLinkHint(null);
    setResolved(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  const refreshHistory = () => {
    void listHistory().then(setHistory);
  };

  useEffect(refreshHistory, []);

  // Reload the list whenever a generation finishes, so a new app appears.
  useEffect(() => {
    if (!contentLoading) refreshHistory();
  }, [contentLoading]);

  /** Opened from a shared link: build straight from what the sender chose. */
  useEffect(() => {
    const param = startParam();
    if (!param) return;

    const shared = decodeSource(param);
    if (!shared) return;

    // decodeSource only ever yields link-backed sources, since a PDF cannot
    // travel through a start parameter.
    setMode(shared.kind);
    if (inputRef.current) inputRef.current.value = shared.url;
    setSource(shared);
    setReloadCounter((c) => c + 1);
  }, []);

  const openFromHistory = (item: HistoryItem) => {
    haptic();
    setRestored(item);
    setSource(
      item.kind === 'video'
        ? {kind: 'video', url: item.sourceUrl ?? ''}
        : item.sourceUrl
          ? {kind: 'paper', via: 'url', url: item.sourceUrl}
          : {kind: 'paper', via: 'file', name: item.title, mimeType: 'application/pdf', base64: ''},
    );
    setReloadCounter((c) => c + 1);
  };

  const start = (next: Source) => {
    setPendingSource(null);
    setRestored(null);
    setSource(next);
    // Bumping the key remounts ContentContainer, which restarts generation.
    setReloadCounter((c) => c + 1);
  };

  const panelOpen = showSettings || pendingSource !== null;

  const closePanel = () => {
    setShowSettings(false);
    setPendingSource(null);
  };

  // Telegram's own back button is where a Mini App user looks first.
  useEffect(() => {
    if (!panelOpen) return;
    return showBackButton(closePanel);
  }, [panelOpen]);

  const handleLanguage = (next: Lang) => {
    haptic();
    setLang(next);
  };

  const header = (
    <header className="header">
      <div className="brand">
        <h1 className="title display">Video &rarr; Learning App</h1>
        <p className="hint subtitle">{t.subtitle}</p>
      </div>
      <div className="header-actions">
        <div className="lang-toggle" role="group">
          {LANGUAGES.map(({code, label}) => (
            <button
              key={code}
              className={lang === code ? 'lang-option active' : 'lang-option'}
              aria-pressed={lang === code}
              onClick={() => handleLanguage(code)}>
              {label}
            </button>
          ))}
        </div>
        {(apiKey || panelOpen) && (
          <button
            className="button-ghost settings-button"
            aria-label={panelOpen ? t.back : t.settings}
            title={panelOpen ? t.back : t.settings}
            onClick={() => {
              haptic();
              if (panelOpen) closePanel();
              else setShowSettings(true);
            }}>
            {panelOpen ? '←' : '⚙'}
          </button>
        )}
      </div>
    </header>
  );

  if (!keyLoading && panelOpen) {
    return (
      <div className="app">
        {header}
        <KeyGate
          key={pendingSource ? 'gate' : 'settings'}
          pending={pendingSource !== null}
          onClose={closePanel}
          onSaved={pendingSource ? () => start(pendingSource) : undefined}
        />
        <Styles />
      </div>
    );
  }

  return (
    <div className="app">
      {header}

      <nav className="mode-switch" role="tablist">
        {(['video', 'paper'] as const).map((option) => (
          <button
            key={option}
            role="tab"
            aria-selected={mode === option}
            className={mode === option ? 'mode-option active' : 'mode-option'}
            onClick={() => switchMode(option)}>
            {option === 'video' ? t.modeVideo : t.modePaper}
          </button>
        ))}
      </nav>

      <section className="controls">
        <label className="field-label" htmlFor="source-url">
          {mode === 'video' ? t.inputLabel : t.paperLabel}
        </label>
        <input
          ref={inputRef}
          id="source-url"
          type="url"
          inputMode="url"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          placeholder={
            mode === 'video' ? t.inputPlaceholder : t.paperPlaceholder
          }
          disabled={busy}
          onChange={(e) => {
            setUrlError(null);
            setResolved(null);
            setLinkHint(
              mode === 'paper' && !pdf ? linkHintFor(e.target.value) : null,
            );
          }}
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
        />

        {resolved && (
          <p className="field-resolved">
            {t.paperFound}: {resolved}
          </p>
        )}

        {linkHint && <p className="field-warning">{hintMessage(linkHint)}</p>}

        {mode === 'paper' && (
          <div className="upload-row">
            <span className="hint">{t.paperOr}</span>
            <button
              className="button-secondary upload-button"
              disabled={busy}
              onClick={() => fileRef.current?.click()}>
              {pdf ? `${t.paperChosen}: ${pdf.name}` : t.paperUpload}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="application/pdf,.pdf"
              hidden
              onChange={(e) => handleFile(e.target.files?.[0])}
            />
          </div>
        )}

        {urlError && <p className="field-error">{urlError}</p>}

        {!isTelegram && (
          <button
            className="button-primary generate"
            onClick={handleSubmit}
            disabled={busy}>
            {mainButtonLabel}
          </button>
        )}
      </section>

      {mode === 'video' && (
        <section className="video">
          {videoUrl ? (
            <iframe
              className="video-frame"
              src={getYoutubeEmbedUrl(videoUrl)}
              title="source-video"
              allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : (
            <div className="video-placeholder hint">{t.videoPlaceholder}</div>
          )}
        </section>
      )}

      <section className="output">
        {source ? (
          <ContentContainer
            key={reloadCounter}
            source={source}
            restored={restored ?? undefined}
            onLoadingStateChange={setContentLoading}
          />
        ) : (
          <div className="output-placeholder">
            {mode === 'video' ? (
              <EmptyIllustration className="placeholder-art" />
            ) : (
              <PaperIllustration className="placeholder-art" />
            )}
            <p className="hint">
              {mode === 'video' ? t.contentPlaceholder : t.paperPlaceholderText}
            </p>
            <ol className="intro-steps">
              <li>{mode === 'video' ? t.introStep1 : t.paperStep1}</li>
              <li>{mode === 'video' ? t.introStep2 : t.paperStep2}</li>
              <li>{mode === 'video' ? t.introStep3 : t.paperStep3}</li>
            </ol>
          </div>
        )}
      </section>

      <HistoryList
        items={history}
        onOpen={openFromHistory}
        onChanged={refreshHistory}
      />

      <Styles />
    </div>
  );
}

function Styles() {
  return (
    <style>{`
      .app {
        display: flex;
        flex-direction: column;
        gap: 1rem;
        margin: 0 auto;
        max-width: 720px;
        padding: 1rem 1rem calc(1.5rem + env(safe-area-inset-bottom));
        width: 100%;
      }

      .header {
        align-items: flex-start;
        display: flex;
        gap: 0.75rem;
        justify-content: space-between;
      }

      .title {
        font-size: 1.4rem;
      }

      .placeholder-art {
        color: var(--color-hint);
        height: auto;
        max-width: 140px;
        opacity: 0.85;
      }

      .subtitle {
        margin-top: 0.2rem;
      }

      .header-actions {
        align-items: center;
        display: flex;
        flex: 0 0 auto;
        gap: 0.35rem;
      }

      .lang-toggle {
        background: var(--color-surface);
        border-radius: 999px;
        display: flex;
        padding: 2px;
      }

      .lang-option {
        background: transparent;
        border-radius: 999px;
        color: var(--color-hint);
        font-size: 0.75rem;
        font-weight: 700;
        min-height: 30px;
        padding: 0.2rem 0.55rem;
      }

      .lang-option.active {
        background: var(--color-accent);
        color: var(--color-accent-text);
      }

      .settings-button {
        font-size: 1.15rem;
        line-height: 1;
        min-height: 32px;
        padding: 0.2rem 0.35rem;
      }

      .mode-switch {
        background: var(--color-surface);
        border-radius: 999px;
        display: flex;
        gap: 2px;
        padding: 3px;
      }

      .mode-option {
        background: transparent;
        border-radius: 999px;
        color: var(--color-hint);
        flex: 1;
        font-size: 0.9rem;
        min-height: 38px;
        padding: 0.35rem 0.75rem;
      }

      .mode-option.active {
        background: var(--color-background);
        color: var(--color-text);
      }

      .controls {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
      }

      .upload-row {
        align-items: center;
        display: flex;
        gap: 0.6rem;
      }

      .upload-button {
        flex: 1;
        font-size: 0.85rem;
        font-weight: 500;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .field-label {
        font-size: 0.9rem;
        font-weight: 600;
      }

      .field-error {
        color: var(--color-error);
        font-size: 0.85rem;
      }

      .field-resolved {
        background: var(--color-surface);
        border-left: 3px solid var(--color-brand);
        border-radius: 8px;
        font-size: 0.82rem;
        line-height: 1.45;
        padding: 0.55rem 0.7rem;
      }

      /* A warning, not a refusal: these links sometimes carry the full text. */
      .field-warning {
        background: var(--color-surface);
        border-radius: 8px;
        color: var(--color-hint);
        font-size: 0.82rem;
        line-height: 1.45;
        padding: 0.55rem 0.7rem;
      }

      .generate {
        width: 100%;
      }

      .video {
        background: var(--color-surface);
        border-radius: var(--radius);
        overflow: hidden;
        padding-top: 56.25%;
        position: relative;
        width: 100%;
      }

      .video-frame,
      .video-placeholder {
        border: none;
        height: 100%;
        left: 0;
        position: absolute;
        top: 0;
        width: 100%;
      }

      .video-placeholder {
        align-items: center;
        display: flex;
        justify-content: center;
      }

      .output {
        display: flex;
        flex-direction: column;
        min-height: 420px;
      }

      .output-placeholder {
        align-items: center;
        border: 1px dashed var(--color-border);
        border-radius: var(--radius);
        display: flex;
        flex: 1;
        flex-direction: column;
        gap: 1.25rem;
        justify-content: center;
        padding: 2rem 1.5rem;
        text-align: center;
      }

      .intro-steps {
        counter-reset: step;
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
        max-width: 34ch;
        text-align: left;
      }

      .intro-steps li {
        align-items: center;
        counter-increment: step;
        display: flex;
        font-size: 0.9rem;
        gap: 0.65rem;
        line-height: 1.4;
      }

      .intro-steps li::before {
        align-items: center;
        background: var(--color-surface);
        border-radius: 50%;
        color: var(--color-hint);
        content: counter(step);
        display: flex;
        flex: 0 0 24px;
        font-size: 0.75rem;
        font-weight: 700;
        height: 24px;
        justify-content: center;
        width: 24px;
      }

      @media (min-width: 900px) {
        .app {
          display: grid;
          gap: 1.25rem 1.5rem;
          grid-template-columns: minmax(0, 360px) minmax(0, 1fr);
          max-width: 1200px;
          padding: 1.5rem;
        }

        .header,
        .mode-switch,
        .controls,
        .video {
          grid-column: 1;
        }

        .output {
          grid-column: 2;
          grid-row: 1 / span 4;
          min-height: min(80vh, 760px);
        }
      }
    `}</style>
  );
}
