import type { Request, Response, NextFunction } from 'express';
import { supabaseAdmin } from '../supabaseClient';
import type { UserRole } from '../types/auth';
import { ensureUserHasCompany, normalizeUserRole } from '../services/saasService';

const parseRole = (roleValue: unknown): UserRole => normalizeUserRole(roleValue);

export const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Token nao informado.' });
  }

  const token = authHeader.replace('Bearer ', '').trim();

  if (!token) {
    return res.status(401).json({ message: 'Token invalido.' });
  }

  const { data, error } = await supabaseAdmin.auth.getUser(token);

  if (error || !data.user) {
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

  return next();
};

export const isAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (req.authUser?.role === 'ADMIN') {
    return next();
  }

  return res.status(403).json({ message: 'Acesso restrito ao ADMIN.' });
};
