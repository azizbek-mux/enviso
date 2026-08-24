/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type {Lang, Strings} from '@/lib/i18n';
import type {Example} from '@/lib/types';
import {
  type Dispatch,
  type SetStateAction,
  createContext,
  useContext,
} from 'react';

export interface Data {
  examples: Example[];
  setExamples: Dispatch<SetStateAction<Example[]>>;
  defaultExample: Example | undefined;
  isLoading: boolean;
}

export const DataContext = createContext<Data>({
  examples: [],
  setExamples: () => {},
  defaultExample: undefined,
  isLoading: true,
});

export const useData = () => useContext(DataContext);

export interface Settings {
  lang: Lang;
  setLang: (lang: Lang) => void;
  /** Strings for the active language. */
  t: Strings;
  /** The user's own Gemini key, or null until they add one. */
  apiKey: string | null;
  saveApiKey: (key: string) => Promise<void>;
  clearApiKey: () => Promise<void>;
  /** True while the stored key is being read back from storage at startup. */
  keyLoading: boolean;
}

export const SettingsContext = createContext<Settings>(null as never);

export const useSettings = () => useContext(SettingsContext);
