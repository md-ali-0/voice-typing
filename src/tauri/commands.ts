import { invoke } from '@tauri-apps/api/core';
import type { NativeCommandResult, TypingPayload } from '../types/app';

export async function typeIntoFocusedApp(payload: TypingPayload): Promise<void> {
  const result = await invoke<NativeCommandResult>('type_text', { payload });
  if (!result.ok) {
    throw new Error(result.error || 'Failed to type into focused app.');
  }
}

export async function setStartupEnabled(enabled: boolean): Promise<void> {
  const result = await invoke<NativeCommandResult>('set_startup_enabled', { enabled });
  if (!result.ok) {
    throw new Error(result.error || 'Failed to update startup setting.');
  }
}
