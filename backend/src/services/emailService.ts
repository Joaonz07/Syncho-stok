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

const getTransporter = (host: string, port: number, user: string, pass: string) => {
  console.info('[support-email] configurando transporte', {
    host,
    port,
    user: user.substring(0, 5) + '***',
    secure: port === 465,
    requireTLS: port !== 465
  });

  const transportOptions: SMTPTransport.Options = {
    host,
    port,
    secure: port === 465,
    requireTLS: port !== 465,
    auth: { user, pass },
    tls: {
      rejectUnauthorized: false,
      servername: process.env.SMTP_HOST || host
    },
    connectionTimeout: 30000, // 30s
    greetingTimeout: 30000, // 30s
    socketTimeout: 45000, // 45s
    logger: true,
    debug: true
  };

  return nodemailer.createTransport(transportOptions);
};

export const sendSupportRequestNotification = async (payload: SupportEmailPayload) => {
  const host = String(process.env.SMTP_HOST || '').trim();
  let port = Number(process.env.SMTP_PORT || 587);
  const user = String(process.env.SMTP_USER || '').trim();
  const pass = String(process.env.SMTP_PASS || '').trim();

  if (!host || !user || !pass) {
    console.warn('[support-email] SMTP nao configurado; notificacao por e-mail ignorada.', {
      hostConfigured: !!host,
      userConfigured: !!user,
      passConfigured: !!pass
    });
    return;
  }

  console.info('[support-email] iniciando envio', {
    requestId: payload.requestId,
    host,
    port
  });

  const transporter = getTransporter(host, port, user, pass);

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

  try {
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

    console.info('[support-email] ✅ envio processado com sucesso', {
      requestId: payload.requestId,
      to: notifyEmail,
      accepted: result.accepted,
      messageId: result.messageId
    });
  } catch (error: any) {
    console.error('[support-email] ❌ falha ao enviar', {
      requestId: payload.requestId,
      erro: error?.message,
      code: error?.code,
      command: error?.command,
      responseCode: error?.responseCode
    });
    
    throw error;
  }
};
