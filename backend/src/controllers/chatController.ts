import { Request, Response } from 'express';
import { chatService } from '../services/chatService';

export class ChatController {
  async index(req: Request, res: Response): Promise<void> {
    try {
      const messages = await chatService.getMessages(req.user!.companyId);
      res.json({ success: true, data: messages });
    } catch (error: unknown) {
      res.status(500).json({ success: false, error: 'Failed to fetch messages' });
    }
  }
}

export const chatController = new ChatController();
