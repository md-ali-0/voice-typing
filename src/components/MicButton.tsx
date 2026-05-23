import clsx from 'clsx';
import { Mic, MicOff } from 'lucide-react';
import type { AppState } from '../types/app';

interface MicButtonProps {
  state: AppState;
  onClick: () => void;
}

export function MicButton({ state, onClick }: MicButtonProps) {
  const active = state === 'listening' || state === 'processing';

  return (
    <button
      data-tauri-disable-drag
      type="button"
      aria-label={active ? 'Stop voice typing' : 'Start voice typing'}
      onMouseDown={(event) => event.stopPropagation()}
      onClick={onClick}
      className={clsx(
        'relative grid h-14 w-14 place-items-center rounded-full border transition duration-200',
        'border-white/10 bg-zinc-900 text-zinc-100 shadow-lg hover:bg-zinc-800 active:scale-95',
        state === 'error' && 'border-rose-400/60 text-rose-200',
        active && 'border-emerald-300/40 text-emerald-100'
      )}
    >
      {active && <span className="absolute inset-0 rounded-full bg-emerald-400/30 animate-breathe" />}
      {active ? <Mic size={24} strokeWidth={2.4} /> : <MicOff size={24} strokeWidth={2.4} />}
    </button>
  );
}
