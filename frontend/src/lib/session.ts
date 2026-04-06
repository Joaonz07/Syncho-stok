export type AuthSessionPayload = {
  accessToken: string;
  role: 'ADMIN' | 'DEV' | 'CLIENT';
  companyId: string | null;
};

const KEYS = {
  token: 'syncho_access_token',
  role: 'syncho_role',
  companyId: 'syncho_company_id'
};

const getStorages = () => {
  if (typeof window === 'undefined') {
    return null;
  }

  return {
    local: window.localStorage,
    session: window.sessionStorage
  };
};

const getStorageValue = (key: string) => {
  const storages = getStorages();

  if (!storages) {
    return '';
  }

  return storages.local.getItem(key) || storages.session.getItem(key) || '';
};

export const saveSession = (session: AuthSessionPayload, persist = true) => {
  const storages = getStorages();

  if (!storages) {
    return;
  }

  const target = persist ? storages.local : storages.session;
  const other = persist ? storages.session : storages.local;

  target.setItem(KEYS.token, session.accessToken);
  target.setItem(KEYS.role, session.role);
  other.removeItem(KEYS.token);
  other.removeItem(KEYS.role);

  if (session.companyId) {
    target.setItem(KEYS.companyId, session.companyId);
    other.removeItem(KEYS.companyId);
  } else {
    target.removeItem(KEYS.companyId);
    other.removeItem(KEYS.companyId);
  }
};

export const clearSession = () => {
  const storages = getStorages();

  if (!storages) {
    return;
  }

  storages.local.removeItem(KEYS.token);
  storages.local.removeItem(KEYS.role);
  storages.local.removeItem(KEYS.companyId);
  storages.session.removeItem(KEYS.token);
  storages.session.removeItem(KEYS.role);
  storages.session.removeItem(KEYS.companyId);
};

export const getAccessToken = () => getStorageValue(KEYS.token);
export const getRole = () => getStorageValue(KEYS.role).toUpperCase();
export const getCompanyId = () => getStorageValue(KEYS.companyId);

export const getBackendOrigin = () =>
  (import.meta.env.VITE_API_URL as string | undefined)?.trim() || window.location.origin;

export const redirectByRole = (role: string) => {
  void role;
  window.location.href = '/dashboard';
};
