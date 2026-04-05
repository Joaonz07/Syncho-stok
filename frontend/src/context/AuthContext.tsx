import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { apiFetch as fetch } from '../lib/api';
import { clearSession, getAccessToken, getCompanyId, getRole, saveSession } from '../lib/session';

type LoginResult = {
  success: boolean;
  message?: string;
  role?: 'ADMIN' | 'CLIENT';
};

type AuthContextValue = {
  loading: boolean;
  role: 'ADMIN' | 'CLIENT' | null;
  companyId: string | null;
  isAuthenticated: boolean;
  signIn: (email: string, password: string) => Promise<LoginResult>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const normalizeRole = (value: unknown): 'ADMIN' | 'CLIENT' =>
  String(value || 'CLIENT').toUpperCase() === 'ADMIN' ? 'ADMIN' : 'CLIENT';

const safeParseJson = async (response: Response) => {
  try {
    return await response.json();
  } catch (_error) {
    return null;
  }
};

const getProfileFromApi = async (accessToken: string) => {
  const response = await fetch('/api/dashboard/me', {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });

  if (!response.ok) {
    return { role: 'CLIENT' as const, companyId: null as string | null };
  }

  const result = await response.json();
  const user = result?.user || {};

  return {
    role: normalizeRole(user.role),
    companyId: (String(user.companyId || '').trim() || null) as string | null
  };
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [loading, setLoading] = useState(true);
  const [accessToken, setAccessToken] = useState('');
  const [role, setRole] = useState<'ADMIN' | 'CLIENT' | null>(null);
  const [companyId, setCompanyId] = useState<string | null>(null);

  const syncSessionState = async (token: string) => {
    const normalizedToken = String(token || '').trim();

    if (!normalizedToken) {
      setAccessToken('');
      clearSession();
      setRole(null);
      setCompanyId(null);
      return;
    }

    const profile = await getProfileFromApi(normalizedToken);
    setAccessToken(normalizedToken);
    setRole(profile.role);
    setCompanyId(profile.companyId);

    saveSession({
      accessToken: normalizedToken,
      role: profile.role,
      companyId: profile.companyId
    });
  };

  useEffect(() => {
    const init = async () => {
      const storedToken = getAccessToken();

      if (!storedToken) {
        clearSession();
        setAccessToken('');
        setRole(null);
        setCompanyId(null);
        setLoading(false);
        return;
      }

      try {
        await syncSessionState(storedToken);
      } catch (_error) {
        clearSession();
        setAccessToken('');
        setRole(null);
        setCompanyId(null);
      } finally {
        setLoading(false);
      }
    };

    void init();
  }, []);

  const signIn = async (email: string, password: string): Promise<LoginResult> => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password })
      });

      const result = await safeParseJson(response);

      if (!response.ok) {
        return {
          success: false,
          message: result?.message || 'Falha no login.'
        };
      }

      const nextAccessToken = String(result?.session?.access_token || '').trim();

      if (!nextAccessToken) {
        return {
          success: false,
          message: 'Sessao invalida retornada pelo servidor.'
        };
      }

      const resolvedRole = normalizeRole(result?.role || getRole());
      const resolvedCompanyId = String(result?.companyId || getCompanyId() || '').trim() || null;

      setAccessToken(nextAccessToken);
      setRole(resolvedRole);
      setCompanyId(resolvedCompanyId);

      saveSession({
        accessToken: nextAccessToken,
        role: resolvedRole,
        companyId: resolvedCompanyId
      });

      return {
        success: true,
        role: resolvedRole
      };
    } catch (_error) {
      return {
        success: false,
        message: 'Erro de rede ao fazer login.'
      };
    }
  };

  const signOut = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (_error) {
      // ignora erro de rede no logout e limpa sessao local mesmo assim
    }

    clearSession();
    setAccessToken('');
    setRole(null);
    setCompanyId(null);
  };

  const value = useMemo<AuthContextValue>(
    () => ({
      loading,
      role,
      companyId,
      isAuthenticated: Boolean(accessToken),
      signIn,
      signOut
    }),
    [loading, accessToken, role, companyId]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth deve ser usado dentro de AuthProvider.');
  }

  return context;
};
