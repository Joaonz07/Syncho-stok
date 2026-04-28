import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';
import type { Dispatch, ReactNode, SetStateAction } from 'react';
import {
  Bell,
  Building2,
  ChevronRight,
  Copy,
  CreditCard,
  KeyRound,
  Laptop,
  Loader2,
  Moon,
  Palette,
  RefreshCw,
  Settings2,
  Shield,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Trash2,
  UserCircle2,
  Webhook,
  Zap,
  Disc3,
  Sun,
  BadgeCheck,
  Mail,
  MessageSquareMore,
  HardDriveUpload,
  TriangleAlert,
  Download,
  Database,
  Link2
} from 'lucide-react';

type CompanyPlan = 'BASIC' | 'PRO' | 'PREMIUM';
type CompanyStatus = 'ACTIVE' | 'PAST_DUE' | 'CANCELED' | 'BLOCKED';

type CompanyOption = {
  id: string;
  name: string;
};

type CompanyInfo = {
  id: string;
  name: string;
  location: string | null;
};

type SubscriptionInfo = {
  plan?: CompanyPlan;
  status?: CompanyStatus;
  expiresAt?: string | null;
};

type Props = {
  role: 'ADMIN' | 'DEV' | 'CLIENT';
  displayUserName: string;
  displayUserEmail: string;
  uiTheme: 'light' | 'dark';
  setUiTheme: Dispatch<SetStateAction<'light' | 'dark'>>;
  isDarkTheme: boolean;
  settingsLoading: boolean;
  settingsPasswordLoading: boolean;
  settingsCompanyId: string;
  setSettingsCompanyId: (value: string) => void;
  companyOptions: CompanyOption[];
  settingsCompanyInfo: CompanyInfo | null;
  settingsSubscription: SubscriptionInfo | null;
  settingsAccessUntil: string | null;
  settingsPlan: CompanyPlan;
  setSettingsPlan: (value: CompanyPlan) => void;
  settingsExpiresAt: string;
  setSettingsExpiresAt: (value: string) => void;
  settingsNewPassword: string;
  setSettingsNewPassword: (value: string) => void;
  settingsConfirmPassword: string;
  setSettingsConfirmPassword: (value: string) => void;
  fetchSettings: () => void | Promise<void>;
  saveSettings: () => void | Promise<void>;
  changePassword: () => void | Promise<void>;
  showToast: (message: string) => void;
};

type SettingsTab =
  | 'account'
  | 'company'
  | 'security'
  | 'notifications'
  | 'appearance'
  | 'billing'
  | 'integrations'
  | 'system';

type ToggleProps = {
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
};

type CriticalAction = 'logout-all' | 'cancel-plan' | 'reset-api' | 'delete-account' | 'end-session';

type WebhookItem = {
  id: string;
  url: string;
  event: string;
  status: 'active' | 'paused';
};

type InvoiceItem = {
  id: string;
  label: string;
  amount: string;
  status: 'Pago' | 'Pendente' | 'Falhou';
  date: string;
};

type SessionItem = {
  id: string;
  device: string;
  location: string;
  lastSeen: string;
  current?: boolean;
};

type LoginEvent = {
  id: string;
  device: string;
  location: string;
  status: 'Sucesso' | 'Bloqueado' | 'Verificacao';
  time: string;
};

const tabs: Array<{ id: SettingsTab; label: string; icon: typeof UserCircle2; description: string }> = [
  { id: 'account', label: 'Conta', icon: UserCircle2, description: 'Perfil, foto, senha e sessoes' },
  { id: 'company', label: 'Empresa', icon: Building2, description: 'Dados institucionais e limites' },
  { id: 'security', label: 'Seguranca', icon: Shield, description: '2FA, logins e dispositivos' },
  { id: 'notifications', label: 'Notificacoes', icon: Bell, description: 'Preferencias de alertas' },
  { id: 'appearance', label: 'Aparencia', icon: Palette, description: 'Tema, cor e densidade visual' },
  { id: 'billing', label: 'Assinatura', icon: CreditCard, description: 'Plano, cobranca e faturas' },
  { id: 'integrations', label: 'Integracoes', icon: Link2, description: 'API key, webhooks e apps' },
  { id: 'system', label: 'Sistema', icon: Settings2, description: 'Idioma, fuso e exportacao' }
];

const planLimits: Record<CompanyPlan, { users: string; storage: string; automations: string }> = {
  BASIC: { users: '5 usuarios', storage: '20 GB', automations: '3 automacoes' },
  PRO: { users: '20 usuarios', storage: '200 GB', automations: '20 automacoes' },
  PREMIUM: { users: 'Ilimitado', storage: '1 TB', automations: 'Ilimitadas' }
};

const cardBase =
  'rounded-[28px] border border-white/10 bg-white/[0.05] shadow-[0_24px_60px_-34px_rgba(15,23,42,0.85)] backdrop-blur-xl';

const Toggle = ({ checked, onChange, disabled = false }: ToggleProps) => (
  <button
    type="button"
    disabled={disabled}
    aria-pressed={checked}
    onClick={() => onChange(!checked)}
    className={[
      'relative h-7 w-12 rounded-full transition-all duration-300',
      checked ? 'bg-cyan-400 shadow-[0_0_0_4px_rgba(34,211,238,0.14)]' : 'bg-slate-700',
      disabled ? 'cursor-not-allowed opacity-50' : 'hover:scale-[1.02]'
    ].join(' ')}
  >
    <span
      className={[
        'absolute top-1 h-5 w-5 rounded-full bg-white transition-all duration-300',
        checked ? 'left-6' : 'left-1'
      ].join(' ')}
    />
  </button>
);

const SectionCard = ({
  title,
  eyebrow,
  icon,
  children,
  actions,
  isDarkTheme
}: {
  title: string;
  eyebrow: string;
  icon: ReactNode;
  children: ReactNode;
  actions?: ReactNode;
  isDarkTheme: boolean;
}) => (
  <section className={[cardBase, 'p-5 sm:p-6'].join(' ')}>
    <div className="mb-5 flex flex-col gap-4 border-b border-white/10 pb-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex items-start gap-4">
        <div className={[
          'flex h-12 w-12 items-center justify-center rounded-2xl border',
          isDarkTheme ? 'border-white/10 bg-white/[0.07] text-cyan-200' : 'border-slate-200 bg-white text-slate-700'
        ].join(' ')}>
          {icon}
        </div>
        <div>
          <p className={['text-[11px] font-semibold uppercase tracking-[0.3em]', isDarkTheme ? 'text-cyan-300' : 'text-blue-700'].join(' ')}>{eyebrow}</p>
          <h3 className={['mt-2 text-xl font-black', isDarkTheme ? 'text-white' : 'text-slate-900'].join(' ')}>{title}</h3>
        </div>
      </div>
      {actions}
    </div>
    {children}
  </section>
);

const Field = ({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  isDarkTheme,
  disabled = false
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  isDarkTheme: boolean;
  disabled?: boolean;
}) => (
  <label className="grid gap-2">
    <span className={['text-xs font-semibold uppercase tracking-[0.2em]', isDarkTheme ? 'text-slate-400' : 'text-slate-500'].join(' ')}>{label}</span>
    <input
      type={type}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      disabled={disabled}
      placeholder={placeholder}
      className={[
        'rounded-2xl border px-4 py-3 text-sm outline-none transition-all',
        isDarkTheme
          ? 'border-white/10 bg-slate-950/55 text-slate-100 placeholder:text-slate-500 focus:border-cyan-400 focus:ring-4 focus:ring-cyan-500/10'
          : 'border-slate-200 bg-white text-slate-800 focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10',
        disabled ? 'cursor-not-allowed opacity-60' : ''
      ].join(' ')}
    />
  </label>
);

const SkeletonBlock = ({ className }: { className: string }) => (
  <div className={['animate-pulse rounded-2xl bg-white/10', className].join(' ')} />
);

const formatDisplayDate = (value: string | null | undefined) => {
  if (!value) {
    return 'Sem limite';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }).format(date);
};

const SettingsWorkspace = ({
  role,
  displayUserName,
  displayUserEmail,
  uiTheme,
  setUiTheme,
  isDarkTheme,
  settingsLoading,
  settingsPasswordLoading,
  settingsCompanyId,
  setSettingsCompanyId,
  companyOptions,
  settingsCompanyInfo,
  settingsSubscription,
  settingsAccessUntil,
  settingsPlan,
  setSettingsPlan,
  settingsExpiresAt,
  setSettingsExpiresAt,
  settingsNewPassword,
  setSettingsNewPassword,
  settingsConfirmPassword,
  setSettingsConfirmPassword,
  fetchSettings,
  saveSettings,
  changePassword,
  showToast
}: Props) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('account');
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [criticalAction, setCriticalAction] = useState<CriticalAction | null>(null);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [profile, setProfile] = useState({
    name: displayUserName || 'Usuario Syncho',
    email: displayUserEmail || 'usuario@syncho.cloud',
    phone: '+55 11 99999-4400',
    avatarHue: 196,
    twoFactor: true
  });
  const [companyDraft, setCompanyDraft] = useState({
    name: '',
    cnpj: '12.345.678/0001-90',
    address: 'Av. Brigadeiro Faria Lima, 1826',
    city: 'Sao Paulo',
    state: 'SP',
    postalCode: '01451-001'
  });
  const [notifications, setNotifications] = useState({
    email: true,
    sms: false,
    system: true,
    login: true,
    billing: true,
    updates: false,
    frequency: 'Tempo real'
  });
  const [appearance, setAppearance] = useState({
    primaryColor: '#22d3ee',
    density: 'Confortavel',
    animations: true
  });
  const [billing, setBilling] = useState({
    paymentMethod: 'Visa final 4242',
    nextCharge: '12 mai 2026',
    status: settingsSubscription?.status || 'ACTIVE'
  });
  const [apiKey, setApiKey] = useState('syn_live_x4K9mz_32q_1f9pq2');
  const [webhooks, setWebhooks] = useState<WebhookItem[]>([
    { id: 'wh_1', url: 'https://api.syncho.cloud/webhooks/billing', event: 'billing.paid', status: 'active' },
    { id: 'wh_2', url: 'https://ops.syncho.cloud/hooks/login', event: 'user.login', status: 'paused' }
  ]);
  const [newWebhookUrl, setNewWebhookUrl] = useState('');
  const [newWebhookEvent, setNewWebhookEvent] = useState('user.login');
  const [systemPrefs, setSystemPrefs] = useState({
    language: 'pt-BR',
    timezone: 'America/Sao_Paulo',
    dateFormat: 'DD/MM/YYYY'
  });

  const invoices = useMemo<InvoiceItem[]>(
    () => [
      { id: 'inv_001', label: 'Abril 2026', amount: 'R$ 199,00', status: 'Pago', date: '02 abr 2026' },
      { id: 'inv_002', label: 'Marco 2026', amount: 'R$ 199,00', status: 'Pago', date: '02 mar 2026' },
      { id: 'inv_003', label: 'Fevereiro 2026', amount: 'R$ 199,00', status: 'Pago', date: '02 fev 2026' }
    ],
    []
  );

  const sessions = useMemo<SessionItem[]>(
    () => [
      { id: 'session_1', device: 'MacBook Pro · Chrome', location: 'Sao Paulo, BR', lastSeen: 'Agora mesmo', current: true },
      { id: 'session_2', device: 'iPhone 15 · Safari', location: 'Campinas, BR', lastSeen: 'Hoje, 09:12' },
      { id: 'session_3', device: 'Windows Desktop · Edge', location: 'Rio de Janeiro, BR', lastSeen: 'Ontem, 22:45' }
    ],
    []
  );

  const loginHistory = useMemo<LoginEvent[]>(
    () => [
      { id: 'lg_1', device: 'Chrome · macOS', location: 'Sao Paulo, BR', status: 'Sucesso', time: 'Hoje, 10:42' },
      { id: 'lg_2', device: 'Safari · iPhone', location: 'Campinas, BR', status: 'Verificacao', time: 'Hoje, 08:11' },
      { id: 'lg_3', device: 'Edge · Windows', location: 'Curitiba, BR', status: 'Bloqueado', time: 'Ontem, 21:05' }
    ],
    []
  );

  const alerts = useMemo(
    () => [
      'Nova tentativa de login de dispositivo nao reconhecido.',
      'API key com uso elevado nas ultimas 24h.',
      'Atualizacao de seguranca disponivel para integracoes.'
    ],
    []
  );

  useEffect(() => {
    setProfile((current) => ({
      ...current,
      name: displayUserName || current.name,
      email: displayUserEmail || current.email
    }));
  }, [displayUserEmail, displayUserName]);

  useEffect(() => {
    setCompanyDraft((current) => ({
      ...current,
      name: settingsCompanyInfo?.name || current.name
    }));
  }, [settingsCompanyInfo]);

  useEffect(() => {
    setBilling((current) => ({
      ...current,
      status: settingsSubscription?.status || current.status
    }));
  }, [settingsSubscription]);

  const runAction = async (key: string, action: () => void | Promise<void>, successMessage: string) => {
    setSavingKey(key);
    await new Promise((resolve) => setTimeout(resolve, 650));
    await action();
    showToast(successMessage);
    setSavingKey(null);
  };

  const saveProfile = async () => {
    await runAction('profile', async () => undefined, 'Perfil salvo com sucesso');
  };

  const saveNotifications = async () => {
    await runAction('notifications', async () => undefined, 'Preferencias de notificacao salvas');
  };

  const saveAppearance = async () => {
    await runAction('appearance', async () => undefined, 'Aparencia atualizada');
  };

  const saveSystem = async () => {
    await runAction('system', async () => undefined, 'Configuracoes de sistema salvas');
  };

  const saveCompany = async () => {
    await runAction('company', async () => saveSettings(), 'Salvo com sucesso');
  };

  const savePassword = async () => {
    await changePassword();
  };

  const copyApiKey = async () => {
    try {
      await navigator.clipboard.writeText(apiKey);
      showToast('API key copiada');
    } catch (_error) {
      showToast('Nao foi possivel copiar a API key');
    }
  };

  const addWebhook = async () => {
    if (!newWebhookUrl.trim()) {
      showToast('Informe a URL do webhook');
      return;
    }

    await runAction('webhook-add', async () => {
      setWebhooks((current) => [
        ...current,
        { id: `wh_${Date.now()}`, url: newWebhookUrl.trim(), event: newWebhookEvent, status: 'active' }
      ]);
      setNewWebhookUrl('');
      setNewWebhookEvent('user.login');
    }, 'Webhook criado com sucesso');
  };

  const removeWebhook = async (id: string) => {
    await runAction(`webhook-${id}`, async () => {
      setWebhooks((current) => current.filter((item) => item.id !== id));
    }, 'Webhook removido');
  };

  const confirmCriticalAction = async () => {
    const action = criticalAction;
    setCriticalAction(null);

    if (!action) {
      return;
    }

    if (action === 'reset-api') {
      await runAction('api-reset', async () => {
        setApiKey(`syn_live_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(36)}`);
      }, 'API key regenerada');
      return;
    }

    if (action === 'logout-all') {
      await runAction('logout-all', async () => undefined, 'Todas as sessoes foram encerradas');
      return;
    }

    if (action === 'cancel-plan') {
      await runAction('cancel-plan', async () => {
        setBilling((current) => ({ ...current, status: 'CANCELED' }));
      }, 'Assinatura marcada para cancelamento');
      return;
    }

    if (action === 'delete-account') {
      await runAction('delete-account', async () => undefined, 'Solicitacao de exclusao enviada');
      return;
    }

    if (action === 'end-session' && selectedSessionId) {
      await runAction('end-session', async () => undefined, 'Sessao encerrada');
    }
  };

  const statusPillClass = useMemo(() => {
    const status = settingsSubscription?.status || 'ACTIVE';
    if (status === 'ACTIVE') {
      return 'bg-emerald-500/15 text-emerald-300';
    }
    if (status === 'BLOCKED' || status === 'CANCELED') {
      return 'bg-rose-500/15 text-rose-300';
    }
    return 'bg-amber-500/15 text-amber-300';
  }, [settingsSubscription]);

  const rightPane = (
    <AnimatePresence mode="wait">
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, x: 24, y: 10 }}
        animate={{ opacity: 1, x: 0, y: 0 }}
        exit={{ opacity: 0, x: -18, y: -6 }}
        transition={{ duration: 0.28, ease: 'easeOut' }}
        className="space-y-5"
      >
        <div className={[cardBase, 'flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between'].join(' ')}>
          <div className="flex items-center gap-4">
            <div
              className="flex h-14 w-14 items-center justify-center rounded-2xl text-lg font-black text-white shadow-[0_20px_45px_-28px_rgba(34,211,238,0.85)]"
              style={{ background: `linear-gradient(135deg, hsl(${profile.avatarHue} 84% 56%), #7c3aed)` }}
            >
              {(profile.name || 'S').slice(0, 1).toUpperCase()}
            </div>
            <div>
              <p className={['text-xs font-semibold uppercase tracking-[0.35em]', isDarkTheme ? 'text-cyan-300' : 'text-blue-700'].join(' ')}>Workspace SYNCHO</p>
              <h1 className={['mt-1 text-2xl font-black', isDarkTheme ? 'text-white' : 'text-slate-900'].join(' ')}>
                Configuracoes da plataforma
              </h1>
              <p className={['mt-1 text-sm', isDarkTheme ? 'text-slate-400' : 'text-slate-500'].join(' ')}>
                Painel completo para conta, empresa, seguranca, faturamento e integracoes.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setNotificationsOpen((current) => !current)}
              className={[
                'relative rounded-2xl border px-4 py-3 text-sm font-semibold transition-all',
                isDarkTheme ? 'border-white/10 bg-white/[0.06] text-slate-200 hover:bg-white/[0.1]' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
              ].join(' ')}
            >
              <span className="flex items-center gap-2">
                <Bell className="h-4 w-4" />
                Notificacoes
              </span>
              <span className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-cyan-400 text-[10px] font-black text-slate-950">
                {alerts.length}
              </span>
            </button>

            <div className={[
              'flex items-center gap-1 rounded-2xl border p-1',
              isDarkTheme ? 'border-white/10 bg-white/[0.06]' : 'border-slate-200 bg-white'
            ].join(' ')}>
              <button
                type="button"
                onClick={() => setUiTheme('light')}
                className={[
                  'rounded-xl px-3 py-2 text-xs font-semibold transition-all',
                  uiTheme === 'light' ? 'bg-white text-slate-900 shadow' : isDarkTheme ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700'
                ].join(' ')}
              >
                <span className="flex items-center gap-2">
                  <Sun className="h-4 w-4" />
                  Claro
                </span>
              </button>
              <button
                type="button"
                onClick={() => setUiTheme('dark')}
                className={[
                  'rounded-xl px-3 py-2 text-xs font-semibold transition-all',
                  uiTheme === 'dark' ? 'bg-cyan-400 text-slate-950 shadow' : isDarkTheme ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700'
                ].join(' ')}
              >
                <span className="flex items-center gap-2">
                  <Moon className="h-4 w-4" />
                  Escuro
                </span>
              </button>
            </div>

            <div className={[
              'flex items-center gap-3 rounded-2xl border px-3 py-2.5',
              isDarkTheme ? 'border-white/10 bg-white/[0.06]' : 'border-slate-200 bg-white'
            ].join(' ')}>
              <div className="text-right">
                <p className={['text-sm font-semibold', isDarkTheme ? 'text-white' : 'text-slate-900'].join(' ')}>{profile.name}</p>
                <p className={['text-xs', isDarkTheme ? 'text-slate-400' : 'text-slate-500'].join(' ')}>{role}</p>
              </div>
              <div
                className="flex h-10 w-10 items-center justify-center rounded-2xl text-sm font-black text-white"
                style={{ background: `linear-gradient(135deg, ${appearance.primaryColor}, #8b5cf6)` }}
              >
                {(profile.name || 'S').slice(0, 1).toUpperCase()}
              </div>
            </div>
          </div>
        </div>

        {notificationsOpen ? (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className={[cardBase, 'p-4'].join(' ')}
          >
            <div className="mb-3 flex items-center justify-between">
              <p className={['text-sm font-bold', isDarkTheme ? 'text-white' : 'text-slate-900'].join(' ')}>Alertas recentes</p>
              <button
                type="button"
                onClick={() => setNotificationsOpen(false)}
                className={['text-xs font-semibold', isDarkTheme ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700'].join(' ')}
              >
                Fechar
              </button>
            </div>
            <div className="grid gap-2">
              {alerts.map((alert) => (
                <div key={alert} className={['rounded-2xl border px-4 py-3 text-sm', isDarkTheme ? 'border-white/10 bg-black/20 text-slate-300' : 'border-slate-200 bg-slate-50 text-slate-700'].join(' ')}>
                  {alert}
                </div>
              ))}
            </div>
          </motion.div>
        ) : null}

        {activeTab === 'account' ? (
          <div className="space-y-5">
            <SectionCard
              title="Conta e perfil"
              eyebrow="Conta"
              icon={<UserCircle2 className="h-5 w-5" />}
              isDarkTheme={isDarkTheme}
              actions={
                <motion.button
                  whileHover={{ y: -1 }}
                  whileTap={{ scale: 0.98 }}
                  type="button"
                  onClick={() => void saveProfile()}
                  className="rounded-2xl bg-gradient-to-r from-cyan-400 to-blue-500 px-4 py-2.5 text-sm font-bold text-slate-950"
                >
                  {savingKey === 'profile' ? 'Salvando...' : 'Salvar conta'}
                </motion.button>
              }
            >
              <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Nome" value={profile.name} onChange={(value) => setProfile((current) => ({ ...current, name: value }))} isDarkTheme={isDarkTheme} />
                  <Field label="Email" value={profile.email} onChange={(value) => setProfile((current) => ({ ...current, email: value }))} isDarkTheme={isDarkTheme} type="email" />
                  <Field label="Telefone" value={profile.phone} onChange={(value) => setProfile((current) => ({ ...current, phone: value }))} isDarkTheme={isDarkTheme} />
                  <label className="grid gap-2">
                    <span className={['text-xs font-semibold uppercase tracking-[0.2em]', isDarkTheme ? 'text-slate-400' : 'text-slate-500'].join(' ')}>Foto</span>
                    <button
                      type="button"
                      onClick={() => showToast('Upload pronto para integrar com backend')}
                      className={[
                        'flex items-center justify-between rounded-2xl border px-4 py-3 text-sm transition-all',
                        isDarkTheme ? 'border-white/10 bg-slate-950/55 text-slate-200 hover:bg-slate-900' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                      ].join(' ')}
                    >
                      <span className="flex items-center gap-2">
                        <HardDriveUpload className="h-4 w-4" />
                        Enviar nova foto
                      </span>
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </label>
                </div>

                <div className={['rounded-[26px] border p-4', isDarkTheme ? 'border-white/10 bg-black/20' : 'border-slate-200 bg-slate-50'].join(' ')}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className={['text-sm font-bold', isDarkTheme ? 'text-white' : 'text-slate-900'].join(' ')}>Autenticacao de dois fatores</p>
                      <p className={['mt-1 text-xs', isDarkTheme ? 'text-slate-400' : 'text-slate-500'].join(' ')}>Adicione uma camada extra de seguranca.</p>
                    </div>
                    <Toggle checked={profile.twoFactor} onChange={(next) => setProfile((current) => ({ ...current, twoFactor: next }))} />
                  </div>
                  <div className="mt-4 grid gap-3">
                    <div className={['rounded-2xl border px-4 py-3', isDarkTheme ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-200' : 'border-emerald-200 bg-emerald-50 text-emerald-700'].join(' ')}>
                      <p className="text-sm font-semibold">2FA via app autenticador</p>
                      <p className="mt-1 text-xs opacity-80">Ultima confirmacao hoje, 10:42.</p>
                    </div>
                    <div className="grid gap-2">
                      {sessions.map((session) => (
                        <div key={session.id} className={['flex items-center justify-between rounded-2xl border px-4 py-3', isDarkTheme ? 'border-white/10 bg-slate-950/40' : 'border-slate-200 bg-white'].join(' ')}>
                          <div>
                            <p className={['text-sm font-semibold', isDarkTheme ? 'text-white' : 'text-slate-900'].join(' ')}>{session.device}</p>
                            <p className={['text-xs', isDarkTheme ? 'text-slate-400' : 'text-slate-500'].join(' ')}>{session.location} · {session.lastSeen}</p>
                          </div>
                          {session.current ? (
                            <span className="rounded-full bg-cyan-500/15 px-3 py-1 text-xs font-semibold text-cyan-300">Atual</span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedSessionId(session.id);
                                setCriticalAction('end-session');
                              }}
                              className="rounded-xl border border-rose-400/30 px-3 py-1.5 text-xs font-semibold text-rose-300 hover:bg-rose-500/10"
                            >
                              Encerrar
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </SectionCard>
          </div>
        ) : null}

        {activeTab === 'company' ? (
          <div className="space-y-5">
            <SectionCard
              title="Empresa e plano"
              eyebrow="Empresa"
              icon={<Building2 className="h-5 w-5" />}
              isDarkTheme={isDarkTheme}
              actions={
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void fetchSettings()}
                    className={[
                      'rounded-2xl border px-4 py-2.5 text-sm font-semibold transition-all',
                      isDarkTheme ? 'border-white/10 bg-white/[0.05] text-slate-200 hover:bg-white/[0.1]' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    ].join(' ')}
                  >
                    {settingsLoading ? 'Carregando...' : 'Sincronizar'}
                  </button>
                  <button
                    type="button"
                    onClick={() => void saveCompany()}
                    className="rounded-2xl bg-gradient-to-r from-cyan-400 to-blue-500 px-4 py-2.5 text-sm font-bold text-slate-950"
                  >
                    {savingKey === 'company' || settingsLoading ? 'Salvando...' : 'Salvar empresa'}
                  </button>
                </div>
              }
            >
              {settingsLoading ? (
                <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <SkeletonBlock className="h-24" />
                    <SkeletonBlock className="h-24" />
                    <SkeletonBlock className="h-24" />
                    <SkeletonBlock className="h-24" />
                  </div>
                  <SkeletonBlock className="h-[320px]" />
                </div>
              ) : (
                <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
                  <div className="grid gap-4 sm:grid-cols-2">
                    {role === 'ADMIN' ? (
                      <label className="grid gap-2 sm:col-span-2">
                        <span className={['text-xs font-semibold uppercase tracking-[0.2em]', isDarkTheme ? 'text-slate-400' : 'text-slate-500'].join(' ')}>Workspace selecionado</span>
                        <select
                          value={settingsCompanyId}
                          onChange={(event) => setSettingsCompanyId(event.target.value)}
                          className={[
                            'rounded-2xl border px-4 py-3 text-sm outline-none transition-all',
                            isDarkTheme ? 'border-white/10 bg-slate-950/55 text-slate-100 focus:border-cyan-400' : 'border-slate-200 bg-white text-slate-800 focus:border-blue-400'
                          ].join(' ')}
                          style={isDarkTheme ? { colorScheme: 'dark' } : undefined}
                        >
                          <option value="">Selecione a empresa</option>
                          {companyOptions.map((option) => (
                            <option key={option.id} value={option.id}>{option.name}</option>
                          ))}
                        </select>
                      </label>
                    ) : null}
                    <Field label="Nome da empresa" value={companyDraft.name} onChange={(value) => setCompanyDraft((current) => ({ ...current, name: value }))} isDarkTheme={isDarkTheme} />
                    <Field label="CNPJ" value={companyDraft.cnpj} onChange={(value) => setCompanyDraft((current) => ({ ...current, cnpj: value }))} isDarkTheme={isDarkTheme} />
                    <Field label="Endereco" value={companyDraft.address} onChange={(value) => setCompanyDraft((current) => ({ ...current, address: value }))} isDarkTheme={isDarkTheme} />
                    <Field label="Cidade" value={companyDraft.city} onChange={(value) => setCompanyDraft((current) => ({ ...current, city: value }))} isDarkTheme={isDarkTheme} />
                    <Field label="Estado" value={companyDraft.state} onChange={(value) => setCompanyDraft((current) => ({ ...current, state: value }))} isDarkTheme={isDarkTheme} />
                    <Field label="CEP" value={companyDraft.postalCode} onChange={(value) => setCompanyDraft((current) => ({ ...current, postalCode: value }))} isDarkTheme={isDarkTheme} />
                  </div>

                  <div className={['rounded-[26px] border p-4', isDarkTheme ? 'border-white/10 bg-black/20' : 'border-slate-200 bg-slate-50'].join(' ')}>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <p className={['text-xs font-semibold uppercase tracking-[0.25em]', isDarkTheme ? 'text-slate-500' : 'text-slate-500'].join(' ')}>Plano atual</p>
                        <div className="mt-2 flex items-center gap-2">
                          <select
                            value={settingsPlan}
                            onChange={(event) => setSettingsPlan(event.target.value as CompanyPlan)}
                            className={[
                              'rounded-2xl border px-4 py-3 text-sm font-semibold outline-none',
                              isDarkTheme ? 'border-white/10 bg-slate-950/55 text-slate-100' : 'border-slate-200 bg-white text-slate-800'
                            ].join(' ')}
                            style={isDarkTheme ? { colorScheme: 'dark' } : undefined}
                            disabled={role !== 'ADMIN'}
                          >
                            <option value="BASIC">BASIC</option>
                            <option value="PRO">PRO</option>
                            <option value="PREMIUM">PREMIUM</option>
                          </select>
                          <span className={['rounded-full px-3 py-1 text-xs font-semibold', statusPillClass].join(' ')}>
                            {billing.status}
                          </span>
                        </div>
                      </div>
                      <Field label="Expiracao" value={settingsExpiresAt} onChange={setSettingsExpiresAt} isDarkTheme={isDarkTheme} type="date" disabled={role !== 'ADMIN'} />
                    </div>

                    <div className="mt-5 grid gap-3 sm:grid-cols-3">
                      <div className={['rounded-2xl border px-4 py-3', isDarkTheme ? 'border-white/10 bg-slate-950/40' : 'border-slate-200 bg-white'].join(' ')}>
                        <p className={['text-xs uppercase tracking-[0.22em]', isDarkTheme ? 'text-slate-500' : 'text-slate-500'].join(' ')}>Usuarios</p>
                        <p className={['mt-2 text-lg font-black', isDarkTheme ? 'text-white' : 'text-slate-900'].join(' ')}>{planLimits[settingsPlan].users}</p>
                      </div>
                      <div className={['rounded-2xl border px-4 py-3', isDarkTheme ? 'border-white/10 bg-slate-950/40' : 'border-slate-200 bg-white'].join(' ')}>
                        <p className={['text-xs uppercase tracking-[0.22em]', isDarkTheme ? 'text-slate-500' : 'text-slate-500'].join(' ')}>Armazenamento</p>
                        <p className={['mt-2 text-lg font-black', isDarkTheme ? 'text-white' : 'text-slate-900'].join(' ')}>{planLimits[settingsPlan].storage}</p>
                      </div>
                      <div className={['rounded-2xl border px-4 py-3', isDarkTheme ? 'border-white/10 bg-slate-950/40' : 'border-slate-200 bg-white'].join(' ')}>
                        <p className={['text-xs uppercase tracking-[0.22em]', isDarkTheme ? 'text-slate-500' : 'text-slate-500'].join(' ')}>Automacoes</p>
                        <p className={['mt-2 text-lg font-black', isDarkTheme ? 'text-white' : 'text-slate-900'].join(' ')}>{planLimits[settingsPlan].automations}</p>
                      </div>
                    </div>

                    <div className="mt-5 grid gap-3">
                      <div className={['rounded-2xl border px-4 py-3', isDarkTheme ? 'border-white/10 bg-slate-950/40' : 'border-slate-200 bg-white'].join(' ')}>
                        <p className={['text-xs uppercase tracking-[0.22em]', isDarkTheme ? 'text-slate-500' : 'text-slate-500'].join(' ')}>Status da conta</p>
                        <div className="mt-2 flex items-center justify-between gap-3">
                          <div>
                            <p className={['text-sm font-semibold', isDarkTheme ? 'text-white' : 'text-slate-900'].join(' ')}>{settingsSubscription?.status || 'ACTIVE'}</p>
                            <p className={['mt-1 text-xs', isDarkTheme ? 'text-slate-400' : 'text-slate-500'].join(' ')}>Acesso ate {formatDisplayDate(settingsAccessUntil || settingsSubscription?.expiresAt)}</p>
                          </div>
                          <BadgeCheck className="h-6 w-6 text-emerald-300" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </SectionCard>
          </div>
        ) : null}

        {activeTab === 'security' ? (
          <div className="space-y-5">
            <SectionCard
              title="Blindagem da conta"
              eyebrow="Seguranca"
              icon={<ShieldCheck className="h-5 w-5" />}
              isDarkTheme={isDarkTheme}
              actions={
                <button
                  type="button"
                  onClick={() => setCriticalAction('logout-all')}
                  className="rounded-2xl border border-rose-400/30 px-4 py-2.5 text-sm font-semibold text-rose-300 hover:bg-rose-500/10"
                >
                  Deslogar todos os dispositivos
                </button>
              }
            >
              <div className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
                <div className="grid gap-4">
                  <div className={['rounded-[26px] border p-4', isDarkTheme ? 'border-white/10 bg-black/20' : 'border-slate-200 bg-slate-50'].join(' ')}>
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className={['text-sm font-bold', isDarkTheme ? 'text-white' : 'text-slate-900'].join(' ')}>2FA obrigatorio</p>
                        <p className={['mt-1 text-xs', isDarkTheme ? 'text-slate-400' : 'text-slate-500'].join(' ')}>Proteja logins de alto privilegio.</p>
                      </div>
                      <Toggle checked={profile.twoFactor} onChange={(next) => setProfile((current) => ({ ...current, twoFactor: next }))} />
                    </div>
                  </div>

                  <div className={['rounded-[26px] border p-4', isDarkTheme ? 'border-white/10 bg-black/20' : 'border-slate-200 bg-slate-50'].join(' ')}>
                    <p className={['text-sm font-bold', isDarkTheme ? 'text-white' : 'text-slate-900'].join(' ')}>Alertas de seguranca</p>
                    <div className="mt-3 grid gap-2">
                      {alerts.map((alert) => (
                        <div key={alert} className={['flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm', isDarkTheme ? 'border-white/10 bg-slate-950/45 text-slate-300' : 'border-slate-200 bg-white text-slate-700'].join(' ')}>
                          <TriangleAlert className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-300" />
                          <span>{alert}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className={['rounded-[26px] border p-4', isDarkTheme ? 'border-white/10 bg-black/20' : 'border-slate-200 bg-slate-50'].join(' ')}>
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className={['text-sm font-bold', isDarkTheme ? 'text-white' : 'text-slate-900'].join(' ')}>Senha de acesso</p>
                        <p className={['mt-1 text-xs', isDarkTheme ? 'text-slate-400' : 'text-slate-500'].join(' ')}>Atualize sua senha com validacao imediata.</p>
                      </div>
                      <KeyRound className="h-5 w-5 text-cyan-300" />
                    </div>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <Field
                        label="Nova senha"
                        value={settingsNewPassword}
                        onChange={setSettingsNewPassword}
                        placeholder="Minimo de 6 caracteres"
                        type="password"
                        isDarkTheme={isDarkTheme}
                      />
                      <Field
                        label="Confirmar senha"
                        value={settingsConfirmPassword}
                        onChange={setSettingsConfirmPassword}
                        placeholder="Repita a nova senha"
                        type="password"
                        isDarkTheme={isDarkTheme}
                      />
                    </div>
                    <div className="mt-4 flex justify-end">
                      <button
                        type="button"
                        onClick={() => void savePassword()}
                        disabled={settingsPasswordLoading || !settingsNewPassword || !settingsConfirmPassword}
                        className="rounded-2xl bg-gradient-to-r from-cyan-400 to-blue-500 px-4 py-2.5 text-sm font-bold text-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {settingsPasswordLoading ? 'Atualizando...' : 'Atualizar senha'}
                      </button>
                    </div>
                  </div>
                </div>

                <div className={['rounded-[26px] border p-4', isDarkTheme ? 'border-white/10 bg-black/20' : 'border-slate-200 bg-slate-50'].join(' ')}>
                  <p className={['text-sm font-bold', isDarkTheme ? 'text-white' : 'text-slate-900'].join(' ')}>Historico de login</p>
                  <div className="mt-4 space-y-3">
                    {loginHistory.map((event) => (
                      <div key={event.id} className={['flex items-center justify-between gap-4 rounded-2xl border px-4 py-3', isDarkTheme ? 'border-white/10 bg-slate-950/45' : 'border-slate-200 bg-white'].join(' ')}>
                        <div className="flex items-center gap-3">
                          <div className={['flex h-10 w-10 items-center justify-center rounded-2xl', isDarkTheme ? 'bg-white/10 text-slate-200' : 'bg-slate-100 text-slate-700'].join(' ')}>
                            {event.device.includes('iPhone') ? <Smartphone className="h-4 w-4" /> : <Laptop className="h-4 w-4" />}
                          </div>
                          <div>
                            <p className={['text-sm font-semibold', isDarkTheme ? 'text-white' : 'text-slate-900'].join(' ')}>{event.device}</p>
                            <p className={['text-xs', isDarkTheme ? 'text-slate-400' : 'text-slate-500'].join(' ')}>{event.location} · {event.time}</p>
                          </div>
                        </div>
                        <span className={[
                          'rounded-full px-3 py-1 text-xs font-semibold',
                          event.status === 'Sucesso'
                            ? 'bg-emerald-500/15 text-emerald-300'
                            : event.status === 'Bloqueado'
                              ? 'bg-rose-500/15 text-rose-300'
                              : 'bg-amber-500/15 text-amber-300'
                        ].join(' ')}>
                          {event.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </SectionCard>
          </div>
        ) : null}

        {activeTab === 'notifications' ? (
          <div className="space-y-5">
            <SectionCard
              title="Preferencias de notificacao"
              eyebrow="Notificacoes"
              icon={<Bell className="h-5 w-5" />}
              isDarkTheme={isDarkTheme}
              actions={
                <button
                  type="button"
                  onClick={() => void saveNotifications()}
                  className="rounded-2xl bg-gradient-to-r from-cyan-400 to-blue-500 px-4 py-2.5 text-sm font-bold text-slate-950"
                >
                  {savingKey === 'notifications' ? 'Salvando...' : 'Salvar notificacoes'}
                </button>
              }
            >
              <div className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
                <div className={['rounded-[26px] border p-4', isDarkTheme ? 'border-white/10 bg-black/20' : 'border-slate-200 bg-slate-50'].join(' ')}>
                  <div className="grid gap-4">
                    {[
                      { key: 'email', label: 'Email', icon: <Mail className="h-4 w-4" /> },
                      { key: 'sms', label: 'SMS', icon: <Smartphone className="h-4 w-4" /> },
                      { key: 'system', label: 'Sistema', icon: <MessageSquareMore className="h-4 w-4" /> }
                    ].map((item) => (
                      <div key={item.key} className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className={['flex h-10 w-10 items-center justify-center rounded-2xl', isDarkTheme ? 'bg-white/10 text-slate-200' : 'bg-white text-slate-700'].join(' ')}>{item.icon}</div>
                          <div>
                            <p className={['text-sm font-semibold', isDarkTheme ? 'text-white' : 'text-slate-900'].join(' ')}>{item.label}</p>
                            <p className={['text-xs', isDarkTheme ? 'text-slate-400' : 'text-slate-500'].join(' ')}>Canal principal de alertas</p>
                          </div>
                        </div>
                        <Toggle
                          checked={notifications[item.key as 'email' | 'sms' | 'system']}
                          onChange={(next) => setNotifications((current) => ({ ...current, [item.key]: next }))}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div className={['rounded-[26px] border p-4', isDarkTheme ? 'border-white/10 bg-black/20' : 'border-slate-200 bg-slate-50'].join(' ')}>
                  <p className={['text-sm font-bold', isDarkTheme ? 'text-white' : 'text-slate-900'].join(' ')}>Tipos de alerta</p>
                  <div className="mt-4 grid gap-3">
                    {[
                      { key: 'login', label: 'Eventos de login' },
                      { key: 'billing', label: 'Cobranca e pagamentos' },
                      { key: 'updates', label: 'Atualizacoes do produto' }
                    ].map((item) => (
                      <div key={item.key} className="flex items-center justify-between rounded-2xl border border-white/10 px-4 py-3">
                        <span className={['text-sm font-medium', isDarkTheme ? 'text-slate-200' : 'text-slate-700'].join(' ')}>{item.label}</span>
                        <Toggle
                          checked={notifications[item.key as 'login' | 'billing' | 'updates']}
                          onChange={(next) => setNotifications((current) => ({ ...current, [item.key]: next }))}
                        />
                      </div>
                    ))}
                  </div>
                  <label className="mt-4 grid gap-2">
                    <span className={['text-xs font-semibold uppercase tracking-[0.2em]', isDarkTheme ? 'text-slate-400' : 'text-slate-500'].join(' ')}>Frequencia</span>
                    <select
                      value={notifications.frequency}
                      onChange={(event) => setNotifications((current) => ({ ...current, frequency: event.target.value }))}
                      className={[
                        'rounded-2xl border px-4 py-3 text-sm outline-none',
                        isDarkTheme ? 'border-white/10 bg-slate-950/55 text-slate-100' : 'border-slate-200 bg-white text-slate-800'
                      ].join(' ')}
                      style={isDarkTheme ? { colorScheme: 'dark' } : undefined}
                    >
                      <option>Tempo real</option>
                      <option>Resumo diario</option>
                      <option>Resumo semanal</option>
                    </select>
                  </label>
                </div>
              </div>
            </SectionCard>
          </div>
        ) : null}

        {activeTab === 'appearance' ? (
          <div className="space-y-5">
            <SectionCard
              title="Aparencia e experiencia"
              eyebrow="Aparencia"
              icon={<Palette className="h-5 w-5" />}
              isDarkTheme={isDarkTheme}
              actions={
                <button
                  type="button"
                  onClick={() => void saveAppearance()}
                  className="rounded-2xl bg-gradient-to-r from-cyan-400 to-blue-500 px-4 py-2.5 text-sm font-bold text-slate-950"
                >
                  {savingKey === 'appearance' ? 'Salvando...' : 'Salvar aparencia'}
                </button>
              }
            >
              <div className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
                <div className="grid gap-4">
                  <div className={['rounded-[26px] border p-4', isDarkTheme ? 'border-white/10 bg-black/20' : 'border-slate-200 bg-slate-50'].join(' ')}>
                    <p className={['text-sm font-bold', isDarkTheme ? 'text-white' : 'text-slate-900'].join(' ')}>Tema</p>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      {[
                        { id: 'dark', label: 'Escuro', icon: <Moon className="h-4 w-4" /> },
                        { id: 'light', label: 'Claro', icon: <Sun className="h-4 w-4" /> }
                      ].map((theme) => (
                        <button
                          key={theme.id}
                          type="button"
                          onClick={() => setUiTheme(theme.id as 'light' | 'dark')}
                          className={[
                            'rounded-2xl border px-4 py-4 text-left transition-all',
                            uiTheme === theme.id
                              ? 'border-cyan-400 bg-cyan-400/10 text-cyan-200 shadow-[0_0_0_4px_rgba(34,211,238,0.08)]'
                              : isDarkTheme
                                ? 'border-white/10 bg-slate-950/45 text-slate-300 hover:bg-slate-900'
                                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                          ].join(' ')}
                        >
                          <div className="flex items-center gap-2 text-sm font-semibold">{theme.icon}{theme.label}</div>
                          <p className={['mt-2 text-xs', isDarkTheme ? 'text-slate-400' : 'text-slate-500'].join(' ')}>
                            Contraste limpo para foco e leitura.
                          </p>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className={['rounded-[26px] border p-4', isDarkTheme ? 'border-white/10 bg-black/20' : 'border-slate-200 bg-slate-50'].join(' ')}>
                    <p className={['text-sm font-bold', isDarkTheme ? 'text-white' : 'text-slate-900'].join(' ')}>Cor principal</p>
                    <div className="mt-4 flex flex-wrap gap-3">
                      {['#22d3ee', '#60a5fa', '#a78bfa', '#34d399', '#f59e0b'].map((color) => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => setAppearance((current) => ({ ...current, primaryColor: color }))}
                          className={[
                            'h-11 w-11 rounded-2xl border-2 transition-all',
                            appearance.primaryColor === color ? 'border-white scale-105' : 'border-transparent hover:scale-105'
                          ].join(' ')}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                <div className={['rounded-[26px] border p-4', isDarkTheme ? 'border-white/10 bg-black/20' : 'border-slate-200 bg-slate-50'].join(' ')}>
                  <p className={['text-sm font-bold', isDarkTheme ? 'text-white' : 'text-slate-900'].join(' ')}>Layout e microinteracoes</p>
                  <div className="mt-4 grid gap-3">
                    <label className="grid gap-2">
                      <span className={['text-xs font-semibold uppercase tracking-[0.2em]', isDarkTheme ? 'text-slate-400' : 'text-slate-500'].join(' ')}>Densidade</span>
                      <select
                        value={appearance.density}
                        onChange={(event) => setAppearance((current) => ({ ...current, density: event.target.value }))}
                        className={[
                          'rounded-2xl border px-4 py-3 text-sm outline-none',
                          isDarkTheme ? 'border-white/10 bg-slate-950/55 text-slate-100' : 'border-slate-200 bg-white text-slate-800'
                        ].join(' ')}
                        style={isDarkTheme ? { colorScheme: 'dark' } : undefined}
                      >
                        <option>Compacto</option>
                        <option>Confortavel</option>
                      </select>
                    </label>
                    <div className="flex items-center justify-between rounded-2xl border border-white/10 px-4 py-3">
                      <div>
                        <p className={['text-sm font-semibold', isDarkTheme ? 'text-slate-200' : 'text-slate-700'].join(' ')}>Animacoes</p>
                        <p className={['text-xs', isDarkTheme ? 'text-slate-400' : 'text-slate-500'].join(' ')}>Fade, slide e feedback visual refinado.</p>
                      </div>
                      <Toggle checked={appearance.animations} onChange={(next) => setAppearance((current) => ({ ...current, animations: next }))} />
                    </div>
                    <div className={['rounded-[26px] border p-4', isDarkTheme ? 'border-white/10 bg-slate-950/45' : 'border-slate-200 bg-white'].join(' ')}>
                      <p className={['text-xs uppercase tracking-[0.25em]', isDarkTheme ? 'text-slate-500' : 'text-slate-500'].join(' ')}>Preview</p>
                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        <div className="rounded-2xl border border-white/10 p-4" style={{ background: `linear-gradient(135deg, ${appearance.primaryColor}, rgba(124,58,237,0.8))` }}>
                          <p className="text-xs uppercase tracking-[0.2em] text-white/70">Card principal</p>
                          <p className="mt-2 text-lg font-black text-white">Workspace SYNCHO</p>
                        </div>
                        <div className={['rounded-2xl border p-4', isDarkTheme ? 'border-white/10 bg-black/30' : 'border-slate-200 bg-slate-50'].join(' ')}>
                          <p className={['text-xs uppercase tracking-[0.2em]', isDarkTheme ? 'text-slate-500' : 'text-slate-500'].join(' ')}>Densidade</p>
                          <p className={['mt-2 text-lg font-black', isDarkTheme ? 'text-white' : 'text-slate-900'].join(' ')}>{appearance.density}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </SectionCard>
          </div>
        ) : null}

        {activeTab === 'billing' ? (
          <div className="space-y-5">
            <SectionCard
              title="Assinatura e faturamento"
              eyebrow="Assinatura"
              icon={<CreditCard className="h-5 w-5" />}
              isDarkTheme={isDarkTheme}
              actions={
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void runAction('upgrade-plan', async () => setSettingsPlan('PREMIUM'), 'Plano atualizado para PREMIUM')}
                    className="rounded-2xl bg-gradient-to-r from-cyan-400 to-blue-500 px-4 py-2.5 text-sm font-bold text-slate-950"
                  >
                    Upgrade
                  </button>
                  <button
                    type="button"
                    onClick={() => setCriticalAction('cancel-plan')}
                    className="rounded-2xl border border-rose-400/30 px-4 py-2.5 text-sm font-semibold text-rose-300 hover:bg-rose-500/10"
                  >
                    Cancelar assinatura
                  </button>
                </div>
              }
            >
              <div className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
                <div className="grid gap-4">
                  <div className={['rounded-[26px] border p-4', isDarkTheme ? 'border-white/10 bg-black/20' : 'border-slate-200 bg-slate-50'].join(' ')}>
                    <p className={['text-sm font-bold', isDarkTheme ? 'text-white' : 'text-slate-900'].join(' ')}>Resumo do plano</p>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-2xl border border-white/10 px-4 py-3">
                        <p className={['text-xs uppercase tracking-[0.22em]', isDarkTheme ? 'text-slate-500' : 'text-slate-500'].join(' ')}>Plano</p>
                        <p className={['mt-2 text-xl font-black', isDarkTheme ? 'text-white' : 'text-slate-900'].join(' ')}>{settingsPlan}</p>
                      </div>
                      <div className="rounded-2xl border border-white/10 px-4 py-3">
                        <p className={['text-xs uppercase tracking-[0.22em]', isDarkTheme ? 'text-slate-500' : 'text-slate-500'].join(' ')}>Proxima cobranca</p>
                        <p className={['mt-2 text-xl font-black', isDarkTheme ? 'text-white' : 'text-slate-900'].join(' ')}>{billing.nextCharge}</p>
                      </div>
                      <div className="rounded-2xl border border-white/10 px-4 py-3 sm:col-span-2">
                        <p className={['text-xs uppercase tracking-[0.22em]', isDarkTheme ? 'text-slate-500' : 'text-slate-500'].join(' ')}>Metodo de pagamento</p>
                        <div className="mt-2 flex items-center justify-between gap-3">
                          <p className={['text-sm font-semibold', isDarkTheme ? 'text-white' : 'text-slate-900'].join(' ')}>{billing.paymentMethod}</p>
                          <button type="button" onClick={() => showToast('Fluxo de troca de cartao pronto para backend')} className="rounded-xl border border-white/10 px-3 py-1.5 text-xs font-semibold text-cyan-300 hover:bg-white/10">Alterar</button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className={['rounded-[26px] border p-4', isDarkTheme ? 'border-white/10 bg-black/20' : 'border-slate-200 bg-slate-50'].join(' ')}>
                  <p className={['text-sm font-bold', isDarkTheme ? 'text-white' : 'text-slate-900'].join(' ')}>Historico de faturas</p>
                  <div className="mt-4 space-y-3">
                    {invoices.map((invoice) => (
                      <div key={invoice.id} className={['flex items-center justify-between rounded-2xl border px-4 py-3', isDarkTheme ? 'border-white/10 bg-slate-950/45' : 'border-slate-200 bg-white'].join(' ')}>
                        <div>
                          <p className={['text-sm font-semibold', isDarkTheme ? 'text-white' : 'text-slate-900'].join(' ')}>{invoice.label}</p>
                          <p className={['text-xs', isDarkTheme ? 'text-slate-400' : 'text-slate-500'].join(' ')}>{invoice.date}</p>
                        </div>
                        <div className="text-right">
                          <p className={['text-sm font-bold', isDarkTheme ? 'text-white' : 'text-slate-900'].join(' ')}>{invoice.amount}</p>
                          <span className={['mt-1 inline-flex rounded-full px-3 py-1 text-xs font-semibold', invoice.status === 'Pago' ? 'bg-emerald-500/15 text-emerald-300' : invoice.status === 'Falhou' ? 'bg-rose-500/15 text-rose-300' : 'bg-amber-500/15 text-amber-300'].join(' ')}>
                            {invoice.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </SectionCard>
          </div>
        ) : null}

        {activeTab === 'integrations' ? (
          <div className="space-y-5">
            <SectionCard
              title="Integracoes e automacao"
              eyebrow="Integracoes"
              icon={<Zap className="h-5 w-5" />}
              isDarkTheme={isDarkTheme}
              actions={
                <button
                  type="button"
                  onClick={() => setCriticalAction('reset-api')}
                  className="rounded-2xl border border-amber-400/30 px-4 py-2.5 text-sm font-semibold text-amber-300 hover:bg-amber-500/10"
                >
                  Resetar API key
                </button>
              }
            >
              <div className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
                <div className="space-y-4">
                  <div className={['rounded-[26px] border p-4', isDarkTheme ? 'border-white/10 bg-black/20' : 'border-slate-200 bg-slate-50'].join(' ')}>
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className={['text-sm font-bold', isDarkTheme ? 'text-white' : 'text-slate-900'].join(' ')}>API Key</p>
                        <p className={['mt-1 text-xs', isDarkTheme ? 'text-slate-400' : 'text-slate-500'].join(' ')}>Use a chave para integrações seguras.</p>
                      </div>
                      <KeyRound className="h-5 w-5 text-cyan-300" />
                    </div>
                    <div className={['mt-4 flex items-center justify-between gap-3 rounded-2xl border px-4 py-3', isDarkTheme ? 'border-white/10 bg-slate-950/45' : 'border-slate-200 bg-white'].join(' ')}>
                      <code className={['truncate text-sm', isDarkTheme ? 'text-slate-200' : 'text-slate-700'].join(' ')}>{apiKey}</code>
                      <div className="flex items-center gap-2">
                        <button type="button" onClick={() => void copyApiKey()} className="rounded-xl border border-white/10 px-3 py-1.5 text-xs font-semibold text-cyan-300 hover:bg-white/10">
                          <span className="flex items-center gap-2"><Copy className="h-3.5 w-3.5" />Copiar</span>
                        </button>
                        <button type="button" onClick={() => setCriticalAction('reset-api')} className="rounded-xl border border-white/10 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-white/10">
                          <span className="flex items-center gap-2"><RefreshCw className="h-3.5 w-3.5" />Gerar</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className={['rounded-[26px] border p-4', isDarkTheme ? 'border-white/10 bg-black/20' : 'border-slate-200 bg-slate-50'].join(' ')}>
                    <p className={['text-sm font-bold', isDarkTheme ? 'text-white' : 'text-slate-900'].join(' ')}>Apps disponiveis</p>
                    <div className="mt-4 grid gap-3">
                      {[
                        { name: 'Discord', status: 'Conectavel', icon: <Disc3 className="h-4 w-4" /> },
                        { name: 'Workspace Chat', status: 'Conectavel', icon: <MessageSquareMore className="h-4 w-4" /> },
                        { name: 'Zapier', status: 'Pronto para automacao', icon: <Zap className="h-4 w-4" /> }
                      ].map((integration) => (
                        <div key={integration.name} className={['flex items-center justify-between rounded-2xl border px-4 py-3', isDarkTheme ? 'border-white/10 bg-slate-950/45' : 'border-slate-200 bg-white'].join(' ')}>
                          <div className="flex items-center gap-3">
                            <div className={['flex h-10 w-10 items-center justify-center rounded-2xl', isDarkTheme ? 'bg-white/10 text-slate-200' : 'bg-slate-100 text-slate-700'].join(' ')}>{integration.icon}</div>
                            <div>
                              <p className={['text-sm font-semibold', isDarkTheme ? 'text-white' : 'text-slate-900'].join(' ')}>{integration.name}</p>
                              <p className={['text-xs', isDarkTheme ? 'text-slate-400' : 'text-slate-500'].join(' ')}>{integration.status}</p>
                            </div>
                          </div>
                          <button type="button" onClick={() => showToast(`${integration.name} pronto para integrar`)} className="rounded-xl border border-white/10 px-3 py-1.5 text-xs font-semibold text-cyan-300 hover:bg-white/10">Configurar</button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className={['rounded-[26px] border p-4', isDarkTheme ? 'border-white/10 bg-black/20' : 'border-slate-200 bg-slate-50'].join(' ')}>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className={['text-sm font-bold', isDarkTheme ? 'text-white' : 'text-slate-900'].join(' ')}>Webhooks</p>
                      <p className={['mt-1 text-xs', isDarkTheme ? 'text-slate-400' : 'text-slate-500'].join(' ')}>Entregue eventos para sua infraestrutura.</p>
                    </div>
                    <Webhook className="h-5 w-5 text-cyan-300" />
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_180px_auto]">
                    <Field label="URL" value={newWebhookUrl} onChange={setNewWebhookUrl} placeholder="https://seu-sistema.com/hook" isDarkTheme={isDarkTheme} />
                    <label className="grid gap-2">
                      <span className={['text-xs font-semibold uppercase tracking-[0.2em]', isDarkTheme ? 'text-slate-400' : 'text-slate-500'].join(' ')}>Evento</span>
                      <select value={newWebhookEvent} onChange={(event) => setNewWebhookEvent(event.target.value)} className={['rounded-2xl border px-4 py-3 text-sm outline-none', isDarkTheme ? 'border-white/10 bg-slate-950/55 text-slate-100' : 'border-slate-200 bg-white text-slate-800'].join(' ')} style={isDarkTheme ? { colorScheme: 'dark' } : undefined}>
                        <option value="user.login">user.login</option>
                        <option value="billing.paid">billing.paid</option>
                        <option value="subscription.updated">subscription.updated</option>
                      </select>
                    </label>
                    <button type="button" onClick={() => void addWebhook()} className="mt-7 rounded-2xl bg-gradient-to-r from-cyan-400 to-blue-500 px-4 py-3 text-sm font-bold text-slate-950">{savingKey === 'webhook-add' ? 'Criando...' : 'Criar'}</button>
                  </div>
                  <div className="mt-4 space-y-3">
                    {webhooks.map((item) => (
                      <div key={item.id} className={['flex items-center justify-between gap-3 rounded-2xl border px-4 py-3', isDarkTheme ? 'border-white/10 bg-slate-950/45' : 'border-slate-200 bg-white'].join(' ')}>
                        <div>
                          <p className={['text-sm font-semibold', isDarkTheme ? 'text-white' : 'text-slate-900'].join(' ')}>{item.url}</p>
                          <p className={['mt-1 text-xs', isDarkTheme ? 'text-slate-400' : 'text-slate-500'].join(' ')}>{item.event} · {item.status === 'active' ? 'Ativo' : 'Pausado'}</p>
                        </div>
                        <button type="button" onClick={() => void removeWebhook(item.id)} className="rounded-xl border border-rose-400/30 px-3 py-1.5 text-xs font-semibold text-rose-300 hover:bg-rose-500/10">Remover</button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </SectionCard>
          </div>
        ) : null}

        {activeTab === 'system' ? (
          <div className="space-y-5">
            <SectionCard
              title="Preferencias de sistema"
              eyebrow="Sistema"
              icon={<Database className="h-5 w-5" />}
              isDarkTheme={isDarkTheme}
              actions={
                <button
                  type="button"
                  onClick={() => void saveSystem()}
                  className="rounded-2xl bg-gradient-to-r from-cyan-400 to-blue-500 px-4 py-2.5 text-sm font-bold text-slate-950"
                >
                  {savingKey === 'system' ? 'Salvando...' : 'Salvar sistema'}
                </button>
              }
            >
              <div className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="grid gap-2">
                    <span className={['text-xs font-semibold uppercase tracking-[0.2em]', isDarkTheme ? 'text-slate-400' : 'text-slate-500'].join(' ')}>Idioma</span>
                    <select value={systemPrefs.language} onChange={(event) => setSystemPrefs((current) => ({ ...current, language: event.target.value }))} className={['rounded-2xl border px-4 py-3 text-sm outline-none', isDarkTheme ? 'border-white/10 bg-slate-950/55 text-slate-100' : 'border-slate-200 bg-white text-slate-800'].join(' ')} style={isDarkTheme ? { colorScheme: 'dark' } : undefined}>
                      <option value="pt-BR">Portugues (Brasil)</option>
                      <option value="en-US">English (US)</option>
                      <option value="es-ES">Espanol</option>
                    </select>
                  </label>
                  <label className="grid gap-2">
                    <span className={['text-xs font-semibold uppercase tracking-[0.2em]', isDarkTheme ? 'text-slate-400' : 'text-slate-500'].join(' ')}>Fuso horario</span>
                    <select value={systemPrefs.timezone} onChange={(event) => setSystemPrefs((current) => ({ ...current, timezone: event.target.value }))} className={['rounded-2xl border px-4 py-3 text-sm outline-none', isDarkTheme ? 'border-white/10 bg-slate-950/55 text-slate-100' : 'border-slate-200 bg-white text-slate-800'].join(' ')} style={isDarkTheme ? { colorScheme: 'dark' } : undefined}>
                      <option value="America/Sao_Paulo">America/Sao_Paulo</option>
                      <option value="America/New_York">America/New_York</option>
                      <option value="Europe/Lisbon">Europe/Lisbon</option>
                    </select>
                  </label>
                  <label className="grid gap-2 sm:col-span-2">
                    <span className={['text-xs font-semibold uppercase tracking-[0.2em]', isDarkTheme ? 'text-slate-400' : 'text-slate-500'].join(' ')}>Formato de data</span>
                    <select value={systemPrefs.dateFormat} onChange={(event) => setSystemPrefs((current) => ({ ...current, dateFormat: event.target.value }))} className={['rounded-2xl border px-4 py-3 text-sm outline-none', isDarkTheme ? 'border-white/10 bg-slate-950/55 text-slate-100' : 'border-slate-200 bg-white text-slate-800'].join(' ')} style={isDarkTheme ? { colorScheme: 'dark' } : undefined}>
                      <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                      <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                      <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                    </select>
                  </label>
                </div>

                <div className={['rounded-[26px] border p-4', isDarkTheme ? 'border-white/10 bg-black/20' : 'border-slate-200 bg-slate-50'].join(' ')}>
                  <p className={['text-sm font-bold', isDarkTheme ? 'text-white' : 'text-slate-900'].join(' ')}>Acoes de conta</p>
                  <div className="mt-4 grid gap-3">
                    <button type="button" onClick={() => void runAction('export-data', async () => undefined, 'Exportacao iniciada')} className={['flex items-center justify-between rounded-2xl border px-4 py-3 text-sm font-semibold transition-all', isDarkTheme ? 'border-white/10 bg-slate-950/45 text-slate-200 hover:bg-slate-900' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'].join(' ')}>
                      <span className="flex items-center gap-3"><Download className="h-4 w-4" />Exportar dados</span>
                      {savingKey === 'export-data' ? <Loader2 className="h-4 w-4 animate-spin" /> : <ChevronRight className="h-4 w-4" />}
                    </button>
                    <button type="button" onClick={() => setCriticalAction('delete-account')} className="flex items-center justify-between rounded-2xl border border-rose-400/30 px-4 py-3 text-sm font-semibold text-rose-300 transition-all hover:bg-rose-500/10">
                      <span className="flex items-center gap-3"><Trash2 className="h-4 w-4" />Deletar conta</span>
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </SectionCard>
          </div>
        ) : null}
      </motion.div>
    </AnimatePresence>
  );

  return (
    <div className="mx-auto w-full max-w-[1500px]">
      <div className="grid gap-5 xl:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="xl:sticky xl:top-6 xl:self-start">
          <div className={[cardBase, 'overflow-hidden p-4'].join(' ')}>
            <div className="mb-4 flex items-center gap-3 rounded-[24px] border border-white/10 bg-[linear-gradient(135deg,rgba(34,211,238,0.15),rgba(124,58,237,0.18))] p-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-cyan-100">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <p className={['text-[11px] font-semibold uppercase tracking-[0.28em]', isDarkTheme ? 'text-cyan-300' : 'text-blue-700'].join(' ')}>Config hub</p>
                <p className={['mt-1 text-base font-black', isDarkTheme ? 'text-white' : 'text-slate-900'].join(' ')}>SYNCHO Settings</p>
              </div>
            </div>

            <nav className="flex gap-2 overflow-x-auto pb-2 xl:grid xl:gap-2 xl:overflow-visible xl:pb-0">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const active = activeTab === tab.id;

                return (
                  <motion.button
                    key={tab.id}
                    whileHover={{ x: 2 }}
                    whileTap={{ scale: 0.985 }}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={[
                      'min-w-[220px] rounded-[22px] border px-4 py-4 text-left transition-all xl:min-w-0',
                      active
                        ? 'border-cyan-400/60 bg-cyan-400/10 text-cyan-200 shadow-[0_0_0_4px_rgba(34,211,238,0.07)]'
                        : isDarkTheme
                          ? 'border-white/10 bg-white/[0.03] text-slate-300 hover:bg-white/[0.07]'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    ].join(' ')}
                  >
                    <div className="flex items-start gap-3">
                      <div className={[
                        'mt-0.5 flex h-10 w-10 items-center justify-center rounded-2xl',
                        active ? 'bg-cyan-400/15 text-cyan-200' : isDarkTheme ? 'bg-white/10 text-slate-300' : 'bg-slate-100 text-slate-700'
                      ].join(' ')}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-bold">{tab.label}</p>
                        <p className={['mt-1 text-xs leading-5', active ? 'text-cyan-100/80' : isDarkTheme ? 'text-slate-400' : 'text-slate-500'].join(' ')}>{tab.description}</p>
                      </div>
                    </div>
                  </motion.button>
                );
              })}
            </nav>
          </div>
        </aside>

        <div>{rightPane}</div>
      </div>

      <AnimatePresence>
        {criticalAction ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[90] grid place-items-center bg-slate-950/65 p-4 backdrop-blur-sm"
          >
            <motion.div
              initial={{ opacity: 0, y: 18, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 14, scale: 0.98 }}
              className={[cardBase, 'w-full max-w-md p-6'].join(' ')}
            >
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-500/15 text-rose-300">
                  <TriangleAlert className="h-5 w-5" />
                </div>
                <div>
                  <p className={['text-lg font-black', isDarkTheme ? 'text-white' : 'text-slate-900'].join(' ')}>Confirmar acao critica</p>
                  <p className={['mt-2 text-sm leading-6', isDarkTheme ? 'text-slate-400' : 'text-slate-500'].join(' ')}>
                    {criticalAction === 'logout-all' && 'Isso vai encerrar todas as sessoes ativas fora do dispositivo atual.'}
                    {criticalAction === 'cancel-plan' && 'A assinatura atual sera marcada para cancelamento e o billing sera interrompido.'}
                    {criticalAction === 'reset-api' && 'A chave atual deixara de funcionar imediatamente em todas as integracoes.'}
                    {criticalAction === 'delete-account' && 'Essa solicitacao iniciara o processo de exclusao definitiva da conta.'}
                    {criticalAction === 'end-session' && 'A sessao selecionada sera encerrada imediatamente.'}
                  </p>
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <button type="button" onClick={() => setCriticalAction(null)} className={['rounded-2xl border px-4 py-2.5 text-sm font-semibold', isDarkTheme ? 'border-white/10 text-slate-300 hover:bg-white/5' : 'border-slate-200 text-slate-700 hover:bg-slate-50'].join(' ')}>
                  Cancelar
                </button>
                <button type="button" onClick={() => void confirmCriticalAction()} className="rounded-2xl bg-rose-500 px-4 py-2.5 text-sm font-bold text-white hover:bg-rose-400">
                  Confirmar
                </button>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
};

export default SettingsWorkspace;
