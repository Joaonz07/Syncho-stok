import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { clearSession, saveSession } from '../lib/session';

type LoginResult = {
  success: boolean;
  message?: string;
  role?: 'ADMIN' | 'CLIENT';
};

type AuthContextValue = {
  loading: boolean;
  session: Session | null;
  user: User | null;
  role: 'ADMIN' | 'CLIENT' | null;
  companyId: string | null;
  isAuthenticated: boolean;
  signIn: (email: string, password: string) => Promise<LoginResult>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const normalizeRole = (value: unknown): 'ADMIN' | 'CLIENT' =>
  String(value || 'CLIENT').toUpperCase() === 'ADMIN' ? 'ADMIN' : 'CLIENT';

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
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<'ADMIN' | 'CLIENT' | null>(null);
  const [companyId, setCompanyId] = useState<string | null>(null);

  const syncSessionState = async (activeSession: Session | null) => {
    setSession(activeSession);
    setUser(activeSession?.user || null);

    if (!activeSession?.access_token) {
      clearSession();
      setRole(null);
      setCompanyId(null);
      return;
    }

    const profile = await getProfileFromApi(activeSession.access_token);
    setRole(profile.role);
    setCompanyId(profile.companyId);

    saveSession({
      accessToken: activeSession.access_token,
      role: profile.role,
      companyId: profile.companyId
    });
  };

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      const { data } = await supabase.auth.getSession();

      if (!mounted) {
        return;
      }

      await syncSessionState(data.session || null);
      setLoading(false);
    };

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      void syncSessionState(currentSession || null);
    });

    void init();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string): Promise<LoginResult> => {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim(), password })
    });

    const result = await response.json();

    if (!response.ok) {
      return {
        success: false,
        message: result.message || 'Falha no login.'
      };
    }

    const accessToken = String(result?.session?.access_token || '').trim();
    const refreshToken = String(result?.session?.refresh_token || '').trim();

    if (!accessToken || !refreshToken) {
      return {
        success: false,
        message: 'Sessao invalida retornada pelo servidor.'
      };
    }

    const { error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken
    });

    if (error) {
      return {
        success: false,
        message: error.message || 'Falha ao persistir sessao.'
      };
    }

    const resolvedRole = normalizeRole(result.role);
    const resolvedCompanyId = String(result.companyId || '').trim() || null;

    setRole(resolvedRole);
    setCompanyId(resolvedCompanyId);

    saveSession({
      accessToken,
      role: resolvedRole,
      companyId: resolvedCompanyId
    });

    return {
      success: true,
      role: resolvedRole
    };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    clearSession();
    setSession(null);
    setUser(null);
    setRole(null);
    setCompanyId(null);
  };

  const value = useMemo<AuthContextValue>(
    () => ({
      loading,
      session,
      user,
      role,
      companyId,
      isAuthenticated: Boolean(session?.access_token),
      signIn,
      signOut
    }),
    [loading, session, user, role, companyId]
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
