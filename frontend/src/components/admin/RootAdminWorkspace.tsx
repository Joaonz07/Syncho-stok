import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';
import type { Dispatch, ReactNode, SetStateAction } from 'react';
import {
  Activity,
  BadgeCheck,
  Bell,
  Building2,
  ChevronRight,
  CircleAlert,
  CreditCard,
  Download,
  Globe,
  LayoutDashboard,
  Lock,
  Moon,
  RefreshCw,
  Search,
  ServerCog,
  Shield,
  ShieldAlert,
  Sparkles,
  Sun,
  TrendingUp,
  Users,
  Wifi,
  Zap
} from 'lucide-react';

type CompanyPlan = 'BASIC' | 'PRO' | 'PREMIUM';
type CompanyStatus = 'ACTIVE' | 'PAST_DUE' | 'CANCELED' | 'BLOCKED';
type AdminSection = 'overview' | 'companies' | 'users' | 'plans' | 'support';

type CompanyRecord = {
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

type CompanyOption = {
  id: string;
  name: string;
};

type AdminOverview = {
  mrr: number;
  totalCompanies: number;
  activeCompanies: number;
  inactiveCompanies: number;
  monthlyGrowth: number;
};

type NewCompaniesPoint = {
  month: string;
  companies: number;
  revenue: number;
};

type PlanDistributionPoint = {
  name: string;
  value: number;
};

type AdminPlanConfig = {
  id: string;
  name: string;
  price: number;
  features: string[];
};

type Props = {
  adminSection: AdminSection;
  setAdminSection: Dispatch<SetStateAction<AdminSection>>;
  displayUserName: string;
  displayUserEmail: string;
  uiTheme: 'light' | 'dark';
  setUiTheme: Dispatch<SetStateAction<'light' | 'dark'>>;
  isDarkTheme: boolean;
  companies: CompanyRecord[];
  managedUsers: ManagedUser[];
  companyOptions: CompanyOption[];
  adminOverview: AdminOverview;
  adminPlanDistributionData: PlanDistributionPoint[];
  adminNewCompaniesSeries: NewCompaniesPoint[];
  planCatalog: AdminPlanConfig[];
  planEditorId: string | null;
  planEditorName: string;
  setPlanEditorName: (value: string) => void;
  planEditorPrice: string;
  setPlanEditorPrice: (value: string) => void;
  planEditorFeatures: string;
  setPlanEditorFeatures: (value: string) => void;
  fetchAdminData: () => void | Promise<void>;
  setCompanyPlanQuick: (company: CompanyRecord, plan: CompanyPlan) => void | Promise<void>;
  toggleCompanyBlocked: (company: CompanyRecord) => void | Promise<void>;
  accessCompanyContext: (companyId: string) => void;
  toggleUserEnabled: (user: ManagedUser) => void | Promise<void>;
  openPlanEditor: (plan?: AdminPlanConfig) => void;
  savePlanEditor: () => void;
  deletePlanItem: (planId: string) => void;
  showToast: (message: string) => void;
};

type RootSection = 'analytics' | 'users' | 'companies' | 'billing' | 'security' | 'notifications' | 'api' | 'system';
type CriticalAction = 'delete-user' | 'block-company' | 'refund-payment' | 'suspend-user' | 'reset-api';
type UserStatus = 'Ativo' | 'Suspenso' | 'Pendente';
type PermissionLevel = 'root' | 'admin' | 'support' | 'success';

type AdminUserRow = {
  id: string;
  name: string;
  email: string;
  companyId: string | null;
  companyName: string;
  plan: CompanyPlan;
  status: UserStatus;
  permission: PermissionLevel;
  lastActive: string;
  ip: string;
  source: 'real' | 'mock';
  activity: string[];
};

type AdminCompanyRow = {
  id: string;
  name: string;
  location: string;
  plan: CompanyPlan;
  status: CompanyStatus;
  expiresAt: string;
  users: number;
  usage: string;
  owner: string;
  source: 'real' | 'mock';
};

type PaymentRow = {
  id: string;
  companyId: string;
  companyName: string;
  plan: CompanyPlan;
  amount: number;
  status: 'Pago' | 'Pendente' | 'Falhou' | 'Reembolsado';
  method: 'Cartao' | 'Pix' | 'Boleto';
  date: string;
};

type SecurityLog = {
  id: string;
  actor: string;
  email: string;
  ip: string;
  device: string;
  location: string;
  status: 'OK' | 'Risco' | 'Bloqueado';
  time: string;
};

type ApiUsageRow = {
  id: string;
  companyName: string;
  requests: number;
  limit: number;
  latency: number;
  errorRate: number;
  webhook: string;
};

type NotificationCampaign = {
  id: string;
  title: string;
  channel: 'Banner' | 'Email' | 'In-app';
  audience: string;
  status: 'Rascunho' | 'Agendado' | 'Enviado';
  sentAt: string;
};

const shell =
  'rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.9),rgba(2,6,23,0.82))] shadow-[0_32px_90px_-48px_rgba(15,23,42,0.95)] backdrop-blur-xl';

const navigation: Array<{ id: RootSection; label: string; icon: typeof LayoutDashboard; sync: AdminSection }> = [
  { id: 'analytics', label: 'Dashboard', icon: LayoutDashboard, sync: 'overview' },
  { id: 'users', label: 'Usuarios', icon: Users, sync: 'users' },
  { id: 'companies', label: 'Empresas', icon: Building2, sync: 'companies' },
  { id: 'billing', label: 'Faturamento', icon: CreditCard, sync: 'plans' },
  { id: 'security', label: 'Seguranca', icon: Shield, sync: 'support' },
  { id: 'notifications', label: 'Notificacoes', icon: Bell, sync: 'support' },
  { id: 'api', label: 'API Global', icon: Zap, sync: 'plans' },
  { id: 'system', label: 'Sistema', icon: ServerCog, sync: 'plans' }
];

const permissionLabel: Record<PermissionLevel, string> = {
  root: 'Root',
  admin: 'Admin',
  support: 'Suporte',
  success: 'CSM'
};

const fmtCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(value);

const fmtDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).format(date);
};

const normalizeStatus = (status?: string | null): CompanyStatus => {
  if (status === 'BLOCKED' || status === 'CANCELED' || status === 'PAST_DUE') {
    return status;
  }
  return 'ACTIVE';
};

const exportFile = (payload: string, filename: string, mime: string) => {
  const blob = new Blob([payload], { type: mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
};

const MiniStat = ({ label, value, hint, icon, accent, isDarkTheme }: { label: string; value: string; hint: string; icon: ReactNode; accent: string; isDarkTheme: boolean }) => (
  <motion.div
    whileHover={{ y: -3, scale: 1.01 }}
    className={[shell, 'overflow-hidden p-5'].join(' ')}
  >
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className={['text-[11px] font-semibold uppercase tracking-[0.28em]', isDarkTheme ? 'text-slate-400' : 'text-slate-500'].join(' ')}>{label}</p>
        <p className={['mt-3 text-3xl font-black', isDarkTheme ? 'text-white' : 'text-slate-900'].join(' ')}>{value}</p>
        <p className={['mt-2 text-xs', isDarkTheme ? 'text-slate-400' : 'text-slate-500'].join(' ')}>{hint}</p>
      </div>
      <div className="rounded-2xl border border-white/10 p-3" style={{ background: accent }}>
        {icon}
      </div>
    </div>
  </motion.div>
);

const SectionCard = ({ title, subtitle, actions, children, isDarkTheme }: { title: string; subtitle: string; actions?: ReactNode; children: ReactNode; isDarkTheme: boolean }) => (
  <section className={[shell, 'p-5 sm:p-6'].join(' ')}>
    <div className="mb-5 flex flex-col gap-4 border-b border-white/10 pb-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 className={['text-xl font-black', isDarkTheme ? 'text-white' : 'text-slate-900'].join(' ')}>{title}</h2>
        <p className={['mt-1 text-sm', isDarkTheme ? 'text-slate-400' : 'text-slate-500'].join(' ')}>{subtitle}</p>
      </div>
      {actions}
    </div>
    {children}
  </section>
);

const SkeletonPanel = () => (
  <div className="grid gap-4 xl:grid-cols-3">
    {Array.from({ length: 6 }).map((_, index) => (
      <div key={index} className={[shell, 'animate-pulse p-5'].join(' ')}>
        <div className="h-4 w-24 rounded-full bg-white/10" />
        <div className="mt-4 h-8 w-32 rounded-full bg-white/10" />
        <div className="mt-8 h-24 rounded-3xl bg-white/10" />
      </div>
    ))}
  </div>
);

const RootAdminWorkspace = ({
  adminSection,
  setAdminSection,
  displayUserName,
  displayUserEmail,
  uiTheme,
  setUiTheme,
  isDarkTheme,
  companies,
  managedUsers,
  companyOptions,
  adminOverview,
  adminPlanDistributionData,
  adminNewCompaniesSeries,
  planCatalog,
  planEditorId,
  planEditorName,
  setPlanEditorName,
  planEditorPrice,
  setPlanEditorPrice,
  planEditorFeatures,
  setPlanEditorFeatures,
  fetchAdminData,
  setCompanyPlanQuick,
  toggleCompanyBlocked,
  accessCompanyContext,
  toggleUserEnabled,
  openPlanEditor,
  savePlanEditor,
  deletePlanItem,
  showToast
}: Props) => {
  const initialSection = useMemo<RootSection>(() => {
    if (adminSection === 'users') return 'users';
    if (adminSection === 'companies') return 'companies';
    if (adminSection === 'plans') return 'billing';
    if (adminSection === 'support') return 'security';
    return 'analytics';
  }, [adminSection]);

  const [currentSection, setCurrentSection] = useState<RootSection>(initialSection);
  const [loadingSection, setLoadingSection] = useState(false);
  const [globalSearch, setGlobalSearch] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [userStatusFilter, setUserStatusFilter] = useState<'Todos' | UserStatus>('Todos');
  const [permissionFilter, setPermissionFilter] = useState<'Todos' | PermissionLevel>('Todos');
  const [companySearch, setCompanySearch] = useState('');
  const [companyStatusFilter, setCompanyStatusFilter] = useState<'Todos' | CompanyStatus>('Todos');
  const [billingFilter, setBillingFilter] = useState<'Todos' | PaymentRow['status']>('Todos');
  const [securityFilter, setSecurityFilter] = useState<'Todos' | SecurityLog['status']>('Todos');
  const [pageUsers, setPageUsers] = useState(1);
  const [pageCompanies, setPageCompanies] = useState(1);
  const [pagePayments, setPagePayments] = useState(1);
  const [selectedUser, setSelectedUser] = useState<AdminUserRow | null>(null);
  const [selectedCompany, setSelectedCompany] = useState<AdminCompanyRow | null>(null);
  const [criticalAction, setCriticalAction] = useState<CriticalAction | null>(null);
  const [criticalPayloadId, setCriticalPayloadId] = useState<string | null>(null);
  const [localBannerTitle, setLocalBannerTitle] = useState('Manutencao programada da API principal');
  const [localBannerBody, setLocalBannerBody] = useState('Hoje as 22h teremos uma janela curta de manutencao com failover automatico.');
  const [massEmail, setMassEmail] = useState('Comunicado de cobranca e novos limites de API.');
  const [apiRateLimit, setApiRateLimit] = useState(1200);
  const [permissionsDraft] = useState<Record<PermissionLevel, string[]>>({
    root: ['billing', 'security', 'system', 'users'],
    admin: ['users', 'companies', 'billing'],
    support: ['users', 'notifications', 'security'],
    success: ['companies', 'billing']
  });

  useEffect(() => {
    setCurrentSection(initialSection);
  }, [initialSection]);

  useEffect(() => {
    setLoadingSection(true);
    const timer = window.setTimeout(() => setLoadingSection(false), 320);
    return () => window.clearTimeout(timer);
  }, [currentSection]);

  const mockCompanies = useMemo<AdminCompanyRow[]>(() => {
    const realRows = companies.map((company, index) => ({
      id: company.id,
      name: company.name,
      location: company.location || ['Sao Paulo', 'Rio de Janeiro', 'Campinas', 'Belo Horizonte'][index % 4],
      plan: (company.plan || 'BASIC') as CompanyPlan,
      status: normalizeStatus(company.subscription_status || company.subscriptionStatus),
      expiresAt: String(company.expires_at || company.expiresAt || new Date(Date.now() + 1000 * 60 * 60 * 24 * 45).toISOString()),
      users: managedUsers.filter((user) => String(user.company_id || user.companyId) === String(company.id)).length || 3,
      usage: `${42 + index * 4}%`,
      owner: managedUsers.find((user) => String(user.company_id || user.companyId) === String(company.id))?.name || 'Owner principal',
      source: 'real' as const
    }));

    const extras: AdminCompanyRow[] = Array.from({ length: 12 }).map((_, index) => ({
      id: `cmp_mock_${index + 1}`,
      name: ['Atlas Foods', 'Nova Stack', 'MobiHealth', 'Prime Solar', 'Urban Track', 'Flow CRM', 'Pixel Retail', 'BluePort', 'Orion Labs', 'Casa Viva', 'Flex Cargo', 'Lumen AI'][index],
      location: ['Curitiba', 'Florianopolis', 'Salvador', 'Goiania'][index % 4],
      plan: (['BASIC', 'PRO', 'PREMIUM'] as CompanyPlan[])[index % 3],
      status: (['ACTIVE', 'ACTIVE', 'PAST_DUE', 'BLOCKED'] as CompanyStatus[])[index % 4],
      expiresAt: new Date(Date.now() + (index + 10) * 86400000 * 7).toISOString(),
      users: 6 + index * 2,
      usage: `${35 + index * 5}%`,
      owner: ['Marina Costa', 'Lucas Rocha', 'Ana Vale', 'Rafael Moura'][index % 4],
      source: 'mock'
    }));

    const seen = new Set(realRows.map((row) => row.id));
    return [...realRows, ...extras.filter((item) => !seen.has(item.id))];
  }, [companies, managedUsers]);

  const mockUsers = useMemo<AdminUserRow[]>(() => {
    const companyNameById = new Map(mockCompanies.map((company) => [company.id, company.name]));
    const realUsers = managedUsers.map((user, index) => {
      const companyId = String(user.company_id || user.companyId || '') || null;
      const optionName = companyId ? companyOptions.find((option) => option.id === companyId)?.name : null;
      const accessUntil = String(user.access_until || user.accessUntil || '');
      const status: UserStatus = accessUntil && new Date(accessUntil).getTime() < Date.now() ? 'Suspenso' : 'Ativo';
      const permission: PermissionLevel = user.role === 'ADMIN' ? 'root' : user.role === 'DEV' ? 'admin' : 'success';
      return {
        id: user.id,
        name: user.name,
        email: user.email,
        companyId,
        companyName: companyId ? optionName || companyNameById.get(companyId) || 'Conta enterprise' : 'SYNCHO Core',
        plan: mockCompanies.find((company) => company.id === companyId)?.plan || 'PRO',
        status,
        permission,
        lastActive: ['Agora', '5 min atras', 'Hoje 09:41', 'Ontem 20:12'][index % 4],
        ip: `177.4${index}.2${index}.1${index}`,
        source: 'real' as const,
        activity: ['Atualizou perfil', 'Visualizou fatura', 'Exportou CSV']
      };
    });

    const mockNames = ['Carla Mendonca', 'Joao Prado', 'Isabela Cunha', 'Thiago Ramos', 'Bruna Lima', 'Pedro Nogueira', 'Nina Alves', 'Rafaela Gomes', 'Henrique Sato', 'Vitoria Faria', 'Anderson Mello', 'Bianca Torres', 'Danilo Freire', 'Fernanda Dantas', 'Ricardo Leal', 'Larissa Azevedo', 'Paulo Viana', 'Camila Seixas', 'Igor Teixeira', 'Julia Pacheco', 'Marcelo Reis', 'Aline Duarte', 'Leonardo Braga', 'Renata Nobre'];
    const mockRows = mockNames.map((name, index) => {
      const company = mockCompanies[index % mockCompanies.length];
      const permission = (['success', 'admin', 'support', 'success'] as PermissionLevel[])[index % 4];
      const status = (['Ativo', 'Ativo', 'Pendente', 'Suspenso'] as UserStatus[])[index % 4];
      return {
        id: `usr_mock_${index + 1}`,
        name,
        email: `${name.toLowerCase().replace(/[^a-z]+/g, '.').replace(/(^\.|\.$)/g, '')}@${company.name.toLowerCase().replace(/[^a-z]+/g, '')}.com`,
        companyId: company.id,
        companyName: company.name,
        plan: company.plan,
        status,
        permission,
        lastActive: `${1 + (index % 12)}h atras`,
        ip: `189.1${index}.4${index}.2${index}`,
        source: 'mock' as const,
        activity: ['Mudou limite de estoque', 'Gerou relatorio JSON', 'Acessou API key']
      };
    });

    return [...realUsers, ...mockRows];
  }, [managedUsers, mockCompanies]);

  const payments = useMemo<PaymentRow[]>(() => {
    return mockCompanies.slice(0, 18).map((company, index) => ({
      id: `pay_${index + 1}`,
      companyId: company.id,
      companyName: company.name,
      plan: company.plan,
      amount: company.plan === 'PREMIUM' ? 499 : company.plan === 'PRO' ? 199 : 79,
      status: (['Pago', 'Pago', 'Pendente', 'Falhou', 'Pago'] as PaymentRow['status'][])[index % 5],
      method: (['Cartao', 'Pix', 'Boleto'] as PaymentRow['method'][])[index % 3],
      date: new Date(Date.now() - index * 86400000 * 3).toISOString()
    }));
  }, [mockCompanies]);

  const securityLogs = useMemo<SecurityLog[]>(() => {
    return mockUsers.slice(0, 20).map((user, index) => ({
      id: `sec_${index + 1}`,
      actor: user.name,
      email: user.email,
      ip: user.ip,
      device: ['Chrome macOS', 'Edge Windows', 'Safari iPhone', 'Firefox Linux'][index % 4],
      location: ['Sao Paulo', 'Fortaleza', 'Porto Alegre', 'Recife'][index % 4],
      status: (['OK', 'OK', 'Risco', 'Bloqueado'] as SecurityLog['status'][])[index % 4],
      time: new Date(Date.now() - index * 5400000).toISOString()
    }));
  }, [mockUsers]);

  const apiUsage = useMemo<ApiUsageRow[]>(() => {
    return mockCompanies.slice(0, 12).map((company, index) => ({
      id: `api_${index + 1}`,
      companyName: company.name,
      requests: 12000 + index * 1600,
      limit: apiRateLimit * 100,
      latency: 120 + index * 8,
      errorRate: Number((0.3 + index * 0.12).toFixed(2)),
      webhook: index % 2 === 0 ? 'Ativo' : 'Pausado'
    }));
  }, [mockCompanies, apiRateLimit]);

  const campaigns = useMemo<NotificationCampaign[]>(() => {
    return [
      { id: 'cmp_1', title: 'Janela de manutencao API', channel: 'Banner', audience: 'Todos os usuarios', status: 'Agendado', sentAt: 'Hoje 22:00' },
      { id: 'cmp_2', title: 'Mudanca de planos PRO', channel: 'Email', audience: 'Clientes PRO', status: 'Enviado', sentAt: 'Ontem 08:20' },
      { id: 'cmp_3', title: 'Boas-vindas workspace root', channel: 'In-app', audience: 'Admins', status: 'Rascunho', sentAt: 'Nao enviado' }
    ];
  }, []);

  const searchResults = useMemo(() => {
    const query = globalSearch.trim().toLowerCase();
    if (!query) return [] as Array<{ id: string; label: string; type: string; hint: string }>;
    return [
      ...mockUsers.map((user) => ({ id: `u-${user.id}`, label: user.name, type: 'Usuario', hint: user.email })),
      ...mockCompanies.map((company) => ({ id: `c-${company.id}`, label: company.name, type: 'Empresa', hint: `${company.plan} · ${company.location}` })),
      ...apiUsage.map((usage) => ({ id: `a-${usage.id}`, label: usage.companyName, type: 'API', hint: `${usage.requests.toLocaleString('pt-BR')} reqs` }))
    ].filter((item) => `${item.label} ${item.hint}`.toLowerCase().includes(query)).slice(0, 8);
  }, [apiUsage, globalSearch, mockCompanies, mockUsers]);

  const filteredUsers = useMemo(() => {
    return mockUsers.filter((user) => {
      const matchesSearch = `${user.name} ${user.email} ${user.companyName}`.toLowerCase().includes(userSearch.toLowerCase());
      const matchesStatus = userStatusFilter === 'Todos' || user.status === userStatusFilter;
      const matchesPermission = permissionFilter === 'Todos' || user.permission === permissionFilter;
      return matchesSearch && matchesStatus && matchesPermission;
    });
  }, [mockUsers, permissionFilter, userSearch, userStatusFilter]);

  const filteredCompanies = useMemo(() => {
    return mockCompanies.filter((company) => {
      const matchesSearch = `${company.name} ${company.location}`.toLowerCase().includes(companySearch.toLowerCase());
      const matchesStatus = companyStatusFilter === 'Todos' || company.status === companyStatusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [companySearch, companyStatusFilter, mockCompanies]);

  const filteredPayments = useMemo(() => {
    return payments.filter((payment) => billingFilter === 'Todos' || payment.status === billingFilter);
  }, [billingFilter, payments]);

  const filteredSecurity = useMemo(() => {
    return securityLogs.filter((log) => securityFilter === 'Todos' || log.status === securityFilter);
  }, [securityFilter, securityLogs]);

  const paginate = <T,>(items: T[], page: number, size: number) => items.slice((page - 1) * size, page * size);
  const pagedUsers = paginate(filteredUsers, pageUsers, 8);
  const pagedCompanies = paginate(filteredCompanies, pageCompanies, 7);
  const pagedPayments = paginate(filteredPayments, pagePayments, 7);

  const totals = useMemo(() => {
    const totalUsers = mockUsers.length;
    const activeUsers = mockUsers.filter((user) => user.status === 'Ativo').length;
    const conversion = mockCompanies.length ? (activeUsers / (mockCompanies.length * 10)) * 100 : 0;
    const activeClients = mockCompanies.filter((company) => company.status === 'ACTIVE').length;
    const revenueTotal = payments.filter((payment) => payment.status === 'Pago').reduce((acc, payment) => acc + payment.amount, 0);
    return { totalUsers, activeUsers, conversion, activeClients, revenueTotal };
  }, [mockCompanies, mockUsers, payments]);

  const triggerRefresh = async () => {
    setLoadingSection(true);
    await fetchAdminData();
    showToast('Dados administrativos sincronizados');
    window.setTimeout(() => setLoadingSection(false), 250);
  };

  const exportUsers = () => {
    const rows = filteredUsers.map((user) => `${user.name},${user.email},${user.companyName},${user.permission},${user.status}`).join('\n');
    exportFile(`nome,email,empresa,permissao,status\n${rows}`, 'syncho-admin-users.csv', 'text/csv;charset=utf-8;');
    showToast('CSV de usuarios exportado');
  };

  const exportCompanies = () => {
    exportFile(JSON.stringify(filteredCompanies, null, 2), 'syncho-admin-companies.json', 'application/json;charset=utf-8;');
    showToast('JSON de empresas exportado');
  };

  const handleUserStatus = async (user: AdminUserRow) => {
    const real = managedUsers.find((item) => item.id === user.id);
    if (real) {
      await toggleUserEnabled(real);
      return;
    }
    showToast(user.status === 'Suspenso' ? 'Usuario mock reativado' : 'Usuario mock suspenso');
  };

  const handleCompanyPlan = async (company: AdminCompanyRow, plan: CompanyPlan) => {
    const real = companies.find((item) => item.id === company.id);
    if (real) {
      await setCompanyPlanQuick(real, plan);
      return;
    }
    showToast(`Plano de ${company.name} ajustado para ${plan}`);
  };

  const handleCompanyBlock = async (company: AdminCompanyRow) => {
    const real = companies.find((item) => item.id === company.id);
    if (real) {
      await toggleCompanyBlocked(real);
      return;
    }
    showToast(company.status === 'BLOCKED' ? 'Empresa mock desbloqueada' : 'Empresa mock bloqueada');
  };

  const confirmCritical = () => {
    if (criticalAction === 'reset-api') {
      showToast('API global regenerada com sucesso');
    }
    if (criticalAction === 'refund-payment') {
      showToast('Reembolso processado');
    }
    if (criticalAction === 'delete-user') {
      showToast('Solicitacao de exclusao enfileirada');
    }
    if (criticalAction === 'block-company') {
      showToast('Empresa marcada para bloqueio imediato');
    }
    if (criticalAction === 'suspend-user') {
      showToast('Usuario marcado como suspeito');
    }
    setCriticalAction(null);
    setCriticalPayloadId(null);
  };

  const sectionContent = () => {
    if (loadingSection) {
      return <SkeletonPanel />;
    }

    if (currentSection === 'analytics') {
      return (
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MiniStat label="Receita total" value={fmtCurrency(totals.revenueTotal)} hint="Pagamentos confirmados no periodo" icon={<CreditCard className="h-5 w-5 text-white" />} accent="linear-gradient(135deg,#22d3ee,#2563eb)" isDarkTheme={isDarkTheme} />
            <MiniStat label="MRR" value={fmtCurrency(adminOverview.mrr)} hint="Recorrencia mensal consolidada" icon={<TrendingUp className="h-5 w-5 text-white" />} accent="linear-gradient(135deg,#34d399,#059669)" isDarkTheme={isDarkTheme} />
            <MiniStat label="Usuarios" value={String(totals.totalUsers)} hint={`${totals.activeUsers} ativos agora`} icon={<Users className="h-5 w-5 text-white" />} accent="linear-gradient(135deg,#8b5cf6,#4338ca)" isDarkTheme={isDarkTheme} />
            <MiniStat label="Conversao" value={`${totals.conversion.toFixed(1)}%`} hint={`${adminOverview.activeCompanies} empresas ativas`} icon={<BadgeCheck className="h-5 w-5 text-white" />} accent="linear-gradient(135deg,#f59e0b,#ea580c)" isDarkTheme={isDarkTheme} />
          </div>

          <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
            <SectionCard
              title="Crescimento da plataforma"
              subtitle="Usuarios ativos, crescimento de empresas e receita nos ultimos meses."
              isDarkTheme={isDarkTheme}
              actions={
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => showToast('Filtro de periodo pronto para backend')} className="rounded-2xl border border-white/10 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-white/10">Ultimos 30 dias</button>
                  <button type="button" onClick={() => showToast('Comparativo exportado')} className="rounded-2xl border border-white/10 px-3 py-2 text-xs font-semibold text-cyan-300 hover:bg-white/10">Exportar</button>
                </div>
              }
            >
              <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
                <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
                  <div className="flex h-64 items-end gap-3">
                    {adminNewCompaniesSeries.slice(-8).map((point) => {
                      const height = Math.max(18, Math.min(100, point.revenue / 45));
                      return (
                        <div key={point.month} className="flex flex-1 flex-col items-center gap-3">
                          <motion.div whileHover={{ scale: 1.04 }} className="w-full rounded-t-[20px] bg-gradient-to-t from-cyan-500 to-blue-500" style={{ height: `${height}%` }} />
                          <div className="text-center">
                            <p className={['text-xs font-semibold', isDarkTheme ? 'text-slate-300' : 'text-slate-700'].join(' ')}>{point.month}</p>
                            <p className={['text-[11px]', isDarkTheme ? 'text-slate-500' : 'text-slate-500'].join(' ')}>{fmtCurrency(point.revenue)}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div className="space-y-3">
                  {adminPlanDistributionData.map((item, index) => (
                    <div key={item.name} className="rounded-[22px] border border-white/10 bg-black/20 p-4">
                      <div className="flex items-center justify-between text-sm font-semibold text-slate-200">
                        <span>{item.name}</span>
                        <span>{item.value}</span>
                      </div>
                      <div className="mt-3 h-2 rounded-full bg-white/10">
                        <div className="h-2 rounded-full bg-gradient-to-r from-cyan-400 to-blue-500" style={{ width: `${Math.max(10, item.value * 12 + index * 6)}%` }} />
                      </div>
                    </div>
                  ))}
                  <div className="rounded-[22px] border border-emerald-400/20 bg-emerald-500/10 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-300">Monitoramento ao vivo</p>
                    <div className="mt-3 flex items-center gap-3">
                      <span className="relative flex h-3 w-3">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-400" />
                      </span>
                      <p className="text-sm font-semibold text-emerald-200">3 clusters online · 98.97% uptime · fila 14 req/min</p>
                    </div>
                  </div>
                </div>
              </div>
            </SectionCard>

            <div className="grid gap-5 xl:grid-cols-2">
              <SectionCard title="Sinais de operacao" subtitle="Alertas e oportunidades de crescimento imediato." isDarkTheme={isDarkTheme}>
                <div className="grid gap-3">
                  {[
                    '4 clientes PRO com risco de churn nas ultimas 72h.',
                    'Latencia da API global abaixo de 180ms durante o pico.',
                    'Taxa de conversao subiu 8.4% apos o ultimo ajuste de planos.'
                  ].map((insight) => (
                    <div key={insight} className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-slate-300">{insight}</div>
                  ))}
                </div>
              </SectionCard>
              <SectionCard title="Resumo executivo" subtitle="KPIs prontos para um board de operacao real." isDarkTheme={isDarkTheme}>
                <div className="grid gap-3 sm:grid-cols-2">
                  {[
                    { label: 'Empresas totais', value: String(adminOverview.totalCompanies) },
                    { label: 'Clientes ativos', value: String(totals.activeClients) },
                    { label: 'Churn tecnico', value: '1.8%' },
                    { label: 'NPS estimado', value: '72' }
                  ].map((row) => (
                    <div key={row.label} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                      <p className="text-xs uppercase tracking-[0.22em] text-slate-500">{row.label}</p>
                      <p className="mt-2 text-2xl font-black text-white">{row.value}</p>
                    </div>
                  ))}
                </div>
              </SectionCard>
            </div>
          </div>
        </div>
      );
    }

    if (currentSection === 'users') {
      const totalPages = Math.max(1, Math.ceil(filteredUsers.length / 8));
      return (
        <div className="space-y-5">
          <SectionCard
            title="Usuarios do ecossistema"
            subtitle="CRUD completo com filtros, perfil, historico, permissao e exportacao."
            isDarkTheme={isDarkTheme}
            actions={
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={exportUsers} className="rounded-2xl border border-white/10 px-3 py-2 text-xs font-semibold text-cyan-300 hover:bg-white/10">Exportar CSV</button>
                <button type="button" onClick={() => showToast('Fluxo de convite pronto para backend')} className="rounded-2xl bg-gradient-to-r from-cyan-400 to-blue-500 px-4 py-2 text-xs font-bold text-slate-950">Novo usuario</button>
              </div>
            }
          >
            <div className="grid gap-4 lg:grid-cols-[1fr_auto_auto_auto]">
              <label className="relative block">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input value={userSearch} onChange={(event) => { setUserSearch(event.target.value); setPageUsers(1); }} placeholder="Buscar por nome, email ou empresa" className="w-full rounded-2xl border border-white/10 bg-black/20 py-3 pl-10 pr-4 text-sm text-slate-100 outline-none focus:border-cyan-400" />
              </label>
              <select value={userStatusFilter} onChange={(event) => { setUserStatusFilter(event.target.value as 'Todos' | UserStatus); setPageUsers(1); }} className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-slate-100">
                <option>Todos</option>
                <option>Ativo</option>
                <option>Suspenso</option>
                <option>Pendente</option>
              </select>
              <select value={permissionFilter} onChange={(event) => { setPermissionFilter(event.target.value as 'Todos' | PermissionLevel); setPageUsers(1); }} className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-slate-100">
                <option>Todos</option>
                <option value="root">Root</option>
                <option value="admin">Admin</option>
                <option value="support">Suporte</option>
                <option value="success">CSM</option>
              </select>
              <button type="button" onClick={() => showToast('Filtros avancados prontos para backend')} className="rounded-2xl border border-white/10 px-4 py-3 text-sm font-semibold text-slate-200 hover:bg-white/10">Filtros avancados</button>
            </div>

            <div className="mt-5 overflow-x-auto">
              <table className="w-full min-w-[1120px] text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-left text-[11px] uppercase tracking-[0.22em] text-slate-500">
                    <th className="px-3 py-3">Usuario</th>
                    <th className="px-3 py-3">Empresa</th>
                    <th className="px-3 py-3">Permissao</th>
                    <th className="px-3 py-3">Plano</th>
                    <th className="px-3 py-3">Status</th>
                    <th className="px-3 py-3">Ultima atividade</th>
                    <th className="px-3 py-3 text-right">Acoes</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedUsers.map((user) => (
                    <tr key={user.id} className="border-b border-white/5">
                      <td className="px-3 py-4">
                        <div>
                          <p className="font-semibold text-white">{user.name}</p>
                          <p className="text-xs text-slate-400">{user.email} · {user.ip}</p>
                        </div>
                      </td>
                      <td className="px-3 py-4 text-slate-300">{user.companyName}</td>
                      <td className="px-3 py-4"><span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-cyan-200">{permissionLabel[user.permission]}</span></td>
                      <td className="px-3 py-4 text-slate-300">{user.plan}</td>
                      <td className="px-3 py-4"><span className={[ 'rounded-full px-3 py-1 text-xs font-semibold', user.status === 'Ativo' ? 'bg-emerald-500/15 text-emerald-300' : user.status === 'Suspenso' ? 'bg-rose-500/15 text-rose-300' : 'bg-amber-500/15 text-amber-300' ].join(' ')}>{user.status}</span></td>
                      <td className="px-3 py-4 text-slate-300">{user.lastActive}</td>
                      <td className="px-3 py-4">
                        <div className="flex justify-end gap-2">
                          <button type="button" onClick={() => setSelectedUser(user)} className="rounded-xl border border-white/10 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-white/10">Ver perfil</button>
                          <button type="button" onClick={() => showToast(`Reset de senha enviado para ${user.email}`)} className="rounded-xl border border-amber-400/20 px-3 py-1.5 text-xs font-semibold text-amber-300 hover:bg-amber-500/10">Resetar senha</button>
                          <button type="button" onClick={() => void handleUserStatus(user)} className="rounded-xl border border-white/10 px-3 py-1.5 text-xs font-semibold text-cyan-300 hover:bg-white/10">{user.status === 'Suspenso' ? 'Ativar' : 'Suspender'}</button>
                          <button type="button" onClick={() => { setCriticalAction('delete-user'); setCriticalPayloadId(user.id); }} className="rounded-xl border border-rose-400/30 px-3 py-1.5 text-xs font-semibold text-rose-300 hover:bg-rose-500/10">Excluir</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex items-center justify-between gap-3">
              <p className="text-xs text-slate-500">{filteredUsers.length} usuarios encontrados</p>
              <div className="flex items-center gap-2">
                <button type="button" disabled={pageUsers === 1} onClick={() => setPageUsers((current) => Math.max(1, current - 1))} className="rounded-xl border border-white/10 px-3 py-2 text-xs font-semibold text-slate-200 disabled:opacity-40">Anterior</button>
                <span className="text-xs font-semibold text-slate-400">Pagina {pageUsers} de {totalPages}</span>
                <button type="button" disabled={pageUsers === totalPages} onClick={() => setPageUsers((current) => Math.min(totalPages, current + 1))} className="rounded-xl border border-white/10 px-3 py-2 text-xs font-semibold text-slate-200 disabled:opacity-40">Proxima</button>
              </div>
            </div>
          </SectionCard>
        </div>
      );
    }

    if (currentSection === 'companies') {
      const totalPages = Math.max(1, Math.ceil(filteredCompanies.length / 7));
      return (
        <SectionCard
          title="Empresas SaaS"
          subtitle="Gestao completa de clientes, dados, usuarios vinculados e logs de uso."
          isDarkTheme={isDarkTheme}
          actions={
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={exportCompanies} className="rounded-2xl border border-white/10 px-3 py-2 text-xs font-semibold text-cyan-300 hover:bg-white/10">Exportar JSON</button>
              <button type="button" onClick={() => void triggerRefresh()} className="rounded-2xl border border-white/10 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-white/10">Atualizar</button>
            </div>
          }
        >
          <div className="grid gap-4 lg:grid-cols-[1fr_auto_auto]">
            <label className="relative block">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input value={companySearch} onChange={(event) => { setCompanySearch(event.target.value); setPageCompanies(1); }} placeholder="Buscar empresa ou localizacao" className="w-full rounded-2xl border border-white/10 bg-black/20 py-3 pl-10 pr-4 text-sm text-slate-100 outline-none focus:border-cyan-400" />
            </label>
            <select value={companyStatusFilter} onChange={(event) => { setCompanyStatusFilter(event.target.value as 'Todos' | CompanyStatus); setPageCompanies(1); }} className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-slate-100">
              <option>Todos</option>
              <option value="ACTIVE">ACTIVE</option>
              <option value="PAST_DUE">PAST_DUE</option>
              <option value="CANCELED">CANCELED</option>
              <option value="BLOCKED">BLOCKED</option>
            </select>
            <button type="button" onClick={() => showToast('Criacao de empresa pronta para backend')} className="rounded-2xl bg-gradient-to-r from-cyan-400 to-blue-500 px-4 py-3 text-xs font-bold text-slate-950">Nova empresa</button>
          </div>

          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[1080px] text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left text-[11px] uppercase tracking-[0.22em] text-slate-500">
                  <th className="px-3 py-3">Empresa</th>
                  <th className="px-3 py-3">Plano</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-3 py-3">Usuarios</th>
                  <th className="px-3 py-3">Uso</th>
                  <th className="px-3 py-3">Expira em</th>
                  <th className="px-3 py-3 text-right">Acoes</th>
                </tr>
              </thead>
              <tbody>
                {pagedCompanies.map((company) => (
                  <tr key={company.id} className="border-b border-white/5">
                    <td className="px-3 py-4">
                      <p className="font-semibold text-white">{company.name}</p>
                      <p className="text-xs text-slate-400">{company.location} · owner {company.owner}</p>
                    </td>
                    <td className="px-3 py-4">
                      <select value={company.plan} onChange={(event) => void handleCompanyPlan(company, event.target.value as CompanyPlan)} className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-xs text-slate-100">
                        <option value="BASIC">BASIC</option>
                        <option value="PRO">PRO</option>
                        <option value="PREMIUM">PREMIUM</option>
                      </select>
                    </td>
                    <td className="px-3 py-4"><span className={[ 'rounded-full px-3 py-1 text-xs font-semibold', company.status === 'ACTIVE' ? 'bg-emerald-500/15 text-emerald-300' : company.status === 'BLOCKED' ? 'bg-rose-500/15 text-rose-300' : 'bg-amber-500/15 text-amber-300' ].join(' ')}>{company.status}</span></td>
                    <td className="px-3 py-4 text-slate-300">{company.users}</td>
                    <td className="px-3 py-4 text-slate-300">{company.usage}</td>
                    <td className="px-3 py-4 text-slate-300">{fmtDate(company.expiresAt)}</td>
                    <td className="px-3 py-4">
                      <div className="flex justify-end gap-2">
                        <button type="button" onClick={() => setSelectedCompany(company)} className="rounded-xl border border-white/10 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-white/10">Ver dados</button>
                        <button type="button" onClick={() => accessCompanyContext(company.id)} className="rounded-xl border border-cyan-400/30 px-3 py-1.5 text-xs font-semibold text-cyan-300 hover:bg-cyan-500/10">Contexto</button>
                        <button type="button" onClick={() => void handleCompanyBlock(company)} className="rounded-xl border border-rose-400/30 px-3 py-1.5 text-xs font-semibold text-rose-300 hover:bg-rose-500/10">{company.status === 'BLOCKED' ? 'Desbloquear' : 'Bloquear'}</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex items-center justify-between">
            <span className="text-xs text-slate-500">{filteredCompanies.length} empresas listadas</span>
            <div className="flex items-center gap-2">
              <button type="button" disabled={pageCompanies === 1} onClick={() => setPageCompanies((current) => Math.max(1, current - 1))} className="rounded-xl border border-white/10 px-3 py-2 text-xs font-semibold text-slate-200 disabled:opacity-40">Anterior</button>
              <span className="text-xs font-semibold text-slate-400">Pagina {pageCompanies} de {totalPages}</span>
              <button type="button" disabled={pageCompanies === totalPages} onClick={() => setPageCompanies((current) => Math.min(totalPages, current + 1))} className="rounded-xl border border-white/10 px-3 py-2 text-xs font-semibold text-slate-200 disabled:opacity-40">Proxima</button>
            </div>
          </div>
        </SectionCard>
      );
    }

    if (currentSection === 'billing') {
      const totalPages = Math.max(1, Math.ceil(filteredPayments.length / 7));
      return (
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <MiniStat label="Receita total" value={fmtCurrency(totals.revenueTotal)} hint="Historico consolidado do painel" icon={<CreditCard className="h-5 w-5 text-white" />} accent="linear-gradient(135deg,#14b8a6,#0f766e)" isDarkTheme={isDarkTheme} />
            <MiniStat label="MRR" value={fmtCurrency(adminOverview.mrr)} hint="Clientes recorrentes ativos" icon={<TrendingUp className="h-5 w-5 text-white" />} accent="linear-gradient(135deg,#38bdf8,#2563eb)" isDarkTheme={isDarkTheme} />
            <MiniStat label="Clientes ativos" value={String(totals.activeClients)} hint="Assinaturas sem bloqueio" icon={<BadgeCheck className="h-5 w-5 text-white" />} accent="linear-gradient(135deg,#f59e0b,#ea580c)" isDarkTheme={isDarkTheme} />
          </div>

          <SectionCard title="Assinaturas e faturamento" subtitle="Planos ativos, faturas, pagamentos e reembolsos." isDarkTheme={isDarkTheme}>
            <div className="mb-4 flex flex-wrap gap-2">
              <select value={billingFilter} onChange={(event) => { setBillingFilter(event.target.value as 'Todos' | PaymentRow['status']); setPagePayments(1); }} className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-slate-100">
                <option>Todos</option>
                <option>Pago</option>
                <option>Pendente</option>
                <option>Falhou</option>
                <option>Reembolsado</option>
              </select>
              <button type="button" onClick={() => showToast('Relatorio financeiro exportado')} className="rounded-2xl border border-white/10 px-4 py-3 text-sm font-semibold text-cyan-300 hover:bg-white/10">Exportar faturas</button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-left text-[11px] uppercase tracking-[0.22em] text-slate-500">
                    <th className="px-3 py-3">Cliente</th>
                    <th className="px-3 py-3">Plano</th>
                    <th className="px-3 py-3">Valor</th>
                    <th className="px-3 py-3">Metodo</th>
                    <th className="px-3 py-3">Status</th>
                    <th className="px-3 py-3">Fatura</th>
                    <th className="px-3 py-3 text-right">Acoes</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedPayments.map((payment) => (
                    <tr key={payment.id} className="border-b border-white/5">
                      <td className="px-3 py-4 font-semibold text-white">{payment.companyName}</td>
                      <td className="px-3 py-4 text-slate-300">{payment.plan}</td>
                      <td className="px-3 py-4 text-slate-300">{fmtCurrency(payment.amount)}</td>
                      <td className="px-3 py-4 text-slate-300">{payment.method}</td>
                      <td className="px-3 py-4"><span className={[ 'rounded-full px-3 py-1 text-xs font-semibold', payment.status === 'Pago' ? 'bg-emerald-500/15 text-emerald-300' : payment.status === 'Falhou' ? 'bg-rose-500/15 text-rose-300' : payment.status === 'Reembolsado' ? 'bg-slate-500/20 text-slate-300' : 'bg-amber-500/15 text-amber-300' ].join(' ')}>{payment.status}</span></td>
                      <td className="px-3 py-4 text-slate-300">{fmtDate(payment.date)}</td>
                      <td className="px-3 py-4">
                        <div className="flex justify-end gap-2">
                          <button type="button" onClick={() => showToast(`Plano de ${payment.companyName} aberto no editor`)} className="rounded-xl border border-white/10 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-white/10">Alterar plano</button>
                          <button type="button" onClick={() => { setCriticalAction('refund-payment'); setCriticalPayloadId(payment.id); }} className="rounded-xl border border-amber-400/30 px-3 py-1.5 text-xs font-semibold text-amber-300 hover:bg-amber-500/10">Reembolsar</button>
                          <button type="button" onClick={() => showToast('Assinatura cancelada no mock administrativo')} className="rounded-xl border border-rose-400/30 px-3 py-1.5 text-xs font-semibold text-rose-300 hover:bg-rose-500/10">Cancelar</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4 flex items-center justify-between">
              <span className="text-xs text-slate-500">{filteredPayments.length} cobrancas no periodo</span>
              <div className="flex items-center gap-2">
                <button type="button" disabled={pagePayments === 1} onClick={() => setPagePayments((current) => Math.max(1, current - 1))} className="rounded-xl border border-white/10 px-3 py-2 text-xs font-semibold text-slate-200 disabled:opacity-40">Anterior</button>
                <span className="text-xs font-semibold text-slate-400">Pagina {pagePayments} de {totalPages}</span>
                <button type="button" disabled={pagePayments === totalPages} onClick={() => setPagePayments((current) => Math.min(totalPages, current + 1))} className="rounded-xl border border-white/10 px-3 py-2 text-xs font-semibold text-slate-200 disabled:opacity-40">Proxima</button>
              </div>
            </div>
          </SectionCard>
        </div>
      );
    }

    if (currentSection === 'security') {
      return (
        <div className="space-y-5">
          <div className="grid gap-4 xl:grid-cols-3">
            <MiniStat label="Logins em risco" value={String(filteredSecurity.filter((row) => row.status === 'Risco').length)} hint="Tentativas suspeitas nas ultimas 24h" icon={<ShieldAlert className="h-5 w-5 text-white" />} accent="linear-gradient(135deg,#fb7185,#e11d48)" isDarkTheme={isDarkTheme} />
            <MiniStat label="IPs bloqueados" value="18" hint="Regras automativas + bloqueio manual" icon={<Lock className="h-5 w-5 text-white" />} accent="linear-gradient(135deg,#f59e0b,#d97706)" isDarkTheme={isDarkTheme} />
            <MiniStat label="Monitor realtime" value="Online" hint="4 alertas acompanhados em tempo real" icon={<Wifi className="h-5 w-5 text-white" />} accent="linear-gradient(135deg,#22c55e,#15803d)" isDarkTheme={isDarkTheme} />
          </div>
          <SectionCard title="Seguranca e acessos" subtitle="Logs de login, IPs, tentativas e bloqueios suspeitos." isDarkTheme={isDarkTheme} actions={<select value={securityFilter} onChange={(event) => setSecurityFilter(event.target.value as 'Todos' | SecurityLog['status'])} className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-slate-100"><option>Todos</option><option>OK</option><option>Risco</option><option>Bloqueado</option></select>}>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-left text-[11px] uppercase tracking-[0.22em] text-slate-500">
                    <th className="px-3 py-3">Usuario</th>
                    <th className="px-3 py-3">IP</th>
                    <th className="px-3 py-3">Dispositivo</th>
                    <th className="px-3 py-3">Origem</th>
                    <th className="px-3 py-3">Status</th>
                    <th className="px-3 py-3">Horario</th>
                    <th className="px-3 py-3 text-right">Acoes</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSecurity.map((log) => (
                    <tr key={log.id} className="border-b border-white/5">
                      <td className="px-3 py-4"><p className="font-semibold text-white">{log.actor}</p><p className="text-xs text-slate-400">{log.email}</p></td>
                      <td className="px-3 py-4 text-slate-300">{log.ip}</td>
                      <td className="px-3 py-4 text-slate-300">{log.device}</td>
                      <td className="px-3 py-4 text-slate-300">{log.location}</td>
                      <td className="px-3 py-4"><span className={[ 'rounded-full px-3 py-1 text-xs font-semibold', log.status === 'OK' ? 'bg-emerald-500/15 text-emerald-300' : log.status === 'Risco' ? 'bg-amber-500/15 text-amber-300' : 'bg-rose-500/15 text-rose-300' ].join(' ')}>{log.status}</span></td>
                      <td className="px-3 py-4 text-slate-300">{fmtDate(log.time)}</td>
                      <td className="px-3 py-4"><div className="flex justify-end gap-2"><button type="button" onClick={() => showToast(`IP ${log.ip} copiado para triagem`)} className="rounded-xl border border-white/10 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-white/10">Investigar</button><button type="button" onClick={() => { setCriticalAction('suspend-user'); setCriticalPayloadId(log.id); }} className="rounded-xl border border-rose-400/30 px-3 py-1.5 text-xs font-semibold text-rose-300 hover:bg-rose-500/10">Bloquear</button></div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SectionCard>
        </div>
      );
    }

    if (currentSection === 'notifications') {
      return (
        <div className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
          <SectionCard title="Notificacoes globais" subtitle="Enviar avisos para toda a base com banner, email e in-app." isDarkTheme={isDarkTheme}>
            <div className="grid gap-4">
              <input value={localBannerTitle} onChange={(event) => setLocalBannerTitle(event.target.value)} className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-slate-100 outline-none focus:border-cyan-400" placeholder="Titulo do banner" />
              <textarea value={localBannerBody} onChange={(event) => setLocalBannerBody(event.target.value)} rows={4} className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-slate-100 outline-none focus:border-cyan-400" placeholder="Mensagem global" />
              <textarea value={massEmail} onChange={(event) => setMassEmail(event.target.value)} rows={5} className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-slate-100 outline-none focus:border-cyan-400" placeholder="Mensagem do email em massa" />
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => showToast('Banner global publicado')} className="rounded-2xl bg-gradient-to-r from-cyan-400 to-blue-500 px-4 py-3 text-sm font-bold text-slate-950">Publicar banner</button>
                <button type="button" onClick={() => showToast('Campanha de email enfileirada')} className="rounded-2xl border border-white/10 px-4 py-3 text-sm font-semibold text-slate-200 hover:bg-white/10">Enviar email em massa</button>
              </div>
              <div className="rounded-[24px] border border-cyan-400/20 bg-cyan-500/10 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-300">Preview do banner</p>
                <div className="mt-3 rounded-2xl border border-white/10 bg-slate-950/60 p-4">
                  <p className="text-sm font-bold text-white">{localBannerTitle}</p>
                  <p className="mt-2 text-sm text-slate-300">{localBannerBody}</p>
                </div>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Historico de campanhas" subtitle="Comunicados recentes, rascunhos e audience targeting." isDarkTheme={isDarkTheme}>
            <div className="grid gap-3">
              {campaigns.map((campaign) => (
                <div key={campaign.id} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-white">{campaign.title}</p>
                      <p className="mt-1 text-xs text-slate-400">{campaign.channel} · {campaign.audience} · {campaign.sentAt}</p>
                    </div>
                    <span className={[ 'rounded-full px-3 py-1 text-xs font-semibold', campaign.status === 'Enviado' ? 'bg-emerald-500/15 text-emerald-300' : campaign.status === 'Agendado' ? 'bg-cyan-500/15 text-cyan-300' : 'bg-slate-500/20 text-slate-300' ].join(' ')}>{campaign.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>
      );
    }

    if (currentSection === 'api') {
      return (
        <div className="space-y-5">
          <div className="grid gap-4 xl:grid-cols-3">
            <MiniStat label="Rate limit global" value={`${apiRateLimit} req/min`} hint="Teto padrao aplicado por cliente" icon={<Zap className="h-5 w-5 text-white" />} accent="linear-gradient(135deg,#06b6d4,#2563eb)" isDarkTheme={isDarkTheme} />
            <MiniStat label="Webhooks ativos" value={String(apiUsage.filter((row) => row.webhook === 'Ativo').length)} hint="Integracoes operando em producao" icon={<Globe className="h-5 w-5 text-white" />} accent="linear-gradient(135deg,#8b5cf6,#4f46e5)" isDarkTheme={isDarkTheme} />
            <MiniStat label="Erro medio" value={`${(apiUsage.reduce((acc, row) => acc + row.errorRate, 0) / apiUsage.length).toFixed(2)}%`} hint="Media das ultimas 24 horas" icon={<Activity className="h-5 w-5 text-white" />} accent="linear-gradient(135deg,#f97316,#ea580c)" isDarkTheme={isDarkTheme} />
          </div>

          <SectionCard title="Integracoes e API global" subtitle="Uso por cliente, limites, logs e governanca da plataforma." isDarkTheme={isDarkTheme} actions={<div className="flex gap-2"><button type="button" onClick={() => setCriticalAction('reset-api')} className="rounded-2xl border border-amber-400/30 px-3 py-2 text-xs font-semibold text-amber-300 hover:bg-amber-500/10">Resetar API global</button><button type="button" onClick={() => showToast('Logs de requisicao exportados')} className="rounded-2xl border border-white/10 px-3 py-2 text-xs font-semibold text-cyan-300 hover:bg-white/10">Exportar logs</button></div>}>
            <div className="mb-4 grid gap-4 lg:grid-cols-[1fr_auto]">
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Limite padrao</p>
                <div className="mt-3 flex items-center gap-3">
                  <input type="range" min="200" max="2500" step="100" value={apiRateLimit} onChange={(event) => setApiRateLimit(Number(event.target.value))} className="w-full accent-cyan-400" />
                  <span className="min-w-[90px] rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-center text-sm font-semibold text-white">{apiRateLimit}</span>
                </div>
              </div>
              <button type="button" onClick={() => showToast('Rate limit global salvo')} className="rounded-2xl bg-gradient-to-r from-cyan-400 to-blue-500 px-4 py-3 text-sm font-bold text-slate-950">Salvar limites</button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-left text-[11px] uppercase tracking-[0.22em] text-slate-500">
                    <th className="px-3 py-3">Cliente</th>
                    <th className="px-3 py-3">Requests</th>
                    <th className="px-3 py-3">Limite</th>
                    <th className="px-3 py-3">Latencia</th>
                    <th className="px-3 py-3">Erro</th>
                    <th className="px-3 py-3">Webhook</th>
                    <th className="px-3 py-3 text-right">Acoes</th>
                  </tr>
                </thead>
                <tbody>
                  {apiUsage.map((row) => (
                    <tr key={row.id} className="border-b border-white/5">
                      <td className="px-3 py-4 font-semibold text-white">{row.companyName}</td>
                      <td className="px-3 py-4 text-slate-300">{row.requests.toLocaleString('pt-BR')}</td>
                      <td className="px-3 py-4 text-slate-300">{row.limit.toLocaleString('pt-BR')}</td>
                      <td className="px-3 py-4 text-slate-300">{row.latency}ms</td>
                      <td className="px-3 py-4 text-slate-300">{row.errorRate}%</td>
                      <td className="px-3 py-4"><span className={[ 'rounded-full px-3 py-1 text-xs font-semibold', row.webhook === 'Ativo' ? 'bg-emerald-500/15 text-emerald-300' : 'bg-amber-500/15 text-amber-300' ].join(' ')}>{row.webhook}</span></td>
                      <td className="px-3 py-4"><div className="flex justify-end gap-2"><button type="button" onClick={() => showToast(`Logs de ${row.companyName} abertos`)} className="rounded-xl border border-white/10 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-white/10">Logs</button><button type="button" onClick={() => showToast(`Limite dedicado aplicado a ${row.companyName}`)} className="rounded-xl border border-cyan-400/30 px-3 py-1.5 text-xs font-semibold text-cyan-300 hover:bg-cyan-500/10">Limitar</button></div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SectionCard>
        </div>
      );
    }

    return (
      <div className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
        <SectionCard title="Configuracoes globais" subtitle="Planos, precos, limites e parametros da plataforma." isDarkTheme={isDarkTheme} actions={<div className="flex gap-2"><button type="button" onClick={() => savePlanEditor()} className="rounded-2xl bg-gradient-to-r from-cyan-400 to-blue-500 px-4 py-2 text-xs font-bold text-slate-950">Salvar plano</button><button type="button" onClick={() => openPlanEditor()} className="rounded-2xl border border-white/10 px-4 py-2 text-xs font-semibold text-slate-200 hover:bg-white/10">Novo plano</button></div>}>
          <div className="grid gap-4">
            <div className="grid gap-3 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="grid gap-3">
                <input value={planEditorName} onChange={(event) => setPlanEditorName(event.target.value)} placeholder="Nome do plano" className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-slate-100 outline-none focus:border-cyan-400" />
                <input value={planEditorPrice} onChange={(event) => setPlanEditorPrice(event.target.value)} type="number" min="0" placeholder="Preco mensal" className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-slate-100 outline-none focus:border-cyan-400" />
                <textarea value={planEditorFeatures} onChange={(event) => setPlanEditorFeatures(event.target.value)} rows={6} placeholder="Features (uma por linha)" className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-slate-100 outline-none focus:border-cyan-400" />
              </div>
              <div className="grid gap-3">
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Permissoes</p>
                  <div className="mt-3 grid gap-2 text-sm text-slate-300">
                    {Object.entries(permissionsDraft).map(([role, scopes]) => (
                      <div key={role} className="rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2">
                        <p className="font-semibold capitalize text-white">{role}</p>
                        <p className="mt-1 text-xs text-slate-400">{scopes.join(' · ')}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Limites globais</p>
                  <div className="mt-3 grid gap-2 text-sm text-slate-300">
                    <div className="flex items-center justify-between rounded-xl border border-white/10 px-3 py-2"><span>Usuarios por workspace</span><strong>500</strong></div>
                    <div className="flex items-center justify-between rounded-xl border border-white/10 px-3 py-2"><span>Armazenamento maximo</span><strong>5 TB</strong></div>
                    <div className="flex items-center justify-between rounded-xl border border-white/10 px-3 py-2"><span>Webhooks por cliente</span><strong>25</strong></div>
                  </div>
                </div>
              </div>
            </div>
            <div className="grid gap-3">
              {planCatalog.map((plan) => (
                <div key={plan.id} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-white">{plan.name}</p>
                      <p className="mt-1 text-xs text-cyan-300">{fmtCurrency(plan.price)}/mes</p>
                      <p className="mt-2 text-xs text-slate-400">{plan.features.join(' • ')}</p>
                    </div>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => openPlanEditor(plan)} className="rounded-xl border border-white/10 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-white/10">Editar</button>
                      <button type="button" onClick={() => deletePlanItem(plan.id)} className="rounded-xl border border-rose-400/30 px-3 py-1.5 text-xs font-semibold text-rose-300 hover:bg-rose-500/10">Excluir</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Governanca do sistema" subtitle="Matriz de operacao, exportacoes e guardrails da plataforma." isDarkTheme={isDarkTheme}>
          <div className="grid gap-3">
            <button type="button" onClick={() => showToast('Snapshot global exportado em CSV')} className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm font-semibold text-slate-200 hover:bg-white/10"><span className="flex items-center gap-3"><Download className="h-4 w-4" />Exportar snapshot CSV</span><ChevronRight className="h-4 w-4" /></button>
            <button type="button" onClick={() => showToast('Config global publicada')} className="flex items-center justify-between rounded-2xl border border-cyan-400/20 bg-cyan-500/10 px-4 py-3 text-sm font-semibold text-cyan-200 hover:bg-cyan-500/15"><span className="flex items-center gap-3"><ServerCog className="h-4 w-4" />Publicar configuracoes globais</span><ChevronRight className="h-4 w-4" /></button>
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Editor atual</p>
              <p className="mt-2 text-lg font-black text-white">{planEditorId ? `Modo edicao: ${planEditorId}` : 'Criacao de novo plano'}</p>
            </div>
          </div>
        </SectionCard>
      </div>
    );
  };

  return (
    <div className="mx-auto w-full max-w-[1680px]">
      <div className="grid gap-5 xl:grid-cols-[290px_minmax(0,1fr)]">
        <aside className="xl:sticky xl:top-6 xl:self-start">
          <div className={[shell, 'overflow-hidden p-4'].join(' ')}>
            <div className="mb-4 rounded-[26px] border border-cyan-400/15 bg-[linear-gradient(135deg,rgba(34,211,238,0.14),rgba(59,130,246,0.12),rgba(139,92,246,0.14))] p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-cyan-100"><Sparkles className="h-5 w-5" /></div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-cyan-300">Root control</p>
                  <p className="mt-1 text-lg font-black text-white">SYNCHO Admin Cloud</p>
                </div>
              </div>
              <p className="mt-4 text-sm text-slate-300">Painel root com acesso total a clientes, faturamento, seguranca e operacao global.</p>
            </div>

            <nav className="grid gap-2">
              {navigation.map((item) => {
                const Icon = item.icon;
                const active = currentSection === item.id;
                return (
                  <motion.button
                    key={item.id}
                    whileHover={{ x: 3 }}
                    whileTap={{ scale: 0.985 }}
                    type="button"
                    onClick={() => {
                      setCurrentSection(item.id);
                      setAdminSection(item.sync);
                    }}
                    className={[
                      'flex items-center justify-between rounded-[22px] border px-4 py-3 text-left transition-all',
                      active ? 'border-cyan-400/50 bg-cyan-500/10 text-cyan-200 shadow-[0_0_0_4px_rgba(34,211,238,0.07)]' : 'border-white/10 bg-white/[0.03] text-slate-300 hover:bg-white/[0.07]'
                    ].join(' ')}
                  >
                    <span className="flex items-center gap-3">
                      <span className={['flex h-10 w-10 items-center justify-center rounded-2xl', active ? 'bg-cyan-400/15 text-cyan-200' : 'bg-white/10 text-slate-300'].join(' ')}><Icon className="h-4 w-4" /></span>
                      <span>
                        <span className="block text-sm font-bold">{item.label}</span>
                        <span className="block text-xs text-slate-400">Operacao e controle</span>
                      </span>
                    </span>
                    <ChevronRight className="h-4 w-4" />
                  </motion.button>
                );
              })}
            </nav>
          </div>
        </aside>

        <div className="space-y-5">
          <div className={[shell, 'relative overflow-visible p-5'].join(' ')}>
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-cyan-300">Plataforma SYNCHO</p>
                <h1 className="mt-2 text-3xl font-black text-white">Painel administrativo root</h1>
                <p className="mt-1 text-sm text-slate-400">Estrutura pronta para producao com dados mock realistas, modais, filtros e operacao total.</p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="relative min-w-[320px] max-w-[520px] flex-1 xl:min-w-[420px]">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <input value={globalSearch} onChange={(event) => setGlobalSearch(event.target.value)} placeholder="Buscar usuarios, empresas, logs e API" className="w-full rounded-2xl border border-white/10 bg-black/20 py-3 pl-10 pr-4 text-sm text-slate-100 outline-none focus:border-cyan-400" />
                  {searchResults.length ? (
                    <div className="absolute left-0 right-0 top-[calc(100%+10px)] z-20 rounded-[24px] border border-white/10 bg-slate-950/95 p-2 shadow-2xl backdrop-blur-xl">
                      {searchResults.map((item) => (
                        <button key={item.id} type="button" onClick={() => showToast(`${item.type}: ${item.label}`)} className="flex w-full items-center justify-between rounded-2xl px-3 py-3 text-left hover:bg-white/5">
                          <span>
                            <span className="block text-sm font-semibold text-white">{item.label}</span>
                            <span className="block text-xs text-slate-400">{item.hint}</span>
                          </span>
                          <span className="rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold text-cyan-200">{item.type}</span>
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>

                <button type="button" onClick={() => void triggerRefresh()} className="rounded-2xl border border-white/10 px-4 py-3 text-sm font-semibold text-slate-200 hover:bg-white/10"><span className="flex items-center gap-2"><RefreshCw className="h-4 w-4" />Atualizar</span></button>
                <button type="button" onClick={() => showToast('Central de alertas aberta')} className="relative rounded-2xl border border-white/10 px-4 py-3 text-sm font-semibold text-slate-200 hover:bg-white/10"><span className="flex items-center gap-2"><Bell className="h-4 w-4" />Alertas</span><span className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-cyan-400 text-[10px] font-black text-slate-950">7</span></button>
                <div className="flex items-center gap-1 rounded-2xl border border-white/10 bg-white/[0.04] p-1">
                  <button type="button" onClick={() => setUiTheme('light')} className={[ 'rounded-xl px-3 py-2 text-xs font-semibold transition-all', uiTheme === 'light' ? 'bg-white text-slate-900 shadow' : 'text-slate-400 hover:text-slate-200' ].join(' ')}><span className="flex items-center gap-2"><Sun className="h-4 w-4" />Claro</span></button>
                  <button type="button" onClick={() => setUiTheme('dark')} className={[ 'rounded-xl px-3 py-2 text-xs font-semibold transition-all', uiTheme === 'dark' ? 'bg-cyan-400 text-slate-950 shadow' : 'text-slate-400 hover:text-slate-200' ].join(' ')}><span className="flex items-center gap-2"><Moon className="h-4 w-4" />Escuro</span></button>
                </div>
                <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2.5">
                  <div className="text-right">
                    <p className="text-sm font-semibold text-white">{displayUserName}</p>
                    <p className="text-xs text-slate-400">{displayUserEmail}</p>
                  </div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-600 text-sm font-black text-slate-950">
                    {(displayUserName || 'A').slice(0, 1).toUpperCase()}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={currentSection}
              initial={{ opacity: 0, y: 12, x: 18 }}
              animate={{ opacity: 1, y: 0, x: 0 }}
              exit={{ opacity: 0, y: -6, x: -14 }}
              transition={{ duration: 0.24, ease: 'easeOut' }}
            >
              {sectionContent()}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      <AnimatePresence>
        {selectedUser ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[90] grid place-items-center bg-slate-950/70 p-4 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, y: 20, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 12, scale: 0.98 }} className={[shell, 'w-full max-w-3xl p-6'].join(' ')}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-cyan-300">Perfil completo</p>
                  <h3 className="mt-2 text-2xl font-black text-white">{selectedUser.name}</h3>
                  <p className="mt-1 text-sm text-slate-400">{selectedUser.email} · {selectedUser.companyName}</p>
                </div>
                <button type="button" onClick={() => setSelectedUser(null)} className="rounded-2xl border border-white/10 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-white/10">Fechar</button>
              </div>
              <div className="mt-6 grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
                <div className="space-y-3">
                  {[
                    ['Permissao', permissionLabel[selectedUser.permission]],
                    ['Status', selectedUser.status],
                    ['Plano', selectedUser.plan],
                    ['Ultimo acesso', selectedUser.lastActive],
                    ['IP', selectedUser.ip]
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                      <p className="text-xs uppercase tracking-[0.22em] text-slate-500">{label}</p>
                      <p className="mt-2 text-sm font-semibold text-white">{value}</p>
                    </div>
                  ))}
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Historico de atividades</p>
                  <div className="mt-4 grid gap-3">
                    {selectedUser.activity.map((item) => (
                      <div key={item} className="rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-slate-300">{item}</div>
                    ))}
                    <div className="rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-slate-300">Alterou plano para {selectedUser.plan} e gerou exportacao CSV.</div>
                    <div className="rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-slate-300">Reset de senha solicitado via root admin.</div>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {selectedCompany ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[90] grid place-items-center bg-slate-950/70 p-4 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, y: 20, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 12, scale: 0.98 }} className={[shell, 'w-full max-w-4xl p-6'].join(' ')}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-cyan-300">Workspace cliente</p>
                  <h3 className="mt-2 text-2xl font-black text-white">{selectedCompany.name}</h3>
                  <p className="mt-1 text-sm text-slate-400">{selectedCompany.location} · owner {selectedCompany.owner}</p>
                </div>
                <button type="button" onClick={() => setSelectedCompany(null)} className="rounded-2xl border border-white/10 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-white/10">Fechar</button>
              </div>
              <div className="mt-6 grid gap-5 lg:grid-cols-2">
                <div className="grid gap-3">
                  {[
                    ['Plano', selectedCompany.plan],
                    ['Status', selectedCompany.status],
                    ['Usuarios vinculados', String(selectedCompany.users)],
                    ['Uso atual', selectedCompany.usage],
                    ['Expiracao', fmtDate(selectedCompany.expiresAt)]
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                      <p className="text-xs uppercase tracking-[0.22em] text-slate-500">{label}</p>
                      <p className="mt-2 text-sm font-semibold text-white">{value}</p>
                    </div>
                  ))}
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Usuarios vinculados</p>
                  <div className="mt-4 grid gap-3">
                    {mockUsers.filter((user) => user.companyId === selectedCompany.id).slice(0, 6).map((user) => (
                      <div key={user.id} className="rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3">
                        <p className="text-sm font-semibold text-white">{user.name}</p>
                        <p className="mt-1 text-xs text-slate-400">{user.email} · {permissionLabel[user.permission]}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {criticalAction ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[95] grid place-items-center bg-slate-950/75 p-4 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, y: 18, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.98 }} className={[shell, 'w-full max-w-md p-6'].join(' ')}>
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-500/15 text-rose-300"><CircleAlert className="h-5 w-5" /></div>
                <div>
                  <p className="text-lg font-black text-white">Confirmar acao critica</p>
                  <p className="mt-2 text-sm leading-6 text-slate-400">
                    {criticalAction === 'delete-user' && 'O usuario selecionado sera removido do workspace administrativo.'}
                    {criticalAction === 'block-company' && 'A empresa selecionada tera acesso imediatamente bloqueado.'}
                    {criticalAction === 'refund-payment' && 'O reembolso sera emitido e a cobranca sera marcada como revertida.'}
                    {criticalAction === 'suspend-user' && 'O acesso sera revogado e o evento ira para investigacao.'}
                    {criticalAction === 'reset-api' && 'A chave global sera renovada para toda a plataforma.'}
                  </p>
                  {criticalPayloadId ? <p className="mt-3 text-xs text-slate-500">Referencia: {criticalPayloadId}</p> : null}
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <button type="button" onClick={() => setCriticalAction(null)} className="rounded-2xl border border-white/10 px-4 py-2.5 text-sm font-semibold text-slate-200 hover:bg-white/10">Cancelar</button>
                <button type="button" onClick={confirmCritical} className="rounded-2xl bg-rose-500 px-4 py-2.5 text-sm font-bold text-white hover:bg-rose-400">Confirmar</button>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
};

export default RootAdminWorkspace;