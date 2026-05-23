import { clipboard, keyboard, Key } from '@nut-tree-fork/nut-js';
import { spawn } from 'node:child_process';

export interface TypeRequest {
  text: string;
  language: 'bn-BD' | 'en-US';
  typingSpeedMs?: number;
}

export interface TypeResponse {
  ok: boolean;
  error?: string;
}

keyboard.config.autoDelayMs = 8;

export async function typeTextIntoFocusedApp(request: TypeRequest): Promise<TypeResponse> {
  const text = request.text.trimEnd();
  if (!text) {
    return { ok: true };
  }

  try {
    keyboard.config.autoDelayMs = normalizeTypingSpeed(request.typingSpeedMs);
    const output = `${text} `;
    await delay(90);
    if (requiresClipboardFallback(output)) {
      console.error('[sidecar] unicode text detected, using PowerShell Unicode paste');
      await pasteWithWindowsClipboard(output);
    } else {
      await typeAsciiWithNut(output);
    }
    console.error('[sidecar] typed text', { language: request.language, length: output.length });
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'nut.js failed to type text.'
    };
  }
}

function requiresClipboardFallback(text: string): boolean {
  return /[^\u0000-\u007f]/u.test(text);
}

async function typeAsciiWithNut(text: string): Promise<void> {
  try {
    await keyboard.type(text);
  } catch (error) {
    console.error('[sidecar] nut keyboard.type failed, falling back to clipboard paste', error);
    await pasteWithWindowsClipboard(text);
  }
}

async function pasteWithWindowsClipboard(text: string): Promise<void> {
  if (requiresClipboardFallback(text)) {
    await pasteWithPowerShell(text);
    return;
  }

  try {
    await clipboard.setContent(text);
    await delay(60);
    await keyboard.pressKey(Key.LeftControl, Key.V);
    await keyboard.releaseKey(Key.LeftControl, Key.V);
    return;
  } catch (error) {
    console.error('[sidecar] nut clipboard paste failed, using PowerShell fallback', error);
  }

  await pasteWithPowerShell(text);
}

function pasteWithPowerShell(text: string): Promise<void> {
  const encodedText = Buffer.from(text, 'utf16le').toString('base64');
  const script = [
    'Add-Type -AssemblyName System.Windows.Forms;',
    '$text = [Text.Encoding]::Unicode.GetString([Convert]::FromBase64String($args[0]));',
    'Set-Clipboard -Value $text;',
    'Start-Sleep -Milliseconds 90;',
    '[System.Windows.Forms.SendKeys]::SendWait("^v");'
  ].join(' ');

  return new Promise((resolve, reject) => {
    const child = spawn(
      'powershell.exe',
      ['-NoProfile', '-Sta', '-ExecutionPolicy', 'Bypass', '-Command', script, encodedText],
      {
        stdio: ['pipe', 'pipe', 'pipe'],
        windowsHide: true
      }
    );

    let stderr = '';
    child.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString('utf8');
    });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(stderr.trim() || `PowerShell paste failed with exit code ${code}.`));
      }
    });
    child.stdin.end();
  });
}

function normalizeTypingSpeed(speedMs: number | undefined): number {
  if (typeof speedMs !== 'number' || Number.isNaN(speedMs)) {
    return 8;
  }

  return Math.max(0, Math.min(Math.round(speedMs), 40));
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
