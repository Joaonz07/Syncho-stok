const parseList = (value: string | undefined) =>
  String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

export const getPort = () => {
  const parsedPort = Number(process.env.PORT || 5000);

  if (!Number.isFinite(parsedPort) || parsedPort <= 0) {
    return 5000;
  }

  return parsedPort;
};

export const getAllowedOrigins = () => parseList(process.env.FRONTEND_URL);

export const shouldServeFrontend = () => {
  const value = String(process.env.SERVE_STATIC_FRONTEND || '').trim().toLowerCase();
  // Se explicitamente false, não servir
  if (value === 'false') return false;
  // Padrão: servir frontend em produção (Railway serve tudo junto no Dockerfile)
  return true;
};

export const getWhatsAppApiConfig = () => ({
  apiVersion: String(process.env.WHATSAPP_API_VERSION || 'v20.0').trim(),
  accessToken: String(process.env.WHATSAPP_ACCESS_TOKEN || '').trim(),
  phoneNumberId: String(process.env.WHATSAPP_PHONE_NUMBER_ID || '').trim()
});

export const getIntegrationWebhookSecret = () =>
  String(process.env.INTEGRATION_WEBHOOK_SECRET || '').trim();