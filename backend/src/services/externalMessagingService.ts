import { getWhatsAppApiConfig } from '../config/runtime';

type SendOptions = {
  accessToken?: string | null;
  accountId?: string | null;
};

const toSafeError = (error: unknown) => {
  if (error instanceof Error) {
    return error.message;
  }

  return 'Falha desconhecida ao enviar mensagem externa.';
};

const parseResponseBody = async (response: Response) => {
  try {
    return (await response.json()) as Record<string, unknown>;
  } catch (_error) {
    return {} as Record<string, unknown>;
  }
};

const getApiErrorMessage = (body: Record<string, unknown>, fallback: string) => {
  const errorObject = body.error as { message?: unknown } | undefined;
  const errorMessage = String(errorObject?.message || '').trim();

  if (errorMessage) {
    return errorMessage;
  }

  return fallback;
};

export const sendWhatsAppMessage = async (
  toPhone: string,
  text: string,
  options?: SendOptions
) => {
  const defaultConfig = getWhatsAppApiConfig();
  const accessToken = String(options?.accessToken || defaultConfig.accessToken || '').trim();
  const phoneNumberId = String(options?.accountId || defaultConfig.phoneNumberId || '').trim();
  const apiVersion = String(defaultConfig.apiVersion || 'v20.0').trim();

  if (!accessToken) {
    throw new Error('Token do WhatsApp nao configurado.');
  }

  if (!phoneNumberId) {
    throw new Error('Phone Number ID do WhatsApp nao configurado.');
  }

  const endpoint = `https://graph.facebook.com/${apiVersion}/${encodeURIComponent(phoneNumberId)}/messages`;
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: toPhone,
      type: 'text',
      text: { body: text }
    })
  });

  const body = await parseResponseBody(response);

  if (!response.ok) {
    throw new Error(getApiErrorMessage(body, 'Falha ao enviar mensagem via WhatsApp Cloud API.'));
  }

  return body;
};

export const sendMessageByProvider = async (params: {
  provider: 'WHATSAPP';
  recipientId: string;
  content: string;
  accessToken?: string | null;
  accountId?: string | null;
}) => {
  try {
    return await sendWhatsAppMessage(params.recipientId, params.content, {
      accessToken: params.accessToken,
      accountId: params.accountId
    });
  } catch (error) {
    throw new Error(toSafeError(error));
  }
};
