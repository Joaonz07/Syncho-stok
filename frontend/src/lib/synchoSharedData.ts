export type SharedProduct = {
  id: string;
  name: string;
  code?: string;
  sku?: string;
  barcode?: string;
  category?: string;
  price: number;
  cost?: number;
  quantity?: number;
  description?: string;
  companyId?: string;
  enabledInInventory?: boolean;
  enabledInPDV?: boolean;
};

export type SharedStockMovement = {
  id: string;
  produtoId: string;
  tipo: 'ENTRADA' | 'SAIDA' | 'AJUSTE' | 'TRANSFERENCIA';
  quantidade: number;
  localOrigemId: string | null;
  localDestinoId: string | null;
  dataHora: string;
  usuarioId: string;
  observacao: string;
  lote?: string | null;
  validade?: string | null;
  suspeita?: boolean;
};

export const SHARED_PRODUCTS_KEY = 'syncho_shared_products_v1';
export const SHARED_STOCK_MOVEMENTS_KEY = 'syncho_stock_movements_v1';
export const SHARED_COMPANY_FEATURES_KEY = 'syncho_company_features_v1';
export const SHARED_PRODUCTS_UPDATED_EVENT = 'syncho:products-updated';
export const SHARED_STOCK_UPDATED_EVENT = 'syncho:stock-movements-updated';
export const SHARED_COMPANY_FEATURES_UPDATED_EVENT = 'syncho:company-features-updated';

export type CompanyFeatureFlags = {
  multiStoreEnabled: boolean;
};

export function readSharedProducts(): SharedProduct[] {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(SHARED_PRODUCTS_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as SharedProduct[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function writeSharedProducts(items: SharedProduct[]) {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(SHARED_PRODUCTS_KEY, JSON.stringify(items));
  } catch {
    // Ignore storage write errors.
  }
}

export function readSharedStockMovements(): SharedStockMovement[] {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(SHARED_STOCK_MOVEMENTS_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as SharedStockMovement[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function writeSharedStockMovements(items: SharedStockMovement[]) {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(SHARED_STOCK_MOVEMENTS_KEY, JSON.stringify(items));
  } catch {
    // Ignore storage write errors.
  }
}

export function dispatchSharedEvent(eventName: string, detail?: Record<string, unknown>) {
  if (typeof window === 'undefined') {
    return;
  }

  window.dispatchEvent(new CustomEvent(eventName, { detail: detail || {} }));
}

export function readCompanyFeatures(): Record<string, CompanyFeatureFlags> {
  if (typeof window === 'undefined') {
    return {};
  }

  try {
    const raw = window.localStorage.getItem(SHARED_COMPANY_FEATURES_KEY);
    if (!raw) {
      return {};
    }

    const parsed = JSON.parse(raw) as Record<string, CompanyFeatureFlags>;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export function writeCompanyFeatures(items: Record<string, CompanyFeatureFlags>) {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(SHARED_COMPANY_FEATURES_KEY, JSON.stringify(items));
  } catch {
    // Ignore storage write errors.
  }
}

export function getCompanyMultiStoreEnabled(companyId: string): boolean {
  const normalizedCompanyId = String(companyId || '').trim();
  if (!normalizedCompanyId) {
    return false;
  }

  const features = readCompanyFeatures();
  return Boolean(features[normalizedCompanyId]?.multiStoreEnabled);
}

export function setCompanyMultiStoreEnabled(companyId: string, enabled: boolean) {
  const normalizedCompanyId = String(companyId || '').trim();
  if (!normalizedCompanyId) {
    return;
  }

  const current = readCompanyFeatures();
  current[normalizedCompanyId] = {
    multiStoreEnabled: Boolean(enabled),
  };
  writeCompanyFeatures(current);
  dispatchSharedEvent(SHARED_COMPANY_FEATURES_UPDATED_EVENT, {
    companyId: normalizedCompanyId,
    multiStoreEnabled: Boolean(enabled),
  });
}
