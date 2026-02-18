import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';
import path from 'path';
import { Database } from '../types';

const defaultData: Database = {
  workers: {},
  jobs: {},
  applications: {},
  agreements: {},
  escrows: {},
  deliverables: {},
  reputation: {},
  nonces: {},
  events: [],
};

const dbPath = path.resolve(__dirname, '../../data/db.json');
const adapter = new JSONFile<Database>(dbPath);
const db = new Low<Database>(adapter, defaultData);

let initialized = false;

export async function initDB(): Promise<void> {
  if (initialized) return;
  await db.read();
  if (!db.data) {
    db.data = defaultData;
    await db.write();
  }
  if (!db.data.workers) db.data.workers = {};
  if (!db.data.jobs) db.data.jobs = {};
  if (!db.data.applications) db.data.applications = {};
  if (!db.data.agreements) db.data.agreements = {};
  if (!db.data.escrows) db.data.escrows = {};
  if (!db.data.deliverables) db.data.deliverables = {};
  if (!db.data.reputation) db.data.reputation = {};
  if (!db.data.nonces) db.data.nonces = {};
  if (!db.data.events) db.data.events = [];
  initialized = true;
}

export async function getDB(): Promise<Low<Database>> {
  await initDB();
  return db;
}

export async function saveDB(): Promise<void> {
  await db.write();
}

export async function logEvent(
  type: string,
  actorHash: string,
  data: Record<string, unknown>
): Promise<void> {
  const d = await getDB();
  d.data.events.push({
    type,
    actorHash,
    data,
    timestamp: new Date().toISOString(),
  });
  if (d.data.events.length > 10000) {
    d.data.events = d.data.events.slice(-5000);
  }
  await saveDB();
}
