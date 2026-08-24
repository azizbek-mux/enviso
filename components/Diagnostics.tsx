/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {useSettings} from '@/context';
import {type Check, type Report, runDiagnostics} from '@/lib/diagnostics';
import {haptic} from '@/lib/telegram';
import {useState} from 'react';

const SYMBOL: Record<Check['status'], string> = {
  ok: '✔',
  busy: '⏳',
  quota: '⚠',
  denied: '✖',
  missing: '✖',
  fail: '✖',
};

/**
 * Shows what the user's key can really do.
 *
 * Exists so a failure can be diagnosed from inside the app instead of asking
 * the user to open dev tools and read a console.
 */
export default function Diagnostics() {
  const {t, apiKey} = useSettings();
  const [checks, setChecks] = useState<Check[]>([]);
  const [report, setReport] = useState<Report | null>(null);
  const [running, setRunning] = useState(false);
  const [copied, setCopied] = useState(false);

  const run = async () => {
    if (!apiKey || running) return;
    haptic();
    setRunning(true);
    setReport(null);
    setChecks([]);
    try {
      setReport(await runDiagnostics(apiKey, setChecks));
    } finally {
      setRunning(false);
    }
  };

  const copy = async () => {
    if (!report) return;
    haptic();
    try {
      await navigator.clipboard.writeText(report.text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.warn('Clipboard write failed:', error);
    }
  };

  return (
    <div className="diagnostics">
      <h3 className="diag-title">{t.diagTitle}</h3>
      <p className="hint">{t.diagIntro}</p>

      <button
        className="button-secondary"
        onClick={run}
        disabled={running || !apiKey}>
        {running ? t.diagRunning : t.diagRun}
      </button>

      {checks.length > 0 && (
        <ul className="diag-list">
          {checks.map((check) => (
            <li key={check.label} className={`diag-row diag-${check.status}`}>
              <span className="diag-symbol">{SYMBOL[check.status]}</span>
              <span className="diag-body">
                <span className="diag-label">{check.label}</span>
                {check.detail && (
                  <span className="diag-detail">{check.detail}</span>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}

      {report && (
        <button className="button-primary" onClick={copy}>
          {copied ? t.copied : t.diagCopy}
        </button>
      )}

      <style>{`
        .diagnostics {
          border-top: 1px solid var(--color-border);
          display: flex;
          flex-direction: column;
          gap: 0.7rem;
          margin-top: 0.5rem;
          padding-top: 1rem;
        }

        .diag-title {
          font-size: 1rem;
          font-weight: 700;
        }

        .diag-list {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .diag-row {
          background: var(--color-surface);
          border-radius: 8px;
          display: flex;
          gap: 0.6rem;
          padding: 0.55rem 0.7rem;
        }

        .diag-symbol {
          flex: 0 0 auto;
          font-size: 0.95rem;
        }

        .diag-ok .diag-symbol {
          color: #2eb872;
        }

        .diag-busy .diag-symbol,
        .diag-quota .diag-symbol {
          color: #e8a33d;
        }

        .diag-denied .diag-symbol,
        .diag-missing .diag-symbol,
        .diag-fail .diag-symbol {
          color: var(--color-error);
        }

        .diag-body {
          display: flex;
          flex-direction: column;
          gap: 0.15rem;
          min-width: 0;
        }

        .diag-label {
          font-size: 0.85rem;
          font-weight: 600;
          word-break: break-word;
        }

        .diag-detail {
          color: var(--color-hint);
          font-size: 0.75rem;
          line-height: 1.4;
          word-break: break-word;
        }
      `}</style>
    </div>
  );
}
