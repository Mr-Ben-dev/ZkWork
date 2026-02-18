export const USDCX_PROGRAM = 'test_usdcx_stablecoin.aleo';
export const USDCX_DECIMALS = 6;
export const USDCX_SCALING = 1_000_000;

export function formatUSDCx(microAmount: number): string {
  return (microAmount / USDCX_SCALING).toFixed(2);
}

export function toMicroUSDCx(display: number): number {
  return Math.round(display * USDCX_SCALING);
}

export function buildMerkleProofs(): string {
  const defaultSibling = '0field';
  const siblings = Array(16).fill(defaultSibling).join(', ');
  return `{ siblings: [${siblings}], leaf_index: 1u32 }`;
}

export function buildMerkleProofPair(): [string, string] {
  const proof = buildMerkleProofs();
  return [proof, proof];
}
