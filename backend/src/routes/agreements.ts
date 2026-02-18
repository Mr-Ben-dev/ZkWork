import { Router, Response } from 'express';
import { AuthRequest, authMiddleware } from '../middleware/auth';
import { getDB, saveDB, logEvent } from '../services/db';
import { createAgreementSchema, submitDeliverableSchema } from '../lib/validate';
import { hashAddress } from '../lib/crypto';

const router = Router();

router.post('/create', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const parsed = createAgreementSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid request', details: parsed.error.issues });
      return;
    }

    const address = req.userAddress!;
    const addrHash = hashAddress(address);
    const db = await getDB();

    if (db.data.agreements[parsed.data.commitment]) {
      res.status(409).json({ error: 'Agreement already exists' });
      return;
    }

    const job = db.data.jobs[parsed.data.jobCommitment];
    if (job) {
      job.status = 'assigned';
      const applications = Object.values(db.data.applications).filter(
        (a) => a.jobCommitment === parsed.data.jobCommitment
      );
      for (const app of applications) {
        if (app.workerCommitment === parsed.data.workerCommitment) {
          app.status = 'accepted';
        } else {
          app.status = 'rejected';
        }
      }
    }

    // Find the worker's hash from the application
    const application = Object.values(db.data.applications).find(
      (a) => a.jobCommitment === parsed.data.jobCommitment && a.workerCommitment === parsed.data.workerCommitment
    );
    const workerHash = application?.workerHash || '';

    db.data.agreements[parsed.data.commitment] = {
      commitment: parsed.data.commitment,
      jobCommitment: parsed.data.jobCommitment,
      workerCommitment: parsed.data.workerCommitment,
      workerHash,
      clientHash: addrHash,
      amount: parsed.data.amount,
      currency: parsed.data.currency,
      status: 'active',
      txId: parsed.data.txId,
      createdAt: new Date().toISOString(),
      ...(parsed.data.onChainAgreementId ? { onChainAgreementId: parsed.data.onChainAgreementId } : {}),
    };
    await saveDB();
    await logEvent('agreement_created', addrHash, {
      commitment: parsed.data.commitment,
      jobCommitment: parsed.data.jobCommitment,
    });

    res.json({ success: true, commitment: parsed.data.commitment });
  } catch (err) {
    console.error('[Agreements] Create error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/my', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const address = req.userAddress!;
    const addrHash = hashAddress(address);
    const db = await getDB();

    const agreements = Object.values(db.data.agreements).filter(
      (a) => a.clientHash === addrHash || a.workerHash === addrHash
    );

    const enriched = agreements.map((a) => {
      const job = db.data.jobs[a.jobCommitment];
      const escrow = db.data.escrows[a.commitment];
      const deliverable = db.data.deliverables[a.commitment];
      return {
        ...a,
        jobTitle: job?.title || 'Unknown',
        jobDescription: job?.description || '',
        escrowStatus: escrow?.status || null,
        deliverableStatus: deliverable?.status || null,
        deliverableHash: deliverable?.deliverableHash || null,
        role: a.clientHash === addrHash ? 'client' : 'worker',
      };
    });

    res.json({ agreements: enriched });
  } catch (err) {
    console.error('[Agreements] My error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/:commitment/deliverable', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const parsed = submitDeliverableSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid request', details: parsed.error.issues });
      return;
    }

    const { commitment } = req.params;
    const address = req.userAddress!;
    const addrHash = hashAddress(address);
    const db = await getDB();

    const agreement = db.data.agreements[commitment];
    if (!agreement) {
      res.status(404).json({ error: 'Agreement not found' });
      return;
    }
    if (agreement.clientHash === addrHash) {
      res.status(403).json({ error: 'Client cannot submit deliverables' });
      return;
    }
    if (agreement.workerHash && agreement.workerHash !== addrHash) {
      res.status(403).json({ error: 'Only the assigned worker can submit deliverables' });
      return;
    }
    if (agreement.status !== 'active') {
      res.status(400).json({ error: 'Agreement is not in active state' });
      return;
    }

    if (!agreement.workerHash) {
      agreement.workerHash = addrHash;
    }

    agreement.status = 'delivered';
    agreement.deliverable = parsed.data.deliverable;
    db.data.deliverables[commitment] = {
      agreementCommitment: commitment,
      deliverableHash: parsed.data.deliverable.slice(0, 64),
      status: 'submitted',
      txId: parsed.data.txId,
      createdAt: new Date().toISOString(),
    };
    await saveDB();
    await logEvent('deliverable_submitted', addrHash, {
      agreementCommitment: commitment,
    });

    res.json({ success: true });
  } catch (err) {
    console.error('[Agreements] Deliverable error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:commitment', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { commitment } = req.params;
    const address = req.userAddress!;
    const addrHash = hashAddress(address);
    const db = await getDB();
    const agreement = db.data.agreements[commitment];
    if (!agreement) {
      res.status(404).json({ error: 'Agreement not found' });
      return;
    }

    const job = db.data.jobs[agreement.jobCommitment];
    const escrow = db.data.escrows[commitment];
    const deliverable = db.data.deliverables[commitment];

    const role = agreement.clientHash === addrHash ? 'client'
      : agreement.workerHash === addrHash ? 'worker'
      : 'unknown';

    res.json({
      agreement: {
        ...agreement,
        jobTitle: job?.title || 'Unknown',
        escrowStatus: escrow?.status || null,
        deliverableStatus: deliverable?.status || null,
        role,
      },
    });
  } catch (err) {
    console.error('[Agreements] Get error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /:commitment — update on-chain metadata (e.g., agreement_id from record)
router.patch('/:commitment', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { commitment } = req.params;
    const address = req.userAddress!;
    const addrHash = hashAddress(address);
    const db = await getDB();
    const agreement = db.data.agreements[commitment];
    if (!agreement) {
      res.status(404).json({ error: 'Agreement not found' });
      return;
    }
    // Only client or worker can update
    if (agreement.clientHash !== addrHash && agreement.workerHash !== addrHash) {
      res.status(403).json({ error: 'Unauthorized' });
      return;
    }
    const { onChainAgreementId } = req.body;
    if (onChainAgreementId && typeof onChainAgreementId === 'string') {
      agreement.onChainAgreementId = onChainAgreementId;
    }
    await saveDB();
    res.json({ success: true });
  } catch (err) {
    console.error('[Agreements] Patch error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
