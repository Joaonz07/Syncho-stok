import { randomBytes } from 'crypto';
import { mkdir, readFile, writeFile } from 'fs/promises';
import path from 'path';

export type CrmInteractionType = 'CALL' | 'MESSAGE' | 'MEETING' | 'SALE' | 'NOTE';
export type CrmTaskPriority = 'BAIXA' | 'MEDIA' | 'ALTA';
export type CrmTaskStatus = 'PENDENTE' | 'CONCLUIDA';

export type LeadCrmDetails = {
  phone: string;
  email: string;
  source: string;
  interest: string;
  ownerId: string;
  ownerName: string;
  updatedAt: string;
};

export type LeadCrmInteraction = {
  id: string;
  type: CrmInteractionType;
  content: string;
  happenedAt: string;
  createdAt: string;
  createdById: string;
  createdByName: string;
};

export type LeadCrmTask = {
  id: string;
  title: string;
  dueDate: string;
  priority: CrmTaskPriority;
  status: CrmTaskStatus;
  assignedToId: string;
  assignedToName: string;
  createdAt: string;
  updatedAt: string;
};

type LeadCrmRecord = {
  details: LeadCrmDetails;
  interactions: LeadCrmInteraction[];
  tasks: LeadCrmTask[];
};

type CompanyCrmRecord = {
  companyId: string;
  leads: Record<string, LeadCrmRecord>;
  createdAt: string;
  updatedAt: string;
};

type CrmStore = {
  companies: Record<string, CompanyCrmRecord>;
};

const storeFilePath = path.resolve(__dirname, '..', '..', 'data', 'crm-store.json');
const storeDirectoryPath = path.dirname(storeFilePath);

let writeQueue = Promise.resolve();

const ensureStoreDirectory = async () => {
  await mkdir(storeDirectoryPath, { recursive: true });
};

const cloneDefaultStore = (): CrmStore => ({ companies: {} });

const normalizeStore = (value: unknown): CrmStore => {
  if (!value || typeof value !== 'object') {
    return cloneDefaultStore();
  }

  const raw = value as Partial<CrmStore>;
  return {
    companies: raw.companies || {}
  };
};

const readStore = async (): Promise<CrmStore> => {
  await ensureStoreDirectory();

  try {
    const raw = await readFile(storeFilePath, 'utf8');
    return normalizeStore(JSON.parse(raw));
  } catch (_error) {
    return cloneDefaultStore();
  }
};

const writeStore = async (store: CrmStore) => {
  await ensureStoreDirectory();
  await writeFile(storeFilePath, JSON.stringify(store, null, 2), 'utf8');
};

const updateStore = async <T>(updater: (store: CrmStore) => Promise<T> | T): Promise<T> => {
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

const createId = (prefix: string) => `${prefix}_${randomBytes(8).toString('hex')}`;

const normalizeIsoDate = (value: string | null | undefined, fallback?: string) => {
  const parsed = new Date(String(value || fallback || new Date().toISOString()));

  if (Number.isNaN(parsed.getTime())) {
    return new Date().toISOString();
  }

  return parsed.toISOString();
};

const defaultLeadDetails = (): LeadCrmDetails => ({
  phone: '',
  email: '',
  source: '',
  interest: '',
  ownerId: '',
  ownerName: '',
  updatedAt: new Date().toISOString()
});

const ensureCompanyRecord = (store: CrmStore, companyId: string): CompanyCrmRecord => {
  const normalizedCompanyId = String(companyId || '').trim();
  const existing = store.companies[normalizedCompanyId];

  if (existing) {
    return existing;
  }

  const now = new Date().toISOString();
  const created: CompanyCrmRecord = {
    companyId: normalizedCompanyId,
    leads: {},
    createdAt: now,
    updatedAt: now
  };

  store.companies[normalizedCompanyId] = created;
  return created;
};

const ensureLeadRecord = (company: CompanyCrmRecord, leadId: string): LeadCrmRecord => {
  const normalizedLeadId = String(leadId || '').trim();
  const existing = company.leads[normalizedLeadId];

  if (existing) {
    return existing;
  }

  const created: LeadCrmRecord = {
    details: defaultLeadDetails(),
    interactions: [],
    tasks: []
  };

  company.leads[normalizedLeadId] = created;
  return created;
};

export const getLeadCrmBundle = async (companyId: string, leadId: string) => {
  return updateStore((store) => {
    const company = ensureCompanyRecord(store, companyId);
    const leadRecord = ensureLeadRecord(company, leadId);

    return {
      details: leadRecord.details,
      interactions: [...leadRecord.interactions].sort((left, right) =>
        new Date(right.happenedAt).getTime() - new Date(left.happenedAt).getTime()
      ),
      tasks: [...leadRecord.tasks].sort((left, right) =>
        new Date(left.dueDate).getTime() - new Date(right.dueDate).getTime()
      )
    };
  });
};

export const upsertLeadDetails = async (
  companyId: string,
  leadId: string,
  payload: Partial<Omit<LeadCrmDetails, 'updatedAt'>>
) => {
  return updateStore((store) => {
    const company = ensureCompanyRecord(store, companyId);
    const leadRecord = ensureLeadRecord(company, leadId);
    const now = new Date().toISOString();

    leadRecord.details = {
      ...leadRecord.details,
      phone: String(payload.phone ?? leadRecord.details.phone ?? '').trim(),
      email: String(payload.email ?? leadRecord.details.email ?? '').trim(),
      source: String(payload.source ?? leadRecord.details.source ?? '').trim(),
      interest: String(payload.interest ?? leadRecord.details.interest ?? '').trim(),
      ownerId: String(payload.ownerId ?? leadRecord.details.ownerId ?? '').trim(),
      ownerName: String(payload.ownerName ?? leadRecord.details.ownerName ?? '').trim(),
      updatedAt: now
    };

    company.updatedAt = now;
    return leadRecord.details;
  });
};

export const addLeadInteraction = async (
  companyId: string,
  leadId: string,
  payload: {
    type: CrmInteractionType;
    content: string;
    happenedAt?: string;
    createdById: string;
    createdByName: string;
  }
) => {
  return updateStore((store) => {
    const company = ensureCompanyRecord(store, companyId);
    const leadRecord = ensureLeadRecord(company, leadId);
    const now = new Date().toISOString();

    const created: LeadCrmInteraction = {
      id: createId('int'),
      type: payload.type,
      content: String(payload.content || '').trim(),
      happenedAt: normalizeIsoDate(payload.happenedAt, now),
      createdAt: now,
      createdById: String(payload.createdById || '').trim(),
      createdByName: String(payload.createdByName || '').trim() || 'Usuario'
    };

    leadRecord.interactions.push(created);
    company.updatedAt = now;
    return created;
  });
};

export const listLeadInteractions = async (companyId: string, leadId: string) => {
  const bundle = await getLeadCrmBundle(companyId, leadId);
  return bundle.interactions;
};

export const createLeadTask = async (
  companyId: string,
  leadId: string,
  payload: {
    title: string;
    dueDate: string;
    priority: CrmTaskPriority;
    assignedToId?: string;
    assignedToName?: string;
  }
) => {
  return updateStore((store) => {
    const company = ensureCompanyRecord(store, companyId);
    const leadRecord = ensureLeadRecord(company, leadId);
    const now = new Date().toISOString();

    const created: LeadCrmTask = {
      id: createId('task'),
      title: String(payload.title || '').trim(),
      dueDate: normalizeIsoDate(payload.dueDate, now),
      priority: payload.priority,
      status: 'PENDENTE',
      assignedToId: String(payload.assignedToId || '').trim(),
      assignedToName: String(payload.assignedToName || '').trim(),
      createdAt: now,
      updatedAt: now
    };

    leadRecord.tasks.push(created);
    company.updatedAt = now;
    return created;
  });
};

export const updateLeadTask = async (
  companyId: string,
  leadId: string,
  taskId: string,
  payload: Partial<Pick<LeadCrmTask, 'title' | 'dueDate' | 'priority' | 'status' | 'assignedToId' | 'assignedToName'>>
) => {
  return updateStore((store) => {
    const company = ensureCompanyRecord(store, companyId);
    const leadRecord = ensureLeadRecord(company, leadId);
    const task = leadRecord.tasks.find((item) => item.id === taskId);

    if (!task) {
      return null;
    }

    const now = new Date().toISOString();

    if (payload.title !== undefined) {
      task.title = String(payload.title || '').trim();
    }

    if (payload.dueDate !== undefined) {
      task.dueDate = normalizeIsoDate(payload.dueDate, task.dueDate);
    }

    if (payload.priority !== undefined) {
      task.priority = payload.priority;
    }

    if (payload.status !== undefined) {
      task.status = payload.status;
    }

    if (payload.assignedToId !== undefined) {
      task.assignedToId = String(payload.assignedToId || '').trim();
    }

    if (payload.assignedToName !== undefined) {
      task.assignedToName = String(payload.assignedToName || '').trim();
    }

    task.updatedAt = now;
    company.updatedAt = now;
    return task;
  });
};

export const deleteLeadTask = async (companyId: string, leadId: string, taskId: string) => {
  return updateStore((store) => {
    const company = ensureCompanyRecord(store, companyId);
    const leadRecord = ensureLeadRecord(company, leadId);
    const before = leadRecord.tasks.length;
    leadRecord.tasks = leadRecord.tasks.filter((item) => item.id !== taskId);
    company.updatedAt = new Date().toISOString();
    return before !== leadRecord.tasks.length;
  });
};

export const listLeadTasks = async (companyId: string, leadId: string) => {
  const bundle = await getLeadCrmBundle(companyId, leadId);
  return bundle.tasks;
};

export const listCompanyCrmRecords = async (companyId: string) => {
  return updateStore((store) => {
    const company = ensureCompanyRecord(store, companyId);

    return Object.entries(company.leads).map(([leadId, data]) => ({
      leadId,
      details: data.details,
      interactions: data.interactions,
      tasks: data.tasks
    }));
  });
};

export const removeLeadCrmRecord = async (companyId: string, leadId: string) => {
  return updateStore((store) => {
    const company = ensureCompanyRecord(store, companyId);
    delete company.leads[String(leadId || '').trim()];
    company.updatedAt = new Date().toISOString();
  });
};
