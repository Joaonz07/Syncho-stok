import { Request, Response } from 'express';
import { productService } from '../services/productService';

export class ProductController {
  async index(req: Request, res: Response): Promise<void> {
    try {
      const products = await productService.findAll(req.user!.companyId);
      res.json({ success: true, data: products });
    } catch (error: unknown) {
      res.status(500).json({ success: false, error: 'Failed to fetch products' });
    }
  }

  async show(req: Request, res: Response): Promise<void> {
    try {
      const product = await productService.findById(req.params.id, req.user!.companyId);
      res.json({ success: true, data: product });
    } catch (error: unknown) {
      res.status(404).json({
        success: false,
        error: error instanceof Error ? error.message : 'Product not found',
      });
    }
  }

  async create(req: Request, res: Response): Promise<void> {
    try {
      const product = await productService.create(req.user!.companyId, req.body);
      res.status(201).json({ success: true, data: product });
    } catch (error: unknown) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create product',
      });
    }
  }

  async update(req: Request, res: Response): Promise<void> {
    try {
      const product = await productService.update(req.params.id, req.user!.companyId, req.body);
      res.json({ success: true, data: product });
    } catch (error: unknown) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update product',
      });
    }
  }

  async destroy(req: Request, res: Response): Promise<void> {
    try {
      await productService.delete(req.params.id, req.user!.companyId);
      res.json({ success: true, message: 'Product deleted' });
    } catch (error: unknown) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete product',
      });
    }
  }

  async movements(req: Request, res: Response): Promise<void> {
    try {
      const movements = await productService.getMovements(req.params.id, req.user!.companyId);
      res.json({ success: true, data: movements });
    } catch (error: unknown) {
      res.status(404).json({
        success: false,
        error: error instanceof Error ? error.message : 'Not found',
      });
    }
  }
}

export const productController = new ProductController();
