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

const getTransporter = () => {
  const host = String(process.env.SMTP_HOST || '').trim();
  const port = Number(process.env.SMTP_PORT || 587);
  const user = String(process.env.SMTP_USER || '').trim();
  const pass = String(process.env.SMTP_PASS || '').trim();

  if (!host || !port || !user || !pass) {
    return null;
  }

  const transportOptions: SMTPTransport.Options = {
    host,
    port,
    secure: port === 465,
    requireTLS: port !== 465,
    name: 'syncho.cloud',
    auth: { user, pass },
    tls: {
      servername: host
    },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000
  };

  return nodemailer.createTransport(transportOptions);
};

export const sendSupportRequestNotification = async (payload: SupportEmailPayload) => {
  const transporter = getTransporter();

  if (!transporter) {
    console.warn('[support-email] SMTP nao configurado; notificacao por e-mail ignorada.');
    return;
  }

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
