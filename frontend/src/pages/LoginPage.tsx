import { Navigate } from 'react-router-dom';
import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Eye, EyeOff, Loader2, Lock, Mail } from 'lucide-react';
import { redirectByRole } from '../lib/session';
import { useAuth } from '../context/AuthContext';

const LoginPage = () => {
  const { signIn, isAuthenticated, loading: authLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberPassword, setRememberPassword] = useState(true);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);

  const statusClass = useMemo(() => {
    if (status.toLowerCase().includes('sucesso')) {
      return 'saas-status-success';
    }

    if (status) {
      return 'saas-status-error';
    }

    return 'saas-status-neutral';
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
      const result = await signIn(email.trim(), password, { remember: rememberPassword });

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
    <main className="relative grid min-h-screen place-items-center overflow-hidden bg-slate-950 p-6 text-slate-100">
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -top-24 left-[-15%] h-72 w-72 rounded-full bg-cyan-400/20 blur-3xl"
        animate={{ x: [0, 40, -10, 0], y: [0, 24, -16, 0], scale: [1, 1.12, 0.94, 1] }}
        transition={{ duration: 13, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -bottom-28 right-[-10%] h-80 w-80 rounded-full bg-blue-500/20 blur-3xl"
        animate={{ x: [0, -36, 12, 0], y: [0, -20, 18, 0], scale: [1, 0.92, 1.08, 1] }}
        transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut' }}
      />

      <motion.section
        initial={{ opacity: 0, y: 18, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.38, ease: 'easeOut' }}
        className="relative z-10 w-full max-w-md rounded-3xl border border-white/15 bg-white/[0.04] p-7 shadow-[0_24px_80px_-32px_rgba(14,165,233,0.55)] backdrop-blur-2xl md:p-8"
      >
        <p className="mb-3 inline-flex items-center rounded-full border border-cyan-300/30 bg-cyan-300/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-200">
          Syncho PDV
        </p>
        <h1 className="text-3xl font-black tracking-tight text-slate-50 md:text-[2.1rem]">Entrar</h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-300 md:text-[0.95rem]">
          Acesse seu CRM e gerencie o funil de vendas em um painel rapido e profissional.
        </p>

        <form className="mt-7 grid gap-4" onSubmit={handleSubmit}>
          <label className="group relative block">
            <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-cyan-300" />
            <input
              className="w-full rounded-xl border border-slate-600/70 bg-slate-950/45 py-3 pl-10 pr-4 text-sm text-slate-100 transition-all duration-200 placeholder:text-slate-500 focus:border-cyan-300/85 focus:outline-none focus:ring-4 focus:ring-cyan-400/15"
              placeholder="Email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>

          <label className="group relative block">
            <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-cyan-300" />
            <input
              className="w-full rounded-xl border border-slate-600/70 bg-slate-950/45 py-3 pl-10 pr-12 text-sm text-slate-100 transition-all duration-200 placeholder:text-slate-500 focus:border-cyan-300/85 focus:outline-none focus:ring-4 focus:ring-cyan-400/15"
              placeholder="Senha"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
            <button
              type="button"
              onClick={() => setShowPassword((current) => !current)}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 transition hover:text-slate-200"
              aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </label>

          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input
              type="checkbox"
              checked={rememberPassword}
              onChange={(event) => setRememberPassword(event.target.checked)}
              className="h-4 w-4 rounded border-slate-600 bg-slate-900 text-blue-500 focus:ring-blue-500/40"
            />
            Lembrar senha
          </label>

          <motion.button
            whileHover={!loading ? { y: -2, scale: 1.01 } : undefined}
            whileTap={!loading ? { scale: 0.98 } : undefined}
            transition={{ duration: 0.16 }}
            disabled={loading}
            type="submit"
            className="mt-1 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 via-blue-400 to-cyan-400 px-4 py-3 text-sm font-bold text-white shadow-[0_12px_30px_-16px_rgba(56,189,248,0.85)] transition disabled:cursor-not-allowed disabled:opacity-75"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {loading ? 'Entrando...' : 'Entrar'}
          </motion.button>
        </form>

        <AnimatePresence mode="wait">
          {status ? (
            <motion.p
              key={status}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className={`mt-4 text-sm ${statusClass}`}
            >
              {status}
            </motion.p>
          ) : null}
        </AnimatePresence>
      </motion.section>
    </main>
  );
};

export default LoginPage;
