import { useEffect } from 'react';
import { register, unregister } from '@tauri-apps/plugin-global-shortcut';
import { SHORTCUT } from '../utils/constants';

export function useGlobalShortcut(onToggle: () => void): void {
  useEffect(() => {
    let mounted = true;

    async function bindShortcut() {
      try {
        await unregister(SHORTCUT).catch(() => undefined);
        if (mounted) {
          await register(SHORTCUT, onToggle);
        }
      } catch {
        // Shortcut can already be owned by another application.
      }
    }

    void bindShortcut();

    return () => {
      mounted = false;
      void unregister(SHORTCUT).catch(() => undefined);
    };
  }, [onToggle]);
}
