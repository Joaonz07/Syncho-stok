import { apiFetch as fetch } from '../lib/api';
import { empresaService, type Empresa } from './empresaService';

export type TenantRole = 'admin' | 'funcionario';

export type AuthUser = {
  id: string;
  nome: string;
  email: string;
  empresaId: string;
  role: TenantRole;
};

type StoredUser = AuthUser & {
  senha: string;
  createdAt: string;
};

type SessionData = {
  user: AuthUser;
  empresa: Empresa;
  accessToken: string;
};

type AuthStorage = {
  users: StoredUser[];
  sessions: Record<string, { userId: string; empresaId: string }>;
};

const AUTH_STORAGE_KEY = 'syncho_mock_auth';

const defaultStorage: AuthStorage = {
  users: [],
  sessions: {}
};

const makeId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const makeToken = () => `mock-${Date.now()}-${Math.random().toString(36).slice(2)}`;

const getStorage = (): AuthStorage => {
  if (typeof window === 'undefined') {
    return defaultStorage;
  }

  try {
    const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);

    if (!raw) {
      return defaultStorage;
    }

    const parsed = JSON.parse(raw) as AuthStorage;

    return {
      users: Array.isArray(parsed.users) ? parsed.users : [],
      sessions: parsed.sessions && typeof parsed.sessions === 'object' ? parsed.sessions : {}
    };
  } catch (_error) {
    return defaultStorage;
  }
};

const saveStorage = (storage: AuthStorage) => {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(storage));
};

const normalizeRoleFromBackend = (value: unknown): TenantRole => {
  const normalized = String(value || '').toLowerCase();

  if (normalized === 'admin' || normalized === 'dev') {
    return 'admin';
  }

  return 'funcionario';
};

const buildEmpresa = (value: any, fallbackEmpresaId = ''): Empresa => ({
  id: String(value?.id || fallbackEmpresaId || ''),
  nome: String(value?.name || value?.nome || 'Empresa'),
  email: String(value?.email || ''),
  createdAt: String(value?.createdAt || value?.created_at || new Date().toISOString())
});

const buildUser = (value: any, fallbackEmpresaId = ''): AuthUser => ({
  id: String(value?.id || makeId()),
  nome: String(value?.name || value?.nome || value?.email || 'Usuario'),
  email: String(value?.email || '').toLowerCase(),
  empresaId: String(value?.companyId || value?.empresaId || value?.company_id || fallbackEmpresaId || '').trim(),
  role: normalizeRoleFromBackend(value?.role)
});

const getMockSessionByToken = async (accessToken: string): Promise<SessionData | null> => {
  const storage = getStorage();
  const session = storage.sessions[accessToken];

  if (!session) {
    return null;
  }

  const user = storage.users.find((item) => item.id === session.userId && item.empresaId === session.empresaId);

  if (!user) {
    return null;
  }

  const empresa = await empresaService.buscarEmpresaPorId(user.empresaId);

  if (!empresa) {
    return null;
  }

  return {
    user: {
      id: user.id,
      nome: user.nome,
      email: user.email,
      empresaId: user.empresaId,
      role: user.role
    },
    empresa,
    accessToken
  };
};

export const authService = {
  async registerEmpresa(payload: {
    empresaNome: string;
    empresaEmail: string;
    usuarioNome: string;
    email: string;
    senha: string;
  }): Promise<SessionData> {
    const empresaNome = String(payload.empresaNome || '').trim();
    const empresaEmail = String(payload.empresaEmail || '').trim().toLowerCase();
    const usuarioNome = String(payload.usuarioNome || '').trim();
    const email = String(payload.email || '').trim().toLowerCase();
    const senha = String(payload.senha || '');

    if (!empresaNome || !empresaEmail || !usuarioNome || !email || !senha) {
      throw new Error('Preencha todos os campos obrigatorios para cadastro da empresa.');
    }

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: usuarioNome,
          companyName: empresaNome,
          email,
          password: senha
        })
      });

      const result = await response.json();

      if (response.ok) {
        const loginResult = await this.login({ email, senha });

        if (loginResult) {
          return loginResult;
        }
      } else if (result?.message) {
        throw new Error(String(result.message));
      }
    } catch (_error) {
      // fallback local
    }

    const empresa = await empresaService.criarEmpresa({ nome: empresaNome, email: empresaEmail });
    const storage = getStorage();
    const duplicatedUser = storage.users.some((item) => item.email === email);

    if (duplicatedUser) {
      throw new Error('Ja existe usuario cadastrado com este email.');
    }

    const userRecord: StoredUser = {
      id: makeId(),
      nome: usuarioNome,
      email,
      senha,
      empresaId: empresa.id,
      role: 'admin',
      createdAt: new Date().toISOString()
    };

    const accessToken = makeToken();

    storage.users.push(userRecord);
    storage.sessions[accessToken] = {
      userId: userRecord.id,
      empresaId: empresa.id
    };

    saveStorage(storage);

    return {
      user: {
        id: userRecord.id,
        nome: userRecord.nome,
        email: userRecord.email,
        empresaId: userRecord.empresaId,
        role: userRecord.role
      },
      empresa,
      accessToken
    };
  },

  async login(payload: { email: string; senha: string }): Promise<SessionData> {
    const email = String(payload.email || '').trim().toLowerCase();
    const senha = String(payload.senha || '');

    if (!email || !senha) {
      throw new Error('Informe email e senha.');
    }

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: senha })
      });

      const result = await response.json();

      if (response.ok) {
        const accessToken = String(result?.session?.access_token || '').trim();

        if (!accessToken) {
          throw new Error('Sessao invalida retornada pelo servidor.');
        }

        const meResponse = await fetch('/api/dashboard/me', {
          headers: {
            Authorization: `Bearer ${accessToken}`
          }
        });

        let user = buildUser(result?.user || {}, String(result?.companyId || ''));
        let empresa = buildEmpresa(result?.company || {}, user.empresaId);

        if (meResponse.ok) {
          const meResult = await meResponse.json();
          user = buildUser(meResult?.user || user, user.empresaId);
          empresa = buildEmpresa(meResult?.company || meResult?.empresa || empresa, user.empresaId);
        }

        if (!user.empresaId) {
          throw new Error('Usuario nao possui empresa vinculada.');
        }

        return {
          user,
          empresa,
          accessToken
        };
      }
    } catch (_error) {
      // fallback local
    }

    const storage = getStorage();
    const userRecord = storage.users.find((item) => item.email === email && item.senha === senha);

    if (!userRecord) {
      throw new Error('Credenciais invalidas.');
    }

    const empresa = await empresaService.buscarEmpresaPorId(userRecord.empresaId);

    if (!empresa) {
      throw new Error('Empresa do usuario nao encontrada.');
    }

    const accessToken = makeToken();
    storage.sessions[accessToken] = { userId: userRecord.id, empresaId: userRecord.empresaId };
    saveStorage(storage);

    return {
      user: {
        id: userRecord.id,
        nome: userRecord.nome,
        email: userRecord.email,
        empresaId: userRecord.empresaId,
        role: userRecord.role
      },
      empresa,
      accessToken
    };
  },

  async getSessionFromToken(accessToken: string): Promise<SessionData | null> {
    const token = String(accessToken || '').trim();

    if (!token) {
      return null;
    }

    try {
      const response = await fetch('/api/dashboard/me', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (response.ok) {
        const result = await response.json();
        const user = buildUser(result?.user || {}, String(result?.user?.companyId || ''));

        if (!user.empresaId) {
          return null;
        }

        const empresa = buildEmpresa(result?.company || result?.empresa || {}, user.empresaId);

        return {
          user,
          empresa,
          accessToken: token
        };
      }
    } catch (_error) {
      // fallback local
    }

    return getMockSessionByToken(token);
  },

  async logout(accessToken?: string): Promise<void> {
    const token = String(accessToken || '').trim();

    if (token) {
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
      } catch (_error) {
        // continue local cleanup
      }
    }

    const storage = getStorage();

    if (token && storage.sessions[token]) {
      delete storage.sessions[token];
      saveStorage(storage);
    }
  }
};
