import clsx from 'clsx';
import type { AppState } from '../types/app';

interface StatusIndicatorProps {
  state: AppState;
}

const stateClass: Record<AppState, string> = {
  idle: 'bg-zinc-500',
  listening: 'bg-emerald-400 shadow-[0_0_18px_rgba(52,211,153,0.8)]',
  processing: 'bg-sky-400 shadow-[0_0_18px_rgba(56,189,248,0.8)]',
  error: 'bg-rose-400 shadow-[0_0_18px_rgba(251,113,133,0.8)]'
};

export function StatusIndicator({ state }: StatusIndicatorProps) {
  return <span className={clsx('h-2.5 w-2.5 rounded-full transition-all', stateClass[state])} />;
}
