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
