import clsx from 'clsx';
import { LANGUAGE_OPTIONS } from '../utils/constants';
import type { SpeechLanguage } from '../types/app';

interface LanguageSwitchProps {
  value: SpeechLanguage;
  onChange: (language: SpeechLanguage) => void;
}

export function LanguageSwitch({ value, onChange }: LanguageSwitchProps) {
  return (
    <div data-tauri-disable-drag className="flex w-[130px] rounded-full bg-black/35 p-0.5">
      {LANGUAGE_OPTIONS.map((option) => (
        <button
          data-tauri-disable-drag
          key={option.value}
          type="button"
          aria-label={`Switch to ${option.label}`}
          onMouseDown={(event) => event.stopPropagation()}
          onClick={() => onChange(option.value)}
          className={clsx(
            'h-6 min-w-8 rounded-full px-2 text-[11px] font-semibold transition',
            value === option.value ? 'bg-white text-zinc-950' : 'text-zinc-400 hover:text-zinc-100'
          )}
        >
          {option.shortLabel}
        </button>
      ))}
    </div>
  );
}
