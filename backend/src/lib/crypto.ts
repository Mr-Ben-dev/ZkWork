import { createHash } from 'crypto';

export function hashAddress(address: string): string {
  return createHash('sha256').update(address).digest('hex');
}

export function generateId(): string {
  return createHash('sha256')
    .update(Date.now().toString() + Math.random().toString())
    .digest('hex')
    .substring(0, 32);
}
