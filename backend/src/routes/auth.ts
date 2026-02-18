import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { getDB, saveDB } from '../services/db';
import { nonceSchema, verifySchema } from '../lib/validate';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'zkwork_dev_secret';

router.post('/nonce', async (req: Request, res: Response): Promise<void> => {
  try {
    const parsed = nonceSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid request', details: parsed.error.issues });
      return;
    }

    const { address } = parsed.data;
    const nonce = Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
    const message = `Sign this message to authenticate with ZKWork.\nNonce: ${nonce}\nTimestamp: ${new Date().toISOString()}`;

    const db = await getDB();
    db.data.nonces[address] = nonce;
    await saveDB();

    res.json({ nonce, message });
  } catch (err) {
    console.error('[Auth] Nonce error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/verify', async (req: Request, res: Response): Promise<void> => {
  try {
    const parsed = verifySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid request', details: parsed.error.issues });
      return;
    }

    const { address, signature, nonce } = parsed.data;
    const db = await getDB();

    if (db.data.nonces[address] !== nonce) {
      res.status(401).json({ error: 'Invalid or expired nonce' });
      return;
    }

    delete db.data.nonces[address];
    await saveDB();

    if (!signature || signature.length < 1) {
      res.status(401).json({ error: 'Invalid signature' });
      return;
    }

    const token = jwt.sign({ address }, JWT_SECRET, { expiresIn: '7d' });

    res.json({ success: true, token, address });
  } catch (err) {
    console.error('[Auth] Verify error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
