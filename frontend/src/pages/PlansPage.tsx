import { Link } from 'react-router-dom';
import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, Loader2, Sparkles } from 'lucide-react';
import { apiFetch as fetch } from '../lib/api';
import { getAccessToken, getCompanyId, getRole, redirectByRole } from '../lib/session';

const plans = [
  { name: 'Basic', price: 'R$ 49/mes', items: ['Ate 50 produtos', 'Dashboard essencial'] },
  { name: 'Pro', price: 'R$ 129/mes', items: ['Relatorios completos', 'Escala de operacao'] },
  { name: 'Premium', price: 'R$ 299/mes', items: ['Acesso total', 'Chat prioritario'] }
];

const PlansPage = () => {
  const [status, setStatus] = useState('');
  const [loadingPlan, setLoadingPlan] = useState('');

  const statusClass = useMemo(() => {
    if (status.toLowerCase().includes('sucesso')) {
      return 'saas-status-success';
    }

    if (status) {
      return 'saas-status-error';
    }

    return 'saas-status-neutral';
  }, [status]);

  const handleChoosePlan = async (plan: 'BASIC' | 'PRO' | 'PREMIUM') => {
    const token = getAccessToken();
    const role = getRole();
    const companyId = getCompanyId();

    if (!token) {
      setStatus('Entre com sua conta para escolher um plano.');
      return;
    }

    const targetCompanyId = role === 'ADMIN' ? window.prompt('Informe o Company ID') || '' : companyId;

    if (!targetCompanyId) {
      setStatus('Company ID nao informado.');
      return;
    }

    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + 1);

    setLoadingPlan(plan);
    setStatus('Processando assinatura simulada...');

    try {
      const response = await fetch('/api/dashboard/subscribe', {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          plan,
          companyId: targetCompanyId,
          expiresAt: expiresAt.toISOString()
        })
      });

      const result = await response.json();

      if (!response.ok) {
        setStatus(result.message || 'Falha ao escolher plano.');
        return;
      }

      setStatus(`Plano ${plan} ativado com sucesso.`);
      if (role) {
        setTimeout(() => redirectByRole(role), 700);
      }
    } catch (_error) {
      setStatus('Erro de rede ao escolher plano.');
    } finally {
      setLoadingPlan('');
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-950 p-6 text-slate-100 md:p-10">
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -top-24 left-[-12%] h-80 w-80 rounded-full bg-cyan-400/15 blur-3xl"
        animate={{ x: [0, 42, -12, 0], y: [0, 22, -10, 0], scale: [1, 1.1, 0.95, 1] }}
        transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -bottom-32 right-[-12%] h-[26rem] w-[26rem] rounded-full bg-blue-500/15 blur-3xl"
        animate={{ x: [0, -40, 8, 0], y: [0, -18, 16, 0], scale: [1, 0.92, 1.08, 1] }}
        transition={{ duration: 16, repeat: Infinity, ease: 'easeInOut' }}
      />

      <div className="relative z-10 mx-auto max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex items-center justify-between"
        >
          <div>
            <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-cyan-300/30 bg-cyan-300/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-200">
              <Sparkles className="h-3 w-3" />
              Assinatura
            </p>
            <h1 className="text-3xl font-black tracking-tight text-slate-50 md:text-[2.1rem]">Planos</h1>
          </div>

          <Link to="/" className="rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-slate-200 transition hover:border-cyan-300/40 hover:text-cyan-200">
            Voltar
          </Link>
        </motion.div>

        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {plans.map((plan, index) => {
            const upperName = plan.name.toUpperCase() as 'BASIC' | 'PRO' | 'PREMIUM';
            const isLoadingCurrentPlan = loadingPlan === upperName;

            return (
              <motion.article
                key={plan.name}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.32, delay: index * 0.06 }}
                whileHover={{ y: -4, scale: 1.01 }}
                className="rounded-2xl border border-white/15 bg-white/[0.04] p-6 shadow-[0_16px_44px_-26px_rgba(14,165,233,0.45)] backdrop-blur-2xl"
              >
                <h2 className="text-2xl font-semibold text-slate-100">{plan.name}</h2>
                <p className="mt-3 text-3xl font-black text-slate-50">{plan.price}</p>
                <ul className="mt-4 space-y-2 text-sm text-slate-300">
                  {plan.items.map((item) => (
                    <li key={item} className="inline-flex items-center gap-2">
                      <Check className="h-4 w-4 text-cyan-300" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
                <motion.button
                  whileHover={!isLoadingCurrentPlan ? { y: -2, scale: 1.01 } : undefined}
                  whileTap={!isLoadingCurrentPlan ? { scale: 0.98 } : undefined}
                  className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 via-blue-400 to-cyan-400 px-4 py-3 text-sm font-bold text-white shadow-[0_12px_30px_-16px_rgba(56,189,248,0.85)] transition disabled:cursor-not-allowed disabled:opacity-75"
                  onClick={() => handleChoosePlan(upperName)}
                  disabled={isLoadingCurrentPlan}
                >
                  {isLoadingCurrentPlan ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  {isLoadingCurrentPlan ? 'Processando...' : 'Escolher plano'}
                </motion.button>
              </motion.article>
            );
          })}
        </div>

        <AnimatePresence mode="wait">
          {status ? (
            <motion.p
              key={status}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className={`mt-6 text-sm ${statusClass}`}
            >
              {status}
            </motion.p>
          ) : null}
        </AnimatePresence>
      </div>
    </main>
  );
};

export default PlansPage;
