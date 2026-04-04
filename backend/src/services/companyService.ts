import prisma from '../config/prisma';
import { CreateCompanyRequest, SubscriptionPlan } from '../../../shared/types';

export class CompanyService {
  async findAll() {
    return prisma.company.findMany({
      include: { _count: { select: { users: true, products: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string) {
    const company = await prisma.company.findUnique({ where: { id } });
    if (!company) throw new Error('Company not found');
    return company;
  }

  async create(data: CreateCompanyRequest) {
    return prisma.company.create({
      data: { name: data.name, plan: data.plan ?? 'BASIC' },
    });
  }

  async updatePlan(id: string, plan: SubscriptionPlan) {
    await this.findById(id);
    return prisma.company.update({ where: { id }, data: { plan } });
  }

  async getUsers(companyId: string) {
    return prisma.user.findMany({
      where: { companyId },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
  }
}

export const companyService = new CompanyService();
