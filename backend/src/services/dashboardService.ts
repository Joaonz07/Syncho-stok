import prisma from '../config/prisma';

export class DashboardService {
  async getStats(companyId: string) {
    const [totalSalesResult, totalRevenueResult, lowStockProducts, topProducts, monthlySales] =
      await Promise.all([
        // Total number of sales
        prisma.sale.count({ where: { companyId } }),

        // Total revenue
        prisma.sale.aggregate({
          where: { companyId },
          _sum: { total: true },
        }),

        // Products with low stock (≤ 10)
        prisma.product.findMany({
          where: { companyId, quantity: { lte: 10 } },
          orderBy: { quantity: 'asc' },
          take: 10,
        }),

        // Top 5 products by units sold
        prisma.saleItem.groupBy({
          by: ['productId'],
          where: { sale: { companyId } },
          _sum: { quantity: true },
          orderBy: { _sum: { quantity: 'desc' } },
          take: 5,
        }),

        // Monthly sales for the last 6 months
        prisma.$queryRaw<Array<{ month: string; total: number }>>`
          SELECT
            TO_CHAR("createdAt", 'YYYY-MM') AS month,
            SUM(total)::float               AS total
          FROM "Sale"
          WHERE "companyId" = ${companyId}
            AND "createdAt" >= NOW() - INTERVAL '6 months'
          GROUP BY month
          ORDER BY month ASC
        `,
      ]);

    // Resolve top product details
    const topProductDetails = await Promise.all(
      topProducts.map(async (item) => {
        const product = await prisma.product.findUnique({
          where: { id: item.productId },
        });
        return { product, totalSold: item._sum.quantity ?? 0 };
      }),
    );

    return {
      totalSales: totalSalesResult,
      totalRevenue: Number(totalRevenueResult._sum.total ?? 0),
      lowStockProducts: lowStockProducts.map((p) => ({
        ...p,
        price: Number(p.price),
      })),
      topProducts: topProductDetails
        .filter((t) => t.product !== null)
        .map((t) => ({
          product: { ...t.product!, price: Number(t.product!.price) },
          totalSold: t.totalSold,
        })),
      monthlySales,
    };
  }
}

export const dashboardService = new DashboardService();
