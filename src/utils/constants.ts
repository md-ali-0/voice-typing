import type { LanguageOption } from '../types/app';

export const SHORTCUT = 'CommandOrControl+Shift+V';

export const LANGUAGE_OPTIONS: LanguageOption[] = [
  { label: 'Bengali', shortLabel: 'BN', value: 'bn-BD' },
  { label: 'English', shortLabel: 'EN', value: 'en-US' }
];

export const DEFAULT_SETTINGS = {
  autoPunctuation: true,
  startWithWindows: false,
  trayEnabled: true
};

export const STORAGE_KEYS = {
  language: 'voice-typing.language',
  settings: 'voice-typing.settings'
} as const;
