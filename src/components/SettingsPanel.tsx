import { setStartupEnabled } from '../tauri/commands';
import { useAppStore } from '../stores/appStore';

export function SettingsPanel() {
  const settings = useAppStore((state) => state.settings);
  const updateSettings = useAppStore((state) => state.updateSettings);
  const setError = useAppStore((state) => state.setError);

  async function toggleStartup(enabled: boolean) {
    updateSettings({ startWithWindows: enabled });
    try {
      await setStartupEnabled(enabled);
    } catch (error) {
      updateSettings({ startWithWindows: !enabled });
      setError(error instanceof Error ? error.message : 'Startup setting failed.');
    }
  }

  return (
    <div
      data-tauri-disable-drag
      className="mt-3 grid gap-3 border-t border-white/10 pt-3 text-xs text-zinc-200"
    >
      <SettingToggle
        label="Auto punctuation"
        checked={settings.autoPunctuation}
        onChange={(checked) => updateSettings({ autoPunctuation: checked })}
      />
      <SettingToggle
        label="Tray"
        checked={settings.trayEnabled}
        onChange={(checked) => updateSettings({ trayEnabled: checked })}
      />
      <SettingToggle
        label="Start with Windows"
        checked={settings.startWithWindows}
        onChange={(checked) => void toggleStartup(checked)}
      />
    </div>
  );
}

interface SettingToggleProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

function SettingToggle({ label, checked, onChange }: SettingToggleProps) {
  return (
    <label
      data-tauri-disable-drag
      onMouseDown={(event) => event.stopPropagation()}
      className="flex h-7 items-center justify-between gap-3"
    >
      <span className="truncate">{label}</span>
      <input
        data-tauri-disable-drag
        type="checkbox"
        checked={checked}
        onMouseDown={(event) => event.stopPropagation()}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4 shrink-0 accent-emerald-400"
      />
    </label>
  );
}
