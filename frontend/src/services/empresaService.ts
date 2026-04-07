import { apiFetch as fetch } from '../lib/api';

export type Empresa = {
  id: string;
  nome: string;
  email: string;
  createdAt: string;
};

type EmpresaStorage = {
  empresas: Empresa[];
};

const EMPRESA_STORAGE_KEY = 'syncho_mock_empresas';

const defaultStorage: EmpresaStorage = {
  empresas: []
};

const makeId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const getStorage = (): EmpresaStorage => {
  if (typeof window === 'undefined') {
    return defaultStorage;
  }

  try {
    const raw = window.localStorage.getItem(EMPRESA_STORAGE_KEY);

    if (!raw) {
      return defaultStorage;
    }

    const parsed = JSON.parse(raw) as EmpresaStorage;

    return {
      empresas: Array.isArray(parsed.empresas) ? parsed.empresas : []
    };
  } catch (_error) {
    return defaultStorage;
  }
};

const saveStorage = (storage: EmpresaStorage) => {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(EMPRESA_STORAGE_KEY, JSON.stringify(storage));
};

const normalizeEmpresa = (value: any): Empresa => ({
  id: String(value?.id || ''),
  nome: String(value?.name || value?.nome || ''),
  email: String(value?.email || ''),
  createdAt: String(value?.createdAt || value?.created_at || new Date().toISOString())
});

export const empresaService = {
  async criarEmpresa(payload: { nome: string; email: string }, accessToken?: string): Promise<Empresa> {
    const nome = String(payload.nome || '').trim();
    const email = String(payload.email || '').trim().toLowerCase();

    if (!nome || !email) {
      throw new Error('Nome e email da empresa sao obrigatorios.');
    }

    if (accessToken) {
      try {
        const response = await fetch('/api/companies', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ name: nome, email })
        });

        const result = await response.json();

        if (response.ok && result?.company) {
          return normalizeEmpresa(result.company);
        }
      } catch (_error) {
        // fallback local
      }
    }

    const storage = getStorage();
    const duplicatedEmail = storage.empresas.some((empresa) => empresa.email.toLowerCase() === email);

    if (duplicatedEmail) {
      throw new Error('Ja existe uma empresa cadastrada com este email.');
    }

    const empresa: Empresa = {
      id: makeId(),
      nome,
      email,
      createdAt: new Date().toISOString()
    };

    storage.empresas.push(empresa);
    saveStorage(storage);

    return empresa;
  },

  async buscarEmpresaPorId(empresaId: string, accessToken?: string): Promise<Empresa | null> {
    const normalizedId = String(empresaId || '').trim();

    if (!normalizedId) {
      return null;
    }

    if (accessToken) {
      try {
        const response = await fetch(`/api/companies/${encodeURIComponent(normalizedId)}`, {
          headers: {
            Authorization: `Bearer ${accessToken}`
          }
        });

        const result = await response.json();

        if (response.ok && result?.company) {
          return normalizeEmpresa(result.company);
        }
      } catch (_error) {
        // fallback local
      }
    }

    const storage = getStorage();
    const empresa = storage.empresas.find((item) => item.id === normalizedId);
    return empresa || null;
  }
};
