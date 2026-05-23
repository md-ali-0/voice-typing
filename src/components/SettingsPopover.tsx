import { Settings } from 'lucide-react';

interface SettingsPopoverProps {
  expanded: boolean;
  onToggle: () => void;
}

export function SettingsPopover({ expanded, onToggle }: SettingsPopoverProps) {
  return (
    <div data-tauri-disable-drag className="shrink-0">
      <button
        data-tauri-disable-drag
        type="button"
        aria-label={expanded ? 'Close settings' : 'Open settings'}
        aria-expanded={expanded}
        onMouseDown={(event) => event.stopPropagation()}
        onClick={onToggle}
        className="grid h-8 w-8 place-items-center rounded-full text-zinc-400 transition hover:bg-white/10 hover:text-zinc-100 active:scale-95"
      >
        <Settings size={16} />
      </button>
    </div>
  );
}
