type SecurityLogLevel = 'INFO' | 'WARN' | 'ERROR';

type SecurityLogPayload = {
  event: string;
  level?: SecurityLogLevel;
  requestId?: string;
  userId?: string | null;
  companyId?: string | null;
  ip?: string | null;
  path?: string | null;
  method?: string | null;
  statusCode?: number;
  details?: Record<string, unknown>;
};

const scrubSecrets = (value: unknown): unknown => {
  if (!value || typeof value !== 'object') {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(scrubSecrets);
  }

  const input = value as Record<string, unknown>;
  const output: Record<string, unknown> = {};

  for (const [key, currentValue] of Object.entries(input)) {
    const lowerKey = key.toLowerCase();

    if (
      lowerKey.includes('token') ||
      lowerKey.includes('password') ||
      lowerKey.includes('secret') ||
      lowerKey.includes('apikey') ||
      lowerKey.includes('authorization')
    ) {
      output[key] = '[REDACTED]';
      continue;
    }

    output[key] = scrubSecrets(currentValue);
  }

  return output;
};

export const logSecurityEvent = (payload: SecurityLogPayload) => {
  const level = payload.level || 'INFO';
  const record = {
    timestamp: new Date().toISOString(),
    level,
    event: payload.event,
    requestId: payload.requestId || null,
    userId: payload.userId || null,
    companyId: payload.companyId || null,
    ip: payload.ip || null,
    method: payload.method || null,
    path: payload.path || null,
    statusCode: payload.statusCode || null,
    details: scrubSecrets(payload.details || {})
  };

  const serialized = JSON.stringify(record);

  if (level === 'ERROR') {
    console.error(serialized);
    return;
  }

  if (level === 'WARN') {
    console.warn(serialized);
    return;
  }

  console.log(serialized);
};
