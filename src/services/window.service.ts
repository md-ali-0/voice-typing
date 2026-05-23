import { LogicalSize } from '@tauri-apps/api/dpi';
import { getCurrentWindow } from '@tauri-apps/api/window';

const COLLAPSED_SIZE = new LogicalSize(280, 92);
const EXPANDED_SIZE = new LogicalSize(280, 220);

export class WindowService {
  static async configureFloatingWindow(): Promise<void> {
    const window = getCurrentWindow();
    await Promise.allSettled([
      window.setAlwaysOnTop(true),
      window.setShadow(true),
      window.setFocusable(false),
      window.setSize(COLLAPSED_SIZE),
      window.setMinSize(COLLAPSED_SIZE),
      window.setMaxSize(EXPANDED_SIZE)
    ]);
    console.debug('[window] floating window configured');
  }

  static async setSettingsExpanded(expanded: boolean): Promise<void> {
    const window = getCurrentWindow();
    const size = expanded ? EXPANDED_SIZE : COLLAPSED_SIZE;
    if (expanded) {
      await window.setMaxSize(EXPANDED_SIZE);
      await window.setMinSize(EXPANDED_SIZE);
      await window.setSize(EXPANDED_SIZE);
    } else {
      await window.setMinSize(COLLAPSED_SIZE);
      await window.setSize(COLLAPSED_SIZE);
      await window.setMaxSize(COLLAPSED_SIZE);
    }
    console.debug('[window] resized', expanded ? 'expanded' : 'collapsed');
  }
}
