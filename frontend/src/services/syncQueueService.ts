import { localDbService } from './localDbService';

export type SyncAction = {
  id: string;
  entity: 'produtos' | 'vendas' | 'itensVenda';
  operation: 'create' | 'update' | 'delete';
  payload: Record<string, unknown>;
  createdAt: string;
};

const makeId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `sync-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

export const syncQueueService = {
  async enqueue(action: Omit<SyncAction, 'id' | 'createdAt'>): Promise<SyncAction> {
    const next: SyncAction = {
      ...action,
      id: makeId(),
      createdAt: new Date().toISOString()
    };

    await localDbService.put('filaSync', next);
    return next;
  },

  async listPending(): Promise<SyncAction[]> {
    return localDbService.getAll<SyncAction>('filaSync');
  },

  async markAsSynced(id: string): Promise<void> {
    await localDbService.delete('filaSync', id);
  }
};
