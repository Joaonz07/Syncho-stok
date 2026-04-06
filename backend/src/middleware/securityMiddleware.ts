import { randomUUID } from 'crypto';
import type { NextFunction, Request, Response } from 'express';
import { logSecurityEvent } from '../services/securityLogger';

type RateLimitOptions = {
  keyPrefix: string;
  maxRequests: number;
  windowMs: number;
  message?: string;
};

const memoryBuckets = new Map<string, { count: number; resetAt: number }>();
const suspiciousPattern =
  /(\bunion\b\s+\bselect\b|<script|javascript:|%3cscript|\bor\b\s+1=1|\bdrop\b\s+\btable\b|--|\/\*|\*\/)/i;

const getClientIp = (req: Request) => {
  const forwarded = String(req.headers['x-forwarded-for'] || '').split(',')[0]?.trim();
  return forwarded || req.ip || null;
};

const sanitizeText = (value: string) =>
  value
    .replace(/<script.*?>.*?<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/[<>]/g, '')
    .trim();

const sanitizeUnknown = (value: unknown): unknown => {
  if (typeof value === 'string') {
    return sanitizeText(value);
  }

  if (Array.isArray(value)) {
    return value.map(sanitizeUnknown);
  }

  if (value && typeof value === 'object') {
    const input = value as Record<string, unknown>;
    const output: Record<string, unknown> = {};

    for (const [key, current] of Object.entries(input)) {
      output[key] = sanitizeUnknown(current);
    }

    return output;
  }

  return value;
};

const containsSuspiciousContent = (value: unknown): boolean => {
  if (!value) {
    return false;
  }

  if (typeof value === 'string') {
    return suspiciousPattern.test(value);
  }

  if (Array.isArray(value)) {
    return value.some((item) => containsSuspiciousContent(item));
  }

  if (typeof value === 'object') {
    return Object.values(value as Record<string, unknown>).some((item) => containsSuspiciousContent(item));
  }

  return false;
};

export const attachRequestId = (req: Request, res: Response, next: NextFunction) => {
  const incomingRequestId = String(req.headers['x-request-id'] || '').trim();
  req.requestId = incomingRequestId || randomUUID();
  res.setHeader('X-Request-Id', req.requestId);
  next();
};

export const sanitizeInput = (req: Request, _res: Response, next: NextFunction) => {
  req.body = sanitizeUnknown(req.body) as Request['body'];
  req.query = sanitizeUnknown(req.query) as Request['query'];
  req.params = sanitizeUnknown(req.params) as Request['params'];
  next();
};

export const blockSuspiciousRequests = (req: Request, res: Response, next: NextFunction) => {
  const ip = getClientIp(req);
  const bodyTooLarge = Number(req.headers['content-length'] || 0) > 60_000;
  const suspiciousUrl = suspiciousPattern.test(req.originalUrl || '');
  const suspiciousBody = containsSuspiciousContent(req.body);
  const suspiciousQuery = containsSuspiciousContent(req.query);
  const suspiciousUserAgent = suspiciousPattern.test(String(req.headers['user-agent'] || ''));

  if (bodyTooLarge || suspiciousUrl || suspiciousBody || suspiciousQuery || suspiciousUserAgent) {
    logSecurityEvent({
      level: 'WARN',
      event: 'suspicious_request_blocked',
      requestId: req.requestId,
      ip,
      method: req.method,
      path: req.originalUrl,
      statusCode: 403,
      details: {
        bodyTooLarge,
        suspiciousUrl,
        suspiciousBody,
        suspiciousQuery,
        suspiciousUserAgent
      }
    });

    return res.status(403).json({ message: 'Requisicao bloqueada por politica de seguranca.' });
  }

  return next();
};

export const requestAuditLogger = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();

  res.on('finish', () => {
    const durationMs = Date.now() - start;
    const ip = getClientIp(req);

    logSecurityEvent({
      event: 'api_request',
      requestId: req.requestId,
      ip,
      userId: req.authUser?.id || null,
      companyId: req.authUser?.companyId || req.integrationAuth?.companyId || null,
      method: req.method,
      path: req.originalUrl,
      statusCode: res.statusCode,
      details: {
        durationMs,
        userAgent: String(req.headers['user-agent'] || '')
      }
    });
  });

  next();
};

export const createRateLimit = (options: RateLimitOptions) => {
  const message = options.message || 'Limite de requisicoes excedido. Tente novamente em instantes.';

  return (req: Request, res: Response, next: NextFunction) => {
    const now = Date.now();
    const ip = getClientIp(req) || 'unknown';
    const key = `${options.keyPrefix}:${ip}`;
    const bucket = memoryBuckets.get(key);

    if (!bucket || bucket.resetAt <= now) {
      memoryBuckets.set(key, { count: 1, resetAt: now + options.windowMs });
      res.setHeader('X-RateLimit-Limit', String(options.maxRequests));
      res.setHeader('X-RateLimit-Remaining', String(options.maxRequests - 1));
      return next();
    }

    if (bucket.count >= options.maxRequests) {
      const retryAfterSeconds = Math.ceil((bucket.resetAt - now) / 1000);
      res.setHeader('Retry-After', String(retryAfterSeconds));

      logSecurityEvent({
        level: 'WARN',
        event: 'rate_limit_blocked',
        requestId: req.requestId,
        ip,
        method: req.method,
        path: req.originalUrl,
        statusCode: 429,
        details: {
          keyPrefix: options.keyPrefix,
          maxRequests: options.maxRequests,
          windowMs: options.windowMs
        }
      });

      return res.status(429).json({ message });
    }

    bucket.count += 1;
    res.setHeader('X-RateLimit-Limit', String(options.maxRequests));
    res.setHeader('X-RateLimit-Remaining', String(Math.max(options.maxRequests - bucket.count, 0)));
    return next();
  };
};
