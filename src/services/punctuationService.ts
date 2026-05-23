import type { SpeechLanguage } from '../types/app';

const sentenceEnders = /[.!?।]$/u;

export function applyAutoPunctuation(text: string, language: SpeechLanguage): string {
  const normalized = text.replace(/\s+/g, ' ').trim();
  if (!normalized) {
    return '';
  }

  if (sentenceEnders.test(normalized)) {
    return `${normalized} `;
  }

  const mark = language === 'bn-BD' ? '।' : '.';
  return `${normalized}${mark} `;
}
