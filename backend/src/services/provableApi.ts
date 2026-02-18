const PROVABLE_API_BASE =
  process.env.PROVABLE_API_BASE || 'https://api.explorer.provable.com/v1/testnet';

export async function getMappingValue(
  programId: string,
  mappingName: string,
  key: string
): Promise<string | null> {
  try {
    const url = `${PROVABLE_API_BASE}/program/${programId}/mapping/${mappingName}/${key}`;
    const response = await fetch(url);
    if (!response.ok) return null;
    const data = await response.json();
    if (data === null || data === undefined || data === 'null') return null;
    if (typeof data === 'string') return data;
    if (typeof data === 'object' && 'value' in data) return String(data.value);
    return String(data);
  } catch {
    return null;
  }
}

export async function verifyTransactionAccepted(txId: string): Promise<boolean> {
  try {
    if (txId.startsWith('shield_')) return true;
    const url = `${PROVABLE_API_BASE}/transaction/${txId}`;
    const response = await fetch(url);
    if (!response.ok) return false;
    const data = await response.json() as Record<string, unknown>;
    return data.status === 'accepted' || data.type === 'execute' || !!data.execution;
  } catch {
    return false;
  }
}

export async function fetchBlockTransactions(height: number): Promise<unknown[]> {
  try {
    const url = `${PROVABLE_API_BASE}/block/${height}/transactions`;
    const response = await fetch(url);
    if (!response.ok) return [];
    return (await response.json()) as unknown[];
  } catch {
    return [];
  }
}

export async function getProgramInfo(programId: string): Promise<unknown | null> {
  try {
    const url = `${PROVABLE_API_BASE}/program/${programId}`;
    const response = await fetch(url);
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}
