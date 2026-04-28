import { Navigate } from 'react-router-dom';
import { useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, Eye, EyeOff, Loader2, Lock, Mail, Sparkles } from 'lucide-react';
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
  const emailInputRef = useRef<HTMLInputElement | null>(null);

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
    <main className="relative min-h-screen overflow-hidden bg-[#050816] text-slate-100">
      <motion.div
        aria-hidden
        className="pointer-events-none absolute left-[-10%] top-[-8%] h-72 w-72 rounded-full bg-fuchsia-500/20 blur-3xl"
        animate={{ x: [0, 30, -12, 0], y: [0, 24, -14, 0], scale: [1, 1.08, 0.96, 1] }}
        transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        aria-hidden
        className="pointer-events-none absolute bottom-[-12%] right-[-8%] h-96 w-96 rounded-full bg-cyan-400/20 blur-3xl"
        animate={{ x: [0, -38, 14, 0], y: [0, -22, 18, 0], scale: [1, 0.92, 1.08, 1] }}
        transition={{ duration: 16, repeat: Infinity, ease: 'easeInOut' }}
      />
      <div className="relative z-10 grid min-h-screen grid-cols-1 lg:grid-cols-[1.08fr_0.92fr]">
        <motion.section
          initial={{ opacity: 0, x: -48 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
          className="relative flex min-h-[42vh] overflow-hidden bg-[linear-gradient(135deg,#2563eb_0%,#5b21b6_48%,#06b6d4_100%)] px-6 py-10 sm:px-10 lg:min-h-screen lg:px-16 lg:py-16"
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.2),transparent_38%),radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.12),transparent_32%)]" />
          <motion.div
            aria-hidden
            className="absolute right-[-8%] top-[12%] h-52 w-52 rounded-full border border-white/20 bg-white/10 backdrop-blur-2xl"
            animate={{ y: [0, -12, 0], rotate: [0, 8, 0] }}
            transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.div
            aria-hidden
            className="absolute bottom-[10%] left-[12%] h-24 w-24 rounded-3xl border border-white/15 bg-slate-950/15 backdrop-blur-2xl"
            animate={{ y: [0, 10, 0], x: [0, 8, 0] }}
            transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
          />

          <div className="relative z-10 flex w-full flex-col justify-between">
            <div className="flex items-center gap-4">
              <div className="relative flex h-16 w-16 items-center justify-center rounded-[22px] border border-white/25 bg-white/10 shadow-[0_18px_45px_-20px_rgba(15,23,42,0.75)] backdrop-blur-xl">
                <div className="absolute h-9 w-9 rounded-full bg-cyan-300/60 blur-xl" />
                <Sparkles className="relative h-7 w-7 text-white" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.35em] text-cyan-100/80">Plataforma CRM</p>
                <h1 className="mt-1 text-3xl font-black tracking-[0.18em] text-white sm:text-4xl">SYNCHO</h1>
              </div>
            </div>

            <div className="mt-12 max-w-xl lg:mt-0">
              <motion.p
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55, delay: 0.15 }}
                className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.28em] text-white/85 backdrop-blur-xl"
              >
                <span className="h-2 w-2 rounded-full bg-cyan-200" />
                Operacao inteligente
              </motion.p>
              <motion.h2
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.22 }}
                className="mt-6 max-w-lg text-4xl font-black leading-tight text-white sm:text-5xl"
              >
                Vendas, clientes e rotina comercial num fluxo rapido e elegante.
              </motion.h2>
              <motion.p
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
                className="mt-5 max-w-md text-sm leading-7 text-cyan-50/84 sm:text-base"
              >
                Centralize atendimento, acompanhe oportunidades e opere seu time com uma interface clara, moderna e pronta para desktop.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.38 }}
                className="mt-8 flex flex-wrap items-center gap-3"
              >
                <motion.button
                  whileHover={{ y: -2, scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="button"
                  onClick={() => emailInputRef.current?.focus()}
                  className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-bold text-sky-700 shadow-[0_20px_40px_-22px_rgba(15,23,42,0.9)] transition hover:bg-slate-100"
                >
                  Comecar
                  <ArrowRight className="h-4 w-4" />
                </motion.button>
                <span className="text-sm text-white/70">Acesso rapido para CRM, PDV e operacao comercial.</span>
              </motion.div>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.65, delay: 0.45 }}
              className="mt-10 hidden grid-cols-3 gap-3 text-white/90 sm:grid lg:mt-0"
            >
              <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-xl">
                <p className="text-xs uppercase tracking-[0.25em] text-white/60">Gestao</p>
                <strong className="mt-2 block text-lg font-black">Painel unificado</strong>
              </div>
              <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-xl">
                <p className="text-xs uppercase tracking-[0.25em] text-white/60">Acesso</p>
                <strong className="mt-2 block text-lg font-black">Login seguro</strong>
              </div>
              <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-xl">
                <p className="text-xs uppercase tracking-[0.25em] text-white/60">Fluxo</p>
                <strong className="mt-2 block text-lg font-black">Experiencia fluida</strong>
              </div>
            </motion.div>
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, x: 42 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.72, ease: 'easeOut', delay: 0.08 }}
          className="flex items-center justify-center px-5 py-8 sm:px-8 lg:px-12"
        >
          <div className="w-full max-w-md rounded-[30px] border border-white/10 bg-white/[0.05] p-6 shadow-[0_26px_80px_-36px_rgba(8,15,37,0.95)] backdrop-blur-2xl sm:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-300">Acesso a conta</p>
            <h3 className="mt-4 text-3xl font-black tracking-tight text-white">Entrar</h3>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              Entre com seu email corporativo para continuar no ambiente Syncho.
            </p>

            <form className="mt-8 grid gap-4" onSubmit={handleSubmit}>
              <label className="group relative block">
                <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500 transition-colors group-focus-within:text-cyan-300" />
                <input
                  ref={emailInputRef}
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/60 py-3.5 pl-11 pr-4 text-sm text-slate-100 transition-all duration-200 placeholder:text-slate-500 focus:border-cyan-300/85 focus:outline-none focus:ring-4 focus:ring-cyan-400/10"
                  placeholder="Email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </label>

              <label className="group relative block">
                <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500 transition-colors group-focus-within:text-cyan-300" />
                <input
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/60 py-3.5 pl-11 pr-12 text-sm text-slate-100 transition-all duration-200 placeholder:text-slate-500 focus:border-cyan-300/85 focus:outline-none focus:ring-4 focus:ring-cyan-400/10"
                  placeholder="Senha"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-2 text-slate-400 transition hover:bg-white/5 hover:text-slate-200"
                  aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </label>

              <div className="flex items-center justify-between gap-3 text-sm text-slate-300">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={rememberPassword}
                    onChange={(event) => setRememberPassword(event.target.checked)}
                    className="h-4 w-4 rounded border-slate-600 bg-slate-900 text-cyan-400 focus:ring-cyan-400/40"
                  />
                  Lembrar senha
                </label>
                <span className="text-xs text-slate-400">Cadastro somente por admin</span>
              </div>

              <motion.button
                whileHover={!loading ? { y: -2, scale: 1.01 } : undefined}
                whileTap={!loading ? { scale: 0.985 } : undefined}
                transition={{ duration: 0.16 }}
                disabled={loading}
                type="submit"
                className="mt-2 inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-500 to-cyan-400 px-4 py-3.5 text-sm font-bold text-white shadow-[0_18px_40px_-22px_rgba(34,211,238,0.8)] transition hover:shadow-[0_22px_46px_-24px_rgba(59,130,246,0.85)] disabled:cursor-not-allowed disabled:opacity-75"
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

            <p className="mt-6 text-center text-sm text-slate-400">
              Para novos acessos, solicite criacao de conta ao administrador.
            </p>
          </div>
        </motion.section>
      </div>
    </main>
  );
};

export default LoginPage;
