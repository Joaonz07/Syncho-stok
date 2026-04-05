import { Router } from 'express';
import { requireAuth } from '../middleware/authMiddleware';
import { supabaseAdmin } from '../supabaseClient';
import { getScopedData } from '../services/dataAccess';
import {
  getCompanySubscription,
  getPlanFeatures,
  isSubscriptionExpired,
  syncClientAccessToCompanyExpiry,
  updateCompanySubscription,
  type PlanName,
  type SubscriptionStatus
} from '../services/saasService';
import { sendSupportRequestNotification } from '../services/emailService';
import { emitSupportMessage } from '../socket/gateway';

const router = Router();

const tableAliases = {
  products: ['products', 'Product'],
  sales: ['sales', 'Sale'],
  leads: ['leads', 'Lead'],
  messages: ['messages', 'Message'],
  supportRequests: ['support_requests', 'supportRequests', 'SupportRequest'],
  saleItems: ['sale_items', 'saleItems', 'SaleItem'],
  stockMovements: ['stock_movements', 'stockMovements', 'StockMovement']
} as const;

const companyFieldAliases = ['company_id', 'companyId', 'companyID'];
const leadStatuses = [
  'NOVO_CONTATO',
  'EM_CONTATO',
  'APRESENTACAO',
  'NEGOCIACAO',
  'FECHAMENTO'
] as const;
const leadPriorities = ['BAIXA', 'MEDIA', 'ALTA'] as const;
const supportStatuses = ['PENDING', 'IN_REVIEW', 'DONE'] as const;
type LeadStatus = (typeof leadStatuses)[number];
type SupportStatus = (typeof supportStatuses)[number];
type SupportChatMessage = {
  id: string;
  companyId: string;
  requestId: string | null;
  senderId: string;
  senderName: string;
  senderRole: 'ADMIN' | 'CLIENT';
  content: string;
  createdAt: string;
};
type CheckoutItem = {
  productId: string;
  quantity: number;
};

const getSupportMessagesWithAliases = async (companyId: string) => {
  for (const tableName of tableAliases.messages) {
    for (const companyField of companyFieldAliases) {
      const response = await supabaseAdmin
        .from(tableName)
        .select('*')
        .eq(companyField, companyId)
        .order('created_at', { ascending: true })
        .limit(200);

      if (!response.error) {
        return response;
      }
    }
  }

  return {
    data: null,
    error: { message: 'Falha ao carregar mensagens de suporte.' }
  };
};

const supportRequestTagRegex = /^\[REQ:([^\]]+)\]\s*/;

const encodeSupportMessageContent = (requestId: string | null, content: string) => {
  if (!requestId) {
    return content;
  }

  return `[REQ:${requestId}] ${content}`;
};

const decodeSupportMessageContent = (rawContent: string) => {
  const normalized = String(rawContent || '');
  const match = normalized.match(supportRequestTagRegex);

  if (!match) {
    return { requestId: null as string | null, content: normalized };
  }

  return {
    requestId: String(match[1] || '').trim() || null,
    content: normalized.replace(supportRequestTagRegex, '').trim()
  };
};

const insertSupportMessageWithAliases = async (payload: {
  companyId: string;
  senderId: string;
  requestId: string | null;
  content: string;
}) => {
  const encodedContent = encodeSupportMessageContent(payload.requestId, payload.content);
  const payloads: Array<Record<string, unknown>> = [
    {
      company_id: payload.companyId,
      sender_id: payload.senderId,
      content: encodedContent
    },
    {
      companyId: payload.companyId,
      senderId: payload.senderId,
      content: encodedContent
    }
  ];

  for (const tableName of tableAliases.messages) {
    for (const item of payloads) {
      const inserted = await supabaseAdmin.from(tableName).insert(item).select('*').single();

      if (!inserted.error && inserted.data) {
        return inserted;
      }
    }
  }

  return {
    data: null,
    error: { message: 'Falha ao salvar mensagem de suporte.' }
  };
};

const mapSupportChatMessages = async (
  rows: Array<Record<string, unknown>>,
  companyId: string
): Promise<SupportChatMessage[]> => {
  const senderIds = Array.from(
    new Set(
      rows
        .map((row) => String(row.sender_id || row.senderId || '').trim())
        .filter(Boolean)
    )
  );

  const senderMap = new Map<string, { name: string; role: 'ADMIN' | 'CLIENT' }>();

  if (senderIds.length > 0) {
    for (const tableName of ['users', 'User']) {
      const usersResponse = await supabaseAdmin
        .from(tableName)
        .select('id,name,role,email')
        .in('id', senderIds);

      if (!usersResponse.error && usersResponse.data) {
        for (const rawUser of usersResponse.data as Array<Record<string, unknown>>) {
          const senderId = String(rawUser.id || '').trim();

          if (!senderId) {
            continue;
          }

          const senderName =
            String(rawUser.name || '').trim() ||
            String(rawUser.email || '').trim().split('@')[0] ||
            'Usuario';
          const senderRole = String(rawUser.role || 'CLIENT').toUpperCase() === 'ADMIN' ? 'ADMIN' : 'CLIENT';
          senderMap.set(senderId, { name: senderName, role: senderRole });
        }

        break;
      }
    }
  }

  return rows.map((row) => {
    const senderId = String(row.sender_id || row.senderId || '').trim();
    const sender = senderMap.get(senderId);
    const decoded = decodeSupportMessageContent(String(row.content || row.message || ''));

    return {
      id: String(row.id || ''),
      companyId,
      requestId: decoded.requestId,
      senderId,
      senderName: sender?.name || 'Usuario',
      senderRole: sender?.role || 'CLIENT',
      content: decoded.content,
      createdAt: String(row.created_at || row.createdAt || new Date().toISOString())
    };
  });
};

const getCompanyLeadsByStatus = async (companyId: string, status?: LeadStatus) => {
  for (const tableName of tableAliases.leads) {
    for (const companyField of companyFieldAliases) {
      let query = supabaseAdmin.from(tableName).select('*').eq(companyField, companyId);

      if (status) {
        query = query.eq('status', status);
      }

      const response = await query;

      if (!response.error) {
        return response.data || [];
      }
    }
  }

  return [];
};

const getNextLeadPosition = async (companyId: string, status: LeadStatus) => {
  const leads = await getCompanyLeadsByStatus(companyId, status);

  return leads.reduce((maxPosition, lead) => {
    const nextPosition = Number((lead as Record<string, unknown>).position || 0);
    return nextPosition > maxPosition ? nextPosition : maxPosition;
  }, -1) + 1;
};

const updateLeadWithAliases = async (
  leadId: string,
  companyId: string,
  payload: Record<string, unknown>
) => {
  for (const tableName of tableAliases.leads) {
    for (const companyField of companyFieldAliases) {
      const response = await supabaseAdmin
        .from(tableName)
        .update(payload)
        .eq('id', leadId)
        .eq(companyField, companyId)
        .select('*')
        .single();

      if (!response.error) {
        return response;
      }
    }
  }

  return {
    data: null,
    error: { message: 'Falha ao atualizar lead.' }
  };
};

const updateProductWithAliases = async (
  productId: string,
  companyId: string,
  payload: Record<string, unknown>
) => {
  for (const tableName of tableAliases.products) {
    for (const companyField of companyFieldAliases) {
      const response = await supabaseAdmin
        .from(tableName)
        .update(payload)
        .eq('id', productId)
        .eq(companyField, companyId)
        .select('*')
        .single();

      if (!response.error) {
        return response;
      }
    }
  }

  return {
    data: null,
    error: { message: 'Falha ao atualizar produto.' }
  };
};

const ensureUserInPublicTable = async (params: {
  userId: string;
  fallbackEmail: string;
  fallbackRole: 'ADMIN' | 'CLIENT';
  fallbackName?: string;
  companyId: string | null;
}) => {
  for (const tableName of ['users', 'User']) {
    const existing = await supabaseAdmin.from(tableName).select('id').eq('id', params.userId).single();

    if (!existing.error && existing.data) {
      return { ok: true };
    }
  }

  let resolvedEmail = params.fallbackEmail;
  let resolvedName = params.fallbackName || params.fallbackEmail.split('@')[0] || 'Usuario';

  const authLookup = await supabaseAdmin.auth.admin.getUserById(params.userId);

  if (!authLookup.error && authLookup.data.user) {
    resolvedEmail = String(authLookup.data.user.email || resolvedEmail).trim().toLowerCase();
    resolvedName =
      String(authLookup.data.user.user_metadata?.name || '').trim() || resolvedName;
  }

  const payloads: Array<Record<string, unknown>> = [
    {
      id: params.userId,
      name: resolvedName,
      email: resolvedEmail,
      role: params.fallbackRole,
      company_id: params.companyId
    },
    {
      id: params.userId,
      name: resolvedName,
      email: resolvedEmail,
      role: params.fallbackRole,
      companyId: params.companyId
    }
  ];

  for (const tableName of ['users', 'User']) {
    for (const payload of payloads) {
      const inserted = await supabaseAdmin.from(tableName).insert(payload);

      if (!inserted.error) {
        return { ok: true };
      }
    }
  }

  return { ok: false };
};

const getProductByIdWithAliases = async (productId: string, companyId: string) => {
  for (const tableName of tableAliases.products) {
    for (const companyField of companyFieldAliases) {
      const response = await supabaseAdmin
        .from(tableName)
        .select('*')
        .eq('id', productId)
        .eq(companyField, companyId)
        .single();

      if (!response.error && response.data) {
        return response;
      }
    }
  }

  return {
    data: null,
    error: { message: 'Produto nao encontrado para a empresa.' }
  };
};

const getCompanyByIdWithAliases = async (companyId: string) => {
  for (const tableName of ['companies', 'Company']) {
    const response = await supabaseAdmin.from(tableName).select('*').eq('id', companyId).single();

    if (!response.error && response.data) {
      return response;
    }
  }

  return {
    data: null,
    error: { message: 'Empresa nao encontrada.' }
  };
};

const resolveCompanyLocation = (company: Record<string, unknown>) => {
  const locationText =
    String(company.location || company.localization || company.localizacao || company.address || '').trim() ||
    null;

  if (locationText) {
    return locationText;
  }

  const city = String(company.city || company.cidade || '').trim();
  const state = String(company.state || company.estado || '').trim();
  const country = String(company.country || company.pais || '').trim();
  const composed = [city, state, country].filter(Boolean).join(' - ');

  return composed || null;
};

const resolveCompanyId = (role: string, authCompanyId: string | null, payloadCompanyId: unknown) => {
  const payloadValue = String(payloadCompanyId || '').trim() || null;

  if (role === 'ADMIN') {
    return payloadValue;
  }

  return authCompanyId;
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
    error: { message: `Nao foi possivel inserir em ${aliasKey}.` }
  };
};

const getUserAccessUntil = async (userId: string) => {
  for (const tableName of ['users', 'User']) {
    const response = await supabaseAdmin.from(tableName).select('*').eq('id', userId).single();

    if (!response.error && response.data) {
      const row = response.data as Record<string, unknown>;
      const accessUntil = row.access_until || row.accessUntil;
      return accessUntil ? String(accessUntil) : null;
    }
  }

  const authUser = await supabaseAdmin.auth.admin.getUserById(userId);

  if (!authUser.error && authUser.data.user) {
    const raw =
      authUser.data.user.user_metadata?.access_until ||
      authUser.data.user.user_metadata?.accessUntil ||
      null;

    return raw ? String(raw) : null;
  }

  return null;
};

const listSupportRequestsWithAliases = async (companyId?: string | null) => {
  for (const tableName of tableAliases.supportRequests) {
    const companyFields = companyId ? companyFieldAliases : [null];

    for (const companyField of companyFields) {
      let query = supabaseAdmin.from(tableName).select('*').order('created_at', { ascending: false });

      if (companyId && companyField) {
        query = query.eq(companyField, companyId);
      }

      const response = await query;

      if (!response.error) {
        return response;
      }
    }
  }

  return {
    data: null,
    error: { message: 'Falha ao listar solicitacoes de suporte.' }
  };
};

const updateSupportRequestWithAliases = async (
  requestId: string,
  companyId: string | null,
  payload: Record<string, unknown>
) => {
  for (const tableName of tableAliases.supportRequests) {
    const companyFields = companyId ? companyFieldAliases : [null];

    for (const companyField of companyFields) {
      let query = supabaseAdmin.from(tableName).update(payload).eq('id', requestId);

      if (companyId && companyField) {
        query = query.eq(companyField, companyId);
      }

      const response = await query.select('*').single();

      if (!response.error) {
        return response;
      }
    }
  }

  return {
    data: null,
    error: { message: 'Falha ao atualizar solicitacao de suporte.' }
  };
};

router.get('/me', requireAuth, async (req, res) => {
  if (!req.authUser) {
    return res.status(401).json({ message: 'Usuario nao autenticado.' });
  }

  return res.status(200).json({ user: req.authUser });
});

router.get('/data', requireAuth, async (req, res) => {
  if (!req.authUser) {
    return res.status(401).json({ message: 'Usuario nao autenticado.' });
  }

  const requestedCompanyId = String(req.query.companyId || '').trim() || null;
  const scopeUser =
    req.authUser.role === 'ADMIN' && requestedCompanyId
      ? { ...req.authUser, role: 'CLIENT' as const, companyId: requestedCompanyId }
      : req.authUser;

  const [products, sales, users, chats] = await Promise.all([
    getScopedData('products', scopeUser),
    getScopedData('sales', scopeUser),
    getScopedData('users', scopeUser),
    getScopedData('messages', scopeUser)
  ]);

  const subscription = scopeUser.companyId
    ? await getCompanySubscription(scopeUser.companyId)
    : { plan: 'BASIC', status: 'ACTIVE', expiresAt: null };
  const features = getPlanFeatures(subscription.plan as PlanName);
  const expired = isSubscriptionExpired(
    subscription.status as SubscriptionStatus,
    subscription.expiresAt
  );

  return res.status(200).json({
    role: req.authUser.role,
    companyId: scopeUser.companyId,
    subscription,
    features,
    blocked: expired,
    products: products.data,
    sales: sales.data,
    users: users.data,
    chats: chats.data,
    errors: [products.error, sales.error, users.error, chats.error].filter(Boolean)
  });
});

router.post('/products', requireAuth, async (req, res) => {
  if (!req.authUser) {
    return res.status(401).json({ message: 'Usuario nao autenticado.' });
  }

  const name = String(req.body?.name || '').trim();
  const code = String(req.body?.code || '').trim();
  const price = Number(req.body?.price || 0);
  const quantity = Number(req.body?.quantity || 0);
  const companyId = resolveCompanyId(req.authUser.role, req.authUser.companyId, req.body?.companyId);

  if (!name || !code || !Number.isFinite(price)) {
    return res.status(400).json({ message: 'name, code e price sao obrigatorios.' });
  }

  if (!companyId) {
    return res.status(400).json({ message: 'companyId e obrigatorio para cadastrar produto.' });
  }

  const subscription = await getCompanySubscription(companyId);
  const features = getPlanFeatures(subscription.plan as PlanName);
  const expired = isSubscriptionExpired(
    subscription.status as SubscriptionStatus,
    subscription.expiresAt
  );

  if (expired) {
    return res.status(402).json({ message: 'Assinatura expirada ou bloqueada.' });
  }

  if (features.productLimit !== null) {
    const currentProducts = await getScopedData('products', {
      id: req.authUser.id,
      email: req.authUser.email,
      role: 'CLIENT',
      companyId
    });

    if ((currentProducts.data || []).length >= features.productLimit) {
      return res.status(403).json({
        message: `Limite de produtos do plano ${subscription.plan} atingido.`
      });
    }
  }

  let lastError: string | null = null;

  for (const companyField of companyFieldAliases) {
    const payload = {
      name,
      code,
      price,
      quantity,
      [companyField]: companyId
    };

    const response = await insertWithAliases('products', payload);

    if (!response.error) {
      return res.status(201).json({ message: 'Produto criado com sucesso.', product: response.data });
    }

    lastError = response.error.message;
  }

  return res.status(400).json({ message: lastError || 'Falha ao criar produto.' });
});

router.get('/products', requireAuth, async (req, res) => {
  if (!req.authUser) {
    return res.status(401).json({ message: 'Usuario nao autenticado.' });
  }

  const companyId = resolveCompanyId(req.authUser.role, req.authUser.companyId, req.query.companyId);

  if (!companyId) {
    return res.status(400).json({ message: 'companyId e obrigatorio para consultar produtos.' });
  }

  const products = await getScopedData('products', {
    id: req.authUser.id,
    email: req.authUser.email,
    role: 'CLIENT',
    companyId
  });

  return res.status(200).json({
    companyId,
    products: products.data || [],
    error: products.error || null
  });
});

router.patch('/products/:id', requireAuth, async (req, res) => {
  if (!req.authUser) {
    return res.status(401).json({ message: 'Usuario nao autenticado.' });
  }

  const productId = String(req.params.id || '').trim();
  const companyId = resolveCompanyId(req.authUser.role, req.authUser.companyId, req.body?.companyId);
  const name = String(req.body?.name || '').trim();
  const code = String(req.body?.code || '').trim();
  const price = Number(req.body?.price || 0);
  const quantity = Number(req.body?.quantity || 0);

  if (!productId || !companyId) {
    return res.status(400).json({ message: 'id e companyId sao obrigatorios.' });
  }

  if (!name || !code || !Number.isFinite(price) || !Number.isFinite(quantity)) {
    return res.status(400).json({ message: 'name, code, price e quantity sao obrigatorios.' });
  }

  const response = await updateProductWithAliases(productId, companyId, {
    name,
    code,
    price,
    quantity
  });

  if (!response.error) {
    return res.status(200).json({ message: 'Produto atualizado com sucesso.', product: response.data });
  }

  return res.status(400).json({ message: response.error.message || 'Falha ao atualizar produto.' });
});

router.delete('/products/:id', requireAuth, async (req, res) => {
  if (!req.authUser) {
    return res.status(401).json({ message: 'Usuario nao autenticado.' });
  }

  const productId = String(req.params.id || '').trim();
  const companyId = resolveCompanyId(req.authUser.role, req.authUser.companyId, req.query.companyId);

  if (!productId || !companyId) {
    return res.status(400).json({ message: 'id e companyId sao obrigatorios.' });
  }

  for (const tableName of tableAliases.products) {
    for (const companyField of companyFieldAliases) {
      const response = await supabaseAdmin
        .from(tableName)
        .delete()
        .eq('id', productId)
        .eq(companyField, companyId);

      if (!response.error) {
        return res.status(200).json({ message: 'Produto excluido com sucesso.' });
      }
    }
  }

  return res.status(400).json({ message: 'Falha ao excluir produto.' });
});

router.post('/sales', requireAuth, async (req, res) => {
  if (!req.authUser) {
    return res.status(401).json({ message: 'Usuario nao autenticado.' });
  }

  const total = Number(req.body?.total || 0);
  const explicitUserId = String(req.body?.userId || '').trim() || req.authUser.id;
  const companyId = resolveCompanyId(req.authUser.role, req.authUser.companyId, req.body?.companyId);

  if (!Number.isFinite(total) || total <= 0) {
    return res.status(400).json({ message: 'total deve ser um numero maior que zero.' });
  }

  if (!companyId) {
    return res.status(400).json({ message: 'companyId e obrigatorio para registrar venda.' });
  }

  const subscription = await getCompanySubscription(companyId);
  const expired = isSubscriptionExpired(
    subscription.status as SubscriptionStatus,
    subscription.expiresAt
  );

  if (expired) {
    return res.status(402).json({ message: 'Assinatura expirada ou bloqueada.' });
  }

  const ensuredUser = await ensureUserInPublicTable({
    userId: explicitUserId,
    fallbackEmail: req.authUser.email,
    fallbackRole: req.authUser.role,
    fallbackName: req.authUser.email.split('@')[0],
    companyId
  });

  if (!ensuredUser.ok) {
    return res.status(400).json({ message: 'Nao foi possivel preparar usuario para registrar venda.' });
  }

  let lastError: string | null = null;

  for (const companyField of companyFieldAliases) {
    for (const userField of ['user_id', 'userId']) {
      const payload = {
        total,
        [companyField]: companyId,
        [userField]: explicitUserId
      };

      const response = await insertWithAliases('sales', payload);

      if (!response.error) {
        return res.status(201).json({ message: 'Venda registrada com sucesso.', sale: response.data });
      }

      lastError = response.error.message;
    }
  }

  return res.status(400).json({ message: lastError || 'Falha ao registrar venda.' });
});

router.post('/sales/checkout', requireAuth, async (req, res) => {
  if (!req.authUser) {
    return res.status(401).json({ message: 'Usuario nao autenticado.' });
  }

  const companyId = resolveCompanyId(req.authUser.role, req.authUser.companyId, req.body?.companyId);
  const explicitUserId = String(req.body?.userId || '').trim() || req.authUser.id;
  const itemsRaw = Array.isArray(req.body?.items)
    ? (req.body.items as Array<Record<string, unknown>>)
    : [];
  const items = itemsRaw
    .map((item: Record<string, unknown>) => ({
      productId: String(item?.productId || '').trim(),
      quantity: Number(item?.quantity || 0)
    }))
    .filter(
      (item: { productId: string; quantity: number }) =>
        item.productId && Number.isFinite(item.quantity) && item.quantity > 0
    ) as CheckoutItem[];

  if (!companyId) {
    return res.status(400).json({ message: 'companyId e obrigatorio para finalizar venda.' });
  }

  if (!items.length) {
    return res.status(400).json({ message: 'Informe ao menos um item valido para a venda.' });
  }

  const subscription = await getCompanySubscription(companyId);
  const expired = isSubscriptionExpired(
    subscription.status as SubscriptionStatus,
    subscription.expiresAt
  );

  if (expired) {
    return res.status(402).json({ message: 'Assinatura expirada ou bloqueada.' });
  }

  const ensuredUser = await ensureUserInPublicTable({
    userId: explicitUserId,
    fallbackEmail: req.authUser.email,
    fallbackRole: req.authUser.role,
    fallbackName: req.authUser.email.split('@')[0],
    companyId
  });

  if (!ensuredUser.ok) {
    return res.status(400).json({ message: 'Nao foi possivel preparar usuario para finalizar venda.' });
  }

  const normalizedItems: Array<{
    productId: string;
    quantity: number;
    name: string;
    unitPrice: number;
    stockBefore: number;
    stockAfter: number;
    lineTotal: number;
  }> = [];

  for (const item of items) {
    const productResponse = await getProductByIdWithAliases(item.productId, companyId);

    if (productResponse.error || !productResponse.data) {
      return res.status(400).json({ message: `Produto ${item.productId} nao encontrado.` });
    }

    const product = productResponse.data as Record<string, unknown>;
    const stockBefore = Number(product.quantity || 0);
    const unitPrice = Number(product.price || 0);

    if (!Number.isFinite(stockBefore) || stockBefore < item.quantity) {
      return res.status(400).json({
        message: `Estoque insuficiente para ${String(product.name || item.productId)}.`
      });
    }

    normalizedItems.push({
      productId: item.productId,
      quantity: item.quantity,
      name: String(product.name || 'Produto sem nome'),
      unitPrice,
      stockBefore,
      stockAfter: stockBefore - item.quantity,
      lineTotal: unitPrice * item.quantity
    });
  }

  const total = normalizedItems.reduce((sum, item) => sum + item.lineTotal, 0);

  if (!Number.isFinite(total) || total <= 0) {
    return res.status(400).json({ message: 'Total invalido para a venda.' });
  }

  let saleRecord: Record<string, unknown> | null = null;
  let saleError: string | null = null;

  for (const companyField of companyFieldAliases) {
    for (const userField of ['user_id', 'userId']) {
      const payload = {
        total,
        [companyField]: companyId,
        [userField]: explicitUserId
      };

      const response = await insertWithAliases('sales', payload);

      if (!response.error && response.data) {
        saleRecord = response.data as Record<string, unknown>;
        saleError = null;
        break;
      }

      saleError = response.error?.message || 'Falha ao registrar venda.';
    }

    if (saleRecord) {
      break;
    }
  }

  if (!saleRecord) {
    return res.status(400).json({ message: saleError || 'Falha ao registrar venda.' });
  }

  const saleId = String(saleRecord.id || '').trim();

  if (!saleId) {
    return res.status(400).json({ message: 'Venda criada sem id valido.' });
  }

  for (const item of normalizedItems) {
    await updateProductWithAliases(item.productId, companyId, {
      quantity: item.stockAfter
    });

    await insertWithAliases('saleItems', {
      sale_id: saleId,
      product_id: item.productId,
      quantity: item.quantity,
      unit_price: item.unitPrice
    });

    await insertWithAliases('stockMovements', {
      product_id: item.productId,
      type: 'OUT',
      quantity: item.quantity,
      reason: `Venda ${saleId}`
    });
  }

  return res.status(201).json({
    message: 'Venda finalizada com sucesso e estoque atualizado.',
    sale: saleRecord,
    analysis: {
      total,
      itemsSold: normalizedItems.reduce((sum, item) => sum + item.quantity, 0),
      products: normalizedItems.map((item) => ({
        productId: item.productId,
        name: item.name,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        lineTotal: item.lineTotal,
        stockBefore: item.stockBefore,
        stockAfter: item.stockAfter
      }))
    }
  });
});

router.get('/sales/analysis', requireAuth, async (req, res) => {
  if (!req.authUser) {
    return res.status(401).json({ message: 'Usuario nao autenticado.' });
  }

  const companyId = resolveCompanyId(req.authUser.role, req.authUser.companyId, req.query.companyId);

  if (!companyId) {
    return res.status(400).json({ message: 'companyId e obrigatorio para analise de vendas.' });
  }

  const salesResponse = await getScopedData('sales', {
    id: req.authUser.id,
    email: req.authUser.email,
    role: 'CLIENT',
    companyId
  });
  const productsResponse = await getScopedData('products', {
    id: req.authUser.id,
    email: req.authUser.email,
    role: 'CLIENT',
    companyId
  });

  const sales = (salesResponse.data || []) as Array<Record<string, unknown>>;
  const products = (productsResponse.data || []) as Array<Record<string, unknown>>;

  const totalRevenue = sales.reduce((sum, sale) => sum + Number(sale.total || 0), 0);
  const totalSales = sales.length;
  const averageTicket = totalSales > 0 ? totalRevenue / totalSales : 0;
  const totalStockUnits = products.reduce((sum, product) => sum + Number(product.quantity || 0), 0);

  const lowStockProducts = products
    .filter((product) => Number(product.quantity || 0) <= 5)
    .sort((left, right) => Number(left.quantity || 0) - Number(right.quantity || 0))
    .slice(0, 10)
    .map((product) => ({
      id: String(product.id || ''),
      name: String(product.name || 'Produto sem nome'),
      code: String(product.code || ''),
      quantity: Number(product.quantity || 0),
      price: Number(product.price || 0)
    }));

  const recentSales = [...sales]
    .sort((left, right) => {
      const leftTime = new Date(String(left.created_at || left.createdAt || 0)).getTime();
      const rightTime = new Date(String(right.created_at || right.createdAt || 0)).getTime();
      return rightTime - leftTime;
    })
    .slice(0, 20)
    .map((sale) => ({
      id: String(sale.id || ''),
      total: Number(sale.total || 0),
      userId: String(sale.user_id || sale.userId || '').trim() || null,
      createdAt: String(sale.created_at || sale.createdAt || new Date().toISOString())
    }));

  return res.status(200).json({
    companyId,
    totalRevenue,
    totalSales,
    averageTicket,
    totalStockUnits,
    productsCount: products.length,
    lowStockProducts,
    recentSales,
    errors: [salesResponse.error, productsResponse.error].filter(Boolean)
  });
});

router.patch('/subscribe', requireAuth, async (req, res) => {
  if (!req.authUser) {
    return res.status(401).json({ message: 'Usuario nao autenticado.' });
  }

  if (req.authUser.role !== 'ADMIN') {
    return res.status(403).json({ message: 'Somente ADMIN pode alterar plano e assinatura.' });
  }

  const plan = String(req.body?.plan || '').trim().toUpperCase() as PlanName;
  const payloadCompanyId = String(req.body?.companyId || '').trim() || null;
  const targetCompanyId = req.authUser.role === 'ADMIN' ? payloadCompanyId : req.authUser.companyId;
  const expiresAt = req.body?.expiresAt ? String(req.body.expiresAt) : null;

  if (!targetCompanyId) {
    return res.status(400).json({ message: 'companyId e obrigatorio para assinatura.' });
  }

  if (!['BASIC', 'PRO', 'PREMIUM'].includes(plan)) {
    return res.status(400).json({ message: 'Plano invalido.' });
  }

  const updated = await updateCompanySubscription(targetCompanyId, {
    plan,
    status: 'ACTIVE',
    expiresAt
  });

  if (updated.error) {
    return res.status(400).json({ message: updated.error.message });
  }

  await syncClientAccessToCompanyExpiry(targetCompanyId, expiresAt);

  return res.status(200).json({ message: 'Assinatura atualizada com sucesso.', company: updated.data });
});

router.get('/company-info', requireAuth, async (req, res) => {
  if (!req.authUser) {
    return res.status(401).json({ message: 'Usuario nao autenticado.' });
  }

  const companyId = resolveCompanyId(req.authUser.role, req.authUser.companyId, req.query.companyId);

  if (!companyId) {
    return res.status(400).json({ message: 'companyId e obrigatorio para consultar empresa.' });
  }

  const companyResponse = await getCompanyByIdWithAliases(companyId);

  if (companyResponse.error || !companyResponse.data) {
    return res.status(404).json({ message: companyResponse.error?.message || 'Empresa nao encontrada.' });
  }

  const company = companyResponse.data as Record<string, unknown>;
  const subscription = await getCompanySubscription(companyId);
  const accessUntil = await getUserAccessUntil(req.authUser.id);

  // Quando admin visualiza e expires_at da empresa está vazio,
  // busca o access_until dos clients daquela empresa como fallback
  let effectiveExpiresAt = subscription.expiresAt || accessUntil;

  if (!effectiveExpiresAt) {
    for (const companyField of companyFieldAliases) {
      const usersResp = await supabaseAdmin
        .from('users')
        .select('access_until, accessUntil')
        .eq(companyField, companyId)
        .eq('role', 'CLIENT')
        .not('access_until', 'is', null)
        .order('access_until', { ascending: false })
        .limit(1);

      if (!usersResp.error && usersResp.data && usersResp.data.length > 0) {
        const row = usersResp.data[0] as Record<string, unknown>;
        effectiveExpiresAt = String(row.access_until || row.accessUntil || '').trim() || null;
        break;
      }
    }
  }

  return res.status(200).json({
    companyId,
    accessUntil: req.authUser.role === 'ADMIN' ? effectiveExpiresAt : accessUntil,
    company: {
      id: String(company.id || companyId),
      name: String(company.name || 'Empresa sem nome'),
      location: resolveCompanyLocation(company)
    },
    subscription: {
      plan: subscription.plan,
      status: subscription.status,
      expiresAt: effectiveExpiresAt
    }
  });
});

router.get('/support-requests', requireAuth, async (req, res) => {
  if (!req.authUser) {
    return res.status(401).json({ message: 'Usuario nao autenticado.' });
  }

  const scopedCompanyId = resolveCompanyId(req.authUser.role, req.authUser.companyId, req.query.companyId);

  if (req.authUser.role !== 'ADMIN' && !scopedCompanyId) {
    return res.status(400).json({ message: 'companyId e obrigatorio para consultar solicitacoes.' });
  }

  const response = await listSupportRequestsWithAliases(scopedCompanyId);

  if (response.error) {
    return res.status(400).json({ message: response.error.message });
  }

  const requests = ((response.data || []) as Array<Record<string, unknown>>).map((request) => ({
    id: String(request.id || ''),
    companyId: String(request.company_id || request.companyId || request.companyID || ''),
    requesterId: String(request.requester_id || request.requesterId || ''),
    requesterName: String(request.requester_name || request.requesterName || '').trim() || null,
    requesterEmail: String(request.requester_email || request.requesterEmail || '').trim() || null,
    subject: String(request.subject || ''),
    message: String(request.message || ''),
    status: String(request.status || 'PENDING').toUpperCase(),
    adminResponse: String(request.admin_response || request.adminResponse || '').trim() || null,
    resolvedBy: String(request.resolved_by || request.resolvedBy || '').trim() || null,
    createdAt: String(request.created_at || request.createdAt || ''),
    updatedAt: String(request.updated_at || request.updatedAt || '')
  }));

  return res.status(200).json({
    requests,
    role: req.authUser.role,
    companyId: scopedCompanyId || null
  });
});

router.post('/support-requests', requireAuth, async (req, res) => {
  if (!req.authUser) {
    return res.status(401).json({ message: 'Usuario nao autenticado.' });
  }

  const companyId = resolveCompanyId(req.authUser.role, req.authUser.companyId, req.body?.companyId);
  const subject = String(req.body?.subject || '').trim() || 'Solicitacao de alteracao';
  const message = String(req.body?.message || '').trim();

  if (!companyId) {
    return res.status(400).json({ message: 'companyId e obrigatorio para abrir solicitacao.' });
  }

  if (!message || message.length < 4) {
    return res.status(400).json({ message: 'Descreva a alteracao desejada com pelo menos 4 caracteres.' });
  }

  const ensuredUser = await ensureUserInPublicTable({
    userId: req.authUser.id,
    fallbackEmail: req.authUser.email,
    fallbackRole: req.authUser.role,
    fallbackName: req.authUser.email.split('@')[0],
    companyId
  });

  if (!ensuredUser.ok) {
    return res.status(400).json({ message: 'Nao foi possivel identificar o usuario solicitante.' });
  }

  const payload = {
    company_id: companyId,
    requester_id: req.authUser.id,
    requester_name: req.authUser.email.split('@')[0],
    requester_email: req.authUser.email,
    subject,
    message,
    status: 'PENDING',
    admin_response: null,
    resolved_by: null,
    updated_at: new Date().toISOString()
  };

  const inserted = await insertWithAliases('supportRequests', payload);

  if (inserted.error || !inserted.data) {
    return res.status(400).json({ message: inserted.error?.message || 'Falha ao abrir solicitacao.' });
  }

  const requestRecord = inserted.data as Record<string, unknown>;
  const requestId = String(requestRecord.id || '').trim() || null;

  // A primeira mensagem do chamado tambem vira a primeira mensagem do chat de suporte.
  const seededChat = await insertSupportMessageWithAliases({
    companyId,
    senderId: req.authUser.id,
    requestId,
    content: `[${subject}] ${message}`
  });

  if (!seededChat.error && seededChat.data) {
    const row = seededChat.data as Record<string, unknown>;
    const senderName = req.authUser.email.split('@')[0] || 'Usuario';

    emitSupportMessage({
      id: String(row.id || ''),
      companyId,
      requestId,
      senderId: req.authUser.id,
      senderName,
      senderRole: req.authUser.role,
      content: `[${subject}] ${message}`,
      createdAt: String(row.created_at || row.createdAt || new Date().toISOString())
    });
  }

  try {
    await sendSupportRequestNotification({
      requestId: requestId || '-',
      companyId,
      requesterName: req.authUser.email.split('@')[0],
      requesterEmail: req.authUser.email,
      subject,
      message
    });
  } catch (emailError) {
    console.error('Erro ao enviar notificacao de suporte por e-mail:', emailError);
  }

  return res.status(201).json({
    message: 'Solicitacao enviada para o admin com sucesso.',
    request: inserted.data
  });
});

router.get('/support-chat/messages', requireAuth, async (req, res) => {
  if (!req.authUser) {
    return res.status(401).json({ message: 'Usuario nao autenticado.' });
  }

  const companyId = resolveCompanyId(req.authUser.role, req.authUser.companyId, req.query.companyId);
  const requestId = String(req.query.requestId || '').trim() || null;

  if (!companyId) {
    return res.status(400).json({ message: 'companyId e obrigatorio para carregar chat de suporte.' });
  }

  const response = await getSupportMessagesWithAliases(companyId);

  if (response.error || !response.data) {
    return res.status(400).json({ message: response.error?.message || 'Falha ao carregar mensagens.' });
  }

  const rows = response.data as Array<Record<string, unknown>>;
  const mappedMessages = await mapSupportChatMessages(rows, companyId);
  const messages = requestId
    ? mappedMessages.filter((message) => message.requestId === requestId)
    : mappedMessages;

  return res.status(200).json({ messages });
});

router.post('/support-chat/messages', requireAuth, async (req, res) => {
  if (!req.authUser) {
    return res.status(401).json({ message: 'Usuario nao autenticado.' });
  }

  const companyId = resolveCompanyId(req.authUser.role, req.authUser.companyId, req.body?.companyId);
  const requestId = String(req.body?.requestId || '').trim() || null;
  const content = String(req.body?.content || '').trim();

  if (!companyId) {
    return res.status(400).json({ message: 'companyId e obrigatorio para enviar mensagem.' });
  }

  if (!content) {
    return res.status(400).json({ message: 'A mensagem nao pode ser vazia.' });
  }

  if (!requestId) {
    return res.status(400).json({ message: 'requestId e obrigatorio para enviar mensagem no chat do chamado.' });
  }

  const requestStatusCheck = await listSupportRequestsWithAliases(companyId);
  const allRequests = (requestStatusCheck.data || []) as Array<Record<string, unknown>>;
  const targetRequest = allRequests.find((r) => String(r.id || '') === requestId);

  if (targetRequest && String(targetRequest.status || '').toUpperCase() === 'DONE') {
    return res.status(403).json({ message: 'Este chamado ja foi finalizado. Abra um novo chamado para continuar.' });
  }

  const ensuredUser = await ensureUserInPublicTable({
    userId: req.authUser.id,
    fallbackEmail: req.authUser.email,
    fallbackRole: req.authUser.role,
    fallbackName: req.authUser.email.split('@')[0],
    companyId
  });

  if (!ensuredUser.ok) {
    return res.status(400).json({ message: 'Nao foi possivel identificar o usuario para enviar mensagem.' });
  }

  const inserted = await insertSupportMessageWithAliases({
    companyId,
    senderId: req.authUser.id,
    requestId,
    content
  });

  if (inserted.error || !inserted.data) {
    return res.status(400).json({ message: inserted.error?.message || 'Falha ao salvar mensagem.' });
  }

  const row = inserted.data as Record<string, unknown>;
  const senderName = req.authUser.email.split('@')[0] || 'Usuario';
  const message: SupportChatMessage = {
    id: String(row.id || ''),
    companyId,
    requestId,
    senderId: req.authUser.id,
    senderName,
    senderRole: req.authUser.role,
    content,
    createdAt: String(row.created_at || row.createdAt || new Date().toISOString())
  };

  emitSupportMessage(message);

  return res.status(201).json({ message: 'Mensagem enviada.', data: message });
});

router.patch('/support-requests/:id', requireAuth, async (req, res) => {
  if (!req.authUser) {
    return res.status(401).json({ message: 'Usuario nao autenticado.' });
  }

  if (req.authUser.role !== 'ADMIN') {
    return res.status(403).json({ message: 'Somente ADMIN pode atualizar solicitacoes de suporte.' });
  }

  const requestId = String(req.params.id || '').trim();
  const companyId = resolveCompanyId(req.authUser.role, req.authUser.companyId, req.body?.companyId);
  const statusRaw = String(req.body?.status || '').trim().toUpperCase();
  const adminResponse = String(req.body?.adminResponse || '').trim();

  if (!requestId) {
    return res.status(400).json({ message: 'id da solicitacao e obrigatorio.' });
  }

  if (!statusRaw || !supportStatuses.includes(statusRaw as SupportStatus)) {
    return res.status(400).json({ message: 'Status invalido. Use PENDING, IN_REVIEW ou DONE.' });
  }

  const payload = {
    status: statusRaw,
    admin_response: adminResponse || null,
    resolved_by: statusRaw === 'DONE' ? req.authUser.id : null,
    updated_at: new Date().toISOString()
  };

  const updated = await updateSupportRequestWithAliases(requestId, companyId, payload);

  if (updated.error || !updated.data) {
    return res.status(400).json({ message: updated.error?.message || 'Falha ao atualizar solicitacao.' });
  }

  return res.status(200).json({
    message: 'Solicitacao de suporte atualizada com sucesso.',
    request: updated.data
  });
});

router.get('/leads', requireAuth, async (req, res) => {
  if (!req.authUser) {
    return res.status(401).json({ message: 'Usuario nao autenticado.' });
  }

  const companyId = resolveCompanyId(req.authUser.role, req.authUser.companyId, req.query.companyId);

  if (!companyId) {
    return res.status(400).json({ message: 'companyId e obrigatorio para consultar leads.' });
  }

  const leads = await getScopedData('leads', {
    id: req.authUser.id,
    email: req.authUser.email,
    role: 'CLIENT',
    companyId
  });

  return res.status(200).json({
    companyId,
    leads: (leads.data || []).sort(
      (left, right) => Number((left as Record<string, unknown>).position || 0) - Number((right as Record<string, unknown>).position || 0)
    ),
    error: leads.error || null
  });
});

router.post('/leads', requireAuth, async (req, res) => {
  if (!req.authUser) {
    return res.status(401).json({ message: 'Usuario nao autenticado.' });
  }

  const name = String(req.body?.name || '').trim();
  const status = String(req.body?.status || 'NOVO_CONTATO').trim().toUpperCase();
  const priority = String(req.body?.priority || 'MEDIA').trim().toUpperCase();
  const value = Number(req.body?.value || 0);
  const notes = String(req.body?.notes || '').trim();
  const companyId = resolveCompanyId(req.authUser.role, req.authUser.companyId, req.body?.companyId);

  if (!name) {
    return res.status(400).json({ message: 'name e obrigatorio.' });
  }

  if (!companyId) {
    return res.status(400).json({ message: 'companyId e obrigatorio para criar lead.' });
  }

  if (!leadStatuses.includes(status as (typeof leadStatuses)[number])) {
    return res.status(400).json({ message: 'status invalido para lead.' });
  }

  if (!leadPriorities.includes(priority as (typeof leadPriorities)[number])) {
    return res.status(400).json({ message: 'priority invalida para lead.' });
  }

  const position = await getNextLeadPosition(companyId, status as LeadStatus);

  let lastError: string | null = null;

  for (const companyField of companyFieldAliases) {
    const payload = {
      name,
      status,
      priority,
      position,
      value,
      notes,
      [companyField]: companyId
    };

    const response = await insertWithAliases('leads', payload);

    if (!response.error) {
      return res.status(201).json({ message: 'Lead criado com sucesso.', lead: response.data });
    }

    lastError = response.error.message;
  }

  return res.status(400).json({ message: lastError || 'Falha ao criar lead.' });
});

router.patch('/leads/:id/status', requireAuth, async (req, res) => {
  if (!req.authUser) {
    return res.status(401).json({ message: 'Usuario nao autenticado.' });
  }

  const leadId = String(req.params.id || '').trim();
  const status = String(req.body?.status || '').trim().toUpperCase();
  const companyId = resolveCompanyId(req.authUser.role, req.authUser.companyId, req.body?.companyId);

  if (!leadId || !status) {
    return res.status(400).json({ message: 'id e status sao obrigatorios.' });
  }

  if (!companyId) {
    return res.status(400).json({ message: 'companyId e obrigatorio para atualizar lead.' });
  }

  if (!leadStatuses.includes(status as (typeof leadStatuses)[number])) {
    return res.status(400).json({ message: 'status invalido para lead.' });
  }

  const position = await getNextLeadPosition(companyId, status as LeadStatus);

  const response = await updateLeadWithAliases(leadId, companyId, { status, position });

  if (!response.error) {
    return res.status(200).json({ message: 'Status do lead atualizado com sucesso.', lead: response.data });
  }

  return res.status(400).json({ message: 'Falha ao atualizar status do lead.' });
});

router.patch('/leads/:id', requireAuth, async (req, res) => {
  if (!req.authUser) {
    return res.status(401).json({ message: 'Usuario nao autenticado.' });
  }

  const leadId = String(req.params.id || '').trim();
  const companyId = resolveCompanyId(req.authUser.role, req.authUser.companyId, req.body?.companyId);
  const name = String(req.body?.name || '').trim();
  const priority = String(req.body?.priority || '').trim().toUpperCase();
  const notes = String(req.body?.notes || '').trim();
  const value = Number(req.body?.value || 0);

  if (!leadId || !companyId) {
    return res.status(400).json({ message: 'id e companyId sao obrigatorios.' });
  }

  if (!name) {
    return res.status(400).json({ message: 'name e obrigatorio.' });
  }

  if (!leadPriorities.includes(priority as (typeof leadPriorities)[number])) {
    return res.status(400).json({ message: 'priority invalida para lead.' });
  }

  const payload = {
    name,
    priority,
    notes,
    value
  };

  const response = await updateLeadWithAliases(leadId, companyId, payload);

  if (!response.error) {
    return res.status(200).json({ message: 'Lead atualizado com sucesso.', lead: response.data });
  }

  return res.status(400).json({ message: 'Falha ao atualizar lead.' });
});

router.patch('/leads/reorder', requireAuth, async (req, res) => {
  if (!req.authUser) {
    return res.status(401).json({ message: 'Usuario nao autenticado.' });
  }

  const companyId = resolveCompanyId(req.authUser.role, req.authUser.companyId, req.body?.companyId);
  const updates = Array.isArray(req.body?.updates) ? req.body.updates : [];

  if (!companyId) {
    return res.status(400).json({ message: 'companyId e obrigatorio para reordenar leads.' });
  }

  if (!updates.length) {
    return res.status(400).json({ message: 'updates deve conter ao menos um lead.' });
  }

  for (const item of updates) {
    const leadId = String(item?.id || '').trim();
    const status = String(item?.status || '').trim().toUpperCase();
    const position = Number(item?.position);

    if (!leadId || !leadStatuses.includes(status as LeadStatus) || !Number.isInteger(position) || position < 0) {
      return res.status(400).json({ message: 'Payload invalido para reorder de leads.' });
    }
  }

  for (const item of updates) {
    const response = await updateLeadWithAliases(String(item.id), companyId, {
      status: String(item.status).toUpperCase(),
      position: Number(item.position)
    });

    if (response.error) {
      return res.status(400).json({ message: response.error.message });
    }
  }

  return res.status(200).json({ message: 'Ordem dos leads atualizada com sucesso.' });
});

router.delete('/leads/:id', requireAuth, async (req, res) => {
  if (!req.authUser) {
    return res.status(401).json({ message: 'Usuario nao autenticado.' });
  }

  const leadId = String(req.params.id || '').trim();
  const companyId = resolveCompanyId(req.authUser.role, req.authUser.companyId, req.query.companyId);

  if (!leadId || !companyId) {
    return res.status(400).json({ message: 'id e companyId sao obrigatorios.' });
  }

  for (const tableName of tableAliases.leads) {
    for (const companyField of companyFieldAliases) {
      const response = await supabaseAdmin
        .from(tableName)
        .delete()
        .eq('id', leadId)
        .eq(companyField, companyId);

      if (!response.error) {
        return res.status(200).json({ message: 'Lead excluido com sucesso.' });
      }
    }
  }

  return res.status(400).json({ message: 'Falha ao excluir lead.' });
});

export default router;
