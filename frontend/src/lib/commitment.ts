// BLS12-377 scalar field modulus
const FIELD_MODULUS = BigInt(
  '8444461749428370424248824938781546531375899335154063827935233455917409239041'
);

/**
 * Convert a string to a deterministic Aleo field literal (decimal + "field").
 * Not cryptographically secure — just a deterministic mapping for on-chain hashing.
 */
export function stringToField(input: string): string {
  let h = BigInt(0);
  for (let i = 0; i < input.length; i++) {
    h = (h * BigInt(31) + BigInt(input.charCodeAt(i))) % FIELD_MODULUS;
  }
  return `${h}field`;
}

/**
 * Generate a random valid Aleo field literal.
 * Uses 31 random bytes (248 bits), safely under the ~253-bit field modulus.
 */
export function randomField(): string {
  const arr = new Uint8Array(31);
  crypto.getRandomValues(arr);
  let n = BigInt(0);
  for (const b of arr) {
    n = (n << BigInt(8)) | BigInt(b);
  }
  n = n % FIELD_MODULUS;
  return `${n}field`;
}

export async function computeCommitment(input: string): Promise<string> {
  try {
    const response = await fetch(
      `${import.meta.env.VITE_API_BASE || 'http://localhost:3001/api'}/commitment`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input }),
      }
    );
    if (response.ok) {
      const data = await response.json();
      if (data.commitment) return data.commitment;
    }
  } catch {
    // Fallback to local hash
  }
  return stringToField(input);
}

export function generateSalt(): string {
  return randomField();
}
