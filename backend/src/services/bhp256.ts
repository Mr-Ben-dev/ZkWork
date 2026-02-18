import { execFile } from 'child_process';
import path from 'path';

const WORKER_PATH = path.resolve(__dirname, '../../bhp256-worker.mjs');
const cache = new Map<string, string>();
let serviceReady = false;

export async function initBHP256(): Promise<boolean> {
  try {
    const test = await computeBHP256('1field');
    serviceReady = test !== null;
    return serviceReady;
  } catch {
    console.warn('[BHP256] Service init failed — will use fallback');
    serviceReady = false;
    return false;
  }
}

export function isBHP256Ready(): boolean {
  return serviceReady;
}

export async function computeBHP256(fieldValue: string): Promise<string | null> {
  const key = fieldValue.endsWith('field') ? fieldValue : `${fieldValue}field`;
  if (cache.has(key)) return cache.get(key)!;

  return new Promise((resolve) => {
    execFile(
      'node',
      [WORKER_PATH, key],
      { timeout: 60000 },
      (error, stdout, stderr) => {
        if (error) {
          console.error('[BHP256] Worker error:', error.message);
          resolve(null);
          return;
        }
        const result = stdout.trim();
        if (result.endsWith('field')) {
          cache.set(key, result);
          resolve(result);
        } else {
          console.error('[BHP256] Invalid output:', result, stderr);
          resolve(null);
        }
      }
    );
  });
}

export function getCachedCommitment(key: string): string | undefined {
  const normalizedKey = key.endsWith('field') ? key : `${key}field`;
  return cache.get(normalizedKey);
}
