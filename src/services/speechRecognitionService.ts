import type { RecognitionText, SpeechLanguage } from '../types/app';

type ResultHandler = (text: RecognitionText) => void;
type ErrorHandler = (message: string, fatal: boolean) => void;
type StateHandler = () => void;

interface SpeechRecognitionServiceOptions {
  language: SpeechLanguage;
  onResult: ResultHandler;
  onError: ErrorHandler;
  onStart: StateHandler;
  onEnd: StateHandler;
}

export class SpeechRecognitionService {
  private recognition: SpeechRecognition | null = null;
  private shouldListen = false;
  private restartTimer: number | null = null;
  private restartDelayMs = 500;

  constructor(private options: SpeechRecognitionServiceOptions) {}

  static isSupported(): boolean {
    return Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
  }

  updateLanguage(language: SpeechLanguage): void {
    this.options.language = language;
    if (this.recognition) {
      this.recognition.lang = language;
    }
  }

  start(): void {
    if (!SpeechRecognitionService.isSupported()) {
      this.options.onError('Speech recognition is unavailable in this WebView.', true);
      return;
    }

    this.shouldListen = true;
    console.debug('[speech] start requested', this.options.language);
    this.clearRestartTimer();
    this.createRecognition();

    try {
      this.recognition?.start();
    } catch {
      this.scheduleRestart();
    }
  }

  stop(): void {
    this.shouldListen = false;
    console.debug('[speech] stop requested');
    this.clearRestartTimer();
    this.recognition?.stop();
  }

  dispose(): void {
    this.shouldListen = false;
    this.clearRestartTimer();
    this.recognition?.abort();
    this.recognition = null;
  }

  private createRecognition(): void {
    if (this.recognition) {
      return;
    }

    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) {
      return;
    }

    const recognition = new Recognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognition.lang = this.options.language;

    recognition.onstart = () => {
      this.restartDelayMs = 500;
      this.options.onStart();
    };
    recognition.onresult = (event) => this.handleResult(event);
    recognition.onerror = (event) => this.handleError(event);
    recognition.onend = () => {
      this.recognition = null;
      console.debug('[speech] recognition ended', { shouldListen: this.shouldListen });
      this.options.onEnd();
      if (this.shouldListen) {
        this.scheduleRestart();
      }
    };

    this.recognition = recognition;
  }

  private handleResult(event: SpeechRecognitionEvent): void {
    let finalText = '';
    let interimText = '';

    for (let index = event.resultIndex; index < event.results.length; index += 1) {
      const result = event.results[index];
      const transcript = result[0]?.transcript ?? '';
      if (result.isFinal) {
        finalText += transcript;
      } else {
        interimText += transcript;
      }
    }

    if (finalText.trim() || interimText.trim()) {
      console.debug('[speech] result', {
        final: finalText.trim(),
        interim: interimText.trim()
      });
    }
    this.options.onResult({ finalText, interimText });
  }

  private handleError(event: SpeechRecognitionErrorEvent): void {
    const fatal = this.isFatalError(event.error);
    const message = this.errorToMessage(event.error, event.message);
    console[fatal ? 'error' : 'warn']('[speech] error', event.error, message);
    this.options.onError(message, fatal);

    if (fatal) {
      this.shouldListen = false;
      return;
    }

    if (this.shouldListen) {
      this.scheduleRestart();
    }
  }

  private scheduleRestart(): void {
    this.clearRestartTimer();
    const delay = this.restartDelayMs;
    this.restartDelayMs = Math.min(this.restartDelayMs + 350, 2_000);
    this.restartTimer = window.setTimeout(() => {
      if (this.shouldListen) {
        this.start();
      }
    }, delay);
  }

  private clearRestartTimer(): void {
    if (this.restartTimer) {
      window.clearTimeout(this.restartTimer);
      this.restartTimer = null;
    }
  }

  private errorToMessage(error: string, fallback: string): string {
    const messages: Record<string, string> = {
      'not-allowed': 'Microphone permission was denied.',
      'service-not-allowed': 'Speech recognition service is blocked.',
      network: 'Speech recognition network failure.',
      'no-speech': 'No speech detected.',
      aborted: 'Speech recognition was interrupted.',
      'audio-capture': 'No microphone was detected.'
    };

    return messages[error] ?? fallback ?? `Speech recognition error: ${error}`;
  }

  private isFatalError(error: string): boolean {
    return error === 'not-allowed' || error === 'service-not-allowed' || error === 'audio-capture';
  }
}
