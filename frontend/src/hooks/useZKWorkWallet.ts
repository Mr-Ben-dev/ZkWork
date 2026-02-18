import { useCallback } from 'react';
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';
import { apiClient } from '../lib/api';
import { useUserStore } from '../stores/userStore';
import { usePendingTxStore } from '../stores/pendingTxStore';

const PROGRAM_ID = import.meta.env.VITE_ALEO_PROGRAM_ID || 'zkwork_private_v1.aleo';

let _authInProgress: Promise<boolean> | null = null;

export function useZKWorkWallet() {
  const wallet = useWallet();
  const { setUser, clearUser } = useUserStore();
  const { addPendingTx, confirmTx, failTx, updateTxId } = usePendingTxStore();

  const walletAddress = wallet.address ?? null;

  const authenticate = useCallback(async (): Promise<boolean> => {
    if (!wallet.connected || !walletAddress) return false;

    if (_authInProgress) return _authInProgress;

    _authInProgress = (async () => {
      try {
        const { nonce, message } = await apiClient.getNonce(walletAddress);
        const messageBytes = new TextEncoder().encode(message);
        const signResult = await wallet.signMessage(messageBytes);

        let signatureString: string;
        if (!signResult) {
          return false;
        } else if (typeof signResult === 'string') {
          signatureString = signResult;
        } else if (signResult instanceof Uint8Array) {
          signatureString = btoa(String.fromCharCode(...signResult));
        } else {
          signatureString = JSON.stringify(signResult);
        }

        const result = await apiClient.verifySignature(walletAddress, signatureString, nonce);
        localStorage.setItem('zkwork_token', result.token);
        setUser({ address: walletAddress, token: result.token });
        return true;
      } catch (err) {
        console.error('[Auth] Failed:', err);
        return false;
      }
    })();

    try {
      return await _authInProgress;
    } finally {
      _authInProgress = null;
    }
  }, [wallet.connected, walletAddress, wallet.signMessage, setUser]);

  const disconnect = useCallback(() => {
    localStorage.removeItem('zkwork_token');
    clearUser();
    if (wallet.disconnect) wallet.disconnect();
  }, [wallet.disconnect, clearUser]);

  const executeTransition = useCallback(
    async (
      transitionName: string,
      inputs: string[],
      fee: number,
      txType: string,
      meta?: Record<string, unknown>
    ): Promise<string | null> => {
      if (!wallet.executeTransaction) {
        console.error('[Wallet] executeTransaction not available');
        return null;
      }

      try {
        const txResult = await wallet.executeTransaction({
          program: PROGRAM_ID,
          function: transitionName,
          inputs,
          fee,
          privateFee: false,
        });

        const tempTxId = txResult?.transactionId ?? null;

        if (tempTxId) {
          addPendingTx({
            id: tempTxId,
            type: txType,
            status: 'pending',
            createdAt: new Date().toISOString(),
            meta,
          });

          // Auto-start polling for this transaction
          pollTransactionUntilDone(tempTxId);
        }

        return tempTxId;
      } catch (err) {
        console.error(`[Wallet] Transition ${transitionName} failed:`, err);
        return null;
      }
    },
    [wallet.executeTransaction, addPendingTx]
  );

  const decryptRecords = useCallback(
    async (programId?: string): Promise<unknown[]> => {
      const pid = programId || PROGRAM_ID;
      try {
        const records = await wallet.requestRecords(pid, true);
        if (Array.isArray(records)) return records;
        return [];
      } catch (err) {
        console.error('[Wallet] Record decryption failed:', err);
        return [];
      }
    },
    [wallet.requestRecords]
  );

  /**
   * Shield wallet returns records as metadata objects like:
   * { blockHeight, blockTimestamp, commitment, functionName, outputIndex,
   *   owner, programName, recordCiphertext, plaintext? }
   *
   * For transition inputs we need Leo record plaintext.
   * wallet.decrypt() converts recordCiphertext → plaintext.
   * The plaintext must be passed as-is — do NOT strip any fields.
   */

  /**
   * Find ALL records matching the criteria and content filter.
   * Returns an array of all matching decrypted plaintexts (not just the first).
   */
  const findAllRecords = useCallback(
    async (
      criteria: { functionName?: string; programName?: string },
      programId?: string,
      contentFilter?: (plaintext: string) => boolean
    ): Promise<string[]> => {
      const records = await decryptRecords(programId);
      const reversed = [...records].reverse();
      const results: string[] = [];

      for (const record of reversed) {
        if (!record || typeof record !== 'object') continue;
        const rec = record as Record<string, unknown>;
        if (rec.spent === true) continue;
        if (criteria.functionName && rec.functionName !== criteria.functionName) continue;
        if (criteria.programName && rec.programName !== criteria.programName) continue;

        let plaintext: string | null = null;
        if (typeof rec.plaintext === 'string' && rec.plaintext.includes('{')) {
          plaintext = rec.plaintext;
        }
        if (!plaintext && typeof rec.recordCiphertext === 'string' && rec.recordCiphertext.startsWith('record1')) {
          try {
            plaintext = await wallet.decrypt(rec.recordCiphertext);
          } catch {
            continue;
          }
        }
        if (!plaintext) continue;
        if (contentFilter && !contentFilter(plaintext)) continue;
        results.push(plaintext);
      }
      return results;
    },
    [decryptRecords, wallet.decrypt]
  );

  /**
   * Find a record by matching metadata fields (functionName, programName, etc.).
   * Decrypts the record ciphertext via wallet.decrypt() to get proper Leo plaintext.
   * Optional contentFilter checks the decrypted plaintext for specific content.
   */
  const findRecord = useCallback(
    async (
      criteria: { functionName?: string; programName?: string },
      programId?: string,
      contentFilter?: (plaintext: string) => boolean
    ): Promise<string | null> => {
      const records = await decryptRecords(programId);
      const fnNames = records.map((r: any) => r?.functionName || 'unknown');
      console.log(`[findRecord] Found ${records.length} records, criteria:`, criteria, 'functions:', fnNames);

      // Iterate newest-first — older records are more likely to be already consumed
      const reversed = [...records].reverse();

      for (const record of reversed) {
        if (!record || typeof record !== 'object') continue;
        const rec = record as Record<string, unknown>;

        // Skip spent records
        if (rec.spent === true) continue;

        // Match by metadata fields
        if (criteria.functionName && rec.functionName !== criteria.functionName) continue;
        if (criteria.programName && rec.programName !== criteria.programName) continue;

        let plaintext: string | null = null;

        // Priority 1: If plaintext already available, use as-is
        if (typeof rec.plaintext === 'string' && rec.plaintext.includes('{')) {
          plaintext = rec.plaintext;
        }

        // Priority 2: Decrypt ciphertext via wallet.decrypt()
        if (!plaintext && typeof rec.recordCiphertext === 'string' && rec.recordCiphertext.startsWith('record1')) {
          try {
            console.log('[findRecord] Decrypting ciphertext via wallet.decrypt()...');
            plaintext = await wallet.decrypt(rec.recordCiphertext);
          } catch (err) {
            console.warn('[findRecord] Decrypt failed for record from', rec.functionName, err);
            continue;
          }
        }

        if (!plaintext) {
          console.warn('[findRecord] No usable format in record:', Object.keys(rec).join(', '));
          continue;
        }

        // Apply optional content filter
        if (contentFilter && !contentFilter(plaintext)) {
          console.log('[findRecord] Record skipped by content filter.');
          continue;
        }

        console.log('[findRecord] Matched record:', plaintext.slice(0, 300));
        return plaintext;
      }

      console.warn('[findRecord] No matching record found');
      return null;
    },
    [decryptRecords, wallet.decrypt]
  );

  /**
   * findRecord with retry — waits for Shield to sync new records after a TX.
   * Retries up to `maxRetries` times with `delayMs` between attempts.
   */
  const findRecordWithRetry = useCallback(
    async (
      criteria: { functionName?: string; programName?: string },
      programId?: string,
      contentFilter?: (plaintext: string) => boolean,
      maxRetries = 5,
      delayMs = 4000
    ): Promise<string | null> => {
      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        if (attempt > 0) {
          console.log(`[findRecordWithRetry] Attempt ${attempt + 1}/${maxRetries + 1}, waiting ${delayMs}ms...`);
          await new Promise((r) => setTimeout(r, delayMs));
        }
        const result = await findRecord(criteria, programId, contentFilter);
        if (result) return result;
      }
      return null;
    },
    [findRecord]
  );

  /**
   * Parse microcredits from a credits record (handles various formats).
   */
  const parseMicrocredits = useCallback((record: unknown): number => {
    if (typeof record === 'string') {
      const match = record.match(/microcredits\s*:\s*([\d_]+)u64/);
      return match ? parseInt(match[1].replace(/_/g, ''), 10) : 0;
    }
    if (!record || typeof record !== 'object') return 0;
    const rec = record as Record<string, unknown>;

    // Structured data.microcredits
    const data = rec.data as Record<string, unknown> | undefined;
    if (data?.microcredits) {
      return parseInt(String(data.microcredits).replace(/u64|\.private/g, ''), 10) || 0;
    }
    // Top-level microcredits
    if (rec.microcredits !== undefined) {
      if (typeof rec.microcredits === 'number') return rec.microcredits;
      return parseInt(String(rec.microcredits).replace(/u64|\.private/g, ''), 10) || 0;
    }
    // Parse from plaintext string
    const pt = (rec.plaintext || rec._plaintext) as string | undefined;
    if (pt && typeof pt === 'string') {
      const match = pt.match(/microcredits\s*:\s*([\d_]+)u64/);
      if (match) return parseInt(match[1].replace(/_/g, ''), 10);
    }
    return 0;
  }, []);

  /**
   * Find a credits.aleo record with sufficient balance.
   * Decrypts records and parses microcredits to find the best match.
   * Returns plaintext string — never ciphertext for credits records.
   */
  const findCreditsRecord = useCallback(
    async (minAmount: number): Promise<string | null> => {
      const records = await decryptRecords('credits.aleo');
      console.log(`[findCreditsRecord] Found ${records.length} credits records, need ${minAmount}`);

      let fallbackRecord: string | null = null;
      let anyKnownBalance = false;

      for (const record of records) {
        if (!record || typeof record !== 'object') continue;
        const rec = record as Record<string, unknown>;
        if (rec.spent === true) continue;

        let mc = parseMicrocredits(record);
        let input: string | null = null;

        // 1. Use plaintext if available
        if (typeof rec.plaintext === 'string' && rec.plaintext.includes('{')) {
          input = rec.plaintext;
          if (mc === 0) mc = parseMicrocredits(rec.plaintext);
        }

        // 2. Decrypt ciphertext to get plaintext
        if (!input && typeof rec.recordCiphertext === 'string' && rec.recordCiphertext.startsWith('record1')) {
          try {
            const decrypted = await wallet.decrypt(rec.recordCiphertext);
            if (decrypted) {
              input = decrypted;
              if (mc === 0) mc = parseMicrocredits(decrypted);
              console.log('[findCreditsRecord] Decrypted credits:', decrypted.slice(0, 150));
            }
          } catch (e) {
            console.warn('[findCreditsRecord] Decrypt failed:', e);
          }
        }

        if (!input) continue;
        if (mc > 0) anyKnownBalance = true;
        if (!fallbackRecord) fallbackRecord = input;

        if (mc >= minAmount) {
          console.log(`[findCreditsRecord] Found record with ${mc} microcredits (need ${minAmount})`);
          return input;
        }
      }

      // Only use fallback if we couldn't parse ANY balance
      if (fallbackRecord && !anyKnownBalance) {
        console.warn('[findCreditsRecord] No balance could be parsed — using fallback');
        return fallbackRecord;
      }

      if (anyKnownBalance) {
        console.warn('[findCreditsRecord] All records have insufficient balance');
      }
      return null;
    },
    [decryptRecords, wallet.decrypt, parseMicrocredits]
  );

  /**
   * Find a USDCx Token record from test_usdcx_stablecoin.aleo with sufficient balance.
   * Token record has { owner: address, amount: u128 }. Returns plaintext string.
   */
  const findTokenRecord = useCallback(
    async (minAmount: bigint): Promise<string | null> => {
      const USDCX_PID = 'test_usdcx_stablecoin.aleo';
      const records = await decryptRecords(USDCX_PID);
      console.log(`[findTokenRecord] Found ${records.length} USDCx records, need ${minAmount}`);

      for (const record of records) {
        if (!record || typeof record !== 'object') continue;
        const rec = record as Record<string, unknown>;
        if (rec.spent === true) continue;

        let plaintext: string | null = null;
        let amount = BigInt(0);

        // Try plaintext first
        if (typeof rec.plaintext === 'string' && rec.plaintext.includes('{')) {
          plaintext = rec.plaintext;
        }

        // Decrypt if needed
        if (!plaintext && typeof rec.recordCiphertext === 'string' && rec.recordCiphertext.startsWith('record1')) {
          try {
            plaintext = await wallet.decrypt(rec.recordCiphertext);
          } catch {
            continue;
          }
        }

        if (!plaintext) continue;

        // Parse amount from plaintext: amount: 300000u128.private or amount: 300000u128
        const amountMatch = plaintext.match(/amount\s*:\s*([\d_]+)u128/);
        if (amountMatch) {
          amount = BigInt(amountMatch[1].replace(/_/g, ''));
        }

        // Also check structured data
        if (amount === BigInt(0)) {
          const data = rec.data as Record<string, string> | undefined;
          if (data?.amount) {
            amount = BigInt(String(data.amount).replace(/u128|\.private/g, ''));
          }
        }

        if (amount >= minAmount) {
          console.log(`[findTokenRecord] Found USDCx record with ${amount} (need ${minAmount})`);
          return plaintext;
        }
      }

      console.warn('[findTokenRecord] No USDCx record with sufficient balance');
      return null;
    },
    [decryptRecords, wallet.decrypt]
  );

  /**
   * Poll a single transaction until it reaches a terminal state.
   * Handles Shield's temp IDs by checking transactionStatus which
   * returns the real on-chain txId once available.
   */
  const pollTransactionUntilDone = useCallback(
    (txId: string) => {
      if (!txId) return;

      let attempts = 0;
      const maxAttempts = 120; // ~10 minutes at 5s intervals

      const intervalId = setInterval(async () => {
        attempts++;

        if (attempts > maxAttempts) {
          console.warn(`[Poll] Giving up on ${txId} after ${maxAttempts} attempts`);
          failTx(txId);
          clearInterval(intervalId);
          return;
        }

        try {
          const statusResult = await wallet.transactionStatus(txId);
          const statusStr = (statusResult?.status ?? '').toLowerCase();
          const realTxId = statusResult?.transactionId;

          console.log(`[Poll] ${txId.slice(0, 20)}... → status: ${statusStr}, realTxId: ${realTxId?.slice(0, 20) ?? 'none'}`);

          // Update pending store with real TX ID if available and different
          if (realTxId && realTxId !== txId && realTxId.startsWith('at1')) {
            updateTxId(txId, realTxId);
          }

          if (statusStr === 'accepted' || statusStr === 'completed' || statusStr === 'finalized') {
            confirmTx(realTxId && realTxId.startsWith('at1') ? realTxId : txId);
            clearInterval(intervalId);
            return;
          }

          if (statusStr === 'failed' || statusStr === 'rejected') {
            failTx(realTxId && realTxId.startsWith('at1') ? realTxId : txId);
            clearInterval(intervalId);
            return;
          }
        } catch {
          // Status check failed, keep trying
        }

        // Fallback: if it's already an on-chain ID, try explorer
        try {
          const checkId = txId.startsWith('at1') ? txId : null;
          if (checkId) {
            const verified = await apiClient.verifyTransaction(checkId);
            if (verified) {
              confirmTx(checkId);
              clearInterval(intervalId);
              return;
            }
          }
        } catch {
          // Explorer check failed, keep trying
        }
      }, 5000);
    },
    [wallet.transactionStatus, confirmTx, failTx, updateTxId]
  );

  return {
    wallet,
    walletAddress,
    connected: wallet.connected,
    connecting: wallet.connecting,
    authenticate,
    disconnect,
    executeTransition,
    decryptRecords,
    findRecord,
    findAllRecords,
    findRecordWithRetry,
    findCreditsRecord,
    findTokenRecord,
  };
}
