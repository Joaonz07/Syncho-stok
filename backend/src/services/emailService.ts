import dns from 'node:dns';
import nodemailer from 'nodemailer';
import SMTPTransport from 'nodemailer/lib/smtp-transport';

dns.setDefaultResultOrder('ipv4first');

type SupportEmailPayload = {
  requestId: string;
  companyId: string;
  requesterName: string;
  requesterEmail: string;
  subject: string;
  message: string;
};

// Cache de resoluções DNS para evitar múltiplas buscas
const dnsCache = new Map<string, { ip: string; timestamp: number }>();
const DNS_CACHE_TTL = 5 * 60 * 1000; // 5 minutos

const resolveHostToIPv4 = async (host: string): Promise<string> => {
  const cached = dnsCache.get(host);
  if (cached && Date.now() - cached.timestamp < DNS_CACHE_TTL) {
    return cached.ip;
  }

  try {
    const addresses = await dns.promises.resolve4(host);
    if (addresses.length === 0) {
      console.warn(`[support-email] nenhum endereco IPv4 resolvido para ${host}`);
      return host;
    }
    
    const ip = addresses[0];
    dnsCache.set(host, { ip, timestamp: Date.now() });
    console.debug(`[support-email] resolvido ${host} -> ${ip}`);
    return ip;
  } catch (error) {
    console.warn(`[support-email] erro ao resolver IPv4 de ${host}:`, error);
    return host;
  }
};

const getTransporter = (host: string, port: number, user: string, pass: string) => {
  const transportOptions: SMTPTransport.Options = {
    host,
    port,
    secure: port === 465,
    requireTLS: port !== 465,
    name: 'syncho.cloud',
    auth: { user, pass },
    tls: {
      servername: process.env.SMTP_HOST || host
    },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000
  };

  return nodemailer.createTransport(transportOptions);
};

export const sendSupportRequestNotification = async (payload: SupportEmailPayload) => {
  const host = String(process.env.SMTP_HOST || '').trim();
  const port = Number(process.env.SMTP_PORT || 587);
  const user = String(process.env.SMTP_USER || '').trim();
  const pass = String(process.env.SMTP_PASS || '').trim();

  if (!host || !port || !user || !pass) {
    console.warn('[support-email] SMTP nao configurado; notificacao por e-mail ignorada.');
    return;
  }

  // Resolve host para IPv4 explicitamente
  const ipv4Host = await resolveHostToIPv4(host);
  const transporter = getTransporter(ipv4Host, port, user, pass);

  const notifyEmail = String(process.env.SUPPORT_NOTIFY_EMAIL || 'contato@syncho.cloud').trim();
  const fromEmail = String(process.env.SMTP_FROM || process.env.SMTP_USER || '').trim();
  const fromName = String(process.env.SMTP_FROM_NAME || 'Syncho Cloud').trim() || 'Syncho Cloud';

  if (!notifyEmail) {
    console.warn('[support-email] SUPPORT_NOTIFY_EMAIL nao configurado; notificacao ignorada.');
    return;
  }

  const html = `
    <h2>Novo chamado de suporte</h2>
    <p><strong>ID:</strong> ${payload.requestId}</p>
    <p><strong>Empresa:</strong> ${payload.companyId}</p>
    <p><strong>Solicitante:</strong> ${payload.requesterName} (${payload.requesterEmail})</p>
    <p><strong>Assunto:</strong> ${payload.subject}</p>
    <p><strong>Mensagem:</strong></p>
    <p>${payload.message.replace(/\n/g, '<br/>')}</p>
  `;

  const result = await transporter.sendMail({
    from: `${fromName} <${fromEmail}>`,
    to: notifyEmail,
    replyTo: payload.requesterEmail,
    subject: `[Syncho Stok] Novo suporte: ${payload.subject}`,
    text: [
      'Novo chamado de suporte',
      `ID: ${payload.requestId}`,
      `Empresa: ${payload.companyId}`,
      `Solicitante: ${payload.requesterName} (${payload.requesterEmail})`,
      `Assunto: ${payload.subject}`,
      '',
      payload.message
    ].join('\n'),
    html
  });

  console.info('[support-email] envio processado', {
    requestId: payload.requestId,
    to: notifyEmail,
    accepted: result.accepted,
    rejected: result.rejected,
    response: result.response,
    messageId: result.messageId
  });

  if ((!result.accepted || result.accepted.length === 0) && result.rejected && result.rejected.length > 0) {
    throw new Error(`Destino rejeitado pelo provedor SMTP: ${result.rejected.join(', ')}`);
  }
};
