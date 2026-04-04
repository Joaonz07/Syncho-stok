import { Request, Response } from 'express';
import { dashboardService } from '../services/dashboardService';

export class DashboardController {
  async stats(req: Request, res: Response): Promise<void> {
    try {
      const stats = await dashboardService.getStats(req.user!.companyId);
      res.json({ success: true, data: stats });
    } catch (error: unknown) {
      res.status(500).json({ success: false, error: 'Failed to fetch dashboard stats' });
    }
  }
}

export const dashboardController = new DashboardController();
