import { Request, Response } from 'express';
import { companyService } from '../services/companyService';
import { SubscriptionPlan } from '../../../shared/types';

export class CompanyController {
  async index(req: Request, res: Response): Promise<void> {
    try {
      const companies = await companyService.findAll();
      res.json({ success: true, data: companies });
    } catch (error: unknown) {
      res.status(500).json({ success: false, error: 'Failed to fetch companies' });
    }
  }

  async show(req: Request, res: Response): Promise<void> {
    try {
      const company = await companyService.findById(req.params.id);
      res.json({ success: true, data: company });
    } catch (error: unknown) {
      res.status(404).json({
        success: false,
        error: error instanceof Error ? error.message : 'Company not found',
      });
    }
  }

  async create(req: Request, res: Response): Promise<void> {
    try {
      const company = await companyService.create(req.body);
      res.status(201).json({ success: true, data: company });
    } catch (error: unknown) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create company',
      });
    }
  }

  async updatePlan(req: Request, res: Response): Promise<void> {
    try {
      const { plan } = req.body as { plan: SubscriptionPlan };
      const company = await companyService.updatePlan(req.params.id, plan);
      res.json({ success: true, data: company });
    } catch (error: unknown) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update plan',
      });
    }
  }

  async users(req: Request, res: Response): Promise<void> {
    try {
      const users = await companyService.getUsers(req.params.id);
      res.json({ success: true, data: users });
    } catch (error: unknown) {
      res.status(404).json({
        success: false,
        error: error instanceof Error ? error.message : 'Not found',
      });
    }
  }
}

export const companyController = new CompanyController();
