import { type TypingPayload, type SpeechLanguage } from '../types/app';
import { typeIntoFocusedApp } from '../tauri/commands';

interface QueueItem {
  payload: TypingPayload;
  resolve: () => void;
  reject: (error: Error) => void;
}

const DUPLICATE_WINDOW_MS = 1_500;

export class TypingService {
  private static queue: QueueItem[] = [];
  private static processing = false;
  private static lastText = '';
  private static lastTypedAt = 0;
  private static typingSpeedMs = 8;

  static setTypingSpeed(speedMs: number): void {
    this.typingSpeedMs = Math.max(0, Math.min(speedMs, 40));
  }

  static sanitizeTranscript(text: string): string {
    return text.replace(/\s+/g, ' ').trim();
  }

  static async typeTranscript(text: string, language: SpeechLanguage): Promise<void> {
    const cleanText = this.sanitizeTranscript(text);
    if (!cleanText || this.isDuplicate(cleanText)) {
      console.debug('[typing] ignored empty/duplicate transcript', cleanText);
      return;
    }

    this.lastText = cleanText;
    this.lastTypedAt = Date.now();
    console.debug('[typing] enqueue', { language, text: cleanText });

    return new Promise((resolve, reject) => {
      this.queue.push({
        payload: { text: cleanText, language, typingSpeedMs: this.typingSpeedMs },
        resolve,
        reject
      });
      void this.flushQueue();
    });
  }

  private static isDuplicate(text: string): boolean {
    return this.lastText === text && Date.now() - this.lastTypedAt < DUPLICATE_WINDOW_MS;
  }

  private static async flushQueue(): Promise<void> {
    if (this.processing) {
      return;
    }

    this.processing = true;

    while (this.queue.length > 0) {
      const item = this.queue.shift();
      if (!item) {
        continue;
      }

      try {
        await typeIntoFocusedApp(item.payload);
        console.debug('[typing] typed', item.payload.text);
        item.resolve();
      } catch (error) {
        const typedError = error instanceof Error ? error : new Error('Typing failed.');
        console.error('[typing] failed', typedError);
        item.reject(typedError);
      }
    }

    this.processing = false;
  }
}
