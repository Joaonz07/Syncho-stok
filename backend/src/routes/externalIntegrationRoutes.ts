import { Router, type Request, type Response, type NextFunction } from 'express';
import { getScopedData } from '../services/dataAccess';
import { logSecurityEvent } from '../services/securityLogger';
import {
  customIntegrationEvents,
  dispatchCompanyWebhookEvent,
  validateCompanyIntegrationApiKey
} from '../services/customIntegrationService';
import { supabaseAdmin } from '../supabaseClient';

const router = Router();

const companyFieldAliases = ['company_id', 'companyId', 'companyID'];
const lowStockThreshold = 5;
const rateLimitWindowMs = 60_000;
const rateLimitMaxRequests = 120;
const rateLimitBuckets = new Map<string, { count: number; resetAt: number }>();
const allowedLeadStatus = ['NOVO_CONTATO', 'EM_NEGOCIACAO', 'PROPOSTA_ENVIADA', 'FECHADO'] as const;
const allowedLeadPriority = ['BAIXA', 'MEDIA', 'ALTA'] as const;

const tableAliases = {
  products: ['products'],
  sales: ['sales', 'Sale'],
  leads: ['leads', 'Lead'],
  users: ['users', 'User']
} as const;

const applyRateLimit = (apiKey: string) => {
  const now = Date.now();
  const current = rateLimitBuckets.get(apiKey);

  if (!current || current.resetAt <= now) {
    rateLimitBuckets.set(apiKey, { count: 1, resetAt: now + rateLimitWindowMs });
    return { allowed: true, remaining: rateLimitMaxRequests - 1 };
  }

  if (current.count >= rateLimitMaxRequests) {
    return { allowed: false, retryAfterMs: current.resetAt - now };
  }

  current.count += 1;
  return { allowed: true, remaining: rateLimitMaxRequests - current.count };
};

const requireIntegrationApiKey = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = String(req.headers.authorization || '').trim();

  if (!/^Bearer\s+[A-Za-z0-9\-_.]+$/i.test(authHeader)) {
    return res.status(401).json({ message: 'Bearer token nao informado.' });
  }

  const apiKey = authHeader.slice('Bearer '.length).trim();

  if (!/^syncho_[A-Za-z0-9]{20,}$/.test(apiKey)) {
    logSecurityEvent({
      level: 'WARN',
      event: 'integration_invalid_api_key_format',
      requestId: req.requestId,
      ip: req.ip || null,
      method: req.method,
      path: req.originalUrl,
      statusCode: 401
    });

    return res.status(401).json({ message: 'API key invalida.' });
  }

  const validated = await validateCompanyIntegrationApiKey(apiKey);

  if (!validated) {
    logSecurityEvent({
      level: 'WARN',
      event: 'integration_api_key_not_found',
      requestId: req.requestId,
      ip: req.ip || null,
      method: req.method,
      path: req.originalUrl,
      statusCode: 401
    });

    return res.status(401).json({ message: 'API key invalida.' });
  }

  const rateLimit = applyRateLimit(validated.apiKey);

  if (!rateLimit.allowed) {
    res.setHeader('Retry-After', String(Math.ceil((rateLimit.retryAfterMs || 0) / 1000)));

    logSecurityEvent({
      level: 'WARN',
      event: 'integration_api_rate_limited',
      requestId: req.requestId,
      companyId: validated.companyId,
      ip: req.ip || null,
      method: req.method,
      path: req.originalUrl,
      statusCode: 429
    });

    return res.status(429).json({ message: 'Limite de requisicoes excedido para esta API key.' });
  }

  req.integrationAuth = {
    companyId: validated.companyId,
    apiKey: validated.apiKey
  };

  logSecurityEvent({
    event: 'integration_api_authenticated',
    requestId: req.requestId,
    companyId: validated.companyId,
    ip: req.ip || null,
    method: req.method,
    path: req.originalUrl,
    statusCode: 200
  });

  return next();
};

const insertWithAliases = async (
  aliasKey: keyof typeof tableAliases,
  payload: Record<string, unknown>
) => {
  let lastError: string | null = null;

  for (const tableName of tableAliases[aliasKey]) {
    const response = await supabaseAdmin.from(tableName).insert(payload).select('*').single();

    if (!response.error) {
      return response;
    }

    if (!lastError) {
      lastError = `${tableName}: ${response.error.message || 'erro desconhecido'}`;
    }
  }

  return {
    data: null,
    error: { message: lastError || `Falha ao inserir em ${aliasKey}.` }
  };
};

const getPrimaryCompanyUserId = async (companyId: string) => {
  for (const tableName of tableAliases.users) {
    for (const companyField of companyFieldAliases) {
      const response = await supabaseAdmin
        .from(tableName)
        .select('id,role,created_at')
        .eq(companyField, companyId)
        .order('created_at', { ascending: true })
        .limit(10);

      if (!response.error && response.data?.length) {
        const rows = response.data as Array<Record<string, unknown>>;
        const admin = rows.find((row) => String(row.role || '').toUpperCase() === 'ADMIN');
        const target = admin || rows[0];
        return String(target.id || '').trim() || null;
      }
    }
  }

  return null;
};

const getProductById = async (companyId: string, productId: string) => {
  for (const tableName of tableAliases.products) {
    for (const companyField of companyFieldAliases) {
      const response = await supabaseAdmin
        .from(tableName)
        .select('*')
        .eq('id', productId)
        .eq(companyField, companyId)
        .maybeSingle();

      if (!response.error && response.data) {
        return response.data as Record<string, unknown>;
      }
    }
  }

  return null;
};

const updateProductQuantity = async (companyId: string, productId: string, quantity: number) => {
  for (const tableName of tableAliases.products) {
    for (const companyField of companyFieldAliases) {
      const response = await supabaseAdmin
        .from(tableName)
        .update({ quantity })
        .eq('id', productId)
        .eq(companyField, companyId)
        .select('*')
        .single();

      if (!response.error && response.data) {
        return response.data as Record<string, unknown>;
      }
    }
  }

  return null;
};

router.get('/products', requireIntegrationApiKey, async (req, res) => {
  const companyId = req.integrationAuth?.companyId;

  if (!companyId) {
    return res.status(401).json({ message: 'Empresa nao resolvida para a API key.' });
  }

  const products = await getScopedData('products', {
    id: 'integration-api',
    email: 'integration@api.local',
    role: 'CLIENT',
    companyId
  });

  return res.status(200).json({
    companyId,
    products: products.data || []
  });
});

router.get('/dashboard', requireIntegrationApiKey, async (req, res) => {
  const companyId = req.integrationAuth?.companyId;

  if (!companyId) {
    return res.status(401).json({ message: 'Empresa nao resolvida para a API key.' });
  }

  const [products, sales, leads] = await Promise.all([
    getScopedData('products', { id: 'integration-api', email: 'integration@api.local', role: 'CLIENT', companyId }),
    getScopedData('sales', { id: 'integration-api', email: 'integration@api.local', role: 'CLIENT', companyId }),
    getScopedData('leads', { id: 'integration-api', email: 'integration@api.local', role: 'CLIENT', companyId })
  ]);

  const productRows = (products.data || []) as Array<Record<string, unknown>>;
  const salesRows = (sales.data || []) as Array<Record<string, unknown>>;
  const leadRows = (leads.data || []) as Array<Record<string, unknown>>;
  const totalRevenue = salesRows.reduce((sum, sale) => sum + Number(sale.total || 0), 0);
  const lowStockProducts = productRows
    .filter((product) => Number(product.quantity || 0) <= lowStockThreshold)
    .map((product) => ({
      id: String(product.id || ''),
      name: String(product.name || 'Produto'),
      quantity: Number(product.quantity || 0)
    }));

  return res.status(200).json({
    companyId,
    summary: {
      productsCount: productRows.length,
      salesCount: salesRows.length,
      leadsCount: leadRows.length,
      totalRevenue,
      lowStockProducts
    }
  });
});

router.post('/leads', requireIntegrationApiKey, async (req, res) => {
  const companyId = req.integrationAuth?.companyId;
  const name = String(req.body?.name || '').trim();
  const status = String(req.body?.status || 'NOVO_CONTATO').trim().toUpperCase();
  const priority = String(req.body?.priority || 'MEDIA').trim().toUpperCase();
  const value = Number(req.body?.value || 0);
  const notes = String(req.body?.notes || '').trim();

  if (!companyId) {
    return res.status(401).json({ message: 'Empresa nao resolvida para a API key.' });
  }

  if (!name) {
    return res.status(400).json({ message: 'name e obrigatorio.' });
  }

  if (name.length > 120 || notes.length > 2000) {
    return res.status(400).json({ message: 'Campos excedem o limite permitido.' });
  }

  if (!allowedLeadStatus.includes(status as (typeof allowedLeadStatus)[number])) {
    return res.status(400).json({ message: 'status invalido.' });
  }

  if (!allowedLeadPriority.includes(priority as (typeof allowedLeadPriority)[number])) {
    return res.status(400).json({ message: 'priority invalida.' });
  }

  if (!Number.isFinite(value) || value < 0 || value > 10_000_000) {
    return res.status(400).json({ message: 'value deve estar entre 0 e 10000000.' });
  }

  let created = null as Record<string, unknown> | null;
  let lastError: string | null = null;

  for (const companyField of companyFieldAliases) {
    const response = await insertWithAliases('leads', {
      name,
      status,
      priority,
      value,
      notes,
      [companyField]: companyId
    });

    if (!response.error && response.data) {
      created = response.data as Record<string, unknown>;
      break;
    }

    lastError = response.error?.message || 'Falha ao criar lead.';
  }

  if (!created) {
    return res.status(400).json({ message: lastError || 'Falha ao criar lead.' });
  }

  return res.status(201).json({
    message: 'Lead criado com sucesso.',
    lead: created
  });
});

router.post('/sales', requireIntegrationApiKey, async (req, res) => {
  const companyId = req.integrationAuth?.companyId;
  const items = Array.isArray(req.body?.items)
    ? (req.body.items as Array<Record<string, unknown>>)
        .map((item) => ({
          productId: String(item.productId || '').trim(),
          quantity: Number(item.quantity || 0)
        }))
        .filter((item) => item.productId && Number.isFinite(item.quantity) && item.quantity > 0)
    : [];
  let total = Number(req.body?.total || 0);

  if (Array.isArray(req.body?.items) && req.body.items.length > 100) {
    return res.status(400).json({ message: 'items excede o limite de 100 produtos por venda.' });
  }

  if (!companyId) {
    return res.status(401).json({ message: 'Empresa nao resolvida para a API key.' });
  }

  const userId = await getPrimaryCompanyUserId(companyId);

  if (!userId) {
    return res.status(400).json({ message: 'Nao foi possivel localizar um usuario da empresa para registrar a venda.' });
  }

  const updatedProducts: Array<Record<string, unknown>> = [];

  if (items.length) {
    total = 0;

    for (const item of items) {
      const product = await getProductById(companyId, item.productId);

      if (!product) {
        return res.status(400).json({ message: `Produto ${item.productId} nao encontrado.` });
      }

      const stockBefore = Number(product.quantity || 0);
      const price = Number(product.price || 0);

      if (!Number.isFinite(stockBefore) || stockBefore < item.quantity) {
        return res.status(400).json({
          message: `Estoque insuficiente para ${String(product.name || item.productId)}.`
        });
      }

      total += price * item.quantity;

      const updated = await updateProductQuantity(companyId, item.productId, stockBefore - item.quantity);

      if (!updated) {
        return res.status(400).json({ message: `Falha ao atualizar estoque do produto ${item.productId}.` });
      }

      updatedProducts.push(updated);

      if (Number(updated.quantity || 0) <= lowStockThreshold) {
        void dispatchCompanyWebhookEvent(companyId, 'stock.low', {
          productId: String(updated.id || item.productId),
          name: String(updated.name || 'Produto'),
          quantity: Number(updated.quantity || 0),
          threshold: lowStockThreshold
        });
      }
    }
  }

  if (!Number.isFinite(total) || total <= 0) {
    return res.status(400).json({ message: 'total deve ser maior que zero.' });
  }

  if (total > 100_000_000) {
    return res.status(400).json({ message: 'total excede o limite permitido.' });
  }

  let createdSale = null as Record<string, unknown> | null;
  let lastError: string | null = null;

  for (const companyField of companyFieldAliases) {
    for (const userField of ['user_id', 'userId']) {
      const response = await insertWithAliases('sales', {
        total,
        [companyField]: companyId,
        [userField]: userId
      });

      if (!response.error && response.data) {
        createdSale = response.data as Record<string, unknown>;
        break;
      }

      lastError = response.error?.message || 'Falha ao registrar venda.';
    }

    if (createdSale) {
      break;
    }
  }

  if (!createdSale) {
    return res.status(400).json({ message: lastError || 'Falha ao registrar venda.' });
  }

  void dispatchCompanyWebhookEvent(companyId, 'sale.created', {
    sale: createdSale,
    items,
    total
  });

  return res.status(201).json({
    message: 'Venda registrada com sucesso.',
    sale: createdSale,
    items,
    updatedProducts
  });
});

router.get('/meta', requireIntegrationApiKey, (req, res) => {
  logSecurityEvent({
    event: 'integration_api_meta_access',
    requestId: req.requestId,
    companyId: req.integrationAuth?.companyId || null,
    ip: req.ip || null,
    method: req.method,
    path: req.originalUrl,
    statusCode: 200
  });

  return res.status(200).json({
    companyId: req.integrationAuth?.companyId || null,
    events: customIntegrationEvents,
    endpoints: [
      { method: 'GET', path: '/products', description: 'Lista os produtos da empresa autenticada.' },
      { method: 'POST', path: '/sales', description: 'Registra uma venda e pode baixar estoque.' },
      { method: 'GET', path: '/dashboard', description: 'Retorna resumo operacional da empresa.' },
      { method: 'POST', path: '/leads', description: 'Cria um lead no funil comercial.' }
    ]
  });
});

export default router;