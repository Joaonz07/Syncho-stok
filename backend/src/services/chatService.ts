import prisma from '../config/prisma';

export class ChatService {
  async getMessages(companyId: string, limit = 50) {
    return prisma.message.findMany({
      where: { companyId },
      include: {
        sender: { select: { id: true, name: true, role: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async saveMessage(companyId: string, senderId: string, content: string) {
    const message = await prisma.message.create({
      data: { companyId, senderId, content },
      include: {
        sender: { select: { id: true, name: true, role: true } },
      },
    });
    return message;
  }
}

export const chatService = new ChatService();
