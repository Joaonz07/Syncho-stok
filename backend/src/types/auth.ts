export type UserRole = 'ADMIN' | 'DEV' | 'CLIENT';

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  companyId: string | null;
}

export interface IntegrationApiAuth {
  companyId: string;
  apiKey: string;
}
