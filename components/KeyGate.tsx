/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import Diagnostics from '@/components/Diagnostics';
import {useSettings} from '@/context';
import {haptic, notify, openExternal} from '@/lib/telegram';
import {validateApiKey} from '@/lib/textGeneration';
import {useState} from 'react';

const AI_STUDIO_URL = 'https://aistudio.google.com/apikey';

interface KeyGateProps {
  /** Rendered as a dismissable settings screen rather than a first-run gate. */
  onClose?: () => void;
}

/**
 * Bring-your-own-key onboarding.
 *
 * The app has no backend, so there is nowhere to hide a shared key: each user
 * supplies their own free Google AI Studio key, which is kept in their private
 * Telegram cloud storage and sent only to Google.
 */
export default function KeyGate({onClose}: KeyGateProps) {
  const {t, apiKey, saveApiKey, clearApiKey} = useSettings();
  const [value, setValue] = useState('');
  const [checking, setChecking] = useState(false);
  const [rejected, setRejected] = useState(false);

  const handleSave = async () => {
    const trimmed = value.trim();
    if (!trimmed || checking) return;

    haptic();
    setChecking(true);
    setRejected(false);

    const valid = await validateApiKey(trimmed);
    setChecking(false);

    if (!valid) {
      setRejected(true);
      notify('error');
      return;
    }

    await saveApiKey(trimmed);
    notify('success');
    setValue('');
    onClose?.();
  };

  const handleRemove = async () => {
    haptic();
    await clearApiKey();
    setValue('');
  };

  return (
    <div className="key-gate">
      <div className="key-card">
        <h2 className="key-title">{t.keyTitle}</h2>
        <p className="hint key-intro">{t.keyIntro}</p>

        <ol className="key-steps">
          <li>
            <span className="step-number">1</span>
            <span>{t.keyStep1}</span>
          </li>
          <li>
            <span className="step-number">2</span>
            <span>{t.keyStep2}</span>
          </li>
        </ol>

        <button
          className="button-secondary key-link"
          onClick={() => {
            haptic();
            openExternal(AI_STUDIO_URL);
          }}>
          {t.keyGet}
        </button>

        <input
          type="password"
          className="key-input"
          value={value}
          placeholder={t.keyPlaceholder}
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          onChange={(e) => {
            setValue(e.target.value);
            setRejected(false);
          }}
          onKeyDown={(e) => e.key === 'Enter' && handleSave()}
        />

        {rejected && <p className="key-error">{t.keyBad}</p>}

        <button
          className="button-primary key-save"
          onClick={handleSave}
          disabled={!value.trim() || checking}>
          {checking ? t.keyChecking : t.keySave}
        </button>

        <p className="hint key-privacy">{t.keyStored}</p>

        {apiKey && (
          <div className="key-existing">
            <button className="button-ghost" onClick={handleRemove}>
              {t.keyRemove}
            </button>
            {onClose && (
              <button className="button-ghost" onClick={onClose}>
                {t.back}
              </button>
            )}
          </div>
        )}

        {apiKey && <Diagnostics />}
      </div>

      <style>{`
        .key-gate {
          display: flex;
          justify-content: center;
          padding: 1.25rem 1rem 2rem;
        }

        .key-card {
          width: 100%;
          max-width: 460px;
          display: flex;
          flex-direction: column;
          gap: 0.85rem;
        }

        .key-title {
          font-size: 1.35rem;
          font-weight: 700;
        }

        .key-intro {
          line-height: 1.5;
        }

        .key-steps {
          display: flex;
          flex-direction: column;
          gap: 0.6rem;
        }

        .key-steps li {
          align-items: center;
          display: flex;
          font-size: 0.95rem;
          gap: 0.65rem;
        }

        .step-number {
          align-items: center;
          background: var(--color-accent);
          border-radius: 50%;
          color: var(--color-accent-text);
          display: flex;
          flex: 0 0 24px;
          font-size: 0.8rem;
          font-weight: 700;
          height: 24px;
          justify-content: center;
          width: 24px;
        }

        .key-error {
          color: var(--color-error);
          font-size: 0.85rem;
        }

        .key-privacy {
          line-height: 1.5;
        }

        .key-existing {
          display: flex;
          gap: 0.5rem;
          justify-content: space-between;
        }
      `}</style>
    </div>
  );
}
