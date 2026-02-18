import { Router, Response } from 'express';
import { AuthRequest, authMiddleware } from '../middleware/auth';
import { getDB, saveDB, logEvent } from '../services/db';
import { registerWorkerSchema } from '../lib/validate';
import { hashAddress } from '../lib/crypto';

const router = Router();

router.post('/register', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const parsed = registerWorkerSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid request', details: parsed.error.issues });
      return;
    }

    const address = req.userAddress!;
    const addrHash = hashAddress(address);
    const db = await getDB();

    if (db.data.workers[addrHash]) {
      res.status(409).json({ error: 'Worker already registered' });
      return;
    }

    db.data.workers[addrHash] = {
      commitment: parsed.data.commitment,
      skills: parsed.data.skills,
      bio: parsed.data.bio,
      ratePerHour: parsed.data.ratePerHour,
      currency: parsed.data.currency,
      createdAt: new Date().toISOString(),
      txId: parsed.data.txId,
    };
    await saveDB();
    await logEvent('worker_registered', addrHash, { commitment: parsed.data.commitment });

    res.json({ success: true, workerHash: addrHash });
  } catch (err) {
    console.error('[Workers] Register error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/profile', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const address = req.userAddress!;
    const addrHash = hashAddress(address);
    const db = await getDB();
    const worker = db.data.workers[addrHash];

    if (!worker) {
      res.status(404).json({ error: 'Worker not found' });
      return;
    }

    res.json({ worker: { ...worker, workerHash: addrHash } });
  } catch (err) {
    console.error('[Workers] Profile error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/list', async (_req, res: Response): Promise<void> => {
  try {
    const db = await getDB();
    const workers = Object.entries(db.data.workers).map(([hash, w]) => ({
      workerHash: hash,
      commitment: w.commitment,
      skills: w.skills,
      ratePerHour: w.ratePerHour,
      currency: w.currency,
      createdAt: w.createdAt,
    }));
    res.json({ workers });
  } catch (err) {
    console.error('[Workers] List error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:commitment', async (req, res: Response): Promise<void> => {
  try {
    const { commitment } = req.params;
    const db = await getDB();
    const entry = Object.entries(db.data.workers).find(
      ([, w]) => w.commitment === commitment
    );
    if (!entry) {
      res.status(404).json({ error: 'Worker not found' });
      return;
    }
    res.json({ workerHash: entry[0], ...entry[1] });
  } catch (err) {
    console.error('[Workers] Lookup error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
