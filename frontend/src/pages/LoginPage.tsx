import { Navigate } from 'react-router-dom';
import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { Eye, EyeOff } from 'lucide-react';
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
    <main className="saas-page grid place-items-center p-6">
      <section className="saas-shell">
        <p className="saas-pill mb-3">
          CRM Login
        </p>
        <h1 className="saas-title">Entrar</h1>
        <p className="saas-subtitle">Acesse seu CRM e gerencie o funil de vendas em um unico painel.</p>
        <form className="mt-6 grid gap-4" onSubmit={handleSubmit}>
          <input
            className="saas-input"
            placeholder="Email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          <div className="relative">
            <input
              className="saas-input pr-12"
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
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input
              type="checkbox"
              checked={rememberPassword}
              onChange={(event) => setRememberPassword(event.target.checked)}
              className="h-4 w-4 rounded border-slate-600 bg-slate-900 text-blue-500 focus:ring-blue-500/40"
            />
            Lembrar senha
          </label>
          <button disabled={loading} type="submit" className="saas-btn-primary">
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
        <p className={`mt-4 text-sm ${statusClass}`}>{status}</p>
      </section>
    </main>
  );
};

export default LoginPage;
