import { Router, Response } from 'express';
import { AuthRequest, authMiddleware } from '../middleware/auth';
import { getDB, saveDB, logEvent } from '../services/db';
import { createJobSchema, applyJobSchema } from '../lib/validate';
import { hashAddress, generateId } from '../lib/crypto';

const router = Router();

router.post('/create', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const parsed = createJobSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid request', details: parsed.error.issues });
      return;
    }

    const address = req.userAddress!;
    const addrHash = hashAddress(address);
    const db = await getDB();

    if (db.data.jobs[parsed.data.commitment]) {
      res.status(409).json({ error: 'Job already exists' });
      return;
    }

    db.data.jobs[parsed.data.commitment] = {
      commitment: parsed.data.commitment,
      title: parsed.data.title,
      description: parsed.data.description,
      budget: parsed.data.budget,
      currency: parsed.data.currency,
      skills: parsed.data.skills,
      deadline: parsed.data.deadline,
      posterHash: addrHash,
      status: 'open',
      applicantCount: 0,
      txId: parsed.data.txId,
      createdAt: new Date().toISOString(),
    };
    await saveDB();
    await logEvent('job_created', addrHash, { commitment: parsed.data.commitment });

    res.json({ success: true, commitment: parsed.data.commitment });
  } catch (err) {
    console.error('[Jobs] Create error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/available', async (_req, res: Response): Promise<void> => {
  try {
    const db = await getDB();
    const jobs = Object.values(db.data.jobs)
      .filter((j) => j.status === 'open')
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    res.json({ jobs });
  } catch (err) {
    console.error('[Jobs] Available error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/my', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const address = req.userAddress!;
    const addrHash = hashAddress(address);
    const db = await getDB();
    const jobs = Object.values(db.data.jobs).filter((j) => j.posterHash === addrHash);
    res.json({ jobs });
  } catch (err) {
    console.error('[Jobs] My error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/:commitment/apply', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const parsed = applyJobSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid request', details: parsed.error.issues });
      return;
    }

    const { commitment } = req.params;
    const address = req.userAddress!;
    const addrHash = hashAddress(address);
    const db = await getDB();

    const job = db.data.jobs[commitment];
    if (!job) {
      res.status(404).json({ error: 'Job not found' });
      return;
    }
    if (job.status !== 'open') {
      res.status(400).json({ error: 'Job is no longer available' });
      return;
    }
    if (job.posterHash === addrHash) {
      res.status(400).json({ error: 'Cannot apply to your own job' });
      return;
    }

    const existingApp = Object.values(db.data.applications).find(
      (a) => a.jobCommitment === commitment && a.workerHash === addrHash
    );
    if (existingApp) {
      res.status(409).json({ error: 'Already applied to this job' });
      return;
    }

    const appId = generateId();
    db.data.applications[appId] = {
      id: appId,
      jobCommitment: commitment,
      workerCommitment: parsed.data.workerCommitment,
      workerHash: addrHash,
      workerAddress: address,
      coverLetter: parsed.data.coverLetter,
      proposedRate: parsed.data.proposedRate,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    const job2 = db.data.jobs[commitment];
    if (job2) {
      job2.applicantCount = (job2.applicantCount || 0) + 1;
    }
    await saveDB();
    await logEvent('job_application', addrHash, { jobCommitment: commitment });

    res.json({ success: true, applicationId: appId });
  } catch (err) {
    console.error('[Jobs] Apply error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:commitment/applications', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { commitment } = req.params;
    const address = req.userAddress!;
    const addrHash = hashAddress(address);
    const db = await getDB();

    const job = db.data.jobs[commitment];
    if (!job) {
      res.status(404).json({ error: 'Job not found' });
      return;
    }
    if (job.posterHash !== addrHash) {
      res.status(403).json({ error: 'Not authorized to view applications' });
      return;
    }

    const applications = Object.values(db.data.applications).filter(
      (a) => a.jobCommitment === commitment
    );

    res.json({ applications });
  } catch (err) {
    console.error('[Jobs] Applications error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/:commitment/cancel', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { commitment } = req.params;
    const address = req.userAddress!;
    const addrHash = hashAddress(address);
    const db = await getDB();

    const job = db.data.jobs[commitment];
    if (!job) {
      res.status(404).json({ error: 'Job not found' });
      return;
    }
    if (job.posterHash !== addrHash) {
      res.status(403).json({ error: 'Not authorized' });
      return;
    }
    if (job.status !== 'open') {
      res.status(400).json({ error: 'Job cannot be cancelled in current state' });
      return;
    }

    job.status = 'cancelled';
    await saveDB();
    await logEvent('job_cancelled', addrHash, { jobCommitment: commitment });

    res.json({ success: true });
  } catch (err) {
    console.error('[Jobs] Cancel error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:commitment', async (req, res: Response): Promise<void> => {
  try {
    const { commitment } = req.params;
    const db = await getDB();
    const job = db.data.jobs[commitment];
    if (!job) {
      res.status(404).json({ error: 'Job not found' });
      return;
    }
    res.json({ job });
  } catch (err) {
    console.error('[Jobs] Get error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
