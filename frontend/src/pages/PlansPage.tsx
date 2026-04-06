import { Link } from 'react-router-dom';
import { useMemo, useState } from 'react';
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
    <main className="saas-page p-6 md:p-10">
      <div className="mx-auto max-w-6xl">
        <div className="flex items-center justify-between">
          <h1 className="saas-title">Planos</h1>
          <Link to="/" className="saas-link">Voltar</Link>
        </div>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {plans.map((plan) => (
            <article key={plan.name} className="glass-card glass-card-hover rounded-2xl p-6">
              <h2 className="text-2xl font-semibold">{plan.name}</h2>
              <p className="mt-3 text-3xl font-black">{plan.price}</p>
              <ul className="mt-4 space-y-2 text-sm text-slate-300">
                {plan.items.map((item) => (
                  <li key={item}>• {item}</li>
                ))}
              </ul>
              <button
                className="saas-btn-primary mt-6 w-full"
                onClick={() => handleChoosePlan(plan.name.toUpperCase() as 'BASIC' | 'PRO' | 'PREMIUM')}
                disabled={loadingPlan === plan.name.toUpperCase()}
              >
                {loadingPlan === plan.name.toUpperCase() ? 'Processando...' : 'Escolher plano'}
              </button>
            </article>
          ))}
        </div>
        <p className={`mt-6 text-sm ${statusClass}`}>{status}</p>
      </div>
    </main>
  );
};

export default PlansPage;
