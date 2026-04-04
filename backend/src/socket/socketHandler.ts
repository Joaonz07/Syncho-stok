import { Server as SocketServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { chatService } from '../services/chatService';
import { AuthTokenPayload } from '../../../shared/types';

interface AuthenticatedSocket extends Socket {
  user?: AuthTokenPayload;
}

export function setupSocket(io: SocketServer): void {
  // Middleware: authenticate every socket connection via JWT
  io.use((socket: AuthenticatedSocket, next) => {
    const token = socket.handshake.auth.token as string | undefined;
    if (!token) {
      return next(new Error('Authentication error: no token'));
    }
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET!) as AuthTokenPayload;
      socket.user = payload;
      next();
    } catch {
      next(new Error('Authentication error: invalid token'));
    }
  });

  io.on('connection', (socket: AuthenticatedSocket) => {
    const user = socket.user!;
    const room = `company:${user.companyId}`;

    // Join the room for the user's company
    socket.join(room);
    console.log(`Socket connected: ${user.email} → room ${room}`);

    // Listen for incoming chat messages
    socket.on('chat:send', async (content: string) => {
      try {
        if (!content?.trim()) return;

        const message = await chatService.saveMessage(
          user.companyId,
          user.sub,
          content.trim(),
        );

        // Broadcast message to everyone in the same company room
        io.to(room).emit('chat:message', {
          id: message.id,
          companyId: message.companyId,
          senderId: message.senderId,
          senderName: message.sender.name,
          content: message.content,
          createdAt: message.createdAt.toISOString(),
        });
      } catch (err) {
        socket.emit('chat:error', 'Failed to send message');
      }
    });

    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${user.email}`);
    });
  });
}
