import { Request, Response } from 'express';
import { authService } from '../services/authService';

export class AuthController {
  async login(req: Request, res: Response): Promise<void> {
    try {
      const result = await authService.login(req.body);
      res.json({ success: true, data: result });
    } catch (error: unknown) {
      res.status(401).json({
        success: false,
        error: error instanceof Error ? error.message : 'Login failed',
      });
    }
  }

  async register(req: Request, res: Response): Promise<void> {
    try {
      const { companyId } = req.body;
      if (!companyId) {
        res.status(400).json({ success: false, error: 'companyId is required' });
        return;
      }
      const result = await authService.register(req.body, companyId);
      res.status(201).json({ success: true, data: result });
    } catch (error: unknown) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Registration failed',
      });
    }
  }

  async me(req: Request, res: Response): Promise<void> {
    res.json({ success: true, data: req.user });
  }
}

export const authController = new AuthController();
