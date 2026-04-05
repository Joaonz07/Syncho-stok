import { createHmac, randomBytes } from 'crypto';
import { mkdir, readFile, writeFile } from 'fs/promises';
import path from 'path';
import { supabaseAdmin } from '../supabaseClient';

export const customIntegrationEvents = ['sale.created', 'product.updated', 'stock.low'] as const;

export type CustomIntegrationEvent = (typeof customIntegrationEvents)[number];

export type CustomIntegrationWebhook = {
  id: string;
  url: string;
  events: CustomIntegrationEvent[];
  createdAt: string;
  updatedAt: string;
};

type CompanyIntegrationRecord = {
  companyId: string;
  apiKey: string;
  webhooks: CustomIntegrationWebhook[];
  createdAt: string;
  updatedAt: string;
};

type IntegrationStore = {
  companies: Record<string, CompanyIntegrationRecord>;
};

const storeTableAliases = ['custom_integrations_store', 'customIntegrationsStore'];

const storeFilePath = path.resolve(__dirname, '..', '..', 'data', 'custom-integrations.json');
const storeDirectoryPath = path.dirname(storeFilePath);
const defaultStore: IntegrationStore = { companies: {} };

let writeQueue = Promise.resolve();

const ensureStoreDirectory = async () => {
  await mkdir(storeDirectoryPath, { recursive: true });
};

const cloneDefaultStore = (): IntegrationStore => ({
  companies: {}
});

const normalizeStore = (value: unknown): IntegrationStore => {
  if (!value || typeof value !== 'object') {
    return cloneDefaultStore();
  }

  const raw = value as Partial<IntegrationStore>;

  return {
    companies: raw.companies || {}
  };
};

const readStoreFromDatabase = async (): Promise<{ ok: boolean; store: IntegrationStore | null }> => {
  for (const tableName of storeTableAliases) {
    const response = await supabaseAdmin
      .from(tableName)
      .select('id,data')
      .eq('id', 1)
      .maybeSingle();

    if (!response.error) {
      const row = (response.data || {}) as Record<string, unknown>;
      const store = normalizeStore(row.data);

      return {
        ok: true,
        store
      };
    }
  }

  return {
    ok: false,
    store: null
  };
};

const writeStoreToDatabase = async (store: IntegrationStore): Promise<boolean> => {
  const now = new Date().toISOString();

  for (const tableName of storeTableAliases) {
    const payloadCandidates: Array<Record<string, unknown>> = [
      {
        id: 1,
        data: store,
        updated_at: now
      },
      {
        id: 1,
        data: store,
        updatedAt: now
      }
    ];

    for (const payload of payloadCandidates) {
      const response = await supabaseAdmin
        .from(tableName)
        .upsert(payload, { onConflict: 'id' })
        .select('id')
        .single();

      if (!response.error) {
        return true;
      }
    }
  }

  return false;
};

const readStore = async (): Promise<IntegrationStore> => {
  const fromDatabase = await readStoreFromDatabase();

  if (fromDatabase.ok && fromDatabase.store) {
    return fromDatabase.store;
  }

  await ensureStoreDirectory();

  try {
    const raw = await readFile(storeFilePath, 'utf8');
    const parsed = JSON.parse(raw) as Partial<IntegrationStore>;
    return {
      companies: parsed.companies || {}
    };
  } catch (_error) {
    return cloneDefaultStore();
  }
};

const writeStore = async (store: IntegrationStore) => {
  const persistedInDatabase = await writeStoreToDatabase(store);

  if (persistedInDatabase) {
    return;
  }

  await ensureStoreDirectory();
  await writeFile(storeFilePath, JSON.stringify(store, null, 2), 'utf8');
};

const updateStore = async <T>(updater: (store: IntegrationStore) => Promise<T> | T): Promise<T> => {
  const run = async () => {
    const current = await readStore();
    const result = await updater(current);
    await writeStore(current);
    return result;
  };

  const pending = writeQueue.then(run, run);
  writeQueue = pending.then(
    () => undefined,
    () => undefined
  );
  return pending;
};

const generateApiKey = () => `syncho_${randomBytes(24).toString('hex')}`;

const createWebhookId = () => `wh_${randomBytes(8).toString('hex')}`;

const ensureCompanyRecord = (store: IntegrationStore, companyId: string): CompanyIntegrationRecord => {
  const normalizedCompanyId = String(companyId || '').trim();
  const existing = store.companies[normalizedCompanyId];

  if (existing) {
    return existing;
  }

  const now = new Date().toISOString();
  const created: CompanyIntegrationRecord = {
    companyId: normalizedCompanyId,
    apiKey: generateApiKey(),
    webhooks: [],
    createdAt: now,
    updatedAt: now
  };

  store.companies[normalizedCompanyId] = created;
  return created;
};

export const maskApiKey = (apiKey: string) => {
  const normalized = String(apiKey || '').trim();

  if (normalized.length <= 8) {
    return '••••••••';
  }

  return `${normalized.slice(0, 6)}••••••••${normalized.slice(-4)}`;
};

export const getCompanyIntegrationProfile = async (companyId: string) => {
  return updateStore((store) => {
    const record = ensureCompanyRecord(store, companyId);

    return {
      companyId: record.companyId,
      apiKey: record.apiKey,
      maskedApiKey: maskApiKey(record.apiKey),
      webhooks: record.webhooks,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt
    };
  });
};

export const regenerateCompanyIntegrationApiKey = async (companyId: string) => {
  return updateStore((store) => {
    const record = ensureCompanyRecord(store, companyId);
    const now = new Date().toISOString();
    record.apiKey = generateApiKey();
    record.updatedAt = now;

    return {
      companyId: record.companyId,
      apiKey: record.apiKey,
      maskedApiKey: maskApiKey(record.apiKey),
      webhooks: record.webhooks,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt
    };
  });
};

export const replaceCompanyIntegrationWebhooks = async (
  companyId: string,
  webhooks: Array<{ id?: string; url: string; events: CustomIntegrationEvent[] }>
) => {
  return updateStore((store) => {
    const record = ensureCompanyRecord(store, companyId);
    const now = new Date().toISOString();
    const normalizedWebhooks = webhooks.map((webhook) => ({
      id: String(webhook.id || '').trim() || createWebhookId(),
      url: String(webhook.url || '').trim(),
      events: Array.from(new Set(webhook.events)).filter((event): event is CustomIntegrationEvent =>
        customIntegrationEvents.includes(event)
      ),
      createdAt: now,
      updatedAt: now
    }));

    record.webhooks = normalizedWebhooks;
    record.updatedAt = now;

    return {
      companyId: record.companyId,
      apiKey: record.apiKey,
      maskedApiKey: maskApiKey(record.apiKey),
      webhooks: record.webhooks,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt
    };
  });
};

export const validateCompanyIntegrationApiKey = async (apiKey: string) => {
  const normalizedApiKey = String(apiKey || '').trim();

  if (!normalizedApiKey) {
    return null;
  }

  const store = await readStore();

  for (const record of Object.values(store.companies)) {
    if (record.apiKey === normalizedApiKey) {
      return {
        companyId: record.companyId,
        apiKey: record.apiKey,
        webhooks: record.webhooks
      };
    }
  }

  return null;
};

export const dispatchCompanyWebhookEvent = async (
  companyId: string,
  event: CustomIntegrationEvent,
  payload: Record<string, unknown>
) => {
  const profile = await getCompanyIntegrationProfile(companyId);
  const targets = profile.webhooks.filter((webhook) => webhook.events.includes(event));

  if (!targets.length) {
    return;
  }

  const timestamp = new Date().toISOString();

  await Promise.allSettled(
    targets.map(async (webhook) => {
      const body = JSON.stringify({
        event,
        companyId,
        timestamp,
        data: payload
      });
      const signature = createHmac('sha256', profile.apiKey).update(body).digest('hex');

      await fetch(webhook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Syncho-Stok-Webhooks/1.0',
          'X-Syncho-Event': event,
          'X-Syncho-Company': companyId,
          'X-Syncho-Signature': signature
        },
        body,
        signal: AbortSignal.timeout(5000)
      });
    })
  );
};