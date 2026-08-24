/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import App from '@/App';
import {SettingsContext} from '@/context';
import {type Lang, detectLanguage, strings} from '@/lib/i18n';
import {
  initTelegram,
  storage,
  telegramLanguage,
} from '@/lib/telegram';
import React, {useCallback, useEffect, useMemo, useState} from 'react';
import ReactDOM from 'react-dom/client';

const KEY_STORAGE = 'gemini_api_key';
const LANG_STORAGE = 'ui_lang';

function Providers({children}: {children: React.ReactNode}) {
  const [lang, setLangState] = useState<Lang>(() =>
    detectLanguage(telegramLanguage()),
  );
  const [apiKey, setApiKeyState] = useState<string | null>(null);
  const [keyLoading, setKeyLoading] = useState(true);

  // Restore the saved key and language preference.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [storedKey, storedLang] = await Promise.all([
        storage.get(KEY_STORAGE),
        storage.get(LANG_STORAGE),
      ]);
      if (cancelled) return;
      if (storedKey) setApiKeyState(storedKey);
      if (storedLang === 'uz' || storedLang === 'en') setLangState(storedLang);
      setKeyLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    document.documentElement.lang = next;
    void storage.set(LANG_STORAGE, next);
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
      lang,
      setLang,
      t: strings[lang],
      apiKey,
      saveApiKey,
      clearApiKey,
      keyLoading,
    }),
    [lang, setLang, apiKey, saveApiKey, clearApiKey, keyLoading],
  );

  return (
    <SettingsContext.Provider value={settingsValue}>
      {children}
    </SettingsContext.Provider>
  );
}

initTelegram();

const root = ReactDOM.createRoot(document.getElementById('root')!);
// Deliberately not wrapped in StrictMode: its double-invoked effects would
// fire a second video generation on every mount, and the user pays for that
// out of their own Gemini quota.
root.render(
  <Providers>
    <App />
  </Providers>,
);
