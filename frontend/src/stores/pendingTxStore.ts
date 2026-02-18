import { create } from 'zustand';
import type { PendingTx } from '../lib/types';

interface PendingTxState {
  transactions: PendingTx[];
  addPendingTx: (tx: PendingTx) => void;
  confirmTx: (id: string) => void;
  failTx: (id: string) => void;
  updateTxId: (oldId: string, newId: string) => void;
  clearConfirmed: () => void;
}

export const usePendingTxStore = create<PendingTxState>()((set) => ({
  transactions: [],
  addPendingTx: (tx) =>
    set((s) => ({ transactions: [...s.transactions, tx] })),
  confirmTx: (id) =>
    set((s) => ({
      transactions: s.transactions.map((t) =>
        t.id === id ? { ...t, status: 'confirmed' as const } : t
      ),
    })),
  failTx: (id) =>
    set((s) => ({
      transactions: s.transactions.map((t) =>
        t.id === id ? { ...t, status: 'failed' as const } : t
      ),
    })),
  updateTxId: (oldId, newId) =>
    set((s) => ({
      transactions: s.transactions.map((t) =>
        t.id === oldId ? { ...t, id: newId } : t
      ),
    })),
  clearConfirmed: () =>
    set((s) => ({
      transactions: s.transactions.filter((t) => t.status !== 'confirmed'),
    })),
}));
