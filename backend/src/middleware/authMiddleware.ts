import type { Request, Response, NextFunction } from 'express';
import { supabaseAdmin } from '../supabaseClient';
import type { UserRole } from '../types/auth';
import { ensureUserHasCompany, normalizeUserRole } from '../services/saasService';
import { logSecurityEvent } from '../services/securityLogger';

const parseRole = (roleValue: unknown): UserRole => normalizeUserRole(roleValue);

const parseBearerToken = (authHeader: string) => {
  const normalized = String(authHeader || '').trim();

  if (!/^Bearer\s+[A-Za-z0-9\-_.]+$/i.test(normalized)) {
    return null;
  }

  return normalized.replace(/^Bearer\s+/i, '').trim();
};

const extractTokenExpiration = (token: string) => {
  try {
    const parts = token.split('.');

    if (parts.length < 2) {
      return null;
    }

    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8')) as {
      exp?: number;
    };

    return typeof payload.exp === 'number' ? payload.exp : null;
  } catch (_error) {
    return null;
  }
};

export const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = String(req.headers.authorization || '');
  const token = parseBearerToken(authHeader);

  if (!token) {
    logSecurityEvent({
      level: 'WARN',
      event: 'auth_missing_or_invalid_bearer',
      requestId: req.requestId,
      ip: req.ip || null,
      method: req.method,
      path: req.originalUrl,
      statusCode: 401
    });

    return res.status(401).json({ message: 'Token nao informado.' });
  }

  const exp = extractTokenExpiration(token);

  if (!exp || exp * 1000 <= Date.now()) {
    logSecurityEvent({
      level: 'WARN',
      event: 'auth_expired_token',
      requestId: req.requestId,
      ip: req.ip || null,
      method: req.method,
      path: req.originalUrl,
      statusCode: 401
    });

    return res.status(401).json({ message: 'Token invalido ou expirado.' });
  }

  const { data, error } = await supabaseAdmin.auth.getUser(token);

  if (error || !data.user) {
    logSecurityEvent({
      level: 'WARN',
      event: 'auth_token_lookup_failed',
      requestId: req.requestId,
      ip: req.ip || null,
      method: req.method,
      path: req.originalUrl,
      statusCode: 401,
      details: {
        providerError: error?.message || 'user_not_found'
      }
    });

    return res.status(401).json({ message: 'Token invalido ou expirado.' });
  }

  const ensuredUser = await ensureUserHasCompany({
    authUser: data.user,
    fallbackRole: data.user.app_metadata?.role || data.user.user_metadata?.role,
    fallbackCompanyId:
      String(data.user.app_metadata?.company_id || data.user.user_metadata?.company_id || '').trim() || null,
    fallbackCompanyName: String(data.user.user_metadata?.company_name || '').trim() || null,
    fallbackUserName: String(data.user.user_metadata?.name || '').trim() || null
  });

  if (ensuredUser.error) {
    logSecurityEvent({
      level: 'ERROR',
      event: 'auth_user_sync_failed',
      requestId: req.requestId,
      ip: req.ip || null,
      method: req.method,
      path: req.originalUrl,
      statusCode: 500,
      details: {
        reason: ensuredUser.error
      }
    });

    return res.status(500).json({ message: ensuredUser.error });
  }

  const role = parseRole(ensuredUser.role || 'CLIENT');
  const companyId = ensuredUser.companyId || null;

  req.authUser = {
    id: data.user.id,
    email: data.user.email || '',
    role,
    companyId
  };

  logSecurityEvent({
    event: 'auth_success',
    requestId: req.requestId,
    userId: data.user.id,
    companyId,
    ip: req.ip || null,
    method: req.method,
    path: req.originalUrl,
    statusCode: 200,
    details: {
      role
    }
  });

  return next();
};

export const isAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (req.authUser?.role === 'ADMIN') {
    return next();
  }

  return res.status(403).json({ message: 'Acesso restrito ao ADMIN.' });
};
