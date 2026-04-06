import type { Request, Response, NextFunction } from 'express';
import type { AuthUser } from '../types/auth';

/**
 * Middleware para verificar se o usuário tem um role específico
 * @param allowedRoles - array de roles permitidos
 */
export const requireRole = (allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const authUser = (req as any).authUser as AuthUser | undefined;

    if (!authUser) {
      return res.status(401).json({ message: 'Usuario nao autenticado.' });
    }

    if (!allowedRoles.includes(authUser.role)) {
      return res.status(403).json({ 
        message: `Acesso negado. Roles permitidos: ${allowedRoles.join(', ')}` 
      });
    }

    next();
  };
};

/**
 * Middleware para verificar se o usuário tem acesso à empresa
 * Para DEV e CLIENT: valida se é a própria empresa
 * Para ADMIN: permite acesso a qualquer empresa
 */
export const validateCompanyAccess = (companyIdParam: string | ((req: Request) => string)) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const authUser = (req as any).authUser as AuthUser | undefined;

    if (!authUser) {
      return res.status(401).json({ message: 'Usuario nao autenticado.' });
    }

    // Obter o ID da empresa a ser acessada
    let targetCompanyId: string;
    if (typeof companyIdParam === 'function') {
      targetCompanyId = companyIdParam(req);
    } else {
      targetCompanyId = String(
        (req.query as any)?.[companyIdParam] || 
        (req.body as any)?.[companyIdParam] || 
        ''
      ).trim();
    }

    if (!targetCompanyId) {
      return res.status(400).json({ message: 'Company ID é obrigatório.' });
    }

    // ADMIN tem acesso a tudo
    if (authUser.role === 'ADMIN') {
      (req as any).targetCompanyId = targetCompanyId;
      return next();
    }

    // DEV e CLIENT só podem acessar sua própria empresa
    if (authUser.role === 'DEV' || authUser.role === 'CLIENT') {
      if (authUser.companyId !== targetCompanyId) {
        return res.status(403).json({ 
          message: 'Acesso negado. Voce so pode acessar dados da sua propia empresa.' 
        });
      }
      (req as any).targetCompanyId = targetCompanyId;
      return next();
    }

    return res.status(403).json({ message: 'Acesso negado.' });
  };
};

/**
 * Middleware para restringir acesso a API integrations apenas para DEV
 */
export const requireDevRole = (req: Request, res: Response, next: NextFunction) => {
  const authUser = (req as any).authUser as AuthUser | undefined;

  if (!authUser) {
    return res.status(401).json({ message: 'Usuario nao autenticado.' });
  }

  if (authUser.role !== 'DEV') {
    return res.status(403).json({ 
      message: 'Acesso negado. Apenas usuarios com role DEV podem acessar as APIs de integracao.' 
    });
  }

  next();
};

/**
 * Middleware para restringir acesso apenas a ADMIN
 */
export const requireAdminRole = (req: Request, res: Response, next: NextFunction) => {
  const authUser = (req as any).authUser as AuthUser | undefined;

  if (!authUser) {
    return res.status(401).json({ message: 'Usuario nao autenticado.' });
  }

  if (authUser.role !== 'ADMIN') {
    return res.status(403).json({ 
      message: 'Acesso negado. Apenas admins podem acessar este recurso.' 
    });
  }

  next();
};
