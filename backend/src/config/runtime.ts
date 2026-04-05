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

export const shouldServeFrontend = () => String(process.env.SERVE_STATIC_FRONTEND || '').trim() === 'true';