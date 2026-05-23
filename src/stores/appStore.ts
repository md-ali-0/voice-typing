import { create } from 'zustand';
import type { AppSettings, AppState, SpeechLanguage } from '../types/app';
import { DEFAULT_SETTINGS, STORAGE_KEYS } from '../utils/constants';
import { readStorage, writeStorage } from '../utils/persistence';

interface AppStore {
  appState: AppState;
  language: SpeechLanguage;
  interimText: string;
  errorMessage: string | null;
  settings: AppSettings;
  setAppState: (state: AppState) => void;
  setLanguage: (language: SpeechLanguage) => void;
  setInterimText: (text: string) => void;
  setError: (message: string | null) => void;
  updateSettings: (settings: Partial<AppSettings>) => void;
}

const initialLanguage = readStorage<SpeechLanguage>(STORAGE_KEYS.language, 'bn-BD');
const initialSettings = readStorage<AppSettings>(STORAGE_KEYS.settings, DEFAULT_SETTINGS);

export const useAppStore = create<AppStore>((set, get) => ({
  appState: 'idle',
  language: initialLanguage,
  interimText: '',
  errorMessage: null,
  settings: initialSettings,
  setAppState: (appState) => set({ appState }),
  setLanguage: (language) => {
    writeStorage(STORAGE_KEYS.language, language);
    set({ language });
  },
  setInterimText: (interimText) => set({ interimText }),
  setError: (errorMessage) => set({ errorMessage, appState: errorMessage ? 'error' : get().appState }),
  updateSettings: (nextSettings) => {
    const settings = { ...get().settings, ...nextSettings };
    writeStorage(STORAGE_KEYS.settings, settings);
    set({ settings });
  }
}));
