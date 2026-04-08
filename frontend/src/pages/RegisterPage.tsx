import { Link } from 'react-router-dom';
import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Building2, Loader2, Lock, Mail, User } from 'lucide-react';
import { redirectByRole } from '../lib/session';
import { useAuth } from '../context/AuthContext';

const RegisterPage = () => {
  const { registerEmpresa } = useAuth();
  const [name, setName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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

    if (!name.trim() || !companyName.trim() || !email.trim() || !password) {
      setStatus('Preencha nome, empresa, email e senha.');
      return;
    }

    setLoading(true);
    setStatus('Criando conta...');

    try {
      const result = await registerEmpresa({
        empresaNome: companyName.trim(),
        empresaEmail: email.trim(),
        usuarioNome: name.trim(),
        email: email.trim(),
        senha: password,
        remember: true
      });

      if (!result.success) {
        setStatus(result.message || 'Falha ao criar conta.');
        return;
      }

      setStatus('Conta criada com sucesso. Redirecionando...');
      redirectByRole(result.role || 'CLIENT');
    } catch (_error) {
      setStatus('Erro de rede ao cadastrar.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden bg-slate-950 p-6 text-slate-100">
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -top-24 left-[-15%] h-72 w-72 rounded-full bg-cyan-400/20 blur-3xl"
        animate={{ x: [0, 36, -8, 0], y: [0, 20, -14, 0], scale: [1, 1.1, 0.95, 1] }}
        transition={{ duration: 13, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -bottom-28 right-[-10%] h-80 w-80 rounded-full bg-blue-500/20 blur-3xl"
        animate={{ x: [0, -32, 10, 0], y: [0, -18, 14, 0], scale: [1, 0.93, 1.06, 1] }}
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
        <h1 className="text-3xl font-black tracking-tight text-slate-50 md:text-[2.1rem]">Criar conta</h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-300 md:text-[0.95rem]">
          Cadastre sua empresa e comece a operar com um fluxo moderno e seguro.
        </p>

        <form className="mt-7 grid gap-4" onSubmit={handleSubmit}>
          <label className="group relative block">
            <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-cyan-300" />
            <input
              className="w-full rounded-xl border border-slate-600/70 bg-slate-950/45 py-3 pl-10 pr-4 text-sm text-slate-100 transition-all duration-200 placeholder:text-slate-500 focus:border-cyan-300/85 focus:outline-none focus:ring-4 focus:ring-cyan-400/15"
              placeholder="Nome"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </label>

          <label className="group relative block">
            <Building2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-cyan-300" />
            <input
              className="w-full rounded-xl border border-slate-600/70 bg-slate-950/45 py-3 pl-10 pr-4 text-sm text-slate-100 transition-all duration-200 placeholder:text-slate-500 focus:border-cyan-300/85 focus:outline-none focus:ring-4 focus:ring-cyan-400/15"
              placeholder="Nome da empresa"
              value={companyName}
              onChange={(event) => setCompanyName(event.target.value)}
            />
          </label>

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
              className="w-full rounded-xl border border-slate-600/70 bg-slate-950/45 py-3 pl-10 pr-4 text-sm text-slate-100 transition-all duration-200 placeholder:text-slate-500 focus:border-cyan-300/85 focus:outline-none focus:ring-4 focus:ring-cyan-400/15"
              placeholder="Senha"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
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
            {loading ? 'Criando...' : 'Criar conta'}
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

        <p className="mt-5 text-sm text-slate-300">
          Ja tem conta? <Link to="/login" className="font-semibold text-cyan-300 transition hover:text-cyan-200">Entrar</Link>
        </p>
      </motion.section>
    </main>
  );
};

export default RegisterPage;
