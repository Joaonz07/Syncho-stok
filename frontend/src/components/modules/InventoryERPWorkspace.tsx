import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  SHARED_PRODUCTS_UPDATED_EVENT,
  SHARED_STOCK_MOVEMENTS_KEY,
  SHARED_STOCK_UPDATED_EVENT,
  dispatchSharedEvent,
  readSharedProducts,
} from '../../lib/synchoSharedData';
import {
  Package,
  Warehouse,
  ArrowLeftRight,
  ClipboardCheck,
  Activity,
  Shield,
  Download,
  RefreshCw,
  Search,
  BarChart3,
  Bell,
  Cpu,
} from 'lucide-react';

type UserRole = 'ADMIN' | 'OPERADOR' | 'AUDITOR';
type ProductStatus = 'ATIVO' | 'INATIVO';
type MoveType = 'ENTRADA' | 'SAIDA' | 'AJUSTE' | 'TRANSFERENCIA';
type LocationType = 'LOJA' | 'DEPOSITO' | 'FILIAL';

type Product = {
  id: string;
  nome: string;
  sku: string;
  codigoBarras: string;
  categoria: string;
  marca: string;
  precoVenda: number;
  custo: number;
  unidade: 'un' | 'kg' | 'caixa';
  status: ProductStatus;
  estoqueMinimo: number;
  permiteNegativo?: boolean;
  controleLote?: boolean;
  controleValidade?: boolean;
};

type Location = {
  id: string;
  nome: string;
  tipo: LocationType;
  ativo: boolean;
};

type AppUser = {
  id: string;
  nome: string;
  role: UserRole;
};

type InventoryMovement = {
  id: string;
  produtoId: string;
  tipo: MoveType;
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

type MovementForm = {
  produtoId: string;
  tipo: MoveType;
  quantidade: string;
  localOrigemId: string;
  localDestinoId: string;
  observacao: string;
  lote: string;
  validade: string;
};

type InventoryERPWorkspaceProps = {
  showToast?: (msg: string) => void;
  viewerRole?: 'ADMIN' | 'DEV' | 'CLIENT';
  companyId?: string;
  multiStoreEnabled?: boolean;
};

const PRODUCTS_SEED: Product[] = [
  {
    id: 'pr-001',
    nome: 'Arroz Premium 5kg',
    sku: 'ARZ-5KG-PRE',
    codigoBarras: '7891000000101',
    categoria: 'Alimentos',
    marca: 'GraoBom',
    precoVenda: 34.9,
    custo: 26.5,
    unidade: 'un',
    status: 'ATIVO',
    estoqueMinimo: 20,
    permiteNegativo: false,
    controleLote: false,
    controleValidade: false,
  },
  {
    id: 'pr-002',
    nome: 'Leite Integral 1L',
    sku: 'LEI-INT-1L',
    codigoBarras: '7891000000202',
    categoria: 'Bebidas',
    marca: 'ValeLeite',
    precoVenda: 6.5,
    custo: 4.7,
    unidade: 'un',
    status: 'ATIVO',
    estoqueMinimo: 35,
    permiteNegativo: false,
    controleLote: true,
    controleValidade: true,
  },
  {
    id: 'pr-003',
    nome: 'Detergente 500ml',
    sku: 'DET-500-CLN',
    codigoBarras: '7891000000303',
    categoria: 'Limpeza',
    marca: 'CleanMax',
    precoVenda: 3.9,
    custo: 2.3,
    unidade: 'un',
    status: 'ATIVO',
    estoqueMinimo: 25,
    permiteNegativo: false,
    controleLote: false,
    controleValidade: false,
  },
  {
    id: 'pr-004',
    nome: 'Cafe Torrado 500g',
    sku: 'CAF-500-TOR',
    codigoBarras: '7891000000404',
    categoria: 'Alimentos',
    marca: 'SerraAlta',
    precoVenda: 18.9,
    custo: 12.2,
    unidade: 'un',
    status: 'ATIVO',
    estoqueMinimo: 15,
    permiteNegativo: false,
    controleLote: true,
    controleValidade: true,
  },
  {
    id: 'pr-005',
    nome: 'Chocolate 80g',
    sku: 'CHO-80-MLK',
    codigoBarras: '7891000000505',
    categoria: 'Doces',
    marca: 'DoceSul',
    precoVenda: 8.4,
    custo: 5.1,
    unidade: 'un',
    status: 'ATIVO',
    estoqueMinimo: 12,
    permiteNegativo: true,
    controleLote: false,
    controleValidade: false,
  },
];

const LOCATIONS_SEED: Location[] = [
  { id: 'loc-loja', nome: 'Loja Centro', tipo: 'LOJA', ativo: true },
  { id: 'loc-deposito', nome: 'Deposito Principal', tipo: 'DEPOSITO', ativo: true },
  { id: 'loc-filial', nome: 'Filial Norte', tipo: 'FILIAL', ativo: true },
];

const USERS_SEED: AppUser[] = [
  { id: 'u-admin', nome: 'Ana Admin', role: 'ADMIN' },
  { id: 'u-op', nome: 'Otavio Operador', role: 'OPERADOR' },
  { id: 'u-aud', nome: 'Amanda Auditor', role: 'AUDITOR' },
  { id: 'u-pdv', nome: 'Integracao PDV', role: 'OPERADOR' },
];

const nowIso = () => new Date().toISOString();
const fmtBRL = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value || 0));
const fmtDate = (iso: string) => new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(iso));
const movementId = () => `mv-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
const DEFAULT_LOCATION_ID = 'loc-loja';
const LOCATION_CONFIG_KEY = 'syncho_company_locations_v1';

const seedMovements = (): InventoryMovement[] => [
  {
    id: movementId(),
    produtoId: 'pr-001',
    tipo: 'ENTRADA',
    quantidade: 100,
    localOrigemId: null,
    localDestinoId: 'loc-deposito',
    dataHora: nowIso(),
    usuarioId: 'u-admin',
    observacao: 'Compra inicial',
  },
  {
    id: movementId(),
    produtoId: 'pr-001',
    tipo: 'TRANSFERENCIA',
    quantidade: 40,
    localOrigemId: 'loc-deposito',
    localDestinoId: 'loc-loja',
    dataHora: nowIso(),
    usuarioId: 'u-admin',
    observacao: 'Reposicao loja',
  },
  {
    id: movementId(),
    produtoId: 'pr-002',
    tipo: 'ENTRADA',
    quantidade: 150,
    localOrigemId: null,
    localDestinoId: 'loc-deposito',
    dataHora: nowIso(),
    usuarioId: 'u-op',
    observacao: 'Recebimento fornecedor',
  },
  {
    id: movementId(),
    produtoId: 'pr-002',
    tipo: 'TRANSFERENCIA',
    quantidade: 70,
    localOrigemId: 'loc-deposito',
    localDestinoId: 'loc-loja',
    dataHora: nowIso(),
    usuarioId: 'u-op',
    observacao: 'Abastecimento loja',
  },
  {
    id: movementId(),
    produtoId: 'pr-003',
    tipo: 'ENTRADA',
    quantidade: 90,
    localOrigemId: null,
    localDestinoId: 'loc-deposito',
    dataHora: nowIso(),
    usuarioId: 'u-admin',
    observacao: 'Compra semanal',
  },
  {
    id: movementId(),
    produtoId: 'pr-003',
    tipo: 'AJUSTE',
    quantidade: -2,
    localOrigemId: 'loc-deposito',
    localDestinoId: null,
    dataHora: nowIso(),
    usuarioId: 'u-aud',
    observacao: 'Perda por avaria',
    suspeita: false,
  },
];

function readSavedMovements(): InventoryMovement[] {
  try {
    const raw = localStorage.getItem(SHARED_STOCK_MOVEMENTS_KEY);
    if (!raw) {
      const seeded = seedMovements();
      localStorage.setItem(SHARED_STOCK_MOVEMENTS_KEY, JSON.stringify(seeded));
      return seeded;
    }
    const parsed = JSON.parse(raw) as InventoryMovement[];
    return Array.isArray(parsed) ? parsed : seedMovements();
  } catch {
    return seedMovements();
  }
}

function saveMovements(items: InventoryMovement[]) {
  try {
    localStorage.setItem(SHARED_STOCK_MOVEMENTS_KEY, JSON.stringify(items));
  } catch {
    // ignore local storage quota failures in mock mode
  }
}

function dedupeMovements(items: InventoryMovement[]): InventoryMovement[] {
  const seen = new Set<string>();
  const output: InventoryMovement[] = [];

  for (const movement of items) {
    const id = String(movement.id || '').trim();
    if (!id || seen.has(id)) {
      continue;
    }

    const qty = Number(movement.quantidade || 0);
    if (movement.tipo === 'AJUSTE') {
      if (!Number.isFinite(qty) || qty === 0) {
        continue;
      }
    } else if (!Number.isFinite(qty) || qty <= 0) {
      continue;
    }

    seen.add(id);
    output.push(movement);
  }

  return output;
}

function readCompanyLocations(companyId: string): Location[] {
  const normalizedCompanyId = String(companyId || '').trim() || 'global';

  try {
    const raw = localStorage.getItem(LOCATION_CONFIG_KEY);
    if (!raw) {
      return LOCATIONS_SEED;
    }

    const parsed = JSON.parse(raw) as Record<string, Location[]>;
    const companyLocations = parsed?.[normalizedCompanyId];
    if (!Array.isArray(companyLocations) || !companyLocations.length) {
      return LOCATIONS_SEED;
    }

    return companyLocations;
  } catch {
    return LOCATIONS_SEED;
  }
}

function saveCompanyLocations(companyId: string, locations: Location[]) {
  const normalizedCompanyId = String(companyId || '').trim() || 'global';

  try {
    const raw = localStorage.getItem(LOCATION_CONFIG_KEY);
    const parsed = raw ? (JSON.parse(raw) as Record<string, Location[]>) : {};
    parsed[normalizedCompanyId] = locations;
    localStorage.setItem(LOCATION_CONFIG_KEY, JSON.stringify(parsed));
  } catch {
    // ignore storage failures in mock mode
  }
}

function loadCatalogFromShared(): Product[] {
  const shared = readSharedProducts().filter((item) => item.enabledInInventory !== false);

  if (!shared.length) {
    return PRODUCTS_SEED;
  }

  return shared.map((item) => ({
    id: String(item.id || '').trim(),
    nome: String(item.name || '').trim() || 'Produto',
    sku: String(item.sku || item.code || '').trim() || `SKU-${String(item.id || '').slice(0, 8)}`,
    codigoBarras: String(item.barcode || item.code || item.sku || '').trim() || String(item.id || '').trim(),
    categoria: String(item.category || 'Sem categoria').trim() || 'Sem categoria',
    marca: 'SYNCHO',
    precoVenda: Number(item.price || 0),
    custo: Number(item.cost ?? item.price ?? 0),
    unidade: 'un',
    status: item.enabledInInventory === false ? 'INATIVO' : 'ATIVO',
    estoqueMinimo: 5,
    permiteNegativo: false,
    controleLote: false,
    controleValidade: false,
  }));
}

export default function InventoryERPWorkspace({
  showToast,
  viewerRole = 'CLIENT',
  companyId = '',
  multiStoreEnabled = false,
}: InventoryERPWorkspaceProps) {
  const [products, setProducts] = useState<Product[]>(() => loadCatalogFromShared());
  const [locations, setLocations] = useState<Location[]>(() => readCompanyLocations(companyId));
  const [users] = useState<AppUser[]>(USERS_SEED);
  const [currentUserId, setCurrentUserId] = useState<string>(viewerRole === 'ADMIN' ? 'u-admin' : 'u-op');
  const [allowGlobalNegative, setAllowGlobalNegative] = useState<boolean>(false);
  const [autoBlockNoStock, setAutoBlockNoStock] = useState<boolean>(true);
  const [pdvRealtimeEnabled, setPdvRealtimeEnabled] = useState<boolean>(false);
  const [movements, setMovements] = useState<InventoryMovement[]>(() => dedupeMovements(readSavedMovements()));
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [timelineProductId, setTimelineProductId] = useState<string>('');
  const [filterType, setFilterType] = useState<MoveType | 'TODOS'>('TODOS');
  const [filterUser, setFilterUser] = useState<string>('TODOS');
  const [filterFromDate, setFilterFromDate] = useState<string>('');
  const [filterToDate, setFilterToDate] = useState<string>('');
  const [form, setForm] = useState<MovementForm>({
    produtoId: products[0]?.id || '',
    tipo: 'ENTRADA',
    quantidade: '',
    localOrigemId: 'loc-deposito',
    localDestinoId: 'loc-loja',
    observacao: '',
    lote: '',
    validade: '',
  });
  const [inventoryCountProductId, setInventoryCountProductId] = useState<string>(products[0]?.id || '');
  const [inventoryCountLocationId, setInventoryCountLocationId] = useState<string>(DEFAULT_LOCATION_ID);
  const [inventoryCountValue, setInventoryCountValue] = useState<string>('');
  const [newLocationName, setNewLocationName] = useState<string>('');
  const [newLocationType, setNewLocationType] = useState<LocationType>('FILIAL');

  const isSystemAdmin = viewerRole === 'ADMIN';
  const canUseMultiLocations = isSystemAdmin && multiStoreEnabled;
  const visibleLocations = useMemo(() => {
    if (canUseMultiLocations) {
      return locations.filter((location) => location.ativo);
    }

    const defaultLocation = locations.find((location) => location.id === DEFAULT_LOCATION_ID) || LOCATIONS_SEED[0];
    return [defaultLocation];
  }, [locations, canUseMultiLocations]);

  const currentUser = useMemo(() => users.find((user) => user.id === currentUserId) || users[0], [currentUserId, users]);

  useEffect(() => {
    saveMovements(movements);
    dispatchSharedEvent(SHARED_STOCK_UPDATED_EVENT, { source: 'inventory' });
  }, [movements]);

  useEffect(() => {
    setLocations(readCompanyLocations(companyId));
  }, [companyId]);

  useEffect(() => {
    saveCompanyLocations(companyId, locations);
  }, [companyId, locations]);

  useEffect(() => {
    const syncProducts = () => {
      setProducts(loadCatalogFromShared());
    };

    const syncMovements = (source?: string) => {
      if (source === 'inventory') {
        return;
      }

      setMovements(dedupeMovements(readSavedMovements()));
    };

    const onStorage = (event: StorageEvent) => {
      if (event.key === SHARED_STOCK_MOVEMENTS_KEY) {
        syncMovements();
      }
    };

    const onProductsUpdated = () => {
      syncProducts();
    };

    const onStockUpdated = (event: Event) => {
      const detail = (event as CustomEvent<{ source?: string }>).detail;
      syncMovements(detail?.source);
    };

    window.addEventListener('storage', onStorage);
    window.addEventListener(SHARED_PRODUCTS_UPDATED_EVENT, onProductsUpdated);
    window.addEventListener(SHARED_STOCK_UPDATED_EVENT, onStockUpdated);

    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener(SHARED_PRODUCTS_UPDATED_EVENT, onProductsUpdated);
      window.removeEventListener(SHARED_STOCK_UPDATED_EVENT, onStockUpdated);
    };
  }, []);

  useEffect(() => {
    if (!products.length) {
      return;
    }

    setForm((prev) => {
      const exists = products.some((product) => product.id === prev.produtoId);
      if (exists) {
        return prev;
      }

      return { ...prev, produtoId: products[0]?.id || '' };
    });

    setInventoryCountProductId((prev) => {
      const exists = products.some((product) => product.id === prev);
      return exists ? prev : products[0]?.id || '';
    });
  }, [products]);

  useEffect(() => {
    setForm((prev) => ({
      ...prev,
      localOrigemId: visibleLocations[0]?.id || DEFAULT_LOCATION_ID,
      localDestinoId: visibleLocations[0]?.id || DEFAULT_LOCATION_ID,
    }));

    setInventoryCountLocationId((prev) => {
      const exists = visibleLocations.some((location) => location.id === prev);
      return exists ? prev : (visibleLocations[0]?.id || DEFAULT_LOCATION_ID);
    });
  }, [visibleLocations]);

  const productMap = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);
  const locationMap = useMemo(() => new Map(locations.map((l) => [l.id, l])), [locations]);
  const userMap = useMemo(() => new Map(users.map((u) => [u.id, u])), [users]);

  const stockByProductLocation = useMemo(() => {
    const map = new Map<string, number>();
    const keyOf = (productId: string, locationId: string) => `${productId}::${locationId}`;
    const processedMovements = new Set<string>();

    for (const movement of movements) {
      const movementKey = String(movement.id || '').trim();
      if (!movementKey || processedMovements.has(movementKey)) {
        continue;
      }
      processedMovements.add(movementKey);

      if (movement.tipo === 'ENTRADA' && movement.localDestinoId) {
        const key = keyOf(movement.produtoId, movement.localDestinoId);
        map.set(key, Number(map.get(key) || 0) + movement.quantidade);
      }

      if (movement.tipo === 'SAIDA' && movement.localOrigemId) {
        const key = keyOf(movement.produtoId, movement.localOrigemId);
        map.set(key, Number(map.get(key) || 0) - movement.quantidade);
      }

      if (movement.tipo === 'AJUSTE') {
        const locationId = movement.localOrigemId || movement.localDestinoId;
        if (locationId) {
          const key = keyOf(movement.produtoId, locationId);
          map.set(key, Number(map.get(key) || 0) + movement.quantidade);
        }
      }

      if (movement.tipo === 'TRANSFERENCIA' && movement.localOrigemId && movement.localDestinoId) {
        const fromKey = keyOf(movement.produtoId, movement.localOrigemId);
        const toKey = keyOf(movement.produtoId, movement.localDestinoId);
        map.set(fromKey, Number(map.get(fromKey) || 0) - movement.quantidade);
        map.set(toKey, Number(map.get(toKey) || 0) + movement.quantidade);
      }
    }

    return map;
  }, [movements]);

  const getStock = (productId: string, locationId: string) => Number(stockByProductLocation.get(`${productId}::${locationId}`) || 0);

  const totalByProduct = useMemo(() => {
    return products.map((product) => {
      const total = visibleLocations.reduce((sum, location) => sum + getStock(product.id, location.id), 0);
      return { productId: product.id, total };
    });
  }, [products, visibleLocations, stockByProductLocation]);

  const dashboardMetrics = useMemo(() => {
    const totalUnits = totalByProduct.reduce((sum, item) => sum + item.total, 0);
    const totalValue = totalByProduct.reduce((sum, item) => {
      const product = productMap.get(item.productId);
      if (!product) return sum;
      return sum + item.total * product.custo;
    }, 0);

    const lowStockProducts = totalByProduct.filter((item) => {
      const product = productMap.get(item.productId);
      if (!product) return false;
      return item.total > 0 && item.total <= product.estoqueMinimo;
    });

    const zeroProducts = totalByProduct.filter((item) => item.total <= 0);

    const movementCountMap = new Map<string, number>();
    for (const movement of movements) {
      movementCountMap.set(movement.produtoId, Number(movementCountMap.get(movement.produtoId) || 0) + Math.abs(movement.quantidade));
    }

    const mostMoved = [...movementCountMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([productId, qty]) => ({ productId, qty }));

    const giroEstoque = movements.length
      ? Number((movements.filter((m) => m.tipo === 'SAIDA').reduce((sum, m) => sum + m.quantidade, 0) / Math.max(1, totalUnits)).toFixed(2))
      : 0;

    return {
      totalUnits,
      totalValue,
      lowStockProducts,
      zeroProducts,
      mostMoved,
      giroEstoque,
    };
  }, [totalByProduct, productMap, movements]);

  const alerts = useMemo(() => {
    const items: Array<{ id: string; level: 'warn' | 'danger' | 'info'; text: string }> = [];

    for (const row of dashboardMetrics.lowStockProducts) {
      const product = productMap.get(row.productId);
      if (!product) continue;
      items.push({ id: `low-${row.productId}`, level: 'warn', text: `Estoque baixo: ${product.nome} com ${row.total} un.` });
    }

    for (const row of dashboardMetrics.zeroProducts) {
      const product = productMap.get(row.productId);
      if (!product) continue;
      items.push({ id: `zero-${row.productId}`, level: 'danger', text: `Produto zerado: ${product.nome}.` });
    }

    const suspicious = movements.filter((movement) => movement.suspeita || (movement.tipo === 'AJUSTE' && Math.abs(movement.quantidade) >= 20));
    for (const movement of suspicious.slice(0, 5)) {
      const productName = productMap.get(movement.produtoId)?.nome || movement.produtoId;
      const userName = userMap.get(movement.usuarioId)?.nome || 'Usuario';
      items.push({
        id: `sus-${movement.id}`,
        level: 'danger',
        text: `Movimentacao suspeita em ${productName}: ${movement.tipo} ${movement.quantidade} por ${userName}.`,
      });
    }

    if (!items.length) {
      items.push({ id: 'ok', level: 'info', text: 'Sem alertas criticos no momento.' });
    }

    return items.slice(0, 12);
  }, [dashboardMetrics, movements, productMap, userMap]);

  const canRunOutputMovement = (productId: string, locationId: string, qty: number) => {
    const product = productMap.get(productId);
    if (!product) return false;
    const localStock = getStock(productId, locationId);
    const allowNegative = allowGlobalNegative || Boolean(product.permiteNegativo);
    if (allowNegative) return true;
    return localStock - qty >= 0;
  };

  const appendMovement = (movement: InventoryMovement) => {
    setMovements((prev) => dedupeMovements([movement, ...prev]));
  };

  const handleCreateLocation = () => {
    if (!isSystemAdmin) {
      showToast?.('Apenas admin do sistema pode criar locais.');
      return;
    }

    if (!multiStoreEnabled) {
      showToast?.('Ative multi-loja para criar filiais e depósitos.');
      return;
    }

    const normalizedName = String(newLocationName || '').trim();
    if (!normalizedName) {
      showToast?.('Informe o nome do local.');
      return;
    }

    const locationId = `loc-${normalizedName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
    if (locations.some((location) => location.id === locationId)) {
      showToast?.('Ja existe um local com esse nome.');
      return;
    }

    setLocations((prev) => [
      ...prev,
      {
        id: locationId,
        nome: normalizedName,
        tipo: newLocationType,
        ativo: true,
      },
    ]);
    setNewLocationName('');
    setNewLocationType('FILIAL');
    showToast?.('Local criado com sucesso.');
  };

  const handleSubmitMovement = () => {
    if (!form.tipo) {
      showToast?.('Selecione o tipo de movimentacao.');
      return;
    }

    if (!form.produtoId) {
      showToast?.('Selecione um produto.');
      return;
    }

    const qty = Number(form.quantidade);
    if (!Number.isFinite(qty) || qty <= 0) {
      showToast?.('Quantidade invalida.');
      return;
    }

    const product = productMap.get(form.produtoId);
    if (!product) {
      showToast?.('Produto nao encontrado.');
      return;
    }

    if (product.status !== 'ATIVO') {
      showToast?.('Produto inativo nao pode movimentar.');
      return;
    }

    if (form.tipo === 'ENTRADA') {
      if (!form.localDestinoId) {
        showToast?.('Informe local de destino.');
        return;
      }

      appendMovement({
        id: movementId(),
        produtoId: form.produtoId,
        tipo: 'ENTRADA',
        quantidade: qty,
        localOrigemId: null,
        localDestinoId: form.localDestinoId,
        dataHora: nowIso(),
        usuarioId: currentUser.id,
        observacao: form.observacao || 'Entrada manual',
        lote: form.lote || null,
        validade: form.validade || null,
      });

      showToast?.(`Entrada registrada: +${qty} ${product.unidade}`);
    }

    if (form.tipo === 'SAIDA') {
      if (!form.localOrigemId) {
        showToast?.('Informe local de origem.');
        return;
      }

      if (autoBlockNoStock && !canRunOutputMovement(form.produtoId, form.localOrigemId, qty)) {
        showToast?.('Bloqueado: sem estoque suficiente.');
        return;
      }

      appendMovement({
        id: movementId(),
        produtoId: form.produtoId,
        tipo: 'SAIDA',
        quantidade: qty,
        localOrigemId: form.localOrigemId,
        localDestinoId: null,
        dataHora: nowIso(),
        usuarioId: currentUser.id,
        observacao: form.observacao || 'Saida manual',
      });

      showToast?.(`Saida registrada: -${qty} ${product.unidade}`);
    }

    if (form.tipo === 'AJUSTE') {
      const isLoss = form.observacao.toLowerCase().includes('perda') || form.observacao.toLowerCase().includes('erro');
      const signed = isLoss ? -qty : qty;
      const targetLocationId = form.localOrigemId || form.localDestinoId;

      if (!targetLocationId) {
        showToast?.('Informe local para ajuste.');
        return;
      }

      if (signed < 0 && autoBlockNoStock && !canRunOutputMovement(form.produtoId, targetLocationId, Math.abs(signed))) {
        showToast?.('Ajuste invalido: ficaria negativo.');
        return;
      }

      appendMovement({
        id: movementId(),
        produtoId: form.produtoId,
        tipo: 'AJUSTE',
        quantidade: signed,
        localOrigemId: targetLocationId,
        localDestinoId: null,
        dataHora: nowIso(),
        usuarioId: currentUser.id,
        observacao: form.observacao || 'Ajuste manual',
        suspeita: Math.abs(signed) >= 20,
      });

      showToast?.(`Ajuste registrado: ${signed > 0 ? '+' : ''}${signed} ${product.unidade}`);
    }

    if (form.tipo === 'TRANSFERENCIA') {
      if (!canUseMultiLocations) {
        showToast?.('Transferencia entre locais disponivel apenas com multi-loja habilitado pelo admin.');
        return;
      }

      if (!form.localOrigemId || !form.localDestinoId) {
        showToast?.('Informe origem e destino.');
        return;
      }

      if (form.localOrigemId === form.localDestinoId) {
        showToast?.('Origem e destino devem ser diferentes.');
        return;
      }

      if (autoBlockNoStock && !canRunOutputMovement(form.produtoId, form.localOrigemId, qty)) {
        showToast?.('Transferencia bloqueada por estoque insuficiente.');
        return;
      }

      appendMovement({
        id: movementId(),
        produtoId: form.produtoId,
        tipo: 'TRANSFERENCIA',
        quantidade: qty,
        localOrigemId: form.localOrigemId,
        localDestinoId: form.localDestinoId,
        dataHora: nowIso(),
        usuarioId: currentUser.id,
        observacao: form.observacao || 'Transferencia interna',
      });

      showToast?.(`Transferencia registrada: ${qty} ${product.unidade}`);
    }

    setForm((prev) => ({ ...prev, quantidade: '', observacao: '', lote: '', validade: '' }));
  };

  const handlePhysicalInventory = () => {
    if (!inventoryCountProductId || !inventoryCountLocationId) {
      showToast?.('Selecione produto e local para inventario.');
      return;
    }

    const counted = Number(inventoryCountValue);
    if (!Number.isFinite(counted) || counted < 0) {
      showToast?.('Contagem fisica invalida.');
      return;
    }

    const current = getStock(inventoryCountProductId, inventoryCountLocationId);
    const diff = counted - current;

    if (diff === 0) {
      showToast?.('Sem divergencia. Estoque ja confere.');
      return;
    }

    appendMovement({
      id: movementId(),
      produtoId: inventoryCountProductId,
      tipo: 'AJUSTE',
      quantidade: diff,
      localOrigemId: inventoryCountLocationId,
      localDestinoId: null,
      dataHora: nowIso(),
      usuarioId: currentUser.id,
      observacao: `Inventario fisico: contado ${counted}, sistema ${current}`,
      suspeita: Math.abs(diff) >= 10,
    });

    showToast?.(`Divergencia corrigida automaticamente (${diff > 0 ? '+' : ''}${diff}).`);
    setInventoryCountValue('');
  };

  const filteredMovements = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    const from = filterFromDate ? new Date(filterFromDate).getTime() : null;
    const to = filterToDate ? new Date(`${filterToDate}T23:59:59`).getTime() : null;

    return movements.filter((movement) => {
      if (filterType !== 'TODOS' && movement.tipo !== filterType) return false;
      if (filterUser !== 'TODOS' && movement.usuarioId !== filterUser) return false;

      const timestamp = new Date(movement.dataHora).getTime();
      if (from && timestamp < from) return false;
      if (to && timestamp > to) return false;

      if (q) {
        const product = productMap.get(movement.produtoId);
        const user = userMap.get(movement.usuarioId);
        const locationFrom = movement.localOrigemId ? locationMap.get(movement.localOrigemId)?.nome : '';
        const locationTo = movement.localDestinoId ? locationMap.get(movement.localDestinoId)?.nome : '';
        const haystack = [
          movement.id,
          movement.tipo,
          movement.observacao,
          product?.nome || '',
          product?.sku || '',
          user?.nome || '',
          locationFrom || '',
          locationTo || '',
        ].join(' ').toLowerCase();

        if (!haystack.includes(q)) return false;
      }

      return true;
    });
  }, [movements, filterType, filterUser, filterFromDate, filterToDate, searchTerm, productMap, userMap, locationMap]);

  const productTimeline = useMemo(() => {
    if (!timelineProductId) return [] as InventoryMovement[];
    return movements.filter((movement) => movement.produtoId === timelineProductId);
  }, [movements, timelineProductId]);

  const exportMovementsCsv = () => {
    const header = 'id,produto,tipo,quantidade,origem,destino,dataHora,usuario,observacao';
    const rows = filteredMovements.map((movement) => {
      const product = productMap.get(movement.produtoId)?.nome || movement.produtoId;
      const origem = movement.localOrigemId ? locationMap.get(movement.localOrigemId)?.nome || movement.localOrigemId : '';
      const destino = movement.localDestinoId ? locationMap.get(movement.localDestinoId)?.nome || movement.localDestinoId : '';
      const user = userMap.get(movement.usuarioId)?.nome || movement.usuarioId;
      return `${movement.id},${product},${movement.tipo},${movement.quantidade},${origem},${destino},${movement.dataHora},${user},${String(movement.observacao || '').replaceAll(',', ' ')}`;
    });

    const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `estoque-movimentos-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
    showToast?.('CSV exportado.');
  };

  useEffect(() => {
    if (!pdvRealtimeEnabled) return;

    const intervalId = window.setInterval(() => {
      const locationId = 'loc-loja';
      const activeProducts = products.filter((product) => product.status === 'ATIVO');
      const randomProduct = activeProducts[Math.floor(Math.random() * activeProducts.length)];
      if (!randomProduct) return;

      const qty = 1;
      const canSell = canRunOutputMovement(randomProduct.id, locationId, qty);
      if (!canSell && autoBlockNoStock) return;

      appendMovement({
        id: movementId(),
        produtoId: randomProduct.id,
        tipo: 'SAIDA',
        quantidade: qty,
        localOrigemId: locationId,
        localDestinoId: null,
        dataHora: nowIso(),
        usuarioId: 'u-pdv',
        observacao: 'Integracao PDV: venda automatica simulada',
      });
    }, 9000);

    return () => window.clearInterval(intervalId);
  }, [pdvRealtimeEnabled, products, allowGlobalNegative, autoBlockNoStock, stockByProductLocation]);

  return (
    <div className="grid gap-5">
      <section className="rounded-2xl border border-white/10 bg-slate-900/70 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-black text-white">Estoque ERP</h1>
            <p className="mt-1 text-sm text-slate-400">
              Controle real por movimentacoes: entrada, saida, ajuste e transferencia entre locais.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setMovements(readSavedMovements())}
              className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-white/10"
            >
              <RefreshCw className="h-4 w-4" />
              Recarregar
            </button>
            <button
              type="button"
              onClick={exportMovementsCsv}
              className="inline-flex items-center gap-2 rounded-xl border border-emerald-400/35 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/20"
            >
              <Download className="h-4 w-4" />
              Exportar
            </button>
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          <article className="rounded-xl border border-white/10 bg-slate-950/50 p-3">
            <p className="text-xs uppercase tracking-wide text-slate-500">Total em estoque</p>
            <p className="mt-1 text-xl font-black text-cyan-200">{dashboardMetrics.totalUnits}</p>
          </article>
          <article className="rounded-xl border border-white/10 bg-slate-950/50 p-3">
            <p className="text-xs uppercase tracking-wide text-slate-500">Valor em estoque</p>
            <p className="mt-1 text-xl font-black text-emerald-300">{fmtBRL(dashboardMetrics.totalValue)}</p>
          </article>
          <article className="rounded-xl border border-white/10 bg-slate-950/50 p-3">
            <p className="text-xs uppercase tracking-wide text-slate-500">Baixo estoque</p>
            <p className="mt-1 text-xl font-black text-amber-300">{dashboardMetrics.lowStockProducts.length}</p>
          </article>
          <article className="rounded-xl border border-white/10 bg-slate-950/50 p-3">
            <p className="text-xs uppercase tracking-wide text-slate-500">Giro de estoque</p>
            <p className="mt-1 text-xl font-black text-fuchsia-300">{dashboardMetrics.giroEstoque}</p>
          </article>
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-5">
          <div className="mb-4 flex items-center justify-between gap-2">
            <h2 className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-slate-200">
              <Activity className="h-4 w-4 text-cyan-300" />
              Registrar movimentacao
            </h2>
            <select
              value={currentUserId}
              onChange={(event) => setCurrentUserId(event.target.value)}
              className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs text-slate-100 outline-none"
              style={{ colorScheme: 'dark' }}
            >
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.nome} ({user.role})
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <label className="text-xs text-slate-400">
              Produto
              <select
                value={form.produtoId}
                onChange={(event) => setForm((prev) => ({ ...prev, produtoId: event.target.value }))}
                className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950/50 px-3 py-2 text-sm text-slate-100 outline-none"
                style={{ colorScheme: 'dark' }}
              >
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.nome} ({product.sku})
                  </option>
                ))}
              </select>
            </label>

            <label className="text-xs text-slate-400">
              Tipo
              <select
                value={form.tipo}
                onChange={(event) => setForm((prev) => ({ ...prev, tipo: event.target.value as MoveType }))}
                className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950/50 px-3 py-2 text-sm text-slate-100 outline-none"
                style={{ colorScheme: 'dark' }}
              >
                <option value="ENTRADA">Entrada</option>
                <option value="SAIDA">Saida</option>
                <option value="AJUSTE">Ajuste</option>
                <option value="TRANSFERENCIA">Transferencia</option>
              </select>
            </label>

            <label className="text-xs text-slate-400">
              Quantidade
              <input
                value={form.quantidade}
                onChange={(event) => setForm((prev) => ({ ...prev, quantidade: event.target.value }))}
                className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950/50 px-3 py-2 text-sm text-slate-100 outline-none"
                placeholder="0"
                inputMode="numeric"
              />
            </label>

            <label className="text-xs text-slate-400">
              Local origem
              <select
                value={form.localOrigemId}
                onChange={(event) => setForm((prev) => ({ ...prev, localOrigemId: event.target.value }))}
                className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950/50 px-3 py-2 text-sm text-slate-100 outline-none"
                style={{ colorScheme: 'dark' }}
              >
                <option value="">Nao se aplica</option>
                {visibleLocations.map((location) => (
                  <option key={location.id} value={location.id}>
                    {location.nome}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-xs text-slate-400">
              Local destino
              <select
                value={form.localDestinoId}
                onChange={(event) => setForm((prev) => ({ ...prev, localDestinoId: event.target.value }))}
                className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950/50 px-3 py-2 text-sm text-slate-100 outline-none"
                style={{ colorScheme: 'dark' }}
              >
                <option value="">Nao se aplica</option>
                {visibleLocations.map((location) => (
                  <option key={location.id} value={location.id}>
                    {location.nome}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-xs text-slate-400">
              Observacao
              <input
                value={form.observacao}
                onChange={(event) => setForm((prev) => ({ ...prev, observacao: event.target.value }))}
                className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950/50 px-3 py-2 text-sm text-slate-100 outline-none"
                placeholder="Motivo da movimentacao"
              />
            </label>

            <label className="text-xs text-slate-400">
              Lote (opcional)
              <input
                value={form.lote}
                onChange={(event) => setForm((prev) => ({ ...prev, lote: event.target.value }))}
                className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950/50 px-3 py-2 text-sm text-slate-100 outline-none"
                placeholder="Lote"
              />
            </label>

            <label className="text-xs text-slate-400">
              Validade (opcional)
              <input
                value={form.validade}
                onChange={(event) => setForm((prev) => ({ ...prev, validade: event.target.value }))}
                className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950/50 px-3 py-2 text-sm text-slate-100 outline-none"
                placeholder="AAAA-MM-DD"
              />
            </label>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleSubmitMovement}
              className="rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 px-4 py-2 text-sm font-semibold text-white"
            >
              Registrar movimentacao
            </button>
            <button
              type="button"
              onClick={() => setForm((prev) => ({ ...prev, quantidade: '', observacao: '' }))}
              className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-200"
            >
              Limpar
            </button>
          </div>
        </div>

        <div className="space-y-5">
          <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-5">
            <h2 className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-slate-200">
              <ClipboardCheck className="h-4 w-4 text-emerald-300" />
              Inventario fisico
            </h2>
            <div className="mt-3 grid gap-2">
              <select
                value={inventoryCountProductId}
                onChange={(event) => setInventoryCountProductId(event.target.value)}
                className="rounded-xl border border-white/10 bg-slate-950/50 px-3 py-2 text-sm text-slate-100 outline-none"
                style={{ colorScheme: 'dark' }}
              >
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.nome}
                  </option>
                ))}
              </select>
              <select
                value={inventoryCountLocationId}
                onChange={(event) => setInventoryCountLocationId(event.target.value)}
                className="rounded-xl border border-white/10 bg-slate-950/50 px-3 py-2 text-sm text-slate-100 outline-none"
                style={{ colorScheme: 'dark' }}
              >
                {visibleLocations.map((location) => (
                  <option key={location.id} value={location.id}>
                    {location.nome}
                  </option>
                ))}
              </select>
              <input
                value={inventoryCountValue}
                onChange={(event) => setInventoryCountValue(event.target.value)}
                className="rounded-xl border border-white/10 bg-slate-950/50 px-3 py-2 text-sm text-slate-100 outline-none"
                placeholder="Contagem fisica"
                inputMode="numeric"
              />
              <button
                type="button"
                onClick={handlePhysicalInventory}
                className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-600"
              >
                Ajustar divergencia automaticamente
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-5">
            <h2 className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-slate-200">
              <Shield className="h-4 w-4 text-amber-300" />
              Regras avancadas
            </h2>
            <div className="mt-3 space-y-2 text-sm text-slate-300">
              <label className="flex items-center justify-between gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2">
                Permitir estoque negativo (global)
                <input
                  type="checkbox"
                  checked={allowGlobalNegative}
                  onChange={(event) => setAllowGlobalNegative(event.target.checked)}
                />
              </label>
              <label className="flex items-center justify-between gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2">
                Bloquear saida sem estoque
                <input
                  type="checkbox"
                  checked={autoBlockNoStock}
                  onChange={(event) => setAutoBlockNoStock(event.target.checked)}
                />
              </label>
              <label className="flex items-center justify-between gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2">
                Integracao PDV em tempo real
                <input
                  type="checkbox"
                  checked={pdvRealtimeEnabled}
                  onChange={(event) => setPdvRealtimeEnabled(event.target.checked)}
                />
              </label>
              <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-400">
                {canUseMultiLocations
                  ? 'Multi-loja habilitado para esta empresa. Transferencias entre locais liberadas para admin.'
                  : 'Modo loja unica: apenas o estoque da loja padrao fica visivel para usuarios comuns.'}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-5">
            <h2 className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-slate-200">
              <Bell className="h-4 w-4 text-rose-300" />
              Alertas inteligentes
            </h2>
            <div className="mt-3 space-y-2">
              {alerts.map((alert) => (
                <div
                  key={alert.id}
                  className={[
                    'rounded-lg border px-3 py-2 text-xs',
                    alert.level === 'danger'
                      ? 'border-rose-500/30 bg-rose-500/10 text-rose-200'
                      : alert.level === 'warn'
                        ? 'border-amber-500/30 bg-amber-500/10 text-amber-200'
                        : 'border-blue-500/30 bg-blue-500/10 text-blue-200',
                  ].join(' ')}
                >
                  {alert.text}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-slate-900/70 p-5">
        <h2 className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-slate-200">
          <Warehouse className="h-4 w-4 text-cyan-300" />
          Estoque por produto e local
        </h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[980px] text-sm">
            <thead>
              <tr className="text-xs uppercase tracking-wide text-slate-500">
                <th className="px-3 py-2 text-left">Produto</th>
                <th className="px-3 py-2 text-left">SKU / Codigo</th>
                <th className="px-3 py-2 text-left">Categoria</th>
                <th className="px-3 py-2 text-right">Preco venda</th>
                <th className="px-3 py-2 text-right">Custo</th>
                {visibleLocations.map((location) => (
                  <th key={location.id} className="px-3 py-2 text-right">{location.nome}</th>
                ))}
                <th className="px-3 py-2 text-right">Total</th>
                <th className="px-3 py-2 text-right">Status</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => {
                const byLocation = visibleLocations.map((location) => ({
                  locationId: location.id,
                  qty: getStock(product.id, location.id),
                }));
                const total = byLocation.reduce((sum, item) => sum + item.qty, 0);
                const low = total > 0 && total <= product.estoqueMinimo;
                const zero = total <= 0;

                return (
                  <tr key={product.id} className="border-t border-white/10">
                    <td className="px-3 py-3 font-semibold text-slate-100">{product.nome}</td>
                    <td className="px-3 py-3 text-slate-400">{product.sku} / {product.codigoBarras}</td>
                    <td className="px-3 py-3 text-slate-300">{product.categoria} - {product.marca}</td>
                    <td className="px-3 py-3 text-right text-slate-200">{fmtBRL(product.precoVenda)}</td>
                    <td className="px-3 py-3 text-right text-slate-400">{fmtBRL(product.custo)}</td>
                    {byLocation.map((item) => (
                      <td key={item.locationId} className="px-3 py-3 text-right text-slate-200">{item.qty}</td>
                    ))}
                    <td className="px-3 py-3 text-right font-bold text-cyan-200">{total}</td>
                    <td className="px-3 py-3 text-right">
                      <span
                        className={[
                          'rounded-full px-2 py-0.5 text-[10px] font-bold',
                          zero
                            ? 'bg-rose-500/20 text-rose-300'
                            : low
                              ? 'bg-amber-500/20 text-amber-300'
                              : 'bg-emerald-500/20 text-emerald-300',
                        ].join(' ')}
                      >
                        {zero ? 'ZERADO' : low ? 'BAIXO' : 'OK'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-slate-900/70 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-slate-200">
            <ArrowLeftRight className="h-4 w-4 text-cyan-300" />
            Historico de movimentacoes
          </h2>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
              <input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Buscar por produto, usuario, ID..."
                className="rounded-xl border border-white/10 bg-slate-950/50 py-1.5 pl-8 pr-3 text-xs text-slate-100 outline-none"
              />
            </div>

            <select
              value={filterType}
              onChange={(event) => setFilterType(event.target.value as MoveType | 'TODOS')}
              className="rounded-xl border border-white/10 bg-slate-950/50 px-2.5 py-1.5 text-xs text-slate-100 outline-none"
              style={{ colorScheme: 'dark' }}
            >
              <option value="TODOS">Todos tipos</option>
              <option value="ENTRADA">Entrada</option>
              <option value="SAIDA">Saida</option>
              <option value="AJUSTE">Ajuste</option>
              <option value="TRANSFERENCIA">Transferencia</option>
            </select>

            <select
              value={filterUser}
              onChange={(event) => setFilterUser(event.target.value)}
              className="rounded-xl border border-white/10 bg-slate-950/50 px-2.5 py-1.5 text-xs text-slate-100 outline-none"
              style={{ colorScheme: 'dark' }}
            >
              <option value="TODOS">Todos usuarios</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>{user.nome}</option>
              ))}
            </select>

            <input
              type="date"
              value={filterFromDate}
              onChange={(event) => setFilterFromDate(event.target.value)}
              className="rounded-xl border border-white/10 bg-slate-950/50 px-2.5 py-1.5 text-xs text-slate-100 outline-none"
            />
            <input
              type="date"
              value={filterToDate}
              onChange={(event) => setFilterToDate(event.target.value)}
              className="rounded-xl border border-white/10 bg-slate-950/50 px-2.5 py-1.5 text-xs text-slate-100 outline-none"
            />
          </div>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[980px] text-xs">
            <thead>
              <tr className="text-[11px] uppercase tracking-wide text-slate-500">
                <th className="px-3 py-2 text-left">ID</th>
                <th className="px-3 py-2 text-left">Produto</th>
                <th className="px-3 py-2 text-left">Tipo</th>
                <th className="px-3 py-2 text-right">Qtd</th>
                <th className="px-3 py-2 text-left">Origem</th>
                <th className="px-3 py-2 text-left">Destino</th>
                <th className="px-3 py-2 text-left">Usuario</th>
                <th className="px-3 py-2 text-left">Data/Hora</th>
                <th className="px-3 py-2 text-left">Observacao</th>
              </tr>
            </thead>
            <tbody>
              {filteredMovements.map((movement) => {
                const product = productMap.get(movement.produtoId);
                const from = movement.localOrigemId ? locationMap.get(movement.localOrigemId)?.nome : '-';
                const to = movement.localDestinoId ? locationMap.get(movement.localDestinoId)?.nome : '-';
                const user = userMap.get(movement.usuarioId)?.nome || movement.usuarioId;

                return (
                  <motion.tr
                    key={movement.id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="border-t border-white/10"
                  >
                    <td className="px-3 py-2 font-mono text-slate-400">{movement.id.slice(-8).toUpperCase()}</td>
                    <td className="px-3 py-2 text-slate-200">{product?.nome || movement.produtoId}</td>
                    <td className="px-3 py-2">
                      <span
                        className={[
                          'rounded-full px-2 py-0.5 font-semibold',
                          movement.tipo === 'ENTRADA'
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : movement.tipo === 'SAIDA'
                              ? 'bg-rose-500/20 text-rose-300'
                              : movement.tipo === 'AJUSTE'
                                ? 'bg-amber-500/20 text-amber-300'
                                : 'bg-cyan-500/20 text-cyan-300',
                        ].join(' ')}
                      >
                        {movement.tipo}
                      </span>
                    </td>
                    <td className={[
                      'px-3 py-2 text-right font-bold',
                      movement.tipo === 'SAIDA' ? 'text-rose-300' : 'text-emerald-300',
                    ].join(' ')}>
                      {movement.tipo === 'SAIDA' ? '-' : movement.tipo === 'AJUSTE' && movement.quantidade < 0 ? '' : '+'}
                      {movement.quantidade}
                    </td>
                    <td className="px-3 py-2 text-slate-400">{from || '-'}</td>
                    <td className="px-3 py-2 text-slate-400">{to || '-'}</td>
                    <td className="px-3 py-2 text-slate-300">{user}</td>
                    <td className="px-3 py-2 text-slate-400">{fmtDate(movement.dataHora)}</td>
                    <td className="px-3 py-2 text-slate-400">{movement.observacao || '-'}</td>
                  </motion.tr>
                );
              })}
              {!filteredMovements.length ? (
                <tr>
                  <td colSpan={9} className="px-3 py-10 text-center text-slate-500">
                    Nenhuma movimentacao encontrada para os filtros.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-5">
          <h2 className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-slate-200">
            <BarChart3 className="h-4 w-4 text-violet-300" />
            Produtos mais movimentados
          </h2>
          <div className="mt-4 space-y-3">
            {dashboardMetrics.mostMoved.map((row, index) => {
              const product = productMap.get(row.productId);
              if (!product) return null;
              const max = dashboardMetrics.mostMoved[0]?.qty || 1;
              const width = `${Math.max(10, (row.qty / max) * 100)}%`;

              return (
                <div key={row.productId}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="text-slate-300">#{index + 1} {product.nome}</span>
                    <span className="font-bold text-cyan-200">{row.qty} mov</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-800">
                    <div className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-500" style={{ width }} />
                  </div>
                </div>
              );
            })}
            {!dashboardMetrics.mostMoved.length ? (
              <p className="text-sm text-slate-500">Sem movimentacoes suficientes.</p>
            ) : null}
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-5">
          <h2 className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-slate-200">
            <Cpu className="h-4 w-4 text-emerald-300" />
            Linha do tempo por produto
          </h2>

          <div className="mt-3 flex gap-2">
            <select
              value={timelineProductId}
              onChange={(event) => setTimelineProductId(event.target.value)}
              className="w-full rounded-xl border border-white/10 bg-slate-950/50 px-3 py-2 text-sm text-slate-100 outline-none"
              style={{ colorScheme: 'dark' }}
            >
              <option value="">Selecione um produto</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>{product.nome}</option>
              ))}
            </select>
          </div>

          <div className="mt-4 max-h-[280px] space-y-2 overflow-auto pr-1">
            {productTimeline.map((movement) => {
              const origin = movement.localOrigemId ? locationMap.get(movement.localOrigemId)?.nome : null;
              const destination = movement.localDestinoId ? locationMap.get(movement.localDestinoId)?.nome : null;
              const user = userMap.get(movement.usuarioId)?.nome || movement.usuarioId;

              return (
                <div key={movement.id} className="rounded-lg border border-white/10 bg-slate-950/50 p-3">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="font-semibold text-slate-200">{movement.tipo}</span>
                    <span className="text-slate-500">{fmtDate(movement.dataHora)}</span>
                  </div>
                  <p className="mt-1 text-sm text-slate-300">Qtd: {movement.quantidade}</p>
                  <p className="text-xs text-slate-500">Origem: {origin || '-'} | Destino: {destination || '-'}</p>
                  <p className="text-xs text-slate-500">Usuario: {user}</p>
                  <p className="text-xs text-slate-400">{movement.observacao}</p>
                </div>
              );
            })}
            {!productTimeline.length ? (
              <p className="text-sm text-slate-500">Selecione um produto para ver a timeline.</p>
            ) : null}
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-slate-900/70 p-5">
        <h2 className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-slate-200">
          <Package className="h-4 w-4 text-cyan-300" />
          Catalogo base de produtos
        </h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {products.map((product) => (
            <article key={product.id} className="rounded-xl border border-white/10 bg-slate-950/50 p-3">
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-sm font-bold text-slate-100">{product.nome}</h3>
                <span className={[
                  'rounded-full px-2 py-0.5 text-[10px] font-bold',
                  product.status === 'ATIVO' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-500/25 text-slate-300',
                ].join(' ')}>
                  {product.status}
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-500">ID: {product.id}</p>
              <p className="text-xs text-slate-400">SKU: {product.sku} | Barras: {product.codigoBarras}</p>
              <p className="text-xs text-slate-400">Categoria: {product.categoria} | Marca: {product.marca}</p>
              <p className="text-xs text-slate-400">Unidade: {product.unidade}</p>
              <p className="mt-2 text-xs text-slate-300">Venda: {fmtBRL(product.precoVenda)} | Custo: {fmtBRL(product.custo)}</p>
              <div className="mt-2 flex flex-wrap gap-1.5 text-[10px]">
                <span className="rounded bg-cyan-500/20 px-2 py-0.5 text-cyan-300">Min: {product.estoqueMinimo}</span>
                <span className="rounded bg-fuchsia-500/20 px-2 py-0.5 text-fuchsia-300">Negativo: {product.permiteNegativo ? 'Sim' : 'Nao'}</span>
                <span className="rounded bg-amber-500/20 px-2 py-0.5 text-amber-300">Lote: {product.controleLote ? 'Sim' : 'Nao'}</span>
                <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-emerald-300">Validade: {product.controleValidade ? 'Sim' : 'Nao'}</span>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-slate-900/70 p-5">
        <h2 className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-slate-200">
          <Warehouse className="h-4 w-4 text-emerald-300" />
          Locais multi-estoque
        </h2>
        {isSystemAdmin ? (
          <div className="mt-4 grid gap-2 rounded-xl border border-white/10 bg-slate-950/50 p-3 md:grid-cols-[1.2fr_1fr_auto]">
            <input
              value={newLocationName}
              onChange={(event) => setNewLocationName(event.target.value)}
              className="rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 outline-none"
              placeholder="Nome do novo local"
            />
            <select
              value={newLocationType}
              onChange={(event) => setNewLocationType(event.target.value as LocationType)}
              className="rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 outline-none"
              style={{ colorScheme: 'dark' }}
            >
              <option value="LOJA">Loja</option>
              <option value="DEPOSITO">Deposito</option>
              <option value="FILIAL">Filial</option>
            </select>
            <button
              type="button"
              onClick={handleCreateLocation}
              className="rounded-xl bg-cyan-600 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-500"
            >
              Criar local
            </button>
          </div>
        ) : null}
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {visibleLocations.map((location) => (
            <article key={location.id} className="rounded-xl border border-white/10 bg-slate-950/50 p-3">
              <h3 className="text-sm font-bold text-slate-100">{location.nome}</h3>
              <p className="mt-1 text-xs text-slate-500">Tipo: {location.tipo}</p>
              <p className="text-xs text-slate-500">ID: {location.id}</p>
              <p className="mt-2 text-xs text-slate-400">Status: {location.ativo ? 'Ativo' : 'Inativo'}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-slate-900/70 p-4 text-xs text-slate-400">
        <p>
          Usuario atual: <strong className="text-slate-200">{currentUser.nome}</strong> ({currentUser.role})
        </p>
        <p className="mt-1">
          Permissoes simuladas: Admin (tudo), Operador (movimentar), Auditor (inventario/ajuste). Estrutura pronta para backend real com API REST e WebSocket.
        </p>
      </section>
    </div>
  );
}
