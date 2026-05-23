import { createInterface } from 'node:readline';
import { stdin, stdout } from 'node:process';
import { typeTextIntoFocusedApp, type TypeRequest } from './nutTypingService.js';

interface SidecarMessage {
  id?: string;
  command?: 'type';
  payload?: TypeRequest;
}

function write(message: unknown): void {
  stdout.write(`${JSON.stringify(message)}\n`);
}

function isTypeRequest(payload: unknown): payload is TypeRequest {
  if (!payload || typeof payload !== 'object') {
    return false;
  }

  const value = payload as Partial<TypeRequest>;
  return typeof value.text === 'string' && (value.language === 'bn-BD' || value.language === 'en-US');
}

const reader = createInterface({ input: stdin, crlfDelay: Infinity });
let typingChain = Promise.resolve();

reader.on('line', (line) => {
  typingChain = typingChain
    .then(async () => {
      let message: SidecarMessage;

      try {
        message = JSON.parse(line) as SidecarMessage;
      } catch {
        write({ ok: false, error: 'Invalid JSON message.' });
        return;
      }

      if (message.command !== 'type' || !isTypeRequest(message.payload)) {
        write({ id: message.id, ok: false, error: 'Unsupported sidecar command.' });
        return;
      }

      const result = await typeTextIntoFocusedApp(message.payload);
      write({ id: message.id, ...result });
    })
    .catch((error) => {
      write({
        ok: false,
        error: error instanceof Error ? error.message : 'Unexpected sidecar failure.'
      });
    });
});

reader.on('close', () => process.exit(0));
