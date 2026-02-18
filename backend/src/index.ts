import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

dotenv.config();

import { initDB } from './services/db';
import { initBHP256 } from './services/bhp256';

import authRouter from './routes/auth';
import workersRouter from './routes/workers';
import jobsRouter from './routes/jobs';
import agreementsRouter from './routes/agreements';
import escrowRouter from './routes/escrow';
import reputationRouter from './routes/reputation';

const PORT = parseInt(process.env.PORT || '3001', 10);
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:5173';

const app = express();

app.use(cors({ origin: CORS_ORIGIN, credentials: true }));
app.use(express.json({ limit: '2mb' }));

const limiter = rateLimit({
  windowMs: 60_000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});
app.use(limiter);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRouter);
app.use('/api/workers', workersRouter);
app.use('/api/jobs', jobsRouter);
app.use('/api/agreements', agreementsRouter);
app.use('/api/escrow', escrowRouter);
app.use('/api/reputation', reputationRouter);

async function start(): Promise<void> {
  await initDB();
  console.log('[DB] Initialized');

  try {
    await initBHP256();
    console.log('[BHP256] Worker preloaded');
  } catch (err) {
    console.warn('[BHP256] Preload failed, will retry on first use:', err);
  }

  app.listen(PORT, () => {
    console.log(`[ZKWork Backend] Running on port ${PORT}`);
  });
}

start().catch((err) => {
  console.error('[Fatal] Failed to start server:', err);
  process.exit(1);
});

export default app;
