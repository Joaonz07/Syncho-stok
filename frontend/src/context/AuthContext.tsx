import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { authService, type AuthUser, type TenantRole } from '../services/authService';
import type { Empresa } from '../services/empresaService';
import { clearSession, getAccessToken, saveSession } from '../lib/session';

type LegacyRole = 'ADMIN' | 'DEV' | 'CLIENT';

type LoginResult = {
  success: boolean;
  message?: string;
  role?: LegacyRole;
};

type RegisterEmpresaPayload = {
  empresaNome: string;
  empresaEmail: string;
  usuarioNome: string;
  email: string;
  senha: string;
  remember?: boolean;
};

type AuthContextValue = {
  loading: boolean;
  isAuthenticated: boolean;
  user: AuthUser | null;
  empresa: Empresa | null;
  role: LegacyRole | null;
  companyId: string | null;
  login: (email: string, senha: string, options?: { remember?: boolean }) => Promise<LoginResult>;
  logout: () => Promise<void>;
  registerEmpresa: (payload: RegisterEmpresaPayload) => Promise<LoginResult>;
  signIn: (email: string, password: string, options?: { remember?: boolean }) => Promise<LoginResult>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const toLegacyRole = (role: TenantRole): LegacyRole => {
  return role === 'admin' ? 'ADMIN' : 'CLIENT';
};

const toTenantRole = (value: unknown): TenantRole => {
  const normalized = String(value || '').toLowerCase();

  if (normalized === 'admin' || normalized === 'dev') {
    return 'admin';
  }

  return 'funcionario';
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [loading, setLoading] = useState(true);
  const [accessToken, setAccessToken] = useState('');
  const [user, setUser] = useState<AuthUser | null>(null);
  const [empresa, setEmpresa] = useState<Empresa | null>(null);
  const [role, setRole] = useState<LegacyRole | null>(null);

  const clearAuthState = () => {
    clearSession();
    setAccessToken('');
    setUser(null);
    setEmpresa(null);
    setRole(null);
  };

  const applySession = (
    payload: {
      accessToken: string;
      user: AuthUser;
      empresa: Empresa;
    },
    persist = true
  ) => {
    const legacyRole = toLegacyRole(payload.user.role);

    setAccessToken(payload.accessToken);
    setUser(payload.user);
    setEmpresa(payload.empresa);
    setRole(legacyRole);

    saveSession(
      {
        accessToken: payload.accessToken,
        role: legacyRole,
        companyId: payload.user.empresaId
      },
      persist
    );
  };

  useEffect(() => {
    const init = async () => {
      const storedToken = getAccessToken();

      if (!storedToken) {
        clearAuthState();
        setLoading(false);
        return;
      }

      try {
        const session = await authService.getSessionFromToken(storedToken);

        if (!session) {
          clearAuthState();
          setLoading(false);
          return;
        }

        applySession(
          {
            accessToken: session.accessToken,
            user: session.user,
            empresa: session.empresa
          },
          true
        );
      } catch (_error) {
        clearAuthState();
      } finally {
        setLoading(false);
      }
    };

    void init();
  }, []);

  const login = async (
    email: string,
    senha: string,
    options?: { remember?: boolean }
  ): Promise<LoginResult> => {
    const remember = options?.remember ?? true;

    try {
      const session = await authService.login({ email: email.trim(), senha });

      applySession(
        {
          accessToken: session.accessToken,
          user: session.user,
          empresa: session.empresa
        },
        remember
      );

      return {
        success: true,
        role: toLegacyRole(session.user.role)
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Falha no login.'
      };
    }
  };

  const registerEmpresa = async (payload: RegisterEmpresaPayload): Promise<LoginResult> => {
    try {
      const session = await authService.registerEmpresa({
        empresaNome: payload.empresaNome,
        empresaEmail: payload.empresaEmail,
        usuarioNome: payload.usuarioNome,
        email: payload.email,
        senha: payload.senha
      });

      applySession(
        {
          accessToken: session.accessToken,
          user: session.user,
          empresa: session.empresa
        },
        payload.remember ?? true
      );

      return {
        success: true,
        role: toLegacyRole(session.user.role)
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Falha ao registrar empresa.'
      };
    }
  };

  const logout = async () => {
    try {
      await authService.logout(accessToken);
    } finally {
      clearAuthState();
    }
  };

  const signIn = async (email: string, password: string, options?: { remember?: boolean }) => {
    return login(email, password, options);
  };

  const signOut = async () => {
    await logout();
  };

  const value = useMemo<AuthContextValue>(
    () => ({
      loading,
      isAuthenticated: Boolean(accessToken),
      user,
      empresa,
      role,
      companyId: user?.empresaId || empresa?.id || null,
      login,
      logout,
      registerEmpresa,
      signIn,
      signOut
    }),
    [loading, accessToken, user, empresa, role]
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

export const useTenantScope = () => {
  const { user, empresa, companyId, role } = useAuth();

  return {
    empresaId: String(companyId || '').trim(),
    userId: String(user?.id || '').trim(),
    tenantRole: toTenantRole(role),
    empresa
  };
};
