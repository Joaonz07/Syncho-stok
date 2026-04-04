import { Link } from 'react-router-dom';
import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { redirectByRole } from '../lib/session';
import { useAuth } from '../context/AuthContext';

const RegisterPage = () => {
  const { signIn } = useAuth();
  const [name, setName] = useState('');
  const [companyName, setCompanyName] = useState('');
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

    if (!name.trim() || !companyName.trim() || !email.trim() || !password) {
      setStatus('Preencha nome, empresa, email e senha.');
      return;
    }

    setLoading(true);
    setStatus('Criando conta...');

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          companyName: companyName.trim(),
          email: email.trim(),
          password
        })
      });

      const result = await response.json();

      if (!response.ok) {
        setStatus(result.message || 'Falha ao criar conta.');
        return;
      }

      const loginResult = await signIn(email.trim(), password);

      if (!loginResult.success) {
        setStatus('Conta criada, mas nao foi possivel autenticar automaticamente. Faca login.');
        return;
      }

      setStatus('Conta criada com sucesso. Redirecionando...');
      redirectByRole('CLIENT');
    } catch (_error) {
      setStatus('Erro de rede ao cadastrar.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-100 grid place-items-center p-6">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_18%_18%,rgba(59,130,246,0.24),transparent_35%),radial-gradient(circle_at_82%_0%,rgba(34,211,238,0.18),transparent_38%)]" />
      <section className="w-full max-w-xl rounded-3xl border border-slate-800 bg-slate-900/85 p-8 shadow-[0_30px_80px_-30px_rgba(59,130,246,0.45)] backdrop-blur">
        <p className="mb-3 inline-flex rounded-full border border-blue-500/40 bg-blue-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-blue-300">
          Criar conta
        </p>
        <h1 className="text-3xl font-black">Cadastrar</h1>
        <p className="mt-2 text-slate-300">Crie sua conta e empresa automaticamente.</p>
        <form className="mt-6 grid gap-4" onSubmit={handleSubmit}>
          <input className="rounded-xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-slate-100 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20" placeholder="Nome" value={name} onChange={(event) => setName(event.target.value)} />
          <input className="rounded-xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-slate-100 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20" placeholder="Nome da empresa" value={companyName} onChange={(event) => setCompanyName(event.target.value)} />
          <input className="rounded-xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-slate-100 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20" placeholder="Email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
          <input className="rounded-xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-slate-100 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20" placeholder="Senha" type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
          <button disabled={loading} type="submit" className="rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white transition hover:bg-blue-500 disabled:opacity-70">{loading ? 'Criando...' : 'Criar conta'}</button>
        </form>
        <p className={`mt-4 text-sm ${statusClass}`}>{status}</p>
        <p className="mt-5 text-sm text-slate-300">Ja tem conta? <Link to="/login" className="text-blue-300 hover:text-blue-200">Entrar</Link></p>
      </section>
    </main>
  );
};

export default RegisterPage;
