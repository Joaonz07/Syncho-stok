import { Navigate } from 'react-router-dom';
import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { redirectByRole } from '../lib/session';
import { useAuth } from '../context/AuthContext';

const LoginPage = () => {
  const { signIn, isAuthenticated, loading: authLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);

  const statusClass = useMemo(() => {
    if (status.toLowerCase().includes('sucesso')) {
      return 'text-emerald-400';
    }

    if (status) {
      return 'text-rose-400';
    }

    return 'text-slate-300';
  }, [status]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    if (!email.trim() || !password) {
      setStatus('Informe email e senha.');
      return;
    }

    setLoading(true);
    setStatus('Validando acesso...');

    try {
      const result = await signIn(email.trim(), password);

      if (!result.success) {
        setStatus(result.message || 'Falha no login.');
        return;
      }

      setStatus('Login realizado com sucesso. Redirecionando...');
      redirectByRole(result.role || 'CLIENT');
    } catch (_error) {
      setStatus('Erro de rede ao fazer login.');
    } finally {
      setLoading(false);
    }
  };

  if (!authLoading && isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-100 grid place-items-center p-6">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_20%_20%,rgba(59,130,246,0.24),transparent_35%),radial-gradient(circle_at_80%_0%,rgba(34,211,238,0.18),transparent_38%)]" />
      <section className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900/85 p-8 shadow-[0_30px_80px_-30px_rgba(59,130,246,0.45)] backdrop-blur">
        <p className="mb-3 inline-flex rounded-full border border-blue-500/40 bg-blue-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-blue-300">
          CRM Login
        </p>
        <h1 className="text-3xl font-black">Entrar</h1>
        <p className="mt-2 text-slate-300">Acesse seu CRM e gerencie o funil de vendas em um unico painel.</p>
        <form className="mt-6 grid gap-4" onSubmit={handleSubmit}>
          <input
            className="rounded-xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-slate-100 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20"
            placeholder="Email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          <input
            className="rounded-xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-slate-100 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20"
            placeholder="Senha"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          <button disabled={loading} type="submit" className="rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white transition hover:bg-blue-500 disabled:opacity-70">
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
        <p className={`mt-4 text-sm ${statusClass}`}>{status}</p>
      </section>
    </main>
  );
};

export default LoginPage;
