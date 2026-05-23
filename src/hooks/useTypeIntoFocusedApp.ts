import { useCallback } from 'react';
import { applyAutoPunctuation } from '../services/punctuationService';
import { TypingService } from '../services/typing.service';
import { useAppStore } from '../stores/appStore';
import type { SpeechLanguage } from '../types/app';

export function useTypeIntoFocusedApp() {
  const autoPunctuation = useAppStore((state) => state.settings.autoPunctuation);
  const setAppState = useAppStore((state) => state.setAppState);
  const setError = useAppStore((state) => state.setError);

  return useCallback(
    async (rawText: string, language: SpeechLanguage) => {
      const text = autoPunctuation ? applyAutoPunctuation(rawText, language) : `${rawText.trim()} `;
      if (!text.trim()) {
        return;
      }

      try {
        setAppState('processing');
        await TypingService.typeTranscript(text, language);
        setAppState('listening');
      } catch (error) {
        setError(error instanceof Error ? error.message : 'Typing failed.');
      }
    },
    [autoPunctuation, setAppState, setError]
  );
}
