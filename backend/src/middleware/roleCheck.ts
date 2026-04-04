import { Request, Response, NextFunction } from 'express';
import { UserRole } from '../../../shared/types';

export const requireRole =
  (...roles: UserRole[]) =>
  (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Unauthenticated' });
      return;
    }
    if (!roles.includes(req.user.role)) {
      res
        .status(403)
        .json({ success: false, error: 'Insufficient permissions' });
      return;
    }
    next();
  };
