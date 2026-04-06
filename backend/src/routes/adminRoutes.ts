import { Router } from 'express';
import { isAdmin, requireAuth } from '../middleware/authMiddleware';
import { getGlobalData } from '../services/dataAccess';
import { supabaseAdmin } from '../supabaseClient';
import type { UserRole } from '../types/auth';
import {
  createCompanyForSignup,
  ensureUserHasCompany,
  getCompanySubscription,
  getPlanPrice,
  normalizeUserRole,
  syncClientAccessToCompanyExpiry,
  type PlanName,
  type SubscriptionStatus,
  updateCompanySubscription
} from '../services/saasService';

const router = Router();

const tableAliases = {
  companies: ['companies', 'Company'],
  users: ['users', 'User'],
  products: ['products'],
  sales: ['sales', 'Sale'],
  messages: ['messages', 'Message'],
  leads: ['leads', 'Lead']
} as const;

const companyFieldAliases = ['company_id', 'companyId', 'companyID'];

const normalizePlan = (value: unknown): PlanName => {
  const plan = String(value || 'BASIC').trim().toUpperCase();
  return plan === 'PRO' || plan === 'PREMIUM' ? plan : 'BASIC';
};

const normalizeStatus = (value: unknown): SubscriptionStatus => {
  const status = String(value || 'ACTIVE').trim().toUpperCase();

  if (status === 'PAST_DUE' || status === 'CANCELED' || status === 'BLOCKED') {
    return status;
  }

  return 'ACTIVE';
};

const insertWithAliases = async (
  aliasKey: keyof typeof tableAliases,
  payload: Record<string, unknown>
) => {
  for (const tableName of tableAliases[aliasKey]) {
    const response = await supabaseAdmin.from(tableName).insert(payload).select('*').single();

    if (!response.error) {
      return response;
    }
  }

  return {
    data: null,
    error: { message: `Nenhuma tabela valida para ${aliasKey}.` }
  };
};

const updateByIdWithAliases = async (
  aliasKey: keyof typeof tableAliases,
  id: string,
  payload: Record<string, unknown>
) => {
  for (const tableName of tableAliases[aliasKey]) {
    const response = await supabaseAdmin.from(tableName).update(payload).eq('id', id).select('*').single();

    if (!response.error) {
      return response;
    }
  }

  return {
    data: null,
    error: { message: `Nao foi possivel atualizar ${aliasKey}.` }
  };
};

const deleteByIdWithAliases = async (aliasKey: keyof typeof tableAliases, id: string) => {
  for (const tableName of tableAliases[aliasKey]) {
    const response = await supabaseAdmin.from(tableName).delete().eq('id', id).select('*').single();

    if (!response.error) {
      return response;
    }
  }

  return {
    data: null,
    error: { message: `Nao foi possivel excluir ${aliasKey}.` }
  };
};

const getUserWithAliases = async (userId: string) => {
  for (const tableName of tableAliases.users) {
    const response = await supabaseAdmin.from(tableName).select('*').eq('id', userId).single();

    if (!response.error && response.data) {
      return response;
    }
  }

  return {
    data: null,
    error: { message: 'Usuario nao encontrado.' }
  };
};

const updateUserPublicProfile = async (params: {
  userId: string;
  name: string;
  email: string;
  role: UserRole;
  companyId: string | null;
  accessUntil?: string | null;
}) => {
  const payloads: Array<Record<string, unknown>> = [
    {
      name: params.name,
      email: params.email,
      role: params.role,
      company_id: params.companyId,
      ...(params.accessUntil !== undefined ? { access_until: params.accessUntil } : {})
    },
    {
      name: params.name,
      email: params.email,
      role: params.role,
      companyId: params.companyId,
      ...(params.accessUntil !== undefined ? { accessUntil: params.accessUntil } : {})
    }
  ];

  if (params.accessUntil !== undefined) {
    payloads.push(
      {
        name: params.name,
        email: params.email,
        role: params.role,
        company_id: params.companyId
      },
      {
        name: params.name,
        email: params.email,
        role: params.role,
        companyId: params.companyId
      }
    );
  }

  for (const payload of payloads) {
    const updated = await updateByIdWithAliases('users', params.userId, payload);

    if (!updated.error) {
      return updated;
    }
  }

  return {
    data: null,
    error: { message: 'Nao foi possivel atualizar usuario na tabela publica.' }
  };
};

const deleteRecordsByCompanyId = async (aliasKey: 'users' | 'products' | 'sales' | 'messages' | 'leads', companyId: string) => {
  for (const tableName of tableAliases[aliasKey]) {
    for (const companyField of companyFieldAliases) {
      const response = await supabaseAdmin.from(tableName).delete().eq(companyField, companyId);

      if (!response.error) {
        return response;
      }
    }
  }

  return {
    data: null,
    error: { message: `Nao foi possivel limpar registros de ${aliasKey} da empresa.` }
  };
};

const getUsersByCompanyId = async (companyId: string) => {
  for (const tableName of tableAliases.users) {
    for (const companyField of companyFieldAliases) {
      const response = await supabaseAdmin.from(tableName).select('*').eq(companyField, companyId);

      if (!response.error) {
        return response.data || [];
      }
    }
  }

  return [];
};

const getCompanyAccessUntilFallback = async (companyId: string) => {
  const subscription = await getCompanySubscription(companyId);

  if (subscription.expiresAt) {
    return subscription.expiresAt;
  }

  for (const tableName of tableAliases.users) {
    for (const companyField of companyFieldAliases) {
      const response = await supabaseAdmin
        .from(tableName)
        .select('*')
        .eq(companyField, companyId)
        .eq('role', 'CLIENT')
        .order('created_at', { ascending: false })
        .limit(1);

      if (!response.error && (response.data || []).length) {
        const row = (response.data || [])[0] as Record<string, unknown>;
        const access = String(row.access_until || row.accessUntil || '').trim() || null;

        if (access) {
          return access;
        }
      }
    }
  }

  for (const tableName of tableAliases.companies) {
    const response = await supabaseAdmin.from(tableName).select('*').eq('id', companyId).single();

    if (!response.error && response.data) {
      const row = response.data as Record<string, unknown>;
      const createdAt = String(row.created_at || row.createdAt || '').trim();

      if (createdAt) {
        const date = new Date(createdAt);
        date.setDate(date.getDate() + 30);
        return date.toISOString();
      }
    }
  }

  return null;
};

const updateCompanyPlanWithAliases = async (companyId: string, plan: string) => {
  for (const tableName of tableAliases.companies) {
    const response = await supabaseAdmin
      .from(tableName)
      .update({ plan })
      .eq('id', companyId)
      .select('*')
      .single();

    if (!response.error) {
      return response;
    }
  }

  return {
    data: null,
    error: { message: 'Nao foi possivel atualizar o plano da empresa.' }
  };
};

router.use(requireAuth, isAdmin);

router.get('/dashboard', async (req, res) => {
  const companyId = String(req.query.companyId || '').trim() || undefined;
  const data = await getGlobalData(companyId);
  const monthlyRecurring = (data.companies || []).reduce((sum, company) => {
    const plan = String((company as Record<string, unknown>).plan || 'BASIC').toUpperCase() as PlanName;
    return sum + getPlanPrice(plan === 'PRO' || plan === 'PREMIUM' ? plan : 'BASIC');
  }, 0);

  return res.status(200).json({
    role: 'ADMIN',
    selectedCompanyId: companyId || null,
    monthlyRecurring,
    ...data
  });
});

router.post('/companies', async (req, res) => {
  const name = String(req.body?.name || '').trim();
  const location = String(req.body?.location || '').trim() || null;
  const plan = normalizePlan(req.body?.plan);
  const status = normalizeStatus(req.body?.status);
  const expiresAt = req.body?.expiresAt ? String(req.body.expiresAt) : null;

  if (!name) {
    return res.status(400).json({ message: 'Nome da empresa e obrigatorio.' });
  }

  const created = await createCompanyForSignup({ name, location, plan });

  if (created.error || !created.data) {
    return res.status(400).json({ message: created.error?.message || 'Falha ao criar empresa.' });
  }

  const company = created.data as Record<string, unknown>;
  const companyId = String(company.id || '').trim();

  if (companyId && (status !== 'ACTIVE' || expiresAt)) {
    await updateCompanySubscription(companyId, {
      plan,
      status,
      expiresAt
    });
  }

  return res.status(201).json({
    message: 'Empresa criada com sucesso.',
    company: created.data
  });
});

router.patch('/companies/:companyId', async (req, res) => {
  const companyId = String(req.params.companyId || '').trim();
  const name = String(req.body?.name || '').trim();
  const locationProvided = req.body?.location !== undefined;
  const location = locationProvided ? String(req.body?.location || '').trim() || null : undefined;
  const plan = req.body?.plan ? normalizePlan(req.body.plan) : undefined;
  const status = req.body?.status ? normalizeStatus(req.body.status) : undefined;
  const expiresAt = req.body?.expiresAt !== undefined ? (req.body.expiresAt ? String(req.body.expiresAt) : null) : undefined;

  if (!companyId) {
    return res.status(400).json({ message: 'companyId e obrigatorio.' });
  }

  let updatedCompany: unknown = null;

  if (name || locationProvided) {
    const payload: Record<string, unknown> = {};

    if (name) {
      payload.name = name;
    }

    if (locationProvided) {
      payload.location = location;
    }

    const updated = await updateByIdWithAliases('companies', companyId, payload);

    if (updated.error) {
      return res.status(400).json({ message: updated.error.message });
    }

    updatedCompany = updated.data;
  }

  if (plan || status || expiresAt !== undefined) {
    const subscriptionUpdate = await updateCompanySubscription(companyId, {
      plan,
      status,
      expiresAt
    });

    if (subscriptionUpdate.error) {
      return res.status(400).json({ message: subscriptionUpdate.error.message });
    }

    updatedCompany = subscriptionUpdate.data;

    if (expiresAt !== undefined) {
      await syncClientAccessToCompanyExpiry(companyId, expiresAt);
    }
  }

  return res.status(200).json({
    message: 'Empresa atualizada com sucesso.',
    company: updatedCompany
  });
});

router.delete('/companies/:companyId', async (req, res) => {
  const companyId = String(req.params.companyId || '').trim();

  if (!companyId) {
    return res.status(400).json({ message: 'companyId e obrigatorio.' });
  }

  const users = await getUsersByCompanyId(companyId);

  for (const user of users) {
    const userId = String((user as Record<string, unknown>).id || '').trim();

    if (userId) {
      await supabaseAdmin.auth.admin.deleteUser(userId);
    }
  }

  await deleteRecordsByCompanyId('leads', companyId);
  await deleteRecordsByCompanyId('products', companyId);
  await deleteRecordsByCompanyId('sales', companyId);
  await deleteRecordsByCompanyId('messages', companyId);
  await deleteRecordsByCompanyId('users', companyId);

  const deleted = await deleteByIdWithAliases('companies', companyId);

  if (deleted.error) {
    return res.status(400).json({ message: deleted.error.message });
  }

  return res.status(200).json({ message: 'Empresa excluida com sucesso.', company: deleted.data });
});

router.post('/users', async (req, res) => {
  const name = String(req.body?.name || '').trim();
  const email = String(req.body?.email || '').trim().toLowerCase();
  const password = String(req.body?.password || '');
  const role = normalizeUserRole(req.body?.role);
  const companyIdRaw = String(req.body?.companyId || '').trim();
  const companyName = String(req.body?.companyName || '').trim();
  const accessUntilRaw = req.body?.accessUntil;
  let accessUntil = accessUntilRaw ? String(accessUntilRaw) : null;
  let companyId = companyIdRaw || null;

  if (!name || !email || !password) {
    return res.status(400).json({ message: 'name, email e password sao obrigatorios.' });
  }

  if (role === 'CLIENT' && !companyId && companyName) {
    const companyCreated = await createCompanyForSignup({
      name: companyName,
      plan: 'BASIC'
    });

    if (companyCreated.error || !companyCreated.data) {
      return res.status(400).json({ message: companyCreated.error?.message || 'Falha ao criar empresa do cliente.' });
    }

    companyId = String((companyCreated.data as Record<string, unknown>).id || '').trim() || null;
  }

  if (role === 'CLIENT' && !companyId) {
    return res.status(400).json({ message: `${role} precisa de companyId ou companyName.` });
  }

  if ((role === 'CLIENT' || role === 'DEV') && !accessUntil && companyId) {
    accessUntil = await getCompanyAccessUntilFallback(companyId);
  }

  const authCreated = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    app_metadata: {
      role,
      company_id: companyId
    },
    user_metadata: {
      name,
      role,
      company_id: companyId,
      access_until: accessUntil
    }
  });

  if (authCreated.error || !authCreated.data.user) {
    return res.status(400).json({ message: authCreated.error?.message || 'Falha ao criar auth user.' });
  }

  const authUser = authCreated.data.user;
  const ensuredUser = await ensureUserHasCompany({
    authUser,
    fallbackRole: role,
    fallbackCompanyId: companyId,
    fallbackCompanyName: companyName || null,
    fallbackUserName: name
  });

  if (ensuredUser.error) {
    return res.status(201).json({
      message: 'Usuario criado no Auth, mas nao foi possivel finalizar o vinculo da empresa.',
      warning: ensuredUser.error,
      user: {
        id: authUser.id,
        email: authUser.email,
        role,
        companyId
      }
    });
  }

  await updateUserPublicProfile({
    userId: authUser.id,
    name,
    email,
    role,
    companyId: role === 'ADMIN' ? null : companyId,
    accessUntil
  });

  return res.status(201).json({
    message: 'Usuario criado com sucesso.',
    user: {
      id: authUser.id,
      email: authUser.email,
      role,
      companyId: ensuredUser.companyId
    }
  });
});

router.patch('/users/:userId', async (req, res) => {
  const userId = String(req.params.userId || '').trim();
  const name = String(req.body?.name || '').trim();
  const email = String(req.body?.email || '').trim().toLowerCase();
  const role = req.body?.role ? normalizeUserRole(req.body.role) : null;
  const companyIdRaw = req.body?.companyId;
  const companyName = String(req.body?.companyName || '').trim();
  const accessUntilRaw = req.body?.accessUntil;
  const password = String(req.body?.password || '');
  let accessUntil = accessUntilRaw === undefined ? undefined : accessUntilRaw ? String(accessUntilRaw) : null;

  if (!userId) {
    return res.status(400).json({ message: 'userId e obrigatorio.' });
  }

  const publicUser = await getUserWithAliases(userId);

  if (publicUser.error || !publicUser.data) {
    return res.status(404).json({ message: publicUser.error?.message || 'Usuario nao encontrado.' });
  }

  const currentUser = publicUser.data as Record<string, unknown>;
  const nextRole = normalizeUserRole(role || currentUser.role);
  let nextCompanyId =
    companyIdRaw === undefined
      ? String(currentUser.company_id || currentUser.companyId || currentUser.companyID || '').trim() || null
      : String(companyIdRaw || '').trim() || null;

  if (nextRole === 'CLIENT' && !nextCompanyId && companyName) {
    const companyCreated = await createCompanyForSignup({
      name: companyName,
      plan: 'BASIC'
    });

    if (companyCreated.error || !companyCreated.data) {
      return res.status(400).json({ message: companyCreated.error?.message || 'Falha ao criar empresa do cliente.' });
    }

    nextCompanyId = String((companyCreated.data as Record<string, unknown>).id || '').trim() || null;
  }

  if (nextRole === 'CLIENT' && !nextCompanyId) {
    return res.status(400).json({ message: `${nextRole} precisa de companyId ou companyName.` });
  }

  if ((nextRole === 'CLIENT' || nextRole === 'DEV') && accessUntil === undefined && nextCompanyId) {
    accessUntil = await getCompanyAccessUntilFallback(nextCompanyId);
  }

  const authUpdate = await supabaseAdmin.auth.admin.updateUserById(userId, {
    ...(email ? { email } : {}),
    ...(password ? { password } : {}),
    app_metadata: {
      role: nextRole,
      company_id: nextCompanyId
    },
    user_metadata: {
      name: name || String(currentUser.name || '').trim() || null,
      role: nextRole,
      company_id: nextCompanyId,
      company_name: companyName || undefined,
      access_until: accessUntil === undefined ? currentUser.access_until || currentUser.accessUntil || null : accessUntil
    }
  });

  if (authUpdate.error) {
    return res.status(400).json({ message: authUpdate.error.message });
  }

  const publicUpdate = await updateUserPublicProfile({
    userId,
    name: name || String(currentUser.name || '').trim(),
    email: email || String(currentUser.email || '').trim().toLowerCase(),
    role: nextRole,
    companyId: nextRole === 'ADMIN' ? null : nextCompanyId,
    accessUntil
  });

  if (publicUpdate.error) {
    return res.status(400).json({ message: publicUpdate.error.message });
  }

  return res.status(200).json({
    message: 'Usuario atualizado com sucesso.',
    user: publicUpdate.data
  });
});

router.delete('/users/:userId', async (req, res) => {
  const userId = String(req.params.userId || '').trim();

  if (!userId) {
    return res.status(400).json({ message: 'userId e obrigatorio.' });
  }

  await deleteByIdWithAliases('users', userId);

  const authDelete = await supabaseAdmin.auth.admin.deleteUser(userId);

  if (authDelete.error) {
    return res.status(400).json({ message: authDelete.error.message });
  }

  return res.status(200).json({ message: 'Usuario excluido com sucesso.' });
});

router.patch('/companies/:companyId/plan', async (req, res) => {
  const companyId = String(req.params.companyId || '').trim();
  const plan = String(req.body?.plan || '').trim().toUpperCase();

  if (!companyId || !plan) {
    return res.status(400).json({ message: 'companyId e plan sao obrigatorios.' });
  }

  if (!['BASIC', 'PRO', 'PREMIUM'].includes(plan)) {
    return res.status(400).json({ message: 'Plano invalido. Use BASIC, PRO ou PREMIUM.' });
  }

  const updateSnakeCase = await updateCompanySubscription(companyId, {
    plan: plan as PlanName
  });

  if (!updateSnakeCase.error) {
    return res.status(200).json({ message: 'Plano atualizado com sucesso.', company: updateSnakeCase.data });
  }

  return res.status(400).json({ message: updateSnakeCase.error.message });
});

router.patch('/companies/:companyId/subscription', async (req, res) => {
  const companyId = String(req.params.companyId || '').trim();
  const status = String(req.body?.status || '').trim().toUpperCase() as SubscriptionStatus;
  const plan = String(req.body?.plan || '').trim().toUpperCase() as PlanName;
  const expiresAtRaw = req.body?.expiresAt;
  const expiresAt = expiresAtRaw ? String(expiresAtRaw) : null;

  if (!companyId) {
    return res.status(400).json({ message: 'companyId e obrigatorio.' });
  }

  if (status && !['ACTIVE', 'PAST_DUE', 'CANCELED', 'BLOCKED'].includes(status)) {
    return res.status(400).json({ message: 'Status invalido.' });
  }

  if (plan && !['BASIC', 'PRO', 'PREMIUM'].includes(plan)) {
    return res.status(400).json({ message: 'Plano invalido.' });
  }

  const updated = await updateCompanySubscription(companyId, {
    status: status || undefined,
    plan: plan || undefined,
    expiresAt
  });

  if (updated.error) {
    return res.status(400).json({ message: updated.error.message });
  }

  const updatedRow = (updated.data || {}) as Record<string, unknown>;
  const nextAccessUntil = expiresAt !== null && expiresAt !== undefined
    ? expiresAt
    : String(updatedRow.expires_at || updatedRow.expiresAt || '').trim() || null;
  await syncClientAccessToCompanyExpiry(companyId, nextAccessUntil);

  return res.status(200).json({ message: 'Assinatura atualizada com sucesso.', company: updated.data });
});

export default router;
