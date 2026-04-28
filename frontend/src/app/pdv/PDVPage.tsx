import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import PDVWorkspace from '../../components/modules/PDVWorkspace';

const PDVPage = () => {
  const { isAuthenticated, loading } = useAuth();
  const [toasts, setToasts] = useState<Array<{ id: number; msg: string }>>([]);

  const showToast = (msg: string) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, msg }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3500);
  };

  if (loading) {
    return (
      <main className="grid min-h-screen place-items-center bg-slate-950 text-slate-100">
        <p className="text-sm text-slate-400">Carregando PDV...</p>
      </main>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <main className="flex h-screen flex-col bg-[radial-gradient(circle_at_top,rgba(14,116,144,0.12),transparent_40%),linear-gradient(180deg,#020617,#0f172a)]">
      <div className="flex shrink-0 items-center gap-4 border-b border-white/10 bg-slate-950/80 px-4 py-2.5 backdrop-blur">
        <Link
          to="/dashboard"
          className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-white/10 transition-colors"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          Dashboard
        </Link>
        <span className="text-xs text-slate-500">PDV - Tela cheia</span>
      </div>

      <div className="min-h-0 flex-1 p-3 sm:p-4">
        <PDVWorkspace showToast={showToast} />
      </div>

      <div className="fixed bottom-5 right-5 z-[100] flex flex-col gap-2 pointer-events-none">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, x: 60 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 60 }}
              className="rounded-xl border border-white/10 bg-slate-800 px-4 py-2.5 text-sm font-semibold text-slate-100 shadow-xl"
            >
              {t.msg}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </main>
  );
};

export default PDVPage;
