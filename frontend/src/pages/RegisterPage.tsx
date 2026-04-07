import { Link } from 'react-router-dom';
import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
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
    <main className="saas-page grid place-items-center p-6">
      <section className="saas-shell w-full max-w-xl">
        <p className="saas-pill mb-3">
          Criar conta
        </p>
        <h1 className="saas-title">Cadastrar</h1>
        <p className="saas-subtitle">Crie sua conta e empresa automaticamente.</p>
        <form className="mt-6 grid gap-4" onSubmit={handleSubmit}>
          <input className="saas-input" placeholder="Nome" value={name} onChange={(event) => setName(event.target.value)} />
          <input className="saas-input" placeholder="Nome da empresa" value={companyName} onChange={(event) => setCompanyName(event.target.value)} />
          <input className="saas-input" placeholder="Email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
          <input className="saas-input" placeholder="Senha" type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
          <button disabled={loading} type="submit" className="saas-btn-primary">{loading ? 'Criando...' : 'Criar conta'}</button>
        </form>
        <p className={`mt-4 text-sm ${statusClass}`}>{status}</p>
        <p className="mt-5 text-sm text-slate-300">Ja tem conta? <Link to="/login" className="saas-link">Entrar</Link></p>
      </section>
    </main>
  );
};

export default RegisterPage;
