import type { User } from '@supabase/supabase-js';
import { supabaseAdmin } from '../supabaseClient';

export type PlanName = 'BASIC' | 'PRO' | 'PREMIUM';
export type SubscriptionStatus = 'ACTIVE' | 'PAST_DUE' | 'CANCELED' | 'BLOCKED';

const COMPANY_TABLES = ['companies', 'Company'];
const USER_TABLES = ['users', 'User'];
const USER_COMPANY_FIELDS = ['company_id', 'companyId', 'companyID'];
const SYSTEM_ADMIN_EMAIL = (process.env.ADMIN_EMAIL || 'admin@syncho.cloud').trim().toLowerCase();

const PLAN_PRICES: Record<PlanName, number> = {
  BASIC: 49,
  PRO: 129,
  PREMIUM: 299
};

export const getPlanFeatures = (plan: PlanName) => {
  if (plan === 'BASIC') {
    return {
      productLimit: 50,
      fullReports: false,
      priorityChat: false
    };
  }

  if (plan === 'PRO') {
    return {
      productLimit: 500,
      fullReports: true,
      priorityChat: false
    };
  }

  return {
    productLimit: null,
    fullReports: true,
    priorityChat: true
  };
};

export const getPlanPrice = (plan: PlanName) => PLAN_PRICES[plan];

const normalizePlan = (value: unknown): PlanName => {
  const plan = String(value || 'BASIC').toUpperCase();
  return plan === 'PRO' || plan === 'PREMIUM' ? plan : 'BASIC';
};

const normalizeStatus = (value: unknown): SubscriptionStatus => {
  const status = String(value || 'ACTIVE').toUpperCase();
  if (status === 'PAST_DUE' || status === 'CANCELED' || status === 'BLOCKED') {
    return status;
  }

  return 'ACTIVE';
};

export const normalizeUserRole = (roleValue: unknown): 'ADMIN' | 'CLIENT' =>
  String(roleValue || 'CLIENT').trim().toUpperCase() === 'ADMIN' ? 'ADMIN' : 'CLIENT';

const extractCompanyId = (row: Record<string, unknown> | null | undefined) =>
  String(row?.company_id || row?.companyId || row?.companyID || '').trim() || null;

const buildDefaultCompanyName = (params: {
  companyName?: string | null;
  userName?: string | null;
  email?: string | null;
}) => {
  const explicitName = String(params.companyName || '').trim();

  if (explicitName) {
    return explicitName;
  }

  const normalizedUserName = String(params.userName || '').trim();

  if (normalizedUserName) {
    return `${normalizedUserName} CRM`;
  }

  const emailPrefix = String(params.email || '')
    .trim()
    .split('@')[0]
    ?.replace(/[._-]+/g, ' ')
    .trim();

  if (emailPrefix) {
    const readablePrefix = emailPrefix
      .split(' ')
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');

    return `${readablePrefix} CRM`;
  }

  return 'Empresa padrao CRM';
};

const findCompanyRaw = async (companyId: string) => {
  for (const tableName of COMPANY_TABLES) {
    const response = await supabaseAdmin.from(tableName).select('*').eq('id', companyId).single();

    if (!response.error) {
      return response;
    }
  }

  return {
    data: null,
    error: { message: 'Empresa nao encontrada.' }
  };
};

export const createCompanyForSignup = async (params: {
  name: string;
  plan: PlanName;
  location?: string | null;
  logoUrl?: string | null;
  primaryColor?: string | null;
}) => {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30);

  const payloadVariants: Array<Record<string, unknown>> = [
    {
      name: params.name,
      location: params.location || null,
      plan: params.plan,
      logo_url: params.logoUrl || null,
      primary_color: params.primaryColor || '#0ea5e9',
      subscription_status: 'ACTIVE',
      expires_at: expiresAt.toISOString()
    },
    {
      name: params.name,
      location: params.location || null,
      plan: params.plan,
      logoUrl: params.logoUrl || null,
      primaryColor: params.primaryColor || '#0ea5e9',
      subscriptionStatus: 'ACTIVE',
      expiresAt: expiresAt.toISOString()
    },
    {
      name: params.name,
      plan: params.plan
    }
  ];

  for (const tableName of COMPANY_TABLES) {
    for (const payload of payloadVariants) {
      const response = await supabaseAdmin.from(tableName).insert(payload).select('*').single();

      if (!response.error) {
        return response;
      }
    }
  }

  return {
    data: null,
    error: { message: 'Nao foi possivel criar empresa no banco.' }
  };
};

export const getCompanySubscription = async (companyId: string) => {
  const company = await findCompanyRaw(companyId);

  if (company.error || !company.data) {
    return {
      plan: 'BASIC' as PlanName,
      status: 'ACTIVE' as SubscriptionStatus,
      expiresAt: null as string | null,
      company: null,
      error: company.error?.message || 'Empresa nao encontrada.'
    };
  }

  const raw = company.data as Record<string, unknown>;
  const plan = normalizePlan(raw.plan);
  const status = normalizeStatus(raw.subscription_status || raw.subscriptionStatus);
  const expiresAtValue = raw.expires_at || raw.expiresAt;
  let expiresAt = expiresAtValue ? String(expiresAtValue) : null;

  // Fallback: se a coluna expires_at não existe na empresa,
  // busca o access_until do CLIENT mais recente vinculado a essa empresa
  if (!expiresAt) {
    for (const tableName of USER_TABLES) {
      for (const companyField of USER_COMPANY_FIELDS) {
        const resp = await supabaseAdmin
          .from(tableName)
          .select('access_until')
          .eq(companyField, companyId)
          .eq('role', 'CLIENT')
          .not('access_until', 'is', null)
          .order('access_until', { ascending: false })
          .limit(1);

        if (!resp.error && resp.data && resp.data.length > 0) {
          const row = resp.data[0] as Record<string, unknown>;
          expiresAt = String(row.access_until || '').trim() || null;
          if (expiresAt) break;
        }
      }
      if (expiresAt) break;
    }
  }

  return {
    plan,
    status,
    expiresAt,
    company: company.data,
    error: null
  };
};

export const isSubscriptionExpired = (status: SubscriptionStatus, expiresAt: string | null) => {
  if (status === 'BLOCKED' || status === 'CANCELED') {
    return true;
  }

  if (!expiresAt) {
    return false;
  }

  return new Date(expiresAt).getTime() < Date.now();
};

export const updateCompanySubscription = async (
  companyId: string,
  params: { plan?: PlanName; status?: SubscriptionStatus; expiresAt?: string | null }
) => {
  const payloads: Array<Record<string, unknown>> = [
    {
      ...(params.plan ? { plan: params.plan } : {}),
      ...(params.status ? { subscription_status: params.status } : {}),
      ...(params.expiresAt !== undefined ? { expires_at: params.expiresAt } : {})
    },
    {
      ...(params.plan ? { plan: params.plan } : {}),
      ...(params.status ? { subscriptionStatus: params.status } : {}),
      ...(params.expiresAt !== undefined ? { expiresAt: params.expiresAt } : {})
    }
  ];

  for (const tableName of COMPANY_TABLES) {
    for (const payload of payloads) {
      const response = await supabaseAdmin
        .from(tableName)
        .update(payload)
        .eq('id', companyId)
        .select('*')
        .single();

      if (!response.error) {
        return response;
      }
    }
  }

  if (params.plan) {
    for (const tableName of COMPANY_TABLES) {
      const fallback = await supabaseAdmin
        .from(tableName)
        .update({ plan: params.plan })
        .eq('id', companyId)
        .select('*')
        .single();

      if (!fallback.error) {
        return fallback;
      }
    }
  }

  return {
    data: null,
    error: { message: 'Nao foi possivel atualizar assinatura da empresa.' }
  };
};

export const getRoleAndCompanyFromPublicUser = async (userId: string) => {
  for (const tableName of USER_TABLES) {
    const response = await supabaseAdmin.from(tableName).select('*').eq('id', userId).single();

    if (!response.error && response.data) {
      const row = response.data as Record<string, unknown>;

      return {
        role: normalizeUserRole(row.role),
        companyId: extractCompanyId(row),
        row
      };
    }
  }

  return {
    role: null,
    companyId: null,
    row: null
  };
};

const updatePublicUserCompanyLink = async (params: {
  userId: string;
  email: string;
  name?: string | null;
  role: 'ADMIN' | 'CLIENT';
  companyId: string | null;
}) => {
  const updatePayloads: Array<Record<string, unknown>> = [
    {
      email: params.email,
      name: params.name || null,
      role: params.role,
      company_id: params.companyId
    },
    {
      email: params.email,
      name: params.name || null,
      role: params.role,
      companyId: params.companyId
    }
  ];

  for (const tableName of USER_TABLES) {
    for (const payload of updatePayloads) {
      const updateResponse = await supabaseAdmin
        .from(tableName)
        .update(payload)
        .eq('id', params.userId)
        .select('*')
        .single();

      if (!updateResponse.error) {
        return updateResponse;
      }
    }
  }

  const insertPayloads: Array<Record<string, unknown>> = [
    {
      id: params.userId,
      email: params.email,
      name: params.name || null,
      role: params.role,
      company_id: params.companyId
    },
    {
      id: params.userId,
      email: params.email,
      name: params.name || null,
      role: params.role,
      companyId: params.companyId
    }
  ];

  for (const tableName of USER_TABLES) {
    for (const payload of insertPayloads) {
      const insertResponse = await supabaseAdmin.from(tableName).insert(payload).select('*').single();

      if (!insertResponse.error) {
        return insertResponse;
      }
    }
  }

  return {
    data: null,
    error: { message: 'Nao foi possivel vincular usuario a empresa.' }
  };
};

const syncAuthUserCompanyMetadata = async (params: {
  authUser: User;
  role: 'ADMIN' | 'CLIENT';
  companyId: string | null;
  companyName: string;
  userName?: string | null;
}) => {
  const currentAppMetadata = (params.authUser.app_metadata || {}) as Record<string, unknown>;
  const currentUserMetadata = (params.authUser.user_metadata || {}) as Record<string, unknown>;

  return supabaseAdmin.auth.admin.updateUserById(params.authUser.id, {
    app_metadata: {
      ...currentAppMetadata,
      role: params.role,
      company_id: params.companyId
    },
    user_metadata: {
      ...currentUserMetadata,
      role: params.role,
      company_id: params.companyId,
      company_name: currentUserMetadata.company_name || params.companyName,
      name: currentUserMetadata.name || params.userName || null
    }
  });
};

export const ensureUserHasCompany = async (params: {
  authUser: User;
  fallbackRole?: unknown;
  fallbackCompanyId?: string | null;
  fallbackCompanyName?: string | null;
  fallbackUserName?: string | null;
}) => {
  const email = String(params.authUser.email || '').trim().toLowerCase();
  const metadataRole = params.authUser.app_metadata?.role || params.authUser.user_metadata?.role;
  const metadataCompanyId =
    String(
      params.authUser.app_metadata?.company_id || params.authUser.user_metadata?.company_id || ''
    ).trim() || null;
  const metadataCompanyName =
    String(params.authUser.user_metadata?.company_name || '').trim() || null;
  const metadataUserName = String(params.authUser.user_metadata?.name || '').trim() || null;
  const publicUserProfile = await getRoleAndCompanyFromPublicUser(params.authUser.id);
  const roleFromSources = metadataRole || publicUserProfile.role || params.fallbackRole || null;
  const role =
    email === SYSTEM_ADMIN_EMAIL
      ? 'ADMIN'
      : normalizeUserRole(roleFromSources || 'CLIENT');
  let companyId =
    metadataCompanyId || publicUserProfile.companyId || params.fallbackCompanyId || null;
  let companyName =
    metadataCompanyName ||
    params.fallbackCompanyName ||
    buildDefaultCompanyName({
      companyName: null,
      userName: metadataUserName || params.fallbackUserName || null,
      email
    });

  if (role === 'CLIENT' && !companyId) {
    const companyCreated = await createCompanyForSignup({
      name: companyName,
      plan: 'BASIC'
    });

    if (companyCreated.error || !companyCreated.data) {
      return {
        role,
        companyId: null,
        companyName,
        error: companyCreated.error?.message || 'Falha ao criar empresa padrao.'
      };
    }

    const company = companyCreated.data as Record<string, unknown>;
    companyId = String(company.id || '').trim() || null;
    companyName = String(company.name || companyName).trim() || companyName;
  }

  if (role === 'CLIENT' && !companyId) {
    return {
      role,
      companyId: null,
      companyName,
      error: 'Empresa criada sem id valido.'
    };
  }

  const publicLink = await updatePublicUserCompanyLink({
    userId: params.authUser.id,
    email,
    name: metadataUserName || params.fallbackUserName || null,
    role,
    companyId
  });

  if (publicLink.error) {
    if (role === 'ADMIN') {
      const metadataSyncForAdmin = await syncAuthUserCompanyMetadata({
        authUser: params.authUser,
        role,
        companyId,
        companyName,
        userName: metadataUserName || params.fallbackUserName || null
      });

      if (metadataSyncForAdmin.error) {
        return {
          role,
          companyId,
          companyName,
          error: null
        };
      }

      return {
        role,
        companyId,
        companyName,
        error: null
      };
    }

    return {
      role,
      companyId: null,
      companyName,
      error: publicLink.error.message
    };
  }

  const metadataSync = await syncAuthUserCompanyMetadata({
    authUser: params.authUser,
    role,
    companyId,
    companyName,
    userName: metadataUserName || params.fallbackUserName || null
  });

  if (metadataSync.error) {
    return {
      role,
      companyId: null,
      companyName,
      error: metadataSync.error.message
    };
  }

  return {
    role,
    companyId,
    companyName,
    error: null
  };
};

export const syncClientAccessToCompanyExpiry = async (companyId: string, accessUntil: string | null) => {
  const payloads: Array<Record<string, unknown>> = [
    { access_until: accessUntil },
    { accessUntil }
  ];

  for (const tableName of USER_TABLES) {
    for (const companyField of USER_COMPANY_FIELDS) {
      for (const payload of payloads) {
        const response = await supabaseAdmin
          .from(tableName)
          .update(payload)
          .eq(companyField, companyId)
          .eq('role', 'CLIENT');

        if (!response.error) {
          return { ok: true, error: null as string | null };
        }
      }
    }
  }

  return {
    ok: false,
    error: 'Nao foi possivel sincronizar validade dos clientes com a empresa.'
  };
};