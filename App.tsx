/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import ContentContainer from '@/components/ContentContainer';
import KeyGate from '@/components/KeyGate';
import {useSettings} from '@/context';
import {LANGUAGES, type Lang} from '@/lib/i18n';
import {haptic} from '@/lib/telegram';
import {getYoutubeEmbedUrl, validateYoutubeUrl} from '@/lib/youtube';
import {useRef, useState} from 'react';

export default function App() {
  const {t, lang, setLang, apiKey, keyLoading} = useSettings();

  const [videoUrl, setVideoUrl] = useState('');
  const [urlError, setUrlError] = useState<string | null>(null);
  const [contentLoading, setContentLoading] = useState(false);
  const [reloadCounter, setReloadCounter] = useState(0);
  const [showSettings, setShowSettings] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  const busy = contentLoading;

  const handleSubmit = async () => {
    const value = inputRef.current?.value.trim() || '';
    if (!value || busy) {
      inputRef.current?.focus();
      return;
    }

    haptic('medium');
    setUrlError(null);

    const {isValid} = await validateYoutubeUrl(value);
    if (!isValid) {
      setUrlError(t.invalidUrl);
      return;
    }

    setVideoUrl(value);
    // Bumping the key remounts ContentContainer, which restarts generation.
    setReloadCounter((c) => c + 1);
  };

  const handleLanguage = (next: Lang) => {
    haptic();
    setLang(next);
  };

  const header = (
    <header className="header">
      <div className="brand">
        <h1 className="title">Video &rarr; Learning App</h1>
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
        {apiKey && (
          <button
            className="button-ghost settings-button"
            aria-label={t.settings}
            onClick={() => {
              haptic();
              setShowSettings(true);
            }}>
            &#9881;
          </button>
        )}
      </div>
    </header>
  );

  // Nothing works without a key, so that is the whole screen until one exists.
  if (!keyLoading && (!apiKey || showSettings)) {
    return (
      <div className="app">
        {header}
        <KeyGate
          onClose={apiKey ? () => setShowSettings(false) : undefined}
          key={apiKey ? 'settings' : 'onboarding'}
        />
        <Styles />
      </div>
    );
  }

  return (
    <div className="app">
      {header}

      <section className="controls">
        <label className="field-label" htmlFor="youtube-url">
          {t.inputLabel}
        </label>
        <input
          ref={inputRef}
          id="youtube-url"
          type="url"
          inputMode="url"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          placeholder={t.inputPlaceholder}
          disabled={busy}
          onChange={() => setUrlError(null)}
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
        />
        {urlError && <p className="field-error">{urlError}</p>}

        <button
          className="button-primary generate"
          onClick={handleSubmit}
          disabled={busy}>
          {busy ? t.generating : videoUrl ? t.regenerate : t.generate}
        </button>
      </section>

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

      <section className="output">
        {videoUrl ? (
          <ContentContainer
            key={reloadCounter}
            contentBasis={videoUrl}
            onLoadingStateChange={setContentLoading}
          />
        ) : (
          <div className="output-placeholder hint">{t.contentPlaceholder}</div>
        )}
      </section>

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
        font-size: 1.35rem;
        font-weight: 700;
        letter-spacing: -0.01em;
        line-height: 1.2;
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

      .controls {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
      }

      .field-label {
        font-size: 0.9rem;
        font-weight: 600;
      }

      .field-error {
        color: var(--color-error);
        font-size: 0.85rem;
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
        justify-content: center;
        padding: 2rem 1.5rem;
        text-align: center;
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
        .controls,
        .video {
          grid-column: 1;
        }

        .output {
          grid-column: 2;
          grid-row: 1 / span 3;
          min-height: min(80vh, 760px);
        }
      }
    `}</style>
  );
}
