import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { User, LoginRequest, RegisterRequest } from '@shared/types';
import { authApi } from '../services/api';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (data: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest & { companyId: string }) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Rehydrate from stored token on mount
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      setLoading(false);
      return;
    }
    authApi
      .me()
      .then((res) => setUser(res.data.data))
      .catch(() => localStorage.removeItem('accessToken'))
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (data: LoginRequest) => {
    const res = await authApi.login(data);
    const { user: loggedUser, accessToken } = res.data.data;
    localStorage.setItem('accessToken', accessToken);
    setUser(loggedUser);
  }, []);

  const register = useCallback(async (data: RegisterRequest & { companyId: string }) => {
    const res = await authApi.register(data);
    const { user: newUser, accessToken } = res.data.data;
    localStorage.setItem('accessToken', accessToken);
    setUser(newUser);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('accessToken');
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuthContext must be used within AuthProvider');
  return ctx;
}
