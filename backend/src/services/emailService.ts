import nodemailer from 'nodemailer';

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

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass }
  });
};

export const sendSupportRequestNotification = async (payload: SupportEmailPayload) => {
  const transporter = getTransporter();

  if (!transporter) {
    console.warn('[support-email] SMTP nao configurado; notificacao por e-mail ignorada.');
    return;
  }

  const notifyEmail = String(process.env.SUPPORT_NOTIFY_EMAIL || process.env.SMTP_USER || '').trim();
  const fromEmail = String(process.env.SMTP_FROM || process.env.SMTP_USER || '').trim();

  const html = `
    <h2>Novo chamado de suporte</h2>
    <p><strong>ID:</strong> ${payload.requestId}</p>
    <p><strong>Empresa:</strong> ${payload.companyId}</p>
    <p><strong>Solicitante:</strong> ${payload.requesterName} (${payload.requesterEmail})</p>
    <p><strong>Assunto:</strong> ${payload.subject}</p>
    <p><strong>Mensagem:</strong></p>
    <p>${payload.message.replace(/\n/g, '<br/>')}</p>
  `;

  await transporter.sendMail({
    from: fromEmail,
    to: notifyEmail,
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
};
