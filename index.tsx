/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import App from '@/App';
import {SettingsContext} from '@/context';
import {strings} from '@/lib/i18n';
import {initTelegram, storage} from '@/lib/telegram';
import React, {useCallback, useEffect, useMemo, useState} from 'react';
import ReactDOM from 'react-dom/client';

const KEY_STORAGE = 'gemini_api_key';

function Providers({children}: {children: React.ReactNode}) {
  const [apiKey, setApiKeyState] = useState<string | null>(null);
  const [keyLoading, setKeyLoading] = useState(true);

  // Restore the saved key and language preference.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const storedKey = await storage.get(KEY_STORAGE);
      if (cancelled) return;
      if (storedKey) setApiKeyState(storedKey);
      setKeyLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const saveApiKey = useCallback(async (key: string) => {
    const trimmed = key.trim();
    setApiKeyState(trimmed);
    await storage.set(KEY_STORAGE, trimmed);
  }, []);

  const clearApiKey = useCallback(async () => {
    setApiKeyState(null);
    await storage.remove(KEY_STORAGE);
  }, []);

  const settingsValue = useMemo(
    () => ({
      t: strings,
      apiKey,
      saveApiKey,
      clearApiKey,
      keyLoading,
    }),
    [apiKey, saveApiKey, clearApiKey, keyLoading],
  );

  return (
    <SettingsContext.Provider value={settingsValue}>
      {children}
    </SettingsContext.Provider>
  );
}

initTelegram();

const container = document.getElementById('root')!;

// Vite re-executes this module on hot reload, and calling createRoot twice on
// the same node warns and detaches the old tree. Keeping the root on the
// container means a reload re-renders rather than re-mounts.
interface RootHost extends HTMLElement {
  _root?: ReactDOM.Root;
}
const host = container as RootHost;
const root = (host._root ??= ReactDOM.createRoot(container));
// Deliberately not wrapped in StrictMode: its double-invoked effects would
// fire a second video generation on every mount, and the user pays for that
// out of their own Gemini quota.
root.render(
  <Providers>
    <App />
  </Providers>,
);

/*
 * Register the service worker, which is what makes the app installable in a
 * browser and lets its shell open without a connection.
 *
 * Production only: in dev it would sit in front of Vite's module graph and
 * serve a stale build back during hot reload.
 */
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // Resolved against BASE_URL, not import.meta.url: the latter points at
    // the hashed bundle inside /assets/, so the worker would be looked for
    // beside it and 404 -- and its scope would be /assets/ rather than the app.
    const base = import.meta.env.BASE_URL;
    navigator.serviceWorker
      .register(`${base}sw.js`, {scope: base})
      .catch((error) => console.warn('Service worker did not register:', error));
  });
}
