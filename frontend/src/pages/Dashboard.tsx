import { useEffect, useMemo, useRef, useState } from 'react';
import type { DragEvent } from 'react';
import { Navigate } from 'react-router-dom';
import { io, type Socket } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';

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
  role: 'ADMIN' | 'CLIENT';
  company_id?: string | null;
  companyId?: string | null;
  access_until?: string | null;
  accessUntil?: string | null;
};

type Product = {
  id: string;
  name: string;
  code: string;
  price: number;
  quantity: number;
  company_id?: string;
  companyId?: string;
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
  lowStockProducts: Array<{
    id: string;
    name: string;
    code: string;
    quantity: number;
    price: number;
  }>;
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

const columns: Array<{ key: LeadStatus; label: string }> = [
  { key: 'NOVO_CONTATO', label: 'Novo contato' },
  { key: 'EM_CONTATO', label: 'Em contato' },
  { key: 'APRESENTACAO', label: 'Apresentacao' },
  { key: 'NEGOCIACAO', label: 'Negociacao' },
  { key: 'FECHAMENTO', label: 'Fechamento' }
];

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);

const sortByPosition = (items: Lead[]) =>
  [...items].sort((left, right) => Number(left.position || 0) - Number(right.position || 0));

const Dashboard = () => {
  const { session, companyId, role, isAuthenticated, loading: authLoading, signOut } = useAuth();
  const token = session?.access_token || '';

  const [leads, setLeads] = useState<Lead[]>([]);
  const [activeView, setActiveView] = useState<'pipeline' | 'companies' | 'clients' | 'products' | 'settings' | 'sales'>('pipeline');
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
  const [userFormRole, setUserFormRole] = useState<'ADMIN' | 'CLIENT'>('CLIENT');
  const [userFormCompanyId, setUserFormCompanyId] = useState('');
  const [userFormCompanyName, setUserFormCompanyName] = useState('');
  const [userFormAccessUntil, setUserFormAccessUntil] = useState('');
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editingUserName, setEditingUserName] = useState('');
  const [editingUserEmail, setEditingUserEmail] = useState('');
  const [editingUserRole, setEditingUserRole] = useState<'ADMIN' | 'CLIENT'>('CLIENT');
  const [editingUserCompanyId, setEditingUserCompanyId] = useState('');
  const [editingUserCompanyName, setEditingUserCompanyName] = useState('');
  const [editingUserAccessUntil, setEditingUserAccessUntil] = useState('');
  const [editingUserPassword, setEditingUserPassword] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [productName, setProductName] = useState('');
  const [productCode, setProductCode] = useState('');
  const [productPrice, setProductPrice] = useState('');
  const [productQuantity, setProductQuantity] = useState('0');
  const [productCompanyId, setProductCompanyId] = useState('');
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [editingProductName, setEditingProductName] = useState('');
  const [editingProductCode, setEditingProductCode] = useState('');
  const [editingProductPrice, setEditingProductPrice] = useState('');
  const [editingProductQuantity, setEditingProductQuantity] = useState('0');
  const [settingsCompanyId, setSettingsCompanyId] = useState('');
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsSubscription, setSettingsSubscription] = useState<SubscriptionInfo | null>(null);
  const [settingsAccessUntil, setSettingsAccessUntil] = useState<string | null>(null);
  const [settingsPlan, setSettingsPlan] = useState<CompanyPlan>('BASIC');
  const [settingsExpiresAt, setSettingsExpiresAt] = useState('');
  const [settingsCompanyInfo, setSettingsCompanyInfo] = useState<CompanyInfo | null>(null);
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
  const supportSocketRef = useRef<Socket | null>(null);
  const supportTypingTimeoutRef = useRef<number | null>(null);

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
  const [salesLoading, setSalesLoading] = useState(false);
  const [salesAnalysis, setSalesAnalysis] = useState<SalesAnalysis | null>(null);
  const [uiTheme, setUiTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window === 'undefined') {
      return 'light';
    }

    return window.localStorage.getItem('dashboard-theme') === 'dark' ? 'dark' : 'light';
  });

  const isDarkTheme = uiTheme === 'dark';
  const themedPanelClass = isDarkTheme
    ? 'rounded-2xl border border-white/10 bg-white/5 p-5 shadow-sm backdrop-blur-md transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg'
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

  const companyOptions = useMemo(
    () =>
      companies.map((company) => ({
        id: String(company.id || '').trim(),
        name: String(company.name || 'Empresa sem nome').trim()
      })),
    [companies]
  );

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

  const getTargetCompanyId = (selectedForAdmin: string) => {
    if (role === 'ADMIN') {
      return selectedForAdmin.trim() || '';
    }

    return String(companyId || '').trim();
  };

  const fetchProducts = async () => {
    if (!token) {
      return;
    }

    const targetCompanyId = getTargetCompanyId(productCompanyId);

    if (!targetCompanyId) {
      setProducts([]);
      setStatus('Selecione uma empresa para visualizar produtos.');
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

  const fetchSettings = async () => {
    if (!token) {
      return;
    }

    const targetCompanyId = getTargetCompanyId(settingsCompanyId);

    if (!targetCompanyId) {
      setSettingsSubscription(null);
      setSettingsAccessUntil(null);
      setStatus('Selecione uma empresa para abrir configuracoes.');
      return;
    }

    setSettingsLoading(true);

    try {
      const response = await fetch(`/api/dashboard/company-info?companyId=${encodeURIComponent(targetCompanyId)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const result = await response.json();

      if (!response.ok) {
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

    const targetCompanyId = getTargetCompanyId(settingsCompanyId);

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

    const targetCompanyId = getTargetCompanyId(settingsCompanyId);
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
    const targetCompanyId = getTargetCompanyId(settingsCompanyId);

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

  const fetchSalesAnalysis = async () => {
    if (!token) {
      return;
    }

    const targetCompanyId = getTargetCompanyId(salesCompanyId);

    if (!targetCompanyId) {
      setSalesAnalysis(null);
      setStatus('Selecione uma empresa para ver a analise de vendas.');
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
        setStatus(result.message || 'Falha ao carregar analise de vendas.');
        return;
      }

      setSalesAnalysis(result as SalesAnalysis);
      setStatus('Analise de vendas carregada com sucesso.');
    } catch (_error) {
      setStatus('Erro de rede ao carregar analise de vendas.');
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
  }, [activeView, token, companyId, role, productCompanyId]);

  useEffect(() => {
    if (activeView === 'settings') {
      setSupportUnreadCount(0);
      void fetchSettings();
      void fetchSupportRequests();

      if (selectedSupportRequestId) {
        void fetchSupportChatMessages(selectedSupportRequestId);
      }
    }
  }, [activeView, token, companyId, role, settingsCompanyId, selectedSupportRequestId]);

  useEffect(() => {
    if (!token) {
      return;
    }

    const socket = io('/', {
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
      const targetCompanyId = getTargetCompanyId(settingsCompanyId);

      if (targetCompanyId && incoming.companyId !== targetCompanyId) {
        return;
      }

      const isOwnMessage = incoming.senderId === session?.user?.id;
      const isCurrentThread = incoming.requestId && incoming.requestId === selectedSupportRequestId;

      if (!isOwnMessage) {
        if (activeView !== 'settings' || !isCurrentThread) {
          setSupportUnreadCount((current) => current + 1);
        }

        showToast(`Nova mensagem de ${incoming.senderName || 'suporte'}`);
        playSupportNotificationTone();
      }

      if (!isCurrentThread) {
        return;
      }

      setSupportChatMessages((current) => {
        if (current.some((msg) => msg.id === incoming.id)) {
          return current;
        }

        return [...current, incoming];
      });
    });

    socket.on(
      'support:presence',
      (presence: { companyId: string; adminOnline: boolean; clientOnline: boolean }) => {
        const targetCompanyId = getTargetCompanyId(settingsCompanyId);

        if (!targetCompanyId || presence.companyId !== targetCompanyId) {
          return;
        }

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
        const targetCompanyId = getTargetCompanyId(settingsCompanyId);

        if (!targetCompanyId || typingPayload.companyId !== targetCompanyId) {
          return;
        }

        if (!selectedSupportRequestId || typingPayload.requestId !== selectedSupportRequestId) {
          return;
        }

        if (typingPayload.userId === session?.user?.id) {
          return;
        }

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
      socket.disconnect();
      supportSocketRef.current = null;
      setSupportChatConnected(false);
    };
  }, [token, activeView, settingsCompanyId, role, companyId, session?.user?.id, selectedSupportRequestId]);

  useEffect(() => {
    if (activeView !== 'settings') {
      return;
    }

    const targetCompanyId = getTargetCompanyId(settingsCompanyId);

    if (!targetCompanyId || !supportSocketRef.current?.connected) {
      return;
    }

    supportSocketRef.current.emit('support:join', { companyId: targetCompanyId });
  }, [activeView, settingsCompanyId, role, companyId, supportChatConnected]);

  useEffect(() => {
    if (activeView === 'sales') {
      void fetchProducts();
      void fetchSalesAnalysis();
    }
  }, [activeView, token, companyId, role, salesCompanyId]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('dashboard-theme', uiTheme);
    }
  }, [uiTheme]);

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

    if (userFormRole === 'CLIENT' && !userFormCompanyId.trim() && !userFormCompanyName.trim()) {
      setStatus('CLIENT precisa de uma empresa existente ou novo nome de empresa.');
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
          companyName: userFormRole === 'CLIENT' ? userFormCompanyName.trim() || null : null,
          accessUntil: userFormRole === 'CLIENT' && userFormAccessUntil ? new Date(userFormAccessUntil).toISOString() : null
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

    if (editingUserRole === 'CLIENT' && !editingUserCompanyId.trim() && !editingUserCompanyName.trim()) {
      setStatus('CLIENT precisa de empresa para salvar.');
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
          companyName: editingUserRole === 'CLIENT' ? editingUserCompanyName.trim() || null : null,
          accessUntil:
            editingUserRole === 'CLIENT'
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
      setStatus('Selecione uma empresa para criar produto.');
      return;
    }

    if (!productName.trim() || !productCode.trim() || !String(productPrice).trim()) {
      setStatus('Preencha nome, codigo e preco do produto.');
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
          code: productCode.trim(),
          price: Number(productPrice || 0),
          quantity: Number(productQuantity || 0),
          companyId: targetCompanyId
        })
      });
      const result = await response.json();

      if (!response.ok) {
        setStatus(result.message || 'Falha ao criar produto.');
        return;
      }

      setProductName('');
      setProductCode('');
      setProductPrice('');
      setProductQuantity('0');
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
    setEditingProductCode(String(product.code || ''));
    setEditingProductPrice(String(Number(product.price || 0)));
    setEditingProductQuantity(String(Number(product.quantity || 0)));
  };

  const cancelProductEditor = () => {
    setEditingProductId(null);
    setEditingProductName('');
    setEditingProductCode('');
    setEditingProductPrice('');
    setEditingProductQuantity('0');
  };

  const saveProductChanges = async () => {
    if (!token || !editingProductId) {
      return;
    }

    const targetCompanyId = getTargetCompanyId(productCompanyId);

    if (!targetCompanyId) {
      setStatus('Selecione uma empresa para editar produto.');
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
          code: editingProductCode.trim(),
          price: Number(editingProductPrice || 0),
          quantity: Number(editingProductQuantity || 0),
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
      setStatus('Selecione uma empresa para excluir produto.');
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
      await fetchSettings();
      if (role === 'ADMIN') {
        await fetchAdminData();
      }
    } catch (_error) {
      setStatus('Erro de rede ao salvar configuracoes.');
    } finally {
      setSettingsLoading(false);
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

  const removeSaleLine = (lineId: number) => {
    setSaleLines((currentLines) => {
      const nextLines = currentLines.filter((line) => line.id !== lineId);
      return nextLines.length ? nextLines : [{ id: Date.now(), productId: '', quantity: 1 }];
    });
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
          items
        })
      });
      const result = await response.json();

      if (!response.ok) {
        setStatus(result.message || 'Falha ao finalizar venda.');
        return;
      }

      setSaleLines([{ id: Date.now(), productId: '', quantity: 1 }]);
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
      <main className={[
        'min-h-screen grid place-items-center p-6',
        isDarkTheme ? 'bg-slate-950 text-slate-300' : 'bg-slate-100 text-slate-700'
      ].join(' ')}>
        Validando sessao...
      </main>
    );
  }

  if (!isAuthenticated || !token) {
    return <Navigate to="/login" replace />;
  }

  return (
    <main className={[
      'min-h-screen transition-all duration-500',
      isDarkTheme ? 'bg-gradient-to-b from-slate-950 to-slate-900 text-slate-100' : 'bg-slate-100 text-slate-900'
    ].join(' ')}>
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
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="rounded-xl border border-emerald-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 shadow-lg shadow-slate-300/40"
          >
            {toast.message}
          </div>
        ))}
      </div>

      <div className="grid min-h-screen lg:grid-cols-[250px_1fr]">
        <aside className={[
          'p-6 transition-all duration-500',
          isDarkTheme ? 'bg-[#060b1f] text-slate-100 border-r border-white/10' : 'bg-slate-900 text-slate-100'
        ].join(' ')}>
          <h2 className="text-2xl font-black">Syncho CRM</h2>
          <nav className="mt-8 grid gap-2 text-sm">
            <button type="button" onClick={() => setActiveView('pipeline')} className={["rounded-xl px-3 py-2 text-left", activeView === 'pipeline' ? 'bg-blue-600 font-semibold text-white' : 'bg-slate-800'].join(' ')}>Funil de vendas</button>
            {role === 'ADMIN' ? (
              <>
                <button type="button" onClick={() => setActiveView('companies')} className={["rounded-xl px-3 py-2 text-left", activeView === 'companies' ? 'bg-blue-600 font-semibold text-white' : 'text-slate-300 hover:bg-slate-800'].join(' ')}>
                  Empresas
                </button>
                <button type="button" onClick={() => setActiveView('clients')} className={["rounded-xl px-3 py-2 text-left", activeView === 'clients' ? 'bg-blue-600 font-semibold text-white' : 'text-slate-300 hover:bg-slate-800'].join(' ')}>
                  Clientes
                </button>
              </>
            ) : null}
            <button type="button" onClick={() => setActiveView('sales')} className={["rounded-xl px-3 py-2 text-left", activeView === 'sales' ? 'bg-blue-600 font-semibold text-white' : 'text-slate-300 hover:bg-slate-800'].join(' ')}>Vendas</button>
            <button type="button" onClick={() => setActiveView('products')} className={["rounded-xl px-3 py-2 text-left", activeView === 'products' ? 'bg-blue-600 font-semibold text-white' : 'text-slate-300 hover:bg-slate-800'].join(' ')}>Produtos</button>
            <button type="button" onClick={() => setActiveView('settings')} className={["rounded-xl px-3 py-2 text-left", activeView === 'settings' ? 'bg-blue-600 font-semibold text-white' : 'text-slate-300 hover:bg-slate-800'].join(' ')}>
              <span className="inline-flex items-center gap-2">
                Configuracoes
                {supportUnreadCount > 0 ? (
                  <span className="rounded-full bg-rose-500 px-2 py-0.5 text-xs font-bold text-white">
                    {supportUnreadCount > 99 ? '99+' : supportUnreadCount}
                  </span>
                ) : null}
              </span>
            </button>
          </nav>
          <button type="button" onClick={handleLogout} className="mt-10 w-full rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:bg-slate-800">
            Sair
          </button>
        </aside>

        <section className={[
          'p-4 transition-all duration-500 md:p-6',
          isDarkTheme ? 'bg-transparent' : ''
        ].join(' ')}>
          {activeView === 'pipeline' ? (
            <>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className={themedTitleClass}>Funil de vendas</h1>
              <p className={themedSubtextClass}>Arraste os cards entre as etapas para atualizar o status.</p>
            </div>
            <button type="button" onClick={fetchLeads} disabled={loading} className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-70">
              {loading ? 'Atualizando...' : 'Atualizar'}
            </button>
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
            <button type="button" onClick={handleCreateLead} className="mt-3 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500">
              Criar novo card
            </button>
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
                      <article
                        key={lead.id}
                        draggable
                        onDragStart={(event) => onDragStart(event, lead.id)}
                        onDragEnd={onDragEnd}
                        onDragOver={(event) => event.preventDefault()}
                        onDrop={(event) => onDropOnCard(event, column.key, lead.id)}
                        onClick={() => openEditModal(lead)}
                        className={[
                          'rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition-all duration-200',
                          draggedLeadId === lead.id
                            ? 'cursor-grabbing scale-[0.98] rotate-1 opacity-60 shadow-lg'
                            : 'cursor-pointer hover:-translate-y-0.5 hover:shadow-md',
                          recentlyMovedLeadId === lead.id ? 'ring-2 ring-emerald-200 shadow-md' : ''
                        ].join(' ')}
                      >
                        <p className="text-sm font-semibold text-slate-800">{lead.name}</p>
                        <p className="mt-1 text-xs text-slate-500">Prioridade: {lead.priority}</p>
                        <p className="mt-2 text-xs text-slate-600">{lead.notes || 'Sem observacao.'}</p>
                        <p className="mt-3 text-sm font-bold text-emerald-600">{formatCurrency(Number(lead.value || 0))}</p>
                      </article>
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
                  <select className={themedSelectClass} value={userFormRole} onChange={(event) => setUserFormRole(event.target.value as 'ADMIN' | 'CLIENT')}>
                    <option className={themedOptionClass} value="CLIENT">CLIENT</option>
                    <option className={themedOptionClass} value="ADMIN">ADMIN</option>
                  </select>
                  <select className={themedSelectClass} value={userFormCompanyId} onChange={(event) => setUserFormCompanyId(event.target.value)} disabled={userFormRole === 'ADMIN'}>
                    <option className={themedOptionClass} value="">Selecione uma empresa</option>
                    {companyOptions.map((option) => (
                      <option className={themedOptionClass} key={option.id} value={option.id}>{option.name}</option>
                    ))}
                  </select>
                  <input className={themedInputClass} placeholder="Ou criar nova empresa para o cliente" value={userFormCompanyName} onChange={(event) => setUserFormCompanyName(event.target.value)} disabled={userFormRole === 'ADMIN'} />
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
                    <select className={themedSelectClass} value={editingUserRole} onChange={(event) => setEditingUserRole(event.target.value as 'ADMIN' | 'CLIENT')}>
                      <option className={themedOptionClass} value="CLIENT">CLIENT</option>
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
                <p className={['mt-1', themedSubtextClass].join(' ')}>Gerencie cadastro, edicao e exclusao de produtos.</p>

                <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                  {role === 'ADMIN' ? (
                    <select className={themedSelectClass} value={productCompanyId} onChange={(event) => setProductCompanyId(event.target.value)}>
                      <option className={themedOptionClass} value="">Selecione a empresa</option>
                      {companyOptions.map((option) => (
                        <option className={themedOptionClass} key={option.id} value={option.id}>{option.name}</option>
                      ))}
                    </select>
                  ) : null}
                  <input className={themedInputClass} placeholder="Nome" value={productName} onChange={(event) => setProductName(event.target.value)} />
                  <input className={themedInputClass} placeholder="Codigo" value={productCode} onChange={(event) => setProductCode(event.target.value)} />
                  <input className={themedInputClass} placeholder="Preco" type="number" step="0.01" value={productPrice} onChange={(event) => setProductPrice(event.target.value)} />
                  <input className={themedInputClass} placeholder="Quantidade" type="number" value={productQuantity} onChange={(event) => setProductQuantity(event.target.value)} />
                </div>

                <div className="mt-4 flex gap-2">
                  <button type="button" onClick={handleCreateProduct} disabled={productsLoading} className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition-all duration-300 hover:-translate-y-0.5 hover:bg-slate-800 disabled:opacity-70">Criar produto</button>
                  <button type="button" onClick={fetchProducts} disabled={productsLoading} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition-all duration-300 hover:-translate-y-0.5 hover:bg-slate-100 disabled:opacity-70">Atualizar lista</button>
                </div>
              </div>

              {editingProductId ? (
                <div className={themedPanelClass}>
                  <h2 className={isDarkTheme ? 'text-lg font-bold text-white' : 'text-lg font-bold text-slate-800'}>Editar produto</h2>
                  <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    <input className={themedInputClass} value={editingProductName} onChange={(event) => setEditingProductName(event.target.value)} />
                    <input className={themedInputClass} value={editingProductCode} onChange={(event) => setEditingProductCode(event.target.value)} />
                    <input className={themedInputClass} type="number" step="0.01" value={editingProductPrice} onChange={(event) => setEditingProductPrice(event.target.value)} />
                    <input className={themedInputClass} type="number" value={editingProductQuantity} onChange={(event) => setEditingProductQuantity(event.target.value)} />
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
                        <p className={['mt-1 text-sm', themedSubtextClass].join(' ')}>Codigo: {product.code}</p>
                        <p className={isDarkTheme ? 'mt-1 text-sm text-slate-300' : 'mt-1 text-sm text-slate-600'}>Preco: {formatCurrency(Number(product.price || 0))} | Estoque: {Number(product.quantity || 0)}</p>
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

          {activeView === 'settings' ? (
            <div className="mx-auto grid w-full max-w-5xl gap-8 rounded-3xl border border-white/10 bg-gradient-to-b from-gray-950 to-slate-900 p-6 text-slate-100 shadow-2xl shadow-slate-950/40 transition-all duration-500 md:p-8">
              <div className="rounded-xl border border-white/10 bg-white/5 p-5 shadow-lg backdrop-blur-md transition-all hover:border-white/20">
                <h1 className="text-2xl font-semibold text-white">Configuracoes</h1>
                <p className="mt-1 text-sm text-gray-400">
                  {role === 'ADMIN'
                    ? 'Configure plano e vencimento da assinatura da empresa.'
                    : 'Visualize os dados da sua empresa e da sua assinatura.'}
                </p>

                <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  {role === 'ADMIN' ? (
                    <select className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30" value={settingsCompanyId} onChange={(event) => setSettingsCompanyId(event.target.value)}>
                      <option className="bg-slate-900 text-slate-100" value="">Selecione a empresa</option>
                      {companyOptions.map((option) => (
                        <option className="bg-slate-900 text-slate-100" key={option.id} value={option.id}>{option.name}</option>
                      ))}
                    </select>
                  ) : null}

                  {role === 'ADMIN' ? (
                    <select className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30" value={settingsPlan} onChange={(event) => setSettingsPlan(event.target.value as CompanyPlan)}>
                      <option className="bg-slate-900 text-slate-100" value="BASIC">BASIC</option>
                      <option className="bg-slate-900 text-slate-100" value="PRO">PRO</option>
                      <option className="bg-slate-900 text-slate-100" value="PREMIUM">PREMIUM</option>
                    </select>
                  ) : (
                    <input className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200" value={settingsSubscription?.plan || '-'} readOnly />
                  )}

                  {role === 'ADMIN' ? (
                    <input className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30" type="date" value={settingsExpiresAt} onChange={(event) => setSettingsExpiresAt(event.target.value)} />
                  ) : (
                    <input className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200" value={settingsSubscription?.expiresAt ? String(settingsSubscription.expiresAt).slice(0, 10) : '-'} readOnly />
                  )}

                  <button type="button" onClick={fetchSettings} disabled={settingsLoading} className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-blue-700 disabled:opacity-70">
                    {settingsLoading ? 'Carregando...' : 'Atualizar dados'}
                  </button>
                </div>

                {role === 'ADMIN' ? (
                  <button type="button" onClick={saveSettings} disabled={settingsLoading} className="mt-4 rounded-xl border border-white/10 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-white/20 disabled:opacity-70">
                    Salvar configuracoes
                  </button>
                ) : null}

                <div className="mt-6 rounded-xl border border-white/10 bg-white/5 p-5 text-sm text-slate-300 shadow-lg backdrop-blur-md transition-all hover:border-white/20">
                  <h2 className="mb-3 text-xl font-semibold text-white">Resumo da conta</h2>
                  <p>Empresa: <strong className="text-white">{settingsCompanyInfo?.name || '-'}</strong></p>
                  <p>Localizacao: <strong className="text-white">{settingsCompanyInfo?.location || 'Nao informada'}</strong></p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="rounded-full border border-blue-400/30 bg-blue-500/15 px-3 py-1 text-xs font-semibold text-blue-200">
                      Plano: {settingsSubscription?.plan || '-'}
                    </span>
                    <span
                      className={[
                        'rounded-full border px-3 py-1 text-xs font-semibold',
                        settingsSubscription?.status === 'ACTIVE'
                          ? 'border-emerald-400/30 bg-emerald-500/15 text-emerald-200'
                          : 'border-amber-400/30 bg-amber-500/15 text-amber-200'
                      ].join(' ')}
                    >
                      Status: {settingsSubscription?.status || '-'}
                    </span>
                  </div>
                  <p className="mt-3">Expira em: <strong className="text-white">{settingsSubscription?.expiresAt ? String(settingsSubscription.expiresAt).slice(0, 10) : '-'}</strong></p>
                  <p>Validade de acesso: <strong className="text-white">{settingsAccessUntil ? String(settingsAccessUntil).slice(0, 10) : 'Sem limite'}</strong></p>
                </div>

                {role !== 'ADMIN' ? (
                  <div className="mt-6 rounded-xl border border-white/10 bg-white/5 p-5 shadow-lg backdrop-blur-md transition-all hover:border-white/20">
                    <h2 className="text-xl font-semibold text-white">Chamar suporte</h2>
                    <p className="mt-1 text-sm text-gray-400">
                      Escreva o que deseja alterar. O pedido vai direto para o admin da plataforma.
                    </p>
                    <div className="mt-4 grid gap-3">
                      <input
                        className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30"
                        placeholder="Assunto (ex: Mudanca no plano, ajuste de conta)"
                        value={supportSubject}
                        onChange={(event) => setSupportSubject(event.target.value)}
                      />
                      <textarea
                        className="min-h-[100px] rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30"
                        placeholder="Explique o que voce quer mudar"
                        value={supportMessage}
                        onChange={(event) => setSupportMessage(event.target.value)}
                      />
                      <button
                        type="button"
                        onClick={createSupportRequest}
                        disabled={supportLoading}
                        className="w-fit rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 px-4 py-2 text-sm font-semibold text-white transition-all hover:scale-105 hover:from-blue-500 hover:to-cyan-400 disabled:opacity-70"
                      >
                        {supportLoading ? 'Enviando...' : 'Enviar para suporte'}
                      </button>
                    </div>
                  </div>
                ) : null}

                <div className="mt-6 rounded-xl border border-white/10 bg-white/5 p-5 shadow-lg backdrop-blur-md transition-all hover:border-white/20">
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="text-xl font-semibold text-white">
                      {role === 'ADMIN' ? 'Solicitacoes de suporte dos clientes' : 'Minhas solicitacoes'}
                    </h2>
                    <button
                      type="button"
                      onClick={fetchSupportRequests}
                      disabled={supportLoading}
                      className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-200 transition-all hover:bg-white/10 disabled:opacity-70"
                    >
                      Atualizar
                    </button>
                  </div>

                  <div className="mt-3 grid gap-3">
                    {supportRequests.length ? (
                      supportRequests.map((request) => {
                        const draft = supportDrafts[request.id] || {
                          status: request.status,
                          adminResponse: request.adminResponse || ''
                        };

                        return (
                          <article key={request.id} className="rounded-xl border border-white/10 bg-white/5 p-3 transition-all hover:border-white/20 hover:bg-white/10">
                            <p className="text-sm font-semibold text-white">{request.subject || 'Solicitacao sem assunto'}</p>
                            <p className="mt-1 text-sm text-slate-300">{request.message}</p>
                            <p className="mt-2 text-xs text-gray-400">
                              {role === 'ADMIN'
                                ? `Cliente: ${request.requesterName || request.requesterEmail || request.requesterId} | Empresa: ${request.companyId}`
                                : `Aberto em: ${request.createdAt ? String(request.createdAt).slice(0, 10) : '-'}`}
                            </p>

                            {role === 'ADMIN' ? (
                              <div className="mt-3 grid gap-2 md:grid-cols-[170px_1fr_auto]">
                                <select
                                  className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30"
                                  value={draft.status}
                                  onChange={(event) =>
                                    setSupportDrafts((current) => ({
                                      ...current,
                                      [request.id]: {
                                        ...draft,
                                        status: event.target.value as SupportRequestStatus
                                      }
                                    }))
                                  }
                                >
                                  <option className="bg-slate-900 text-slate-100" value="PENDING">PENDING</option>
                                  <option className="bg-slate-900 text-slate-100" value="IN_REVIEW">IN_REVIEW</option>
                                  <option className="bg-slate-900 text-slate-100" value="DONE">DONE</option>
                                </select>
                                <input
                                  className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30"
                                  placeholder="Resposta do admin"
                                  value={draft.adminResponse}
                                  onChange={(event) =>
                                    setSupportDrafts((current) => ({
                                      ...current,
                                      [request.id]: {
                                        ...draft,
                                        adminResponse: event.target.value
                                      }
                                    }))
                                  }
                                />
                                <button
                                  type="button"
                                  onClick={() => void saveSupportRequestByAdmin(request.id, request.companyId)}
                                  disabled={supportLoading}
                                  className="rounded-xl bg-blue-600 px-3 py-2 text-sm font-semibold text-white transition-all hover:bg-blue-700 disabled:opacity-70"
                                >
                                  Salvar
                                </button>
                              </div>
                            ) : (
                              <div className="mt-2 text-xs text-slate-300">
                                <p>Status: <strong className="text-white">{request.status}</strong></p>
                                <p>Resposta do admin: <strong className="text-white">{request.adminResponse || 'Aguardando retorno'}</strong></p>
                              </div>
                            )}

                            <div className="mt-3 flex items-center justify-between gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  if (selectedSupportRequestId === request.id) {
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
                                className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-200 transition-all hover:bg-white/10"
                              >
                                {selectedSupportRequestId === request.id ? 'Fechar chat' : 'Abrir chat'}
                              </button>
                              {selectedSupportRequestId === request.id ? (
                                <div className="flex items-center gap-2 text-xs">
                                  <span className={[
                                    'inline-flex h-2.5 w-2.5 rounded-full',
                                    supportAdminOnline ? 'bg-emerald-400' : 'bg-slate-500'
                                  ].join(' ')} />
                                  <span className="text-slate-300">
                                    {supportAdminOnline ? 'Suporte online' : 'Suporte offline'}
                                  </span>
                                  <span className="text-slate-500">|</span>
                                  <span className="text-slate-300">{supportChatConnected ? 'Conectado' : 'Desconectado'}</span>
                                </div>
                              ) : null}
                            </div>

                            {selectedSupportRequestId === request.id ? (
                              <div className="mt-3 rounded-xl border border-white/10 bg-black/10 p-3">
                                <div className="max-h-72 space-y-2 overflow-y-auto">
                                  {supportChatMessages.length ? (
                                    supportChatMessages.map((message) => {
                                      const isMine = message.senderId === session?.user?.id;

                                      return (
                                        <div
                                          key={message.id}
                                          className={[
                                            'max-w-[85%] rounded-xl px-3 py-2 text-sm',
                                            isMine
                                              ? 'ml-auto bg-blue-600/80 text-white'
                                              : 'mr-auto bg-slate-700/70 text-slate-100'
                                          ].join(' ')}
                                        >
                                          <p className="text-[11px] opacity-80">{message.senderName} ({message.senderRole})</p>
                                          <p className="mt-1 whitespace-pre-wrap">{message.content}</p>
                                          <p className="mt-1 text-[10px] opacity-70">{String(message.createdAt || '').slice(0, 16).replace('T', ' ')}</p>
                                        </div>
                                      );
                                    })
                                  ) : (
                                    <p className="text-sm text-slate-400">Nenhuma mensagem neste chamado ainda.</p>
                                  )}
                                </div>

                                <p className="mt-2 min-h-[20px] text-xs text-cyan-300">{supportTypingText || ' '}</p>

                                {request.status === 'DONE' ? (
                                  <div className="mt-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-center text-xs text-emerald-300">
                                    Chamado finalizado. Para continuar, abra uma nova solicitacao de suporte.
                                  </div>
                                ) : (
                                  <div className="mt-1 grid gap-2 md:grid-cols-[1fr_auto]">
                                    <input
                                      className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30"
                                      placeholder="Digite sua mensagem"
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
                                    <button
                                      type="button"
                                      onClick={() => {
                                        void sendSupportChatMessage();
                                        emitSupportTyping(false);
                                      }}
                                      className="rounded-xl bg-gradient-to-r from-indigo-600 to-blue-500 px-4 py-2 text-sm font-semibold text-white transition-all hover:scale-105 hover:from-indigo-500 hover:to-blue-400"
                                    >
                                      Enviar
                                    </button>
                                  </div>
                                )}
                              </div>
                            ) : null}
                          </article>
                        );
                      })
                    ) : (
                      <p className="rounded-xl border border-dashed border-white/15 bg-white/5 px-4 py-6 text-center text-sm text-gray-400">
                        {supportLoading
                          ? 'Carregando solicitacoes...'
                          : 'Nenhuma solicitacao no momento. Quando houver novidades, elas aparecerao aqui.'}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {activeView === 'sales' ? (
            <div className="grid gap-6">
              <div className={[
                'rounded-2xl p-5 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg',
                isDarkTheme
                  ? 'border border-white/10 bg-white/5 shadow-cyan-900/20 backdrop-blur-md'
                  : 'border border-slate-200 bg-white'
              ].join(' ')}>
                <h1 className={['text-2xl font-black', isDarkTheme ? 'text-white' : 'text-slate-800'].join(' ')}>Vendas</h1>
                <p className={['mt-1 text-sm', isDarkTheme ? 'text-slate-300' : 'text-slate-500'].join(' ')}>Selecione produtos, registre a venda e atualize o estoque automaticamente.</p>

                <div className="mt-4 grid gap-3">
                  {role === 'ADMIN' ? (
                    <select
                      className={[
                        'rounded-xl px-3 py-2 text-sm outline-none transition-all focus:border-blue-400',
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
                  ) : null}

                  {saleLines.map((line) => (
                    <div key={line.id} className="grid gap-2 md:grid-cols-[1fr_180px_auto]">
                      <select
                        className={[
                          'rounded-xl px-3 py-2 text-sm outline-none transition-all focus:border-blue-400',
                          isDarkTheme
                            ? 'border border-white/10 bg-white/5 text-slate-100 focus:ring-2 focus:ring-cyan-500/40'
                            : 'border border-slate-200 bg-slate-50'
                        ].join(' ')}
                        value={line.productId}
                        onChange={(event) => updateSaleLine(line.id, { productId: event.target.value })}
                      >
                        <option className={isDarkTheme ? 'bg-slate-900 text-slate-100' : ''} value="">Selecione o produto</option>
                        {products.map((product) => (
                          <option className={isDarkTheme ? 'bg-slate-900 text-slate-100' : ''} key={product.id} value={product.id}>
                            {product.name} - Estoque: {Number(product.quantity || 0)} - {formatCurrency(Number(product.price || 0))}
                          </option>
                        ))}
                      </select>

                      <input
                        className={[
                          'rounded-xl px-3 py-2 text-sm outline-none transition-all focus:border-blue-400',
                          isDarkTheme
                            ? 'border border-white/10 bg-white/5 text-slate-100 focus:ring-2 focus:ring-cyan-500/40'
                            : 'border border-slate-200 bg-slate-50'
                        ].join(' ')}
                        type="number"
                        min={1}
                        value={line.quantity}
                        onChange={(event) => updateSaleLine(line.id, { quantity: Number(event.target.value || 1) })}
                      />

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
                    </div>
                  ))}

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={addSaleLine}
                      className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition-all duration-300 hover:-translate-y-0.5 hover:bg-slate-100"
                    >
                      Adicionar item
                    </button>
                    <button
                      type="button"
                      onClick={checkoutSale}
                      disabled={salesLoading}
                      className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition-all duration-300 hover:-translate-y-0.5 hover:bg-slate-800 disabled:opacity-70"
                    >
                      Finalizar venda
                    </button>
                    <button
                      type="button"
                      onClick={fetchSalesAnalysis}
                      disabled={salesLoading}
                      className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition-all duration-300 hover:-translate-y-0.5 hover:bg-slate-100 disabled:opacity-70"
                    >
                      Atualizar analise
                    </button>
                  </div>
                </div>
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
              </div>
            </div>
          ) : null}

          {role === 'ADMIN' || activeView === 'products' || activeView === 'settings' || activeView === 'sales' ? (
            <p className="mt-4 text-sm text-slate-500">{adminLoading ? 'Sincronizando area administrativa...' : status}</p>
          ) : null}
        </section>
      </div>

      {editingLeadId ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/45 p-4">
          <div className={['w-full max-w-lg p-5 shadow-xl', themedPanelClass].join(' ')}>
            <h3 className={isDarkTheme ? 'text-lg font-bold text-white' : 'text-lg font-bold text-slate-900'}>Editar card</h3>
            <p className={['mt-1 text-sm', themedSubtextClass].join(' ')}>Atualize os dados do lead no funil.</p>

            <div className="mt-4 grid gap-3">
              <input className={themedInputClass} placeholder="Nome" value={editName} onChange={(event) => setEditName(event.target.value)} />
              <select className={themedSelectClass} value={editPriority} onChange={(event) => setEditPriority(event.target.value as LeadPriority)}>
                <option className={themedOptionClass} value="BAIXA">Prioridade baixa</option>
                <option className={themedOptionClass} value="MEDIA">Prioridade media</option>
                <option className={themedOptionClass} value="ALTA">Prioridade alta</option>
              </select>
              <input className={themedInputClass} placeholder="Valor (R$)" type="number" step="0.01" value={editValue} onChange={(event) => setEditValue(event.target.value)} />
              <textarea className={['min-h-[100px]', themedInputClass].join(' ')} placeholder="Observacao" value={editNotes} onChange={(event) => setEditNotes(event.target.value)} />
            </div>

            <div className="mt-5 flex flex-wrap justify-between gap-2">
              <button type="button" onClick={deleteLead} className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-500">
                Excluir
              </button>
              <div className="flex gap-2">
                <button type="button" onClick={closeEditModal} className={isDarkTheme ? 'rounded-xl border border-white/20 px-4 py-2 text-sm font-semibold text-slate-100 hover:bg-white/10' : 'rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100'}>
                  Cancelar
                </button>
                <button type="button" onClick={saveLeadChanges} className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500">
                  Salvar
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
};

export default Dashboard;
