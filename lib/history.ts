/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type {SourceKind} from '@/lib/source';
import {getYouTubeVideoId} from '@/lib/youtube';

/**
 * Local store of finished generations.
 *
 * IndexedDB rather than localStorage because a generated app is a whole HTML
 * document -- a handful of them would sit near localStorage's few-megabyte
 * ceiling, and hitting that ceiling throws mid-save rather than degrading.
 */

const DB_NAME = 'vtl-history';
const STORE = 'items';
const DB_VERSION = 1;

/** Old entries are dropped past this, newest kept. */
export const HISTORY_LIMIT = 20;

export interface HistoryItem {
  id: string;
  kind: SourceKind;
  /** What the source was called, for the list. */
  title: string;
  /** The original link, when there was one. Absent for uploaded PDFs. */
  sourceUrl?: string;
  spec: string;
  code: string;
  summary?: string;
  createdAt: number;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, {keyPath: 'id'});
        store.createIndex('createdAt', 'createdAt');
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function transact<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(STORE, mode);
        const request = run(tx.objectStore(STORE));
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
        tx.oncomplete = () => db.close();
      }),
  );
}

/** Newest first. Returns an empty list rather than throwing on any failure. */
export async function listHistory(): Promise<HistoryItem[]> {
  try {
    const items = await transact<HistoryItem[]>('readonly', (store) =>
      store.getAll(),
    );
    return items.sort((a, b) => b.createdAt - a.createdAt);
  } catch (error) {
    console.warn('Could not read history:', error);
    return [];
  }
}

export async function saveHistory(
  item: Omit<HistoryItem, 'id' | 'createdAt'>,
): Promise<HistoryItem | null> {
  const record: HistoryItem = {
    ...item,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: Date.now(),
  };

  try {
    await transact('readwrite', (store) => store.put(record));
    await prune();
    return record;
  } catch (error) {
    // History is a convenience; failing to store must never break a result the
    // user is already looking at.
    console.warn('Could not save to history:', error);
    return null;
  }
}

export async function deleteHistory(id: string): Promise<void> {
  try {
    await transact('readwrite', (store) => store.delete(id));
  } catch (error) {
    console.warn('Could not delete history entry:', error);
  }
}

export async function clearHistory(): Promise<void> {
  try {
    await transact('readwrite', (store) => store.clear());
  } catch (error) {
    console.warn('Could not clear history:', error);
  }
}

async function prune(): Promise<void> {
  const items = await listHistory();
  const excess = items.slice(HISTORY_LIMIT);
  await Promise.all(excess.map((item) => deleteHistory(item.id)));
}

/** YouTube thumbnail for a stored item, when it came from a video. */
export function historyThumbnail(item: HistoryItem): string | null {
  if (item.kind !== 'video' || !item.sourceUrl) return null;
  const id = getYouTubeVideoId(item.sourceUrl);
  return id ? `https://img.youtube.com/vi/${id}/mqdefault.jpg` : null;
}
