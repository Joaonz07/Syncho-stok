import type { Server as HttpServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import { getAllowedOrigins } from '../config/runtime';
import { supabaseAdmin } from '../supabaseClient';
import { ensureUserHasCompany, normalizeUserRole } from '../services/saasService';

type ConnectedUser = {
  id: string;
  email: string;
  role: 'ADMIN' | 'CLIENT';
  companyId: string | null;
  name: string;
};

type SupportChatMessage = {
  id: string;
  companyId: string;
  requestId: string | null;
  senderId: string;
  senderName: string;
  senderRole: 'ADMIN' | 'CLIENT';
  content: string;
  createdAt: string;
};

type IntegrationProvider = 'WHATSAPP';

type IntegrationChatMessage = {
  id: string;
  companyId: string;
  provider: IntegrationProvider;
  conversationId: string;
  userId: string;
  userName: string;
  content: string;
  senderRole: 'ADMIN' | 'CLIENT';
  createdAt: string;
};

const supportMessageTables = ['messages', 'Message'];
const companyFieldAliases = ['company_id', 'companyId', 'companyID'];

let ioInstance: SocketServer | null = null;
const presenceByCompany = new Map<string, { admins: Set<string>; clients: Set<string> }>();

const roomName = (companyId: string) => `support:${companyId}`;
const integrationRoomName = (provider: IntegrationProvider, companyId: string) =>
  `integration:${provider}:${companyId}`;
const supportRequestTagRegex = /^\[REQ:([^\]]+)\]\s*/;

const encodeSupportMessageContent = (requestId: string | null, content: string) => {
  if (!requestId) {
    return content;
  }

  return `[REQ:${requestId}] ${content}`;
};

const decodeSupportMessageContent = (rawContent: string) => {
  const normalized = String(rawContent || '');
  const match = normalized.match(supportRequestTagRegex);

  if (!match) {
    return { requestId: null as string | null, content: normalized };
  }

  return {
    requestId: String(match[1] || '').trim() || null,
    content: normalized.replace(supportRequestTagRegex, '').trim()
  };
};

const ensurePresenceBucket = (companyId: string) => {
  if (!presenceByCompany.has(companyId)) {
    presenceByCompany.set(companyId, { admins: new Set<string>(), clients: new Set<string>() });
  }

  return presenceByCompany.get(companyId)!;
};

const removeSocketFromAllPresence = (socketId: string) => {
  for (const [companyId, bucket] of presenceByCompany.entries()) {
    bucket.admins.delete(socketId);
    bucket.clients.delete(socketId);

    if (bucket.admins.size === 0 && bucket.clients.size === 0) {
      presenceByCompany.delete(companyId);
    }
  }
};

const emitPresence = (companyId: string) => {
  if (!ioInstance) {
    return;
  }

  const bucket = ensurePresenceBucket(companyId);

  ioInstance.to(roomName(companyId)).emit('support:presence', {
    companyId,
    adminOnline: bucket.admins.size > 0,
    clientOnline: bucket.clients.size > 0,
    adminCount: bucket.admins.size,
    clientCount: bucket.clients.size
  });
};

const insertSupportMessage = async (params: {
  companyId: string;
  senderId: string;
  requestId: string | null;
  content: string;
}): Promise<{ id: string; createdAt: string; requestId: string | null; content: string } | null> => {
  const encodedContent = encodeSupportMessageContent(params.requestId, params.content);
  const payloads: Array<Record<string, unknown>> = [
    {
      company_id: params.companyId,
      sender_id: params.senderId,
      content: encodedContent
    },
    {
      companyId: params.companyId,
      senderId: params.senderId,
      content: encodedContent
    }
  ];

  for (const tableName of supportMessageTables) {
    for (const payload of payloads) {
      const inserted = await supabaseAdmin.from(tableName).insert(payload).select('*').single();

      if (!inserted.error && inserted.data) {
        const row = inserted.data as Record<string, unknown>;
        const decoded = decodeSupportMessageContent(String(row.content || ''));
        return {
          id: String(row.id || ''),
          createdAt: String(row.created_at || row.createdAt || new Date().toISOString()),
          requestId: decoded.requestId,
          content: decoded.content
        };
      }
    }
  }

  return null;
};

export const emitSupportMessage = (message: SupportChatMessage) => {
  if (!ioInstance) {
    return;
  }

  ioInstance.to(roomName(message.companyId)).emit('support:new-message', message);
};

export const emitIntegrationMessage = (message: IntegrationChatMessage) => {
  if (!ioInstance) {
    return;
  }

  ioInstance
    .to(integrationRoomName(message.provider, message.companyId))
    .emit('integration:new-message', message);
};

const resolveCompanyForSocket = (user: ConnectedUser, payloadCompanyId: unknown) => {
  if (user.role === 'ADMIN') {
    return String(payloadCompanyId || '').trim() || null;
  }

  return user.companyId;
};

const asConnectedUser = async (token: string): Promise<ConnectedUser | null> => {
  const authResult = await supabaseAdmin.auth.getUser(token);

  if (authResult.error || !authResult.data.user) {
    return null;
  }

  const ensured = await ensureUserHasCompany({
    authUser: authResult.data.user,
    fallbackRole: authResult.data.user.app_metadata?.role || authResult.data.user.user_metadata?.role,
    fallbackCompanyId:
      String(
        authResult.data.user.app_metadata?.company_id ||
          authResult.data.user.user_metadata?.company_id ||
          ''
      ).trim() || null,
    fallbackCompanyName: String(authResult.data.user.user_metadata?.company_name || '').trim() || null,
    fallbackUserName: String(authResult.data.user.user_metadata?.name || '').trim() || null
  });

  if (ensured.error) {
    return null;
  }

  const email = String(authResult.data.user.email || '').trim().toLowerCase();
  const name =
    String(authResult.data.user.user_metadata?.name || '').trim() || email.split('@')[0] || 'Usuario';

  return {
    id: authResult.data.user.id,
    email,
    role: normalizeUserRole(ensured.role || 'CLIENT'),
    companyId: ensured.companyId || null,
    name
  };
};

export const initSocketGateway = (httpServer: HttpServer) => {
  const allowedOrigins = getAllowedOrigins();
  const io = new SocketServer(httpServer, {
    cors: {
      origin: allowedOrigins.length > 0 ? allowedOrigins : true
    }
  });

  io.use(async (socket, next) => {
    const token = String(socket.handshake.auth?.token || '').trim();

    if (!token) {
      next(new Error('Token nao informado no socket.'));
      return;
    }

    const connectedUser = await asConnectedUser(token);

    if (!connectedUser) {
      next(new Error('Nao foi possivel autenticar no socket.'));
      return;
    }

    socket.data.user = connectedUser;
    socket.data.joinedCompanies = new Set<string>();
    next();
  });

  io.on('connection', (socket) => {
    const user = socket.data.user as ConnectedUser;

    socket.on('support:join', (payload: { companyId?: string }) => {
      const companyId = resolveCompanyForSocket(user, payload?.companyId);

      if (!companyId) {
        socket.emit('support:error', { message: 'Empresa nao informada para entrar no chat.' });
        return;
      }

      socket.join(roomName(companyId));
      const joinedCompanies = socket.data.joinedCompanies as Set<string>;
      joinedCompanies.add(companyId);

      const bucket = ensurePresenceBucket(companyId);

      if (user.role === 'ADMIN') {
        bucket.admins.add(socket.id);
      } else {
        bucket.clients.add(socket.id);
      }

      emitPresence(companyId);
    });

    socket.on('support:typing', (payload: { companyId?: string; requestId?: string; isTyping?: boolean }) => {
      const companyId = resolveCompanyForSocket(user, payload?.companyId);
      const requestId = String(payload?.requestId || '').trim() || null;

      if (!companyId) {
        return;
      }

      socket.to(roomName(companyId)).emit('support:typing', {
        companyId,
        requestId,
        userId: user.id,
        userName: user.name,
        userRole: user.role,
        isTyping: Boolean(payload?.isTyping)
      });
    });

    socket.on('integration:join', (payload: { companyId?: string; provider?: string }) => {
      const companyId = resolveCompanyForSocket(user, payload?.companyId);
      const providerRaw = String(payload?.provider || '').trim().toUpperCase();

      if (!companyId) {
        socket.emit('integration:error', {
          message: 'Empresa nao informada para entrar no chat de integracao.'
        });
        return;
      }

      if (providerRaw !== 'WHATSAPP') {
        socket.emit('integration:error', { message: 'Provider invalido para chat de integracao.' });
        return;
      }

      socket.join(integrationRoomName(providerRaw as IntegrationProvider, companyId));
    });

    socket.on('support:send-message', async (payload: { companyId?: string; requestId?: string; content?: string }) => {
      const companyId = resolveCompanyForSocket(user, payload?.companyId);
      const requestId = String(payload?.requestId || '').trim() || null;
      const content = String(payload?.content || '').trim();

      if (!companyId) {
        socket.emit('support:error', { message: 'Empresa nao informada para enviar mensagem.' });
        return;
      }

      if (!content) {
        socket.emit('support:error', { message: 'Mensagem vazia nao pode ser enviada.' });
        return;
      }

      if (!requestId) {
        socket.emit('support:error', { message: 'requestId e obrigatorio para enviar mensagem no chat.' });
        return;
      }

      const reqCheckResult = await supabaseAdmin
        .from('support_requests')
        .select('status')
        .eq('id', requestId)
        .maybeSingle();

      if (!reqCheckResult.error && reqCheckResult.data) {
        const reqStatus = String((reqCheckResult.data as Record<string, unknown>).status || '').toUpperCase();

        if (reqStatus === 'DONE') {
          socket.emit('support:error', { message: 'Este chamado ja foi finalizado. Abra um novo chamado para continuar.' });
          return;
        }
      }

      const inserted = await insertSupportMessage({
        companyId,
        senderId: user.id,
        requestId,
        content
      });

      if (!inserted) {
        socket.emit('support:error', { message: 'Falha ao salvar mensagem de suporte.' });
        return;
      }

      emitSupportMessage({
        id: inserted.id,
        companyId,
        requestId: inserted.requestId,
        senderId: user.id,
        senderName: user.name,
        senderRole: user.role,
        content: inserted.content,
        createdAt: inserted.createdAt
      });

      socket.to(roomName(companyId)).emit('support:typing', {
        companyId,
        requestId,
        userId: user.id,
        userName: user.name,
        userRole: user.role,
        isTyping: false
      });
    });

    socket.on('disconnect', () => {
      const joinedCompanies = socket.data.joinedCompanies as Set<string>;

      for (const companyId of joinedCompanies.values()) {
        const bucket = ensurePresenceBucket(companyId);
        bucket.admins.delete(socket.id);
        bucket.clients.delete(socket.id);
        emitPresence(companyId);
      }

      removeSocketFromAllPresence(socket.id);
    });
  });

  ioInstance = io;
  return io;
};
