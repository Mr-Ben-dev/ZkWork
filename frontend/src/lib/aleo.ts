export const PROGRAM_ID = import.meta.env.VITE_ALEO_PROGRAM_ID || 'zkwork_private_v1.aleo';

export const SCALING_FACTOR = 1_000_000;

export function microToDisplay(micro: number, decimals = 2): string {
  return (micro / SCALING_FACTOR).toFixed(decimals);
}

export function displayToMicro(display: number): number {
  return Math.round(display * SCALING_FACTOR);
}

export function formatAddress(address: string, chars = 6): string {
  if (!address || address.length < chars * 2 + 4) return address;
  return `${address.slice(0, chars + 5)}...${address.slice(-chars)}`;
}

export function parseRecordData(record: any): Record<string, any> {
  if (!record) return {};
  const data = record.data || record;
  const parsed: Record<string, any> = {};
  for (const [key, val] of Object.entries(data)) {
    if (typeof val === 'string') {
      if (val.endsWith('u64') || val.endsWith('u128') || val.endsWith('u32') || val.endsWith('u8')) {
        parsed[key] = parseInt(val.replace(/u\d+$/, ''), 10);
      } else if (val.endsWith('field')) {
        parsed[key] = val;
      } else if (val.endsWith('.private') || val.endsWith('.public')) {
        parsed[key] = val.replace(/\.(private|public)$/, '');
      } else {
        parsed[key] = val;
      }
    } else {
      parsed[key] = val;
    }
  }
  return parsed;
}

export function identifyRecordType(record: any): string {
  const data = record.data || record;
  const keys = Object.keys(data).filter((k) => k !== 'owner');

  if (keys.includes('skills_hash') && keys.includes('rate')) return 'WorkerProfile';
  if (keys.includes('budget') && keys.includes('deadline')) return 'JobOffer';
  if (keys.includes('client') && keys.includes('worker') && keys.includes('job_id'))
    return 'Agreement';
  if (keys.includes('agreement_id') && keys.includes('amount') && keys.includes('currency'))
    return 'EscrowReceipt';
  if (keys.includes('agreement_id') && keys.includes('deliverable_hash'))
    return 'DeliveryNotice';
  if (keys.includes('agreement_id') && keys.includes('client') && keys.includes('worker') && keys.includes('completed_at'))
    return 'CompletionReceipt';
  if (keys.includes('total_jobs') && keys.includes('total_rating'))
    return 'ReputationRecord';
  if (keys.includes('threshold') && keys.includes('verifier'))
    return 'ThresholdProof';
  return 'Unknown';
}
