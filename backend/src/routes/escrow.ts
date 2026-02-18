import { Router, Response } from 'express';
import { AuthRequest, authMiddleware } from '../middleware/auth';
import { getDB, saveDB, logEvent } from '../services/db';
import { depositEscrowSchema, completeJobSchema, refundEscrowSchema } from '../lib/validate';
import { hashAddress } from '../lib/crypto';
import { getMappingValue } from '../services/provableApi';

const router = Router();
const PROGRAM_ID = process.env.ALEO_PROGRAM_ID || 'zkwork_private_v1.aleo';

router.post('/deposit', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const parsed = depositEscrowSchema.safeParse(req.body);
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
    if (agreement.clientHash !== addrHash) {
      res.status(403).json({ error: 'Only the client can deposit escrow' });
      return;
    }

    const existingEscrow = db.data.escrows[parsed.data.agreementCommitment];
    if (existingEscrow && existingEscrow.status !== 'pending' && existingEscrow.status !== 'rejected') {
      res.status(409).json({ error: 'Escrow already deposited' });
      return;
    }

    db.data.escrows[parsed.data.agreementCommitment] = {
      agreementCommitment: parsed.data.agreementCommitment,
      amount: parsed.data.amount,
      currency: parsed.data.currency,
      status: parsed.data.currency === 'aleo' ? 'deposited' : 'committed',
      depositTxId: parsed.data.txId,
      depositHeight: 0,
      releaseTxId: '',
    };
    await saveDB();
    await logEvent('escrow_deposited', addrHash, {
      agreementCommitment: parsed.data.agreementCommitment,
      amount: parsed.data.amount,
      currency: parsed.data.currency,
    });

    res.json({ success: true });
  } catch (err) {
    console.error('[Escrow] Deposit error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/complete', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const parsed = completeJobSchema.safeParse(req.body);
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
    if (agreement.clientHash !== addrHash) {
      res.status(403).json({ error: 'Only the client can complete the job' });
      return;
    }

    const escrow = db.data.escrows[parsed.data.agreementCommitment];
    if (!escrow) {
      res.status(400).json({ error: 'No escrow found for this agreement' });
      return;
    }
    if (escrow.status === 'released') {
      res.status(400).json({ error: 'Escrow already released' });
      return;
    }

    escrow.status = 'released';
    escrow.releaseTxId = parsed.data.txId;
    agreement.status = 'completed';

    const deliverable = db.data.deliverables[parsed.data.agreementCommitment];
    if (deliverable) {
      deliverable.status = 'accepted';
    }

    const job = db.data.jobs[agreement.jobCommitment];
    if (job) {
      job.status = 'completed';
    }

    await saveDB();
    await logEvent('job_completed', addrHash, {
      agreementCommitment: parsed.data.agreementCommitment,
      txId: parsed.data.txId,
    });

    res.json({ success: true });
  } catch (err) {
    console.error('[Escrow] Complete error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/refund', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const parsed = refundEscrowSchema.safeParse(req.body);
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
    if (agreement.clientHash !== addrHash) {
      res.status(403).json({ error: 'Only the client can request refund' });
      return;
    }

    const escrow = db.data.escrows[parsed.data.agreementCommitment];
    if (!escrow) {
      res.status(400).json({ error: 'No escrow found' });
      return;
    }
    if (escrow.status === 'released' || escrow.status === 'refunded') {
      res.status(400).json({ error: 'Escrow already settled' });
      return;
    }

    escrow.status = 'refunded';
    agreement.status = 'refunded';
    await saveDB();
    await logEvent('escrow_refunded', addrHash, {
      agreementCommitment: parsed.data.agreementCommitment,
      txId: parsed.data.txId,
    });

    res.json({ success: true });
  } catch (err) {
    console.error('[Escrow] Refund error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /:commitment/confirm — confirm escrow after TX accepted on-chain
router.patch('/:commitment/confirm', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { commitment } = req.params;
    const { status } = req.body;
    const db = await getDB();
    const escrow = db.data.escrows[commitment];
    if (!escrow) {
      res.status(404).json({ error: 'Escrow not found' });
      return;
    }
    if (status === 'deposited' || status === 'committed' || status === 'rejected') {
      escrow.status = status;
      await saveDB();
    }
    res.json({ success: true });
  } catch (err) {
    console.error('[Escrow] Confirm error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:commitment/status', async (req, res: Response): Promise<void> => {
  try {
    const { commitment } = req.params;
    const db = await getDB();
    const escrow = db.data.escrows[commitment];
    const agreement = db.data.agreements[commitment];

    let onChainEscrow: string | null = null;
    let onChainAgreement: string | null = null;
    try {
      onChainEscrow = await getMappingValue(PROGRAM_ID, 'escrow_active', commitment);
      onChainAgreement = await getMappingValue(PROGRAM_ID, 'agreement_active', commitment);
    } catch {
      // Chain query failed, continue with local data
    }

    res.json({
      escrow: escrow || null,
      agreement: agreement || null,
      onChain: {
        escrowActive: onChainEscrow === 'true',
        agreementActive: onChainAgreement === 'true',
      },
    });
  } catch (err) {
    console.error('[Escrow] Status error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
