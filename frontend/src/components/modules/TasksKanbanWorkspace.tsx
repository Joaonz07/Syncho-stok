import { AnimatePresence, motion } from 'framer-motion';
import { useMemo, useState } from 'react';
import { CalendarClock, CheckCircle2, Filter, Plus, UserCircle2 } from 'lucide-react';

type Priority = 'BAIXA' | 'MEDIA' | 'ALTA';
type Status = 'PENDENTE' | 'EM_ANDAMENTO' | 'CONCLUIDO';

type TaskItem = {
  id: string;
  title: string;
  description: string;
  assignee: string;
  priority: Priority;
  dueDate: string;
  status: Status;
};

type Props = {
  showToast: (message: string) => void;
};

const columns: Array<{ key: Status; label: string }> = [
  { key: 'PENDENTE', label: 'Pendente' },
  { key: 'EM_ANDAMENTO', label: 'Em andamento' },
  { key: 'CONCLUIDO', label: 'Concluido' }
];

const initialTasks: TaskItem[] = [
  {
    id: 'tsk_1',
    title: 'Revisar funil de onboarding',
    description: 'Mapear gargalos dos 7 primeiros dias e propor automacoes.',
    assignee: 'Mariana Costa',
    priority: 'ALTA',
    dueDate: '2026-05-03',
    status: 'PENDENTE'
  },
  {
    id: 'tsk_2',
    title: 'Atualizar playbook comercial',
    description: 'Adicionar novo script de qualificacao para SDR.',
    assignee: 'Diego Ribeiro',
    priority: 'MEDIA',
    dueDate: '2026-05-05',
    status: 'PENDENTE'
  },
  {
    id: 'tsk_3',
    title: 'Configurar automacao de follow-up',
    description: 'Fluxo para leads sem resposta em 48h.',
    assignee: 'Aline Souza',
    priority: 'ALTA',
    dueDate: '2026-05-02',
    status: 'EM_ANDAMENTO'
  },
  {
    id: 'tsk_4',
    title: 'Auditar integrações de pagamento',
    description: 'Validar logs de erro e tentativas recusadas.',
    assignee: 'Rafael Mota',
    priority: 'ALTA',
    dueDate: '2026-04-30',
    status: 'EM_ANDAMENTO'
  },
  {
    id: 'tsk_5',
    title: 'Treinamento equipe suporte',
    description: 'Capacitar time para novos macros de atendimento.',
    assignee: 'Bruna Lima',
    priority: 'BAIXA',
    dueDate: '2026-05-10',
    status: 'CONCLUIDO'
  },
  {
    id: 'tsk_6',
    title: 'Checklist deploy mobile',
    description: 'Conferir performance e crash-free rate.',
    assignee: 'Joao Prado',
    priority: 'MEDIA',
    dueDate: '2026-05-07',
    status: 'CONCLUIDO'
  }
];

const priorityClass = (priority: Priority) => {
  if (priority === 'ALTA') return 'bg-rose-500/15 text-rose-300 border-rose-400/30';
  if (priority === 'MEDIA') return 'bg-amber-500/15 text-amber-300 border-amber-400/30';
  return 'bg-emerald-500/15 text-emerald-300 border-emerald-400/30';
};

const cardShell =
  'rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.9),rgba(2,6,23,0.82))] shadow-[0_24px_70px_-44px_rgba(15,23,42,0.95)] backdrop-blur-xl';

const emptyTask: Omit<TaskItem, 'id'> = {
  title: '',
  description: '',
  assignee: '',
  priority: 'MEDIA',
  dueDate: '',
  status: 'PENDENTE'
};

const TasksKanbanWorkspace = ({ showToast }: Props) => {
  const [tasks, setTasks] = useState<TaskItem[]>(initialTasks);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'TODOS' | Status>('TODOS');
  const [priorityFilter, setPriorityFilter] = useState<'TODAS' | Priority>('TODAS');
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [taskFormOpen, setTaskFormOpen] = useState(false);
  const [formState, setFormState] = useState<Omit<TaskItem, 'id'>>(emptyTask);

  const visibleTasks = useMemo(() => {
    return tasks.filter((task) => {
      const haystack = `${task.title} ${task.description} ${task.assignee}`.toLowerCase();
      const matchesSearch = haystack.includes(search.toLowerCase());
      const matchesStatus = statusFilter === 'TODOS' || task.status === statusFilter;
      const matchesPriority = priorityFilter === 'TODAS' || task.priority === priorityFilter;
      return matchesSearch && matchesStatus && matchesPriority;
    });
  }, [tasks, search, statusFilter, priorityFilter]);

  const tasksByColumn = useMemo(() => {
    return columns.reduce<Record<Status, TaskItem[]>>((acc, column) => {
      acc[column.key] = visibleTasks.filter((task) => task.status === column.key);
      return acc;
    }, { PENDENTE: [], EM_ANDAMENTO: [], CONCLUIDO: [] });
  }, [visibleTasks]);

  const openCreate = () => {
    setEditingTaskId(null);
    setFormState(emptyTask);
    setTaskFormOpen(true);
  };

  const openEdit = (task: TaskItem) => {
    setEditingTaskId(task.id);
    setFormState({
      title: task.title,
      description: task.description,
      assignee: task.assignee,
      priority: task.priority,
      dueDate: task.dueDate,
      status: task.status
    });
    setTaskFormOpen(true);
  };

  const saveTask = () => {
    if (!formState.title.trim() || !formState.assignee.trim() || !formState.dueDate) {
      showToast('Preencha titulo, responsavel e vencimento');
      return;
    }

    if (editingTaskId) {
      setTasks((current) => current.map((task) => (task.id === editingTaskId ? { ...task, ...formState } : task)));
      showToast('Tarefa atualizada');
    } else {
      const newTask: TaskItem = { id: `tsk_${Date.now()}`, ...formState };
      setTasks((current) => [newTask, ...current]);
      showToast('Tarefa criada');
    }

    setTaskFormOpen(false);
    setEditingTaskId(null);
    setFormState(emptyTask);
  };

  const onDropTask = (targetStatus: Status) => {
    if (!draggingTaskId) return;
    setTasks((current) =>
      current.map((task) => (task.id === draggingTaskId ? { ...task, status: targetStatus } : task))
    );
    setDraggingTaskId(null);
  };

  const markDone = (taskId: string) => {
    setTasks((current) => current.map((task) => (task.id === taskId ? { ...task, status: 'CONCLUIDO' } : task)));
    showToast('Tarefa concluida');
  };

  return (
    <div className="space-y-5">
      <section className={[cardShell, 'p-5 sm:p-6'].join(' ')}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-cyan-300">Modulo de tarefas</p>
            <h1 className="mt-2 text-3xl font-black text-white">Kanban operacional</h1>
            <p className="mt-1 text-sm text-slate-400">Fluxo Trello-style com drag and drop, filtros e ciclo completo de tarefas.</p>
          </div>
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-400 to-blue-500 px-4 py-3 text-sm font-bold text-slate-950"
          >
            <Plus className="h-4 w-4" />
            Criar tarefa
          </button>
        </div>

        <div className="mt-5 grid gap-3 lg:grid-cols-[1fr_auto_auto]">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar titulo, descricao ou responsavel"
            className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-slate-100 outline-none focus:border-cyan-400"
          />
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as 'TODOS' | Status)}
            className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-slate-100"
          >
            <option value="TODOS">Todos os status</option>
            <option value="PENDENTE">Pendente</option>
            <option value="EM_ANDAMENTO">Em andamento</option>
            <option value="CONCLUIDO">Concluido</option>
          </select>
          <select
            value={priorityFilter}
            onChange={(event) => setPriorityFilter(event.target.value as 'TODAS' | Priority)}
            className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-slate-100"
          >
            <option value="TODAS">Todas as prioridades</option>
            <option value="ALTA">Alta</option>
            <option value="MEDIA">Media</option>
            <option value="BAIXA">Baixa</option>
          </select>
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-3">
        {columns.map((column) => (
          <div
            key={column.key}
            onDragOver={(event) => event.preventDefault()}
            onDrop={() => onDropTask(column.key)}
            className={[cardShell, 'min-h-[420px] p-4'].join(' ')}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-black uppercase tracking-[0.22em] text-slate-300">{column.label}</h2>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-cyan-200">
                {tasksByColumn[column.key].length}
              </span>
            </div>

            <div className="grid gap-3">
              <AnimatePresence>
                {tasksByColumn[column.key].map((task) => (
                  <motion.article
                    key={task.id}
                    layout
                    draggable
                    onDragStart={() => setDraggingTaskId(task.id)}
                    onDragEnd={() => setDraggingTaskId(null)}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="rounded-2xl border border-white/10 bg-black/25 p-4"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-sm font-bold text-white">{task.title}</h3>
                      <span className={['rounded-full border px-2.5 py-1 text-[11px] font-semibold', priorityClass(task.priority)].join(' ')}>
                        {task.priority}
                      </span>
                    </div>
                    <p className="mt-2 text-xs leading-5 text-slate-400">{task.description}</p>

                    <div className="mt-3 grid gap-2 text-xs text-slate-300">
                      <p className="inline-flex items-center gap-2"><UserCircle2 className="h-3.5 w-3.5" />{task.assignee}</p>
                      <p className="inline-flex items-center gap-2"><CalendarClock className="h-3.5 w-3.5" />Vence em {task.dueDate}</p>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => openEdit(task)}
                        className="rounded-xl border border-white/10 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-white/10"
                      >
                        Editar
                      </button>
                      {task.status !== 'CONCLUIDO' ? (
                        <button
                          type="button"
                          onClick={() => markDone(task.id)}
                          className="inline-flex items-center gap-1 rounded-xl border border-emerald-400/30 px-3 py-1.5 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/10"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Concluir
                        </button>
                      ) : null}
                    </div>
                  </motion.article>
                ))}
              </AnimatePresence>

              {!tasksByColumn[column.key].length ? (
                <div className="rounded-2xl border border-dashed border-white/15 px-4 py-8 text-center text-xs text-slate-500">
                  Sem tarefas neste status.
                </div>
              ) : null}
            </div>
          </div>
        ))}
      </div>

      <AnimatePresence>
        {taskFormOpen ? (
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
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-xl font-black text-white">{editingTaskId ? 'Editar tarefa' : 'Criar tarefa'}</h3>
                <button
                  type="button"
                  onClick={() => setTaskFormOpen(false)}
                  className="rounded-xl border border-white/10 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-white/10"
                >
                  Fechar
                </button>
              </div>

              <div className="grid gap-3">
                <input
                  value={formState.title}
                  onChange={(event) => setFormState((current) => ({ ...current, title: event.target.value }))}
                  placeholder="Titulo"
                  className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-slate-100 outline-none focus:border-cyan-400"
                />
                <textarea
                  value={formState.description}
                  onChange={(event) => setFormState((current) => ({ ...current, description: event.target.value }))}
                  rows={4}
                  placeholder="Descricao"
                  className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-slate-100 outline-none focus:border-cyan-400"
                />
                <div className="grid gap-3 sm:grid-cols-2">
                  <input
                    value={formState.assignee}
                    onChange={(event) => setFormState((current) => ({ ...current, assignee: event.target.value }))}
                    placeholder="Responsavel"
                    className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-slate-100 outline-none focus:border-cyan-400"
                  />
                  <input
                    type="date"
                    value={formState.dueDate}
                    onChange={(event) => setFormState((current) => ({ ...current, dueDate: event.target.value }))}
                    className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-slate-100 outline-none focus:border-cyan-400"
                  />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <select
                    value={formState.priority}
                    onChange={(event) => setFormState((current) => ({ ...current, priority: event.target.value as Priority }))}
                    className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-slate-100"
                  >
                    <option value="BAIXA">Baixa</option>
                    <option value="MEDIA">Media</option>
                    <option value="ALTA">Alta</option>
                  </select>
                  <select
                    value={formState.status}
                    onChange={(event) => setFormState((current) => ({ ...current, status: event.target.value as Status }))}
                    className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-slate-100"
                  >
                    <option value="PENDENTE">Pendente</option>
                    <option value="EM_ANDAMENTO">Em andamento</option>
                    <option value="CONCLUIDO">Concluido</option>
                  </select>
                </div>
              </div>

              <div className="mt-5 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setTaskFormOpen(false)}
                  className="rounded-2xl border border-white/10 px-4 py-2.5 text-sm font-semibold text-slate-200 hover:bg-white/10"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={saveTask}
                  className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-400 to-blue-500 px-4 py-2.5 text-sm font-bold text-slate-950"
                >
                  <Filter className="h-4 w-4" />
                  Salvar tarefa
                </button>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
};

export default TasksKanbanWorkspace;
