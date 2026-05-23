import { useEffect, useMemo, useState } from 'react';
import { LanguageSwitch } from './LanguageSwitch';
import { MicButton } from './MicButton';
import { SettingsPopover } from './SettingsPopover';
import { SettingsPanel } from './SettingsPanel';
import { StatusIndicator } from './StatusIndicator';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { useGlobalShortcut } from '../hooks/useGlobalShortcut';
import { useAppStore } from '../stores/appStore';
import { WindowService } from '../services/window.service';

export function VoiceWidget() {
  const { toggle, isSupported } = useSpeechRecognition();
  useGlobalShortcut(toggle);
  const [settingsExpanded, setSettingsExpanded] = useState(false);

  const appState = useAppStore((state) => state.appState);
  const language = useAppStore((state) => state.language);
  const setLanguage = useAppStore((state) => state.setLanguage);
  const interimText = useAppStore((state) => state.interimText);
  const errorMessage = useAppStore((state) => state.errorMessage);

  useEffect(() => {
    void WindowService.configureFloatingWindow();
  }, []);

  function toggleSettings() {
    setSettingsExpanded((expanded) => {
      const next = !expanded;
      void WindowService.setSettingsExpanded(next);
      return next;
    });
  }

  const statusText = useMemo(() => {
    if (!isSupported) {
      return 'Unsupported';
    }
    if (appState === 'error') {
      return errorMessage ?? 'Error';
    }
    if (interimText) {
      return interimText;
    }
    return appState;
  }, [appState, errorMessage, interimText, isSupported]);

  return (
    <main
      data-tauri-drag-region
      className="flex h-screen w-screen select-none items-stretch justify-stretch overflow-hidden bg-transparent text-zinc-100"
    >
      <section
        data-tauri-drag-region
        className="h-full w-full rounded-2xl bg-[#07080a]/95 px-4 py-3 shadow-float backdrop-blur-xl transition-[height] duration-200"
      >
        <div data-tauri-drag-region className="flex h-[68px] items-center gap-3">
          <MicButton state={appState} onClick={toggle} />
          <div data-tauri-drag-region className="min-w-0 flex-1">
            <div data-tauri-drag-region className="mb-2 flex items-center gap-2">
              <StatusIndicator state={isSupported ? appState : 'error'} />
              <p className="max-w-[124px] truncate text-xs font-medium capitalize text-zinc-300">
                {statusText}
              </p>
            </div>
            <LanguageSwitch value={language} onChange={setLanguage} />
          </div>
          <SettingsPopover expanded={settingsExpanded} onToggle={toggleSettings} />
        </div>
        <div
          className={`grid transition-all duration-200 ${
            settingsExpanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
          }`}
        >
          <div className="overflow-hidden">{settingsExpanded && <SettingsPanel />}</div>
        </div>
      </section>
    </main>
  );
}
