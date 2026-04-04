import { Request, Response } from 'express';
import { saleService } from '../services/saleService';

export class SaleController {
  async index(req: Request, res: Response): Promise<void> {
    try {
      const sales = await saleService.findAll(req.user!.companyId);
      res.json({ success: true, data: sales });
    } catch (error: unknown) {
      res.status(500).json({ success: false, error: 'Failed to fetch sales' });
    }
  }

  async show(req: Request, res: Response): Promise<void> {
    try {
      const sale = await saleService.findById(req.params.id, req.user!.companyId);
      res.json({ success: true, data: sale });
    } catch (error: unknown) {
      res.status(404).json({
        success: false,
        error: error instanceof Error ? error.message : 'Sale not found',
      });
    }
  }

  async create(req: Request, res: Response): Promise<void> {
    try {
      const sale = await saleService.create(
        req.user!.companyId,
        req.user!.sub,
        req.body,
      );
      res.status(201).json({ success: true, data: sale });
    } catch (error: unknown) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create sale',
      });
    }
  }
}

export const saleController = new SaleController();
