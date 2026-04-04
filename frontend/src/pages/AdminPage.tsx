import { useEffect, useState } from 'react';
import { companiesApi, authApi } from '../services/api';
import type { Company, User, SubscriptionPlan } from '@shared/types';

const PLANS: SubscriptionPlan[] = ['BASIC', 'PRO', 'PREMIUM'];

export default function AdminPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [companyUsers, setCompanyUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateCompany, setShowCreateCompany] = useState(false);
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [newCompanyName, setNewCompanyName] = useState('');
  const [newUser, setNewUser] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchCompanies = async () => {
    setLoading(true);
    try {
      const res = await companiesApi.list();
      setCompanies(res.data.data);
    } catch {
      setError('Falha ao carregar empresas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanies();
  }, []);

  const handleSelectCompany = async (company: Company) => {
    setSelectedCompany(company);
    try {
      const res = await companiesApi.users(company.id);
      setCompanyUsers(res.data.data as unknown as User[]);
    } catch {
      setCompanyUsers([]);
    }
  };

  const handleCreateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await companiesApi.create({ name: newCompanyName });
      setNewCompanyName('');
      setShowCreateCompany(false);
      await fetchCompanies();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdatePlan = async (companyId: string, plan: SubscriptionPlan) => {
    try {
      await companiesApi.updatePlan(companyId, plan);
      setCompanies((prev) => prev.map((c) => (c.id === companyId ? { ...c, plan } : c)));
      if (selectedCompany?.id === companyId) {
        setSelectedCompany((prev) => (prev ? { ...prev, plan } : prev));
      }
    } catch {
      setError('Failed to update plan');
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCompany) return;
    setSaving(true);
    setError(null);
    try {
      await authApi.register({ ...newUser, companyId: selectedCompany.id });
      setNewUser({ name: '', email: '', password: '' });
      setShowCreateUser(false);
      const res = await companiesApi.users(selectedCompany.id);
      setCompanyUsers(res.data.data as unknown as User[]);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Painel Admin</h1>
        <p className="text-gray-500 mt-1">Gerencie empresas, usuários e planos</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-600">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Companies list */}
        <div className="lg:col-span-1 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-900">Empresas</h2>
            <button
              onClick={() => setShowCreateCompany(true)}
              className="btn-primary text-sm py-1.5"
            >
              + Criar
            </button>
          </div>

          {showCreateCompany && (
            <form onSubmit={handleCreateCompany} className="card space-y-3">
              <input
                className="input"
                placeholder="Nome da empresa"
                required
                value={newCompanyName}
                onChange={(e) => setNewCompanyName(e.target.value)}
              />
              <div className="flex gap-2">
                <button type="submit" className="btn-primary flex-1" disabled={saving}>
                  {saving ? 'Criando...' : 'Criar'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateCompany(false)}
                  className="btn-secondary flex-1"
                >
                  Cancelar
                </button>
              </div>
            </form>
          )}

          <div className="space-y-2">
            {companies.map((company) => (
              <div
                key={company.id}
                onClick={() => handleSelectCompany(company)}
                className={`card cursor-pointer transition-all ${
                  selectedCompany?.id === company.id
                    ? 'border-primary-300 bg-primary-50'
                    : 'hover:border-gray-300'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{company.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {new Date(company.createdAt).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  <span
                    className={
                      company.plan === 'PREMIUM'
                        ? 'badge-premium'
                        : company.plan === 'PRO'
                        ? 'badge-pro'
                        : 'badge-basic'
                    }
                  >
                    {company.plan}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Company detail */}
        {selectedCompany && (
          <div className="lg:col-span-2 space-y-4">
            <div className="card">
              <h2 className="text-base font-semibold text-gray-900 mb-4">
                {selectedCompany.name}
              </h2>

              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-600">Plano:</span>
                <div className="flex gap-2">
                  {PLANS.map((plan) => (
                    <button
                      key={plan}
                      onClick={() => handleUpdatePlan(selectedCompany.id, plan)}
                      className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                        selectedCompany.plan === plan
                          ? 'bg-primary-600 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {plan}
                    </button>
                  ))}
                </div>
              </div>

              <p className="text-xs text-gray-400 font-mono mt-3">ID: {selectedCompany.id}</p>
            </div>

            {/* Users */}
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-semibold text-gray-900">
                  Usuários ({companyUsers.length})
                </h3>
                <button
                  onClick={() => setShowCreateUser(true)}
                  className="btn-primary text-sm py-1.5"
                >
                  + Usuário
                </button>
              </div>

              {showCreateUser && (
                <form onSubmit={handleCreateUser} className="space-y-3 mb-4 p-4 bg-gray-50 rounded-lg">
                  <input
                    className="input"
                    placeholder="Nome"
                    required
                    value={newUser.name}
                    onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                  />
                  <input
                    className="input"
                    type="email"
                    placeholder="E-mail"
                    required
                    value={newUser.email}
                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  />
                  <input
                    className="input"
                    type="password"
                    placeholder="Senha"
                    required
                    minLength={6}
                    value={newUser.password}
                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  />
                  <div className="flex gap-2">
                    <button type="submit" className="btn-primary flex-1" disabled={saving}>
                      {saving ? 'Criando...' : 'Criar'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowCreateUser(false)}
                      className="btn-secondary flex-1"
                    >
                      Cancelar
                    </button>
                  </div>
                </form>
              )}

              <div className="divide-y divide-gray-100">
                {companyUsers.length === 0 ? (
                  <p className="text-sm text-gray-400 py-4 text-center">
                    Nenhum usuário cadastrado
                  </p>
                ) : (
                  companyUsers.map((u) => (
                    <div key={u.id} className="py-3 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{u.name}</p>
                        <p className="text-xs text-gray-500">{u.email}</p>
                      </div>
                      <span className={u.role === 'ADMIN' ? 'badge-admin' : 'badge-client'}>
                        {u.role}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
