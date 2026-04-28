import { AnimatePresence, motion } from 'framer-motion';
import { Plus, FileText } from 'lucide-react';
import { useMemo, useState } from 'react';

type BudgetStatus = 'PENDENTE' | 'APROVADO' | 'RECUSADO';

type BudgetItem = {
  id: string;
  client: string;
  value: number;
  status: BudgetStatus;
  date: string;
  note: string;
};

type Props = {
  showToast: (message: string) => void;
};

const cardShell =
  'rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.9),rgba(2,6,23,0.82))] shadow-[0_24px_70px_-44px_rgba(15,23,42,0.95)] backdrop-blur-xl';

const initialBudgets: BudgetItem[] = [
  { id: 'orc_1', client: 'Atlas Foods', value: 18900, status: 'PENDENTE', date: '2026-05-03', note: 'Pacote completo CRM + suporte premium' },
  { id: 'orc_2', client: 'Nova Stack', value: 9200, status: 'APROVADO', date: '2026-04-28', note: 'Implantacao dashboard comercial' },
  { id: 'orc_3', client: 'BluePort', value: 5400, status: 'RECUSADO', date: '2026-04-25', note: 'Plano basico com customizacao visual' },
  { id: 'orc_4', client: 'Lumen AI', value: 12700, status: 'PENDENTE', date: '2026-05-04', note: 'Modulo API + governanca de dados' }
];

const statusClass = (status: BudgetStatus) => {
  if (status === 'APROVADO') return 'bg-emerald-500/15 text-emerald-300 border-emerald-400/30';
  if (status === 'RECUSADO') return 'bg-rose-500/15 text-rose-300 border-rose-400/30';
  return 'bg-amber-500/15 text-amber-300 border-amber-400/30';
};

const fmtCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(value);

const emptyBudget: Omit<BudgetItem, 'id'> = {
  client: '',
  value: 0,
  status: 'PENDENTE',
  date: '',
  note: ''
};

const BudgetsWorkspace = ({ showToast }: Props) => {
  const [items, setItems] = useState<BudgetItem[]>(initialBudgets);
  const [statusFilter, setStatusFilter] = useState<'TODOS' | BudgetStatus>('TODOS');
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [formData, setFormData] = useState<Omit<BudgetItem, 'id'>>(emptyBudget);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesStatus = statusFilter === 'TODOS' || item.status === statusFilter;
      const matchesSearch = `${item.client} ${item.note}`.toLowerCase().includes(search.toLowerCase());
      return matchesStatus && matchesSearch;
    });
  }, [items, statusFilter, search]);

  const saveBudget = () => {
    if (!formData.client.trim() || !formData.date || Number(formData.value) <= 0) {
      showToast('Preencha cliente, valor e data');
      return;
    }

    setItems((current) => [
      {
        id: `orc_${Date.now()}`,
        client: formData.client,
        value: Number(formData.value),
        status: formData.status,
        date: formData.date,
        note: formData.note
      },
      ...current
    ]);

    setFormOpen(false);
    setFormData(emptyBudget);
    showToast('Novo orcamento criado');
  };

  const updateStatus = (id: string, status: BudgetStatus) => {
    setItems((current) => current.map((item) => (item.id === id ? { ...item, status } : item)));
    showToast('Status do orcamento atualizado');
  };

  return (
    <div className="space-y-5">
      <section className={[cardShell, 'p-5 sm:p-6'].join(' ')}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-cyan-300">Orcamentos</p>
            <h1 className="mt-2 text-3xl font-black text-white">Propostas comerciais</h1>
            <p className="mt-1 text-sm text-slate-400">Tabela dedicada para acompanhamento de propostas e decisao comercial.</p>
          </div>
          <button
            type="button"
            onClick={() => setFormOpen(true)}
            className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-400 to-blue-500 px-4 py-3 text-sm font-bold text-slate-950"
          >
            <Plus className="h-4 w-4" />
            Novo orcamento
          </button>
        </div>

        <div className="mt-5 grid gap-3 lg:grid-cols-[1fr_auto]">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar cliente ou observacoes"
            className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-slate-100 outline-none focus:border-cyan-400"
          />
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as 'TODOS' | BudgetStatus)}
            className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-slate-100"
          >
            <option value="TODOS">Todos os status</option>
            <option value="PENDENTE">Pendente</option>
            <option value="APROVADO">Aprovado</option>
            <option value="RECUSADO">Recusado</option>
          </select>
        </div>
      </section>

      <section className={[cardShell, 'p-4 sm:p-5'].join(' ')}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] text-sm">
            <thead>
              <tr className="border-b border-white/10 text-left text-[11px] uppercase tracking-[0.22em] text-slate-500">
                <th className="px-3 py-3">Cliente</th>
                <th className="px-3 py-3">Valor</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-3 py-3">Data</th>
                <th className="px-3 py-3">Observacao</th>
                <th className="px-3 py-3 text-right">Acoes</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item) => (
                <tr key={item.id} className="border-b border-white/5">
                  <td className="px-3 py-4 font-semibold text-white">{item.client}</td>
                  <td className="px-3 py-4 text-slate-200">{fmtCurrency(item.value)}</td>
                  <td className="px-3 py-4">
                    <span className={['rounded-full border px-3 py-1 text-xs font-semibold', statusClass(item.status)].join(' ')}>{item.status}</span>
                  </td>
                  <td className="px-3 py-4 text-slate-300">{item.date}</td>
                  <td className="px-3 py-4 text-slate-400">{item.note || '-'}</td>
                  <td className="px-3 py-4">
                    <div className="flex justify-end gap-2">
                      <button type="button" onClick={() => updateStatus(item.id, 'APROVADO')} className="rounded-xl border border-emerald-400/30 px-3 py-1.5 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/10">Aprovar</button>
                      <button type="button" onClick={() => updateStatus(item.id, 'RECUSADO')} className="rounded-xl border border-rose-400/30 px-3 py-1.5 text-xs font-semibold text-rose-300 hover:bg-rose-500/10">Recusar</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {!filteredItems.length ? (
          <div className="mt-3 rounded-2xl border border-dashed border-white/15 px-4 py-8 text-center text-xs text-slate-500">
            Nenhum orcamento encontrado com os filtros atuais.
          </div>
        ) : null}
      </section>

      <AnimatePresence>
        {formOpen ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[90] grid place-items-center bg-slate-950/70 p-4 backdrop-blur-sm"
          >
            <motion.div
              initial={{ opacity: 0, y: 16, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.98 }}
              className={[cardShell, 'w-full max-w-xl p-6'].join(' ')}
            >
              <h3 className="text-xl font-black text-white">Novo orcamento</h3>
              <div className="mt-4 grid gap-3">
                <input value={formData.client} onChange={(event) => setFormData((current) => ({ ...current, client: event.target.value }))} placeholder="Cliente" className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-slate-100 outline-none focus:border-cyan-400" />
                <div className="grid gap-3 sm:grid-cols-3">
                  <input type="number" min={0} value={formData.value} onChange={(event) => setFormData((current) => ({ ...current, value: Number(event.target.value) }))} placeholder="Valor" className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-slate-100 outline-none focus:border-cyan-400" />
                  <select value={formData.status} onChange={(event) => setFormData((current) => ({ ...current, status: event.target.value as BudgetStatus }))} className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-slate-100">
                    <option value="PENDENTE">Pendente</option>
                    <option value="APROVADO">Aprovado</option>
                    <option value="RECUSADO">Recusado</option>
                  </select>
                  <input type="date" value={formData.date} onChange={(event) => setFormData((current) => ({ ...current, date: event.target.value }))} className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-slate-100 outline-none focus:border-cyan-400" />
                </div>
                <textarea value={formData.note} onChange={(event) => setFormData((current) => ({ ...current, note: event.target.value }))} rows={4} placeholder="Observacao da proposta" className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-slate-100 outline-none focus:border-cyan-400" />
              </div>
              <div className="mt-5 flex justify-end gap-2">
                <button type="button" onClick={() => setFormOpen(false)} className="rounded-2xl border border-white/10 px-4 py-2.5 text-sm font-semibold text-slate-200 hover:bg-white/10">Cancelar</button>
                <button type="button" onClick={saveBudget} className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-400 to-blue-500 px-4 py-2.5 text-sm font-bold text-slate-950"><FileText className="h-4 w-4" />Salvar orcamento</button>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
};

export default BudgetsWorkspace;
