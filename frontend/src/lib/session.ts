export type AuthSessionPayload = {
  accessToken: string;
  role: 'ADMIN' | 'CLIENT';
  companyId: string | null;
};

const KEYS = {
  token: 'syncho_access_token',
  role: 'syncho_role',
  companyId: 'syncho_company_id'
};

export const saveSession = (session: AuthSessionPayload) => {
  localStorage.setItem(KEYS.token, session.accessToken);
  localStorage.setItem(KEYS.role, session.role);

  if (session.companyId) {
    localStorage.setItem(KEYS.companyId, session.companyId);
  } else {
    localStorage.removeItem(KEYS.companyId);
  }
};

export const clearSession = () => {
  localStorage.removeItem(KEYS.token);
  localStorage.removeItem(KEYS.role);
  localStorage.removeItem(KEYS.companyId);
};

export const getAccessToken = () => localStorage.getItem(KEYS.token) || '';
export const getRole = () => (localStorage.getItem(KEYS.role) || '').toUpperCase();
export const getCompanyId = () => localStorage.getItem(KEYS.companyId) || '';

export const getBackendOrigin = () =>
  (import.meta.env.VITE_API_URL as string | undefined)?.trim() || window.location.origin;

export const redirectByRole = (role: string) => {
  void role;
  window.location.href = '/dashboard';
};
