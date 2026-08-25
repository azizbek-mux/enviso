/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type {Strings} from '@/lib/i18n';
import {createContext, useContext} from 'react';

export interface Settings {
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
