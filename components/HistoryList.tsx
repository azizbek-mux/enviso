/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {useSettings} from '@/context';
import {
  type HistoryItem,
  clearHistory,
  deleteHistory,
  historyThumbnail,
} from '@/lib/history';
import {haptic} from '@/lib/telegram';

interface HistoryListProps {
  items: HistoryItem[];
  onOpen: (item: HistoryItem) => void;
  onChanged: () => void;
}

/**
 * The apps this device has built.
 *
 * Reopening costs nothing: the finished HTML is stored, so a past app is
 * restored rather than regenerated.
 */
export default function HistoryList({
  items,
  onOpen,
  onChanged,
}: HistoryListProps) {
  const {t} = useSettings();

  if (items.length === 0) return null;

  const remove = async (id: string) => {
    haptic();
    await deleteHistory(id);
    onChanged();
  };

  const removeAll = async () => {
    haptic('medium');
    await clearHistory();
    onChanged();
  };

  return (
    <div className="history">
      <div className="history-head">
        <h2 className="history-title display">{t.historyTitle}</h2>
        <button className="button-ghost" onClick={removeAll}>
          {t.historyClear}
        </button>
      </div>

      <ul className="history-list">
        {items.map((item) => {
          const thumb = historyThumbnail(item);
          const summary = item.summary;

          return (
            <li key={item.id} className="history-item">
              <button className="history-open" onClick={() => onOpen(item)}>
                <span className="history-thumb">
                  {thumb ? (
                    <img src={thumb} alt="" loading="lazy" />
                  ) : (
                    <span className="history-badge">
                      {item.kind === 'diagram'
                        ? 'IMG'
                        : item.kind === 'video'
                          ? 'VIDEO'
                          : 'PDF'}
                    </span>
                  )}
                </span>
                <span className="history-body">
                  <span className="history-name">{item.title}</span>
                  <span className="history-meta">
                    {item.kind === 'video'
                      ? t.historyVideo
                      : item.kind === 'diagram'
                        ? t.historyDiagram
                        : t.historyPaper}
                  </span>
                  {summary && <span className="history-summary">{summary}</span>}
                </span>
              </button>
              <button
                className="button-ghost history-delete"
                aria-label={t.historyDelete}
                onClick={() => remove(item.id)}>
                &#215;
              </button>
            </li>
          );
        })}
      </ul>

      <style>{`
        .history {
          display: flex;
          flex-direction: column;
          gap: 0.6rem;
        }

        .history-head {
          align-items: center;
          display: flex;
          justify-content: space-between;
        }

        .history-title {
          font-size: 1.05rem;
        }

        .history-list {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .history-item {
          align-items: stretch;
          background: var(--color-surface);
          border-radius: var(--radius);
          display: flex;
          gap: 0.25rem;
          overflow: hidden;
        }

        .history-open {
          align-items: center;
          background: transparent;
          border-radius: 0;
          color: var(--color-text);
          display: flex;
          flex: 1;
          gap: 0.7rem;
          min-width: 0;
          padding: 0.6rem;
          text-align: left;
        }

        .history-thumb {
          align-items: center;
          background: var(--color-background);
          border-radius: 8px;
          display: flex;
          flex: 0 0 64px;
          height: 44px;
          justify-content: center;
          overflow: hidden;
          width: 64px;
        }

        .history-thumb img {
          height: 100%;
          object-fit: cover;
          width: 100%;
        }

        .history-badge {
          color: var(--color-brand);
          font-size: 0.7rem;
          font-weight: 700;
          letter-spacing: 0.05em;
        }

        .history-body {
          display: flex;
          flex-direction: column;
          gap: 0.15rem;
          min-width: 0;
        }

        .history-name {
          font-size: 0.9rem;
          font-weight: 600;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .history-meta {
          color: var(--color-hint);
          font-size: 0.72rem;
          font-weight: 500;
        }

        .history-summary {
          color: var(--color-hint);
          display: -webkit-box;
          font-size: 0.78rem;
          line-height: 1.4;
          overflow: hidden;
          -webkit-box-orient: vertical;
          -webkit-line-clamp: 2;
        }

        .history-delete {
          color: var(--color-hint);
          flex: 0 0 auto;
          font-size: 1.15rem;
          min-height: auto;
          padding: 0 0.7rem;
        }
      `}</style>
    </div>
  );
}
