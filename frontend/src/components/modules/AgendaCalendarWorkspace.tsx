import { AnimatePresence, motion } from 'framer-motion';
import { useMemo, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, Clock3, Plus } from 'lucide-react';

type CalendarEvent = {
  id: string;
  title: string;
  description: string;
  date: string;
  time: string;
  duration: number;
  type: 'Reuniao' | 'Follow-up' | 'Entrega' | 'Financeiro';
};

type ViewMode = 'MENSAL' | 'SEMANAL';

type Props = {
  showToast: (message: string) => void;
};

const cardShell =
  'rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.9),rgba(2,6,23,0.82))] shadow-[0_24px_70px_-44px_rgba(15,23,42,0.95)] backdrop-blur-xl';

const eventColor = (type: CalendarEvent['type']) => {
  if (type === 'Reuniao') return 'bg-blue-500/20 text-blue-200 border-blue-400/30';
  if (type === 'Follow-up') return 'bg-cyan-500/20 text-cyan-200 border-cyan-400/30';
  if (type === 'Entrega') return 'bg-emerald-500/20 text-emerald-200 border-emerald-400/30';
  return 'bg-amber-500/20 text-amber-200 border-amber-400/30';
};

const toIsoDate = (date: Date) => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const weekdays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'];

const initialEvents: CalendarEvent[] = [
  {
    id: 'ev_1',
    title: 'Reuniao com time comercial',
    description: 'Ajustar metas de maio e estrategia outbound.',
    date: '2026-05-02',
    time: '09:30',
    duration: 60,
    type: 'Reuniao'
  },
  {
    id: 'ev_2',
    title: 'Follow-up cliente Atlas Foods',
    description: 'Revisar proposta enviada e fechamento final.',
    date: '2026-05-03',
    time: '14:00',
    duration: 30,
    type: 'Follow-up'
  },
  {
    id: 'ev_3',
    title: 'Entrega dashboard financeiro',
    description: 'Publicar ajustes do modulo analitico.',
    date: '2026-05-06',
    time: '16:00',
    duration: 45,
    type: 'Entrega'
  },
  {
    id: 'ev_4',
    title: 'Conferencia de faturas',
    description: 'Validar ciclo de cobranca do mes.',
    date: '2026-05-08',
    time: '11:15',
    duration: 50,
    type: 'Financeiro'
  }
];

const emptyEvent = {
  title: '',
  description: '',
  date: '',
  time: '',
  duration: 30,
  type: 'Reuniao' as CalendarEvent['type']
};

const AgendaCalendarWorkspace = ({ showToast }: Props) => {
  const [viewMode, setViewMode] = useState<ViewMode>('MENSAL');
  const [baseDate, setBaseDate] = useState(() => new Date());
  const [events, setEvents] = useState<CalendarEvent[]>(initialEvents);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [eventModalOpen, setEventModalOpen] = useState(false);
  const [eventForm, setEventForm] = useState(emptyEvent);

  const monthLabel = useMemo(
    () =>
      new Intl.DateTimeFormat('pt-BR', {
        month: 'long',
        year: 'numeric'
      }).format(baseDate),
    [baseDate]
  );

  const monthGrid = useMemo(() => {
    const startOfMonth = new Date(baseDate.getFullYear(), baseDate.getMonth(), 1);
    const endOfMonth = new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, 0);
    const leadingDays = startOfMonth.getDay();
    const totalDays = endOfMonth.getDate();

    const cells: Array<{ date: Date; inCurrentMonth: boolean }> = [];

    for (let index = leadingDays; index > 0; index -= 1) {
      const date = new Date(startOfMonth);
      date.setDate(date.getDate() - index);
      cells.push({ date, inCurrentMonth: false });
    }

    for (let day = 1; day <= totalDays; day += 1) {
      cells.push({ date: new Date(baseDate.getFullYear(), baseDate.getMonth(), day), inCurrentMonth: true });
    }

    while (cells.length < 42) {
      const lastDate = cells[cells.length - 1]?.date || endOfMonth;
      const date = new Date(lastDate);
      date.setDate(date.getDate() + 1);
      cells.push({ date, inCurrentMonth: false });
    }

    return cells;
  }, [baseDate]);

  const weekDates = useMemo(() => {
    const date = new Date(baseDate);
    const day = date.getDay();
    const start = new Date(date);
    start.setDate(date.getDate() - day);

    return Array.from({ length: 7 }).map((_, index) => {
      const current = new Date(start);
      current.setDate(start.getDate() + index);
      return current;
    });
  }, [baseDate]);

  const eventsByDate = useMemo(() => {
    return events.reduce<Record<string, CalendarEvent[]>>((acc, event) => {
      if (!acc[event.date]) acc[event.date] = [];
      acc[event.date].push(event);
      return acc;
    }, {});
  }, [events]);

  const selectedEvent = useMemo(() => events.find((event) => event.id === selectedEventId) || null, [events, selectedEventId]);

  const shiftPeriod = (direction: -1 | 1) => {
    const date = new Date(baseDate);
    if (viewMode === 'MENSAL') {
      date.setMonth(date.getMonth() + direction);
    } else {
      date.setDate(date.getDate() + 7 * direction);
    }
    setBaseDate(date);
  };

  const saveEvent = () => {
    if (!eventForm.title.trim() || !eventForm.date || !eventForm.time) {
      showToast('Preencha titulo, data e horario');
      return;
    }

    const newEvent: CalendarEvent = {
      id: `ev_${Date.now()}`,
      title: eventForm.title,
      description: eventForm.description,
      date: eventForm.date,
      time: eventForm.time,
      duration: Number(eventForm.duration) || 30,
      type: eventForm.type
    };

    setEvents((current) => [...current, newEvent]);
    setEventModalOpen(false);
    setEventForm(emptyEvent);
    showToast('Evento criado na agenda');
  };

  const renderMonthly = () => (
    <div className="space-y-3">
      <div className="grid grid-cols-7 gap-2">
        {weekdays.map((day) => (
          <div key={day} className="rounded-xl border border-white/10 bg-black/20 px-2 py-2 text-center text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-2">
        {monthGrid.map((cell) => {
          const isoDate = toIsoDate(cell.date);
          const dayEvents = eventsByDate[isoDate] || [];
          const isToday = isoDate === toIsoDate(new Date());

          return (
            <div
              key={`${isoDate}-${cell.inCurrentMonth ? 'm' : 'o'}`}
              className={[
                'min-h-[118px] rounded-2xl border p-2.5',
                cell.inCurrentMonth ? 'border-white/10 bg-black/20' : 'border-white/5 bg-black/10',
                isToday ? 'ring-2 ring-cyan-400/40' : ''
              ].join(' ')}
            >
              <div className="mb-2 flex items-center justify-between">
                <span className={['text-xs font-semibold', cell.inCurrentMonth ? 'text-slate-200' : 'text-slate-500'].join(' ')}>{cell.date.getDate()}</span>
                {dayEvents.length ? <span className="rounded-full bg-cyan-500/20 px-2 py-0.5 text-[10px] font-bold text-cyan-200">{dayEvents.length}</span> : null}
              </div>
              <div className="grid gap-1">
                {dayEvents.slice(0, 3).map((event) => (
                  <button
                    key={event.id}
                    type="button"
                    onClick={() => setSelectedEventId(event.id)}
                    className={['truncate rounded-lg border px-2 py-1 text-left text-[11px] font-semibold', eventColor(event.type)].join(' ')}
                  >
                    {event.time} · {event.title}
                  </button>
                ))}
                {dayEvents.length > 3 ? <p className="text-[10px] text-slate-500">+{dayEvents.length - 3} eventos</p> : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderWeekly = () => (
    <div className="grid gap-3 lg:grid-cols-7">
      {weekDates.map((date) => {
        const isoDate = toIsoDate(date);
        const dayEvents = eventsByDate[isoDate] || [];
        return (
          <div key={isoDate} className="rounded-2xl border border-white/10 bg-black/20 p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">{weekdays[date.getDay()]}</p>
            <p className="mt-1 text-sm font-bold text-white">{date.getDate()}</p>
            <div className="mt-3 grid gap-2">
              {dayEvents.length ? dayEvents.map((event) => (
                <button
                  key={event.id}
                  type="button"
                  onClick={() => setSelectedEventId(event.id)}
                  className={['rounded-xl border px-2.5 py-2 text-left text-xs font-semibold leading-5', eventColor(event.type)].join(' ')}
                >
                  {event.time} · {event.title}
                </button>
              )) : <p className="rounded-xl border border-dashed border-white/10 px-2.5 py-4 text-center text-xs text-slate-500">Sem eventos</p>}
            </div>
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="space-y-5">
      <section className={[cardShell, 'p-5 sm:p-6'].join(' ')}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-cyan-300">Agenda</p>
            <h1 className="mt-2 text-3xl font-black text-white">Calendario operacional</h1>
            <p className="mt-1 text-sm text-slate-400">Visual mensal e semanal inspirada em Google Calendar com eventos clicaveis.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setViewMode('MENSAL')}
              className={[
                'rounded-2xl border px-3.5 py-2 text-xs font-semibold transition-all',
                viewMode === 'MENSAL' ? 'border-cyan-400/60 bg-cyan-500/15 text-cyan-200' : 'border-white/10 bg-black/20 text-slate-300 hover:bg-white/10'
              ].join(' ')}
            >
              Mensal
            </button>
            <button
              type="button"
              onClick={() => setViewMode('SEMANAL')}
              className={[
                'rounded-2xl border px-3.5 py-2 text-xs font-semibold transition-all',
                viewMode === 'SEMANAL' ? 'border-cyan-400/60 bg-cyan-500/15 text-cyan-200' : 'border-white/10 bg-black/20 text-slate-300 hover:bg-white/10'
              ].join(' ')}
            >
              Semanal
            </button>
            <button
              type="button"
              onClick={() => setEventModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-400 to-blue-500 px-4 py-2.5 text-xs font-bold text-slate-950"
            >
              <Plus className="h-4 w-4" />
              Novo evento
            </button>
          </div>
        </div>

        <div className="mt-5 flex items-center justify-between rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-cyan-300" />
            <p className="text-sm font-semibold text-white capitalize">{monthLabel}</p>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => shiftPeriod(-1)} className="rounded-xl border border-white/10 p-2 text-slate-200 hover:bg-white/10"><ChevronLeft className="h-4 w-4" /></button>
            <button type="button" onClick={() => shiftPeriod(1)} className="rounded-xl border border-white/10 p-2 text-slate-200 hover:bg-white/10"><ChevronRight className="h-4 w-4" /></button>
          </div>
        </div>
      </section>

      <section className={[cardShell, 'p-4 sm:p-5'].join(' ')}>
        {viewMode === 'MENSAL' ? renderMonthly() : renderWeekly()}
      </section>

      <AnimatePresence>
        {selectedEvent ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[90] grid place-items-center bg-slate-950/70 p-4 backdrop-blur-sm"
          >
            <motion.div
              initial={{ opacity: 0, y: 16, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.98 }}
              className={[cardShell, 'w-full max-w-lg p-6'].join(' ')}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-xl font-black text-white">{selectedEvent.title}</h3>
                  <p className={['mt-2 inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold', eventColor(selectedEvent.type)].join(' ')}>{selectedEvent.type}</p>
                </div>
                <button type="button" onClick={() => setSelectedEventId(null)} className="rounded-xl border border-white/10 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-white/10">Fechar</button>
              </div>
              <p className="mt-4 text-sm leading-6 text-slate-300">{selectedEvent.description}</p>
              <div className="mt-4 grid gap-2 text-sm text-slate-200">
                <p className="inline-flex items-center gap-2"><CalendarDays className="h-4 w-4 text-cyan-300" />{selectedEvent.date}</p>
                <p className="inline-flex items-center gap-2"><Clock3 className="h-4 w-4 text-cyan-300" />{selectedEvent.time} ({selectedEvent.duration} min)</p>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {eventModalOpen ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[90] grid place-items-center bg-slate-950/70 p-4 backdrop-blur-sm"
          >
            <motion.div
              initial={{ opacity: 0, y: 16, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.98 }}
              className={[cardShell, 'w-full max-w-xl p-6'].join(' ')}
            >
              <h3 className="text-xl font-black text-white">Novo evento</h3>
              <div className="mt-4 grid gap-3">
                <input value={eventForm.title} onChange={(event) => setEventForm((current) => ({ ...current, title: event.target.value }))} placeholder="Titulo" className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-slate-100 outline-none focus:border-cyan-400" />
                <textarea value={eventForm.description} onChange={(event) => setEventForm((current) => ({ ...current, description: event.target.value }))} rows={3} placeholder="Descricao" className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-slate-100 outline-none focus:border-cyan-400" />
                <div className="grid gap-3 sm:grid-cols-3">
                  <input type="date" value={eventForm.date} onChange={(event) => setEventForm((current) => ({ ...current, date: event.target.value }))} className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-slate-100 outline-none focus:border-cyan-400" />
                  <input type="time" value={eventForm.time} onChange={(event) => setEventForm((current) => ({ ...current, time: event.target.value }))} className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-slate-100 outline-none focus:border-cyan-400" />
                  <input type="number" min={15} step={15} value={eventForm.duration} onChange={(event) => setEventForm((current) => ({ ...current, duration: Number(event.target.value) }))} className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-slate-100 outline-none focus:border-cyan-400" />
                </div>
                <select value={eventForm.type} onChange={(event) => setEventForm((current) => ({ ...current, type: event.target.value as CalendarEvent['type'] }))} className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-slate-100">
                  <option value="Reuniao">Reuniao</option>
                  <option value="Follow-up">Follow-up</option>
                  <option value="Entrega">Entrega</option>
                  <option value="Financeiro">Financeiro</option>
                </select>
              </div>
              <div className="mt-5 flex justify-end gap-2">
                <button type="button" onClick={() => setEventModalOpen(false)} className="rounded-2xl border border-white/10 px-4 py-2.5 text-sm font-semibold text-slate-200 hover:bg-white/10">Cancelar</button>
                <button type="button" onClick={saveEvent} className="rounded-2xl bg-gradient-to-r from-cyan-400 to-blue-500 px-4 py-2.5 text-sm font-bold text-slate-950">Salvar evento</button>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
};

export default AgendaCalendarWorkspace;
