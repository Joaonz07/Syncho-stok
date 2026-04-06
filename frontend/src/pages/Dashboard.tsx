import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { DragEvent } from 'react';
import { Navigate } from 'react-router-dom';
import { io, type Socket } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';
import { apiFetch as fetch, getApiBaseUrl } from '../lib/api';
import { getAccessToken, getCompanyId as getSessionCompanyId } from '../lib/session';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  BarChart3,
  Package,
  Users,
  DollarSign,
  ShoppingCart,
  TrendingUp,
  Boxes,
  KanbanSquare,
  MessageCircle,
  Plug,
  CreditCard,
  Settings,
  LogOut,
  ChevronRight,
  Sparkles,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Lightbulb,
  AlertTriangle,
  Award,
  Copy,
  KeyRound,
  RefreshCw,
  Webhook,
  ShieldCheck,
  Code2,
  Plus,
  Trash2,
  Lock,
  Download
} from 'lucide-react';
import {
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts';

type LeadStatus =
  | 'NOVO_CONTATO'
  | 'EM_CONTATO'
  | 'APRESENTACAO'
  | 'NEGOCIACAO'
  | 'FECHAMENTO';

type LeadPriority = 'BAIXA' | 'MEDIA' | 'ALTA';

type Lead = {
  id: string;
  name: string;
  status: LeadStatus;
  priority: LeadPriority;
  position?: number;
  value: number;
  notes: string;
  company_id?: string;
  companyId?: string;
};

type CompanyPlan = 'BASIC' | 'PRO' | 'PREMIUM';
type CompanyStatus = 'ACTIVE' | 'PAST_DUE' | 'CANCELED' | 'BLOCKED';

type Company = {
  id: string;
  name: string;
  location?: string | null;
  plan?: CompanyPlan;
  subscription_status?: CompanyStatus;
  subscriptionStatus?: CompanyStatus;
  expires_at?: string | null;
  expiresAt?: string | null;
};

type ManagedUser = {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'DEV' | 'CLIENT';
  company_id?: string | null;
  companyId?: string | null;
  access_until?: string | null;
  accessUntil?: string | null;
};

type Product = {
  id: string;
  name: string;
  code?: string;
  price: number;
  description?: string;
  quantity?: number;
  company_id?: string;
  companyId?: string;
};

type InventoryItem = {
  id: string;
  product_id?: string;
  productId?: string;
  company_id?: string;
  companyId?: string;
  name: string;
  quantity: number;
  updated_at?: string;
  updatedAt?: string;
};

type SubscriptionInfo = {
  plan?: CompanyPlan;
  status?: CompanyStatus;
  expiresAt?: string | null;
};

type CompanyInfo = {
  id: string;
  name: string;
  location: string | null;
};

type SaleLine = {
  id: number;
  productId: string;
  quantity: number;
};

type SalesAnalysis = {
  totalRevenue: number;
  totalSales: number;
  averageTicket: number;
  totalStockUnits: number;
  productsCount: number;
  recentSales?: Array<{
    id: string;
    total: number;
    userId: string | null;
    customerName?: string | null;
    paymentMethod?: 'cash' | 'pix' | 'card' | string | null;
    amountReceived?: number;
    changeDue?: number;
    createdAt: string;
  }>;
  paymentSummaryToday?: Array<{
    method: 'cash' | 'pix' | 'card';
    salesCount: number;
    total: number;
    amountReceived: number;
    changeGiven: number;
  }>;
  lowStockProducts: Array<{
    id: string;
    name: string;
    code: string;
    quantity: number;
    price: number;
  }>;
};

type AdminPlanConfig = {
  id: string;
  name: string;
  price: number;
  features: string[];
};

type DashboardView = 'pipeline' | 'companies' | 'clients' | 'products' | 'inventory' | 'settings' | 'sales' | 'chat' | 'analytics' | 'admin' | 'integrations';

type SidebarGroup = 'Comercial' | 'Operacao' | 'Sistema';

type SidebarMenuItem = {
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  path: DashboardView;
  group: SidebarGroup;
  adminOnly?: boolean;
  devOnly?: boolean;
};

type SupportRequestStatus = 'PENDING' | 'IN_REVIEW' | 'DONE';

type SupportRequest = {
  id: string;
  companyId: string;
  requesterId: string;
  requesterName: string | null;
  requesterEmail: string | null;
  subject: string;
  message: string;
  status: SupportRequestStatus;
  adminResponse: string | null;
  createdAt: string;
  updatedAt: string;
};

type SupportChatMessage = {
  id: string;
  companyId: string;
  requestId: string | null;
  senderId: string;
  senderName: string;
  senderRole: 'ADMIN' | 'CLIENT';
  content: string;
  createdAt: string;
};

type Toast = {
  id: number;
  message: string;
};

type IntegrationEvent = 'sale.created' | 'product.updated' | 'stock.low';

type IntegrationWebhook = {
  id: string;
  url: string;
  events: IntegrationEvent[];
  createdAt: string;
  updatedAt: string;
};

type IntegrationEndpoint = {
  method: 'GET' | 'POST';
  path: string;
  description: string;
};

type IntegrationApiConfig = {
  companyId: string;
  apiKey: string;
  maskedApiKey: string;
  webhooks: IntegrationWebhook[];
  createdAt: string;
  updatedAt: string;
};

const columns: Array<{ key: LeadStatus; label: string }> = [
  { key: 'NOVO_CONTATO', label: 'Novo contato' },
  { key: 'EM_CONTATO', label: 'Em contato' },
  { key: 'APRESENTACAO', label: 'Apresentacao' },
  { key: 'NEGOCIACAO', label: 'Negociacao' },
  { key: 'FECHAMENTO', label: 'Fechamento' }
];

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);

const escapeCsvValue = (value: unknown) => {
  const text = String(value ?? '');

  if (/[";,\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }

  return text;
};

const formatSalePaymentMethod = (method?: string | null) => {
  switch (String(method || '').toLowerCase()) {
    case 'cash':
      return 'Dinheiro';
    case 'pix':
      return 'Pix';
    case 'card':
      return 'Cartao';
    default:
      return 'Nao informado';
  }
};

const normalizeMoneyInput = (rawValue: string) => {
  const normalized = String(rawValue || '')
    .replace(',', '.')
    .replace(/[^\d.]/g, '');

  if (!normalized) {
    return '';
  }

  const [intPartRaw, ...decimalParts] = normalized.split('.');
  const intPart = intPartRaw.replace(/^0+(?=\d)/, '') || '0';

  if (!decimalParts.length) {
    return intPart;
  }

  const decimalPart = decimalParts.join('').slice(0, 2);
  return `${intPart}.${decimalPart}`;
};

const parseMoneyInput = (rawValue: string) => {
  const normalized = normalizeMoneyInput(rawValue);

  if (!normalized) {
    return 0;
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
};

const formatDateTime = (value: string) => {
  const date = new Date(String(value || ''));

  if (Number.isNaN(date.getTime())) {
    return '-';
  }

  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short'
  }).format(date);
};

const sortByPosition = (items: Lead[]) =>
  [...items].sort((left, right) => Number(left.position || 0) - Number(right.position || 0));

const getUserIdFromJwt = (jwt: string) => {
  try {
    const parts = String(jwt || '').split('.');

    if (parts.length < 2) {
      return '';
    }

    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(atob(base64)) as { sub?: string };
    return String(payload.sub || '').trim();
  } catch (_error) {
    return '';
  }
};

const getUserEmailFromJwt = (jwt: string) => {
  try {
    const parts = String(jwt || '').split('.');

    if (parts.length < 2) {
      return '';
    }

    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(atob(base64)) as { email?: string };
    return String(payload.email || '').trim();
  } catch (_error) {
    return '';
  }
};

const getUserDisplayNameFromJwt = (jwt: string) => {
  try {
    const parts = String(jwt || '').split('.');

    if (parts.length < 2) {
      return 'Usuário';
    }

    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(atob(base64)) as {
      name?: string;
      full_name?: string;
      email?: string;
      user_metadata?: { name?: string; full_name?: string };
    };

    const rawName = String(
      payload.user_metadata?.name || payload.user_metadata?.full_name || payload.name || payload.full_name || ''
    ).trim();

    if (rawName) {
      return rawName;
    }

    const email = String(payload.email || '').trim();
    if (!email) {
      return 'Usuário';
    }

    return email.split('@')[0] || 'Usuário';
  } catch (_error) {
    return 'Usuário';
  }
};

const getCompanyIdFromJwt = (jwt: string) => {
  try {
    const parts = String(jwt || '').split('.');

    if (parts.length < 2) {
      return '';
    }

    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(atob(base64)) as {
      company_id?: string;
      companyId?: string;
      app_metadata?: { company_id?: string; companyId?: string };
      user_metadata?: { company_id?: string; companyId?: string };
    };

    return String(
      payload.company_id
      || payload.companyId
      || payload.app_metadata?.company_id
      || payload.app_metadata?.companyId
      || payload.user_metadata?.company_id
      || payload.user_metadata?.companyId
      || ''
    ).trim();
  } catch (_error) {
    return '';
  }
};

const SalesLineTooltip = ({
  active,
  payload,
  label
}: {
  active?: boolean;
  payload?: Array<{ value?: number }>;
  label?: string;
}) => {
  if (!active || !payload?.length) {
    return null;
  }

  return (
    <div className="rounded-lg border border-white/10 bg-slate-950/95 px-3 py-2 text-xs text-white shadow-lg backdrop-blur-md">
      <p className="font-semibold text-slate-100">{label}</p>
      <p className="mt-1 text-blue-300">{formatCurrency(Number(payload[0]?.value || 0))}</p>
    </div>
  );
};

const salesStages: Array<{ key: LeadStatus; label: string; shortLabel: string }> = [
  { key: 'NOVO_CONTATO', label: 'Busca', shortLabel: 'Busca' },
  { key: 'EM_CONTATO', label: 'Oferta', shortLabel: 'Oferta' },
  { key: 'APRESENTACAO', label: 'Negociacao', shortLabel: 'Negociacao' },
  { key: 'NEGOCIACAO', label: 'Acordo', shortLabel: 'Acordo' },
  { key: 'FECHAMENTO', label: 'Fechamento', shortLabel: 'Fechamento' }
];

const acquisitionSources = ['Chamadas', 'Apresentacoes', 'E-mail', 'Landing Page'] as const;

const hashString = (value: string) => {
  let hash = 0;
  const text = String(value || '');

  for (let index = 0; index < text.length; index += 1) {
    hash = (hash << 5) - hash + text.charCodeAt(index);
    hash |= 0;
  }

  return Math.abs(hash);
};

const inferLeadSource = (lead: Lead) => {
  const haystack = `${lead.name || ''} ${lead.notes || ''}`.toLowerCase();

  if (haystack.includes('liga') || haystack.includes('phone') || haystack.includes('chamada')) {
    return 'Chamadas' as const;
  }

  if (haystack.includes('apresent') || haystack.includes('demo') || haystack.includes('reuniao')) {
    return 'Apresentacoes' as const;
  }

  if (haystack.includes('mail') || haystack.includes('@') || haystack.includes('email')) {
    return 'E-mail' as const;
  }

  if (haystack.includes('site') || haystack.includes('landing') || haystack.includes('formulario')) {
    return 'Landing Page' as const;
  }

  return acquisitionSources[hashString(`${lead.id}-${lead.name}`) % acquisitionSources.length];
};

type ProductComboboxProps = {
  products: Product[];
  value: string;
  onChange: (productId: string) => void;
  isDarkTheme: boolean;
};

const ProductCombobox = ({ products, value, onChange, isDarkTheme }: ProductComboboxProps) => {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
  const triggerRef = useRef<HTMLButtonElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const selected = useMemo(() => products.find((p) => p.id === value) || null, [products, value]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return products;
    return products.filter(
      (p) =>
        String(p.name || '').toLowerCase().includes(q) ||
        String(p.code || '').toLowerCase().includes(q)
    );
  }, [products, search]);

  const computePosition = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    setDropdownStyle({
      position: 'fixed',
      top: rect.bottom + 6,
      left: rect.left,
      width: rect.width,
      zIndex: 9999,
    });
  };

  const openDropdown = () => {
    computePosition();
    setOpen(true);
    setFocusedIndex(-1);
  };

  useEffect(() => {
    if (!open) return;
    const handleOutside = (e: MouseEvent) => {
      const portal = document.getElementById('product-combobox-portal');
      if (
        containerRef.current && !containerRef.current.contains(e.target as Node) &&
        portal && !portal.contains(e.target as Node)
      ) {
        setOpen(false);
        setSearch('');
      }
    };
    const handleScroll = () => { computePosition(); };
    document.addEventListener('mousedown', handleOutside);
    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', handleScroll);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleScroll);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const selectProduct = (productId: string) => {
    onChange(productId);
    setOpen(false);
    setSearch('');
    setFocusedIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setOpen(false);
      setSearch('');
      return;
    }
    if (!open) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') openDropdown();
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusedIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && focusedIndex >= 0 && filtered[focusedIndex]) {
      e.preventDefault();
      selectProduct(filtered[focusedIndex].id);
    }
  };

  const panelClass = isDarkTheme
    ? 'border-white/10 bg-slate-900 shadow-[0_16px_48px_rgba(0,0,0,0.7)]'
    : 'border-slate-200 bg-white shadow-xl';

  const triggerClass = isDarkTheme
    ? 'border border-white/10 bg-white/5 text-slate-100'
    : 'border border-slate-200 bg-slate-50 text-slate-800';

  const triggerOpenClass = isDarkTheme
    ? 'border-blue-500 ring-2 ring-blue-500/20'
    : 'border-blue-400 ring-2 ring-blue-400/20';

  const dropdown = (
    <AnimatePresence>
      {open && (
        <motion.div
          id="product-combobox-portal"
          initial={{ opacity: 0, y: -6, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -6, scale: 0.98 }}
          transition={{ duration: 0.16, ease: 'easeOut' }}
          style={dropdownStyle}
          className={['overflow-hidden rounded-xl border', panelClass].join(' ')}
        >
          {/* Search input */}
          <div className={['px-3 py-2.5 border-b', isDarkTheme ? 'border-white/10' : 'border-slate-100'].join(' ')}>
            <input
              autoFocus
              type="text"
              className={[
                'w-full rounded-lg px-3 py-1.5 text-sm outline-none transition-all',
                isDarkTheme
                  ? 'border border-white/10 bg-white/5 text-slate-100 placeholder-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30'
                  : 'border border-slate-200 bg-slate-50 text-slate-800 placeholder-slate-400 focus:border-blue-400'
              ].join(' ')}
              placeholder="Buscar produto..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setFocusedIndex(-1);
              }}
            />
          </div>

          {/* Product list */}
          <div
            className="max-h-56 overflow-y-auto py-1"
            style={{ scrollbarWidth: 'thin', scrollbarColor: isDarkTheme ? 'rgba(100,116,139,0.4) transparent' : 'rgba(148,163,184,0.4) transparent' }}
          >
            {filtered.length ? (
              filtered.map((product, idx) => {
                const qty = Number(product.quantity || 0);
                const isLowStock = qty > 0 && qty <= 3;
                const isOutOfStock = qty === 0;
                const isFocused = focusedIndex === idx;
                const isSelected = value === product.id;

                return (
                  <motion.button
                    key={product.id}
                    type="button"
                    whileHover={{ x: 3 }}
                    transition={{ duration: 0.12 }}
                    onClick={() => selectProduct(product.id)}
                    className={[
                      'flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors',
                      isFocused || isSelected
                        ? isDarkTheme ? 'bg-blue-500/15' : 'bg-blue-50'
                        : isDarkTheme ? 'hover:bg-white/10' : 'hover:bg-slate-50'
                    ].join(' ')}
                  >
                    <div className="min-w-0 flex-1">
                      <p className={['truncate text-sm font-medium', isDarkTheme ? 'text-slate-100' : 'text-slate-800'].join(' ')}>
                        {product.name}
                      </p>
                      {product.code ? (
                        <p className={['text-[11px]', isDarkTheme ? 'text-slate-500' : 'text-slate-400'].join(' ')}>
                          {product.code}
                        </p>
                      ) : null}
                    </div>
                    <span className={['shrink-0 text-sm font-semibold', isDarkTheme ? 'text-cyan-300' : 'text-blue-700'].join(' ')}>
                      {formatCurrency(Number(product.price || 0))}
                    </span>
                    <span
                      className={[
                        'shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold',
                        isOutOfStock
                          ? 'bg-slate-500/20 text-slate-400'
                          : isLowStock
                            ? 'bg-rose-500/15 text-rose-400'
                            : isDarkTheme ? 'bg-emerald-500/15 text-emerald-400' : 'bg-emerald-50 text-emerald-700'
                      ].join(' ')}
                    >
                      Est. {qty}
                    </span>
                  </motion.button>
                );
              })
            ) : (
              <div className="px-4 py-6 text-center">
                <p className={['text-sm', isDarkTheme ? 'text-slate-500' : 'text-slate-400'].join(' ')}>
                  Nenhum produto encontrado
                </p>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <div ref={containerRef} className="relative" onKeyDown={handleKeyDown}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => (open ? (setOpen(false), setSearch('')) : openDropdown())}
        className={[
          'flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm transition-all outline-none',
          triggerClass,
          open ? triggerOpenClass : ''
        ].join(' ')}
      >
        {selected ? (
          <span className="flex items-center gap-2 min-w-0 truncate">
            <span className={['truncate font-medium', isDarkTheme ? 'text-slate-100' : 'text-slate-800'].join(' ')}>
              {selected.name}
            </span>
            <span className={['shrink-0 text-xs', isDarkTheme ? 'text-slate-500' : 'text-slate-400'].join(' ')}>
              {formatCurrency(Number(selected.price || 0))}
            </span>
          </span>
        ) : (
          <span className={isDarkTheme ? 'text-slate-500' : 'text-slate-400'}>Selecione o produto</span>
        )}
        <ChevronRight
          className={[
            'h-4 w-4 shrink-0 transition-transform duration-200',
            isDarkTheme ? 'text-slate-500' : 'text-slate-400',
            open ? 'rotate-90' : ''
          ].join(' ')}
        />
      </button>
      {createPortal(dropdown, document.body)}
    </div>
  );
};

const DEFAULT_ADMIN_PLANS: AdminPlanConfig[] = [
  {
    id: 'BASIC',
    name: 'BASIC',
    price: 199,
    features: ['CRM essencial', 'Vendas', 'Relatorios basicos']
  },
  {
    id: 'PRO',
    name: 'PRO',
    price: 399,
    features: ['Tudo do BASIC', 'Chat e suporte', 'Automacoes comerciais']
  },
  {
    id: 'PREMIUM',
    name: 'PREMIUM',
    price: 799,
    features: ['Tudo do PRO', 'Analises avancadas', 'Suporte prioritario']
  }
];

const Dashboard = () => {
  const { companyId, role, isAuthenticated, loading: authLoading, signOut } = useAuth();
  const token = getAccessToken();
  const currentUserId = useMemo(() => getUserIdFromJwt(token), [token]);
  const displayUserName = useMemo(() => getUserDisplayNameFromJwt(token), [token]);
  const displayUserEmail = useMemo(() => getUserEmailFromJwt(token), [token]);
  const companyIdFromJwt = useMemo(() => getCompanyIdFromJwt(token), [token]);

  const [leads, setLeads] = useState<Lead[]>([]);
  const [activeView, setActiveView] = useState<DashboardView>('pipeline');
  const [activeMenuName, setActiveMenuName] = useState('Vendas');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [formColumn, setFormColumn] = useState<LeadStatus | null>('NOVO_CONTATO');

  const [name, setName] = useState('');
  const [priority, setPriority] = useState<LeadPriority>('MEDIA');
  const [notes, setNotes] = useState('');
  const [value, setValue] = useState('');
  const [filterPriority, setFilterPriority] = useState<'ALL' | LeadPriority>('ALL');
  const [filterStatus, setFilterStatus] = useState<'ALL' | LeadStatus>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [draggedLeadId, setDraggedLeadId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<LeadStatus | null>(null);
  const [recentlyMovedLeadId, setRecentlyMovedLeadId] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [disabledSellerIds, setDisabledSellerIds] = useState<string[]>([]);
  const [rejectionViewMode, setRejectionViewMode] = useState<'table' | 'funnel'>('table');
  const [editingLeadId, setEditingLeadId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editPriority, setEditPriority] = useState<LeadPriority>('MEDIA');
  const [editNotes, setEditNotes] = useState('');
  const [editValue, setEditValue] = useState('');
  const [companies, setCompanies] = useState<Company[]>([]);
  const [managedUsers, setManagedUsers] = useState<ManagedUser[]>([]);
  const [adminLoading, setAdminLoading] = useState(false);
  const [companyName, setCompanyName] = useState('');
  const [companyLocation, setCompanyLocation] = useState('');
  const [companyPlan, setCompanyPlan] = useState<CompanyPlan>('BASIC');
  const [editingCompanyId, setEditingCompanyId] = useState<string | null>(null);
  const [editingCompanyName, setEditingCompanyName] = useState('');
  const [editingCompanyLocation, setEditingCompanyLocation] = useState('');
  const [editingCompanyPlan, setEditingCompanyPlan] = useState<CompanyPlan>('BASIC');
  const [editingCompanyStatus, setEditingCompanyStatus] = useState<CompanyStatus>('ACTIVE');
  const [userFormName, setUserFormName] = useState('');
  const [userFormEmail, setUserFormEmail] = useState('');
  const [userFormPassword, setUserFormPassword] = useState('');
  const [userFormRole, setUserFormRole] = useState<'ADMIN' | 'DEV' | 'CLIENT'>('CLIENT');
  const [userFormCompanyId, setUserFormCompanyId] = useState('');
  const [userFormCompanyName, setUserFormCompanyName] = useState('');
  const [userFormAccessUntil, setUserFormAccessUntil] = useState('');
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editingUserName, setEditingUserName] = useState('');
  const [editingUserEmail, setEditingUserEmail] = useState('');
  const [editingUserRole, setEditingUserRole] = useState<'ADMIN' | 'DEV' | 'CLIENT'>('CLIENT');
  const [editingUserCompanyId, setEditingUserCompanyId] = useState('');
  const [editingUserCompanyName, setEditingUserCompanyName] = useState('');
  const [editingUserAccessUntil, setEditingUserAccessUntil] = useState('');
  const [editingUserPassword, setEditingUserPassword] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [inventoryLoading, setInventoryLoading] = useState(false);
  const [showProductCreateModal, setShowProductCreateModal] = useState(false);
  const [productName, setProductName] = useState('');
  const [productPrice, setProductPrice] = useState('');
  const [productQuantity, setProductQuantity] = useState('0');
  const [productDescription, setProductDescription] = useState('');
  const [productCompanyId, setProductCompanyId] = useState('');
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [editingProductName, setEditingProductName] = useState('');
  const [editingProductPrice, setEditingProductPrice] = useState('');
  const [editingProductDescription, setEditingProductDescription] = useState('');
  const [integrationCompanyId, setIntegrationCompanyId] = useState('');
  const [integrationLoading, setIntegrationLoading] = useState(false);
  const [integrationApiConfig, setIntegrationApiConfig] = useState<IntegrationApiConfig | null>(null);
  const [integrationEndpoints, setIntegrationEndpoints] = useState<IntegrationEndpoint[]>([]);
  const [integrationEvents, setIntegrationEvents] = useState<IntegrationEvent[]>([]);
  const [integrationWebhookUrl, setIntegrationWebhookUrl] = useState('');
  const [integrationWebhookEvents, setIntegrationWebhookEvents] = useState<IntegrationEvent[]>(['sale.created']);
  const [settingsCompanyId, setSettingsCompanyId] = useState('');
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsSubscription, setSettingsSubscription] = useState<SubscriptionInfo | null>(null);
  const [settingsAccessUntil, setSettingsAccessUntil] = useState<string | null>(null);
  const [settingsPlan, setSettingsPlan] = useState<CompanyPlan>('BASIC');
  const [settingsExpiresAt, setSettingsExpiresAt] = useState('');
  const [settingsCompanyInfo, setSettingsCompanyInfo] = useState<CompanyInfo | null>(null);
  const [settingsNewPassword, setSettingsNewPassword] = useState('');
  const [settingsConfirmPassword, setSettingsConfirmPassword] = useState('');
  const [settingsPasswordLoading, setSettingsPasswordLoading] = useState(false);
  const [supportRequests, setSupportRequests] = useState<SupportRequest[]>([]);
  const [supportLoading, setSupportLoading] = useState(false);
  const [supportSubject, setSupportSubject] = useState('');
  const [supportMessage, setSupportMessage] = useState('');
  const [supportDrafts, setSupportDrafts] = useState<
    Record<string, { status: SupportRequestStatus; adminResponse: string }>
  >({});
  const [supportChatMessages, setSupportChatMessages] = useState<SupportChatMessage[]>([]);
  const [supportChatText, setSupportChatText] = useState('');
  const [selectedSupportRequestId, setSelectedSupportRequestId] = useState<string | null>(null);
  const [supportChatConnected, setSupportChatConnected] = useState(false);
  const [supportAdminOnline, setSupportAdminOnline] = useState(false);
  const [supportTypingText, setSupportTypingText] = useState('');
  const [supportUnreadCount, setSupportUnreadCount] = useState(0);
  const [adminSection, setAdminSection] = useState<'overview' | 'companies' | 'users' | 'plans' | 'support'>('overview');
  const [planCatalog, setPlanCatalog] = useState<AdminPlanConfig[]>(() => {
    if (typeof window === 'undefined') {
      return DEFAULT_ADMIN_PLANS;
    }

    try {
      const raw = window.localStorage.getItem('syncho-admin-plan-catalog');
      if (!raw) {
        return DEFAULT_ADMIN_PLANS;
      }

      const parsed = JSON.parse(raw) as AdminPlanConfig[];
      if (!Array.isArray(parsed) || !parsed.length) {
        return DEFAULT_ADMIN_PLANS;
      }

      return parsed;
    } catch (_error) {
      return DEFAULT_ADMIN_PLANS;
    }
  });
  const [planEditorId, setPlanEditorId] = useState<string | null>(null);
  const [planEditorName, setPlanEditorName] = useState('');
  const [planEditorPrice, setPlanEditorPrice] = useState('');
  const [planEditorFeatures, setPlanEditorFeatures] = useState('');
  const supportSocketRef = useRef<Socket | null>(null);
  const supportTypingTimeoutRef = useRef<number | null>(null);
  const selectedSupportRequestIdRef = useRef<string | null>(null);
  const activeViewRef = useRef<DashboardView>('pipeline');

  const playSupportNotificationTone = () => {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      const audioContext = new (window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext!)();
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(920, audioContext.currentTime);
      gain.gain.setValueAtTime(0.0001, audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.06, audioContext.currentTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.2);

      oscillator.connect(gain);
      gain.connect(audioContext.destination);
      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.22);

      oscillator.onended = () => {
        void audioContext.close();
      };
    } catch (_error) {
      // Ignora falhas de autoplay/audio policy.
    }
  };
  const [salesCompanyId, setSalesCompanyId] = useState('');
  const [saleLines, setSaleLines] = useState<SaleLine[]>([{ id: 1, productId: '', quantity: 1 }]);
  const [saleCustomerId, setSaleCustomerId] = useState('quick-sale');
  const [salePaymentMethod, setSalePaymentMethod] = useState<'cash' | 'pix' | 'card'>('pix');
  const [saleAmountReceivedInput, setSaleAmountReceivedInput] = useState('');
  const [saleHistorySearch, setSaleHistorySearch] = useState('');
  const [saleHistoryStatusFilter, setSaleHistoryStatusFilter] = useState<'ALL' | 'CONCLUIDA'>('ALL');
  const [saleHistoryPaymentFilter, setSaleHistoryPaymentFilter] = useState<'ALL' | 'cash' | 'pix' | 'card'>('ALL');
  const [salesLoading, setSalesLoading] = useState(false);
  const [salesAnalysis, setSalesAnalysis] = useState<SalesAnalysis | null>(null);
  const [salesChartMetric, setSalesChartMetric] = useState<'quantity' | 'price'>('quantity');
  const [salesTrendPeriod, setSalesTrendPeriod] = useState<'7d' | '30d' | '90d'>('30d');
  const [selectedTrendPointIndex, setSelectedTrendPointIndex] = useState<number | null>(null);
  const [selectedLowStockProductId, setSelectedLowStockProductId] = useState<string | null>(null);
  const [uiTheme, setUiTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window === 'undefined') {
      return 'light';
    }

    return window.localStorage.getItem('dashboard-theme') === 'dark' ? 'dark' : 'light';
  });

  const isDarkTheme = uiTheme === 'dark';
  const themedPanelClass = isDarkTheme
    ? 'glass-card glass-card-hover rounded-2xl p-5 shadow-sm'
    : 'rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg';
  const themedInputClass = isDarkTheme
    ? 'rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 outline-none transition-all focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/30'
    : 'rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-blue-400';
  const themedSelectClass = themedInputClass;
  const themedOptionClass = isDarkTheme ? 'bg-slate-900 text-slate-100' : '';
  const themedTitleClass = isDarkTheme ? 'text-2xl font-black text-white' : 'text-2xl font-black text-slate-800';
  const themedSubtextClass = isDarkTheme ? 'text-sm text-slate-300' : 'text-sm text-slate-500';
  const canOpenSupportChat = Boolean(selectedSupportRequestId);

  const filteredLeads = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return sortByPosition(leads).filter((lead) => {
      if (filterPriority !== 'ALL' && lead.priority !== filterPriority) {
        return false;
      }

      if (filterStatus !== 'ALL' && lead.status !== filterStatus) {
        return false;
      }

      if (normalizedSearch && !String(lead.name || '').toLowerCase().includes(normalizedSearch)) {
        return false;
      }

      return true;
    });
  }, [leads, filterPriority, filterStatus, searchTerm]);

  const board = useMemo(() => {
    const map = new Map<LeadStatus, Lead[]>(columns.map((column) => [column.key, []]));
    filteredLeads.forEach((lead) => {
      const bucket = map.get(lead.status) || [];
      bucket.push(lead);
      map.set(lead.status, bucket);
    });
    return map;
  }, [filteredLeads]);

  const funnelSellerOptions = useMemo(() => {
    return managedUsers
      .filter((user) => user.role === 'CLIENT')
      .map((user) => ({
        id: String(user.id || '').trim(),
        name: String(user.name || user.email || '').trim() || 'Vendedor'
      }))
      .filter((user) => user.id);
  }, [managedUsers]);

  const funnelLeadsEnriched = useMemo(() => {
    const stageIndexMap = new Map<LeadStatus, number>(salesStages.map((stage, index) => [stage.key, index]));

    return leads.map((lead) => {
      const source = inferLeadSource(lead);
      const seller = funnelSellerOptions.length
        ? funnelSellerOptions[hashString(lead.id) % funnelSellerOptions.length]
        : null;
      const stageIndex = stageIndexMap.get(lead.status) ?? 0;

      return {
        lead,
        source,
        sellerId: seller?.id || '',
        sellerName: seller?.name || 'Nao atribuido',
        stageIndex,
        estimatedSalesValue: Number(lead.value || 0) * (lead.status === 'FECHAMENTO' ? 1 : 0.35 + stageIndex * 0.13)
      };
    });
  }, [leads, funnelSellerOptions]);

  const funnelSellersAnalytics = useMemo(() => {
    const salesBySeller = new Map<string, number>();
    const recentSales = salesAnalysis?.recentSales || [];

    for (const sale of recentSales) {
      const sellerId = String(sale.userId || '').trim();

      if (!sellerId) {
        continue;
      }

      salesBySeller.set(sellerId, (salesBySeller.get(sellerId) || 0) + Number(sale.total || 0));
    }

    const fallbackAvg = recentSales.length
      ? recentSales.reduce((acc, sale) => acc + Number(sale.total || 0), 0) / Math.max(1, funnelSellerOptions.length)
      : 0;

    return funnelSellerOptions.map((seller) => {
      const entries = funnelLeadsEnriched.filter((item) => item.sellerId === seller.id);
      const leadsCount = entries.length;
      const salesVolume = Number(salesBySeller.get(seller.id) || (leadsCount ? fallbackAvg * (leadsCount / Math.max(1, funnelLeadsEnriched.length)) : 0));
      const stageCounts = salesStages.map((stage) => entries.filter((item) => item.lead.status === stage.key).length);

      const rejectionByStage = salesStages.map((_stage, stageIndex) => {
        if (!leadsCount) {
          return 0;
        }

        const reached = entries.filter((item) => item.stageIndex >= stageIndex).length;
        return Math.max(0, Math.min(100, 100 - (reached / leadsCount) * 100));
      });

      return {
        id: seller.id,
        name: seller.name,
        leadsCount,
        salesVolume,
        stageCounts,
        rejectionByStage
      };
    });
  }, [funnelLeadsEnriched, funnelSellerOptions, salesAnalysis]);

  const enabledSellerSet = useMemo(() => {
    const disabled = new Set(disabledSellerIds);
    return new Set(funnelSellersAnalytics.filter((seller) => !disabled.has(seller.id)).map((seller) => seller.id));
  }, [disabledSellerIds, funnelSellersAnalytics]);

  const isSellerEnabled = (sellerId: string) => {
    if (!funnelSellersAnalytics.length) {
      return true;
    }

    return enabledSellerSet.has(sellerId);
  };

  const fullTotals = useMemo(() => ({
    totalSales:
      Number(salesAnalysis?.totalRevenue || 0) ||
      funnelSellersAnalytics.reduce((acc, seller) => acc + seller.salesVolume, 0),
    totalLeads:
      funnelSellersAnalytics.reduce((acc, seller) => acc + seller.leadsCount, 0) ||
      leads.length
  }), [funnelSellersAnalytics, salesAnalysis, leads.length]);

  const enabledTotals = useMemo(() => ({
    totalSales: Math.max(
      0,
      fullTotals.totalSales -
        funnelSellersAnalytics
          .filter((seller) => !enabledSellerSet.has(seller.id))
          .reduce((acc, seller) => acc + seller.salesVolume, 0)
    ),
    totalLeads:
      funnelSellersAnalytics
        .filter((seller) => enabledSellerSet.has(seller.id))
        .reduce((acc, seller) => acc + seller.leadsCount, 0) ||
      leads.length
  }), [enabledSellerSet, funnelSellersAnalytics, fullTotals.totalSales, leads.length]);

  const salesDropPercent = useMemo(() => {
    if (!fullTotals.totalSales) {
      return 0;
    }

    return ((fullTotals.totalSales - enabledTotals.totalSales) / fullTotals.totalSales) * 100;
  }, [enabledTotals.totalSales, fullTotals.totalSales]);

  const leadsDropPercent = useMemo(() => {
    if (!fullTotals.totalLeads) {
      return 0;
    }

    return ((fullTotals.totalLeads - enabledTotals.totalLeads) / fullTotals.totalLeads) * 100;
  }, [enabledTotals.totalLeads, fullTotals.totalLeads]);

  const funnelBySource = useMemo(() => {
    return acquisitionSources.map((source) => {
      const entries = funnelLeadsEnriched.filter((item) => item.source === source && isSellerEnabled(item.sellerId));
      const totalSales = entries.reduce((acc, item) => acc + item.estimatedSalesValue, 0);

      return {
        source,
        leads: entries.length,
        sales: totalSales
      };
    });
  }, [enabledSellerSet, funnelLeadsEnriched, funnelSellersAnalytics]);

  const totalSalesBySource = useMemo(
    () => Math.max(1, funnelBySource.reduce((acc, item) => acc + item.sales, 0)),
    [funnelBySource]
  );

  const sourceShareData = useMemo(
    () => funnelBySource.map((item) => ({
      ...item,
      sharePercent: (item.sales / totalSalesBySource) * 100
    })),
    [funnelBySource, totalSalesBySource]
  );

  const sourceDonutGradient = useMemo(() => {
    const colors = ['#22d3ee', '#14b8a6', '#818cf8', '#fbbf24'];
    let start = 0;
    const segments = sourceShareData.map((item, index) => {
      const end = start + item.sharePercent;
      const segment = `${colors[index % colors.length]} ${start.toFixed(2)}% ${end.toFixed(2)}%`;
      start = end;
      return segment;
    });

    return `conic-gradient(${segments.join(', ')})`;
  }, [sourceShareData]);

  const stageAverageDays = useMemo(() => {
    const activeEntries = funnelLeadsEnriched.filter((item) => isSellerEnabled(item.sellerId));
    const total = Math.max(1, activeEntries.length);

    return salesStages.map((stage, stageIndex) => {
      const reached = activeEntries.filter((item) => item.stageIndex >= stageIndex).length;
      const reachRate = reached / total;
      const baseDays = [4.2, 5.4, 8.8, 4.8, 2.6][stageIndex] || 3;
      const adjustedDays = baseDays * (1 + (1 - reachRate) * 0.45);

      return {
        ...stage,
        avgDays: Number(adjustedDays.toFixed(1))
      };
    });
  }, [enabledSellerSet, funnelLeadsEnriched, funnelSellersAnalytics]);

  const heatmapMax = useMemo(
    () => Math.max(1, ...funnelSellersAnalytics.flatMap((seller) => seller.rejectionByStage)),
    [funnelSellersAnalytics]
  );

  const funnelDiagramData = useMemo(() => {
    const activeEntries = funnelLeadsEnriched.filter((item) => isSellerEnabled(item.sellerId));
    const total = Math.max(1, activeEntries.length);

    return salesStages.map((stage, stageIndex) => {
      const inStage = activeEntries.filter((item) => item.stageIndex >= stageIndex);
      const avgActionSize = inStage.length
        ? inStage.reduce((acc, item) => acc + item.estimatedSalesValue, 0) / inStage.length
        : 0;

      return {
        ...stage,
        count: inStage.length,
        ratio: inStage.length / total,
        avgActionSize
      };
    });
  }, [enabledSellerSet, funnelLeadsEnriched, funnelSellersAnalytics]);

  const toggleSellerEnabled = (sellerId: string) => {
    setDisabledSellerIds((current) => {
      if (current.includes(sellerId)) {
        return current.filter((id) => id !== sellerId);
      }

      return [...current, sellerId];
    });
  };

  const companyOptions = useMemo(
    () =>
      companies.map((company) => ({
        id: String(company.id || '').trim(),
        name: String(company.name || 'Empresa sem nome').trim()
      })),
    [companies]
  );

  const lowStockChartData = useMemo(() => {
    const base = [...(salesAnalysis?.lowStockProducts || [])];
    const metricKey = salesChartMetric;

    return base
      .sort((left, right) => Number(right[metricKey] || 0) - Number(left[metricKey] || 0))
      .slice(0, 6)
      .map((product) => ({
        id: product.id,
        name: product.name,
        code: product.code,
        quantity: Number(product.quantity || 0),
        price: Number(product.price || 0),
        value: Number(product[metricKey] || 0)
      }));
  }, [salesAnalysis, salesChartMetric]);

  const lowStockChartMaxValue = useMemo(
    () => Math.max(1, ...lowStockChartData.map((item) => item.value)),
    [lowStockChartData]
  );

  const selectedLowStockProduct = useMemo(() => {
    if (!lowStockChartData.length) {
      return null;
    }

    const selected = lowStockChartData.find((item) => item.id === selectedLowStockProductId);
    return selected || lowStockChartData[0];
  }, [lowStockChartData, selectedLowStockProductId]);

  const salesKpiChartData = useMemo(
    () => [
      {
        id: 'revenue',
        label: 'Faturamento',
        value: Number(salesAnalysis?.totalRevenue || 0),
        displayValue: formatCurrency(Number(salesAnalysis?.totalRevenue || 0))
      },
      {
        id: 'sales',
        label: 'Vendas',
        value: Number(salesAnalysis?.totalSales || 0),
        displayValue: String(Number(salesAnalysis?.totalSales || 0))
      },
      {
        id: 'ticket',
        label: 'Ticket medio',
        value: Number(salesAnalysis?.averageTicket || 0),
        displayValue: formatCurrency(Number(salesAnalysis?.averageTicket || 0))
      },
      {
        id: 'stock',
        label: 'Estoque',
        value: Number(salesAnalysis?.totalStockUnits || 0),
        displayValue: String(Number(salesAnalysis?.totalStockUnits || 0))
      },
      {
        id: 'products',
        label: 'Produtos',
        value: Number(salesAnalysis?.productsCount || 0),
        displayValue: String(Number(salesAnalysis?.productsCount || 0))
      }
    ],
    [salesAnalysis]
  );

  const salesKpiChartMaxValue = useMemo(
    () => Math.max(1, ...salesKpiChartData.map((item) => item.value)),
    [salesKpiChartData]
  );

  const salesTrendSeries = useMemo(() => {
    const totalRevenue = Number(salesAnalysis?.totalRevenue || 0);
    const baseRevenue = Math.max(1, totalRevenue || 1);

    const periods: Record<'7d' | '30d' | '90d', { points: number; labelPrefix: string }> = {
      '7d': { points: 7, labelPrefix: 'D' },
      '30d': { points: 6, labelPrefix: 'S' },
      '90d': { points: 6, labelPrefix: 'M' }
    };

    const config = periods[salesTrendPeriod];

    return Array.from({ length: config.points }, (_item, index) => {
      const progress = config.points <= 1 ? 1 : index / (config.points - 1);
      const wave = Math.sin(index * 1.3) * 0.11;
      const growth = 0.52 + progress * 0.58 + wave;
      const value = Math.max(1, baseRevenue * growth);

      return {
        label: `${config.labelPrefix}${index + 1}`,
        value
      };
    });
  }, [salesAnalysis, salesTrendPeriod]);

  const salesTrendPoints = useMemo(() => {
    const values = salesTrendSeries.map((item) => Number(item.value || 0));
    const max = Math.max(1, ...values);
    const stepX = salesTrendSeries.length > 1 ? (520 - 48) / (salesTrendSeries.length - 1) : 0;

    return salesTrendSeries.map((point, index) => ({
      ...point,
      index,
      x: 24 + stepX * index,
      y: 186 - (Number(point.value || 0) / max) * (210 - 48)
    }));
  }, [salesTrendSeries]);

  const activeTrendPoint = useMemo(() => {
    if (!salesTrendPoints.length) {
      return null;
    }

    if (selectedTrendPointIndex === null) {
      return salesTrendPoints[salesTrendPoints.length - 1];
    }

    return salesTrendPoints.find((point) => point.index === selectedTrendPointIndex) || salesTrendPoints[salesTrendPoints.length - 1];
  }, [salesTrendPoints, selectedTrendPointIndex]);

  const monthlySalesSeries = useMemo(() => {
    const monthLabels = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const monthTotals = Array.from({ length: 12 }, (_item, monthIndex) => ({
      month: monthLabels[monthIndex],
      sales: 0
    }));

    const recentSales = salesAnalysis?.recentSales || [];

    for (const sale of recentSales) {
      const date = new Date(String(sale.createdAt || ''));

      if (Number.isNaN(date.getTime())) {
        continue;
      }

      monthTotals[date.getMonth()].sales += Number(sale.total || 0);
    }

    const normalized = monthTotals.slice(6).concat(monthTotals.slice(0, 6)).slice(0, 6);
    const hasRealData = normalized.some((item) => item.sales > 0);

    if (hasRealData) {
      return normalized;
    }

    return [
      { month: 'Jan', sales: 12000 },
      { month: 'Fev', sales: 16400 },
      { month: 'Mar', sales: 14900 },
      { month: 'Abr', sales: 18200 },
      { month: 'Mai', sales: 21600 },
      { month: 'Jun', sales: 23900 }
    ];
  }, [salesAnalysis]);

  const growthPercent = useMemo(() => {
    if (monthlySalesSeries.length < 2) {
      return 0;
    }

    const last = Number(monthlySalesSeries[monthlySalesSeries.length - 1]?.sales || 0);
    const previous = Number(monthlySalesSeries[monthlySalesSeries.length - 2]?.sales || 0);

    if (previous <= 0) {
      return last > 0 ? 100 : 0;
    }

    return ((last - previous) / previous) * 100;
  }, [monthlySalesSeries]);

  const salesCustomerOptions = useMemo(() => {
    const unique = new Map<string, string>();

    for (const lead of leads) {
      const id = String(lead.id || '').trim();
      const customerName = String(lead.name || '').trim();

      if (!id || !customerName) {
        continue;
      }

      if (!unique.has(id)) {
        unique.set(id, customerName);
      }
    }

    return Array.from(unique.entries()).map(([id, name]) => ({ id, name }));
  }, [leads]);

  const selectedSalesCustomerName = useMemo(() => {
    if (saleCustomerId === 'quick-sale') {
      return null;
    }

    return salesCustomerOptions.find((customer) => customer.id === saleCustomerId)?.name || null;
  }, [saleCustomerId, salesCustomerOptions]);

  const salesCartItems = useMemo(() => {
    return saleLines
      .map((line) => {
        const product = products.find((item) => item.id === line.productId) || null;
        const quantity = Number(line.quantity || 0);
        const price = Number(product?.price || 0);
        const lineTotal = price * quantity;

        return {
          lineId: line.id,
          productId: line.productId,
          product,
          quantity,
          price,
          lineTotal
        };
      })
      .filter((item) => item.product && item.quantity > 0);
  }, [saleLines, products]);

  const salesCartTotal = useMemo(
    () => salesCartItems.reduce((acc, item) => acc + Number(item.lineTotal || 0), 0),
    [salesCartItems]
  );

  const saleAmountReceived = useMemo(() => {
    if (salePaymentMethod !== 'cash') {
      return salesCartTotal;
    }

    return parseMoneyInput(saleAmountReceivedInput);
  }, [saleAmountReceivedInput, salePaymentMethod, salesCartTotal]);

  const saleChangeDue = useMemo(() => {
    if (salePaymentMethod !== 'cash') {
      return 0;
    }

    const change = saleAmountReceived - salesCartTotal;
    return change > 0 ? change : 0;
  }, [saleAmountReceived, salePaymentMethod, salesCartTotal]);

  const saleMissingAmount = useMemo(() => {
    if (salePaymentMethod !== 'cash') {
      return 0;
    }

    const missing = salesCartTotal - saleAmountReceived;
    return missing > 0 ? missing : 0;
  }, [saleAmountReceived, salePaymentMethod, salesCartTotal]);

  const salesTodayTotal = useMemo(() => {
    const todayKey = new Date().toDateString();

    return (salesAnalysis?.recentSales || []).reduce((acc, sale) => {
      const createdAt = new Date(String(sale.createdAt || ''));

      if (Number.isNaN(createdAt.getTime()) || createdAt.toDateString() !== todayKey) {
        return acc;
      }

      return acc + Number(sale.total || 0);
    }, 0);
  }, [salesAnalysis]);

  const salesMonthlyTotal = useMemo(() => {
    const now = new Date();
    const month = now.getMonth();
    const year = now.getFullYear();

    return (salesAnalysis?.recentSales || []).reduce((acc, sale) => {
      const createdAt = new Date(String(sale.createdAt || ''));

      if (
        Number.isNaN(createdAt.getTime())
        || createdAt.getMonth() !== month
        || createdAt.getFullYear() !== year
      ) {
        return acc;
      }

      return acc + Number(sale.total || 0);
    }, 0);
  }, [salesAnalysis]);

  const bestSellingProductLabel = useMemo(() => {
    if (!lowStockChartData.length) {
      return 'Sem dados';
    }

    const best = [...lowStockChartData].sort((left, right) => Number(right.value || 0) - Number(left.value || 0))[0];
    return String(best?.name || 'Sem dados');
  }, [lowStockChartData]);

  const salesHistoryRows = useMemo(() => {
    return (salesAnalysis?.recentSales || []).map((sale) => ({
      id: String(sale.id || ''),
      customer: String(sale.customerName || '').trim() || 'Venda rapida',
      total: Number(sale.total || 0),
      paymentMethodKey: String(sale.paymentMethod || '').trim().toLowerCase() || 'pix',
      paymentMethod: formatSalePaymentMethod(sale.paymentMethod),
      amountReceived: Number(sale.amountReceived || 0),
      changeDue: Number(sale.changeDue || 0),
      createdAt: String(sale.createdAt || ''),
      status: 'CONCLUIDA' as const
    }));
  }, [salesAnalysis]);

  const filteredSalesHistoryRows = useMemo(() => {
    const search = saleHistorySearch.trim().toLowerCase();

    return salesHistoryRows.filter((row) => {
      if (saleHistoryStatusFilter !== 'ALL' && row.status !== saleHistoryStatusFilter) {
        return false;
      }

      if (saleHistoryPaymentFilter !== 'ALL' && row.paymentMethodKey !== saleHistoryPaymentFilter) {
        return false;
      }

      if (!search) {
        return true;
      }

      return (
        row.customer.toLowerCase().includes(search)
        || row.id.toLowerCase().includes(search)
        || row.paymentMethod.toLowerCase().includes(search)
        || formatCurrency(row.total).toLowerCase().includes(search)
      );
    });
  }, [saleHistoryPaymentFilter, saleHistorySearch, saleHistoryStatusFilter, salesHistoryRows]);

  const salesTodayByPayment = useMemo(() => {
    const rows = salesAnalysis?.paymentSummaryToday || [];
    const map = new Map(rows.map((entry) => [entry.method, entry]));

    return (['cash', 'pix', 'card'] as const).map((method) => {
      const entry = map.get(method);
      return {
        method,
        label: formatSalePaymentMethod(method),
        salesCount: Number(entry?.salesCount || 0),
        total: Number(entry?.total || 0),
        amountReceived: Number(entry?.amountReceived || 0),
        changeGiven: Number(entry?.changeGiven || 0)
      };
    });
  }, [salesAnalysis]);

  const downloadCsvFile = (filename: string, rows: string[][]) => {
    const csvContent = rows.map((row) => row.map((cell) => escapeCsvValue(cell)).join(';')).join('\n');
    const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');

    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  };

  const exportSalesHistoryCsv = () => {
    if (!filteredSalesHistoryRows.length) {
      setStatus('Nao ha vendas para exportar com os filtros atuais.');
      return;
    }

    const dateTag = new Date().toISOString().slice(0, 10);
    const rows = [
      ['id', 'cliente', 'total', 'pagamento', 'recebido', 'troco', 'status', 'data'],
      ...filteredSalesHistoryRows.map((sale) => [
        sale.id,
        sale.customer,
        Number(sale.total || 0).toFixed(2),
        sale.paymentMethod,
        Number(sale.amountReceived || 0).toFixed(2),
        Number(sale.changeDue || 0).toFixed(2),
        sale.status,
        sale.createdAt
      ])
    ];

    downloadCsvFile(`historico-vendas-${dateTag}.csv`, rows);
    setStatus('Historico de vendas exportado com sucesso.');
    showToast('CSV do historico gerado');
  };

  const exportDailyClosingCsv = () => {
    if (!salesTodayByPayment.length) {
      setStatus('Nao ha dados de fechamento para exportar.');
      return;
    }

    const dateTag = new Date().toISOString().slice(0, 10);
    const rows = [
      ['metodo', 'vendas', 'total', 'recebido', 'troco'],
      ...salesTodayByPayment.map((entry) => [
        entry.label,
        String(entry.salesCount),
        Number(entry.total || 0).toFixed(2),
        Number(entry.amountReceived || 0).toFixed(2),
        Number(entry.changeGiven || 0).toFixed(2)
      ])
    ];

    downloadCsvFile(`fechamento-diario-${dateTag}.csv`, rows);
    setStatus('Fechamento diario exportado com sucesso.');
    showToast('CSV do fechamento gerado');
  };

  const summaryCards = useMemo(
    () => [
      {
        key: 'revenue',
        label: 'Receita total',
        value: formatCurrency(Number(salesAnalysis?.totalRevenue || enabledTotals.totalSales || 0)),
        variation: growthPercent,
        icon: DollarSign
      },
      {
        key: 'sales',
        label: 'Total de vendas',
        value: String(Number(salesAnalysis?.totalSales || 0)),
        variation: -Math.abs(salesDropPercent),
        icon: ShoppingCart
      },
      {
        key: 'clients',
        label: 'Clientes',
        value: String(role === 'ADMIN' ? managedUsers.filter((user) => user.role === 'CLIENT').length : leads.length),
        variation: -Math.abs(leadsDropPercent),
        icon: Users
      },
      {
        key: 'growth',
        label: 'Crescimento %',
        value: `${growthPercent >= 0 ? '+' : ''}${growthPercent.toFixed(1)}%`,
        variation: growthPercent,
        icon: TrendingUp
      }
    ],
    [salesAnalysis, enabledTotals.totalSales, growthPercent, salesDropPercent, role, managedUsers, leads.length, leadsDropPercent]
  );

  const sourcePieData = useMemo(
    () =>
      sourceShareData.map((item) => ({
        name: item.source,
        value: Number(item.leads || 0)
      })),
    [sourceShareData]
  );

  const sourcePieColors = ['#3b82f6', '#06b6d4', '#0ea5e9', '#6366f1'];

  const sellerPerformanceData = useMemo(
    () =>
      funnelSellersAnalytics
        .slice(0, 4)
        .map((seller) => ({
          name: String(seller.name || 'Vendedor').slice(0, 14),
          valor: Number(seller.salesVolume || 0)
        })),
    [funnelSellersAnalytics]
  );

  const analyticsTopProducts = useMemo(() => {
    const map: Record<string, { name: string; revenue: number; qty: number }> = {};
    for (const sale of salesAnalysis?.recentSales || []) {
      const key = String(sale.userId || 'other');
      if (!map[key]) map[key] = { name: key.slice(0, 12), revenue: 0, qty: 0 };
      map[key].revenue += Number(sale.total || 0);
      map[key].qty += 1;
    }
    const productMap: Record<string, { name: string; revenue: number }> = {};
    for (const p of products) {
      const rev = Number(p.price || 0) * Number(p.quantity || 0);
      productMap[p.id] = { name: String(p.name || '').slice(0, 16), revenue: rev };
    }
    return Object.values(productMap)
      .filter((p) => p.revenue > 0)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 6)
      .map((p) => ({ name: p.name, valor: p.revenue }));
  }, [salesAnalysis, products]);

  const aiInsights = useMemo(() => {
    const insights: Array<{ icon: 'up' | 'warn' | 'award'; text: string }> = [];
    if (growthPercent > 0) {
      insights.push({ icon: 'up', text: `Vendas cresceram ${growthPercent.toFixed(1)}% em relação ao mês anterior.` });
    } else if (growthPercent < 0) {
      insights.push({ icon: 'warn', text: `Queda de ${Math.abs(growthPercent).toFixed(1)}% nas vendas. Revise sua estratégia.` });
    }
    const lowStock = (salesAnalysis?.lowStockProducts || []).filter((p) => Number(p.quantity) <= 5);
    for (const p of lowStock.slice(0, 2)) {
      insights.push({ icon: 'warn', text: `Estoque crítico: "${p.name}" com apenas ${p.quantity} unidades.` });
    }
    if (sellerPerformanceData.length > 0) {
      const top = sellerPerformanceData[0];
      insights.push({ icon: 'award', text: `Melhor vendedor atual: ${top.name} com ${formatCurrency(Number(top.valor || 0))} em vendas.` });
    }
    if (products.length > 0) {
      const topProduct = [...products].sort((a, b) => Number(b.price || 0) * Number(b.quantity || 0) - Number(a.price || 0) * Number(a.quantity || 0))[0];
      if (topProduct) {
        insights.push({ icon: 'up', text: `Produto em destaque: "${topProduct.name}" com maior valor em estoque.` });
      }
    }
    if (insights.length === 0) {
      insights.push({ icon: 'up', text: 'Adicione vendas e estoque para receber análises personalizadas.' });
    }
    return insights.slice(0, 4);
  }, [growthPercent, salesAnalysis, sellerPerformanceData, products]);

  const adminPlanPriceMap = useMemo(() => {
    return planCatalog.reduce<Record<string, number>>((acc, plan) => {
      acc[String(plan.id || '').toUpperCase()] = Number(plan.price || 0);
      return acc;
    }, {});
  }, [planCatalog]);

  const adminPlanDistributionData = useMemo(() => {
    const counts: Record<CompanyPlan, number> = { BASIC: 0, PRO: 0, PREMIUM: 0 };

    for (const company of companies) {
      const plan = ((company.plan || 'BASIC') as CompanyPlan);
      counts[plan] += 1;
    }

    const normalized = [
      { name: 'BASIC', value: counts.BASIC || 0 },
      { name: 'PRO', value: counts.PRO || 0 },
      { name: 'PREMIUM', value: counts.PREMIUM || 0 }
    ];

    if (normalized.every((item) => item.value === 0)) {
      return [
        { name: 'BASIC', value: 6 },
        { name: 'PRO', value: 4 },
        { name: 'PREMIUM', value: 2 }
      ];
    }

    return normalized;
  }, [companies]);

  const adminNewCompaniesSeries = useMemo(() => {
    const monthLabels = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const now = new Date();
    const buckets = Array.from({ length: 6 }, (_value, idx) => {
      const date = new Date(now.getFullYear(), now.getMonth() - (5 - idx), 1);
      return {
        key: `${date.getFullYear()}-${date.getMonth()}`,
        month: monthLabels[date.getMonth()],
        companies: 0,
        revenue: 0
      };
    });

    for (let idx = 0; idx < companies.length; idx += 1) {
      const company = companies[idx];
      const rawCreatedAt = String(
        (company as unknown as { createdAt?: string; created_at?: string }).createdAt
        || (company as unknown as { createdAt?: string; created_at?: string }).created_at
        || ''
      );

      let date = new Date(rawCreatedAt);
      if (Number.isNaN(date.getTime())) {
        date = new Date(now.getFullYear(), now.getMonth() - (idx % 6), 1);
      }

      const key = `${date.getFullYear()}-${date.getMonth()}`;
      const bucket = buckets.find((item) => item.key === key);

      if (!bucket) {
        continue;
      }

      bucket.companies += 1;
      const planKey = String(company.plan || 'BASIC').toUpperCase();
      bucket.revenue += Number(adminPlanPriceMap[planKey] || 0);
    }

    const hasData = buckets.some((item) => item.companies > 0 || item.revenue > 0);

    if (!hasData) {
      return [
        { month: 'Jan', companies: 2, revenue: 800 },
        { month: 'Fev', companies: 3, revenue: 1400 },
        { month: 'Mar', companies: 4, revenue: 1800 },
        { month: 'Abr', companies: 5, revenue: 2300 },
        { month: 'Mai', companies: 6, revenue: 3100 },
        { month: 'Jun', companies: 7, revenue: 3900 }
      ];
    }

    return buckets.map((item) => ({
      month: item.month,
      companies: item.companies,
      revenue: item.revenue
    }));
  }, [companies, adminPlanPriceMap]);

  const adminOverview = useMemo(() => {
    const totalCompanies = companies.length;
    const inactiveStatuses = new Set<CompanyStatus>(['BLOCKED', 'CANCELED', 'PAST_DUE']);
    const activeCompanies = companies.filter((company) => !inactiveStatuses.has((company.subscription_status || company.subscriptionStatus || 'ACTIVE') as CompanyStatus));
    const inactiveCompanies = totalCompanies - activeCompanies.length;

    const mrr = activeCompanies.reduce((acc, company) => {
      const planKey = String(company.plan || 'BASIC').toUpperCase();
      return acc + Number(adminPlanPriceMap[planKey] || 0);
    }, 0);

    const currentRevenue = Number(adminNewCompaniesSeries[adminNewCompaniesSeries.length - 1]?.revenue || 0);
    const previousRevenue = Number(adminNewCompaniesSeries[adminNewCompaniesSeries.length - 2]?.revenue || 0);
    const monthlyGrowth = previousRevenue > 0 ? ((currentRevenue - previousRevenue) / previousRevenue) * 100 : currentRevenue > 0 ? 100 : 0;

    return {
      mrr,
      totalCompanies,
      monthlyGrowth,
      activeCompanies: activeCompanies.length,
      inactiveCompanies
    };
  }, [companies, adminPlanPriceMap, adminNewCompaniesSeries]);

  const fetchAdminData = async () => {
    if (role !== 'ADMIN' || !token) {
      return;
    }

    setAdminLoading(true);

    try {
      const response = await fetch('/api/admin/dashboard', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const result = await response.json();

      if (!response.ok) {
        setStatus(result.message || 'Falha ao carregar area administrativa.');
        return;
      }

      setCompanies((result.companies || []) as Company[]);
      setManagedUsers((result.users || []) as ManagedUser[]);
    } catch (_error) {
      setStatus('Erro de rede ao carregar area administrativa.');
    } finally {
      setAdminLoading(false);
    }
  };

  const openPlanEditor = (plan?: AdminPlanConfig) => {
    if (!plan) {
      setPlanEditorId(null);
      setPlanEditorName('');
      setPlanEditorPrice('');
      setPlanEditorFeatures('');
      return;
    }

    setPlanEditorId(plan.id);
    setPlanEditorName(plan.name);
    setPlanEditorPrice(String(Number(plan.price || 0)));
    setPlanEditorFeatures(plan.features.join('\n'));
  };

  const savePlanEditor = () => {
    const name = planEditorName.trim().toUpperCase();
    const price = Number(planEditorPrice);

    if (!name) {
      setStatus('Informe o nome do plano.');
      return;
    }

    if (!Number.isFinite(price) || price < 0) {
      setStatus('Informe um preco valido para o plano.');
      return;
    }

    const features = planEditorFeatures
      .split('\n')
      .map((feature) => feature.trim())
      .filter(Boolean);

    setPlanCatalog((current) => {
      const id = (planEditorId || name).toUpperCase();
      const next: AdminPlanConfig = { id, name, price, features };

      if (current.some((item) => item.id === id)) {
        return current.map((item) => (item.id === id ? next : item));
      }

      return [...current, next];
    });

    setStatus('Plano salvo com sucesso.');
    showToast('Plano atualizado');
    openPlanEditor();
  };

  const deletePlanItem = (planId: string) => {
    const normalizedId = String(planId || '').toUpperCase();

    if (!normalizedId || ['BASIC', 'PRO', 'PREMIUM'].includes(normalizedId)) {
      setStatus('Os planos padrao nao podem ser removidos.');
      return;
    }

    setPlanCatalog((current) => current.filter((item) => item.id !== normalizedId));

    if (planEditorId === normalizedId) {
      openPlanEditor();
    }

    setStatus('Plano removido com sucesso.');
    showToast('Plano removido');
  };

  const updateCompanyPlanOrStatus = async (
    company: Company,
    updates: { plan?: CompanyPlan; status?: CompanyStatus }
  ) => {
    if (!token) {
      return;
    }

    setAdminLoading(true);

    try {
      const response = await fetch(`/api/admin/companies/${company.id}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: String(company.name || '').trim(),
          location: String(company.location || '').trim() || null,
          plan: updates.plan || (company.plan || 'BASIC'),
          status: updates.status || ((company.subscription_status || company.subscriptionStatus || 'ACTIVE') as CompanyStatus)
        })
      });
      const result = await response.json();

      if (!response.ok) {
        setStatus(result.message || 'Falha ao atualizar empresa.');
        return;
      }

      await fetchAdminData();
      setStatus('Empresa atualizada com sucesso.');
      showToast('Empresa atualizada');
    } catch (_error) {
      setStatus('Erro de rede ao atualizar empresa.');
    } finally {
      setAdminLoading(false);
    }
  };

  const toggleCompanyBlocked = async (company: Company) => {
    const currentStatus = (company.subscription_status || company.subscriptionStatus || 'ACTIVE') as CompanyStatus;
    const nextStatus: CompanyStatus = currentStatus === 'BLOCKED' ? 'ACTIVE' : 'BLOCKED';
    await updateCompanyPlanOrStatus(company, { status: nextStatus });
  };

  const setCompanyPlanQuick = async (company: Company, plan: CompanyPlan) => {
    await updateCompanyPlanOrStatus(company, { plan });
  };

  const accessCompanyContext = (targetCompanyId: string) => {
    const normalized = String(targetCompanyId || '').trim();
    if (!normalized) {
      return;
    }

    setSettingsCompanyId(normalized);
    setSalesCompanyId(normalized);
    setProductCompanyId(normalized);
    setActiveView('sales');
    setActiveMenuName('Relatorios');
    setStatus('Contexto da empresa carregado.');
    showToast('Acessando empresa no modo cliente');
  };

  const toggleUserEnabled = async (user: ManagedUser) => {
    if (!token || user.role !== 'CLIENT') {
      return;
    }

    const currentAccessUntil = String(user.access_until || user.accessUntil || '').trim();
    const currentlyDisabled = Boolean(currentAccessUntil && new Date(currentAccessUntil).getTime() < Date.now());
    const nextAccessUntil = currentlyDisabled ? null : new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    setAdminLoading(true);

    try {
      const response = await fetch(`/api/admin/users/${user.id}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: String(user.name || '').trim(),
          email: String(user.email || '').trim(),
          role: user.role,
          companyId: String(user.company_id || user.companyId || '').trim() || null,
          companyName: null,
          accessUntil: nextAccessUntil
        })
      });
      const result = await response.json();

      if (!response.ok) {
        setStatus(result.message || 'Falha ao atualizar usuario.');
        return;
      }

      await fetchAdminData();
      setStatus(currentlyDisabled ? 'Usuario habilitado com sucesso.' : 'Usuario desabilitado com sucesso.');
      showToast(currentlyDisabled ? 'Usuario habilitado' : 'Usuario desabilitado');
    } catch (_error) {
      setStatus('Erro de rede ao atualizar usuario.');
    } finally {
      setAdminLoading(false);
    }
  };

  const getTargetCompanyId = (selectedForAdmin: string) => {
    if (role === 'ADMIN') {
      return selectedForAdmin.trim() || '';
    }

    return String(companyId || companyIdFromJwt || getSessionCompanyId() || '').trim();
  };

  const copyToClipboard = async (value: string, successMessage: string) => {
    try {
      await navigator.clipboard.writeText(value);
      showToast(successMessage);
    } catch (_error) {
      setStatus('Nao foi possivel copiar para a area de transferencia.');
    }
  };

  const fetchIntegrationConfig = async () => {
    if (!token) {
      return;
    }

    const targetCompanyId = getTargetCompanyId(integrationCompanyId);

    if (!targetCompanyId) {
      setIntegrationApiConfig(null);
      setIntegrationEndpoints([]);
      setIntegrationEvents([]);
      setStatus('Selecione uma empresa para configurar a integracao API.');
      return;
    }

    setIntegrationLoading(true);

    try {
      const response = await fetch(`/api/dashboard/integrations/custom-api?companyId=${encodeURIComponent(targetCompanyId)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const result = await response.json();

      if (!response.ok) {
        setStatus(result.message || 'Falha ao carregar a integracao customizada.');
        return;
      }

      setIntegrationApiConfig(result.api as IntegrationApiConfig);
      setIntegrationEndpoints((result.endpoints || []) as IntegrationEndpoint[]);
      setIntegrationEvents((result.events || []) as IntegrationEvent[]);
    } catch (_error) {
      setStatus('Erro de rede ao carregar integracoes.');
    } finally {
      setIntegrationLoading(false);
    }
  };

  const regenerateIntegrationApiKey = async () => {
    if (!token) {
      return;
    }

    const targetCompanyId = getTargetCompanyId(integrationCompanyId);

    if (!targetCompanyId) {
      setStatus('Selecione uma empresa para regenerar a API key.');
      return;
    }

    setIntegrationLoading(true);

    try {
      const response = await fetch('/api/dashboard/integrations/custom-api/regenerate', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ companyId: targetCompanyId })
      });
      const result = await response.json();

      if (!response.ok) {
        setStatus(result.message || 'Falha ao regenerar API key.');
        return;
      }

      setIntegrationApiConfig(result.api as IntegrationApiConfig);
      showToast('API key regenerada');
    } catch (_error) {
      setStatus('Erro de rede ao regenerar API key.');
    } finally {
      setIntegrationLoading(false);
    }
  };

  const addIntegrationWebhook = () => {
    const url = integrationWebhookUrl.trim();

    if (!/^https?:\/\//i.test(url)) {
      setStatus('Informe uma URL de webhook valida com http:// ou https://.');
      return;
    }

    if (!integrationWebhookEvents.length) {
      setStatus('Selecione pelo menos um evento para o webhook.');
      return;
    }

    setIntegrationApiConfig((current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        webhooks: [
          ...current.webhooks,
          {
            id: `local-${Date.now()}`,
            url,
            events: integrationWebhookEvents,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
        ]
      };
    });

    setIntegrationWebhookUrl('');
    setIntegrationWebhookEvents(['sale.created']);
  };

  const removeIntegrationWebhook = (webhookId: string) => {
    setIntegrationApiConfig((current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        webhooks: current.webhooks.filter((webhook) => webhook.id !== webhookId)
      };
    });
  };

  const toggleIntegrationWebhookEvent = (event: IntegrationEvent) => {
    setIntegrationWebhookEvents((current) =>
      current.includes(event) ? current.filter((item) => item !== event) : [...current, event]
    );
  };

  const saveIntegrationWebhooks = async () => {
    if (!token || !integrationApiConfig) {
      return;
    }

    const targetCompanyId = getTargetCompanyId(integrationCompanyId);

    if (!targetCompanyId) {
      setStatus('Selecione uma empresa para salvar os webhooks.');
      return;
    }

    setIntegrationLoading(true);

    try {
      const response = await fetch('/api/dashboard/integrations/custom-api/webhooks', {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          companyId: targetCompanyId,
          webhooks: integrationApiConfig.webhooks.map((webhook) => ({
            id: webhook.id,
            url: webhook.url,
            events: webhook.events
          }))
        })
      });
      const result = await response.json();

      if (!response.ok) {
        setStatus(result.message || 'Falha ao salvar webhooks.');
        return;
      }

      setIntegrationApiConfig(result.api as IntegrationApiConfig);
      showToast('Webhooks salvos');
    } catch (_error) {
      setStatus('Erro de rede ao salvar webhooks.');
    } finally {
      setIntegrationLoading(false);
    }
  };

  const getSupportChatCompanyId = (requestId: string | null = selectedSupportRequestId) => {
    const normalizedRequestId = String(requestId || '').trim();
    const selectedRequest = normalizedRequestId
      ? supportRequests.find((request) => request.id === normalizedRequestId)
      : null;
    const requestCompanyId = String(selectedRequest?.companyId || '').trim();

    if (requestCompanyId) {
      return requestCompanyId;
    }

    return getTargetCompanyId(settingsCompanyId);
  };

  useEffect(() => {
    if (role === 'ADMIN') {
      return;
    }

    const linkedCompanyId = String(companyId || companyIdFromJwt || '').trim();

    if (!linkedCompanyId || linkedCompanyId === productCompanyId) {
      return;
    }

    setProductCompanyId(linkedCompanyId);
  }, [role, companyId, companyIdFromJwt, productCompanyId]);

  useEffect(() => {
    if (role === 'ADMIN') {
      return;
    }

    const linkedCompanyId = String(companyId || companyIdFromJwt || '').trim();

    if (!linkedCompanyId || linkedCompanyId === integrationCompanyId) {
      return;
    }

    setIntegrationCompanyId(linkedCompanyId);
  }, [role, companyId, companyIdFromJwt, integrationCompanyId]);

  const fetchProducts = async () => {
    if (!token) {
      return;
    }

    const targetCompanyId = getTargetCompanyId(productCompanyId);

    if (!targetCompanyId) {
      setProducts([]);
      setStatus(role === 'ADMIN' ? 'Selecione uma empresa para visualizar produtos.' : 'Empresa vinculada nao encontrada para visualizar produtos.');
      return;
    }

    setProductsLoading(true);

    try {
      const response = await fetch(
        `/api/dashboard/products?companyId=${encodeURIComponent(targetCompanyId)}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      const result = await response.json();

      if (response.status === 401) {
        setStatus('Sessao expirada. Faca login novamente para continuar.');
        return;
      }

      if (!response.ok) {
        setStatus(result.message || 'Falha ao carregar produtos.');
        return;
      }

      setProducts((result.products || []) as Product[]);
      setStatus('Produtos carregados com sucesso.');
    } catch (_error) {
      setStatus('Erro de rede ao carregar produtos.');
    } finally {
      setProductsLoading(false);
    }
  };

  const fetchInventory = async () => {
    if (!token) {
      return;
    }

    const targetCompanyId = getTargetCompanyId(productCompanyId);

    if (!targetCompanyId) {
      setInventoryItems([]);
      setStatus('Selecione uma empresa para visualizar estoque.');
      return;
    }

    setInventoryLoading(true);

    try {
      const response = await fetch(
        `/api/dashboard/inventory?companyId=${encodeURIComponent(targetCompanyId)}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      const result = await response.json();

      if (!response.ok) {
        setStatus(result.message || 'Falha ao carregar estoque.');
        return;
      }

      setInventoryItems((result.inventory || []) as InventoryItem[]);
      setStatus('Estoque carregado com sucesso.');
    } catch (_error) {
      setStatus('Erro de rede ao carregar estoque.');
    } finally {
      setInventoryLoading(false);
    }
  };

  const adjustInventory = async (productId: string, action: 'add' | 'remove', amount = 1) => {
    if (!token) {
      return;
    }

    const targetCompanyId = getTargetCompanyId(productCompanyId);

    if (!targetCompanyId) {
      setStatus('Selecione uma empresa para ajustar estoque.');
      return;
    }

    setInventoryLoading(true);

    try {
      const response = await fetch(`/api/dashboard/inventory/${encodeURIComponent(productId)}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ companyId: targetCompanyId, action, amount })
      });
      const result = await response.json();

      if (!response.ok) {
        setStatus(result.message || 'Falha ao ajustar estoque.');
        return;
      }

      setStatus('Estoque atualizado com sucesso.');
      await Promise.all([fetchInventory(), fetchProducts(), fetchSalesAnalysis({ silent: true })]);
    } catch (_error) {
      setStatus('Erro de rede ao ajustar estoque.');
    } finally {
      setInventoryLoading(false);
    }
  };

  const fetchSettings = async () => {
    if (!token) {
      return;
    }

    let targetCompanyId = getTargetCompanyId(settingsCompanyId);

    // Para cliente, tenta descobrir a empresa pelo endpoint /me se o contexto local vier vazio.
    if (!targetCompanyId && role !== 'ADMIN') {
      try {
        const meResponse = await fetch('/api/dashboard/me', {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (meResponse.ok) {
          const meResult = await meResponse.json();
          const resolvedCompanyId = String(meResult?.user?.companyId || '').trim();

          if (resolvedCompanyId) {
            targetCompanyId = resolvedCompanyId;
            setSettingsCompanyId(resolvedCompanyId);
          }
        }
      } catch (_error) {
        // Ignora erro de fallback e segue para mensagem padrão.
      }
    }

    if (!targetCompanyId) {
      setSettingsSubscription(null);
      setSettingsAccessUntil(null);
      setStatus(role === 'ADMIN' ? 'Selecione uma empresa para abrir configuracoes.' : 'Empresa vinculada nao encontrada para carregar configuracoes.');
      return;
    }

    setSettingsLoading(true);

    try {
      const response = await fetch(`/api/dashboard/company-info?companyId=${encodeURIComponent(targetCompanyId)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.status === 401) {
        setStatus('Sessao expirada. Faca login novamente para carregar configuracoes.');
        return;
      }

      let result = await response.json();
      let loadedByFallback = false;

      if (!response.ok && role !== 'ADMIN') {
        // Fallback para cliente: tenta pelo endpoint /data (também traz subscription).
        const fallbackResponse = await fetch(`/api/dashboard/data?companyId=${encodeURIComponent(targetCompanyId)}`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (fallbackResponse.ok) {
          const fallbackResult = await fallbackResponse.json();
          result = {
            company: {
              id: targetCompanyId,
              name: 'Empresa vinculada',
              location: null
            },
            subscription: fallbackResult.subscription || null,
            accessUntil: fallbackResult.subscription?.expiresAt || null
          };
          loadedByFallback = true;
        }
      }

      if (!response.ok && !loadedByFallback) {
        setStatus(result.message || 'Falha ao carregar configuracoes.');
        return;
      }

      const companyInfo = (result.company || null) as CompanyInfo | null;
      const subscription = (result.subscription || null) as SubscriptionInfo | null;
      setSettingsCompanyInfo(companyInfo);
      setSettingsSubscription(subscription);
      setSettingsAccessUntil(result.accessUntil ? String(result.accessUntil) : null);
      setSettingsPlan((subscription?.plan || 'BASIC') as CompanyPlan);
      setSettingsExpiresAt(String(subscription?.expiresAt || '').slice(0, 10));
      setStatus('Configuracoes carregadas com sucesso.');
    } catch (_error) {
      setStatus('Erro de rede ao carregar configuracoes.');
    } finally {
      setSettingsLoading(false);
    }
  };

  const fetchSupportRequests = async () => {
    if (!token) {
      return;
    }

    const targetCompanyId = getTargetCompanyId(settingsCompanyId);

    if (!targetCompanyId && role !== 'ADMIN') {
      setSupportRequests([]);
      setStatus('Selecione uma empresa para abrir suporte.');
      return;
    }

    setSupportLoading(true);

    try {
      const query = targetCompanyId ? `?companyId=${encodeURIComponent(targetCompanyId)}` : '';
      const response = await fetch(`/api/dashboard/support-requests${query}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const result = await response.json();

      if (!response.ok) {
        setStatus(result.message || 'Falha ao carregar solicitacoes de suporte.');
        return;
      }

      const requests = ((result.requests || []) as SupportRequest[]).map((request) => ({
        ...request,
        status: (request.status || 'PENDING') as SupportRequestStatus,
        adminResponse: request.adminResponse || null
      }));

      setSupportRequests(requests);
      setSupportDrafts(
        requests.reduce<Record<string, { status: SupportRequestStatus; adminResponse: string }>>(
          (acc, request) => {
            acc[request.id] = {
              status: request.status,
              adminResponse: request.adminResponse || ''
            };
            return acc;
          },
          {}
        )
      );
    } catch (_error) {
      setStatus('Erro de rede ao carregar solicitacoes de suporte.');
    } finally {
      setSupportLoading(false);
    }
  };

  const fetchSupportChatMessages = async (requestId: string | null = selectedSupportRequestId) => {
    if (!token) {
      return;
    }

    const targetCompanyId = getSupportChatCompanyId(requestId);

    if (!targetCompanyId || !requestId) {
      setSupportChatMessages([]);
      return;
    }

    try {
      const response = await fetch(
        `/api/dashboard/support-chat/messages?companyId=${encodeURIComponent(targetCompanyId)}&requestId=${encodeURIComponent(requestId)}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      const result = await response.json();

      if (!response.ok) {
        setStatus(result.message || 'Falha ao carregar chat de suporte.');
        return;
      }

      setSupportChatMessages((result.messages || []) as SupportChatMessage[]);
    } catch (_error) {
      setStatus('Erro de rede ao carregar chat de suporte.');
    }
  };

  const sendSupportChatMessage = async () => {
    if (!token) {
      return;
    }

    if (!canOpenSupportChat || !selectedSupportRequestId) {
      setStatus('Abra um chamado para conversar no chat.');
      showToast('Abra um chamado para liberar o chat');
      return;
    }

    const targetCompanyId = getSupportChatCompanyId(selectedSupportRequestId);
    const content = supportChatText.trim();

    if (!targetCompanyId) {
      setStatus('Selecione uma empresa para conversar no suporte.');
      return;
    }

    if (!content) {
      return;
    }

    setSupportChatText('');

    if (supportSocketRef.current?.connected) {
      supportSocketRef.current.emit('support:send-message', {
        companyId: targetCompanyId,
        requestId: selectedSupportRequestId,
        content
      });
      return;
    }

    try {
      const response = await fetch('/api/dashboard/support-chat/messages', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          companyId: targetCompanyId,
          requestId: selectedSupportRequestId,
          content
        })
      });
      const result = await response.json();

      if (!response.ok) {
        setStatus(result.message || 'Falha ao enviar mensagem no chat de suporte.');
        return;
      }

      setSupportChatMessages((current) => [...current, result.data as SupportChatMessage]);
    } catch (_error) {
      setStatus('Erro de rede ao enviar mensagem no chat de suporte.');
    }
  };

  const emitSupportTyping = (isTyping: boolean) => {
    const targetCompanyId = getSupportChatCompanyId(selectedSupportRequestId);

    if (!targetCompanyId || !selectedSupportRequestId || !supportSocketRef.current?.connected) {
      return;
    }

    supportSocketRef.current.emit('support:typing', {
      companyId: targetCompanyId,
      requestId: selectedSupportRequestId,
      isTyping
    });
  };

  const createSupportRequest = async () => {
    if (!token) {
      return;
    }

    const targetCompanyId = getTargetCompanyId(settingsCompanyId);

    if (!targetCompanyId) {
      setStatus('Empresa nao identificada para abrir suporte.');
      return;
    }

    if (!supportMessage.trim() || supportMessage.trim().length < 4) {
      setStatus('Descreva melhor o que deseja alterar para enviar ao admin (minimo de 4 caracteres).');
      showToast('Mensagem de suporte muito curta');
      return;
    }

    setSupportLoading(true);

    try {
      const response = await fetch('/api/dashboard/support-requests', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          companyId: targetCompanyId,
          subject: supportSubject.trim() || 'Solicitacao de alteracao',
          message: supportMessage.trim()
        })
      });
      const result = await response.json();

      if (!response.ok) {
        setStatus(result.message || 'Falha ao enviar solicitacao de suporte.');
        return;
      }

      setSupportSubject('');
      setSupportMessage('');
      setStatus('Solicitacao enviada para o admin com sucesso.');
      showToast('Solicitacao enviada');
      const createdRequestId = String(result?.request?.id || '').trim() || null;
      await fetchSupportRequests();

      if (createdRequestId) {
        setSelectedSupportRequestId(createdRequestId);
        await fetchSupportChatMessages(createdRequestId);
      }
    } catch (_error) {
      setStatus('Erro de rede ao enviar solicitacao de suporte.');
    } finally {
      setSupportLoading(false);
    }
  };

  const saveSupportRequestByAdmin = async (requestId: string, companyOfRequest: string) => {
    if (!token || role !== 'ADMIN') {
      return;
    }

    const draft = supportDrafts[requestId];

    if (!draft) {
      setStatus('Nao foi possivel localizar os dados da solicitacao.');
      return;
    }

    setSupportLoading(true);

    try {
      const response = await fetch(`/api/dashboard/support-requests/${requestId}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          companyId: companyOfRequest,
          status: draft.status,
          adminResponse: draft.adminResponse.trim()
        })
      });
      const result = await response.json();

      if (!response.ok) {
        setStatus(result.message || 'Falha ao atualizar solicitacao de suporte.');
        return;
      }

      setStatus('Solicitacao de suporte atualizada com sucesso.');
      showToast('Suporte atualizado');
      await fetchSupportRequests();
    } catch (_error) {
      setStatus('Erro de rede ao atualizar solicitacao de suporte.');
    } finally {
      setSupportLoading(false);
    }
  };

  const fetchSalesAnalysis = async (options?: { silent?: boolean }) => {
    if (!token) {
      return;
    }

    const silent = Boolean(options?.silent);

    const targetCompanyId = getTargetCompanyId(salesCompanyId);

    if (!targetCompanyId) {
      setSalesAnalysis(null);
      if (!silent) {
        setStatus('Selecione uma empresa para ver a analise de vendas.');
      }
      return;
    }

    setSalesLoading(true);

    try {
      const response = await fetch(
        `/api/dashboard/sales/analysis?companyId=${encodeURIComponent(targetCompanyId)}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      const result = await response.json();

      if (!response.ok) {
        if (!silent) {
          setStatus(result.message || 'Falha ao carregar analise de vendas.');
        }
        return;
      }

      setSalesAnalysis(result as SalesAnalysis);
      if (!silent) {
        setStatus('Analise de vendas carregada com sucesso.');
      }
    } catch (_error) {
      if (!silent) {
        setStatus('Erro de rede ao carregar analise de vendas.');
      }
    } finally {
      setSalesLoading(false);
    }
  };

  const showToast = (message: string) => {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    setToasts((currentToasts) => [...currentToasts, { id, message }]);

    window.setTimeout(() => {
      setToasts((currentToasts) => currentToasts.filter((toast) => toast.id !== id));
    }, 2600);
  };

  const fetchLeads = async () => {
    if (!token || !companyId) {
      setStatus('Sessao sem empresa vinculada para carregar o funil.');
      return;
    }

    setLoading(true);
    setStatus('Carregando leads...');

    try {
      const response = await fetch(`/api/dashboard/leads?companyId=${encodeURIComponent(companyId)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const result = await response.json();

      if (!response.ok) {
        setStatus(result.message || 'Falha ao carregar leads.');
        return;
      }

      setLeads((result.leads || []) as Lead[]);
      setStatus('Leads carregados com sucesso.');
    } catch (_error) {
      setStatus('Erro de rede ao carregar leads.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchLeads();
  }, [token, companyId]);

  useEffect(() => {
    if (role === 'ADMIN') {
      void fetchAdminData();
    }
  }, [role, token]);

  useEffect(() => {
    if (activeView === 'products') {
      void fetchProducts();
    }

    if (activeView === 'inventory') {
      void fetchInventory();
      void fetchProducts();
    }
  }, [activeView, token, productCompanyId]);

  useEffect(() => {
    if (activeView === 'settings') {
      void fetchSettings();
    }
  }, [activeView, token, settingsCompanyId]);

  useEffect(() => {
    if (activeView === 'integrations') {
      void fetchIntegrationConfig();
    }
  }, [activeView, token, integrationCompanyId]);

  useEffect(() => {
    if (activeView === 'chat') {
      setSupportUnreadCount(0);
      void fetchSupportRequests();

      if (selectedSupportRequestId) {
        void fetchSupportChatMessages(selectedSupportRequestId);
      }
    }
  }, [activeView, token, settingsCompanyId, selectedSupportRequestId]);

  useEffect(() => {
    selectedSupportRequestIdRef.current = selectedSupportRequestId;
  }, [selectedSupportRequestId]);

  useEffect(() => {
    activeViewRef.current = activeView;
  }, [activeView]);

  useEffect(() => {
    if (activeView === 'admin' && role === 'ADMIN') {
      void fetchAdminData();
      void fetchSupportRequests();
    }
  }, [activeView, role, token]);

  useEffect(() => {
    if (!token) {
      return;
    }

    const socket = io(getApiBaseUrl(), {
      path: '/socket.io',
      transports: ['websocket'],
      auth: { token }
    });

    supportSocketRef.current = socket;

    socket.on('connect', () => {
      setSupportChatConnected(true);
    });

    socket.on('disconnect', () => {
      setSupportChatConnected(false);
    });

    socket.on('support:new-message', (incoming: SupportChatMessage) => {
      const currentRequestId = selectedSupportRequestIdRef.current;
      const currentView = activeViewRef.current;

      if (currentView === 'chat' && currentRequestId && incoming.requestId === currentRequestId) {
        setSupportChatMessages((current) => {
          if (current.some((msg) => msg.id === incoming.id)) {
            return current;
          }

          return [...current, incoming];
        });
        return;
      }

      showToast(`Nova mensagem de ${incoming.senderName || 'suporte'}`);
      playSupportNotificationTone();
      setSupportUnreadCount((current) => current + 1);
    });

    socket.on(
      'support:presence',
      (presence: { companyId: string; adminOnline: boolean; clientOnline: boolean }) => {
        setSupportAdminOnline(Boolean(presence.adminOnline));
      }
    );

    socket.on(
      'support:typing',
      (typingPayload: {
        companyId: string;
        requestId: string | null;
        userId: string;
        userName: string;
        userRole: 'ADMIN' | 'CLIENT';
        isTyping: boolean;
      }) => {
        if (!typingPayload.isTyping) {
          setSupportTypingText('');
          return;
        }

        const text =
          typingPayload.userRole === 'ADMIN'
            ? 'Suporte esta digitando...'
            : `${typingPayload.userName || 'Cliente'} esta digitando...`;

        setSupportTypingText(text);

        if (supportTypingTimeoutRef.current) {
          window.clearTimeout(supportTypingTimeoutRef.current);
        }

        supportTypingTimeoutRef.current = window.setTimeout(() => {
          setSupportTypingText('');
        }, 1600);
      }
    );

    socket.on('support:error', (payload: { message?: string }) => {
      if (payload?.message) {
        setStatus(payload.message);
      }
    });

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('support:new-message');
      socket.off('support:presence');
      socket.off('support:typing');
      socket.off('support:error');
      socket.disconnect();
      supportSocketRef.current = null;
      setSupportChatConnected(false);
      if (supportTypingTimeoutRef.current) {
        window.clearTimeout(supportTypingTimeoutRef.current);
      }
    };
  }, [token]);

  useEffect(() => {
    if (activeView !== 'chat') {
      return;
    }

    if (!supportSocketRef.current?.connected) {
      return;
    }

    const companyIds = new Set<string>();
    const targetCompanyId = getTargetCompanyId(settingsCompanyId);

    if (targetCompanyId) {
      companyIds.add(targetCompanyId);
    }

    if (role === 'ADMIN' && !targetCompanyId) {
      supportRequests.forEach((request) => {
        const companyOfRequest = String(request.companyId || '').trim();

        if (companyOfRequest) {
          companyIds.add(companyOfRequest);
        }
      });
    }

    const selectedRequestCompanyId = getSupportChatCompanyId(selectedSupportRequestId);

    if (selectedRequestCompanyId) {
      companyIds.add(selectedRequestCompanyId);
    }

    companyIds.forEach((companyIdToJoin) => {
      supportSocketRef.current?.emit('support:join', { companyId: companyIdToJoin });
    });
  }, [activeView, role, settingsCompanyId, selectedSupportRequestId, supportRequests, supportChatConnected]);

  useEffect(() => {
    if (activeView === 'sales') {
      void fetchProducts();
      void fetchSalesAnalysis();
      return;
    }

    if (activeView === 'pipeline') {
      void fetchSalesAnalysis({ silent: true });
    }
  }, [activeView, token, salesCompanyId]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('dashboard-theme', uiTheme);
    }
  }, [uiTheme]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('syncho-admin-plan-catalog', JSON.stringify(planCatalog));
    }
  }, [planCatalog]);

  const handleCreateLead = async () => {
    if (!token || !companyId || !formColumn) {
      setStatus('Informe uma coluna valida para criar lead.');
      return;
    }

    if (!name.trim()) {
      setStatus('Nome do cliente e obrigatorio.');
      return;
    }

    const payload = {
      name: name.trim(),
      status: formColumn,
      priority,
      notes: notes.trim(),
      value: Number(value || 0),
      companyId
    };

    setStatus('Criando card...');

    try {
      const response = await fetch('/api/dashboard/leads', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const result = await response.json();

      if (!response.ok) {
        setStatus(result.message || 'Falha ao criar lead.');
        return;
      }

      const created = result.lead as Lead;
      setLeads((prev) => [...prev, created]);
      setName('');
      setNotes('');
      setValue('');
      setPriority('MEDIA');
      setStatus('Card criado com sucesso.');
    } catch (_error) {
      setStatus('Erro de rede ao criar card.');
    }
  };

  const handleCreateCompany = async () => {
    if (!token) {
      return;
    }

    if (!companyName.trim()) {
      setStatus('Informe o nome da empresa.');
      return;
    }

    setAdminLoading(true);

    try {
      const response = await fetch('/api/admin/companies', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: companyName.trim(),
          location: companyLocation.trim() || null,
          plan: companyPlan
        })
      });
      const result = await response.json();

      if (!response.ok) {
        setStatus(result.message || 'Falha ao criar empresa.');
        return;
      }

      setCompanyName('');
      setCompanyLocation('');
      setCompanyPlan('BASIC');
      setStatus('Empresa criada com sucesso.');
      showToast('Empresa criada');
      await fetchAdminData();
    } catch (_error) {
      setStatus('Erro de rede ao criar empresa.');
    } finally {
      setAdminLoading(false);
    }
  };

  const openCompanyEditor = (company: Company) => {
    setEditingCompanyId(company.id);
    setEditingCompanyName(String(company.name || ''));
    setEditingCompanyLocation(String(company.location || ''));
    setEditingCompanyPlan((company.plan || 'BASIC') as CompanyPlan);
    setEditingCompanyStatus(
      ((company.subscription_status || company.subscriptionStatus || 'ACTIVE') as CompanyStatus)
    );
  };

  const cancelCompanyEditor = () => {
    setEditingCompanyId(null);
    setEditingCompanyName('');
    setEditingCompanyLocation('');
    setEditingCompanyPlan('BASIC');
    setEditingCompanyStatus('ACTIVE');
  };

  const saveCompanyChanges = async () => {
    if (!token || !editingCompanyId || !editingCompanyName.trim()) {
      return;
    }

    setAdminLoading(true);

    try {
      const response = await fetch(`/api/admin/companies/${editingCompanyId}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: editingCompanyName.trim(),
          location: editingCompanyLocation.trim() || null,
          plan: editingCompanyPlan,
          status: editingCompanyStatus
        })
      });
      const result = await response.json();

      if (!response.ok) {
        setStatus(result.message || 'Falha ao atualizar empresa.');
        return;
      }

      cancelCompanyEditor();
      setStatus('Empresa atualizada com sucesso.');
      showToast('Empresa atualizada');
      await fetchAdminData();
    } catch (_error) {
      setStatus('Erro de rede ao atualizar empresa.');
    } finally {
      setAdminLoading(false);
    }
  };

  const deleteCompany = async (targetCompanyId: string) => {
    if (!token || !window.confirm('Excluir esta empresa e os dados vinculados?')) {
      return;
    }

    setAdminLoading(true);

    try {
      const response = await fetch(`/api/admin/companies/${targetCompanyId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const result = await response.json();

      if (!response.ok) {
        setStatus(result.message || 'Falha ao excluir empresa.');
        return;
      }

      if (editingCompanyId === targetCompanyId) {
        cancelCompanyEditor();
      }

      setStatus('Empresa excluida com sucesso.');
      showToast('Empresa excluida');
      await fetchAdminData();
    } catch (_error) {
      setStatus('Erro de rede ao excluir empresa.');
    } finally {
      setAdminLoading(false);
    }
  };

  const handleCreateUser = async () => {
    if (!token) {
      return;
    }

    if (!userFormName.trim() || !userFormEmail.trim() || !userFormPassword.trim()) {
      setStatus('Preencha nome, email e senha do cliente.');
      return;
    }

    if ((userFormRole === 'CLIENT' || userFormRole === 'DEV') && !userFormCompanyId.trim() && !userFormCompanyName.trim()) {
      setStatus(`${userFormRole} precisa de uma empresa existente ou novo nome de empresa.`);
      return;
    }

    setAdminLoading(true);

    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: userFormName.trim(),
          email: userFormEmail.trim(),
          password: userFormPassword,
          role: userFormRole,
          companyId: userFormRole === 'ADMIN' ? null : userFormCompanyId.trim() || null,
          companyName: (userFormRole === 'CLIENT' || userFormRole === 'DEV') ? userFormCompanyName.trim() || null : null,
          accessUntil: (userFormRole === 'CLIENT' || userFormRole === 'DEV') && userFormAccessUntil ? new Date(userFormAccessUntil).toISOString() : null
        })
      });
      const result = await response.json();

      if (!response.ok) {
        setStatus(result.message || 'Falha ao criar cliente.');
        return;
      }

      setUserFormName('');
      setUserFormEmail('');
      setUserFormPassword('');
      setUserFormRole('CLIENT');
      setUserFormCompanyId('');
      setUserFormCompanyName('');
      setUserFormAccessUntil('');
      setStatus('Cliente criado com sucesso.');
      showToast('Cliente criado');
      await fetchAdminData();
    } catch (_error) {
      setStatus('Erro de rede ao criar cliente.');
    } finally {
      setAdminLoading(false);
    }
  };

  const openUserEditor = (user: ManagedUser) => {
    setEditingUserId(user.id);
    setEditingUserName(String(user.name || ''));
    setEditingUserEmail(String(user.email || ''));
    setEditingUserRole(user.role || 'CLIENT');
    setEditingUserCompanyId(String(user.company_id || user.companyId || '').trim());
    setEditingUserCompanyName('');
    setEditingUserAccessUntil(String(user.access_until || user.accessUntil || '').slice(0, 10));
    setEditingUserPassword('');
  };

  const cancelUserEditor = () => {
    setEditingUserId(null);
    setEditingUserName('');
    setEditingUserEmail('');
    setEditingUserRole('CLIENT');
    setEditingUserCompanyId('');
    setEditingUserCompanyName('');
    setEditingUserAccessUntil('');
    setEditingUserPassword('');
  };

  const saveUserChanges = async () => {
    if (!token || !editingUserId || !editingUserName.trim() || !editingUserEmail.trim()) {
      return;
    }

    if ((editingUserRole === 'CLIENT' || editingUserRole === 'DEV') && !editingUserCompanyId.trim() && !editingUserCompanyName.trim()) {
      setStatus(`${editingUserRole} precisa de empresa para salvar.`);
      return;
    }

    setAdminLoading(true);

    try {
      const response = await fetch(`/api/admin/users/${editingUserId}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: editingUserName.trim(),
          email: editingUserEmail.trim(),
          role: editingUserRole,
          companyId: editingUserRole === 'ADMIN' ? null : editingUserCompanyId.trim() || null,
          companyName: (editingUserRole === 'CLIENT' || editingUserRole === 'DEV') ? editingUserCompanyName.trim() || null : null,
          accessUntil:
            (editingUserRole === 'CLIENT' || editingUserRole === 'DEV')
              ? editingUserAccessUntil
                ? new Date(editingUserAccessUntil).toISOString()
                : null
              : null,
          password: editingUserPassword.trim() || undefined
        })
      });
      const result = await response.json();

      if (!response.ok) {
        setStatus(result.message || 'Falha ao atualizar cliente.');
        return;
      }

      cancelUserEditor();
      setStatus('Cliente atualizado com sucesso.');
      showToast('Cliente atualizado');
      await fetchAdminData();
    } catch (_error) {
      setStatus('Erro de rede ao atualizar cliente.');
    } finally {
      setAdminLoading(false);
    }
  };

  const deleteUser = async (userId: string) => {
    if (!token || !window.confirm('Excluir este cliente?')) {
      return;
    }

    setAdminLoading(true);

    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const result = await response.json();

      if (!response.ok) {
        setStatus(result.message || 'Falha ao excluir cliente.');
        return;
      }

      if (editingUserId === userId) {
        cancelUserEditor();
      }

      setStatus('Cliente excluido com sucesso.');
      showToast('Cliente excluido');
      await fetchAdminData();
    } catch (_error) {
      setStatus('Erro de rede ao excluir cliente.');
    } finally {
      setAdminLoading(false);
    }
  };

  const handleCreateProduct = async () => {
    if (!token) {
      return;
    }

    const targetCompanyId = getTargetCompanyId(productCompanyId);

    if (!targetCompanyId) {
      setStatus(role === 'ADMIN' ? 'Selecione uma empresa para criar produto.' : 'Empresa vinculada nao encontrada para criar produto.');
      return;
    }

    if (!productName.trim() || !String(productPrice).trim()) {
      setStatus('Preencha nome e preco do produto.');
      return;
    }

    const initialQuantity = Math.max(0, Math.floor(Number(productQuantity || 0)));

    if (!Number.isFinite(initialQuantity)) {
      setStatus('Informe uma quantidade inicial valida para estoque.');
      return;
    }

    setProductsLoading(true);

    try {
      const response = await fetch('/api/dashboard/products', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: productName.trim(),
          price: Number(productPrice || 0),
          quantity: initialQuantity,
          description: productDescription.trim(),
          companyId: targetCompanyId
        })
      });
      const result = await response.json();

      if (response.status === 401) {
        setStatus('Sessao expirada. Faca login novamente para criar produto.');
        return;
      }

      if (!response.ok) {
        setStatus(result.message || 'Falha ao criar produto.');
        return;
      }

      setProductName('');
      setProductPrice('');
      setProductQuantity('0');
      setProductDescription('');
      setShowProductCreateModal(false);
      setStatus('Produto criado com sucesso.');
      showToast('Produto criado');
      await fetchProducts();
    } catch (_error) {
      setStatus('Erro de rede ao criar produto.');
    } finally {
      setProductsLoading(false);
    }
  };

  const openProductEditor = (product: Product) => {
    setEditingProductId(product.id);
    setEditingProductName(String(product.name || ''));
    setEditingProductPrice(String(Number(product.price || 0)));
    setEditingProductDescription(String(product.description || ''));
  };

  const cancelProductEditor = () => {
    setEditingProductId(null);
    setEditingProductName('');
    setEditingProductPrice('');
    setEditingProductDescription('');
  };

  const saveProductChanges = async () => {
    if (!token || !editingProductId) {
      return;
    }

    const targetCompanyId = getTargetCompanyId(productCompanyId);

    if (!targetCompanyId) {
      setStatus(role === 'ADMIN' ? 'Selecione uma empresa para editar produto.' : 'Empresa vinculada nao encontrada para editar produto.');
      return;
    }

    setProductsLoading(true);

    try {
      const response = await fetch(`/api/dashboard/products/${editingProductId}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: editingProductName.trim(),
          price: Number(editingProductPrice || 0),
          description: editingProductDescription.trim(),
          companyId: targetCompanyId
        })
      });
      const result = await response.json();

      if (!response.ok) {
        setStatus(result.message || 'Falha ao atualizar produto.');
        return;
      }

      cancelProductEditor();
      setStatus('Produto atualizado com sucesso.');
      showToast('Produto atualizado');
      await fetchProducts();
    } catch (_error) {
      setStatus('Erro de rede ao atualizar produto.');
    } finally {
      setProductsLoading(false);
    }
  };

  const deleteProduct = async (targetProductId: string) => {
    if (!token || !window.confirm('Excluir este produto?')) {
      return;
    }

    const targetCompanyId = getTargetCompanyId(productCompanyId);

    if (!targetCompanyId) {
      setStatus(role === 'ADMIN' ? 'Selecione uma empresa para excluir produto.' : 'Empresa vinculada nao encontrada para excluir produto.');
      return;
    }

    setProductsLoading(true);

    try {
      const response = await fetch(
        `/api/dashboard/products/${targetProductId}?companyId=${encodeURIComponent(targetCompanyId)}`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      const result = await response.json();

      if (!response.ok) {
        setStatus(result.message || 'Falha ao excluir produto.');
        return;
      }

      if (editingProductId === targetProductId) {
        cancelProductEditor();
      }

      setStatus('Produto excluido com sucesso.');
      showToast('Produto excluido');
      await fetchProducts();
    } catch (_error) {
      setStatus('Erro de rede ao excluir produto.');
    } finally {
      setProductsLoading(false);
    }
  };

  const saveSettings = async () => {
    if (role !== 'ADMIN') {
      setStatus('CLIENT pode apenas visualizar o plano e vencimento da empresa.');
      return;
    }

    if (!token) {
      return;
    }

    const targetCompanyId = getTargetCompanyId(settingsCompanyId);

    if (!targetCompanyId) {
      setStatus('Selecione uma empresa para salvar configuracoes.');
      return;
    }

    setSettingsLoading(true);

    try {
      const response = await fetch('/api/dashboard/subscribe', {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          plan: settingsPlan,
          companyId: targetCompanyId,
          expiresAt: settingsExpiresAt ? new Date(settingsExpiresAt).toISOString() : null
        })
      });
      const result = await response.json();

      if (!response.ok) {
        setStatus(result.message || 'Falha ao salvar configuracoes.');
        return;
      }

      setStatus('Configuracoes salvas com sucesso.');
      showToast('Configuracoes salvas');
      
      // Atualiza localmente com sucesso imediato
      if (settingsSubscription) {
        setSettingsSubscription({
          ...settingsSubscription,
          plan: settingsPlan,
          expiresAt: settingsExpiresAt ? new Date(settingsExpiresAt).toISOString() : null
        });
      }
      
      // Depois recarrega do servidor para sincronizar
      setTimeout(() => {
        void fetchSettings();
        if (role === 'ADMIN') {
          void fetchAdminData();
        }
      }, 500);
    } catch (_error) {
      setStatus('Erro de rede ao salvar configuracoes.');
    } finally {
      setSettingsLoading(false);
    }
  };

  const changePassword = async () => {
    if (!token) {
      return;
    }

    if (!settingsNewPassword.trim() || settingsNewPassword.trim().length < 6) {
      showToast('A senha deve ter ao menos 6 caracteres');
      return;
    }

    if (settingsNewPassword !== settingsConfirmPassword) {
      showToast('As senhas nao conferem');
      return;
    }

    setSettingsPasswordLoading(true);

    try {
      const response = await fetch('/api/dashboard/profile/password', {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ newPassword: settingsNewPassword.trim() })
      });
      const result = await response.json();

      if (!response.ok) {
        showToast(result.message || 'Falha ao alterar senha');
        return;
      }

      setSettingsNewPassword('');
      setSettingsConfirmPassword('');
      showToast('Senha alterada com sucesso');
    } catch (_error) {
      showToast('Erro de rede ao alterar senha');
    } finally {
      setSettingsPasswordLoading(false);
    }
  };

  const addSaleLine = () => {
    setSaleLines((currentLines) => [
      ...currentLines,
      { id: Date.now() + Math.floor(Math.random() * 1000), productId: '', quantity: 1 }
    ]);
  };

  const updateSaleLine = (lineId: number, patch: Partial<SaleLine>) => {
    setSaleLines((currentLines) =>
      currentLines.map((line) => (line.id === lineId ? { ...line, ...patch } : line))
    );
  };

  const updateSaleLineQuantityFromInput = (lineId: number, rawValue: string) => {
    const digitsOnly = String(rawValue || '').replace(/\D/g, '');

    if (!digitsOnly) {
      updateSaleLine(lineId, { quantity: 0 });
      return;
    }

    updateSaleLine(lineId, { quantity: Number(digitsOnly) });
  };

  const normalizeSaleLineQuantity = (lineId: number, value: number) => {
    updateSaleLine(lineId, { quantity: Number.isFinite(value) && value > 0 ? Math.floor(value) : 1 });
  };

  const removeSaleLine = (lineId: number) => {
    setSaleLines((currentLines) => {
      const nextLines = currentLines.filter((line) => line.id !== lineId);
      return nextLines.length ? nextLines : [{ id: Date.now(), productId: '', quantity: 1 }];
    });
  };

  const stepSaleLineQuantity = (lineId: number, delta: number) => {
    setSaleLines((currentLines) =>
      currentLines.map((line) => {
        if (line.id !== lineId) {
          return line;
        }

        const next = Math.max(1, Number(line.quantity || 1) + delta);
        return { ...line, quantity: next };
      })
    );
  };

  const checkoutSale = async () => {
    if (!token) {
      return;
    }

    const targetCompanyId = getTargetCompanyId(salesCompanyId);

    if (!targetCompanyId) {
      setStatus('Selecione uma empresa para finalizar venda.');
      return;
    }

    const items = saleLines
      .map((line) => ({
        productId: line.productId,
        quantity: Number(line.quantity || 0)
      }))
      .filter((item) => item.productId && Number.isFinite(item.quantity) && item.quantity > 0);

    if (!items.length) {
      setStatus('Adicione ao menos um produto com quantidade valida.');
      return;
    }

    if (salePaymentMethod === 'cash' && saleMissingAmount > 0) {
      setStatus(`Valor recebido insuficiente. Falta ${formatCurrency(saleMissingAmount)}.`);
      return;
    }

    setSalesLoading(true);

    try {
      const response = await fetch('/api/dashboard/sales/checkout', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          companyId: targetCompanyId,
          items,
          paymentMethod: salePaymentMethod,
          customerName: selectedSalesCustomerName,
          amountReceived: Number(saleAmountReceived.toFixed(2)),
          changeDue: Number(saleChangeDue.toFixed(2))
        })
      });
      const result = await response.json();

      if (!response.ok) {
        setStatus(result.message || 'Falha ao finalizar venda.');
        return;
      }

      setSaleLines([{ id: Date.now(), productId: '', quantity: 1 }]);
      setSaleCustomerId('quick-sale');
      setSalePaymentMethod('pix');
      setSaleAmountReceivedInput('');
      setStatus('Venda finalizada com sucesso e estoque atualizado.');
      showToast('Venda concluida');
      await fetchProducts();
      await fetchSalesAnalysis();
    } catch (_error) {
      setStatus('Erro de rede ao finalizar venda.');
    } finally {
      setSalesLoading(false);
    }
  };

  const persistLeadOrder = async (nextLeads: Lead[]) => {
    if (!token || !companyId) {
      return false;
    }

    const updates = nextLeads.map((lead) => ({
      id: lead.id,
      status: lead.status,
      position: Number(lead.position || 0)
    }));

    const response = await fetch('/api/dashboard/leads/reorder', {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ companyId, updates })
    });

    if (!response.ok) {
      const result = await response.json();
      setStatus(result.message || 'Falha ao salvar ordenacao dos cards.');
      return false;
    }

    return true;
  };

  const buildReorderedLeads = (
    sourceLeads: Lead[],
    draggedId: string,
    targetStatus: LeadStatus,
    targetLeadId?: string
  ) => {
    const draggedLead = sourceLeads.find((lead) => lead.id === draggedId);

    if (!draggedLead) {
      return sourceLeads;
    }

    const withoutDragged = sourceLeads.filter((lead) => lead.id !== draggedId);
    const movedLead = { ...draggedLead, status: targetStatus };
    const targetColumn = sortByPosition(withoutDragged.filter((lead) => lead.status === targetStatus));
    const otherLeads = withoutDragged.filter((lead) => lead.status !== targetStatus);

    const insertIndex = targetLeadId
      ? Math.max(targetColumn.findIndex((lead) => lead.id === targetLeadId), 0)
      : targetColumn.length;

    targetColumn.splice(insertIndex, 0, movedLead);

    const recalculatedTarget = targetColumn.map((lead, index) => ({
      ...lead,
      position: index
    }));

    const sourceStatus = draggedLead.status;
    const recalculatedSource =
      sourceStatus === targetStatus
        ? []
        : sortByPosition(otherLeads.filter((lead) => lead.status === sourceStatus)).map((lead, index) => ({
            ...lead,
            position: index
          }));

    const unaffected = otherLeads.filter(
      (lead) => lead.status !== sourceStatus && lead.status !== targetStatus
    );

    return [...unaffected, ...recalculatedSource, ...recalculatedTarget];
  };

  const reorderLead = async (draggedId: string, targetStatus: LeadStatus, targetLeadId?: string) => {
    const snapshot = leads;
    const nextLeads = buildReorderedLeads(leads, draggedId, targetStatus, targetLeadId);

    setLeads(nextLeads);
    setRecentlyMovedLeadId(draggedId);
    setStatus('Salvando nova ordem do funil...');

    try {
      const persisted = await persistLeadOrder(nextLeads);

      if (!persisted) {
        setLeads(snapshot);
        setRecentlyMovedLeadId(null);
        return;
      }

      setStatus('Ordem do funil atualizada com sucesso.');
      showToast('Card movido');
      window.setTimeout(() => {
        setRecentlyMovedLeadId((currentLeadId) => (currentLeadId === draggedId ? null : currentLeadId));
      }, 650);
    } catch (_error) {
      setLeads(snapshot);
      setRecentlyMovedLeadId(null);
      setStatus('Erro de rede ao salvar ordenacao dos cards.');
    }
  };

  const onDragStart = (event: DragEvent<HTMLElement>, leadId: string) => {
    event.dataTransfer.setData('leadId', leadId);
    event.dataTransfer.effectAllowed = 'move';
    setDraggedLeadId(leadId);
  };

  const onDragEnd = () => {
    setDraggedLeadId(null);
    setDragOverColumn(null);
  };

  const onDrop = (event: DragEvent<HTMLElement>, targetStatus: LeadStatus) => {
    event.preventDefault();
    setDragOverColumn(null);
    setDraggedLeadId(null);
    const leadId = event.dataTransfer.getData('leadId');
    if (leadId) {
      void reorderLead(leadId, targetStatus);
    }
  };

  const onDropOnCard = (
    event: DragEvent<HTMLElement>,
    targetStatus: LeadStatus,
    targetLeadId: string
  ) => {
    event.preventDefault();
    event.stopPropagation();
    setDragOverColumn(null);
    setDraggedLeadId(null);

    const leadId = event.dataTransfer.getData('leadId');

    if (leadId && leadId !== targetLeadId) {
      void reorderLead(leadId, targetStatus, targetLeadId);
    }
  };

  const onDragEnterColumn = (targetStatus: LeadStatus) => {
    setDragOverColumn(targetStatus);
  };

  const onDragLeaveColumn = (targetStatus: LeadStatus) => {
    setDragOverColumn((currentStatus) => (currentStatus === targetStatus ? null : currentStatus));
  };

  const openEditModal = (lead: Lead) => {
    setEditingLeadId(lead.id);
    setEditName(lead.name || '');
    setEditPriority(lead.priority || 'MEDIA');
    setEditNotes(lead.notes || '');
    setEditValue(String(Number(lead.value || 0)));
  };

  const closeEditModal = () => {
    setEditingLeadId(null);
    setEditName('');
    setEditPriority('MEDIA');
    setEditNotes('');
    setEditValue('');
  };

  const saveLeadChanges = async () => {
    if (!editingLeadId || !token || !companyId) {
      return;
    }

    if (!editName.trim()) {
      setStatus('Nome do cliente e obrigatorio para editar.');
      return;
    }

    const snapshot = leads;
    const updatedLocal = leads.map((lead) =>
      lead.id === editingLeadId
        ? {
            ...lead,
            name: editName.trim(),
            priority: editPriority,
            notes: editNotes.trim(),
            value: Number(editValue || 0)
          }
        : lead
    );

    setLeads(updatedLocal);

    try {
      const response = await fetch(`/api/dashboard/leads/${editingLeadId}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: editName.trim(),
          priority: editPriority,
          notes: editNotes.trim(),
          value: Number(editValue || 0),
          companyId
        })
      });

      const result = await response.json();

      if (!response.ok) {
        setLeads(snapshot);
        setStatus(result.message || 'Falha ao editar card.');
        return;
      }

      setStatus('Card atualizado com sucesso.');
      showToast('Card atualizado');
      closeEditModal();
    } catch (_error) {
      setLeads(snapshot);
      setStatus('Erro de rede ao editar card.');
    }
  };

  const deleteLead = async () => {
    if (!editingLeadId || !token || !companyId) {
      return;
    }

    const snapshot = leads;
    setLeads((prev) => prev.filter((lead) => lead.id !== editingLeadId));

    try {
      const response = await fetch(
        `/api/dashboard/leads/${editingLeadId}?companyId=${encodeURIComponent(companyId)}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      const result = await response.json();

      if (!response.ok) {
        setLeads(snapshot);
        setStatus(result.message || 'Falha ao excluir card.');
        return;
      }

      setStatus('Card excluido com sucesso.');
      showToast('Card excluido');
      closeEditModal();
    } catch (_error) {
      setLeads(snapshot);
      setStatus('Erro de rede ao excluir card.');
    }
  };

  const handleLogout = async () => {
    await signOut();
    window.location.href = '/login';
  };

  if (authLoading) {
    return (
      <main className="min-h-screen grid place-items-center bg-gray-950">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-cyan-500/30 border-t-cyan-400" />
          <p className="text-sm text-slate-400">Validando sessão...</p>
        </div>
      </main>
    );
  }

  if (!isAuthenticated || !token) {
    return <Navigate to="/login" replace />;
  }

  const menuItems: SidebarMenuItem[] = role === 'ADMIN'
    ? [
      { name: 'Dashboard', icon: LayoutDashboard, path: 'admin', group: 'Comercial', adminOnly: true },
      { name: 'Clientes', icon: Users, path: 'clients', group: 'Comercial', adminOnly: true },
      { name: 'Pipelines', icon: KanbanSquare, path: 'pipeline', group: 'Comercial', adminOnly: true },
      { name: 'Tarefas', icon: Activity, path: 'admin', group: 'Comercial', adminOnly: true },
      { name: 'Agenda', icon: BarChart3, path: 'sales', group: 'Comercial', adminOnly: true },
      { name: 'Financeiro', icon: DollarSign, path: 'analytics', group: 'Comercial', adminOnly: true },
      { name: 'Servicos', icon: Package, path: 'products', group: 'Operacao', adminOnly: true },
      { name: 'Orcamentos', icon: CreditCard, path: 'sales', group: 'Operacao', adminOnly: true },
      { name: 'Briefings', icon: Sparkles, path: 'companies', group: 'Operacao', adminOnly: true },
      { name: 'Paginas', icon: LayoutDashboard, path: 'settings', group: 'Operacao', adminOnly: true },
      { name: 'Equipe', icon: Users, path: 'clients', group: 'Sistema', adminOnly: true },
      { name: 'WhatsApp', icon: MessageCircle, path: 'chat', group: 'Sistema', adminOnly: true },
      { name: 'Configuracoes', icon: Settings, path: 'settings', group: 'Sistema', adminOnly: true }
    ]
    : [
      { name: 'Analise', icon: Activity, path: 'analytics', group: 'Comercial' },
      { name: 'Vendas', icon: KanbanSquare, path: 'pipeline', group: 'Comercial' },
      { name: 'Produtos', icon: Package, path: 'products', group: 'Operacao' },
      { name: 'Estoque', icon: Boxes, path: 'inventory', group: 'Operacao' },
      { name: 'Integracoes', icon: Plug, path: 'integrations', group: 'Operacao', devOnly: true },
      { name: 'Chat / Suporte', icon: MessageCircle, path: 'chat', group: 'Sistema' },
      { name: 'Configuracoes', icon: Settings, path: 'settings', group: 'Sistema' }
    ];

  const visibleMenuItems = menuItems.filter((item) => {
    if (item.adminOnly && role !== 'ADMIN') return false;
    if (item.devOnly && role !== 'DEV') return false;
    return true;
  });
  const menuGroups: SidebarGroup[] = ['Comercial', 'Operacao', 'Sistema'];
  const groupedMenuItems = menuGroups
    .map((group) => ({ group, items: visibleMenuItems.filter((item) => item.group === group) }))
    .filter((section) => section.items.length > 0);

  const handleMenuClick = (item: SidebarMenuItem) => {
    if (role === 'ADMIN' && item.path === 'admin') {
      const sectionByMenuName: Record<string, 'overview' | 'companies' | 'users' | 'plans' | 'support'> = {
        Dashboard: 'overview',
        Tarefas: 'support'
      };

      setAdminSection(sectionByMenuName[item.name] || 'overview');
    }

    setActiveView(item.path);
    setActiveMenuName(item.name);
  };

  const integrationApiBaseUrl = `${getApiBaseUrl() || (typeof window !== 'undefined' ? window.location.origin : '')}/api/external`;
  const integrationTokenPreview = integrationApiConfig?.apiKey || 'SUA_API_KEY';

  const integrationExamples = integrationEndpoints.map((endpoint) => {
    const url = `${integrationApiBaseUrl}${endpoint.path.replace('/api/external', '')}`;

    if (endpoint.path.endsWith('/products')) {
      return {
        ...endpoint,
        example: `curl -X GET "${url}" \\
  -H "Authorization: Bearer ${integrationTokenPreview}"`
      };
    }

    if (endpoint.path.endsWith('/dashboard')) {
      return {
        ...endpoint,
        example: `curl -X GET "${url}" \\
  -H "Authorization: Bearer ${integrationTokenPreview}"`
      };
    }

    if (endpoint.path.endsWith('/sales')) {
      return {
        ...endpoint,
        example: `curl -X POST "${url}" \\
  -H "Authorization: Bearer ${integrationTokenPreview}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "items": [
      { "productId": "ID_DO_PRODUTO", "quantity": 2 }
    ]
  }'`
      };
    }

    return {
      ...endpoint,
      example: `curl -X POST "${url}" \\
  -H "Authorization: Bearer ${integrationTokenPreview}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "Lead via API",
    "status": "NOVO_CONTATO",
    "priority": "MEDIA",
    "value": 1500,
    "notes": "Criado por integracao externa"
  }'`
    };
  });

  return (
    <main className={[
      'min-h-screen transition-all duration-500',
      isDarkTheme ? 'bg-gray-950 text-slate-100' : 'bg-slate-100 text-slate-900'
    ].join(' ')}>
      {/* Theme toggle + Toasts */}
      <div className="fixed right-4 top-4 z-[60] grid gap-2">
        <div className={[
          'flex items-center gap-1 rounded-xl border px-1 py-1 text-xs shadow-lg backdrop-blur-md',
          isDarkTheme ? 'border-white/10 bg-white/5 text-slate-100' : 'border-slate-200 bg-white text-slate-700'
        ].join(' ')}>
          <button
            type="button"
            onClick={() => setUiTheme('light')}
            className={[
              'rounded-lg px-2 py-1 font-semibold transition-all',
              uiTheme === 'light' ? 'bg-blue-600 text-white' : 'hover:bg-slate-200/70'
            ].join(' ')}
          >
            Claro
          </button>
          <button
            type="button"
            onClick={() => setUiTheme('dark')}
            className={[
              'rounded-lg px-2 py-1 font-semibold transition-all',
              uiTheme === 'dark'
                ? 'bg-cyan-500 text-slate-900'
                : isDarkTheme
                  ? 'hover:bg-white/10'
                  : 'hover:bg-slate-200/70'
            ].join(' ')}
          >
            Escuro
          </button>
        </div>
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, x: 60, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 60, scale: 0.9 }}
              transition={{ duration: 0.28, ease: 'easeOut' }}
              className="rounded-xl border border-emerald-400/30 bg-gray-950/95 px-4 py-3 text-sm font-semibold text-emerald-300 shadow-lg shadow-emerald-900/30 backdrop-blur-md"
            >
              {toast.message}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <div className="fixed left-4 top-4 z-[60] lg:hidden">
        <motion.button
          type="button"
          whileTap={{ scale: 0.94 }}
          onClick={handleLogout}
          className={[
            'flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold shadow-lg backdrop-blur-md transition-all',
            isDarkTheme
              ? 'border-white/10 bg-white/5 text-slate-100 hover:bg-rose-500/10 hover:text-rose-300'
              : 'border-slate-200 bg-white text-slate-700 hover:bg-rose-50 hover:text-rose-700'
          ].join(' ')}
        >
          <LogOut className="h-4 w-4" />
          Sair
        </motion.button>
      </div>

      <div className="flex min-h-screen">
        {/* ─── SIDEBAR ─── */}
        <aside className={[
          'hidden w-[240px] flex-shrink-0 flex-col lg:flex',
          isDarkTheme
            ? 'border-r border-white/8 bg-gray-950/95 backdrop-blur-xl'
            : 'border-r border-slate-200 bg-white'
        ].join(' ')} style={{ position: 'fixed', top: 0, left: 0, height: '100vh', overflowY: 'auto', zIndex: 40 }}>
          {/* Logo */}
          <div className="flex items-center gap-3 px-5 py-6">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 shadow-lg shadow-cyan-900/40">
              <BarChart3 className="h-4 w-4 text-white" />
            </div>
            <span className={['text-lg font-black tracking-tight', isDarkTheme ? 'text-white' : 'text-slate-900'].join(' ')}>
              Syncho CRM
            </span>
          </div>

          {/* Nav */}
          <nav className="flex-1 px-3 pb-4">
            {groupedMenuItems.map((section) => (
              <div key={section.group} className="mb-4">
                <p className={['mb-2 px-3 text-[10px] font-semibold uppercase tracking-widest', isDarkTheme ? 'text-slate-500' : 'text-slate-400'].join(' ')}>
                  {section.group}
                </p>

                {section.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeMenuName === item.name;

                  return (
                    <motion.button
                      key={item.name}
                      type="button"
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      transition={{ duration: 0.18, ease: 'easeOut' }}
                      onClick={() => handleMenuClick(item)}
                      className={[
                        'mb-1 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200',
                        isActive
                          ? 'bg-blue-500/20 text-blue-400'
                          : 'text-gray-300 hover:bg-white/10'
                      ].join(' ')}
                    >
                      <Icon className={[
                        'h-5 w-5 flex-shrink-0',
                        isActive ? 'text-blue-400' : 'text-gray-400'
                      ].join(' ')} />
                      <span className="flex-1 text-left">{item.name}</span>

                      {item.name === 'Chat / Suporte' && supportUnreadCount > 0 ? (
                        <span className="rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                          {supportUnreadCount > 99 ? '99+' : supportUnreadCount}
                        </span>
                      ) : isActive ? (
                        <ChevronRight className="h-3 w-3 opacity-70" />
                      ) : null}
                    </motion.button>
                  );
                })}
              </div>
            ))}
          </nav>

          {/* Logout */}
          <div className="px-3 pb-5">
            <motion.button
              type="button"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={handleLogout}
              className={[
                'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all',
                isDarkTheme
                  ? 'text-slate-400 hover:bg-rose-500/10 hover:text-rose-300'
                  : 'text-slate-600 hover:bg-rose-50 hover:text-rose-700'
              ].join(' ')}
            >
              <LogOut className="h-4 w-4" />
              Sair
            </motion.button>
          </div>
        </aside>

        {/* Mobile nav bar */}
        <div className={[
          'fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around border-t px-2 py-2 lg:hidden',
          isDarkTheme ? 'border-white/10 bg-gray-950/97 backdrop-blur-xl' : 'border-slate-200 bg-white shadow-lg'
        ].join(' ')}>
          {[
            { key: 'pipeline' as const, icon: KanbanSquare, label: 'Funil' },
            { key: 'sales' as const, icon: BarChart3, label: 'Vendas' },
            { key: 'products' as const, icon: Package, label: 'Produtos' },
            { key: 'inventory' as const, icon: Boxes, label: 'Estoque' },
            ...(role === 'DEV' || role === 'ADMIN' ? [
              { key: 'integrations' as const, icon: Plug, label: 'Integr.' },
            ] : []),
            ...(role === 'ADMIN' ? [
              { key: 'admin' as const, icon: Sparkles, label: 'Admin' },
              { key: 'companies' as const, icon: LayoutDashboard, label: 'Empresas' },
              { key: 'clients' as const, icon: Users, label: 'Clientes' },
            ] : []),
            { key: 'chat' as const, icon: MessageCircle, label: 'Chat' },
            { key: 'settings' as const, icon: Settings, label: 'Config' },
          ].map(({ key, icon: Icon, label }) => {
            const isActive = activeView === key;
            return (
              <motion.button
                key={key}
                type="button"
                whileTap={{ scale: 0.88 }}
                onClick={() => setActiveView(key)}
                className={[
                  'flex flex-col items-center gap-0.5 rounded-xl px-3 py-1.5 text-[10px] font-semibold transition-all',
                  isActive
                    ? isDarkTheme ? 'text-cyan-400' : 'text-blue-600'
                    : isDarkTheme ? 'text-slate-500' : 'text-slate-400'
                ].join(' ')}
              >
                <Icon className="h-5 w-5" />
                {label}
                {key === 'chat' && supportUnreadCount > 0 ? (
                  <span className="absolute -mt-3 ml-4 h-2 w-2 rounded-full bg-rose-500" />
                ) : null}
              </motion.button>
            );
          })}
        </div>

        {/* ─── MAIN CONTENT ─── */}
        <section className={[
          'flex-1 min-h-screen transition-all duration-500',
          'lg:pl-[240px]'
        ].join(' ')}>
          <div className="p-4 pb-24 md:p-6 lg:pb-6">
            {/* ── Bem-vindo header ── */}
            <motion.div
              key={activeView}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
              className="page-content"
            >

          {/* ── VIEW: PIPELINE ── */}

          {/* ── VIEW: PIPELINE ── */}
          {activeView === 'pipeline' ? (
            <>
          <motion.section
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: 'easeOut' }}
            className="mb-5 space-y-4"
          >
            <header>
              <h1 className="text-2xl font-bold text-white md:text-3xl">Bem-vindo de volta, {displayUserName || 'Usuário'}</h1>
              <p className="mt-1 text-sm text-gray-400">Acompanhe o desempenho do seu negocio em tempo real</p>
            </header>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {summaryCards.map((card, index) => {
                const Icon = card.icon;
                const positive = card.variation >= 0;

                return (
                  <motion.article
                    key={card.key}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.36, delay: 0.04 * index, ease: 'easeOut' }}
                    className="rounded-xl border border-white/10 bg-white/5 p-4 shadow-[0_10px_30px_rgba(15,23,42,0.35)] backdrop-blur"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs uppercase tracking-wide text-slate-400">{card.label}</p>
                        <p className="mt-2 text-2xl font-bold text-white">{card.value}</p>
                      </div>
                      <span className="rounded-lg border border-blue-400/20 bg-blue-500/10 p-2 text-blue-400">
                        <Icon className="h-5 w-5" />
                      </span>
                    </div>
                    <p className={['mt-3 text-xs font-semibold', positive ? 'text-emerald-400' : 'text-rose-400'].join(' ')}>
                      {positive ? '+' : ''}{card.variation.toFixed(1)}%
                    </p>
                  </motion.article>
                );
              })}
            </div>

            <div className="rounded-xl border border-white/10 bg-white/5 p-6 shadow-lg backdrop-blur">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-white">Evolucao de vendas</h2>
                  <p className="text-xs text-slate-400">Ultimos meses com atualizacao automatica</p>
                </div>
              </div>

              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={monthlySalesSeries}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.18)" />
                    <XAxis dataKey="month" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={{ stroke: 'rgba(148,163,184,0.3)' }} tickLine={false} />
                    <YAxis
                      tick={{ fill: '#94a3b8', fontSize: 12 }}
                      axisLine={{ stroke: 'rgba(148,163,184,0.3)' }}
                      tickLine={false}
                      tickFormatter={(value) => `R$ ${Number(value / 1000).toFixed(0)}k`}
                    />
                    <Tooltip content={<SalesLineTooltip />} cursor={{ stroke: '#60a5fa', strokeOpacity: 0.3 }} />
                    <Line
                      type="monotone"
                      dataKey="sales"
                      stroke="#3b82f6"
                      strokeWidth={3}
                      dot={{ r: 4, fill: '#3b82f6', stroke: '#93c5fd', strokeWidth: 2 }}
                      activeDot={{ r: 6, fill: '#60a5fa', stroke: '#dbeafe', strokeWidth: 2 }}
                      animationDuration={1000}
                      animationEasing="ease-out"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="mt-5 grid gap-4 lg:grid-cols-3">
                <article className="rounded-xl border border-white/10 bg-slate-950/55 p-4">
                  <h3 className="text-sm font-semibold text-slate-100">Origem de clientes</h3>
                  <div className="mt-3 h-44">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={sourcePieData} dataKey="value" nameKey="name" innerRadius={46} outerRadius={72} paddingAngle={4}>
                          {sourcePieData.map((entry, index) => (
                            <Cell key={`${entry.name}-${index}`} fill={sourcePieColors[index % sourcePieColors.length]} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{ background: '#020617', border: '1px solid rgba(148,163,184,0.25)', borderRadius: 12, color: '#fff' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </article>

                <article className="rounded-xl border border-white/10 bg-slate-950/55 p-4">
                  <h3 className="text-sm font-semibold text-slate-100">Performance</h3>
                  <div className="mt-3 h-44">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={sellerPerformanceData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.14)" />
                        <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                        <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
                        <Tooltip contentStyle={{ background: '#020617', border: '1px solid rgba(148,163,184,0.25)', borderRadius: 12, color: '#fff' }} formatter={(value) => formatCurrency(Number(value || 0))} />
                        <Bar dataKey="valor" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </article>

                <article className="rounded-xl border border-white/10 bg-slate-950/55 p-4">
                  <h3 className="text-sm font-semibold text-slate-100">Historico recente</h3>
                  <div className="mt-3 space-y-2">
                    {(salesAnalysis?.recentSales || []).slice(0, 4).map((sale) => (
                      <div key={sale.id} className="rounded-lg border border-white/10 bg-slate-900/70 px-3 py-2 text-xs">
                        <div className="flex items-center justify-between gap-2 text-slate-200">
                          <span>#{sale.id.slice(0, 8)}</span>
                          <strong className="text-blue-300">{formatCurrency(Number(sale.total || 0))}</strong>
                        </div>
                        <p className="mt-1 text-slate-400">{formatDateTime(String(sale.createdAt || ''))}</p>
                      </div>
                    ))}
                    {!((salesAnalysis?.recentSales || []).length) ? (
                      <p className="text-xs text-slate-400">Sem vendas recentes no momento.</p>
                    ) : null}
                  </div>
                </article>
              </div>
            </div>
          </motion.section>

          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className={themedTitleClass}>Vendas</h1>
              <p className={themedSubtextClass}>Arraste os cards entre as etapas para atualizar o status.</p>
            </div>
            <motion.button
              type="button"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={fetchLeads}
              disabled={loading}
              className={[
                'rounded-xl px-4 py-2 text-sm font-semibold transition-all',
                isDarkTheme
                  ? 'border border-white/10 bg-white/5 text-slate-200 hover:bg-white/10'
                  : 'bg-slate-900 text-white hover:bg-slate-800'
              ].join(' ')}
            >
              {loading ? 'Atualizando...' : 'Atualizar'}
            </motion.button>
          </div>

          <div className={[themedPanelClass, 'mb-5 p-4'].join(' ')}>
            <div className="grid gap-4 xl:grid-cols-[2fr_1.1fr]">
              <div className="grid gap-4 lg:grid-cols-2">
                <motion.article
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.05 }}
                  className={[
                    'rounded-xl p-4',
                    isDarkTheme
                      ? 'border border-cyan-300/30 bg-gradient-to-br from-slate-900 to-[#0a2532] shadow-[0_0_28px_rgba(34,211,238,0.18)] neon-cyan'
                      : 'border border-slate-200 bg-slate-50'
                  ].join(' ')}
                >
                  <h3 className={['text-sm font-bold uppercase tracking-wide', isDarkTheme ? 'text-cyan-100' : 'text-slate-700'].join(' ')}>Total Vendas</h3>
                  <p className={['mt-2 text-3xl font-black', isDarkTheme ? 'text-white' : 'text-slate-900'].join(' ')}>{formatCurrency(enabledTotals.totalSales)}</p>
                  <p className={['mt-3 text-xs', salesDropPercent > 0 ? 'text-rose-400' : isDarkTheme ? 'text-emerald-300' : 'text-emerald-600'].join(' ')}>
                    {salesDropPercent > 0
                      ? `Queda de ${salesDropPercent.toFixed(1)}% com vendedores desabilitados`
                      : 'Sem queda percentual no momento'}
                  </p>
                  <p className={['mt-2 text-xs', isDarkTheme ? 'text-slate-400' : 'text-slate-500'].join(' ')}>
                    Leads totais ativos: <strong>{enabledTotals.totalLeads}</strong> (variação {leadsDropPercent.toFixed(1)}%)
                  </p>
                </motion.article>

                <motion.article
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.1 }}
                  className={[
                    'rounded-xl p-4',
                    isDarkTheme
                    ? 'border border-indigo-300/25 bg-gradient-to-br from-slate-900 to-[#111c3a] shadow-[0_0_24px_rgba(129,140,248,0.16)]'
                    : 'border border-slate-200 bg-white'
                ].join(' ')}>
                  <h3 className={['text-sm font-bold', isDarkTheme ? 'text-cyan-100' : 'text-slate-700'].join(' ')}>Origem de clientes</h3>
                  <div className="mt-3 flex items-center gap-4">
                    <div
                      className="h-28 w-28 rounded-full"
                      style={{
                        background: sourceDonutGradient,
                        boxShadow: isDarkTheme ? '0 0 24px rgba(34,211,238,0.22)' : 'none'
                      }}
                    >
                      <div className="m-4 h-20 w-20 rounded-full bg-slate-950/95" />
                    </div>
                    <div className="grid gap-1 text-xs">
                      {sourceShareData.map((source) => (
                        <p key={source.source} className={isDarkTheme ? 'text-slate-300' : 'text-slate-600'}>
                          <strong>{source.source}</strong>: {source.sharePercent.toFixed(1)}%
                        </p>
                      ))}
                    </div>
                  </div>
                </motion.article>

                <motion.article
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.15 }}
                  className={[
                    'rounded-xl p-4',
                    isDarkTheme
                      ? 'border border-fuchsia-300/20 bg-gradient-to-br from-slate-900 to-[#2a1338] shadow-[0_0_24px_rgba(217,70,239,0.12)]'
                      : 'border border-slate-200 bg-slate-50'
                  ].join(' ')}
                >
                  <h3 className={['text-sm font-bold', isDarkTheme ? 'text-cyan-100' : 'text-slate-700'].join(' ')}>Dias entre etapas do funil</h3>
                  <div className="mt-3 grid gap-2">
                    {stageAverageDays.map((stage) => (
                      <div key={stage.key}>
                        <div className="mb-1 flex items-center justify-between text-xs">
                          <span className={isDarkTheme ? 'text-slate-300' : 'text-slate-600'}>{stage.label}</span>
                          <span className={isDarkTheme ? 'text-cyan-200' : 'text-cyan-700'}>{stage.avgDays.toFixed(1)}d</span>
                        </div>
                        <div className={['h-2 rounded-full', isDarkTheme ? 'bg-slate-800' : 'bg-slate-200'].join(' ')}>
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-blue-500"
                            style={{ width: `${Math.min(100, stage.avgDays * 9)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.article>

                <motion.article
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.2 }}
                  className={[
                    'rounded-xl p-4',
                    isDarkTheme
                      ? 'border border-cyan-300/20 bg-gradient-to-br from-slate-900 to-[#08243a] shadow-[0_0_24px_rgba(34,211,238,0.11)]'
                      : 'border border-slate-200 bg-white'
                  ].join(' ')}
                >
                  <h3 className={['text-sm font-bold', isDarkTheme ? 'text-cyan-100' : 'text-slate-700'].join(' ')}>Vendas & Leads por origem</h3>
                  <div className="mt-3 grid gap-2">
                    {funnelBySource.map((source) => {
                      const salesPercent = Math.max(6, (source.sales / totalSalesBySource) * 100);
                      const leadPercent = Math.max(6, (source.leads / Math.max(1, enabledTotals.totalLeads)) * 100);

                      return (
                        <div key={source.source} className="space-y-1">
                          <p className={['text-xs font-semibold', isDarkTheme ? 'text-slate-200' : 'text-slate-700'].join(' ')}>{source.source}</p>
                          <div className="flex items-center gap-2">
                            <span className="w-14 text-[10px] text-amber-400">Vendas</span>
                            <div className={['h-2 flex-1 rounded-full', isDarkTheme ? 'bg-slate-800' : 'bg-slate-200'].join(' ')}>
                              <div className="h-full rounded-full bg-gradient-to-r from-amber-400 to-yellow-300" style={{ width: `${salesPercent}%` }} />
                            </div>
                            <span className={['text-[10px]', isDarkTheme ? 'text-slate-300' : 'text-slate-600'].join(' ')}>{formatCurrency(source.sales)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="w-14 text-[10px] text-cyan-400">Leads</span>
                            <div className={['h-2 flex-1 rounded-full', isDarkTheme ? 'bg-slate-800' : 'bg-slate-200'].join(' ')}>
                              <div className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-blue-500" style={{ width: `${leadPercent}%` }} />
                            </div>
                            <span className={['text-[10px]', isDarkTheme ? 'text-slate-300' : 'text-slate-600'].join(' ')}>{source.leads}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </motion.article>

                <motion.article
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.25 }}
                  className={[
                    'rounded-xl p-4 lg:col-span-2',
                    isDarkTheme
                      ? 'border border-cyan-300/20 bg-gradient-to-br from-slate-900 to-[#0d1f35] shadow-[0_0_24px_rgba(34,211,238,0.1)]'
                      : 'border border-slate-200 bg-slate-50'
                  ].join(' ')}
                >
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className={['text-sm font-bold', isDarkTheme ? 'text-cyan-100' : 'text-slate-700'].join(' ')}>Taxa de rejeicao</h3>
                    <div className="inline-flex rounded-lg border border-white/15 p-1">
                      <button
                        type="button"
                        onClick={() => setRejectionViewMode('table')}
                        className={[
                          'rounded-md px-2 py-1 text-xs font-semibold',
                          rejectionViewMode === 'table'
                            ? 'bg-cyan-400 text-slate-950'
                            : isDarkTheme ? 'text-slate-300 hover:bg-white/10' : 'text-slate-600 hover:bg-slate-200'
                        ].join(' ')}
                      >Tabela</button>
                      <button
                        type="button"
                        onClick={() => setRejectionViewMode('funnel')}
                        className={[
                          'rounded-md px-2 py-1 text-xs font-semibold',
                          rejectionViewMode === 'funnel'
                            ? 'bg-cyan-400 text-slate-950'
                            : isDarkTheme ? 'text-slate-300 hover:bg-white/10' : 'text-slate-600 hover:bg-slate-200'
                        ].join(' ')}
                      >Funil</button>
                    </div>
                  </div>

                  {rejectionViewMode === 'table' ? (
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[640px] text-xs">
                        <thead>
                          <tr>
                            <th className={['px-2 py-2 text-left', isDarkTheme ? 'text-slate-300' : 'text-slate-600'].join(' ')}>Vendedor</th>
                            {salesStages.map((stage) => (
                              <th key={stage.key} className={['px-2 py-2 text-left', isDarkTheme ? 'text-slate-300' : 'text-slate-600'].join(' ')}>{stage.shortLabel}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {funnelSellersAnalytics.slice(0, 5).map((seller) => (
                            <tr key={seller.id}>
                              <td className={['px-2 py-2', isDarkTheme ? 'text-slate-100' : 'text-slate-700'].join(' ')}>{seller.name}</td>
                              {seller.rejectionByStage.map((value, index) => {
                                const intensity = value / heatmapMax;
                                return (
                                  <td
                                    key={`${seller.id}-${index}`}
                                    className="px-2 py-2"
                                    style={{
                                      background: `rgba(239, 68, 68, ${0.12 + intensity * 0.45})`,
                                      color: isDarkTheme ? '#f8fafc' : '#0f172a'
                                    }}
                                  >
                                    {value.toFixed(0)}%
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="grid gap-2">
                      {funnelDiagramData.map((stage) => (
                        <div key={stage.key} className={['rounded-lg border p-2 text-xs', isDarkTheme ? 'border-white/10 bg-black/15' : 'border-slate-200 bg-white'].join(' ')}>
                          <div className="mb-1 flex items-center justify-between">
                            <span className={isDarkTheme ? 'text-slate-200' : 'text-slate-700'}>{stage.label}</span>
                            <span className={isDarkTheme ? 'text-cyan-200' : 'text-cyan-700'}>{formatCurrency(stage.avgActionSize)}</span>
                          </div>
                          <div className={['h-2 rounded-full', isDarkTheme ? 'bg-slate-800' : 'bg-slate-200'].join(' ')}>
                            <div className="h-full rounded-full bg-gradient-to-r from-fuchsia-500 to-cyan-400" style={{ width: `${Math.max(6, stage.ratio * 100)}%` }} />
                          </div>
                          <p className={['mt-1', isDarkTheme ? 'text-slate-400' : 'text-slate-500'].join(' ')}>{stage.count} oportunidades no estagio</p>
                        </div>
                      ))}
                    </div>
                  )}
                </motion.article>
              </div>

              <motion.aside
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.45, delay: 0.15 }}
                className={[
                  'rounded-xl p-4',
                  isDarkTheme
                    ? 'border border-amber-300/20 bg-gradient-to-b from-slate-900 to-[#2f1b0a] shadow-[0_0_28px_rgba(251,191,36,0.12)]'
                    : 'border border-slate-200 bg-white'
                ].join(' ')}
              >
                <h3 className={['text-sm font-bold', isDarkTheme ? 'text-amber-200' : 'text-slate-700'].join(' ')}>Integração de vendas</h3>
                <p className={['mt-1 text-xs', isDarkTheme ? 'text-slate-400' : 'text-slate-500'].join(' ')}>
                  Controle os vendedores ativos e acompanhe cada venda com data e horário automáticos.
                </p>

                <div className="mt-3 grid gap-2">
                  {funnelSellersAnalytics.length ? (
                    funnelSellersAnalytics.map((seller) => {
                      const isDisabled = disabledSellerIds.includes(seller.id);

                      return (
                        <div
                          key={seller.id}
                          className={[
                            'rounded-lg border p-2 transition-all',
                            isDarkTheme ? 'border-white/10 bg-black/15' : 'border-slate-200 bg-slate-50'
                          ].join(' ')}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <p className={['text-sm font-semibold', isDarkTheme ? 'text-slate-100' : 'text-slate-800'].join(' ')}>{seller.name}</p>
                            <button
                              type="button"
                              onClick={() => toggleSellerEnabled(seller.id)}
                              className={[
                                'rounded-md px-2 py-1 text-[10px] font-semibold uppercase',
                                isDisabled
                                  ? 'bg-rose-500/20 text-rose-300'
                                  : 'bg-emerald-500/20 text-emerald-300'
                              ].join(' ')}
                            >
                              {isDisabled ? 'Desabilitado' : 'Habilitado'}
                            </button>
                          </div>
                          <div className="mt-1 flex items-center justify-between text-xs">
                            <span className={isDarkTheme ? 'text-slate-400' : 'text-slate-500'}>Vendas</span>
                            <span className={isDarkTheme ? 'text-cyan-200' : 'text-cyan-700'}>{formatCurrency(seller.salesVolume)}</span>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <p className={['rounded-md border px-3 py-2 text-xs', isDarkTheme ? 'border-white/10 bg-slate-900/60 text-slate-400' : 'border-slate-200 bg-slate-50 text-slate-500'].join(' ')}>
                      Nenhum vendedor real encontrado ainda. Crie usuarios CLIENT na area de clientes para habilitar essa integracao.
                    </p>
                  )}
                </div>

                <div className={['mt-4 rounded-lg border p-3', isDarkTheme ? 'border-white/10 bg-black/10' : 'border-slate-200 bg-white'].join(' ')}>
                  <h4 className={['text-xs font-bold', isDarkTheme ? 'text-cyan-100' : 'text-slate-700'].join(' ')}>Historico de vendas</h4>
                  <div className="mt-2 max-h-72 space-y-2 overflow-y-auto">
                    {(salesAnalysis?.recentSales || []).length ? (
                      (salesAnalysis?.recentSales || []).map((sale) => (
                        <article key={sale.id} className={['rounded-md border px-2 py-1.5 text-xs', isDarkTheme ? 'border-white/10 bg-slate-900/60' : 'border-slate-200 bg-slate-50'].join(' ')}>
                          <div className="flex items-center justify-between gap-2">
                            <span className={isDarkTheme ? 'text-slate-300' : 'text-slate-600'}>#{sale.id.slice(0, 8)}</span>
                            <strong className={isDarkTheme ? 'text-cyan-200' : 'text-cyan-700'}>{formatCurrency(Number(sale.total || 0))}</strong>
                          </div>
                          <p className={isDarkTheme ? 'text-slate-400' : 'text-slate-500'}>{formatDateTime(sale.createdAt)}</p>
                        </article>
                      ))
                    ) : (
                      <p className={['text-xs', isDarkTheme ? 'text-slate-400' : 'text-slate-500'].join(' ')}>Nenhuma venda registrada ainda.</p>
                    )}
                  </div>
                </div>
              </motion.aside>
            </div>
          </div>

          <div className={[themedPanelClass, 'mb-5 p-4'].join(' ')}>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-6">
              <input className={themedInputClass} placeholder="Nome do cliente" value={name} onChange={(event) => setName(event.target.value)} />
              <select className={themedSelectClass} value={formColumn || 'NOVO_CONTATO'} onChange={(event) => setFormColumn(event.target.value as LeadStatus)}>
                {columns.map((column) => (
                  <option className={themedOptionClass} key={column.key} value={column.key}>{column.label}</option>
                ))}
              </select>
              <select className={themedSelectClass} value={priority} onChange={(event) => setPriority(event.target.value as LeadPriority)}>
                <option className={themedOptionClass} value="BAIXA">Prioridade baixa</option>
                <option className={themedOptionClass} value="MEDIA">Prioridade media</option>
                <option className={themedOptionClass} value="ALTA">Prioridade alta</option>
              </select>
              <input className={themedInputClass} placeholder="Valor (R$)" type="number" step="0.01" value={value} onChange={(event) => setValue(event.target.value)} />
              <input className={[themedInputClass, 'lg:col-span-2'].join(' ')} placeholder="Observacao" value={notes} onChange={(event) => setNotes(event.target.value)} />
            </div>
            <motion.button
              type="button"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={handleCreateLead}
              className="mt-3 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-900/30 hover:from-blue-500 hover:to-cyan-400"
            >
              Criar novo card
            </motion.button>
          </div>

          <div className={[themedPanelClass, 'mb-5 p-4'].join(' ')}>
            <div className="grid gap-3 md:grid-cols-3">
              <select
                className={themedSelectClass}
                value={filterPriority}
                onChange={(event) => setFilterPriority(event.target.value as 'ALL' | LeadPriority)}
              >
                <option className={themedOptionClass} value="ALL">Todas prioridades</option>
                <option className={themedOptionClass} value="BAIXA">Prioridade baixa</option>
                <option className={themedOptionClass} value="MEDIA">Prioridade media</option>
                <option className={themedOptionClass} value="ALTA">Prioridade alta</option>
              </select>

              <select
                className={themedSelectClass}
                value={filterStatus}
                onChange={(event) => setFilterStatus(event.target.value as 'ALL' | LeadStatus)}
              >
                <option className={themedOptionClass} value="ALL">Todos status</option>
                {columns.map((column) => (
                  <option className={themedOptionClass} key={column.key} value={column.key}>{column.label}</option>
                ))}
              </select>

              <input
                className={themedInputClass}
                placeholder="Buscar cliente por nome"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-5">
            {columns.map((column) => {
              const columnLeads = board.get(column.key) || [];

              return (
                <section
                  key={column.key}
                  className={[
                    'rounded-2xl border bg-slate-50 p-3 transition-all duration-200',
                    dragOverColumn === column.key
                      ? 'border-blue-300 bg-blue-50 shadow-[inset_0_0_0_1px_rgba(59,130,246,0.25)]'
                      : 'border-slate-200'
                  ].join(' ')}
                  onDragEnter={() => onDragEnterColumn(column.key)}
                  onDragLeave={() => onDragLeaveColumn(column.key)}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => onDrop(event, column.key)}
                >
                  <div className="mb-3 flex items-center justify-between">
                    <h2 className="text-sm font-bold text-slate-700">{column.label}</h2>
                    <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-semibold text-slate-600">
                      {columnLeads.length}
                    </span>
                  </div>

                  <div className="grid gap-3">
                    {columnLeads.map((lead) => (
                      <motion.article
                        key={lead.id}
                        draggable
                        layout
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        whileHover={{ y: -2, boxShadow: '0 8px 24px rgba(0,0,0,0.25)' }}
                        whileTap={{ scale: 0.98 }}
                        transition={{ duration: 0.22, ease: 'easeOut' }}
                        onDragStart={(event) => onDragStart(event as unknown as DragEvent<HTMLElement>, lead.id)}
                        onDragEnd={onDragEnd}
                        onDragOver={(event) => event.preventDefault()}
                        onDrop={(event) => onDropOnCard(event as unknown as DragEvent<HTMLElement>, column.key, lead.id)}
                        onClick={() => openEditModal(lead)}
                        className={[
                          'rounded-xl border p-3 shadow-sm transition-all duration-200',
                          isDarkTheme
                            ? 'border-white/10 bg-white/5 text-slate-100 backdrop-blur-sm cursor-pointer'
                            : 'border-slate-200 bg-white cursor-pointer',
                          draggedLeadId === lead.id
                            ? 'cursor-grabbing scale-[0.98] rotate-1 opacity-60 shadow-lg'
                            : '',
                          recentlyMovedLeadId === lead.id
                            ? isDarkTheme ? 'ring-2 ring-cyan-400/50 shadow-md' : 'ring-2 ring-emerald-200 shadow-md'
                            : ''
                        ].join(' ')}
                      >
                        <p className={['text-sm font-semibold', isDarkTheme ? 'text-slate-100' : 'text-slate-800'].join(' ')}>{lead.name}</p>
                        <p className={['mt-1 text-xs', isDarkTheme ? 'text-slate-400' : 'text-slate-500'].join(' ')}>Prioridade: {lead.priority}</p>
                        <p className={['mt-2 text-xs', isDarkTheme ? 'text-slate-300' : 'text-slate-600'].join(' ')}>{lead.notes || 'Sem observação.'}</p>
                        <p className={['mt-3 text-sm font-bold', isDarkTheme ? 'text-emerald-400' : 'text-emerald-600'].join(' ')}>{formatCurrency(Number(lead.value || 0))}</p>
                      </motion.article>
                    ))}

                    {!columnLeads.length ? (
                      <div
                        className={[
                          'rounded-xl border border-dashed bg-white px-3 py-5 text-center text-xs transition-all duration-200',
                          dragOverColumn === column.key
                            ? 'border-blue-300 text-blue-500'
                            : 'border-slate-300 text-slate-400'
                        ].join(' ')}
                      >
                        Solte um card aqui
                      </div>
                    ) : null}
                  </div>
                </section>
              );
            })}
          </div>

          <p className="mt-4 text-sm text-slate-500">{status}</p>
            </>
          ) : null}

          {role === 'ADMIN' && activeView === 'admin' ? (
            <div className="grid gap-6">
              <div className={[
                'rounded-2xl border p-5',
                isDarkTheme ? 'border-cyan-500/20 bg-[#0d1117] shadow-[0_0_20px_rgba(34,211,238,0.12)]' : 'border-slate-200 bg-white'
              ].join(' ')}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h1 className={['text-2xl font-black', isDarkTheme ? 'text-white' : 'text-slate-900'].join(' ')}>Admin Dashboard SaaS</h1>
                    <p className={['mt-1 text-sm', isDarkTheme ? 'text-slate-400' : 'text-slate-500'].join(' ')}>
                      Painel central para gerenciar receita, empresas, usuarios, planos e suporte.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { key: 'overview' as const, label: 'Dashboard' },
                      { key: 'companies' as const, label: 'Empresas' },
                      { key: 'users' as const, label: 'Usuarios' },
                      { key: 'plans' as const, label: 'Planos' },
                      { key: 'support' as const, label: 'Suporte' }
                    ].map((tab) => (
                      <button
                        key={tab.key}
                        type="button"
                        onClick={() => setAdminSection(tab.key)}
                        className={[
                          'rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all',
                          adminSection === tab.key
                            ? isDarkTheme ? 'border-cyan-400/50 bg-cyan-500/20 text-cyan-300' : 'border-blue-300 bg-blue-50 text-blue-700'
                            : isDarkTheme ? 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                        ].join(' ')}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {adminSection === 'overview' ? (
                <div className="grid gap-5">
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    {[
                      {
                        label: 'MRR Total',
                        value: formatCurrency(adminOverview.mrr),
                        sub: 'Receita recorrente mensal',
                        glow: 'shadow-[0_0_20px_rgba(59,130,246,0.22)]',
                        border: 'border-blue-500/20',
                        icon: DollarSign
                      },
                      {
                        label: 'Empresas',
                        value: String(adminOverview.totalCompanies),
                        sub: `${adminOverview.activeCompanies} ativas`,
                        glow: 'shadow-[0_0_20px_rgba(168,85,247,0.22)]',
                        border: 'border-purple-500/20',
                        icon: LayoutDashboard
                      },
                      {
                        label: 'Crescimento',
                        value: `${adminOverview.monthlyGrowth >= 0 ? '+' : ''}${adminOverview.monthlyGrowth.toFixed(1)}%`,
                        sub: 'Comparado ao ultimo mes',
                        glow: 'shadow-[0_0_20px_rgba(16,185,129,0.22)]',
                        border: 'border-emerald-500/20',
                        icon: TrendingUp
                      },
                      {
                        label: 'Ativas vs Inativas',
                        value: `${adminOverview.activeCompanies} / ${adminOverview.inactiveCompanies}`,
                        sub: 'Saude da base de clientes',
                        glow: 'shadow-[0_0_20px_rgba(244,63,94,0.2)]',
                        border: 'border-rose-500/20',
                        icon: Activity
                      }
                    ].map((card) => {
                      const Icon = card.icon;
                      return (
                        <motion.div
                          key={card.label}
                          whileHover={{ y: -3, scale: 1.01 }}
                          className={[
                            'rounded-2xl border p-4 transition-all',
                            isDarkTheme ? `bg-[#0d1117] ${card.border} ${card.glow}` : 'border-slate-200 bg-white'
                          ].join(' ')}
                        >
                          <div className="flex items-center justify-between">
                            <p className={['text-xs font-semibold uppercase tracking-wide', isDarkTheme ? 'text-slate-400' : 'text-slate-500'].join(' ')}>{card.label}</p>
                            <span className="rounded-lg bg-white/10 p-1.5">
                              <Icon className={['h-4 w-4', isDarkTheme ? 'text-cyan-300' : 'text-blue-600'].join(' ')} />
                            </span>
                          </div>
                          <p className={['mt-3 text-2xl font-black', isDarkTheme ? 'text-white' : 'text-slate-800'].join(' ')}>{card.value}</p>
                          <p className={['mt-1 text-xs', isDarkTheme ? 'text-slate-500' : 'text-slate-500'].join(' ')}>{card.sub}</p>
                        </motion.div>
                      );
                    })}
                  </div>

                  <div className="grid gap-4 xl:grid-cols-3">
                    <div className={['xl:col-span-2 rounded-2xl border p-5', isDarkTheme ? 'border-blue-500/20 bg-[#0d1117] shadow-[0_0_20px_rgba(59,130,246,0.14)]' : 'border-slate-200 bg-white'].join(' ')}>
                      <h3 className={['text-sm font-bold', isDarkTheme ? 'text-white' : 'text-slate-800'].join(' ')}>Revenue Over Time</h3>
                      <p className={['mb-3 text-xs', isDarkTheme ? 'text-slate-500' : 'text-slate-400'].join(' ')}>Evolucao mensal de receita recorrente</p>
                      <ResponsiveContainer width="100%" height={220}>
                        <LineChart data={adminNewCompaniesSeries}>
                          <defs>
                            <filter id="adminRevenueGlow" x="-50%" y="-50%" width="200%" height="200%">
                              <feGaussianBlur stdDeviation="2.5" result="blur" />
                              <feMerge>
                                <feMergeNode in="blur" />
                                <feMergeNode in="SourceGraphic" />
                              </feMerge>
                            </filter>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke={isDarkTheme ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'} />
                          <XAxis dataKey="month" tick={{ fontSize: 11, fill: isDarkTheme ? '#64748b' : '#94a3b8' }} axisLine={false} tickLine={false} />
                          <YAxis tickFormatter={(v) => `R$${(Number(v) / 1000).toFixed(0)}k`} tick={{ fontSize: 11, fill: isDarkTheme ? '#64748b' : '#94a3b8' }} axisLine={false} tickLine={false} width={56} />
                          <Tooltip
                            formatter={(v: unknown) => [formatCurrency(Number(v)), 'MRR']}
                            contentStyle={{
                              background: isDarkTheme ? '#0f172a' : '#fff',
                              border: isDarkTheme ? '1px solid rgba(59,130,246,0.35)' : '1px solid #e2e8f0',
                              borderRadius: '10px',
                              color: isDarkTheme ? '#f8fafc' : '#0f172a',
                              fontSize: 12
                            }}
                          />
                          <Line type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={3} filter="url(#adminRevenueGlow)" dot={{ fill: '#60a5fa', r: 3 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>

                    <div className={['rounded-2xl border p-5', isDarkTheme ? 'border-purple-500/20 bg-[#0d1117] shadow-[0_0_20px_rgba(168,85,247,0.14)]' : 'border-slate-200 bg-white'].join(' ')}>
                      <h3 className={['text-sm font-bold', isDarkTheme ? 'text-white' : 'text-slate-800'].join(' ')}>Plan Distribution</h3>
                      <p className={['mb-3 text-xs', isDarkTheme ? 'text-slate-500' : 'text-slate-400'].join(' ')}>Participacao por plano</p>
                      <ResponsiveContainer width="100%" height={210}>
                        <PieChart>
                          <Pie data={adminPlanDistributionData} dataKey="value" nameKey="name" innerRadius={46} outerRadius={72} paddingAngle={4}>
                            {adminPlanDistributionData.map((entry, index) => (
                              <Cell key={entry.name} fill={['#3b82f6', '#8b5cf6', '#f43f5e'][index % 3]} style={{ filter: 'drop-shadow(0 0 5px rgba(59,130,246,0.25))' }} />
                            ))}
                          </Pie>
                          <Tooltip
                            formatter={(v: unknown) => [Number(v), 'Empresas']}
                            contentStyle={{
                              background: isDarkTheme ? '#0f172a' : '#fff',
                              border: isDarkTheme ? '1px solid rgba(168,85,247,0.35)' : '1px solid #e2e8f0',
                              borderRadius: '10px',
                              color: isDarkTheme ? '#f8fafc' : '#0f172a',
                              fontSize: 12
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className={['rounded-2xl border p-5', isDarkTheme ? 'border-cyan-500/20 bg-[#0d1117] shadow-[0_0_20px_rgba(34,211,238,0.14)]' : 'border-slate-200 bg-white'].join(' ')}>
                    <h3 className={['text-sm font-bold', isDarkTheme ? 'text-white' : 'text-slate-800'].join(' ')}>New Companies Per Month</h3>
                    <p className={['mb-3 text-xs', isDarkTheme ? 'text-slate-500' : 'text-slate-400'].join(' ')}>Entrada de novos clientes por mes</p>
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={adminNewCompaniesSeries}>
                        <defs>
                          <linearGradient id="adminCompaniesBar" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#06b6d4" />
                            <stop offset="100%" stopColor="#2563eb" />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke={isDarkTheme ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'} vertical={false} />
                        <XAxis dataKey="month" tick={{ fontSize: 11, fill: isDarkTheme ? '#64748b' : '#94a3b8' }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 11, fill: isDarkTheme ? '#64748b' : '#94a3b8' }} axisLine={false} tickLine={false} />
                        <Tooltip
                          formatter={(v: unknown) => [Number(v), 'Empresas']}
                          contentStyle={{
                            background: isDarkTheme ? '#0f172a' : '#fff',
                            border: isDarkTheme ? '1px solid rgba(6,182,212,0.35)' : '1px solid #e2e8f0',
                            borderRadius: '10px',
                            color: isDarkTheme ? '#f8fafc' : '#0f172a',
                            fontSize: 12
                          }}
                        />
                        <Bar dataKey="companies" fill="url(#adminCompaniesBar)" radius={[8, 8, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              ) : null}

              {adminSection === 'companies' ? (
                <div className={themedPanelClass}>
                  <div className="mb-4 flex items-center justify-between">
                    <h2 className={['text-lg font-bold', isDarkTheme ? 'text-white' : 'text-slate-800'].join(' ')}>Gestao de empresas</h2>
                    <button type="button" onClick={() => void fetchAdminData()} className={isDarkTheme ? 'rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-white/10' : 'rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50'}>Atualizar</button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[860px] text-sm">
                      <thead>
                        <tr className={isDarkTheme ? 'border-b border-white/10 text-slate-400' : 'border-b border-slate-100 text-slate-500'}>
                          <th className="px-2 py-2 text-left">Empresa</th>
                          <th className="px-2 py-2 text-left">Plano</th>
                          <th className="px-2 py-2 text-left">Status</th>
                          <th className="px-2 py-2 text-left">Expiracao</th>
                          <th className="px-2 py-2 text-right">Acoes</th>
                        </tr>
                      </thead>
                      <tbody>
                        {companies.map((company) => {
                          const status = (company.subscription_status || company.subscriptionStatus || 'ACTIVE') as CompanyStatus;
                          const expiresAt = String(company.expires_at || company.expiresAt || '').slice(0, 10) || 'Sem limite';
                          const companyPlan = (company.plan || 'BASIC') as CompanyPlan;
                          return (
                            <tr key={company.id} className={isDarkTheme ? 'border-b border-white/5' : 'border-b border-slate-100'}>
                              <td className="px-2 py-3">
                                <p className={['font-semibold', isDarkTheme ? 'text-white' : 'text-slate-800'].join(' ')}>{company.name}</p>
                                <p className={['text-xs', isDarkTheme ? 'text-slate-500' : 'text-slate-400'].join(' ')}>{company.id}</p>
                              </td>
                              <td className="px-2 py-3">
                                <select
                                  value={companyPlan}
                                  onChange={(event) => void setCompanyPlanQuick(company, event.target.value as CompanyPlan)}
                                  className={isDarkTheme ? 'rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-xs text-slate-100' : 'rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700'}
                                >
                                  <option value="BASIC">BASIC</option>
                                  <option value="PRO">PRO</option>
                                  <option value="PREMIUM">PREMIUM</option>
                                </select>
                              </td>
                              <td className="px-2 py-3">
                                <span className={[
                                  'rounded-full px-2 py-1 text-xs font-semibold',
                                  status === 'ACTIVE' ? 'bg-emerald-500/15 text-emerald-300' : 'bg-rose-500/15 text-rose-300'
                                ].join(' ')}>
                                  {status}
                                </span>
                              </td>
                              <td className={['px-2 py-3 text-sm', isDarkTheme ? 'text-slate-300' : 'text-slate-600'].join(' ')}>{expiresAt}</td>
                              <td className="px-2 py-3 text-right">
                                <div className="inline-flex items-center gap-2">
                                  <button type="button" onClick={() => void toggleCompanyBlocked(company)} className={status === 'BLOCKED' ? 'rounded-lg border border-emerald-400/40 px-2.5 py-1 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/10' : 'rounded-lg border border-rose-400/40 px-2.5 py-1 text-xs font-semibold text-rose-300 hover:bg-rose-500/10'}>
                                    {status === 'BLOCKED' ? 'Desbloquear' : 'Bloquear'}
                                  </button>
                                  <button type="button" onClick={() => accessCompanyContext(company.id)} className={isDarkTheme ? 'rounded-lg border border-cyan-400/40 px-2.5 py-1 text-xs font-semibold text-cyan-300 hover:bg-cyan-500/10' : 'rounded-lg border border-blue-200 px-2.5 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-50'}>
                                    Acessar empresa
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : null}

              {adminSection === 'users' ? (
                <div className={themedPanelClass}>
                  <h2 className={['mb-4 text-lg font-bold', isDarkTheme ? 'text-white' : 'text-slate-800'].join(' ')}>Gestao de usuarios por empresa</h2>
                  <div className="grid gap-4">
                    {Object.entries(
                      managedUsers.reduce<Record<string, ManagedUser[]>>((acc, user) => {
                        const key = String(user.company_id || user.companyId || 'Sem empresa');
                        if (!acc[key]) {
                          acc[key] = [];
                        }
                        acc[key].push(user);
                        return acc;
                      }, {})
                    ).map(([companyRef, users]) => (
                      <div key={companyRef} className={isDarkTheme ? 'rounded-xl border border-white/10 bg-white/5 p-4' : 'rounded-xl border border-slate-200 bg-white p-4'}>
                        <p className={['mb-3 text-sm font-semibold', isDarkTheme ? 'text-cyan-300' : 'text-blue-700'].join(' ')}>
                          {companyOptions.find((opt) => opt.id === companyRef)?.name || companyRef}
                        </p>
                        <div className="grid gap-2">
                          {users.map((user) => {
                            const accessUntil = String(user.access_until || user.accessUntil || '').trim();
                            const disabled = Boolean(accessUntil && new Date(accessUntil).getTime() < Date.now());
                            return (
                              <div key={user.id} className={['flex items-center justify-between rounded-lg px-3 py-2', isDarkTheme ? 'bg-black/20' : 'bg-slate-50'].join(' ')}>
                                <div>
                                  <p className={['text-sm font-semibold', isDarkTheme ? 'text-slate-100' : 'text-slate-800'].join(' ')}>{user.name}</p>
                                  <p className={['text-xs', isDarkTheme ? 'text-slate-400' : 'text-slate-500'].join(' ')}>{user.email} · {user.role}</p>
                                </div>
                                {user.role === 'CLIENT' ? (
                                  <button
                                    type="button"
                                    onClick={() => void toggleUserEnabled(user)}
                                    className={disabled ? 'rounded-lg border border-emerald-400/40 px-2.5 py-1 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/10' : 'rounded-lg border border-rose-400/40 px-2.5 py-1 text-xs font-semibold text-rose-300 hover:bg-rose-500/10'}
                                  >
                                    {disabled ? 'Habilitar' : 'Desabilitar'}
                                  </button>
                                ) : (
                                  <span className={['text-xs font-semibold', isDarkTheme ? 'text-slate-500' : 'text-slate-400'].join(' ')}>Administrador</span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {adminSection === 'plans' ? (
                <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
                  <div className={themedPanelClass}>
                    <h2 className={['mb-4 text-lg font-bold', isDarkTheme ? 'text-white' : 'text-slate-800'].join(' ')}>Catalogo de planos</h2>
                    <div className="grid gap-3">
                      {planCatalog.map((plan) => (
                        <div key={plan.id} className={isDarkTheme ? 'rounded-xl border border-white/10 bg-white/5 p-4' : 'rounded-xl border border-slate-200 bg-white p-4'}>
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className={['text-sm font-bold', isDarkTheme ? 'text-slate-100' : 'text-slate-800'].join(' ')}>{plan.name}</p>
                              <p className={['text-xs', isDarkTheme ? 'text-cyan-300' : 'text-blue-700'].join(' ')}>{formatCurrency(plan.price)}/mes</p>
                              <p className={['mt-2 text-xs', isDarkTheme ? 'text-slate-400' : 'text-slate-500'].join(' ')}>{plan.features.join(' • ') || 'Sem features cadastradas'}</p>
                            </div>
                            <div className="flex gap-2">
                              <button type="button" onClick={() => openPlanEditor(plan)} className={isDarkTheme ? 'rounded-lg border border-white/10 px-2.5 py-1 text-xs font-semibold text-slate-200 hover:bg-white/10' : 'rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50'}>Editar</button>
                              <button type="button" onClick={() => deletePlanItem(plan.id)} className="rounded-lg border border-rose-400/40 px-2.5 py-1 text-xs font-semibold text-rose-300 hover:bg-rose-500/10">Excluir</button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className={themedPanelClass}>
                    <h3 className={['text-base font-bold', isDarkTheme ? 'text-white' : 'text-slate-800'].join(' ')}>{planEditorId ? 'Editar plano' : 'Criar plano'}</h3>
                    <div className="mt-3 grid gap-3">
                      <input className={themedInputClass} placeholder="Nome (ex: ENTERPRISE)" value={planEditorName} onChange={(event) => setPlanEditorName(event.target.value)} />
                      <input className={themedInputClass} type="number" min="0" step="1" placeholder="Preco mensal" value={planEditorPrice} onChange={(event) => setPlanEditorPrice(event.target.value)} />
                      <textarea className={themedInputClass} rows={5} placeholder="Features (uma por linha)" value={planEditorFeatures} onChange={(event) => setPlanEditorFeatures(event.target.value)} />
                    </div>
                    <div className="mt-4 flex gap-2">
                      <button type="button" onClick={savePlanEditor} className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500">Salvar plano</button>
                      <button type="button" onClick={() => openPlanEditor()} className={isDarkTheme ? 'rounded-xl border border-white/10 px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-white/10' : 'rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50'}>Limpar</button>
                    </div>
                    <p className={['mt-3 text-xs', isDarkTheme ? 'text-slate-500' : 'text-slate-500'].join(' ')}>
                      Valores e recursos ficam salvos no navegador para simulacao administrativa.
                    </p>
                  </div>
                </div>
              ) : null}

              {adminSection === 'support' ? (
                <div className={themedPanelClass}>
                  <div className="mb-4 flex items-center justify-between">
                    <h2 className={['text-lg font-bold', isDarkTheme ? 'text-white' : 'text-slate-800'].join(' ')}>Central de suporte</h2>
                    <button type="button" onClick={() => void fetchSupportRequests()} className={isDarkTheme ? 'rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-white/10' : 'rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50'}>Atualizar</button>
                  </div>
                  <div className="grid gap-3">
                    {supportRequests.map((request) => (
                      <div key={request.id} className={isDarkTheme ? 'rounded-xl border border-white/10 bg-white/5 p-4' : 'rounded-xl border border-slate-200 bg-white p-4'}>
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className={['text-sm font-semibold', isDarkTheme ? 'text-slate-100' : 'text-slate-800'].join(' ')}>{request.subject || 'Chamado sem assunto'}</p>
                            <p className={['mt-1 text-xs', isDarkTheme ? 'text-slate-400' : 'text-slate-500'].join(' ')}>{request.requesterName || request.requesterEmail || 'Cliente'} · {String(request.createdAt || '').slice(0, 10)}</p>
                            <p className={['mt-2 text-xs', isDarkTheme ? 'text-slate-500' : 'text-slate-500'].join(' ')}>{request.message}</p>
                          </div>
                          <div className="grid gap-2">
                            <select
                              value={supportDrafts[request.id]?.status || request.status}
                              onChange={(event) =>
                                setSupportDrafts((current) => ({
                                  ...current,
                                  [request.id]: {
                                    status: event.target.value as SupportRequestStatus,
                                    adminResponse: current[request.id]?.adminResponse || request.adminResponse || ''
                                  }
                                }))
                              }
                              className={isDarkTheme ? 'rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-xs text-slate-100' : 'rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700'}
                            >
                              <option value="PENDING">Pendente</option>
                              <option value="IN_REVIEW">Em analise</option>
                              <option value="DONE">Resolvido</option>
                            </select>
                            <button
                              type="button"
                              onClick={() => void saveSupportRequestByAdmin(request.id, request.companyId)}
                              className="rounded-lg bg-blue-600 px-3 py-1 text-xs font-semibold text-white hover:bg-blue-500"
                            >
                              Salvar
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                    {!supportRequests.length ? (
                      <p className={['text-sm', isDarkTheme ? 'text-slate-500' : 'text-slate-500'].join(' ')}>
                        Nenhuma solicitacao de suporte encontrada.
                      </p>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          {role === 'ADMIN' && activeView === 'companies' ? (
            <div className="grid gap-6">
              <div className={themedPanelClass}>
                <h1 className={themedTitleClass}>Empresas</h1>
                <p className={['mt-1', themedSubtextClass].join(' ')}>Crie, edite e exclua empresas do ambiente.</p>
                <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-[1.2fr_1.2fr_1fr_auto]">
                  <input className={themedInputClass} placeholder="Nome da empresa" value={companyName} onChange={(event) => setCompanyName(event.target.value)} />
                  <input className={themedInputClass} placeholder="Localizacao (cidade/estado)" value={companyLocation} onChange={(event) => setCompanyLocation(event.target.value)} />
                  <select className={themedSelectClass} value={companyPlan} onChange={(event) => setCompanyPlan(event.target.value as CompanyPlan)}>
                    <option className={themedOptionClass} value="BASIC">BASIC</option>
                    <option className={themedOptionClass} value="PRO">PRO</option>
                    <option className={themedOptionClass} value="PREMIUM">PREMIUM</option>
                  </select>
                  <button type="button" onClick={handleCreateCompany} className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition-all duration-300 hover:-translate-y-0.5 hover:bg-slate-800 disabled:opacity-70" disabled={adminLoading}>
                    Criar empresa
                  </button>
                </div>
              </div>

              {editingCompanyId ? (
                <div className={themedPanelClass}>
                  <h2 className={isDarkTheme ? 'text-lg font-bold text-white' : 'text-lg font-bold text-slate-800'}>Editar empresa</h2>
                  <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    <input className={themedInputClass} value={editingCompanyName} onChange={(event) => setEditingCompanyName(event.target.value)} />
                    <input className={themedInputClass} placeholder="Localizacao" value={editingCompanyLocation} onChange={(event) => setEditingCompanyLocation(event.target.value)} />
                    <select className={themedSelectClass} value={editingCompanyPlan} onChange={(event) => setEditingCompanyPlan(event.target.value as CompanyPlan)}>
                      <option className={themedOptionClass} value="BASIC">BASIC</option>
                      <option className={themedOptionClass} value="PRO">PRO</option>
                      <option className={themedOptionClass} value="PREMIUM">PREMIUM</option>
                    </select>
                    <select className={themedSelectClass} value={editingCompanyStatus} onChange={(event) => setEditingCompanyStatus(event.target.value as CompanyStatus)}>
                      <option className={themedOptionClass} value="ACTIVE">ACTIVE</option>
                      <option className={themedOptionClass} value="PAST_DUE">PAST_DUE</option>
                      <option className={themedOptionClass} value="CANCELED">CANCELED</option>
                      <option className={themedOptionClass} value="BLOCKED">BLOCKED</option>
                    </select>
                  </div>
                  <div className="mt-4 flex gap-2">
                    <button type="button" onClick={saveCompanyChanges} className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-all duration-300 hover:-translate-y-0.5 hover:bg-blue-500">Salvar empresa</button>
                    <button type="button" onClick={cancelCompanyEditor} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-white">Cancelar</button>
                  </div>
                </div>
              ) : null}

              <div className="grid gap-3">
                {companies.map((company) => {
                  const currentStatus = company.subscription_status || company.subscriptionStatus || 'ACTIVE';

                  return (
                    <article key={company.id} className={themedPanelClass}>
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <h3 className={isDarkTheme ? 'text-lg font-bold text-white' : 'text-lg font-bold text-slate-800'}>{company.name}</h3>
                          <p className={['mt-1 text-sm', themedSubtextClass].join(' ')}>ID: {company.id}</p>
                          <p className={['mt-1 text-sm', themedSubtextClass].join(' ')}>Localizacao: {company.location || 'Nao informada'}</p>
                          <p className={isDarkTheme ? 'mt-1 text-sm text-slate-300' : 'mt-1 text-sm text-slate-600'}>Plano: {company.plan || 'BASIC'} | Status: {currentStatus}</p>
                        </div>
                        <div className="flex gap-2">
                          <button type="button" onClick={() => openCompanyEditor(company)} className={isDarkTheme ? 'rounded-xl border border-white/20 px-3 py-2 text-sm font-semibold text-slate-100 transition-all duration-300 hover:-translate-y-0.5 hover:bg-white/10' : 'rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition-all duration-300 hover:-translate-y-0.5 hover:bg-slate-100'}>Editar</button>
                          <button type="button" onClick={() => void deleteCompany(company.id)} className="rounded-xl bg-rose-600 px-3 py-2 text-sm font-semibold text-white transition-all duration-300 hover:-translate-y-0.5 hover:bg-rose-500">Excluir</button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          ) : null}

          {role === 'ADMIN' && activeView === 'clients' ? (
            <div className="grid gap-6">
              <div className={themedPanelClass}>
                <h1 className={themedTitleClass}>Clientes e usuarios</h1>
                <p className={['mt-1', themedSubtextClass].join(' ')}>Crie, edite e exclua usuarios do sistema.</p>
                <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <input className={themedInputClass} placeholder="Nome" value={userFormName} onChange={(event) => setUserFormName(event.target.value)} />
                  <input className={themedInputClass} placeholder="Email" value={userFormEmail} onChange={(event) => setUserFormEmail(event.target.value)} />
                  <input className={themedInputClass} placeholder="Senha" type="password" value={userFormPassword} onChange={(event) => setUserFormPassword(event.target.value)} />
                  <select className={themedSelectClass} value={userFormRole} onChange={(event) => setUserFormRole(event.target.value as 'ADMIN' | 'DEV' | 'CLIENT')}>
                    <option className={themedOptionClass} value="CLIENT">CLIENT</option>
                    <option className={themedOptionClass} value="DEV">DEV</option>
                    <option className={themedOptionClass} value="ADMIN">ADMIN</option>
                  </select>
                  <select className={themedSelectClass} value={userFormCompanyId} onChange={(event) => setUserFormCompanyId(event.target.value)} disabled={userFormRole === 'ADMIN'}>
                    <option className={themedOptionClass} value="">Selecione uma empresa</option>
                    {companyOptions.map((option) => (
                      <option className={themedOptionClass} key={option.id} value={option.id}>{option.name}</option>
                    ))}
                  </select>
                  <input className={themedInputClass} placeholder="Ou criar nova empresa para CLIENT/DEV" value={userFormCompanyName} onChange={(event) => setUserFormCompanyName(event.target.value)} disabled={userFormRole === 'ADMIN'} />
                  <input className={themedInputClass} type="date" value={userFormAccessUntil} onChange={(event) => setUserFormAccessUntil(event.target.value)} disabled={userFormRole === 'ADMIN'} />
                </div>
                <button type="button" onClick={handleCreateUser} className="mt-4 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition-all duration-300 hover:-translate-y-0.5 hover:bg-slate-800 disabled:opacity-70" disabled={adminLoading}>
                  Criar usuario
                </button>
              </div>

              {editingUserId ? (
                <div className={themedPanelClass}>
                  <h2 className={isDarkTheme ? 'text-lg font-bold text-white' : 'text-lg font-bold text-slate-800'}>Editar usuario</h2>
                  <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    <input className={themedInputClass} value={editingUserName} onChange={(event) => setEditingUserName(event.target.value)} />
                    <input className={themedInputClass} value={editingUserEmail} onChange={(event) => setEditingUserEmail(event.target.value)} />
                    <select className={themedSelectClass} value={editingUserRole} onChange={(event) => setEditingUserRole(event.target.value as 'ADMIN' | 'DEV' | 'CLIENT')}>
                      <option className={themedOptionClass} value="CLIENT">CLIENT</option>
                      <option className={themedOptionClass} value="DEV">DEV</option>
                      <option className={themedOptionClass} value="ADMIN">ADMIN</option>
                    </select>
                    <select className={themedSelectClass} value={editingUserCompanyId} onChange={(event) => setEditingUserCompanyId(event.target.value)} disabled={editingUserRole === 'ADMIN'}>
                      <option className={themedOptionClass} value="">Selecione uma empresa</option>
                      {companyOptions.map((option) => (
                        <option className={themedOptionClass} key={option.id} value={option.id}>{option.name}</option>
                      ))}
                    </select>
                    <input className={themedInputClass} placeholder="Ou criar nova empresa" value={editingUserCompanyName} onChange={(event) => setEditingUserCompanyName(event.target.value)} disabled={editingUserRole === 'ADMIN'} />
                    <input className={themedInputClass} type="date" value={editingUserAccessUntil} onChange={(event) => setEditingUserAccessUntil(event.target.value)} disabled={editingUserRole === 'ADMIN'} />
                    <input className={themedInputClass} placeholder="Nova senha (opcional)" type="password" value={editingUserPassword} onChange={(event) => setEditingUserPassword(event.target.value)} />
                  </div>
                  <div className="mt-4 flex gap-2">
                    <button type="button" onClick={saveUserChanges} className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-all duration-300 hover:-translate-y-0.5 hover:bg-blue-500">Salvar usuario</button>
                    <button type="button" onClick={cancelUserEditor} className={isDarkTheme ? 'rounded-xl border border-white/20 px-4 py-2 text-sm font-semibold text-slate-100 hover:bg-white/10' : 'rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-white'}>Cancelar</button>
                  </div>
                </div>
              ) : null}

              <div className="grid gap-3">
                {managedUsers.map((user) => {
                  const userCompanyId = String(user.company_id || user.companyId || '').trim() || 'Sem empresa';

                  return (
                    <article key={user.id} className={themedPanelClass}>
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <h3 className={isDarkTheme ? 'text-lg font-bold text-white' : 'text-lg font-bold text-slate-800'}>{user.name}</h3>
                          <p className={['mt-1 text-sm', themedSubtextClass].join(' ')}>{user.email}</p>
                          <p className={isDarkTheme ? 'mt-1 text-sm text-slate-300' : 'mt-1 text-sm text-slate-600'}>Role: {user.role} | Empresa: {userCompanyId}</p>
                          <p className={['mt-1 text-sm', themedSubtextClass].join(' ')}>Valido ate: {String(user.access_until || user.accessUntil || '').slice(0, 10) || 'Sem limite'}</p>
                        </div>
                        <div className="flex gap-2">
                          <button type="button" onClick={() => openUserEditor(user)} className={isDarkTheme ? 'rounded-xl border border-white/20 px-3 py-2 text-sm font-semibold text-slate-100 transition-all duration-300 hover:-translate-y-0.5 hover:bg-white/10' : 'rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition-all duration-300 hover:-translate-y-0.5 hover:bg-slate-100'}>Editar</button>
                          <button type="button" onClick={() => void deleteUser(user.id)} className="rounded-xl bg-rose-600 px-3 py-2 text-sm font-semibold text-white transition-all duration-300 hover:-translate-y-0.5 hover:bg-rose-500">Excluir</button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          ) : null}

          {activeView === 'products' ? (
            <div className="grid gap-6">
              <div className={themedPanelClass}>
                <h1 className={themedTitleClass}>Produtos</h1>
                <p className={['mt-1', themedSubtextClass].join(' ')}>Cadastro de produtos separado do controle de estoque.</p>

                <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  {role === 'ADMIN' ? (
                    <select className={themedSelectClass} value={productCompanyId} onChange={(event) => setProductCompanyId(event.target.value)}>
                      <option className={themedOptionClass} value="">Selecione a empresa</option>
                      {companyOptions.map((option) => (
                        <option className={themedOptionClass} key={option.id} value={option.id}>{option.name}</option>
                      ))}
                    </select>
                  ) : null}
                </div>

                <div className="mt-4 flex gap-2">
                  <button type="button" onClick={() => setShowProductCreateModal(true)} disabled={productsLoading} className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition-all duration-300 hover:-translate-y-0.5 hover:bg-slate-800 disabled:opacity-70">Novo produto</button>
                  <button type="button" onClick={fetchProducts} disabled={productsLoading} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition-all duration-300 hover:-translate-y-0.5 hover:bg-slate-100 disabled:opacity-70">Atualizar lista</button>
                </div>
              </div>

              {showProductCreateModal ? (
                <div className="fixed inset-0 z-[80] grid place-items-center bg-black/60 p-4 backdrop-blur-sm">
                  <div className={[themedPanelClass, 'w-full max-w-xl'].join(' ')}>
                    <h2 className={themedTitleClass}>Criar produto</h2>
                    <p className={['mt-1 text-sm', themedSubtextClass].join(' ')}>Preencha apenas os dados de cadastro do produto.</p>
                    <div className="mt-4 grid gap-3">
                      <input className={themedInputClass} placeholder="Nome" value={productName} onChange={(event) => setProductName(event.target.value)} />
                      <div className={[
                        'flex items-center rounded-xl border px-3 py-2 text-sm',
                        isDarkTheme ? 'border-white/10 bg-white/5 text-slate-100' : 'border-slate-200 bg-slate-50 text-slate-800'
                      ].join(' ')}>
                        <span className={isDarkTheme ? 'mr-2 text-slate-400' : 'mr-2 text-slate-500'}>R$</span>
                        <input
                          className="w-full bg-transparent outline-none"
                          placeholder="0,00"
                          type="number"
                          min="0"
                          step="0.01"
                          value={productPrice}
                          onChange={(event) => setProductPrice(event.target.value)}
                        />
                      </div>
                      <input
                        className={themedInputClass}
                        placeholder="Quantidade inicial em estoque"
                        type="number"
                        min="0"
                        step="1"
                        value={productQuantity}
                        onChange={(event) => setProductQuantity(event.target.value)}
                      />
                      <textarea className={themedInputClass} placeholder="Descricao" value={productDescription} onChange={(event) => setProductDescription(event.target.value)} rows={4} />
                    </div>
                    <div className="mt-4 flex gap-2">
                      <button type="button" onClick={handleCreateProduct} disabled={productsLoading} className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-all duration-300 hover:bg-blue-500 disabled:opacity-70">Criar produto</button>
                      <button type="button" onClick={() => setShowProductCreateModal(false)} className={isDarkTheme ? 'rounded-xl border border-white/20 px-4 py-2 text-sm font-semibold text-slate-100 hover:bg-white/10' : 'rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-white'}>Cancelar</button>
                    </div>
                  </div>
                </div>
              ) : null}

              {editingProductId ? (
                <div className={themedPanelClass}>
                  <h2 className={isDarkTheme ? 'text-lg font-bold text-white' : 'text-lg font-bold text-slate-800'}>Editar produto</h2>
                  <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    <input className={themedInputClass} value={editingProductName} onChange={(event) => setEditingProductName(event.target.value)} />
                    <input className={themedInputClass} type="number" step="0.01" value={editingProductPrice} onChange={(event) => setEditingProductPrice(event.target.value)} />
                    <textarea className={themedInputClass} value={editingProductDescription} onChange={(event) => setEditingProductDescription(event.target.value)} rows={3} />
                  </div>
                  <div className="mt-4 flex gap-2">
                    <button type="button" onClick={saveProductChanges} className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-all duration-300 hover:-translate-y-0.5 hover:bg-blue-500">Salvar produto</button>
                    <button type="button" onClick={cancelProductEditor} className={isDarkTheme ? 'rounded-xl border border-white/20 px-4 py-2 text-sm font-semibold text-slate-100 hover:bg-white/10' : 'rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-white'}>Cancelar</button>
                  </div>
                </div>
              ) : null}

              <div className="grid gap-3">
                {products.map((product) => (
                  <article key={product.id} className={themedPanelClass}>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h3 className={isDarkTheme ? 'text-lg font-bold text-white' : 'text-lg font-bold text-slate-800'}>{product.name}</h3>
                        <p className={isDarkTheme ? 'mt-1 text-sm text-slate-300' : 'mt-1 text-sm text-slate-600'}>Preco: {formatCurrency(Number(product.price || 0))}</p>
                        <p className={['mt-1 text-sm', themedSubtextClass].join(' ')}>{String(product.description || 'Sem descricao cadastrada.')}</p>
                      </div>
                      <div className="flex gap-2">
                        <button type="button" onClick={() => openProductEditor(product)} className={isDarkTheme ? 'rounded-xl border border-white/20 px-3 py-2 text-sm font-semibold text-slate-100 transition-all duration-300 hover:-translate-y-0.5 hover:bg-white/10' : 'rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition-all duration-300 hover:-translate-y-0.5 hover:bg-slate-100'}>Editar</button>
                        <button type="button" onClick={() => void deleteProduct(product.id)} className="rounded-xl bg-rose-600 px-3 py-2 text-sm font-semibold text-white transition-all duration-300 hover:-translate-y-0.5 hover:bg-rose-500">Excluir</button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          ) : null}

          {activeView === 'inventory' ? (
            <div className="grid gap-6">
              <div className={themedPanelClass}>
                <h1 className={themedTitleClass}>Estoque</h1>
                <p className={['mt-1', themedSubtextClass].join(' ')}>Controle de quantidade separado do cadastro de produtos.</p>

                <div className="mt-4 flex gap-2">
                  <button type="button" onClick={fetchInventory} disabled={inventoryLoading} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition-all duration-300 hover:bg-slate-100 disabled:opacity-70">Atualizar estoque</button>
                </div>
              </div>

              <div className={themedPanelClass}>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[620px] text-sm">
                    <thead>
                      <tr className={isDarkTheme ? 'text-slate-300' : 'text-slate-600'}>
                        <th className="px-3 py-2 text-left">Produto</th>
                        <th className="px-3 py-2 text-left">Quantidade</th>
                        <th className="px-3 py-2 text-left">Status</th>
                        <th className="px-3 py-2 text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {inventoryItems.map((item) => {
                        const quantity = Number(item.quantity || 0);
                        const lowStock = quantity <= 5;

                        return (
                          <tr key={item.id} className={isDarkTheme ? 'border-t border-white/10' : 'border-t border-slate-200'}>
                            <td className="px-3 py-3 font-semibold">{item.name}</td>
                            <td className="px-3 py-3">{quantity}</td>
                            <td className="px-3 py-3">
                              <span className={[
                                'rounded-full px-2 py-1 text-xs font-semibold',
                                lowStock ? 'bg-rose-500/20 text-rose-400' : 'bg-emerald-500/20 text-emerald-400'
                              ].join(' ')}>
                                {lowStock ? 'Estoque baixo' : 'Normal'}
                              </span>
                            </td>
                            <td className="px-3 py-3 text-right">
                              <div className="inline-flex items-center gap-2">
                                <button type="button" onClick={() => void adjustInventory(String(item.product_id || item.productId || item.id), 'remove', 1)} disabled={inventoryLoading} className="rounded-lg border border-rose-400/40 px-3 py-1 text-xs font-semibold text-rose-300 hover:bg-rose-500/10 disabled:opacity-60">- Remover</button>
                                <button type="button" onClick={() => void adjustInventory(String(item.product_id || item.productId || item.id), 'add', 1)} disabled={inventoryLoading} className="rounded-lg border border-emerald-400/40 px-3 py-1 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/10 disabled:opacity-60">+ Adicionar</button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>

                  {!inventoryItems.length ? (
                    <p className={['mt-4 text-sm', themedSubtextClass].join(' ')}>Nenhum item de estoque encontrado.</p>
                  ) : null}
                </div>
              </div>
            </div>
          ) : null}

          {activeView === 'integrations' && (role === 'DEV' || role === 'ADMIN') ? (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
              className="grid gap-6"
            >
              <div className={[
                'rounded-3xl border p-6 shadow-xl',
                isDarkTheme ? 'border-cyan-500/20 bg-[#0d1117] shadow-[0_0_28px_rgba(34,211,238,0.12)]' : 'border-slate-200 bg-white'
              ].join(' ')}>
                <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                  <div>
                    <h1 className={['text-2xl font-black', isDarkTheme ? 'text-white' : 'text-slate-900'].join(' ')}>Integracoes API</h1>
                    <p className={['mt-1 text-sm', isDarkTheme ? 'text-slate-400' : 'text-slate-500'].join(' ')}>
                      Conecte ERPs, automacoes e apps externos com Bearer token e webhooks configuraveis por empresa.
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {role === 'ADMIN' ? (
                      <select
                        className={['min-w-[220px] rounded-xl border px-3 py-2 text-sm outline-none transition-all', isDarkTheme ? 'border-white/10 bg-white/5 text-slate-100 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/30' : 'border-slate-200 bg-slate-50 text-slate-800 focus:border-blue-400'].join(' ')}
                        value={integrationCompanyId}
                        onChange={(event) => setIntegrationCompanyId(event.target.value)}
                      >
                        <option value="">Selecione a empresa</option>
                        {companyOptions.map((option) => (
                          <option key={option.id} value={option.id}>{option.name}</option>
                        ))}
                      </select>
                    ) : null}

                    <button
                      type="button"
                      onClick={() => void fetchIntegrationConfig()}
                      disabled={integrationLoading}
                      className={['rounded-xl px-4 py-2 text-sm font-semibold transition-all disabled:opacity-70', isDarkTheme ? 'border border-white/10 bg-white/5 text-slate-200 hover:bg-white/10' : 'border border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200'].join(' ')}
                    >
                      {integrationLoading ? 'Carregando...' : 'Atualizar'}
                    </button>
                  </div>
                </div>
              </div>

              {integrationApiConfig ? (
                <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
                  <div className="grid gap-6">
                    <div className={[
                      'rounded-3xl border p-6',
                      isDarkTheme ? 'border-emerald-500/20 bg-[#0d1117]' : 'border-slate-200 bg-white'
                    ].join(' ')}>
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div className="flex items-start gap-3">
                          <div className="rounded-2xl bg-emerald-500/15 p-3 text-emerald-300">
                            <KeyRound className="h-5 w-5" />
                          </div>
                          <div>
                            <h3 className={['text-lg font-bold', isDarkTheme ? 'text-white' : 'text-slate-900'].join(' ')}>API Key da empresa</h3>
                            <p className={['mt-1 text-sm', themedSubtextClass].join(' ')}>
                              Use esta chave no header Authorization como Bearer token para acessar os endpoints externos.
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => void copyToClipboard(integrationApiConfig.apiKey, 'API key copiada')}
                            className="rounded-xl bg-cyan-600 px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-cyan-500"
                          >
                            <span className="inline-flex items-center gap-2"><Copy className="h-4 w-4" />Copiar</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => void regenerateIntegrationApiKey()}
                            disabled={integrationLoading}
                            className={isDarkTheme ? 'rounded-xl border border-white/10 px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-white/10 disabled:opacity-60' : 'rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60'}
                          >
                            <span className="inline-flex items-center gap-2"><RefreshCw className="h-4 w-4" />Regenerar</span>
                          </button>
                        </div>
                      </div>

                      <div className={['mt-5 rounded-2xl border px-4 py-4', isDarkTheme ? 'border-white/10 bg-black/30' : 'border-slate-200 bg-slate-50'].join(' ')}>
                        <p className={['text-xs uppercase tracking-[0.25em]', isDarkTheme ? 'text-slate-500' : 'text-slate-400'].join(' ')}>Token mascarado</p>
                        <p className={['mt-2 break-all font-mono text-sm', isDarkTheme ? 'text-emerald-300' : 'text-emerald-700'].join(' ')}>
                          {integrationApiConfig.maskedApiKey}
                        </p>
                        <p className={['mt-3 text-xs', themedSubtextClass].join(' ')}>
                          Ultima atualizacao: {formatDateTime(integrationApiConfig.updatedAt)}
                        </p>
                      </div>
                    </div>

                    <div className={[
                      'rounded-3xl border p-6',
                      isDarkTheme ? 'border-blue-500/20 bg-[#0d1117]' : 'border-slate-200 bg-white'
                    ].join(' ')}>
                      <div className="mb-5 flex items-start gap-3">
                        <div className="rounded-2xl bg-blue-500/15 p-3 text-blue-300">
                          <Code2 className="h-5 w-5" />
                        </div>
                        <div>
                          <h3 className={['text-lg font-bold', isDarkTheme ? 'text-white' : 'text-slate-900'].join(' ')}>Endpoints disponiveis</h3>
                          <p className={['mt-1 text-sm', themedSubtextClass].join(' ')}>
                            Base URL: <span className="font-mono">{integrationApiBaseUrl}</span>
                          </p>
                        </div>
                      </div>

                      <div className="grid gap-4">
                        {integrationExamples.map((endpoint) => (
                          <div key={`${endpoint.method}-${endpoint.path}`} className={['rounded-2xl border p-4', isDarkTheme ? 'border-white/10 bg-black/20' : 'border-slate-200 bg-slate-50'].join(' ')}>
                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className={['rounded-full px-2.5 py-1 text-xs font-black', endpoint.method === 'GET' ? 'bg-emerald-500/15 text-emerald-300' : 'bg-blue-500/15 text-blue-300'].join(' ')}>{endpoint.method}</span>
                                  <span className={['font-mono text-sm', isDarkTheme ? 'text-slate-200' : 'text-slate-700'].join(' ')}>{endpoint.path}</span>
                                </div>
                                <p className={['mt-2 text-sm', themedSubtextClass].join(' ')}>{endpoint.description}</p>
                              </div>

                              <button
                                type="button"
                                onClick={() => void copyToClipboard(endpoint.example, `Exemplo de ${endpoint.path} copiado`)}
                                className={isDarkTheme ? 'rounded-xl border border-white/10 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-white/10' : 'rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-white'}
                              >
                                <span className="inline-flex items-center gap-2"><Copy className="h-3.5 w-3.5" />Copiar exemplo</span>
                              </button>
                            </div>

                            <pre className={['mt-4 overflow-x-auto rounded-2xl p-4 text-xs leading-6', isDarkTheme ? 'bg-[#020617] text-cyan-200' : 'bg-slate-950 text-slate-100'].join(' ')}>
                              <code>{endpoint.example}</code>
                            </pre>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-6">
                    <div className={[
                      'rounded-3xl border p-6',
                      isDarkTheme ? 'border-fuchsia-500/20 bg-[#0d1117]' : 'border-slate-200 bg-white'
                    ].join(' ')}>
                      <div className="mb-5 flex items-start gap-3">
                        <div className="rounded-2xl bg-fuchsia-500/15 p-3 text-fuchsia-300">
                          <Webhook className="h-5 w-5" />
                        </div>
                        <div>
                          <h3 className={['text-lg font-bold', isDarkTheme ? 'text-white' : 'text-slate-900'].join(' ')}>Webhooks</h3>
                          <p className={['mt-1 text-sm', themedSubtextClass].join(' ')}>
                            Receba eventos de venda, produto e estoque baixo no seu endpoint.
                          </p>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <input
                          value={integrationWebhookUrl}
                          onChange={(event) => setIntegrationWebhookUrl(event.target.value)}
                          placeholder="https://seu-sistema.com/webhooks/syncho"
                          className={themedInputClass}
                        />

                        <div className="flex flex-wrap gap-2">
                          {integrationEvents.map((event) => {
                            const isSelected = integrationWebhookEvents.includes(event);

                            return (
                              <button
                                key={event}
                                type="button"
                                onClick={() => toggleIntegrationWebhookEvent(event)}
                                className={[
                                  'rounded-full px-3 py-1.5 text-xs font-semibold transition-all',
                                  isSelected
                                    ? 'bg-cyan-600 text-white'
                                    : isDarkTheme
                                      ? 'border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
                                      : 'border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                                ].join(' ')}
                              >
                                {event}
                              </button>
                            );
                          })}
                        </div>

                        <button
                          type="button"
                          onClick={addIntegrationWebhook}
                          className="rounded-xl bg-fuchsia-600 px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-fuchsia-500"
                        >
                          <span className="inline-flex items-center gap-2"><Plus className="h-4 w-4" />Adicionar webhook</span>
                        </button>
                      </div>

                      <div className="mt-5 space-y-3">
                        {integrationApiConfig.webhooks.length ? (
                          integrationApiConfig.webhooks.map((webhook) => (
                            <div key={webhook.id} className={['rounded-2xl border p-4', isDarkTheme ? 'border-white/10 bg-black/20' : 'border-slate-200 bg-slate-50'].join(' ')}>
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <p className={['break-all text-sm font-semibold', isDarkTheme ? 'text-white' : 'text-slate-900'].join(' ')}>{webhook.url}</p>
                                  <div className="mt-2 flex flex-wrap gap-2">
                                    {webhook.events.map((event) => (
                                      <span key={event} className="rounded-full bg-cyan-500/15 px-2 py-1 text-[11px] font-semibold text-cyan-300">{event}</span>
                                    ))}
                                  </div>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => removeIntegrationWebhook(webhook.id)}
                                  className={isDarkTheme ? 'rounded-xl border border-white/10 px-3 py-2 text-xs font-semibold text-rose-300 hover:bg-rose-500/10' : 'rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50'}
                                >
                                  <span className="inline-flex items-center gap-2"><Trash2 className="h-3.5 w-3.5" />Remover</span>
                                </button>
                              </div>
                            </div>
                          ))
                        ) : (
                          <p className={['text-sm', themedSubtextClass].join(' ')}>Nenhum webhook configurado ainda.</p>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => void saveIntegrationWebhooks()}
                        disabled={integrationLoading}
                        className="mt-5 rounded-xl bg-cyan-600 px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-cyan-500 disabled:opacity-60"
                      >
                        Salvar webhooks
                      </button>
                    </div>

                    <div className={[
                      'rounded-3xl border p-6',
                      isDarkTheme ? 'border-amber-500/20 bg-[#0d1117]' : 'border-slate-200 bg-white'
                    ].join(' ')}>
                      <div className="mb-4 flex items-start gap-3">
                        <div className="rounded-2xl bg-amber-500/15 p-3 text-amber-300">
                          <ShieldCheck className="h-5 w-5" />
                        </div>
                        <div>
                          <h3 className={['text-lg font-bold', isDarkTheme ? 'text-white' : 'text-slate-900'].join(' ')}>Seguranca</h3>
                          <p className={['mt-1 text-sm', themedSubtextClass].join(' ')}>
                            A API valida Bearer token por empresa e aplica rate limit basico para reduzir abuso.
                          </p>
                        </div>
                      </div>

                      <ul className={['space-y-2 text-sm', isDarkTheme ? 'text-slate-300' : 'text-slate-600'].join(' ')}>
                        <li>Bearer token exclusivo por empresa.</li>
                        <li>Regeneracao imediata invalida a chave anterior.</li>
                        <li>Rate limit padrao de 120 requisicoes por minuto por API key.</li>
                        <li>Webhooks enviados com assinatura HMAC em X-Syncho-Signature.</li>
                      </ul>
                    </div>
                  </div>
                </div>
              ) : (
                <div className={[
                  'rounded-3xl border p-10 text-center',
                  isDarkTheme ? 'border-white/10 bg-[#0d1117] text-slate-400' : 'border-slate-200 bg-white text-slate-500'
                ].join(' ')}>
                  {integrationLoading ? 'Carregando configuracao da integracao...' : 'Selecione uma empresa e clique em Atualizar para configurar a API customizada.'}
                </div>
              )}
            </motion.div>
          ) : null}

          {activeView === 'settings' ? (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
              className="mx-auto w-full max-w-4xl space-y-6"
            >
              {/* Header */}
              <div>
                <h1 className={['text-2xl font-bold', isDarkTheme ? 'text-white' : 'text-slate-900'].join(' ')}>Configuracoes</h1>
                <p className={['mt-1 text-sm', isDarkTheme ? 'text-slate-400' : 'text-slate-500'].join(' ')}>Gerencie seu perfil, empresa e seguranca</p>
              </div>

              {/* CARD: Perfil */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.05 }}
                className={['rounded-2xl border p-6 shadow-sm', isDarkTheme ? 'border-white/10 bg-white/5 backdrop-blur-md' : 'border-slate-200 bg-white'].join(' ')}
              >
                <div className="flex items-center gap-3 mb-5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/20 text-blue-400">
                    <Users className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className={['text-base font-semibold', isDarkTheme ? 'text-white' : 'text-slate-800'].join(' ')}>Perfil do usuario</h2>
                    <p className={['text-xs', isDarkTheme ? 'text-slate-400' : 'text-slate-500'].join(' ')}>Informacoes da sua conta</p>
                  </div>
                </div>
                <div className="flex items-center gap-5">
                  <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 text-xl font-bold text-white shadow-lg">
                    {(displayUserName || 'U').slice(0, 1).toUpperCase()}
                  </div>
                  <div className="grid gap-1 flex-1">
                    <p className={['text-lg font-semibold', isDarkTheme ? 'text-white' : 'text-slate-900'].join(' ')}>{displayUserName || 'Usuario'}</p>
                    <p className={['text-sm', isDarkTheme ? 'text-slate-400' : 'text-slate-500'].join(' ')}>{displayUserEmail || 'email@empresa.com'}</p>
                    <span className={['inline-flex w-fit rounded-full px-2 py-0.5 text-xs font-semibold', role === 'ADMIN' ? 'bg-purple-500/15 text-purple-300' : 'bg-blue-500/15 text-blue-300'].join(' ')}>
                      {role === 'ADMIN' ? 'Administrador' : 'Cliente'}
                    </span>
                  </div>
                </div>
              </motion.div>

              {/* CARD: Empresa */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.1 }}
                className={['rounded-2xl border p-6 shadow-sm', isDarkTheme ? 'border-white/10 bg-white/5 backdrop-blur-md' : 'border-slate-200 bg-white'].join(' ')}
              >
                <div className="flex items-center gap-3 mb-5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400">
                    <BarChart3 className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className={['text-base font-semibold', isDarkTheme ? 'text-white' : 'text-slate-800'].join(' ')}>Empresa</h2>
                    <p className={['text-xs', isDarkTheme ? 'text-slate-400' : 'text-slate-500'].join(' ')}>Dados da sua empresa e plano</p>
                  </div>
                </div>

                {role === 'ADMIN' ? (
                  <div className="mb-4 grid gap-3 sm:grid-cols-2">
                    <select
                      className={['rounded-xl border px-3 py-2 text-sm outline-none transition-all focus:ring-2', isDarkTheme ? 'border-white/10 bg-white/5 text-slate-100 focus:border-blue-500 focus:ring-blue-500/30' : 'border-slate-200 bg-slate-50 text-slate-800 focus:border-blue-400 focus:ring-blue-400/20'].join(' ')}
                      value={settingsCompanyId}
                      onChange={(event) => setSettingsCompanyId(event.target.value)}
                    >
                      <option value="">Selecione a empresa</option>
                      {companyOptions.map((option) => (
                        <option key={option.id} value={option.id}>{option.name}</option>
                      ))}
                    </select>
                    <div className="flex gap-2">
                      <select
                        className={['flex-1 rounded-xl border px-3 py-2 text-sm outline-none transition-all focus:ring-2', isDarkTheme ? 'border-white/10 bg-white/5 text-slate-100 focus:border-blue-500 focus:ring-blue-500/30' : 'border-slate-200 bg-slate-50 text-slate-800 focus:border-blue-400 focus:ring-blue-400/20'].join(' ')}
                        value={settingsPlan}
                        onChange={(event) => setSettingsPlan(event.target.value as CompanyPlan)}
                      >
                        <option value="BASIC">BASIC</option>
                        <option value="PRO">PRO</option>
                        <option value="PREMIUM">PREMIUM</option>
                      </select>
                      <input
                        type="date"
                        className={['rounded-xl border px-3 py-2 text-sm outline-none transition-all focus:ring-2', isDarkTheme ? 'border-white/10 bg-white/5 text-slate-100 focus:border-blue-500 focus:ring-blue-500/30' : 'border-slate-200 bg-slate-50 text-slate-800 focus:border-blue-400 focus:ring-blue-400/20'].join(' ')}
                        value={settingsExpiresAt}
                        onChange={(event) => setSettingsExpiresAt(event.target.value)}
                      />
                    </div>
                  </div>
                ) : null}

                {settingsCompanyInfo ? (
                  <div className={['rounded-xl border p-4 text-sm', isDarkTheme ? 'border-white/8 bg-black/20' : 'border-slate-100 bg-slate-50'].join(' ')}>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <div>
                        <p className={['text-xs font-medium uppercase tracking-wide', isDarkTheme ? 'text-slate-500' : 'text-slate-400'].join(' ')}>Nome da empresa</p>
                        <p className={['mt-1 font-semibold', isDarkTheme ? 'text-white' : 'text-slate-900'].join(' ')}>{settingsCompanyInfo.name || '-'}</p>
                      </div>
                      <div>
                        <p className={['text-xs font-medium uppercase tracking-wide', isDarkTheme ? 'text-slate-500' : 'text-slate-400'].join(' ')}>Localizacao</p>
                        <p className={['mt-1 font-semibold', isDarkTheme ? 'text-white' : 'text-slate-900'].join(' ')}>{settingsCompanyInfo.location || 'Nao informada'}</p>
                      </div>
                      <div>
                        <p className={['text-xs font-medium uppercase tracking-wide', isDarkTheme ? 'text-slate-500' : 'text-slate-400'].join(' ')}>Plano</p>
                        <span className="mt-1 inline-flex rounded-full bg-blue-500/15 px-2 py-0.5 text-xs font-semibold text-blue-300">{settingsSubscription?.plan || '-'}</span>
                      </div>
                      <div>
                        <p className={['text-xs font-medium uppercase tracking-wide', isDarkTheme ? 'text-slate-500' : 'text-slate-400'].join(' ')}>Status</p>
                        <span className={['mt-1 inline-flex rounded-full px-2 py-0.5 text-xs font-semibold', settingsSubscription?.status === 'ACTIVE' ? 'bg-emerald-500/15 text-emerald-300' : 'bg-amber-500/15 text-amber-300'].join(' ')}>
                          {settingsSubscription?.status || '-'}
                        </span>
                      </div>
                      <div>
                        <p className={['text-xs font-medium uppercase tracking-wide', isDarkTheme ? 'text-slate-500' : 'text-slate-400'].join(' ')}>Expira em</p>
                        <p className={['mt-1 font-semibold', isDarkTheme ? 'text-white' : 'text-slate-900'].join(' ')}>{settingsSubscription?.expiresAt ? String(settingsSubscription.expiresAt).slice(0, 10) : 'Sem limite'}</p>
                      </div>
                      <div>
                        <p className={['text-xs font-medium uppercase tracking-wide', isDarkTheme ? 'text-slate-500' : 'text-slate-400'].join(' ')}>Acesso ate</p>
                        <p className={['mt-1 font-semibold', isDarkTheme ? 'text-white' : 'text-slate-900'].join(' ')}>{settingsAccessUntil ? String(settingsAccessUntil).slice(0, 10) : 'Sem limite'}</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className={['text-sm', isDarkTheme ? 'text-slate-400' : 'text-slate-500'].join(' ')}>
                    {settingsLoading ? 'Carregando...' : 'Clique em "Carregar dados" para ver as informacoes da empresa.'}
                  </p>
                )}

                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={fetchSettings}
                    disabled={settingsLoading}
                    className={['rounded-xl px-4 py-2 text-sm font-semibold transition-all disabled:opacity-70', isDarkTheme ? 'border border-white/10 bg-white/5 text-slate-200 hover:bg-white/10' : 'border border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200'].join(' ')}
                  >
                    {settingsLoading ? 'Carregando...' : 'Carregar dados'}
                  </button>
                  {role === 'ADMIN' ? (
                    <button
                      type="button"
                      onClick={saveSettings}
                      disabled={settingsLoading}
                      className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-blue-700 disabled:opacity-70"
                    >
                      Salvar configuracoes
                    </button>
                  ) : null}
                </div>
              </motion.div>

              {/* CARD: Seguranca */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.15 }}
                className={['rounded-2xl border p-6 shadow-sm', isDarkTheme ? 'border-white/10 bg-white/5 backdrop-blur-md' : 'border-slate-200 bg-white'].join(' ')}
              >
                <div className="flex items-center gap-3 mb-5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-500/20 text-rose-400">
                    <Settings className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className={['text-base font-semibold', isDarkTheme ? 'text-white' : 'text-slate-800'].join(' ')}>Seguranca</h2>
                    <p className={['text-xs', isDarkTheme ? 'text-slate-400' : 'text-slate-500'].join(' ')}>Altere sua senha de acesso</p>
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <input
                    type="password"
                    placeholder="Nova senha"
                    className={['rounded-xl border px-3 py-2 text-sm outline-none transition-all focus:ring-2', isDarkTheme ? 'border-white/10 bg-white/5 text-slate-100 placeholder-slate-500 focus:border-blue-500 focus:ring-blue-500/30' : 'border-slate-200 bg-slate-50 text-slate-800 focus:border-blue-400 focus:ring-blue-400/20'].join(' ')}
                    value={settingsNewPassword}
                    onChange={(event) => setSettingsNewPassword(event.target.value)}
                  />
                  <input
                    type="password"
                    placeholder="Confirmar nova senha"
                    className={['rounded-xl border px-3 py-2 text-sm outline-none transition-all focus:ring-2', isDarkTheme ? 'border-white/10 bg-white/5 text-slate-100 placeholder-slate-500 focus:border-blue-500 focus:ring-blue-500/30' : 'border-slate-200 bg-slate-50 text-slate-800 focus:border-blue-400 focus:ring-blue-400/20'].join(' ')}
                    value={settingsConfirmPassword}
                    onChange={(event) => setSettingsConfirmPassword(event.target.value)}
                  />
                </div>
                <button
                  type="button"
                  onClick={changePassword}
                  disabled={settingsPasswordLoading || !settingsNewPassword || !settingsConfirmPassword}
                  className="mt-4 rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-rose-700 disabled:opacity-60"
                >
                  {settingsPasswordLoading ? 'Alterando...' : 'Alterar senha'}
                </button>
              </motion.div>

              {/* CARD: Preferencias */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.2 }}
                className={['rounded-2xl border p-6 shadow-sm', isDarkTheme ? 'border-white/10 bg-white/5 backdrop-blur-md' : 'border-slate-200 bg-white'].join(' ')}
              >
                <div className="flex items-center gap-3 mb-5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-yellow-500/20 text-yellow-400">
                    <TrendingUp className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className={['text-base font-semibold', isDarkTheme ? 'text-white' : 'text-slate-800'].join(' ')}>Preferencias</h2>
                    <p className={['text-xs', isDarkTheme ? 'text-slate-400' : 'text-slate-500'].join(' ')}>Aparencia e configuracoes visuais</p>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className={['text-sm font-medium', isDarkTheme ? 'text-slate-200' : 'text-slate-700'].join(' ')}>Tema da interface</p>
                    <p className={['text-xs', isDarkTheme ? 'text-slate-500' : 'text-slate-400'].join(' ')}>Escolha entre modo claro e escuro</p>
                  </div>
                  <div className={['flex items-center gap-1 rounded-xl border px-1 py-1 text-xs', isDarkTheme ? 'border-white/10 bg-white/5' : 'border-slate-200 bg-slate-100'].join(' ')}>
                    <button
                      type="button"
                      onClick={() => setUiTheme('light')}
                      className={['rounded-lg px-3 py-1.5 text-xs font-semibold transition-all', uiTheme === 'light' ? 'bg-blue-600 text-white shadow' : isDarkTheme ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700'].join(' ')}
                    >
                      Claro
                    </button>
                    <button
                      type="button"
                      onClick={() => setUiTheme('dark')}
                      className={['rounded-lg px-3 py-1.5 text-xs font-semibold transition-all', uiTheme === 'dark' ? 'bg-cyan-500 text-slate-900 shadow' : isDarkTheme ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700'].join(' ')}
                    >
                      Escuro
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          ) : null}

          {activeView === 'integrations' && role !== 'DEV' && role !== 'ADMIN' ? (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
              className="mx-auto w-full max-w-2xl"
            >
              <div className={[
                'rounded-3xl border p-8 text-center shadow-xl',
                isDarkTheme ? 'border-red-500/20 bg-red-950/10' : 'border-red-200 bg-red-50'
              ].join(' ')}>
                <div className="flex justify-center mb-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-500/20">
                    <Lock className="h-7 w-7 text-red-400" />
                  </div>
                </div>
                <h2 className={['text-xl font-bold', isDarkTheme ? 'text-red-300' : 'text-red-700'].join(' ')}>
                  Acesso Restrito
                </h2>
                <p className={['mt-2 text-sm', isDarkTheme ? 'text-slate-400' : 'text-slate-600'].join(' ')}>
                  A secao de Integracoes API esta disponivel apenas para usuarios com role de Desenvolvedor (DEV).
                </p>
              </div>
            </motion.div>
          ) : null}

          {activeView === 'chat' ? (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
              className="mx-auto w-full max-w-5xl"
            >
              {/* Header */}
              <div className="mb-5">
                <h1 className={['text-2xl font-bold', isDarkTheme ? 'text-white' : 'text-slate-900'].join(' ')}>Chat / Suporte</h1>
                <p className={['mt-1 text-sm', isDarkTheme ? 'text-slate-400' : 'text-slate-500'].join(' ')}>
                  {role === 'ADMIN' ? 'Gerencie as solicitacoes de suporte dos clientes' : 'Envie mensagens e acompanhe seu suporte'}
                </p>
              </div>

              {/* Admin: select empresa */}
              {role === 'ADMIN' ? (
                <div className="mb-5 flex gap-3">
                  <select
                    className={['rounded-xl border px-3 py-2 text-sm outline-none transition-all focus:ring-2', isDarkTheme ? 'border-white/10 bg-white/5 text-slate-100 focus:border-blue-500 focus:ring-blue-500/30' : 'border-slate-200 bg-white text-slate-800 focus:border-blue-400'].join(' ')}
                    value={settingsCompanyId}
                    onChange={(event) => setSettingsCompanyId(event.target.value)}
                  >
                    <option value="">Todas as empresas</option>
                    {companyOptions.map((option) => (
                      <option key={option.id} value={option.id}>{option.name}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={fetchSupportRequests}
                    disabled={supportLoading}
                    className={['rounded-xl border px-4 py-2 text-sm font-semibold transition-all disabled:opacity-70', isDarkTheme ? 'border-white/10 bg-white/5 text-slate-200 hover:bg-white/10' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'].join(' ')}
                  >
                    {supportLoading ? 'Atualizando...' : 'Atualizar'}
                  </button>
                </div>
              ) : null}

              <div className={['grid gap-5', selectedSupportRequestId ? 'lg:grid-cols-[360px_1fr]' : ''].join(' ')}>
                {/* Painel esquerdo: lista de chamados + novo chamado */}
                <div className="space-y-4">
                  {/* Novo chamado (apenas CLIENT) */}
                  {role !== 'ADMIN' ? (
                    <div className={['rounded-2xl border p-5', isDarkTheme ? 'border-white/10 bg-white/5 backdrop-blur-md' : 'border-slate-200 bg-white'].join(' ')}>
                      <h3 className={['text-sm font-semibold mb-3', isDarkTheme ? 'text-white' : 'text-slate-800'].join(' ')}>Abrir novo chamado</h3>
                      <div className="space-y-3">
                        <input
                          className={['w-full rounded-xl border px-3 py-2 text-sm outline-none transition-all focus:ring-2', isDarkTheme ? 'border-white/10 bg-white/5 text-slate-100 placeholder-slate-500 focus:border-blue-500 focus:ring-blue-500/30' : 'border-slate-200 bg-slate-50 text-slate-800 focus:border-blue-400'].join(' ')}
                          placeholder="Assunto (ex: alteracao de plano)"
                          value={supportSubject}
                          onChange={(event) => setSupportSubject(event.target.value)}
                        />
                        <textarea
                          className={['w-full min-h-[80px] rounded-xl border px-3 py-2 text-sm outline-none transition-all focus:ring-2 resize-none', isDarkTheme ? 'border-white/10 bg-white/5 text-slate-100 placeholder-slate-500 focus:border-blue-500 focus:ring-blue-500/30' : 'border-slate-200 bg-slate-50 text-slate-800 focus:border-blue-400'].join(' ')}
                          placeholder="Descreva o que precisa de suporte..."
                          value={supportMessage}
                          onChange={(event) => setSupportMessage(event.target.value)}
                        />
                        <button
                          type="button"
                          onClick={createSupportRequest}
                          disabled={supportLoading}
                          className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 py-2 text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-60"
                        >
                          {supportLoading ? 'Enviando...' : 'Enviar chamado'}
                        </button>
                      </div>
                    </div>
                  ) : null}

                  {/* Lista de chamados */}
                  <div className={['rounded-2xl border', isDarkTheme ? 'border-white/10 bg-white/5 backdrop-blur-md' : 'border-slate-200 bg-white'].join(' ')}>
                    <div className="flex items-center justify-between px-5 pt-5 pb-3">
                      <h3 className={['text-sm font-semibold', isDarkTheme ? 'text-white' : 'text-slate-800'].join(' ')}>
                        {role === 'ADMIN' ? 'Chamados dos clientes' : 'Meus chamados'}
                      </h3>
                      <span className={['rounded-full px-2 py-0.5 text-xs font-bold', isDarkTheme ? 'bg-white/10 text-slate-300' : 'bg-slate-100 text-slate-600'].join(' ')}>
                        {supportRequests.length}
                      </span>
                    </div>
                    <div className="divide-y divide-white/5 pb-2">
                      {supportRequests.length ? (
                        supportRequests.map((request) => {
                          const isSelected = selectedSupportRequestId === request.id;
                          const isDone = request.status === 'DONE';

                          return (
                            <button
                              key={request.id}
                              type="button"
                              onClick={() => {
                                if (isSelected) {
                                  setSelectedSupportRequestId(null);
                                  setSupportChatMessages([]);
                                  setSupportTypingText('');
                                  setSupportChatText('');
                                  return;
                                }
                                setSelectedSupportRequestId(request.id);
                                setSupportChatMessages([]);
                                void fetchSupportChatMessages(request.id);
                              }}
                              className={['w-full px-5 py-3 text-left transition-all', isSelected ? isDarkTheme ? 'bg-blue-500/15' : 'bg-blue-50' : isDarkTheme ? 'hover:bg-white/5' : 'hover:bg-slate-50'].join(' ')}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <p className={['text-sm font-medium truncate', isDarkTheme ? 'text-white' : 'text-slate-900'].join(' ')}>{request.subject || 'Chamado sem assunto'}</p>
                                <span className={['flex-shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold', isDone ? 'bg-emerald-500/15 text-emerald-300' : request.status === 'IN_REVIEW' ? 'bg-amber-500/15 text-amber-300' : 'bg-slate-500/30 text-slate-300'].join(' ')}>
                                  {isDone ? 'Concluido' : request.status === 'IN_REVIEW' ? 'Em analise' : 'Pendente'}
                                </span>
                              </div>
                              <p className={['mt-0.5 text-xs truncate', isDarkTheme ? 'text-slate-400' : 'text-slate-500'].join(' ')}>
                                {role === 'ADMIN'
                                  ? (request.requesterName || request.requesterEmail || 'Cliente')
                                  : String(request.createdAt || '').slice(0, 10)}
                              </p>
                            </button>
                          );
                        })
                      ) : (
                        <p className={['px-5 py-6 text-center text-sm', isDarkTheme ? 'text-slate-400' : 'text-slate-500'].join(' ')}>
                          {supportLoading ? 'Carregando...' : 'Nenhum chamado no momento.'}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Painel direito: chat */}
                {selectedSupportRequestId ? (() => {
                  const selectedRequest = supportRequests.find((r) => r.id === selectedSupportRequestId);

                  return (
                    <div className={['flex flex-col rounded-2xl border overflow-hidden', isDarkTheme ? 'border-white/10 bg-white/5 backdrop-blur-md' : 'border-slate-200 bg-white'].join(' ')} style={{ maxHeight: '640px' }}>
                      {/* Chat header */}
                      <div className={['flex items-center justify-between px-5 py-4 border-b', isDarkTheme ? 'border-white/10' : 'border-slate-100'].join(' ')}>
                        <div>
                          <p className={['text-sm font-semibold', isDarkTheme ? 'text-white' : 'text-slate-900'].join(' ')}>{selectedRequest?.subject || 'Chamado'}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className={['inline-flex h-2 w-2 rounded-full', supportAdminOnline ? 'bg-emerald-400' : 'bg-slate-500'].join(' ')} />
                            <span className={['text-xs', isDarkTheme ? 'text-slate-400' : 'text-slate-500'].join(' ')}>
                              {supportAdminOnline ? 'Suporte online' : 'Suporte offline'} · {supportChatConnected ? 'conectado' : 'desconectado'}
                            </span>
                          </div>
                        </div>
                        {role === 'ADMIN' && selectedRequest ? (
                          <div className="flex items-center gap-2">
                            <select
                              className={['rounded-xl border px-2 py-1 text-xs outline-none transition-all', isDarkTheme ? 'border-white/10 bg-white/5 text-slate-100' : 'border-slate-200 bg-slate-50 text-slate-800'].join(' ')}
                              value={supportDrafts[selectedRequest.id]?.status || selectedRequest.status}
                              onChange={(event) =>
                                setSupportDrafts((current) => ({
                                  ...current,
                                  [selectedRequest.id]: {
                                    ...(current[selectedRequest.id] || { status: selectedRequest.status, adminResponse: selectedRequest.adminResponse || '' }),
                                    status: event.target.value as SupportRequestStatus
                                  }
                                }))
                              }
                            >
                              <option value="PENDING">Pendente</option>
                              <option value="IN_REVIEW">Em analise</option>
                              <option value="DONE">Concluido</option>
                            </select>
                            <button
                              type="button"
                              onClick={() => void saveSupportRequestByAdmin(selectedRequest.id, selectedRequest.companyId)}
                              disabled={supportLoading}
                              className="rounded-xl bg-blue-600 px-3 py-1 text-xs font-semibold text-white transition-all hover:bg-blue-700 disabled:opacity-70"
                            >
                              Salvar
                            </button>
                          </div>
                        ) : null}
                      </div>

                      {/* Mensagens */}
                      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
                        <AnimatePresence>
                          {supportChatMessages.length ? (
                            supportChatMessages.map((message) => {
                              const isMine = message.senderId === currentUserId;

                              return (
                                <motion.div
                                  key={message.id}
                                  initial={{ opacity: 0, y: 8, scale: 0.97 }}
                                  animate={{ opacity: 1, y: 0, scale: 1 }}
                                  transition={{ duration: 0.22, ease: 'easeOut' }}
                                  className={['flex', isMine ? 'justify-end' : 'justify-start'].join(' ')}
                                >
                                  <div className={['max-w-[78%] rounded-2xl px-4 py-2.5 shadow-sm', isMine ? 'rounded-br-md bg-blue-600 text-white' : isDarkTheme ? 'rounded-bl-md bg-slate-700/70 text-slate-100' : 'rounded-bl-md bg-slate-100 text-slate-800'].join(' ')}>
                                    <p className={['text-[11px] font-semibold mb-0.5 opacity-80', isMine ? 'text-blue-100' : isDarkTheme ? 'text-slate-400' : 'text-slate-500'].join(' ')}>
                                      {message.senderName} · {message.senderRole === 'ADMIN' ? 'Suporte' : 'Cliente'}
                                    </p>
                                    <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
                                    <p className={['mt-1 text-[10px] opacity-60 text-right', isMine ? 'text-blue-200' : ''].join(' ')}>{String(message.createdAt || '').slice(11, 16)}</p>
                                  </div>
                                </motion.div>
                              );
                            })
                          ) : (
                            <div className="flex h-full items-center justify-center">
                              <p className={['text-sm', isDarkTheme ? 'text-slate-500' : 'text-slate-400'].join(' ')}>Nenhuma mensagem ainda. Inicie a conversa!</p>
                            </div>
                          )}
                        </AnimatePresence>
                        {supportTypingText ? (
                          <p className="text-xs text-cyan-400 px-1">{supportTypingText}</p>
                        ) : null}
                      </div>

                      {/* Input */}
                      <div className={['px-4 py-3 border-t', isDarkTheme ? 'border-white/10' : 'border-slate-100'].join(' ')}>
                        {selectedRequest?.status === 'DONE' ? (
                          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-center text-xs text-emerald-300">
                            Chamado finalizado. Para continuar, abra um novo chamado.
                          </div>
                        ) : (
                          <div className="flex gap-2">
                            <input
                              className={['flex-1 rounded-xl border px-3 py-2 text-sm outline-none transition-all focus:ring-2', isDarkTheme ? 'border-white/10 bg-white/5 text-slate-100 placeholder-slate-500 focus:border-blue-500 focus:ring-blue-500/30' : 'border-slate-200 bg-slate-50 text-slate-800 focus:border-blue-400'].join(' ')}
                              placeholder="Digite sua mensagem..."
                              value={supportChatText}
                              onChange={(event) => {
                                setSupportChatText(event.target.value);
                                emitSupportTyping(event.target.value.trim().length > 0);
                              }}
                              onBlur={() => emitSupportTyping(false)}
                              onKeyDown={(event) => {
                                if (event.key === 'Enter' && !event.shiftKey) {
                                  event.preventDefault();
                                  void sendSupportChatMessage();
                                  emitSupportTyping(false);
                                }
                              }}
                            />
                            <motion.button
                              type="button"
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => {
                                void sendSupportChatMessage();
                                emitSupportTyping(false);
                              }}
                              className="rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 px-4 py-2 text-sm font-semibold text-white shadow transition-all hover:opacity-90"
                            >
                              Enviar
                            </motion.button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })() : (
                  <div className={['hidden lg:flex flex-col items-center justify-center rounded-2xl border py-16', isDarkTheme ? 'border-white/10 bg-white/5 border-dashed' : 'border-slate-200 border-dashed bg-slate-50'].join(' ')}>
                    <MessageCircle className={['h-12 w-12 mb-3', isDarkTheme ? 'text-slate-600' : 'text-slate-300'].join(' ')} />
                    <p className={['text-sm font-medium', isDarkTheme ? 'text-slate-500' : 'text-slate-400'].join(' ')}>Selecione um chamado para abrir o chat</p>
                  </div>
                )}
              </div>
            </motion.div>
          ) : null}

          {activeView === 'sales' || activeView === 'pipeline' ? (
            <div className="grid gap-6">
              <div className={[
                'rounded-2xl p-5 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg',
                isDarkTheme
                  ? 'border border-white/10 bg-white/5 shadow-cyan-900/20 backdrop-blur-md'
                  : 'border border-slate-200 bg-white'
              ].join(' ')}>
                <h1 className={['text-2xl font-black', isDarkTheme ? 'text-white' : 'text-slate-800'].join(' ')}>Vendas</h1>
                <p className={['mt-1 text-sm', isDarkTheme ? 'text-slate-300' : 'text-slate-500'].join(' ')}>Sistema completo de vendas com CRM + PDV: seleção de produtos, carrinho, cliente opcional, pagamento e histórico.</p>

                {role === 'ADMIN' ? (
                  <div className="mt-4 max-w-sm">
                    <select
                      className={[
                        'w-full rounded-xl px-3 py-2 text-sm outline-none transition-all focus:border-blue-400',
                        isDarkTheme
                          ? 'border border-white/10 bg-white/5 text-slate-100 focus:ring-2 focus:ring-cyan-500/40'
                          : 'border border-slate-200 bg-slate-50'
                      ].join(' ')}
                      value={salesCompanyId}
                      onChange={(event) => setSalesCompanyId(event.target.value)}
                    >
                      <option className={isDarkTheme ? 'bg-slate-900 text-slate-100' : ''} value="">Selecione a empresa</option>
                      {companyOptions.map((option) => (
                        <option className={isDarkTheme ? 'bg-slate-900 text-slate-100' : ''} key={option.id} value={option.id}>{option.name}</option>
                      ))}
                    </select>
                  </div>
                ) : null}

                <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <article className={['rounded-xl p-3', isDarkTheme ? 'border border-cyan-400/20 bg-white/5' : 'border border-slate-200 bg-slate-50'].join(' ')}>
                    <p className={['text-xs uppercase tracking-wide', isDarkTheme ? 'text-slate-400' : 'text-slate-500'].join(' ')}>Vendas hoje</p>
                    <p className={['mt-1 text-lg font-black', isDarkTheme ? 'text-cyan-200' : 'text-slate-800'].join(' ')}>{formatCurrency(salesTodayTotal)}</p>
                  </article>
                  <article className={['rounded-xl p-3', isDarkTheme ? 'border border-cyan-400/20 bg-white/5' : 'border border-slate-200 bg-slate-50'].join(' ')}>
                    <p className={['text-xs uppercase tracking-wide', isDarkTheme ? 'text-slate-400' : 'text-slate-500'].join(' ')}>Vendas no mês</p>
                    <p className={['mt-1 text-lg font-black', isDarkTheme ? 'text-cyan-200' : 'text-slate-800'].join(' ')}>{formatCurrency(salesMonthlyTotal)}</p>
                  </article>
                  <article className={['rounded-xl p-3', isDarkTheme ? 'border border-cyan-400/20 bg-white/5' : 'border border-slate-200 bg-slate-50'].join(' ')}>
                    <p className={['text-xs uppercase tracking-wide', isDarkTheme ? 'text-slate-400' : 'text-slate-500'].join(' ')}>Ticket médio</p>
                    <p className={['mt-1 text-lg font-black', isDarkTheme ? 'text-cyan-200' : 'text-slate-800'].join(' ')}>{formatCurrency(Number(salesAnalysis?.averageTicket || 0))}</p>
                  </article>
                  <article className={['rounded-xl p-3', isDarkTheme ? 'border border-cyan-400/20 bg-white/5' : 'border border-slate-200 bg-slate-50'].join(' ')}>
                    <p className={['text-xs uppercase tracking-wide', isDarkTheme ? 'text-slate-400' : 'text-slate-500'].join(' ')}>Produto destaque</p>
                    <p className={['mt-1 truncate text-lg font-black', isDarkTheme ? 'text-cyan-200' : 'text-slate-800'].join(' ')}>{bestSellingProductLabel}</p>
                  </article>
                </div>

                <div className="mt-5 grid gap-4 xl:grid-cols-[1.3fr_0.7fr]">
                  <section className={['rounded-2xl p-4', isDarkTheme ? 'border border-white/10 bg-black/20' : 'border border-slate-200 bg-slate-50'].join(' ')}>
                    <div className="mb-3 flex items-center justify-between gap-2">
                      <h3 className={['text-sm font-bold uppercase tracking-wide', isDarkTheme ? 'text-cyan-100' : 'text-slate-700'].join(' ')}>Seleção de produtos</h3>
                      <motion.button
                        type="button"
                        whileHover={{ y: -2 }}
                        whileTap={{ scale: 0.96 }}
                        onClick={addSaleLine}
                        className={isDarkTheme ? 'rounded-xl border border-cyan-400/40 bg-cyan-500/15 px-3 py-1.5 text-xs font-semibold text-cyan-200 hover:bg-cyan-500/25' : 'rounded-xl border border-blue-300 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100'}
                      >
                        + Adicionar item
                      </motion.button>
                    </div>

                    <div className="grid gap-3">
                      {saleLines.map((line) => (
                        <motion.div
                          key={line.id}
                          layout
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.2 }}
                          className="grid gap-2 md:grid-cols-[1fr_190px_auto]"
                        >
                          <ProductCombobox
                            products={products}
                            value={line.productId}
                            onChange={(productId) => updateSaleLine(line.id, { productId })}
                            isDarkTheme={isDarkTheme}
                          />

                          <div className={['flex items-center gap-2 rounded-xl px-2', isDarkTheme ? 'border border-white/10 bg-white/5' : 'border border-slate-200 bg-white'].join(' ')}>
                            <button
                              type="button"
                              onClick={() => stepSaleLineQuantity(line.id, -1)}
                              className={isDarkTheme ? 'rounded-lg px-2 py-1 text-slate-200 hover:bg-white/10' : 'rounded-lg px-2 py-1 text-slate-700 hover:bg-slate-100'}
                            >
                              -
                            </button>
                            <input
                              className={[
                                'w-full bg-transparent px-2 py-2 text-center text-sm outline-none',
                                isDarkTheme ? 'text-slate-100' : 'text-slate-800'
                              ].join(' ')}
                              type="text"
                              inputMode="numeric"
                              pattern="[0-9]*"
                              value={line.quantity}
                              onChange={(event) => updateSaleLineQuantityFromInput(line.id, event.target.value)}
                              onBlur={() => normalizeSaleLineQuantity(line.id, line.quantity)}
                            />
                            <button
                              type="button"
                              onClick={() => stepSaleLineQuantity(line.id, 1)}
                              className={isDarkTheme ? 'rounded-lg px-2 py-1 text-slate-200 hover:bg-white/10' : 'rounded-lg px-2 py-1 text-slate-700 hover:bg-slate-100'}
                            >
                              +
                            </button>
                          </div>

                          <button
                            type="button"
                            onClick={() => removeSaleLine(line.id)}
                            className={[
                              'rounded-xl px-3 py-2 text-sm font-semibold transition-all duration-300 hover:-translate-y-0.5',
                              isDarkTheme
                                ? 'border border-white/15 text-slate-200 hover:bg-white/10'
                                : 'border border-slate-300 text-slate-700 hover:bg-slate-100'
                            ].join(' ')}
                          >
                            Remover
                          </button>
                        </motion.div>
                      ))}
                    </div>
                  </section>

                  <section className={['rounded-2xl p-4', isDarkTheme ? 'border border-cyan-400/25 bg-gradient-to-b from-slate-900/80 to-slate-950/80' : 'border border-slate-200 bg-slate-50'].join(' ')}>
                    <h3 className={['text-sm font-bold uppercase tracking-wide', isDarkTheme ? 'text-cyan-100' : 'text-slate-700'].join(' ')}>Carrinho</h3>

                    <div className="mt-3 space-y-2">
                      <AnimatePresence initial={false}>
                        {salesCartItems.map((item) => (
                          <motion.article
                            key={item.lineId}
                            layout
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            className={['rounded-xl border px-3 py-2 text-sm', isDarkTheme ? 'border-white/10 bg-black/20 text-slate-100' : 'border-slate-200 bg-white text-slate-700'].join(' ')}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <p className="truncate font-semibold">{item.product?.name}</p>
                              <p className={isDarkTheme ? 'text-cyan-200' : 'text-cyan-700'}>{formatCurrency(item.lineTotal)}</p>
                            </div>
                            <p className={['mt-1 text-xs', isDarkTheme ? 'text-slate-400' : 'text-slate-500'].join(' ')}>
                              Qtd: {item.quantity} • Unitário: {formatCurrency(item.price)}
                            </p>
                          </motion.article>
                        ))}
                      </AnimatePresence>

                      {!salesCartItems.length ? (
                        <p className={['rounded-xl border border-dashed px-3 py-4 text-center text-xs', isDarkTheme ? 'border-white/10 text-slate-400' : 'border-slate-300 text-slate-500'].join(' ')}>
                          Nenhum item adicionado ao carrinho.
                        </p>
                      ) : null}
                    </div>

                    <div className={['mt-3 rounded-xl p-3', isDarkTheme ? 'border border-cyan-400/20 bg-cyan-500/10' : 'border border-cyan-200 bg-cyan-50'].join(' ')}>
                      <p className={['text-xs uppercase tracking-wide', isDarkTheme ? 'text-cyan-200/80' : 'text-cyan-700'].join(' ')}>Total em tempo real</p>
                      <p className={['mt-1 text-2xl font-black', isDarkTheme ? 'text-cyan-100' : 'text-cyan-800'].join(' ')}>{formatCurrency(salesCartTotal)}</p>
                    </div>

                    <div className="mt-3 grid gap-2">
                      <select
                        value={saleCustomerId}
                        onChange={(event) => setSaleCustomerId(event.target.value)}
                        className={[
                          'rounded-xl px-3 py-2 text-sm outline-none',
                          isDarkTheme
                            ? 'border border-white/10 bg-white/5 text-slate-100'
                            : 'border border-slate-200 bg-white text-slate-700'
                        ].join(' ')}
                      >
                        <option value="quick-sale">Venda rápida (sem cliente)</option>
                        {salesCustomerOptions.map((customer) => (
                          <option key={customer.id} value={customer.id}>{customer.name}</option>
                        ))}
                      </select>

                      <div className="grid grid-cols-3 gap-2">
                        {([
                          { key: 'cash' as const, label: 'Dinheiro' },
                          { key: 'pix' as const, label: 'Pix' },
                          { key: 'card' as const, label: 'Cartão' }
                        ]).map((method) => (
                          <button
                            key={method.key}
                            type="button"
                            onClick={() => setSalePaymentMethod(method.key)}
                            className={[
                              'rounded-xl border px-2 py-2 text-xs font-semibold transition-all',
                              salePaymentMethod === method.key
                                ? isDarkTheme
                                  ? 'border-cyan-400/50 bg-cyan-500/15 text-cyan-200'
                                  : 'border-blue-300 bg-blue-50 text-blue-700'
                                : isDarkTheme
                                  ? 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
                                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                            ].join(' ')}
                          >
                            {method.label}
                          </button>
                        ))}
                      </div>

                      {salePaymentMethod === 'cash' ? (
                        <div className={['rounded-xl border px-3 py-3', isDarkTheme ? 'border-white/10 bg-black/20' : 'border-slate-200 bg-white'].join(' ')}>
                          <label className={['text-xs font-semibold uppercase tracking-wide', isDarkTheme ? 'text-slate-300' : 'text-slate-600'].join(' ')} htmlFor="sale-amount-received">
                            Valor recebido
                          </label>
                          <input
                            id="sale-amount-received"
                            value={saleAmountReceivedInput}
                            onChange={(event) => setSaleAmountReceivedInput(normalizeMoneyInput(event.target.value))}
                            inputMode="decimal"
                            placeholder="0.00"
                            className={[
                              'mt-2 w-full rounded-xl px-3 py-2 text-sm outline-none',
                              isDarkTheme
                                ? 'border border-white/10 bg-white/5 text-slate-100 placeholder-slate-500'
                                : 'border border-slate-200 bg-white text-slate-700 placeholder-slate-400'
                            ].join(' ')}
                          />
                          <div className="mt-2 grid gap-1 text-xs">
                            <p className={isDarkTheme ? 'text-cyan-200/90' : 'text-cyan-700'}>
                              Troco: {formatCurrency(saleChangeDue)}
                            </p>
                            {saleMissingAmount > 0 ? (
                              <p className={isDarkTheme ? 'text-rose-300' : 'text-rose-600'}>
                                Falta: {formatCurrency(saleMissingAmount)}
                              </p>
                            ) : null}
                          </div>
                        </div>
                      ) : null}

                      <button
                        type="button"
                        onClick={checkoutSale}
                        disabled={salesLoading || !salesCartItems.length}
                        className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition-all duration-300 hover:-translate-y-0.5 hover:bg-slate-800 disabled:opacity-70"
                      >
                        {salesLoading ? 'Finalizando...' : 'Finalizar venda'}
                      </button>
                    </div>
                  </section>
                </div>

                <section className={['mt-5 rounded-2xl p-4', isDarkTheme ? 'border border-white/10 bg-black/20' : 'border border-slate-200 bg-slate-50'].join(' ')}>
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <h3 className={['text-sm font-bold uppercase tracking-wide', isDarkTheme ? 'text-cyan-100' : 'text-slate-700'].join(' ')}>Histórico de vendas</h3>
                    <div className="flex flex-wrap gap-2">
                      <input
                        value={saleHistorySearch}
                        onChange={(event) => setSaleHistorySearch(event.target.value)}
                        placeholder="Buscar cliente, ID, pagamento ou valor"
                        className={[
                          'rounded-xl px-3 py-2 text-sm outline-none',
                          isDarkTheme
                            ? 'border border-white/10 bg-white/5 text-slate-100 placeholder-slate-500'
                            : 'border border-slate-200 bg-white text-slate-700 placeholder-slate-400'
                        ].join(' ')}
                      />
                      <select
                        value={saleHistoryStatusFilter}
                        onChange={(event) => setSaleHistoryStatusFilter(event.target.value as 'ALL' | 'CONCLUIDA')}
                        className={[
                          'rounded-xl px-3 py-2 text-sm outline-none',
                          isDarkTheme
                            ? 'border border-white/10 bg-white/5 text-slate-100'
                            : 'border border-slate-200 bg-white text-slate-700'
                        ].join(' ')}
                      >
                        <option value="ALL">Todos os status</option>
                        <option value="CONCLUIDA">Concluída</option>
                      </select>
                      <select
                        value={saleHistoryPaymentFilter}
                        onChange={(event) => setSaleHistoryPaymentFilter(event.target.value as 'ALL' | 'cash' | 'pix' | 'card')}
                        className={[
                          'rounded-xl px-3 py-2 text-sm outline-none',
                          isDarkTheme
                            ? 'border border-white/10 bg-white/5 text-slate-100'
                            : 'border border-slate-200 bg-white text-slate-700'
                        ].join(' ')}
                      >
                        <option value="ALL">Todos os pagamentos</option>
                        <option value="cash">Dinheiro</option>
                        <option value="pix">Pix</option>
                        <option value="card">Cartão</option>
                      </select>
                      <button
                        type="button"
                        onClick={() => void fetchSalesAnalysis()}
                        disabled={salesLoading}
                        className={isDarkTheme ? 'rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-white/10 disabled:opacity-60' : 'rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60'}
                      >
                        Atualizar
                      </button>
                      <button
                        type="button"
                        onClick={exportSalesHistoryCsv}
                        className={isDarkTheme ? 'inline-flex items-center gap-1 rounded-xl border border-cyan-400/30 bg-cyan-500/10 px-3 py-2 text-xs font-semibold text-cyan-200 hover:bg-cyan-500/20' : 'inline-flex items-center gap-1 rounded-xl border border-cyan-200 bg-cyan-50 px-3 py-2 text-xs font-semibold text-cyan-700 hover:bg-cyan-100'}
                      >
                        <Download className="h-3.5 w-3.5" />
                        Exportar historico
                      </button>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[620px] text-sm">
                      <thead>
                        <tr className={isDarkTheme ? 'text-slate-300' : 'text-slate-600'}>
                          <th className="px-3 py-2 text-left">Cliente</th>
                          <th className="px-3 py-2 text-left">Valor total</th>
                          <th className="px-3 py-2 text-left">Pagamento</th>
                          <th className="px-3 py-2 text-left">Data</th>
                          <th className="px-3 py-2 text-left">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredSalesHistoryRows.map((sale) => (
                          <tr key={sale.id} className={isDarkTheme ? 'border-t border-white/10' : 'border-t border-slate-200'}>
                            <td className="px-3 py-3">{sale.customer}</td>
                            <td className="px-3 py-3 font-semibold">{formatCurrency(sale.total)}</td>
                            <td className="px-3 py-3">
                              <div className="flex flex-col gap-0.5">
                                <span>{sale.paymentMethod}</span>
                                {sale.amountReceived > 0 ? (
                                  <span className={['text-xs', isDarkTheme ? 'text-slate-400' : 'text-slate-500'].join(' ')}>
                                    Recebido: {formatCurrency(sale.amountReceived)}
                                  </span>
                                ) : null}
                                {sale.changeDue > 0 ? (
                                  <span className={['text-xs font-semibold', isDarkTheme ? 'text-cyan-300' : 'text-cyan-700'].join(' ')}>
                                    Troco: {formatCurrency(sale.changeDue)}
                                  </span>
                                ) : null}
                              </div>
                            </td>
                            <td className="px-3 py-3">{formatDateTime(sale.createdAt)}</td>
                            <td className="px-3 py-3">
                              <span className="rounded-full bg-emerald-500/15 px-2 py-1 text-xs font-semibold text-emerald-300">{sale.status}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    {!filteredSalesHistoryRows.length ? (
                      <p className={['px-3 py-5 text-center text-sm', isDarkTheme ? 'text-slate-500' : 'text-slate-500'].join(' ')}>
                        Nenhuma venda encontrada com os filtros atuais.
                      </p>
                    ) : null}
                  </div>
                </section>
              </div>

              <div className={[
                'rounded-2xl p-5 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg',
                isDarkTheme
                  ? 'border border-cyan-400/20 bg-gradient-to-br from-slate-950 via-slate-900 to-[#0a122b] shadow-[0_0_40px_rgba(34,211,238,0.08)]'
                  : 'border border-slate-200 bg-white'
              ].join(' ')}>
                <h2 className={['text-lg font-bold', isDarkTheme ? 'text-cyan-200' : 'text-slate-800'].join(' ')}>Analise de vendas e estoque</h2>
                <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                  <div className={['rounded-xl p-3 transition-all', isDarkTheme ? 'border border-cyan-400/20 bg-white/5 hover:bg-white/10' : 'border border-slate-200 bg-slate-50'].join(' ')}>
                    <p className={['text-xs', isDarkTheme ? 'text-slate-400' : 'text-slate-500'].join(' ')}>Faturamento</p>
                    <p className={['mt-1 text-lg font-bold', isDarkTheme ? 'text-cyan-200' : 'text-slate-800'].join(' ')}>{formatCurrency(Number(salesAnalysis?.totalRevenue || 0))}</p>
                  </div>
                  <div className={['rounded-xl p-3 transition-all', isDarkTheme ? 'border border-cyan-400/20 bg-white/5 hover:bg-white/10' : 'border border-slate-200 bg-slate-50'].join(' ')}>
                    <p className={['text-xs', isDarkTheme ? 'text-slate-400' : 'text-slate-500'].join(' ')}>Total de vendas</p>
                    <p className={['mt-1 text-lg font-bold', isDarkTheme ? 'text-cyan-200' : 'text-slate-800'].join(' ')}>{Number(salesAnalysis?.totalSales || 0)}</p>
                  </div>
                  <div className={['rounded-xl p-3 transition-all', isDarkTheme ? 'border border-cyan-400/20 bg-white/5 hover:bg-white/10' : 'border border-slate-200 bg-slate-50'].join(' ')}>
                    <p className={['text-xs', isDarkTheme ? 'text-slate-400' : 'text-slate-500'].join(' ')}>Ticket medio</p>
                    <p className={['mt-1 text-lg font-bold', isDarkTheme ? 'text-cyan-200' : 'text-slate-800'].join(' ')}>{formatCurrency(Number(salesAnalysis?.averageTicket || 0))}</p>
                  </div>
                  <div className={['rounded-xl p-3 transition-all', isDarkTheme ? 'border border-cyan-400/20 bg-white/5 hover:bg-white/10' : 'border border-slate-200 bg-slate-50'].join(' ')}>
                    <p className={['text-xs', isDarkTheme ? 'text-slate-400' : 'text-slate-500'].join(' ')}>Unidades em estoque</p>
                    <p className={['mt-1 text-lg font-bold', isDarkTheme ? 'text-cyan-200' : 'text-slate-800'].join(' ')}>{Number(salesAnalysis?.totalStockUnits || 0)}</p>
                  </div>
                  <div className={['rounded-xl p-3 transition-all', isDarkTheme ? 'border border-cyan-400/20 bg-white/5 hover:bg-white/10' : 'border border-slate-200 bg-slate-50'].join(' ')}>
                    <p className={['text-xs', isDarkTheme ? 'text-slate-400' : 'text-slate-500'].join(' ')}>Produtos cadastrados</p>
                    <p className={['mt-1 text-lg font-bold', isDarkTheme ? 'text-cyan-200' : 'text-slate-800'].join(' ')}>{Number(salesAnalysis?.productsCount || 0)}</p>
                  </div>
                </div>

                <div className={['mt-4 rounded-xl p-4 transition-all', isDarkTheme ? 'border border-cyan-400/20 bg-white/5' : 'border border-slate-200 bg-slate-50'].join(' ')}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className={['text-sm font-bold', isDarkTheme ? 'text-cyan-100' : 'text-slate-700'].join(' ')}>Fechamento diário por pagamento</h3>
                    <button
                      type="button"
                      onClick={exportDailyClosingCsv}
                      className={isDarkTheme ? 'inline-flex items-center gap-1 rounded-xl border border-cyan-400/30 bg-cyan-500/10 px-3 py-1.5 text-xs font-semibold text-cyan-200 hover:bg-cyan-500/20' : 'inline-flex items-center gap-1 rounded-xl border border-cyan-200 bg-cyan-50 px-3 py-1.5 text-xs font-semibold text-cyan-700 hover:bg-cyan-100'}
                    >
                      <Download className="h-3.5 w-3.5" />
                      Exportar fechamento
                    </button>
                  </div>
                  <div className="mt-3 grid gap-2 md:grid-cols-3">
                    {salesTodayByPayment.map((entry) => (
                      <div
                        key={entry.method}
                        className={[
                          'rounded-lg border px-3 py-2 text-sm',
                          isDarkTheme
                            ? 'border-white/10 bg-slate-900/70 text-slate-100'
                            : 'border-slate-200 bg-white text-slate-700'
                        ].join(' ')}
                      >
                        <p className={['text-xs uppercase tracking-wide', isDarkTheme ? 'text-slate-400' : 'text-slate-500'].join(' ')}>{entry.label}</p>
                        <p className="mt-1 font-semibold">{entry.salesCount} venda(s)</p>
                        <p className={['mt-1 text-xs', isDarkTheme ? 'text-slate-400' : 'text-slate-500'].join(' ')}>
                          Total: {formatCurrency(entry.total)}
                        </p>
                        <p className={['text-xs', isDarkTheme ? 'text-slate-400' : 'text-slate-500'].join(' ')}>
                          Recebido: {formatCurrency(entry.amountReceived)}
                        </p>
                        {entry.changeGiven > 0 ? (
                          <p className={['text-xs font-semibold', isDarkTheme ? 'text-cyan-300' : 'text-cyan-700'].join(' ')}>
                            Troco: {formatCurrency(entry.changeGiven)}
                          </p>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </div>

                <div className={['mt-4 rounded-xl p-4 transition-all', isDarkTheme ? 'border border-cyan-400/20 bg-white/5' : 'border border-slate-200 bg-slate-50'].join(' ')}>
                  <h3 className={['text-sm font-bold', isDarkTheme ? 'text-cyan-100' : 'text-slate-700'].join(' ')}>Estoque baixo (ate 5)</h3>
                  <div className="mt-3 grid gap-2">
                    {(salesAnalysis?.lowStockProducts || []).length ? (
                      salesAnalysis?.lowStockProducts.map((product) => (
                        <div key={product.id} className={['flex flex-wrap items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm transition-all', isDarkTheme ? 'bg-slate-900/70 border border-white/10' : 'bg-white'].join(' ')}>
                          <span className={['font-semibold', isDarkTheme ? 'text-slate-100' : 'text-slate-700'].join(' ')}>{product.name}</span>
                          <span className={isDarkTheme ? 'text-slate-400' : 'text-slate-500'}>Codigo: {product.code}</span>
                          <span className="text-rose-600 font-semibold">Qtd: {product.quantity}</span>
                          <span className={isDarkTheme ? 'text-slate-100' : 'text-slate-700'}>{formatCurrency(product.price)}</span>
                        </div>
                      ))
                    ) : (
                      <p className={['text-sm', isDarkTheme ? 'text-slate-400' : 'text-slate-500'].join(' ')}>Nenhum produto com estoque baixo.</p>
                    )}
                  </div>
                </div>

                <div className="mt-4 grid gap-4 xl:grid-cols-2">
                  <div className={['rounded-xl p-4 transition-all', isDarkTheme ? 'border border-cyan-400/20 bg-white/5' : 'border border-slate-200 bg-slate-50'].join(' ')}>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className={['text-sm font-bold', isDarkTheme ? 'text-cyan-100' : 'text-slate-700'].join(' ')}>Top produtos (interativo)</h3>
                      <div className="inline-flex rounded-lg border border-white/10 p-1">
                        <button
                          type="button"
                          onClick={() => setSalesChartMetric('quantity')}
                          className={[
                            'rounded-md px-2 py-1 text-xs font-semibold transition-all',
                            salesChartMetric === 'quantity'
                              ? 'bg-cyan-500 text-slate-950'
                              : isDarkTheme
                                ? 'text-slate-300 hover:bg-white/10'
                                : 'text-slate-600 hover:bg-slate-200'
                          ].join(' ')}
                        >
                          Quantidade
                        </button>
                        <button
                          type="button"
                          onClick={() => setSalesChartMetric('price')}
                          className={[
                            'rounded-md px-2 py-1 text-xs font-semibold transition-all',
                            salesChartMetric === 'price'
                              ? 'bg-cyan-500 text-slate-950'
                              : isDarkTheme
                                ? 'text-slate-300 hover:bg-white/10'
                                : 'text-slate-600 hover:bg-slate-200'
                          ].join(' ')}
                        >
                          Preco
                        </button>
                      </div>
                    </div>

                    <div className="mt-3 grid gap-2">
                      {lowStockChartData.length ? (
                        lowStockChartData.map((item) => {
                          const percent = Math.max(6, Math.round((item.value / lowStockChartMaxValue) * 100));
                          const isSelected = selectedLowStockProduct?.id === item.id;

                          return (
                            <button
                              key={item.id}
                              type="button"
                              title={`${item.name} • ${salesChartMetric === 'quantity' ? `${item.quantity} und` : formatCurrency(item.price)}`}
                              onMouseEnter={() => setSelectedLowStockProductId(item.id)}
                              onFocus={() => setSelectedLowStockProductId(item.id)}
                              onClick={() => setSelectedLowStockProductId(item.id)}
                              className={[
                                'group rounded-lg border p-2 text-left transition-all',
                                isSelected
                                  ? isDarkTheme
                                    ? 'border-cyan-400/60 bg-cyan-500/10'
                                    : 'border-cyan-400 bg-cyan-50'
                                  : isDarkTheme
                                    ? 'border-white/10 bg-black/10 hover:border-cyan-400/40'
                                    : 'border-slate-200 bg-white hover:border-cyan-300'
                              ].join(' ')}
                            >
                              <div className="mb-1 flex items-center justify-between gap-3 text-xs">
                                <span className={['truncate font-semibold', isDarkTheme ? 'text-slate-100' : 'text-slate-700'].join(' ')}>{item.name}</span>
                                <span className={isDarkTheme ? 'text-cyan-200' : 'text-cyan-700'}>
                                  {salesChartMetric === 'quantity' ? `${item.quantity} und` : formatCurrency(item.price)}
                                </span>
                              </div>
                              <div className={['h-2 overflow-hidden rounded-full', isDarkTheme ? 'bg-slate-800' : 'bg-slate-200'].join(' ')}>
                                <div
                                  className={[
                                    'h-full rounded-full transition-all duration-500',
                                    isSelected ? 'bg-gradient-to-r from-cyan-400 to-blue-500' : 'bg-gradient-to-r from-indigo-500 to-cyan-500'
                                  ].join(' ')}
                                  style={{ width: `${percent}%` }}
                                />
                              </div>
                            </button>
                          );
                        })
                      ) : (
                        <p className={['text-sm', isDarkTheme ? 'text-slate-400' : 'text-slate-500'].join(' ')}>
                          Sem dados suficientes para montar o grafico de produtos.
                        </p>
                      )}
                    </div>

                    {selectedLowStockProduct ? (
                      <div className={['mt-3 rounded-lg p-3 text-xs', isDarkTheme ? 'border border-cyan-400/20 bg-slate-900/60 text-slate-200' : 'border border-slate-200 bg-white text-slate-600'].join(' ')}>
                        <p><strong>Produto:</strong> {selectedLowStockProduct.name}</p>
                        <p><strong>Codigo:</strong> {selectedLowStockProduct.code}</p>
                        <p><strong>Quantidade:</strong> {selectedLowStockProduct.quantity} und</p>
                        <p><strong>Preco:</strong> {formatCurrency(selectedLowStockProduct.price)}</p>
                      </div>
                    ) : null}
                  </div>

                  <div className={['rounded-xl p-4 transition-all', isDarkTheme ? 'border border-cyan-400/20 bg-white/5' : 'border border-slate-200 bg-slate-50'].join(' ')}>
                    <h3 className={['text-sm font-bold', isDarkTheme ? 'text-cyan-100' : 'text-slate-700'].join(' ')}>Comparativo dos indicadores</h3>
                    <p className={['mt-1 text-xs', isDarkTheme ? 'text-slate-400' : 'text-slate-500'].join(' ')}>
                      Passe o mouse para comparar os principais numeros do cliente.
                    </p>

                    <div className="mt-3 grid gap-2">
                      {salesKpiChartData.map((kpi) => {
                        const percent = Math.max(5, Math.round((kpi.value / salesKpiChartMaxValue) * 100));

                        return (
                          <div key={kpi.id} className={['rounded-lg border px-3 py-2 transition-all', isDarkTheme ? 'border-white/10 bg-black/10 hover:border-cyan-400/40' : 'border-slate-200 bg-white hover:border-cyan-300'].join(' ')}>
                            <div className="mb-1 flex items-center justify-between gap-3 text-xs">
                              <span className={isDarkTheme ? 'text-slate-300' : 'text-slate-500'}>{kpi.label}</span>
                              <span className={['font-semibold', isDarkTheme ? 'text-cyan-200' : 'text-cyan-700'].join(' ')}>{kpi.displayValue}</span>
                            </div>
                            <div className={['h-2 overflow-hidden rounded-full', isDarkTheme ? 'bg-slate-800' : 'bg-slate-200'].join(' ')}>
                              <div
                                title={`${kpi.label}: ${kpi.displayValue}`}
                                className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-cyan-500 transition-all duration-500"
                                style={{ width: `${percent}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="mt-4 grid gap-4 xl:grid-cols-[1.35fr_1fr]">
                  {/* ── Recharts AreaChart (substitui SVG) ── */}
                  <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.45, delay: 0.1 }}
                    className={['rounded-xl p-4', isDarkTheme ? 'border border-cyan-300/30 bg-gradient-to-b from-slate-900/85 to-slate-950/85 shadow-[0_0_35px_rgba(34,211,238,0.18)] neon-cyan' : 'border border-slate-200 bg-slate-50'].join(' ')}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className={['text-sm font-bold', isDarkTheme ? 'text-cyan-100' : 'text-slate-700'].join(' ')}>Tendência dos indicadores</h3>
                      <div className="inline-flex rounded-lg border border-white/15 p-1">
                        {(['7d', '30d', '90d'] as const).map((period) => (
                          <motion.button
                            key={period}
                            type="button"
                            whileTap={{ scale: 0.93 }}
                            onClick={() => { setSalesTrendPeriod(period); setSelectedTrendPointIndex(null); }}
                            className={[
                              'rounded-md px-2 py-1 text-xs font-semibold uppercase transition-all',
                              salesTrendPeriod === period
                                ? 'bg-cyan-400 text-slate-950 shadow-[0_0_18px_rgba(34,211,238,0.45)]'
                                : isDarkTheme
                                  ? 'text-slate-300 hover:bg-white/10'
                                  : 'text-slate-600 hover:bg-slate-200'
                            ].join(' ')}
                          >
                            {period}
                          </motion.button>
                        ))}
                      </div>
                    </div>
                    <p className={['mt-1 text-xs', isDarkTheme ? 'text-slate-400' : 'text-slate-500'].join(' ')}>
                      Curva comparativa entre os principais sinais do negócio.
                    </p>

                    <div className="mt-3 h-56">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={salesTrendSeries} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                          <defs>
                            <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor={isDarkTheme ? '#22d3ee' : '#0284c7'} stopOpacity={0.35} />
                              <stop offset="95%" stopColor={isDarkTheme ? '#22d3ee' : '#0284c7'} stopOpacity={0.03} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid
                            strokeDasharray="3 3"
                            stroke={isDarkTheme ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.07)'}
                          />
                          <XAxis
                            dataKey="label"
                            tick={{ fontSize: 10, fill: isDarkTheme ? '#94a3b8' : '#64748b' }}
                            axisLine={false}
                            tickLine={false}
                          />
                          <YAxis
                            tick={{ fontSize: 10, fill: isDarkTheme ? '#94a3b8' : '#64748b' }}
                            axisLine={false}
                            tickLine={false}
                            tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)}
                            width={44}
                          />
                          <Tooltip
                            formatter={(v) => [formatCurrency(Number(v)), 'Valor Estimado']}
                            labelStyle={{ color: isDarkTheme ? '#94a3b8' : '#64748b', fontSize: 11 }}
                            contentStyle={{
                              background: 'rgba(15,23,42,0.92)',
                              border: '1px solid rgba(255,255,255,0.12)',
                              borderRadius: 12,
                              backdropFilter: 'blur(12px)',
                              color: '#e2e8f0',
                              fontSize: 13,
                              boxShadow: '0 8px 32px rgba(0,0,0,0.4)'
                            }}
                          />
                          <Area
                            type="monotone"
                            dataKey="value"
                            stroke={isDarkTheme ? '#22d3ee' : '#0284c7'}
                            strokeWidth={3}
                            fill="url(#trendGrad)"
                            dot={{ r: 4, fill: isDarkTheme ? '#22d3ee' : '#0284c7', strokeWidth: 0 }}
                            activeDot={{
                              r: 7,
                              fill: isDarkTheme ? '#22d3ee' : '#0284c7',
                              stroke: isDarkTheme ? 'rgba(34,211,238,0.4)' : 'rgba(2,132,199,0.3)',
                              strokeWidth: 4
                            }}
                            animationDuration={900}
                            animationEasing="ease-out"
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>

                    {activeTrendPoint ? (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className={['mt-3 rounded-lg p-3 text-xs', isDarkTheme ? 'border border-cyan-400/25 bg-slate-950/70 text-cyan-100' : 'border border-slate-200 bg-white text-slate-700'].join(' ')}
                      >
                        <p><strong>Ponto:</strong> {activeTrendPoint.label}</p>
                        <p><strong>Valor estimado:</strong> {formatCurrency(activeTrendPoint.value)}</p>
                      </motion.div>
                    ) : null}
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.45, delay: 0.18 }}
                    className={['rounded-xl p-4', isDarkTheme ? 'border border-fuchsia-300/25 bg-gradient-to-b from-slate-900/85 to-slate-950/85 shadow-[0_0_35px_rgba(217,70,239,0.14)]' : 'border border-slate-200 bg-slate-50'].join(' ')}
                  >
                    <h3 className={['text-sm font-bold', isDarkTheme ? 'text-cyan-100' : 'text-slate-700'].join(' ')}>Colunas por produto</h3>
                    <p className={['mt-1 text-xs', isDarkTheme ? 'text-slate-400' : 'text-slate-500'].join(' ')}>
                      Visual de colunas para destacar rapidamente os itens mais críticos.
                    </p>

                    <div className={['mt-3 rounded-lg border p-3', isDarkTheme ? 'border-white/10 bg-black/10' : 'border-slate-200 bg-white'].join(' ')}>
                      <div className="flex h-56 items-end gap-2">
                        {(lowStockChartData.length ? lowStockChartData : []).map((item, index) => {
                          const heightPercent = Math.max(8, Math.round((item.value / lowStockChartMaxValue) * 100));

                          return (
                            <motion.button
                              key={item.id}
                              type="button"
                              whileHover={{ scale: 1.04 }}
                              whileTap={{ scale: 0.96 }}
                              onMouseEnter={() => setSelectedLowStockProductId(item.id)}
                              onFocus={() => setSelectedLowStockProductId(item.id)}
                              onClick={() => setSelectedLowStockProductId(item.id)}
                              className="flex flex-1 flex-col items-center justify-end gap-2"
                              title={`${item.name}: ${salesChartMetric === 'quantity' ? `${item.quantity} und` : formatCurrency(item.price)}`}
                            >
                              <motion.div
                                className={[
                                  'w-full rounded-t-md',
                                  selectedLowStockProduct?.id === item.id
                                    ? 'bg-gradient-to-t from-fuchsia-500 to-cyan-400'
                                    : 'bg-gradient-to-t from-indigo-600 to-blue-500'
                                ].join(' ')}
                                initial={{ scaleY: 0 }}
                                animate={{ scaleY: 1 }}
                                transition={{ duration: 0.5, delay: index * 0.08, ease: [0.2, 0.9, 0.2, 1] }}
                                style={{
                                  height: `${heightPercent}%`,
                                  transformOrigin: 'bottom'
                                }}
                              />
                              <span className={['w-full truncate text-center text-[10px]', isDarkTheme ? 'text-slate-300' : 'text-slate-500'].join(' ')}>
                                {item.name}
                              </span>
                            </motion.button>
                          );
                        })}
                      </div>
                    </div>
                  </motion.div>
                </div>
              </div>
            </div>
          ) : null}

          {/* ── VIEW: ANALYTICS ── */}
          {activeView === 'analytics' ? (
            <div className="grid gap-6 pb-8">
              {/* Header */}
              <motion.div
                initial={{ opacity: 0, y: -16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
                className="flex flex-col gap-1"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg shadow-blue-500/30">
                    <Activity className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h1 className={['text-2xl font-black tracking-tight', isDarkTheme ? 'text-white' : 'text-slate-800'].join(' ')}>
                      Dashboard de Análise
                    </h1>
                    <p className={['text-sm', isDarkTheme ? 'text-slate-400' : 'text-slate-500'].join(' ')}>
                      Visão premium dos seus indicadores de negócio
                    </p>
                  </div>
                </div>
              </motion.div>

              {/* KPI Cards */}
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                {[
                  {
                    label: 'Receita Total',
                    value: formatCurrency(Number(salesAnalysis?.totalRevenue || 0)),
                    variation: growthPercent,
                    icon: DollarSign,
                    gradient: 'from-blue-600 to-cyan-500',
                    glow: 'shadow-blue-500/25',
                    border: isDarkTheme ? 'border-blue-500/20' : 'border-blue-200',
                    neon: 'rgba(59,130,246,0.24)'
                  },
                  {
                    label: 'Crescimento',
                    value: `${growthPercent >= 0 ? '+' : ''}${growthPercent.toFixed(1)}%`,
                    variation: growthPercent,
                    icon: TrendingUp,
                    gradient: 'from-purple-600 to-pink-500',
                    glow: 'shadow-purple-500/25',
                    border: isDarkTheme ? 'border-purple-500/20' : 'border-purple-200',
                    neon: 'rgba(168,85,247,0.24)'
                  },
                  {
                    label: 'Total de Vendas',
                    value: String(salesAnalysis?.totalSales || 0),
                    variation: 0,
                    icon: ShoppingCart,
                    gradient: 'from-emerald-600 to-teal-500',
                    glow: 'shadow-emerald-500/25',
                    border: isDarkTheme ? 'border-emerald-500/20' : 'border-emerald-200',
                    neon: 'rgba(16,185,129,0.22)'
                  },
                  {
                    label: 'Clientes',
                    value: String(role === 'ADMIN' ? managedUsers.filter((u) => u.role === 'CLIENT').length : leads.length),
                    variation: 0,
                    icon: Users,
                    gradient: 'from-orange-500 to-rose-500',
                    glow: 'shadow-orange-500/25',
                    border: isDarkTheme ? 'border-orange-500/20' : 'border-orange-200',
                    neon: 'rgba(251,146,60,0.22)'
                  }
                ].map((card, idx) => {
                  const Icon = card.icon;
                  const isPositive = card.variation >= 0;
                  return (
                    <motion.div
                      key={card.label}
                      initial={{ opacity: 0, y: 24 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: idx * 0.08, ease: 'easeOut' }}
                      whileHover={{ y: -4, scale: 1.02 }}
                      className={[
                        'relative overflow-hidden rounded-2xl border p-5 shadow-xl transition-all duration-300',
                        card.glow,
                        isDarkTheme
                          ? `bg-[#0d1117] ${card.border}`
                          : `bg-white ${card.border}`
                      ].join(' ')}
                      style={
                        isDarkTheme
                          ? {
                              boxShadow: `0 0 0 1px rgba(148,163,184,0.08), 0 0 20px ${card.neon}, 0 10px 30px rgba(2,6,23,0.45)`
                            }
                          : undefined
                      }
                    >
                      {/* Glow blob */}
                      <div className={['pointer-events-none absolute -right-4 -top-4 h-20 w-20 rounded-full bg-gradient-to-br opacity-20 blur-2xl', card.gradient].join(' ')} />
                      <div className="relative flex items-start justify-between">
                        <div className={['flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br shadow-lg', card.gradient, card.glow].join(' ')}>
                          <Icon className="h-5 w-5 text-white" />
                        </div>
                        {card.variation !== 0 ? (
                          <span className={[
                            'flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-semibold',
                            isPositive ? 'bg-emerald-500/15 text-emerald-400' : 'bg-rose-500/15 text-rose-400'
                          ].join(' ')}>
                            {isPositive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                            {Math.abs(card.variation).toFixed(1)}%
                          </span>
                        ) : null}
                      </div>
                      <div className="mt-4">
                        <p className={['text-2xl font-black tracking-tight', isDarkTheme ? 'text-white' : 'text-slate-800'].join(' ')}>{card.value}</p>
                        <p className={['mt-1 text-xs font-medium', isDarkTheme ? 'text-slate-500' : 'text-slate-500'].join(' ')}>{card.label}</p>
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              {/* Charts Row 1: Area Chart + Donut */}
              <div className="grid gap-4 lg:grid-cols-3">
                {/* Area Chart - Sales Trend */}
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                  className={[
                    'col-span-2 rounded-2xl border p-5 shadow-xl',
                    isDarkTheme ? 'border-blue-500/20 bg-[#0d1117] shadow-[0_0_22px_rgba(59,130,246,0.16)]' : 'border-slate-200 bg-white'
                  ].join(' ')}
                >
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <h3 className={['text-base font-bold', isDarkTheme ? 'text-slate-100' : 'text-slate-800'].join(' ')}>Tendência de Vendas</h3>
                      <p className={['text-xs', isDarkTheme ? 'text-slate-500' : 'text-slate-400'].join(' ')}>Evolução mensal do faturamento</p>
                    </div>
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/15">
                      <TrendingUp className="h-4 w-4 text-blue-400" />
                    </div>
                  </div>
                  <ResponsiveContainer width="100%" height={220}>
                    <AreaChart data={monthlySalesSeries} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                      <defs>
                        <linearGradient id="analyticsGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.35} />
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                        </linearGradient>
                        <filter id="analyticsLineGlow" x="-50%" y="-50%" width="200%" height="200%">
                          <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                          <feMerge>
                            <feMergeNode in="coloredBlur" />
                            <feMergeNode in="SourceGraphic" />
                          </feMerge>
                        </filter>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke={isDarkTheme ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)'} />
                      <XAxis dataKey="month" tick={{ fontSize: 11, fill: isDarkTheme ? '#64748b' : '#94a3b8' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: isDarkTheme ? '#64748b' : '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} width={52} />
                      <Tooltip
                        contentStyle={{
                          background: isDarkTheme ? '#0d1117' : '#fff',
                          border: isDarkTheme ? '1px solid rgba(59,130,246,0.3)' : '1px solid #e2e8f0',
                          borderRadius: '12px',
                          boxShadow: '0 8px 30px rgba(0,0,0,0.35)',
                          color: isDarkTheme ? '#f1f5f9' : '#1e293b',
                          fontSize: 12
                        }}
                        formatter={(v: unknown) => [formatCurrency(Number(v)), 'Vendas']}
                      />
                      <Area type="monotone" dataKey="sales" stroke="#3b82f6" strokeWidth={2.5} fill="url(#analyticsGrad)" filter="url(#analyticsLineGlow)" dot={{ fill: '#3b82f6', r: 4, strokeWidth: 0 }} activeDot={{ r: 6, fill: '#60a5fa', strokeWidth: 2, stroke: '#0d1117' }} />
                    </AreaChart>
                  </ResponsiveContainer>
                </motion.div>

                {/* Donut Chart - Source Distribution */}
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 0.25 }}
                  className={[
                    'rounded-2xl border p-5 shadow-xl',
                    isDarkTheme ? 'border-purple-500/20 bg-[#0d1117] shadow-[0_0_22px_rgba(168,85,247,0.16)]' : 'border-slate-200 bg-white'
                  ].join(' ')}
                >
                  <div className="mb-2 flex items-center justify-between">
                    <div>
                      <h3 className={['text-base font-bold', isDarkTheme ? 'text-slate-100' : 'text-slate-800'].join(' ')}>Origens</h3>
                      <p className={['text-xs', isDarkTheme ? 'text-slate-500' : 'text-slate-400'].join(' ')}>Distribuição de leads</p>
                    </div>
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/15">
                      <BarChart3 className="h-4 w-4 text-purple-400" />
                    </div>
                  </div>
                  <ResponsiveContainer width="100%" height={160}>
                    <PieChart>
                      <Pie
                        data={sourcePieData.length > 0 ? sourcePieData : [
                          { name: 'Loja', value: 40 },
                          { name: 'WhatsApp', value: 30 },
                          { name: 'Direto', value: 20 },
                          { name: 'Outros', value: 10 }
                        ]}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={44}
                        outerRadius={68}
                        paddingAngle={3}
                        startAngle={90}
                        endAngle={-270}
                      >
                        {(sourcePieData.length > 0 ? sourcePieData : [{ name: 'Loja', value: 40 }, { name: 'WhatsApp', value: 30 }, { name: 'Direto', value: 20 }, { name: 'Outros', value: 10 }]).map((_entry, i) => (
                          <Cell key={i} fill={['#3b82f6', '#a855f7', '#06b6d4', '#f43f5e'][i % 4]} stroke="rgba(255,255,255,0.08)" strokeWidth={1} style={{ filter: 'drop-shadow(0 0 6px rgba(59,130,246,0.25))' }} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          background: isDarkTheme ? '#0d1117' : '#fff',
                          border: isDarkTheme ? '1px solid rgba(168,85,247,0.3)' : '1px solid #e2e8f0',
                          borderRadius: '10px',
                          fontSize: 12,
                          color: isDarkTheme ? '#f1f5f9' : '#1e293b'
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="mt-1 grid grid-cols-2 gap-x-3 gap-y-1.5">
                    {['Loja', 'WhatsApp', 'Direto', 'Outros'].map((label, i) => (
                      <div key={label} className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full flex-shrink-0" style={{ background: ['#3b82f6', '#a855f7', '#06b6d4', '#f43f5e'][i] }} />
                        <span className={['text-xs', isDarkTheme ? 'text-slate-400' : 'text-slate-500'].join(' ')}>{label}</span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              </div>

              {/* Charts Row 2: Products Bar + Sellers Bar */}
              <div className="grid gap-4 lg:grid-cols-2">
                {/* Top Products Bar */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.3 }}
                  className={[
                    'rounded-2xl border p-5 shadow-xl',
                    isDarkTheme ? 'border-cyan-500/20 bg-[#0d1117] shadow-[0_0_22px_rgba(6,182,212,0.16)]' : 'border-slate-200 bg-white'
                  ].join(' ')}
                >
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <h3 className={['text-base font-bold', isDarkTheme ? 'text-slate-100' : 'text-slate-800'].join(' ')}>Top Produtos</h3>
                      <p className={['text-xs', isDarkTheme ? 'text-slate-500' : 'text-slate-400'].join(' ')}>Valor em estoque por produto</p>
                    </div>
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500/15">
                      <Package className="h-4 w-4 text-cyan-400" />
                    </div>
                  </div>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart
                      data={analyticsTopProducts.length > 0 ? analyticsTopProducts : [
                        { name: 'Produto A', valor: 4500 },
                        { name: 'Produto B', valor: 3200 },
                        { name: 'Produto C', valor: 2800 },
                        { name: 'Produto D', valor: 1900 }
                      ]}
                      margin={{ top: 4, right: 4, bottom: 0, left: 0 }}
                      barSize={28}
                    >
                      <defs>
                        <linearGradient id="barGradCyan" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#06b6d4" />
                          <stop offset="100%" stopColor="#0284c7" />
                        </linearGradient>
                        <filter id="barGlowCyan" x="-50%" y="-50%" width="200%" height="200%">
                          <feGaussianBlur stdDeviation="2.5" result="coloredBlur" />
                          <feMerge>
                            <feMergeNode in="coloredBlur" />
                            <feMergeNode in="SourceGraphic" />
                          </feMerge>
                        </filter>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke={isDarkTheme ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)'} vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 11, fill: isDarkTheme ? '#64748b' : '#94a3b8' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: isDarkTheme ? '#64748b' : '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} width={48} />
                      <Tooltip
                        contentStyle={{
                          background: isDarkTheme ? '#0d1117' : '#fff',
                          border: isDarkTheme ? '1px solid rgba(6,182,212,0.3)' : '1px solid #e2e8f0',
                          borderRadius: '12px',
                          boxShadow: '0 8px 30px rgba(0,0,0,0.35)',
                          color: isDarkTheme ? '#f1f5f9' : '#1e293b',
                          fontSize: 12
                        }}
                        formatter={(v: unknown) => [formatCurrency(Number(v)), 'Valor']}
                        cursor={{ fill: isDarkTheme ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }}
                      />
                      <Bar dataKey="valor" fill="url(#barGradCyan)" filter="url(#barGlowCyan)" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </motion.div>

                {/* Seller Performance Bar */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.35 }}
                  className={[
                    'rounded-2xl border p-5 shadow-xl',
                    isDarkTheme ? 'border-purple-500/20 bg-[#0d1117] shadow-[0_0_22px_rgba(168,85,247,0.16)]' : 'border-slate-200 bg-white'
                  ].join(' ')}
                >
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <h3 className={['text-base font-bold', isDarkTheme ? 'text-slate-100' : 'text-slate-800'].join(' ')}>Desempenho por Vendedor</h3>
                      <p className={['text-xs', isDarkTheme ? 'text-slate-500' : 'text-slate-400'].join(' ')}>Volume de vendas por membro</p>
                    </div>
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/15">
                      <Users className="h-4 w-4 text-purple-400" />
                    </div>
                  </div>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart
                      data={sellerPerformanceData.length > 0 ? sellerPerformanceData : [
                        { name: 'Carlos', valor: 18000 },
                        { name: 'Ana', valor: 14500 },
                        { name: 'Pedro', valor: 11200 },
                        { name: 'Julia', valor: 8900 }
                      ]}
                      margin={{ top: 4, right: 4, bottom: 0, left: 0 }}
                      barSize={28}
                      layout="vertical"
                    >
                      <defs>
                        <linearGradient id="barGradPurple" x1="0" y1="0" x2="1" y2="0">
                          <stop offset="0%" stopColor="#a855f7" />
                          <stop offset="100%" stopColor="#ec4899" />
                        </linearGradient>
                        <filter id="barGlowPurple" x="-50%" y="-50%" width="200%" height="200%">
                          <feGaussianBlur stdDeviation="2.5" result="coloredBlur" />
                          <feMerge>
                            <feMergeNode in="coloredBlur" />
                            <feMergeNode in="SourceGraphic" />
                          </feMerge>
                        </filter>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke={isDarkTheme ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)'} horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 11, fill: isDarkTheme ? '#64748b' : '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: isDarkTheme ? '#64748b' : '#94a3b8' }} axisLine={false} tickLine={false} width={60} />
                      <Tooltip
                        contentStyle={{
                          background: isDarkTheme ? '#0d1117' : '#fff',
                          border: isDarkTheme ? '1px solid rgba(168,85,247,0.3)' : '1px solid #e2e8f0',
                          borderRadius: '12px',
                          boxShadow: '0 8px 30px rgba(0,0,0,0.35)',
                          color: isDarkTheme ? '#f1f5f9' : '#1e293b',
                          fontSize: 12
                        }}
                        formatter={(v: unknown) => [formatCurrency(Number(v)), 'Vendas']}
                        cursor={{ fill: isDarkTheme ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }}
                      />
                      <Bar dataKey="valor" fill="url(#barGradPurple)" filter="url(#barGlowPurple)" radius={[0, 6, 6, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </motion.div>
              </div>

              {/* AI Insights Card */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.45 }}
                className={[
                  'rounded-2xl border p-5 shadow-xl',
                  isDarkTheme ? 'border-yellow-500/20 bg-[#0d1117] shadow-[0_0_20px_rgba(234,179,8,0.14)]' : 'border-yellow-200 bg-white'
                ].join(' ')}
              >
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-yellow-500 to-orange-500 shadow-lg shadow-yellow-500/30">
                    <Sparkles className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className={['text-base font-bold', isDarkTheme ? 'text-slate-100' : 'text-slate-800'].join(' ')}>Insights de IA</h3>
                    <p className={['text-xs', isDarkTheme ? 'text-slate-500' : 'text-slate-400'].join(' ')}>Análises automáticas do seu negócio</p>
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {aiInsights.map((insight, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.35, delay: 0.5 + idx * 0.07 }}
                      className={[
                        'flex items-start gap-3 rounded-xl p-3.5',
                        insight.icon === 'warn'
                          ? isDarkTheme ? 'bg-rose-500/10 border border-rose-500/20' : 'bg-rose-50 border border-rose-200'
                          : insight.icon === 'award'
                            ? isDarkTheme ? 'bg-yellow-500/10 border border-yellow-500/20' : 'bg-yellow-50 border border-yellow-200'
                            : isDarkTheme ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-emerald-50 border border-emerald-200'
                      ].join(' ')}
                    >
                      <div className={[
                        'mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg',
                        insight.icon === 'warn'
                          ? 'bg-rose-500/20 text-rose-400'
                          : insight.icon === 'award'
                            ? 'bg-yellow-500/20 text-yellow-400'
                            : 'bg-emerald-500/20 text-emerald-400'
                      ].join(' ')}>
                        {insight.icon === 'warn' ? <AlertTriangle className="h-3.5 w-3.5" /> : insight.icon === 'award' ? <Award className="h-3.5 w-3.5" /> : <Lightbulb className="h-3.5 w-3.5" />}
                      </div>
                      <p className={['text-sm leading-snug', isDarkTheme ? 'text-slate-300' : 'text-slate-700'].join(' ')}>{insight.text}</p>
                    </motion.div>
                  ))}
                </div>
              </motion.div>

              {/* Sales table summary */}
              {(salesAnalysis?.recentSales?.length ?? 0) > 0 ? (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.5 }}
                  className={[
                    'rounded-2xl border p-5 shadow-xl',
                    isDarkTheme ? 'border-white/10 bg-[#0d1117] shadow-[0_0_16px_rgba(148,163,184,0.1)]' : 'border-slate-200 bg-white'
                  ].join(' ')}
                >
                  <h3 className={['mb-4 text-base font-bold', isDarkTheme ? 'text-slate-100' : 'text-slate-800'].join(' ')}>Vendas Recentes</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className={isDarkTheme ? 'border-b border-white/10' : 'border-b border-slate-100'}>
                          <th className={['py-2 text-left text-xs font-semibold uppercase tracking-wide', isDarkTheme ? 'text-slate-500' : 'text-slate-400'].join(' ')}>ID</th>
                          <th className={['py-2 text-left text-xs font-semibold uppercase tracking-wide', isDarkTheme ? 'text-slate-500' : 'text-slate-400'].join(' ')}>Data</th>
                          <th className={['py-2 text-right text-xs font-semibold uppercase tracking-wide', isDarkTheme ? 'text-slate-500' : 'text-slate-400'].join(' ')}>Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(salesAnalysis?.recentSales || []).slice(0, 8).map((sale) => (
                          <tr key={sale.id} className={isDarkTheme ? 'border-b border-white/5 hover:bg-white/3' : 'border-b border-slate-50 hover:bg-slate-50'}>
                            <td className={['py-2.5 font-mono text-xs', isDarkTheme ? 'text-slate-400' : 'text-slate-500'].join(' ')}>{String(sale.id).slice(0, 8)}…</td>
                            <td className={['py-2.5', isDarkTheme ? 'text-slate-400' : 'text-slate-600'].join(' ')}>
                              {new Date(String(sale.createdAt || '')).toLocaleDateString('pt-BR')}
                            </td>
                            <td className={['py-2.5 text-right font-semibold', isDarkTheme ? 'text-cyan-300' : 'text-blue-700'].join(' ')}>
                              {formatCurrency(Number(sale.total || 0))}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </motion.div>
              ) : null}
            </div>
          ) : null}

          {role === 'ADMIN' || activeView === 'products' || activeView === 'inventory' || activeView === 'settings' || activeView === 'chat' || activeView === 'sales' || activeView === 'analytics' || activeView === 'integrations' ? (
            <p className={['mt-4 text-sm', isDarkTheme ? 'text-slate-500' : 'text-slate-400'].join(' ')}>{adminLoading ? 'Sincronizando área administrativa...' : status}</p>
          ) : null}

            </motion.div>
          </div>
        </section>
      </div>

      {/* ── Edit Lead Modal with AnimatePresence ── */}
      <AnimatePresence>
        {editingLeadId ? (
          <motion.div
            key="edit-modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="fixed inset-0 z-50 grid place-items-center bg-slate-900/60 p-4 backdrop-blur-sm"
          >
            <motion.div
              key="edit-modal-content"
              initial={{ opacity: 0, scale: 0.94, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 16 }}
              transition={{ duration: 0.28, ease: 'easeOut' }}
              className={['w-full max-w-lg p-5 shadow-2xl', themedPanelClass].join(' ')}
            >
              <h3 className={isDarkTheme ? 'text-lg font-bold text-white' : 'text-lg font-bold text-slate-900'}>Editar card</h3>
              <p className={['mt-1 text-sm', themedSubtextClass].join(' ')}>Atualize os dados do lead no funil.</p>

              <div className="mt-4 grid gap-3">
                <input className={themedInputClass} placeholder="Nome" value={editName} onChange={(event) => setEditName(event.target.value)} />
                <select className={themedSelectClass} value={editPriority} onChange={(event) => setEditPriority(event.target.value as LeadPriority)}>
                  <option className={themedOptionClass} value="BAIXA">Prioridade baixa</option>
                  <option className={themedOptionClass} value="MEDIA">Prioridade média</option>
                  <option className={themedOptionClass} value="ALTA">Prioridade alta</option>
                </select>
                <input className={themedInputClass} placeholder="Valor (R$)" type="number" step="0.01" value={editValue} onChange={(event) => setEditValue(event.target.value)} />
                <textarea className={['min-h-[100px]', themedInputClass].join(' ')} placeholder="Observação" value={editNotes} onChange={(event) => setEditNotes(event.target.value)} />
              </div>

              <div className="mt-5 flex flex-wrap justify-between gap-2">
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  type="button"
                  onClick={deleteLead}
                  className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-500"
                >
                  Excluir
                </motion.button>
                <div className="flex gap-2">
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    type="button"
                    onClick={closeEditModal}
                    className={isDarkTheme ? 'rounded-xl border border-white/20 px-4 py-2 text-sm font-semibold text-slate-100 hover:bg-white/10' : 'rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100'}
                  >
                    Cancelar
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    type="button"
                    onClick={saveLeadChanges}
                    className="rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-900/30 hover:from-blue-500 hover:to-cyan-400"
                  >
                    Salvar
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </main>
  );
};

export default Dashboard;
