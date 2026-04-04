import prisma from '../config/prisma';
import { CreateProductRequest, UpdateProductRequest } from '../../../shared/types';

export class ProductService {
  async findAll(companyId: string) {
    return prisma.product.findMany({
      where: { companyId },
      orderBy: { name: 'asc' },
    });
  }

  async findById(id: string, companyId: string) {
    const product = await prisma.product.findFirst({
      where: { id, companyId },
    });
    if (!product) throw new Error('Product not found');
    return product;
  }

  async create(companyId: string, data: CreateProductRequest) {
    const existing = await prisma.product.findFirst({
      where: { code: data.code, companyId },
    });
    if (existing) throw new Error('Product code already exists in this company');

    const product = await prisma.product.create({
      data: { ...data, companyId },
    });

    // Register stock-in movement
    await prisma.stockMovement.create({
      data: {
        productId: product.id,
        type: 'IN',
        quantity: data.quantity,
        reason: 'Initial stock',
      },
    });

    return product;
  }

  async update(id: string, companyId: string, data: UpdateProductRequest) {
    await this.findById(id, companyId);

    return prisma.product.update({
      where: { id },
      data,
    });
  }

  async delete(id: string, companyId: string) {
    await this.findById(id, companyId);
    await prisma.product.delete({ where: { id } });
  }

  async getLowStock(companyId: string, threshold = 10) {
    return prisma.product.findMany({
      where: { companyId, quantity: { lte: threshold } },
      orderBy: { quantity: 'asc' },
    });
  }

  async getMovements(productId: string, companyId: string) {
    await this.findById(productId, companyId);
    return prisma.stockMovement.findMany({
      where: { productId },
      orderBy: { createdAt: 'desc' },
    });
  }
}

export const productService = new ProductService();
