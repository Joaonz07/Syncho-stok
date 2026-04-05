import type { AuthUser, IntegrationApiAuth } from './auth';

declare global {
  namespace Express {
    interface Request {
      authUser?: AuthUser;
      integrationAuth?: IntegrationApiAuth;
    }
  }
}

export {};
