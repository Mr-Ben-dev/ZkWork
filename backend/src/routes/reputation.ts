import { Router, Response } from 'express';
import { AuthRequest, authMiddleware } from '../middleware/auth';
import { getDB, saveDB, logEvent } from '../services/db';
import { claimReputationSchema, proveThresholdSchema } from '../lib/validate';
import { hashAddress } from '../lib/crypto';
import { getMappingValue } from '../services/provableApi';

const router = Router();
const PROGRAM_ID = process.env.ALEO_PROGRAM_ID || 'zkwork_private_v1.aleo';

router.post('/claim', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const parsed = claimReputationSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid request', details: parsed.error.issues });
      return;
    }

    const address = req.userAddress!;
    const addrHash = hashAddress(address);
    const db = await getDB();

    const agreement = db.data.agreements[parsed.data.agreementCommitment];
    if (!agreement) {
      res.status(404).json({ error: 'Agreement not found' });
      return;
    }
    if (agreement.clientHash === addrHash) {
      res.status(403).json({ error: 'Client cannot claim worker reputation' });
      return;
    }
    if (agreement.workerHash && agreement.workerHash !== addrHash) {
      res.status(403).json({ error: 'Only the assigned worker can claim reputation' });
      return;
    }
    if (agreement.status !== 'completed') {
      res.status(400).json({ error: 'Agreement must be completed first' });
      return;
    }
    if (agreement.reputationClaimed) {
      res.status(409).json({ error: 'Reputation already claimed for this agreement' });
      return;
    }

    // Mark agreement as claimed BEFORE incrementing to prevent double-claims
    agreement.reputationClaimed = true;

    if (!db.data.reputation[addrHash]) {
      db.data.reputation[addrHash] = {
        workerHash: addrHash,
        claimedJobs: 0,
        lastClaimTxId: '',
        updatedAt: new Date().toISOString(),
      };
    }

    db.data.reputation[addrHash].claimedJobs += 1;
    db.data.reputation[addrHash].lastClaimTxId = parsed.data.txId;
    db.data.reputation[addrHash].updatedAt = new Date().toISOString();
    await saveDB();
    await logEvent('reputation_claimed', addrHash, {
      agreementCommitment: parsed.data.agreementCommitment,
      totalJobs: db.data.reputation[addrHash].claimedJobs,
    });

    res.json({
      success: true,
      claimedJobs: db.data.reputation[addrHash].claimedJobs,
    });
  } catch (err) {
    console.error('[Reputation] Claim error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/prove', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const parsed = proveThresholdSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid request', details: parsed.error.issues });
      return;
    }

    const address = req.userAddress!;
    const addrHash = hashAddress(address);
    const db = await getDB();

    const rep = db.data.reputation[addrHash];
    if (!rep) {
      res.status(404).json({ error: 'No reputation found' });
      return;
    }

    await logEvent('threshold_proved', addrHash, {
      threshold: parsed.data.threshold,
      verifier: parsed.data.verifierAddress,
      txId: parsed.data.txId,
    });

    res.json({
      success: true,
      message: 'Threshold proof transaction submitted',
    });
  } catch (err) {
    console.error('[Reputation] Prove error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/my', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const address = req.userAddress!;
    const addrHash = hashAddress(address);
    const db = await getDB();
    const rep = db.data.reputation[addrHash];

    res.json({
      reputation: rep || { workerHash: addrHash, claimedJobs: 0, lastClaimTxId: '', updatedAt: '' },
    });
  } catch (err) {
    console.error('[Reputation] My error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/verify/:commitment', async (req, res: Response): Promise<void> => {
  try {
    const { commitment } = req.params;
    let onChainExists: string | null = null;
    try {
      onChainExists = await getMappingValue(PROGRAM_ID, 'reputation_exists', commitment);
    } catch {
      // Chain query failed
    }

    res.json({
      commitment,
      exists: onChainExists === 'true',
    });
  } catch (err) {
    console.error('[Reputation] Verify error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
