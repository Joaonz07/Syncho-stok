import prisma from '../config/prisma';
import { CreateSaleRequest } from '../../../shared/types';

export class SaleService {
  async create(companyId: string, userId: string, data: CreateSaleRequest) {
    // Validate stock and calculate total inside a transaction
    const sale = await prisma.$transaction(async (tx) => {
      let total = 0;

      for (const item of data.items) {
        const product = await tx.product.findFirst({
          where: { id: item.productId, companyId },
        });

        if (!product) {
          throw new Error(`Product ${item.productId} not found`);
        }
        if (product.quantity < item.quantity) {
          throw new Error(
            `Insufficient stock for product "${product.name}". Available: ${product.quantity}`,
          );
        }

        total += item.unitPrice * item.quantity;
      }

      // Create the sale record
      const newSale = await tx.sale.create({
        data: {
          companyId,
          userId,
          total,
          items: {
            create: data.items.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
            })),
          },
        },
        include: { items: true },
      });

      // Deduct stock and register movements
      for (const item of data.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { quantity: { decrement: item.quantity } },
        });

        await tx.stockMovement.create({
          data: {
            productId: item.productId,
            type: 'OUT',
            quantity: item.quantity,
            reason: `Sale #${newSale.id}`,
          },
        });
      }

      return newSale;
    });

    return sale;
  }

  async findAll(companyId: string) {
    return prisma.sale.findMany({
      where: { companyId },
      include: {
        items: { include: { product: true } },
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string, companyId: string) {
    const sale = await prisma.sale.findFirst({
      where: { id, companyId },
      include: {
        items: { include: { product: true } },
        user: { select: { id: true, name: true, email: true } },
      },
    });
    if (!sale) throw new Error('Sale not found');
    return sale;
  }
}

export const saleService = new SaleService();
