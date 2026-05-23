export type AppState = 'idle' | 'listening' | 'processing' | 'error';

export type SpeechLanguage = 'bn-BD' | 'en-US';

export interface LanguageOption {
  label: string;
  shortLabel: string;
  value: SpeechLanguage;
}

export interface RecognitionText {
  finalText: string;
  interimText: string;
}

export interface AppSettings {
  autoPunctuation: boolean;
  startWithWindows: boolean;
  trayEnabled: boolean;
}

export interface TypingPayload {
  text: string;
  language: SpeechLanguage;
  typingSpeedMs?: number;
}

export interface NativeCommandResult {
  ok: boolean;
  error?: string;
}
