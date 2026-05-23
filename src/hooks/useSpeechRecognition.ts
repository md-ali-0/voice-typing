import { useCallback, useEffect, useRef } from 'react';
import { SpeechService } from '../services/speech.service';
import { useAppStore } from '../stores/appStore';
import { useTypeIntoFocusedApp } from './useTypeIntoFocusedApp';

export function useSpeechRecognition() {
  const serviceRef = useRef<SpeechService | null>(null);
  const isListeningRef = useRef(false);
  const sessionTimerRef = useRef<number | null>(null);
  const finalDebounceRef = useRef<number | null>(null);
  const interimCommitTimerRef = useRef<number | null>(null);
  const interimMaxCommitTimerRef = useRef<number | null>(null);
  const pendingFinalRef = useRef('');
  const lastInterimRef = useRef('');
  const languageRef = useRef(useAppStore.getState().language);
  const typeTextRef = useRef<ReturnType<typeof useTypeIntoFocusedApp> | null>(null);
  const language = useAppStore((state) => state.language);
  const setAppState = useAppStore((state) => state.setAppState);
  const setError = useAppStore((state) => state.setError);
  const setInterimText = useAppStore((state) => state.setInterimText);
  const typeText = useTypeIntoFocusedApp();

  const clearSessionTimer = useCallback(() => {
    if (sessionTimerRef.current) {
      window.clearTimeout(sessionTimerRef.current);
      sessionTimerRef.current = null;
    }
  }, []);

  const stopListening = useCallback(() => {
    isListeningRef.current = false;
    clearSessionTimer();
    serviceRef.current?.stop();
  }, [clearSessionTimer]);

  const startSessionTimer = useCallback(() => {
    clearSessionTimer();
    const timeoutMs = languageRef.current === 'bn-BD' ? 7_000 : 10_000;
    sessionTimerRef.current = window.setTimeout(() => {
      if (isListeningRef.current) {
        console.debug('[speech] session timed out');
        stopListening();
      }
    }, timeoutMs);
  }, [clearSessionTimer, stopListening]);

  useEffect(() => {
    languageRef.current = language;
    serviceRef.current?.updateLanguage(language);
  }, [language]);

  useEffect(() => {
    typeTextRef.current = typeText;
  }, [typeText]);

  useEffect(() => {
    const flushTranscript = (text: string) => {
      const cleanText = text.replace(/\s+/g, ' ').trim();
      if (!cleanText) {
        return;
      }

      console.debug('[speech] final transcript', cleanText);
      lastInterimRef.current = '';
      if (interimCommitTimerRef.current) {
        window.clearTimeout(interimCommitTimerRef.current);
        interimCommitTimerRef.current = null;
      }
      if (interimMaxCommitTimerRef.current) {
        window.clearTimeout(interimMaxCommitTimerRef.current);
        interimMaxCommitTimerRef.current = null;
      }
      setInterimText('');
      void (async () => {
        await typeTextRef.current?.(cleanText, languageRef.current);
        if (languageRef.current === 'bn-BD') {
          stopListening();
        }
      })();
    };

    const scheduleInterimCommit = (text: string) => {
      if (interimCommitTimerRef.current) {
        window.clearTimeout(interimCommitTimerRef.current);
      }

      interimCommitTimerRef.current = window.setTimeout(() => {
        if (isListeningRef.current && !pendingFinalRef.current && lastInterimRef.current === text) {
          console.debug('[speech] committing stable interim transcript', text);
          flushTranscript(text);
        }
      }, 1_100);

      if (!interimMaxCommitTimerRef.current) {
        interimMaxCommitTimerRef.current = window.setTimeout(() => {
          if (isListeningRef.current && !pendingFinalRef.current && lastInterimRef.current) {
            console.debug('[speech] committing timed interim transcript', lastInterimRef.current);
            flushTranscript(lastInterimRef.current);
          }
        }, languageRef.current === 'bn-BD' ? 2_500 : 3_500);
      }
    };

    serviceRef.current = new SpeechService({
      language: languageRef.current,
      onStart: () => {
        setError(null);
        setAppState('listening');
      },
      onEnd: () => {
        if (isListeningRef.current && !pendingFinalRef.current && lastInterimRef.current) {
          flushTranscript(lastInterimRef.current);
        }

        if (!isListeningRef.current) {
          setAppState('idle');
          setInterimText('');
        } else {
          setAppState('listening');
        }
      },
      onError: (message, fatal) => {
        if (fatal) {
          setError(message);
          return;
        }

        console.debug('[speech] recoverable recognition event', message);
        setError(null);
        setAppState('listening');
      },
      onResult: ({ finalText, interimText }) => {
        const interim = interimText.replace(/\s+/g, ' ').trim();
        lastInterimRef.current = interim;
        setInterimText(interim);
        if (interim) {
          scheduleInterimCommit(interim);
        }
        if (finalText.replace(/\s+/g, ' ').trim()) {
          if (interimCommitTimerRef.current) {
            window.clearTimeout(interimCommitTimerRef.current);
            interimCommitTimerRef.current = null;
          }
          if (interimMaxCommitTimerRef.current) {
            window.clearTimeout(interimMaxCommitTimerRef.current);
            interimMaxCommitTimerRef.current = null;
          }
          pendingFinalRef.current = `${pendingFinalRef.current} ${finalText}`.trim();
          if (finalDebounceRef.current) {
            window.clearTimeout(finalDebounceRef.current);
          }
          finalDebounceRef.current = window.setTimeout(() => {
            const text = pendingFinalRef.current;
            pendingFinalRef.current = '';
            flushTranscript(text);
          }, 120);
        }
      }
    });

    return () => {
      if (finalDebounceRef.current) {
        window.clearTimeout(finalDebounceRef.current);
      }
      if (interimCommitTimerRef.current) {
        window.clearTimeout(interimCommitTimerRef.current);
      }
      if (interimMaxCommitTimerRef.current) {
        window.clearTimeout(interimMaxCommitTimerRef.current);
      }
      clearSessionTimer();
      serviceRef.current?.dispose();
    };
  }, [clearSessionTimer, setAppState, setError, setInterimText, stopListening]);

  const start = useCallback(() => {
    isListeningRef.current = true;
    serviceRef.current?.start();
    startSessionTimer();
  }, [startSessionTimer]);

  const stop = stopListening;

  const toggle = useCallback(() => {
    if (isListeningRef.current) {
      stop();
    } else {
      start();
    }
  }, [start, stop]);

  return {
    start,
    stop,
    toggle,
    isSupported: SpeechService.isSupported()
  };
}
