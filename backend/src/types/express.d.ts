import type { AuthUser, IntegrationApiAuth } from './auth';

declare global {
  namespace Express {
    interface Request {
      requestId?: string;
      authUser?: AuthUser;
      integrationAuth?: IntegrationApiAuth;
      targetCompanyId?: string;
    }
  }
}

export {};
