/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  DiagramIllustration,
  EmptyIllustration,
  PaperIllustration,
} from '@/components/Illustrations';
import {useSettings} from '@/context';
import type {SourceKind} from '@/lib/source';
import {haptic} from '@/lib/telegram';

interface ChooserProps {
  onChoose: (kind: SourceKind) => void;
}

/**
 * The first thing after the key: what are you starting from?
 *
 * The two modes used to live behind a small segmented switch, which made the
 * research half easy to miss entirely. Asking outright costs one tap and
 * tells a new user what the app is for.
 */
export default function Chooser({onChoose}: ChooserProps) {
  const {t} = useSettings();

  const pick = (kind: SourceKind) => {
    haptic('medium');
    onChoose(kind);
  };

  return (
    <div className="chooser">
      <div className="chooser-head">
        <h2 className="chooser-title display">{t.chooseTitle}</h2>
        <div className="rule" />
        <p className="hint">{t.chooseSubtitle}</p>
      </div>

      <div className="chooser-grid">
        <button className="choice" onClick={() => pick('video')}>
          <EmptyIllustration className="choice-art" />
          <span className="choice-title display">{t.chooseVideoTitle}</span>
          <span className="choice-body">{t.chooseVideoBody}</span>
        </button>

        <button className="choice" onClick={() => pick('paper')}>
          <PaperIllustration className="choice-art" />
          <span className="choice-title display">{t.choosePaperTitle}</span>
          <span className="choice-body">{t.choosePaperBody}</span>
        </button>

        <button className="choice" onClick={() => pick('diagram')}>
          <DiagramIllustration className="choice-art" />
          <span className="choice-title display">{t.chooseDiagramTitle}</span>
          <span className="choice-body">{t.chooseDiagramBody}</span>
        </button>
      </div>

      <style>{`
        .chooser {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
          padding: 1rem 0 2rem;
        }

        .chooser-head {
          display: flex;
          flex-direction: column;
          gap: 0.6rem;
        }

        .chooser-title {
          font-size: 1.5rem;
        }

        .chooser-grid {
          display: grid;
          gap: 0.85rem;
          grid-template-columns: 1fr;
        }

        @media (min-width: 720px) {
          .chooser-grid {
            grid-template-columns: repeat(3, 1fr);
          }
        }

        .choice {
          align-items: flex-start;
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--radius);
          color: var(--color-text);
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          padding: 1.25rem;
          text-align: left;
          transition: border-color 0.15s ease, transform 0.15s ease;
        }

        .choice:hover:not(:disabled) {
          border-color: var(--color-brand);
        }

        .choice:active:not(:disabled) {
          transform: scale(0.995);
        }

        .choice-art {
          color: var(--color-brand);
          height: auto;
          max-width: 108px;
          opacity: 0.95;
        }

        .choice-title {
          font-size: 1.15rem;
        }

        .choice-body {
          color: var(--color-hint);
          font-size: 0.88rem;
          line-height: 1.5;
        }
      `}</style>
    </div>
  );
}
