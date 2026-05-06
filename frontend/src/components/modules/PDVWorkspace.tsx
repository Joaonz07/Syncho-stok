// ============================================================
// PDVWorkspace.tsx — SYNCHO PDV Professional
// Sistema completo de Ponto de Venda
// ============================================================

import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  SHARED_PRODUCTS_UPDATED_EVENT,
  SHARED_STOCK_UPDATED_EVENT,
  dispatchSharedEvent,
  readSharedProducts,
  readSharedStockMovements,
  writeSharedStockMovements,
} from '../../lib/synchoSharedData';
import {
  ShoppingCart,
  Search,
  Package,
  Minus,
  Plus,
  X,
  Check,
  AlertTriangle,
  Wifi,
  WifiOff,
  Monitor,
  History,
  BarChart3,
  Store,
  Printer,
  RefreshCw,
  TrendingUp,
  Clock,
  DollarSign,
  Activity,
  Zap,
  Download,
  ReceiptText,
  Eye,
} from 'lucide-react';
import HelpIntroCard from '../help/HelpIntroCard';
import HelpTooltip from '../help/HelpTooltip';
import { registerHelpVisit } from '../../lib/helpProgress';

// ─── TYPES ──────────────────────────────────────────────────

type Category = string;

type Product = {
  id: string;
  nome: string;
  codigo: string;
  preco: number;
  estoque: number;
  categoria: Category;
  estoqueMinimo: number;
};

type CartItem = {
  produto: Product;
  quantidade: number;
  desconto: number;
};

type PaymentMethod = 'dinheiro' | 'cartao' | 'pix';

type SaleStatus = 'pending' | 'synced' | 'failed';

type SaleRecord = {
  id: string;
  data: string;
  itens: Array<{ produtoId: string; nome: string; quantidade: number; precoUnitario: number }>;
  subtotal: number;
  desconto: number;
  total: number;
  formaPagamento: PaymentMethod;
  valorRecebido: number;
  troco: number;
  status: SaleStatus;
  operador: string;
  caixa: string;
};

type RegisterStatus = 'online' | 'offline' | 'idle';

type Register = {
  id: string;
  nome: string;
  operador: string;
  authorizationCode: string;
  status: RegisterStatus;
  ultimaVenda?: string;
  abertura?: string;
  fechamento?: string;
  fundoAbertura?: number;
  vendasHoje: number;
  totalHoje: number;
};

type CartAction =
  | { type: 'ADD'; produto: Product }
  | { type: 'REMOVE'; produtoId: string }
  | { type: 'INCREMENT'; produtoId: string }
  | { type: 'DECREMENT'; produtoId: string }
  | { type: 'CLEAR' };

type PdvTab = 'venda' | 'historico' | 'relatorios' | 'multicaixa' | 'ia';

// ─── MOCK DATA ───────────────────────────────────────────────

const MOCK_PRODUCTS: Product[] = [
  { id: 'p01', nome: 'Arroz Integral 5kg', codigo: '7891000010', preco: 32.9, estoque: 48, categoria: 'alimentos', estoqueMinimo: 10 },
  { id: 'p02', nome: 'Feijão Carioca 1kg', codigo: '7891000020', preco: 9.8, estoque: 63, categoria: 'alimentos', estoqueMinimo: 15 },
  { id: 'p03', nome: 'Macarrão Espaguete 500g', codigo: '7891000030', preco: 4.5, estoque: 120, categoria: 'alimentos', estoqueMinimo: 20 },
  { id: 'p04', nome: 'Azeite de Oliva 500ml', codigo: '7891000040', preco: 28.9, estoque: 22, categoria: 'alimentos', estoqueMinimo: 5 },
  { id: 'p05', nome: 'Biscoito Recheado 130g', codigo: '7891000050', preco: 5.5, estoque: 92, categoria: 'alimentos', estoqueMinimo: 20 },
  { id: 'p06', nome: 'Leite Integral 1L', codigo: '7891000060', preco: 6.2, estoque: 60, categoria: 'bebidas', estoqueMinimo: 20 },
  { id: 'p07', nome: 'Café Torrado Moído 500g', codigo: '7891000070', preco: 18.5, estoque: 35, categoria: 'bebidas', estoqueMinimo: 10 },
  { id: 'p08', nome: 'Refrigerante Cola 2L', codigo: '7891000080', preco: 8.9, estoque: 72, categoria: 'bebidas', estoqueMinimo: 20 },
  { id: 'p09', nome: 'Água Mineral 500ml', codigo: '7891000090', preco: 2.5, estoque: 144, categoria: 'bebidas', estoqueMinimo: 30 },
  { id: 'p10', nome: 'Suco de Laranja 1L', codigo: '7891000100', preco: 12.9, estoque: 4, categoria: 'bebidas', estoqueMinimo: 10 },
  { id: 'p11', nome: 'Detergente Líquido 500ml', codigo: '7891000110', preco: 3.2, estoque: 88, categoria: 'limpeza', estoqueMinimo: 20 },
  { id: 'p12', nome: 'Sabão em Pó 1kg', codigo: '7891000120', preco: 14.9, estoque: 41, categoria: 'limpeza', estoqueMinimo: 10 },
  { id: 'p13', nome: 'Desinfetante 750ml', codigo: '7891000130', preco: 6.8, estoque: 2, categoria: 'limpeza', estoqueMinimo: 8 },
  { id: 'p14', nome: 'Esponja de Limpeza 3un', codigo: '7891000140', preco: 4.9, estoque: 55, categoria: 'limpeza', estoqueMinimo: 15 },
  { id: 'p15', nome: 'Shampoo Suave 400ml', codigo: '7891000150', preco: 19.9, estoque: 27, categoria: 'higiene', estoqueMinimo: 8 },
  { id: 'p16', nome: 'Condicionador 400ml', codigo: '7891000160', preco: 21.5, estoque: 19, categoria: 'higiene', estoqueMinimo: 8 },
  { id: 'p17', nome: 'Creme Dental 90g', codigo: '7891000170', preco: 7.9, estoque: 56, categoria: 'higiene', estoqueMinimo: 15 },
  { id: 'p18', nome: 'Papel Higiênico 12un', codigo: '7891000180', preco: 24.9, estoque: 38, categoria: 'higiene', estoqueMinimo: 10 },
  { id: 'p19', nome: 'Queijo Mussarela kg', codigo: '7891000190', preco: 42.0, estoque: 8, categoria: 'alimentos', estoqueMinimo: 3 },
  { id: 'p20', nome: 'Chocolate ao Leite 80g', codigo: '7891000200', preco: 8.9, estoque: 0, categoria: 'outros', estoqueMinimo: 10 },
  { id: 'p21', nome: 'Manteiga com Sal 200g', codigo: '7891000210', preco: 11.9, estoque: 33, categoria: 'alimentos', estoqueMinimo: 8 },
  { id: 'p22', nome: 'Iogurte Natural 170g', codigo: '7891000220', preco: 3.8, estoque: 42, categoria: 'bebidas', estoqueMinimo: 10 },
];

const INITIAL_REGISTERS: Register[] = [
  // Inicia vazio para evitar dados fictícios em produção.
];

// ─── HELPERS ─────────────────────────────────────────────────

const fmtBRL = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(v) || 0);

const fmtDate = (iso: string) =>
  new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));

const fmtTime = (iso: string) =>
  new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(new Date(iso));

const genId = () => `v-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

const SALES_KEY = 'syncho_pdv_sales_v2';
const QUEUE_KEY = 'syncho_pdv_queue_v2';
const PDV_LOCATION_ID = 'loc-loja';
const PDV_OPERATOR_ID = 'u-pdv';

type StockMove = {
  id: string;
  produtoId: string;
  tipo: 'ENTRADA' | 'SAIDA' | 'AJUSTE' | 'TRANSFERENCIA';
  quantidade: number;
  localOrigemId: string | null;
  localDestinoId: string | null;
  dataHora: string;
  usuarioId: string;
  observacao: string;
};

function calculateStockByProductLocation(movements: StockMove[]) {
  const map = new Map<string, number>();
  const keyOf = (productId: string, locationId: string) => `${productId}::${locationId}`;
  const processedMovements = new Set<string>();

  for (const movement of movements) {
    const movementId = String(movement.id || '').trim();
    if (!movementId || processedMovements.has(movementId)) {
      continue;
    }
    processedMovements.add(movementId);

    const quantity = Number(movement.quantidade || 0);
    if (!Number.isFinite(quantity) || quantity === 0) {
      continue;
    }

    if (movement.tipo === 'ENTRADA' && movement.localDestinoId) {
      const key = keyOf(movement.produtoId, movement.localDestinoId);
      map.set(key, Number(map.get(key) || 0) + quantity);
    }

    if (movement.tipo === 'SAIDA' && movement.localOrigemId) {
      const key = keyOf(movement.produtoId, movement.localOrigemId);
      map.set(key, Number(map.get(key) || 0) - quantity);
    }

    if (movement.tipo === 'AJUSTE') {
      const locationId = movement.localOrigemId || movement.localDestinoId;
      if (!locationId) continue;
      const key = keyOf(movement.produtoId, locationId);
      map.set(key, Number(map.get(key) || 0) + quantity);
    }

    if (movement.tipo === 'TRANSFERENCIA' && movement.localOrigemId && movement.localDestinoId) {
      const fromKey = keyOf(movement.produtoId, movement.localOrigemId);
      const toKey = keyOf(movement.produtoId, movement.localDestinoId);
      map.set(fromKey, Number(map.get(fromKey) || 0) - quantity);
      map.set(toKey, Number(map.get(toKey) || 0) + quantity);
    }
  }

  return map;
}

function normalizeCategory(value: string) {
  const normalized = String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();

  return normalized || 'outros';
}

function buildProductsFromShared(): Product[] {
  const shared = readSharedProducts().filter((item) => item.enabledInPDV !== false);

  if (!shared.length) {
    return import.meta.env.DEV ? MOCK_PRODUCTS : [];
  }

  const movements = readSharedStockMovements() as StockMove[];
  const stockMap = calculateStockByProductLocation(movements);
  const touchedProducts = new Set(movements.map((movement) => String(movement.produtoId || '').trim()));

  return shared.map((item) => {
    const productId = String(item.id || '').trim();
    const byMovements = Number(stockMap.get(`${productId}::${PDV_LOCATION_ID}`) || 0);
    const fallbackQuantity = Math.max(0, Math.floor(Number(item.quantity || 0)));

    return {
      id: productId,
      nome: String(item.name || '').trim() || 'Produto',
      codigo: String(item.barcode || item.code || item.sku || productId).trim(),
      preco: Number(item.price || 0),
      estoque: touchedProducts.has(productId) ? Math.max(0, byMovements) : fallbackQuantity,
      categoria: normalizeCategory(String(item.category || 'outros')),
      estoqueMinimo: 5,
    };
  });
}

function readLS<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeLS(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch { /* storage quota */ }
}

// ─── CART REDUCER ────────────────────────────────────────────

function cartReducer(state: CartItem[], action: CartAction): CartItem[] {
  switch (action.type) {
    case 'ADD': {
      const found = state.find((i) => i.produto.id === action.produto.id);
      if (found) {
        return state.map((i) =>
          i.produto.id === action.produto.id
            ? { ...i, quantidade: Math.min(i.quantidade + 1, action.produto.estoque) }
            : i,
        );
      }
      return [...state, { produto: action.produto, quantidade: 1, desconto: 0 }];
    }
    case 'INCREMENT':
      return state.map((i) =>
        i.produto.id === action.produtoId
          ? { ...i, quantidade: Math.min(i.quantidade + 1, i.produto.estoque) }
          : i,
      );
    case 'DECREMENT':
      return state
        .map((i) =>
          i.produto.id === action.produtoId ? { ...i, quantidade: i.quantidade - 1 } : i,
        )
        .filter((i) => i.quantidade > 0);
    case 'REMOVE':
      return state.filter((i) => i.produto.id !== action.produtoId);
    case 'CLEAR':
      return [];
    default:
      return state;
  }
}

// ─── COMPONENT ───────────────────────────────────────────────

type PDVWorkspaceProps = {
  showToast?: (msg: string) => void;
};

export default function PDVWorkspace({ showToast }: PDVWorkspaceProps) {
  // ── Core state ─────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<PdvTab>('venda');
  const [cart, dispatch] = useReducer(cartReducer, []);
  const [products, setProducts] = useState<Product[]>(() => buildProductsFromShared());
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<Category>('todos');
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentModal, setPaymentModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('pix');
  const [valorRecebido, setValorRecebido] = useState('');
  const [saleSuccess, setSaleSuccess] = useState(false);
  const [lastReceipt, setLastReceipt] = useState<SaleRecord | null>(null);
  const [receiptModal, setReceiptModal] = useState(false);
  const [salesHistory, setSalesHistory] = useState<SaleRecord[]>(() =>
    readLS<SaleRecord[]>(SALES_KEY, []),
  );
  const [offlineQueue, setOfflineQueue] = useState<SaleRecord[]>(() =>
    readLS<SaleRecord[]>(QUEUE_KEY, []),
  );
  const [registers, setRegisters] = useState<Register[]>(INITIAL_REGISTERS);
  const [activeRegisterId, setActiveRegisterId] = useState<string>(INITIAL_REGISTERS[0]?.id || '');
  const [newRegisterName, setNewRegisterName] = useState('');
  const [newRegisterOperator, setNewRegisterOperator] = useState('');
  const [newRegisterAuthorization, setNewRegisterAuthorization] = useState('');
  const [openingAmount, setOpeningAmount] = useState('100');
  const [historySearch, setHistorySearch] = useState('');
  const [historyMethod, setHistoryMethod] = useState<PaymentMethod | 'todos'>('todos');
  const [showHelpCard, setShowHelpCard] = useState(true);

  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const visits = registerHelpVisit('workspace:pdv');
    setShowHelpCard(visits <= 2);
  }, []);

  const activeRegister = useMemo(
    () => registers.find((register) => register.id === activeRegisterId) || null,
    [registers, activeRegisterId],
  );

  const createRegister = () => {
    const registerName = newRegisterName.trim();
    const operatorName = newRegisterOperator.trim();
    const authorizationCode = newRegisterAuthorization.trim();

    if (!registerName || !operatorName || !authorizationCode) {
      showToast?.('Informe nome do caixa, operador e codigo de autorizacao.');
      return;
    }

    if (authorizationCode.length < 4) {
      showToast?.('Use um codigo de autorizacao com pelo menos 4 caracteres.');
      return;
    }

    const createdId = `cx-${Date.now().toString().slice(-6)}`;
    const openingCash = Math.max(0, Number(openingAmount || 0));

    setRegisters((prev) => [
      {
        id: createdId,
        nome: registerName,
        operador: operatorName,
        authorizationCode,
        status: 'idle',
        fundoAbertura: openingCash,
        vendasHoje: 0,
        totalHoje: 0,
      },
      ...prev,
    ]);
    if (!activeRegisterId) {
      setActiveRegisterId(createdId);
    }
    setNewRegisterName('');
    setNewRegisterOperator('');
    setNewRegisterAuthorization('');
    setOpeningAmount('100');
    showToast?.('Caixa criado. Use autorizacao para abrir.');
  };

  const openRegister = (registerId: string) => {
    const target = registers.find((register) => register.id === registerId) || null;
    if (!target) {
      return;
    }

    if (!String(target.nome || '').trim() || !String(target.operador || '').trim()) {
      showToast?.('Nao e permitido abrir caixa sem nome e operador.');
      return;
    }

    const providedCode = window.prompt(`Autorize a abertura do ${target.nome} com o codigo do caixa:`) || '';
    if (String(providedCode).trim() !== String(target.authorizationCode || '').trim()) {
      showToast?.('Codigo de autorizacao invalido.');
      return;
    }

    setRegisters((prev) => prev.map((register) => {
      if (register.id !== registerId) {
        return register;
      }

      return {
        ...register,
        status: 'online',
        abertura: new Date().toISOString(),
        fechamento: undefined,
        fundoAbertura: Number(register.fundoAbertura || 0),
        operador: register.operador,
      };
    }));
    setActiveRegisterId(registerId);
    showToast?.('Caixa aberto com autorizacao.');
  };

  const closeRegister = (registerId: string) => {
    setRegisters((prev) => prev.map((register) => {
      if (register.id !== registerId) {
        return register;
      }

      return {
        ...register,
        status: 'idle',
        fechamento: new Date().toISOString(),
      };
    }));
    showToast?.('Caixa fechado.');
  };

  const refreshSharedProducts = useCallback((source?: string) => {
    if (source === 'pdv') {
      return;
    }

    setProducts(buildProductsFromShared());
  }, []);

  useEffect(() => {
    const onProductsUpdated = () => {
      refreshSharedProducts();
    };

    const onStockUpdated = (event: Event) => {
      const detail = (event as CustomEvent<{ source?: string }>).detail;
      refreshSharedProducts(detail?.source);
    };

    const onStorage = () => {
      refreshSharedProducts();
    };

    window.addEventListener(SHARED_PRODUCTS_UPDATED_EVENT, onProductsUpdated);
    window.addEventListener(SHARED_STOCK_UPDATED_EVENT, onStockUpdated);
    window.addEventListener('storage', onStorage);

    return () => {
      window.removeEventListener(SHARED_PRODUCTS_UPDATED_EVENT, onProductsUpdated);
      window.removeEventListener(SHARED_STOCK_UPDATED_EVENT, onStockUpdated);
      window.removeEventListener('storage', onStorage);
    };
  }, [refreshSharedProducts]);

  // ── Computed ───────────────────────────────────────────────
  const cartSubtotal = useMemo(
    () => cart.reduce((s, i) => s + i.produto.preco * i.quantidade, 0),
    [cart],
  );
  const cartDiscount = useMemo(
    () => cart.reduce((s, i) => s + (i.produto.preco * i.quantidade * i.desconto) / 100, 0),
    [cart],
  );
  const cartTotal = useMemo(() => cartSubtotal - cartDiscount, [cartSubtotal, cartDiscount]);

  const troco = useMemo(() => {
    const recv = parseFloat(valorRecebido.replace(',', '.')) || 0;
    return Math.max(0, recv - cartTotal);
  }, [valorRecebido, cartTotal]);

  const filteredProducts = useMemo(() => {
    let list = category === 'todos' ? products : products.filter((p) => p.categoria === category);
    const q = search.trim().toLowerCase();
    if (q) list = list.filter((p) => p.nome.toLowerCase().includes(q) || p.codigo.includes(q));
    return list;
  }, [products, search, category]);

  const criticalStock = useMemo(
    () => products.filter((p) => p.estoque > 0 && p.estoque <= p.estoqueMinimo),
    [products],
  );
  const outOfStock = useMemo(() => products.filter((p) => p.estoque === 0), [products]);

  // ── Network events ─────────────────────────────────────────
  useEffect(() => {
    const goOnline = () => {
      setIsOnline(true);
      if (offlineQueue.length > 0) {
        setTimeout(() => {
          setSalesHistory((prev) => {
            const synced = offlineQueue.map((s) => ({ ...s, status: 'synced' as SaleStatus }));
            const updated = [...synced, ...prev];
            writeLS(SALES_KEY, updated);
            return updated;
          });
          setOfflineQueue([]);
          writeLS(QUEUE_KEY, []);
          showToast?.(`✅ ${offlineQueue.length} venda(s) offline sincronizadas!`);
        }, 1200);
      }
    };
    const goOffline = () => setIsOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, [offlineQueue, showToast]);

  // ── Auto-focus on venda tab ────────────────────────────────
  useEffect(() => {
    if (activeTab === 'venda') {
      const t = setTimeout(() => searchRef.current?.focus(), 80);
      return () => clearTimeout(t);
    }
  }, [activeTab]);

  // ── Barcode / Enter to add ─────────────────────────────────
  const handleSearchKey = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        const exact = filteredProducts.find(
          (p) =>
            p.codigo === search.trim() ||
            p.nome.toLowerCase() === search.trim().toLowerCase(),
        );
        const target = exact ?? (filteredProducts.length === 1 ? filteredProducts[0] : null);
        if (!target) return;
        if (target.estoque === 0) {
          showToast?.(`⚠️ Sem estoque: ${target.nome}`);
          return;
        }
        dispatch({ type: 'ADD', produto: target });
        setSearch('');
        showToast?.(`✅ ${target.nome} adicionado`);
      }
      if (e.key === 'Escape') setSearch('');
    },
    [filteredProducts, search, showToast],
  );

  // ── Finalize sale ──────────────────────────────────────────
  const finalizeSale = useCallback(async () => {
    if (!cart.length) return;

    if (!activeRegister || activeRegister.status !== 'online') {
      showToast?.('Selecione um caixa aberto antes de finalizar a venda.');
      return;
    }

    if (!String(activeRegister.operador || '').trim()) {
      showToast?.('Defina um operador para o caixa ativo.');
      return;
    }

    for (const line of cart) {
      const product = products.find((item) => item.id === line.produto.id);
      if (!product || line.quantidade > product.estoque) {
        showToast?.(`⚠️ Estoque insuficiente para ${line.produto.nome}`);
        return;
      }
    }

    setIsProcessing(true);

    const record: SaleRecord = {
      id: genId(),
      data: new Date().toISOString(),
      itens: cart.map((i) => ({
        produtoId: i.produto.id,
        nome: i.produto.nome,
        quantidade: i.quantidade,
        precoUnitario: i.produto.preco,
      })),
      subtotal: cartSubtotal,
      desconto: cartDiscount,
      total: cartTotal,
      formaPagamento: paymentMethod,
      valorRecebido:
        paymentMethod === 'dinheiro'
          ? parseFloat(valorRecebido.replace(',', '.')) || cartTotal
          : cartTotal,
      troco: paymentMethod === 'dinheiro' ? troco : 0,
      status: isOnline ? 'synced' : 'pending',
      operador: activeRegister.operador,
      caixa: activeRegister.nome,
    };

    await new Promise<void>((r) => setTimeout(r, 700));

    const now = new Date().toISOString();
    const stockMovements = readSharedStockMovements() as StockMove[];
    const saleMovements: StockMove[] = cart.map((line) => ({
      id: `mv-pdv-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      produtoId: line.produto.id,
      tipo: 'SAIDA',
      quantidade: line.quantidade,
      localOrigemId: PDV_LOCATION_ID,
      localDestinoId: null,
      dataHora: now,
      usuarioId: PDV_OPERATOR_ID,
      observacao: `PDV venda ${record.id}`,
    }));

    writeSharedStockMovements([...saleMovements, ...stockMovements]);
    dispatchSharedEvent(SHARED_STOCK_UPDATED_EVENT, { source: 'pdv' });
    setProducts(buildProductsFromShared());

    if (isOnline) {
      setSalesHistory((prev) => {
        const updated = [record, ...prev];
        writeLS(SALES_KEY, updated);
        return updated;
      });
    } else {
      setOfflineQueue((prev) => {
        const updated = [record, ...prev];
        writeLS(QUEUE_KEY, updated);
        return updated;
      });
    }

    setRegisters((prev) =>
      prev.map((r) =>
        r.id === activeRegister.id
          ? {
              ...r,
              vendasHoje: r.vendasHoje + 1,
              totalHoje: r.totalHoje + cartTotal,
              ultimaVenda: new Date().toISOString(),
            }
          : r,
      ),
    );

    setLastReceipt(record);
    dispatch({ type: 'CLEAR' });
    setPaymentModal(false);
    setSaleSuccess(true);
    setIsProcessing(false);
    setValorRecebido('');
    setTimeout(() => setSaleSuccess(false), 3500);

    showToast?.(
      isOnline
        ? `✅ Venda de ${fmtBRL(cartTotal)} finalizada!`
        : `📦 Venda de ${fmtBRL(cartTotal)} salva offline`,
    );
  }, [cart, activeRegister, products, cartSubtotal, cartDiscount, cartTotal, paymentMethod, valorRecebido, troco, isOnline, showToast]);

  // ── Reports ────────────────────────────────────────────────
  const todaySales = useMemo(() => {
    const today = new Date().toDateString();
    return salesHistory.filter((s) => new Date(s.data).toDateString() === today);
  }, [salesHistory]);

  const todayTotal = useMemo(() => todaySales.reduce((a, s) => a + s.total, 0), [todaySales]);
  const avgTicket = useMemo(
    () => (todaySales.length ? todayTotal / todaySales.length : 0),
    [todaySales, todayTotal],
  );

  const topProducts = useMemo(() => {
    const map = new Map<string, { nome: string; quantidade: number; total: number }>();
    for (const sale of salesHistory) {
      for (const item of sale.itens) {
        const cur = map.get(item.produtoId) ?? { nome: item.nome, quantidade: 0, total: 0 };
        map.set(item.produtoId, {
          nome: item.nome,
          quantidade: cur.quantidade + item.quantidade,
          total: cur.total + item.quantidade * item.precoUnitario,
        });
      }
    }
    return [...map.values()].sort((a, b) => b.quantidade - a.quantidade).slice(0, 5);
  }, [salesHistory]);

  const payBreakdown = useMemo(() => {
    const b = { dinheiro: 0, cartao: 0, pix: 0 };
    for (const s of todaySales) b[s.formaPagamento] += s.total;
    return b;
  }, [todaySales]);

  // ── AI Insights ────────────────────────────────────────────
  const aiInsights = useMemo(() => {
    const out: Array<{ type: 'success' | 'warning' | 'danger' | 'info'; title: string; desc: string }> = [];

    if (outOfStock.length > 0)
      out.push({
        type: 'danger',
        title: 'Produtos zerados',
        desc: `${outOfStock.length} produto(s) sem estoque: ${outOfStock
          .slice(0, 3)
          .map((p) => p.nome)
          .join(', ')}.`,
      });

    if (criticalStock.length > 0)
      out.push({
        type: 'warning',
        title: 'Estoque crítico',
        desc: `${criticalStock.length} produto(s) abaixo do mínimo: ${criticalStock
          .slice(0, 3)
          .map((p) => p.nome)
          .join(', ')}.`,
      });

    if (topProducts.length > 0)
      out.push({
        type: 'info',
        title: 'Campeão de vendas',
        desc: `"${topProducts[0].nome}" lidera com ${topProducts[0].quantidade} unidades vendidas.`,
      });

    if (avgTicket > 50)
      out.push({
        type: 'success',
        title: 'Ticket médio alto',
        desc: `Ticket médio de ${fmtBRL(avgTicket)} — acima da meta de R$ 50,00.`,
      });

    if (todaySales.length >= 5)
      out.push({
        type: 'success',
        title: 'Bom desempenho hoje',
        desc: `${todaySales.length} vendas, total ${fmtBRL(todayTotal)}.`,
      });

    if (payBreakdown.pix > payBreakdown.cartao + payBreakdown.dinheiro)
      out.push({
        type: 'info',
        title: 'PIX é a forma dominante',
        desc: 'PIX representa a maior fatia dos pagamentos hoje.',
      });

    if (offlineQueue.length > 0)
      out.push({
        type: 'warning',
        title: `${offlineQueue.length} venda(s) pendentes de sync`,
        desc: 'Aguardando reconexão para sincronizar com o servidor.',
      });

    if (out.length === 0)
      out.push({
        type: 'info',
        title: 'Aguardando dados',
        desc: 'Realize algumas vendas para ver insights de IA.',
      });

    return out;
  }, [criticalStock, outOfStock, topProducts, avgTicket, todaySales, todayTotal, payBreakdown, offlineQueue]);

  // ── Filtered history ───────────────────────────────────────
  const filteredHistory = useMemo(
    () =>
      salesHistory.filter((s) => {
        if (historyMethod !== 'todos' && s.formaPagamento !== historyMethod) return false;
        if (historySearch) {
          const q = historySearch.toLowerCase();
          return (
            s.id.toLowerCase().includes(q) ||
            s.itens.some((i) => i.nome.toLowerCase().includes(q))
          );
        }
        return true;
      }),
    [salesHistory, historyMethod, historySearch],
  );

  // ── Export CSV ─────────────────────────────────────────────
  const exportCSV = useCallback(() => {
    const rows = [
      'ID,Data,Itens,Pagamento,Total,Status',
      ...salesHistory.map(
        (s) =>
          `${s.id},${s.data},${s.itens.length},${s.formaPagamento},${s.total.toFixed(2)},${s.status}`,
      ),
    ].join('\n');
    const blob = new Blob([rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vendas-syncho-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast?.('📥 CSV exportado com sucesso');
  }, [salesHistory, showToast]);

  // ── RENDER ─────────────────────────────────────────────────

  const TABS: Array<{ id: PdvTab; label: string; icon: React.ReactNode }> = [
    { id: 'venda', label: 'Venda', icon: <ShoppingCart className="h-4 w-4" /> },
    { id: 'historico', label: 'Histórico', icon: <History className="h-4 w-4" /> },
    { id: 'relatorios', label: 'Relatórios', icon: <BarChart3 className="h-4 w-4" /> },
    { id: 'multicaixa', label: 'Multi-caixa', icon: <Monitor className="h-4 w-4" /> },
    { id: 'ia', label: 'IA', icon: <Zap className="h-4 w-4" /> },
  ];

  const CATEGORIES: Category[] = useMemo(() => {
    const categories = Array.from(new Set(products.map((product) => normalizeCategory(product.categoria))));
    return ['todos', ...categories.sort()];
  }, [products]);

  return (
    <div className="flex h-full w-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-slate-900 text-slate-100">
      {/* ── HEADER ── */}
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-slate-900/80 px-5 py-3">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-emerald-500/20 p-2 text-emerald-400">
            <Store className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-black text-slate-100">PDV SYNCHO</h2>
              <HelpTooltip text="Aqui voce faz vendas: escolhe produtos, recebe pagamento e finaliza o pedido." />
            </div>
            <p className="text-xs text-slate-400">Ponto de venda profissional</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={activeRegisterId}
            onChange={(event) => {
              const selectedId = event.target.value;
              const selectedRegister = registers.find((register) => register.id === selectedId) || null;

              if (!selectedRegister) {
                setActiveRegisterId('');
                return;
              }

              if (selectedRegister.status !== 'online') {
                showToast?.('Selecione apenas um caixa aberto para operar no PDV.');
                return;
              }

              setActiveRegisterId(selectedId);
            }}
            className="rounded-lg border border-white/10 bg-slate-800 px-2.5 py-1 text-xs font-semibold text-slate-100"
            style={{ colorScheme: 'dark' }}
          >
            {!registers.length ? (
              <option value="">Sem caixas cadastrados</option>
            ) : null}
            {registers.map((register) => (
              <option key={register.id} value={register.id}>
                {register.nome} ({register.status === 'online' ? 'aberto' : 'fechado'})
              </option>
            ))}
          </select>
          <span className="rounded-lg border border-white/10 bg-slate-800 px-2.5 py-1 text-xs text-slate-300">
            Operador: {activeRegister?.operador || 'Nao definido'}
          </span>
          {activeRegister?.status !== 'online' ? (
            <span className="rounded-lg bg-rose-500/20 px-2.5 py-1 text-xs font-semibold text-rose-300">
              Caixa selecionado fechado
            </span>
          ) : null}
          {offlineQueue.length > 0 && (
            <span className="flex items-center gap-1.5 rounded-lg bg-amber-500/20 px-2.5 py-1 text-xs font-semibold text-amber-300">
              <Clock className="h-3 w-3" />
              {offlineQueue.length} pendente(s)
            </span>
          )}
          <span
            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold ${
              isOnline ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'
            }`}
          >
            {isOnline ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
            {isOnline ? 'Online' : 'Offline'}
          </span>
          {criticalStock.length > 0 && (
            <span className="flex items-center gap-1.5 rounded-lg bg-amber-500/20 px-2.5 py-1 text-xs font-semibold text-amber-300">
              <AlertTriangle className="h-3 w-3" />
              {criticalStock.length} alerta(s)
            </span>
          )}
        </div>
      </div>

      {/* ── TABS ── */}
      <div className="flex shrink-0 gap-1 border-b border-white/10 bg-slate-900/60 px-4 pt-2">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 rounded-t-lg px-4 py-2 text-sm font-semibold transition-colors ${
              activeTab === tab.id
                ? 'border-b-2 border-emerald-400 bg-emerald-500/10 text-emerald-300'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {tab.icon}
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      <div className="shrink-0 px-4 pt-3">
        {showHelpCard ? (
          <HelpIntroCard
            title="Tela de vendas"
            description="Aqui voce faz vendas rapidas. Primeiro selecione os produtos, depois escolha o pagamento e conclua."
            example="Exemplo: adicionar 2 itens no carrinho, escolher PIX e finalizar a venda."
            isDarkTheme
            onClose={() => setShowHelpCard(false)}
          />
        ) : (
          <button
            type="button"
            onClick={() => setShowHelpCard(true)}
            className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold text-cyan-200 hover:bg-white/10"
          >
            Ajuda rapida
            <HelpTooltip text="Resumo rapido para vender em poucos passos." />
          </button>
        )}
      </div>

      {/* ── CONTENT ── */}
      <div className="min-h-0 flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          {/* ════════ VENDA ════════ */}
          {activeTab === 'venda' && (
            <motion.div
              key="venda"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.12 }}
              className="flex h-full overflow-hidden"
            >
              {/* Product panel */}
              <div className="flex flex-1 flex-col overflow-hidden border-r border-white/10">
                {/* Search */}
                <div className="shrink-0 border-b border-white/10 bg-slate-900/40 p-3 space-y-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      ref={searchRef}
                      type="text"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      onKeyDown={handleSearchKey}
                      placeholder="Nome, código de barras… (Enter p/ adicionar)"
                      className="w-full rounded-xl border border-white/10 bg-slate-800/80 py-2.5 pl-9 pr-4 text-sm text-slate-100 placeholder-slate-500 outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20"
                    />
                    {search && (
                      <button
                        type="button"
                        onClick={() => setSearch('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  {/* Category chips */}
                  <div className="flex gap-1.5 overflow-x-auto pb-0.5">
                    {CATEGORIES.map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setCategory(cat)}
                        className={`shrink-0 rounded-lg px-3 py-1 text-xs font-semibold capitalize transition-colors ${
                          category === cat
                            ? 'bg-emerald-500 text-white'
                            : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Product grid */}
                <div className="grid flex-1 auto-rows-min grid-cols-2 gap-2 overflow-y-auto p-3 sm:grid-cols-3 lg:grid-cols-4">
                  {filteredProducts.length === 0 && (
                    <div className="col-span-full py-12 text-center text-sm text-slate-500">
                      Nenhum produto encontrado
                    </div>
                  )}
                  {filteredProducts.map((p) => {
                    const zero = p.estoque === 0;
                    const low = p.estoque > 0 && p.estoque <= p.estoqueMinimo;
                    return (
                      <motion.button
                        key={p.id}
                        type="button"
                        whileTap={{ scale: 0.96 }}
                        onClick={() => {
                          if (zero) {
                            showToast?.(`⚠️ Sem estoque: ${p.nome}`);
                            return;
                          }
                          dispatch({ type: 'ADD', produto: p });
                        }}
                        className={`relative flex flex-col gap-1 rounded-xl border p-3 text-left transition-colors ${
                          zero
                            ? 'cursor-not-allowed border-white/5 bg-slate-800/30 opacity-45'
                            : 'cursor-pointer border-white/10 bg-slate-800/60 hover:border-emerald-500/40 hover:bg-slate-800'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-1">
                          <p className="min-w-0 flex-1 truncate text-xs font-semibold leading-tight text-slate-100">
                            {p.nome}
                          </p>
                          {zero && (
                            <span className="shrink-0 rounded bg-red-500/25 px-1 py-0.5 text-[10px] font-bold text-red-400">
                              ZERO
                            </span>
                          )}
                          {low && (
                            <span className="shrink-0 rounded bg-amber-500/25 px-1 py-0.5 text-[10px] font-bold text-amber-400">
                              BAIXO
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-500">{p.codigo}</p>
                        <div className="mt-auto flex items-end justify-between pt-1">
                          <span className="text-sm font-black text-emerald-400">{fmtBRL(p.preco)}</span>
                          <span className="text-[10px] text-slate-500">{p.estoque} un</span>
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              </div>

              {/* Cart panel */}
              <div className="flex w-72 shrink-0 flex-col overflow-hidden xl:w-80">
                {/* Cart header */}
                <div className="shrink-0 border-b border-white/10 bg-slate-900/40 px-4 py-3">
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-2 text-sm font-black text-slate-100">Carrinho <HelpTooltip text="Revise os itens antes de cobrar. Aqui voce altera quantidade ou remove produtos." /></span>
                    <div className="flex items-center gap-2">
                      {cart.length > 0 && (
                        <button
                          type="button"
                          onClick={() => dispatch({ type: 'CLEAR' })}
                          className="rounded-lg px-2 py-0.5 text-xs text-red-400 hover:bg-red-500/10"
                        >
                          Limpar
                        </button>
                      )}
                      <span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-xs font-bold text-emerald-300">
                        {cart.reduce((a, i) => a + i.quantidade, 0)} itens
                      </span>
                    </div>
                  </div>
                </div>

                {/* Cart items */}
                <div className="flex-1 space-y-2 overflow-y-auto p-3">
                  {cart.length === 0 ? (
                    <div className="flex flex-col items-center justify-center gap-3 py-14 text-center text-slate-500">
                      <ShoppingCart className="h-10 w-10 opacity-25" />
                      <p className="text-sm">Carrinho vazio</p>
                      <p className="text-xs opacity-60">Clique em um produto ou use o scanner</p>
                    </div>
                  ) : (
                    cart.map((item) => (
                      <div
                        key={item.produto.id}
                        className="rounded-xl border border-white/10 bg-slate-800/60 p-3"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="min-w-0 flex-1 truncate text-xs font-semibold leading-tight text-slate-100">
                            {item.produto.nome}
                          </p>
                          <button
                            type="button"
                            onClick={() =>
                              dispatch({ type: 'REMOVE', produtoId: item.produto.id })
                            }
                            className="shrink-0 rounded p-0.5 text-red-400 hover:bg-red-500/10"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <p className="mt-0.5 text-[10px] text-slate-500">
                          {fmtBRL(item.produto.preco)} × {item.quantidade}
                        </p>
                        <div className="mt-2 flex items-center justify-between">
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() =>
                                dispatch({ type: 'DECREMENT', produtoId: item.produto.id })
                              }
                              className="flex h-6 w-6 items-center justify-center rounded-lg bg-slate-700 text-slate-300 hover:bg-slate-600"
                            >
                              <Minus className="h-3 w-3" />
                            </button>
                            <span className="w-8 text-center text-sm font-black text-slate-100">
                              {item.quantidade}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                dispatch({ type: 'INCREMENT', produtoId: item.produto.id })
                              }
                              disabled={item.quantidade >= item.produto.estoque}
                              className="flex h-6 w-6 items-center justify-center rounded-lg bg-slate-700 text-slate-300 hover:bg-slate-600 disabled:opacity-40"
                            >
                              <Plus className="h-3 w-3" />
                            </button>
                          </div>
                          <span className="text-sm font-black text-emerald-400">
                            {fmtBRL(item.produto.preco * item.quantidade)}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Totals + Finalize */}
                <div className="shrink-0 space-y-2 border-t border-white/10 bg-slate-900/60 p-4">
                  <div className="flex justify-between text-xs text-slate-400">
                    <span>Subtotal</span>
                    <span>{fmtBRL(cartSubtotal)}</span>
                  </div>
                  {cartDiscount > 0 && (
                    <div className="flex justify-between text-xs text-emerald-400">
                      <span>Desconto</span>
                      <span>-{fmtBRL(cartDiscount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-base font-black">
                    <span className="text-slate-100">Total</span>
                    <span className="text-emerald-400">{fmtBRL(cartTotal)}</span>
                  </div>

                  <AnimatePresence>
                    {saleSuccess && (
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="flex items-center gap-2 rounded-xl bg-emerald-500/20 px-3 py-2 text-xs font-semibold text-emerald-300"
                      >
                        <Check className="h-4 w-4" />
                        Venda finalizada com sucesso!
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="flex gap-2 pt-1">
                    {lastReceipt && (
                      <button
                        type="button"
                        onClick={() => setReceiptModal(true)}
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-slate-800 py-2.5 text-xs font-semibold text-slate-300 hover:bg-slate-700"
                      >
                        <Printer className="h-3.5 w-3.5" />
                        Cupom
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setPaymentModal(true)}
                      disabled={cart.length === 0 || !activeRegister || activeRegister.status !== 'online' || !String(activeRegister.operador || '').trim()}
                      className="flex-1 rounded-xl bg-emerald-500 py-2.5 text-sm font-black text-white transition-colors hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Finalizar
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* ════════ HISTÓRICO ════════ */}
          {activeTab === 'historico' && (
            <motion.div
              key="historico"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.12 }}
              className="flex h-full flex-col overflow-hidden p-4"
            >
              <div className="mb-4 flex flex-wrap items-center gap-3">
                <h3 className="text-base font-black text-slate-100">Histórico de Vendas</h3>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    value={historySearch}
                    onChange={(e) => setHistorySearch(e.target.value)}
                    placeholder="Buscar por ID ou produto…"
                    className="w-52 rounded-xl border border-white/10 bg-slate-800/80 py-2 pl-8 pr-4 text-xs text-slate-100 placeholder-slate-500 outline-none focus:border-emerald-500/50"
                  />
                </div>
                <select
                  value={historyMethod}
                  onChange={(e) => setHistoryMethod(e.target.value as PaymentMethod | 'todos')}
                  className="rounded-xl border border-white/10 bg-slate-800 px-3 py-2 text-xs text-slate-100 outline-none"
                  style={{ colorScheme: 'dark' }}
                >
                  <option value="todos">Todos pagamentos</option>
                  <option value="dinheiro">Dinheiro</option>
                  <option value="cartao">Cartão</option>
                  <option value="pix">PIX</option>
                </select>
                <button
                  type="button"
                  onClick={exportCSV}
                  className="ml-auto flex items-center gap-1.5 rounded-xl border border-white/10 bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-700"
                >
                  <Download className="h-3.5 w-3.5" />
                  Exportar CSV
                </button>
              </div>

              <div className="flex-1 overflow-auto rounded-xl border border-white/10">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-slate-800/95 backdrop-blur">
                    <tr>
                      {['ID', 'Data / Hora', 'Itens', 'Pagamento', 'Total', 'Status', ''].map(
                        (h) => (
                          <th
                            key={h}
                            className={`px-4 py-3 font-semibold uppercase tracking-wide text-slate-400 ${h === 'Total' || h === '' ? 'text-right' : 'text-left'}`}
                          >
                            {h}
                          </th>
                        ),
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredHistory.length === 0 && (
                      <tr>
                        <td colSpan={7} className="py-14 text-center text-slate-500">
                          Nenhuma venda encontrada
                        </td>
                      </tr>
                    )}
                    {filteredHistory.map((sale, idx) => (
                      <tr
                        key={sale.id}
                        className={`border-t border-white/5 transition-colors hover:bg-white/5 ${
                          idx % 2 === 1 ? 'bg-white/[0.02]' : ''
                        }`}
                      >
                        <td className="px-4 py-3 font-mono text-slate-400">
                          {sale.id.slice(-8).toUpperCase()}
                        </td>
                        <td className="px-4 py-3 text-slate-300">{fmtDate(sale.data)}</td>
                        <td className="px-4 py-3 text-slate-400">{sale.itens.length} item(s)</td>
                        <td className="px-4 py-3">
                          <span
                            className={`rounded-full px-2 py-0.5 font-semibold ${
                              sale.formaPagamento === 'pix'
                                ? 'bg-emerald-500/20 text-emerald-300'
                                : sale.formaPagamento === 'cartao'
                                  ? 'bg-blue-500/20 text-blue-300'
                                  : 'bg-amber-500/20 text-amber-300'
                            }`}
                          >
                            {sale.formaPagamento === 'dinheiro'
                              ? 'Dinheiro'
                              : sale.formaPagamento === 'cartao'
                                ? 'Cartão'
                                : 'PIX'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-black text-emerald-400">
                          {fmtBRL(sale.total)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                              sale.status === 'synced'
                                ? 'bg-emerald-500/20 text-emerald-300'
                                : sale.status === 'pending'
                                  ? 'bg-amber-500/20 text-amber-300'
                                  : 'bg-red-500/20 text-red-300'
                            }`}
                          >
                            {sale.status === 'synced'
                              ? 'Sincronizado'
                              : sale.status === 'pending'
                                ? 'Pendente'
                                : 'Erro'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => {
                              setLastReceipt(sale);
                              setReceiptModal(true);
                            }}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-slate-200"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}

          {/* ════════ RELATÓRIOS ════════ */}
          {activeTab === 'relatorios' && (
            <motion.div
              key="relatorios"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.12 }}
              className="h-full overflow-y-auto p-4"
            >
              <h3 className="mb-5 text-base font-black text-slate-100">Relatórios</h3>

              {/* KPI row */}
              <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
                {[
                  {
                    label: 'Vendas Hoje',
                    value: String(todaySales.length),
                    icon: <ReceiptText className="h-5 w-5" />,
                    color: 'bg-emerald-500/20 text-emerald-400',
                  },
                  {
                    label: 'Total Hoje',
                    value: fmtBRL(todayTotal),
                    icon: <DollarSign className="h-5 w-5" />,
                    color: 'bg-blue-500/20 text-blue-400',
                  },
                  {
                    label: 'Ticket Médio',
                    value: fmtBRL(avgTicket),
                    icon: <TrendingUp className="h-5 w-5" />,
                    color: 'bg-violet-500/20 text-violet-400',
                  },
                  {
                    label: 'Total Histórico',
                    value: String(salesHistory.length),
                    icon: <Activity className="h-5 w-5" />,
                    color: 'bg-amber-500/20 text-amber-400',
                  },
                ].map((kpi) => (
                  <div
                    key={kpi.label}
                    className="rounded-2xl border border-white/10 bg-slate-800/60 p-4"
                  >
                    <div className={`mb-2 w-fit rounded-xl p-2 ${kpi.color}`}>{kpi.icon}</div>
                    <p className="text-xs text-slate-400">{kpi.label}</p>
                    <p className="mt-0.5 text-xl font-black text-slate-100">{kpi.value}</p>
                  </div>
                ))}
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                {/* Top products */}
                <div className="rounded-2xl border border-white/10 bg-slate-800/60 p-4">
                  <h4 className="mb-4 text-sm font-bold text-slate-200">Produtos mais vendidos</h4>
                  {topProducts.length === 0 ? (
                    <p className="py-8 text-center text-sm text-slate-500">Nenhuma venda ainda</p>
                  ) : (
                    <div className="space-y-3">
                      {topProducts.map((p, i) => {
                        const maxQty = topProducts[0]?.quantidade || 1;
                        return (
                          <div key={p.nome} className="flex items-center gap-3">
                            <span className="w-5 shrink-0 text-xs font-black text-slate-500">
                              {i + 1}
                            </span>
                            <div className="min-w-0 flex-1">
                              <div className="mb-1 flex justify-between gap-2 text-xs">
                                <span className="truncate font-semibold text-slate-200">
                                  {p.nome}
                                </span>
                                <span className="shrink-0 text-slate-400">{p.quantidade} un</span>
                              </div>
                              <div className="h-1.5 rounded-full bg-slate-700">
                                <div
                                  className="h-full rounded-full bg-emerald-500 transition-all"
                                  style={{ width: `${(p.quantidade / maxQty) * 100}%` }}
                                />
                              </div>
                            </div>
                            <span className="shrink-0 text-xs font-black text-emerald-400">
                              {fmtBRL(p.total)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Payment breakdown */}
                <div className="rounded-2xl border border-white/10 bg-slate-800/60 p-4">
                  <h4 className="mb-4 text-sm font-bold text-slate-200">Pagamentos de hoje</h4>
                  <div className="space-y-3">
                    {[
                      {
                        label: 'PIX',
                        value: payBreakdown.pix,
                        bar: 'bg-emerald-500',
                        text: 'text-emerald-300',
                      },
                      {
                        label: 'Cartão',
                        value: payBreakdown.cartao,
                        bar: 'bg-blue-500',
                        text: 'text-blue-300',
                      },
                      {
                        label: 'Dinheiro',
                        value: payBreakdown.dinheiro,
                        bar: 'bg-amber-500',
                        text: 'text-amber-300',
                      },
                    ].map((pm) => {
                      const total2 =
                        Object.values(payBreakdown).reduce((a, b) => a + b, 0) || 1;
                      return (
                        <div key={pm.label} className="flex items-center gap-3">
                          <span className={`w-14 shrink-0 text-xs font-semibold ${pm.text}`}>
                            {pm.label}
                          </span>
                          <div className="flex-1">
                            <div className="h-2 rounded-full bg-slate-700">
                              <div
                                className={`h-full rounded-full transition-all ${pm.bar}`}
                                style={{ width: `${(pm.value / total2) * 100}%` }}
                              />
                            </div>
                          </div>
                          <span className="shrink-0 text-xs font-black text-slate-300">
                            {fmtBRL(pm.value)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-4 flex justify-between border-t border-white/10 pt-3 text-sm">
                    <span className="text-slate-400">Total do dia</span>
                    <span className="font-black text-emerald-400">{fmtBRL(todayTotal)}</span>
                  </div>
                </div>

                {/* Stock overview */}
                <div className="rounded-2xl border border-white/10 bg-slate-800/60 p-4 lg:col-span-2">
                  <h4 className="mb-4 text-sm font-bold text-slate-200">Status do estoque</h4>
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="rounded-xl bg-emerald-500/10 p-4">
                      <p className="text-2xl font-black text-emerald-400">
                        {products.filter((p) => p.estoque > p.estoqueMinimo).length}
                      </p>
                      <p className="mt-1 text-xs text-emerald-300">Estoque OK</p>
                    </div>
                    <div className="rounded-xl bg-amber-500/10 p-4">
                      <p className="text-2xl font-black text-amber-400">{criticalStock.length}</p>
                      <p className="mt-1 text-xs text-amber-300">Estoque baixo</p>
                    </div>
                    <div className="rounded-xl bg-red-500/10 p-4">
                      <p className="text-2xl font-black text-red-400">{outOfStock.length}</p>
                      <p className="mt-1 text-xs text-red-300">Zerado</p>
                    </div>
                  </div>
                  {(criticalStock.length > 0 || outOfStock.length > 0) && (
                    <div className="mt-3 grid gap-1.5 sm:grid-cols-2">
                      {outOfStock.map((p) => (
                        <div
                          key={p.id}
                          className="flex items-center justify-between rounded-xl bg-red-500/10 px-3 py-2"
                        >
                          <span className="truncate text-xs font-semibold text-red-300">
                            {p.nome}
                          </span>
                          <span className="ml-2 shrink-0 rounded-full bg-red-500/25 px-2 py-0.5 text-[10px] font-bold text-red-400">
                            ZERO
                          </span>
                        </div>
                      ))}
                      {criticalStock.map((p) => (
                        <div
                          key={p.id}
                          className="flex items-center justify-between rounded-xl bg-amber-500/10 px-3 py-2"
                        >
                          <span className="truncate text-xs font-semibold text-amber-300">
                            {p.nome}
                          </span>
                          <span className="ml-2 shrink-0 rounded-full bg-amber-500/25 px-2 py-0.5 text-[10px] font-bold text-amber-400">
                            {p.estoque} un
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* ════════ MULTI-CAIXA ════════ */}
          {activeTab === 'multicaixa' && (
            <motion.div
              key="multicaixa"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.12 }}
              className="h-full overflow-y-auto p-4"
            >
              <div className="mb-5 flex items-center justify-between">
                <h3 className="text-base font-black text-slate-100">Multi-caixa</h3>
                <span className="flex items-center gap-1.5 rounded-lg bg-emerald-500/20 px-2.5 py-1 text-xs font-semibold text-emerald-300">
                  <Activity className="h-3 w-3" />
                  {registers.filter((r) => r.status === 'online').length} online
                </span>
              </div>

              <div className="mb-4 grid gap-2 rounded-2xl border border-white/10 bg-slate-800/60 p-4 md:grid-cols-[1.2fr_1fr_1fr_1fr_auto]">
                <input
                  value={newRegisterName}
                  onChange={(event) => setNewRegisterName(event.target.value)}
                  className="rounded-xl border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-slate-100 outline-none"
                  placeholder="Nome do caixa"
                />
                <input
                  value={newRegisterOperator}
                  onChange={(event) => setNewRegisterOperator(event.target.value)}
                  className="rounded-xl border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-slate-100 outline-none"
                  placeholder="Operador"
                />
                <input
                  value={openingAmount}
                  onChange={(event) => setOpeningAmount(event.target.value)}
                  className="rounded-xl border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-slate-100 outline-none"
                  placeholder="Fundo inicial"
                  type="number"
                  min="0"
                  step="0.01"
                />
                <input
                  value={newRegisterAuthorization}
                  onChange={(event) => setNewRegisterAuthorization(event.target.value)}
                  className="rounded-xl border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-slate-100 outline-none"
                  placeholder="Codigo de autorizacao"
                />
                <button
                  type="button"
                  onClick={createRegister}
                  className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-600"
                >
                  Criar caixa
                </button>
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                {registers.map((reg) => (
                  <div
                    key={reg.id}
                    className="rounded-2xl border border-white/10 bg-slate-800/60 p-4"
                  >
                    <div className="mb-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className={`rounded-xl p-2 ${
                            reg.status === 'online'
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : reg.status === 'idle'
                                ? 'bg-amber-500/20 text-amber-400'
                                : 'bg-red-500/20 text-red-400'
                          }`}
                        >
                          <Monitor className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-sm font-black text-slate-100">{reg.nome}</p>
                          <input
                            value={reg.operador}
                            onChange={(event) => {
                              const nextOperator = event.target.value;

                              if (reg.status === 'online' && !nextOperator.trim()) {
                                showToast?.('Nao e permitido deixar caixa aberto sem operador.');
                                return;
                              }

                              setRegisters((prev) =>
                                prev.map((item) =>
                                  item.id === reg.id ? { ...item, operador: nextOperator } : item,
                                ),
                              );
                            }}
                            className="mt-1 w-full rounded-lg border border-white/10 bg-slate-900/60 px-2 py-1 text-xs text-slate-100 outline-none"
                            placeholder="Operador"
                          />
                        </div>
                      </div>
                      <span
                        className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${
                          reg.status === 'online'
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : reg.status === 'idle'
                              ? 'bg-amber-500/20 text-amber-300'
                              : 'bg-red-500/20 text-red-300'
                        }`}
                      >
                        {reg.status === 'online'
                          ? 'Online'
                          : reg.status === 'idle'
                            ? 'Ocioso'
                            : 'Offline'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-xl bg-slate-900/60 p-3">
                        <p className="text-xs text-slate-500">Vendas hoje</p>
                        <p className="text-2xl font-black text-slate-100">{reg.vendasHoje}</p>
                      </div>
                      <div className="rounded-xl bg-slate-900/60 p-3">
                        <p className="text-xs text-slate-500">Total hoje</p>
                        <p className="text-lg font-black text-emerald-400">
                          {fmtBRL(reg.totalHoje)}
                        </p>
                      </div>
                    </div>

                    {reg.ultimaVenda && (
                      <p className="mt-2 text-[10px] text-slate-500">
                        Última venda: {fmtTime(reg.ultimaVenda)}
                      </p>
                    )}

                    {reg.abertura && (
                      <p className="mt-1 text-[10px] text-slate-500">Abertura: {fmtDate(reg.abertura)}</p>
                    )}

                    {reg.fechamento && (
                      <p className="mt-1 text-[10px] text-slate-500">Fechamento: {fmtDate(reg.fechamento)}</p>
                    )}

                    {reg.status !== 'online' && (
                      <button
                        type="button"
                        onClick={() => openRegister(reg.id)}
                        className="mt-3 w-full rounded-xl bg-emerald-500/20 py-2 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/30"
                      >
                        Abrir caixa
                      </button>
                    )}
                    {reg.status === 'online' && (
                      <button
                        type="button"
                        onClick={() => closeRegister(reg.id)}
                        className="mt-3 w-full rounded-xl bg-red-500/10 py-2 text-xs font-semibold text-red-400 hover:bg-red-500/20"
                      >
                        Fechar caixa
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        if (reg.status !== 'online') {
                          showToast?.('Apenas caixas abertos podem ser selecionados como ativos.');
                          return;
                        }

                        setActiveRegisterId(reg.id);
                      }}
                      className={`mt-2 w-full rounded-xl py-2 text-xs font-semibold ${
                        activeRegisterId === reg.id
                          ? 'bg-cyan-500/20 text-cyan-300'
                          : 'bg-slate-700/70 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      {activeRegisterId === reg.id ? 'Caixa ativo' : 'Selecionar como ativo'}
                    </button>
                  </div>
                ))}
              </div>

              {/* Live activity feed */}
              <div className="mt-5 rounded-2xl border border-white/10 bg-slate-800/60 p-4">
                <h4 className="mb-3 text-sm font-bold text-slate-200">Atividade em tempo real</h4>
                <div className="space-y-2">
                  {registers
                    .filter((r) => r.status === 'online')
                    .map((r) => (
                      <div
                        key={r.id}
                        className="flex items-center gap-3 rounded-xl bg-slate-900/60 px-3 py-2"
                      >
                        <div className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
                        <span className="text-xs font-semibold text-slate-300">{r.nome}</span>
                        <span className="text-xs text-slate-500">·</span>
                        <span className="truncate text-xs text-slate-400">{r.operador}</span>
                        <span className="ml-auto shrink-0 text-xs font-black text-emerald-400">
                          {r.vendasHoje} vendas
                        </span>
                        <span className="shrink-0 text-xs text-slate-400">
                          {fmtBRL(r.totalHoje)}
                        </span>
                      </div>
                    ))}
                  {registers.every((r) => r.status !== 'online') && (
                    <p className="py-4 text-center text-xs text-slate-500">
                      Nenhum caixa online
                    </p>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* ════════ IA ════════ */}
          {activeTab === 'ia' && (
            <motion.div
              key="ia"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.12 }}
              className="h-full overflow-y-auto p-4"
            >
              <div className="mb-5 flex items-center gap-3">
                <div className="rounded-xl bg-violet-500/20 p-2 text-violet-400">
                  <Zap className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-100">IA — Insights do PDV</h3>
                  <p className="text-xs text-slate-400">
                    Análise automática baseada nos dados reais do seu ponto de venda
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => showToast?.('🔄 Insights atualizados')}
                  className="ml-auto rounded-xl border border-white/10 bg-slate-800 p-2 text-slate-400 hover:bg-slate-700"
                >
                  <RefreshCw className="h-4 w-4" />
                </button>
              </div>

              <div className="grid gap-3 lg:grid-cols-2">
                {aiInsights.map((ins, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.06 }}
                    className={`rounded-2xl border p-4 ${
                      ins.type === 'success'
                        ? 'border-emerald-500/20 bg-emerald-500/10'
                        : ins.type === 'warning'
                          ? 'border-amber-500/20 bg-amber-500/10'
                          : ins.type === 'danger'
                            ? 'border-red-500/20 bg-red-500/10'
                            : 'border-blue-500/20 bg-blue-500/10'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`mt-0.5 rounded-xl p-2 ${
                          ins.type === 'success'
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : ins.type === 'warning'
                              ? 'bg-amber-500/20 text-amber-400'
                              : ins.type === 'danger'
                                ? 'bg-red-500/20 text-red-400'
                                : 'bg-blue-500/20 text-blue-400'
                        }`}
                      >
                        {ins.type === 'success' ? (
                          <TrendingUp className="h-4 w-4" />
                        ) : ins.type === 'danger' ? (
                          <Package className="h-4 w-4" />
                        ) : (
                          <AlertTriangle className="h-4 w-4" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p
                          className={`text-sm font-black ${
                            ins.type === 'success'
                              ? 'text-emerald-200'
                              : ins.type === 'warning'
                                ? 'text-amber-200'
                                : ins.type === 'danger'
                                  ? 'text-red-200'
                                  : 'text-blue-200'
                          }`}
                        >
                          {ins.title}
                        </p>
                        <p className="mt-1 text-xs leading-relaxed text-slate-400">{ins.desc}</p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Summary metrics */}
              <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
                {[
                  { label: 'Produtos cadastrados', value: products.length },
                  { label: 'Prod. com estoque OK', value: products.filter((p) => p.estoque > p.estoqueMinimo).length },
                  { label: 'Alertas ativos', value: criticalStock.length + outOfStock.length },
                  { label: 'Vendas offline', value: offlineQueue.length },
                ].map((m) => (
                  <div
                    key={m.label}
                    className="rounded-2xl border border-white/10 bg-slate-800/60 p-4 text-center"
                  >
                    <p className="text-2xl font-black text-slate-100">{m.value}</p>
                    <p className="mt-1 text-xs text-slate-400">{m.label}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ══════════════════════════════════
          PAYMENT MODAL
      ══════════════════════════════════ */}
      <AnimatePresence>
        {paymentModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="w-full max-w-md rounded-2xl border border-white/10 bg-slate-900 shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-white/10 p-5">
                <h3 className="text-lg font-black text-slate-100">Finalizar Venda</h3>
                <button
                  type="button"
                  onClick={() => setPaymentModal(false)}
                  className="rounded-xl p-1.5 text-slate-400 hover:bg-white/10"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-5 p-5">
                {/* Order summary */}
                <div className="space-y-1.5 rounded-xl bg-slate-800/60 p-4">
                  {cart.slice(0, 5).map((item) => (
                    <div key={item.produto.id} className="flex justify-between text-xs text-slate-400">
                      <span className="truncate pr-2">
                        {item.quantidade}× {item.produto.nome}
                      </span>
                      <span className="shrink-0">{fmtBRL(item.produto.preco * item.quantidade)}</span>
                    </div>
                  ))}
                  {cart.length > 5 && (
                    <p className="text-xs text-slate-500">+{cart.length - 5} item(s)…</p>
                  )}
                  <div className="mt-2 flex justify-between border-t border-white/10 pt-2 text-base font-black">
                    <span className="text-slate-100">Total</span>
                    <span className="text-emerald-400">{fmtBRL(cartTotal)}</span>
                  </div>
                </div>

                {/* Payment method */}
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Forma de pagamento
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {(
                      [
                        { id: 'pix' as PaymentMethod, label: 'PIX', sub: 'Instantâneo' },
                        { id: 'cartao' as PaymentMethod, label: 'Cartão', sub: 'Créd / Déb' },
                        { id: 'dinheiro' as PaymentMethod, label: 'Dinheiro', sub: 'Com troco' },
                      ] as const
                    ).map((pm) => (
                      <button
                        key={pm.id}
                        type="button"
                        onClick={() => {
                          setPaymentMethod(pm.id);
                          setValorRecebido('');
                        }}
                        className={`rounded-xl border p-3 text-center transition-colors ${
                          paymentMethod === pm.id
                            ? 'border-emerald-500 bg-emerald-500/20 text-emerald-300'
                            : 'border-white/10 bg-slate-800/60 text-slate-400 hover:border-white/20'
                        }`}
                      >
                        <p className="text-sm font-black">{pm.label}</p>
                        <p className="text-[10px] opacity-70">{pm.sub}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Cash change calculator */}
                <AnimatePresence>
                  {paymentMethod === 'dinheiro' && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Valor recebido
                      </label>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={valorRecebido}
                        onChange={(e) => setValorRecebido(e.target.value)}
                        placeholder="0,00"
                        className="w-full rounded-xl border border-white/10 bg-slate-800 px-4 py-3 text-center text-2xl font-black text-slate-100 outline-none focus:border-emerald-500/50"
                      />
                      {/* Quick amounts */}
                      <div className="mt-2 flex gap-1.5">
                        {[cartTotal, Math.ceil(cartTotal / 10) * 10, Math.ceil(cartTotal / 50) * 50, Math.ceil(cartTotal / 100) * 100].map(
                          (amt) => (
                            <button
                              key={amt}
                              type="button"
                              onClick={() => setValorRecebido(amt.toFixed(2).replace('.', ','))}
                              className="flex-1 rounded-lg bg-slate-800 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-700"
                            >
                              {fmtBRL(amt)}
                            </button>
                          ),
                        )}
                      </div>
                      {(parseFloat(valorRecebido.replace(',', '.')) || 0) >= cartTotal && (
                        <div className="mt-2 flex items-center justify-between rounded-xl bg-emerald-500/20 px-4 py-2.5">
                          <span className="text-sm text-emerald-300">Troco</span>
                          <span className="text-xl font-black text-emerald-300">{fmtBRL(troco)}</span>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>

                <button
                  type="button"
                  onClick={() => void finalizeSale()}
                  disabled={
                    isProcessing ||
                    (paymentMethod === 'dinheiro' &&
                      (parseFloat(valorRecebido.replace(',', '.')) || 0) < cartTotal)
                  }
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 py-3.5 text-base font-black text-white transition-colors hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {isProcessing ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Processando…
                    </>
                  ) : (
                    <>
                      <Check className="h-5 w-5" />
                      Confirmar {fmtBRL(cartTotal)}
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══════════════════════════════════
          RECEIPT MODAL
      ══════════════════════════════════ */}
      <AnimatePresence>
        {receiptModal && lastReceipt && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="w-full max-w-xs rounded-2xl border border-white/10 bg-slate-900 shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-white/10 p-4">
                <h3 className="text-sm font-black text-slate-100">Cupom Fiscal</h3>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-700"
                  >
                    <Printer className="h-3.5 w-3.5" />
                    Imprimir
                  </button>
                  <button
                    type="button"
                    onClick={() => setReceiptModal(false)}
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="p-5 font-mono text-xs">
                <div className="mb-3 text-center">
                  <p className="text-base font-black text-slate-100">SYNCHO PDV</p>
                  <p className="text-slate-500">Sistema de Ponto de Venda</p>
                  <p className="mt-1 text-slate-500">{fmtDate(lastReceipt.data)}</p>
                  <p className="text-slate-500">
                    Nº {lastReceipt.id.slice(-6).toUpperCase()}
                  </p>
                </div>
                <div className="my-3 border-t border-dashed border-white/20" />
                {lastReceipt.itens.map((item) => (
                  <div key={item.produtoId} className="flex justify-between py-0.5">
                    <span className="mr-2 min-w-0 flex-1 truncate text-slate-300">
                      {item.nome}
                    </span>
                    <span className="shrink-0 text-slate-400">
                      {item.quantidade}×{fmtBRL(item.precoUnitario)}
                    </span>
                  </div>
                ))}
                <div className="my-3 border-t border-dashed border-white/20" />
                <div className="space-y-1">
                  <div className="flex justify-between text-slate-400">
                    <span>Subtotal</span>
                    <span>{fmtBRL(lastReceipt.subtotal)}</span>
                  </div>
                  {lastReceipt.desconto > 0 && (
                    <div className="flex justify-between text-emerald-400">
                      <span>Desconto</span>
                      <span>-{fmtBRL(lastReceipt.desconto)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm font-black text-slate-100">
                    <span>TOTAL</span>
                    <span>{fmtBRL(lastReceipt.total)}</span>
                  </div>
                  {lastReceipt.formaPagamento === 'dinheiro' && (
                    <>
                      <div className="flex justify-between text-slate-400">
                        <span>Recebido</span>
                        <span>{fmtBRL(lastReceipt.valorRecebido)}</span>
                      </div>
                      <div className="flex justify-between text-emerald-400">
                        <span>Troco</span>
                        <span>{fmtBRL(lastReceipt.troco)}</span>
                      </div>
                    </>
                  )}
                </div>
                <div className="my-3 border-t border-dashed border-white/20" />
                <div className="text-center text-slate-500">
                  <p>
                    Pagamento:{' '}
                    {lastReceipt.formaPagamento === 'dinheiro'
                      ? 'Dinheiro'
                      : lastReceipt.formaPagamento === 'cartao'
                        ? 'Cartão'
                        : 'PIX'}
                  </p>
                  <p className="mt-1">Operador: {lastReceipt.operador}</p>
                  <p>{lastReceipt.caixa}</p>
                  <p className="mt-2 text-[10px]">Obrigado pela preferência!</p>
                  <p className="text-[10px]">syncho.com.br</p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
