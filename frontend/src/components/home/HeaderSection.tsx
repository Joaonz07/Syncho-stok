import { Link } from 'react-router-dom';

const HeaderSection = () => {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-800 bg-slate-950/80 backdrop-blur">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-4">
        <Link to="/" className="rounded-xl border border-slate-700 bg-slate-900/80 px-4 py-2 text-xl font-bold tracking-tight text-white shadow-lg shadow-slate-950/40">
          Syncho Stock
        </Link>

        <nav className="hidden items-center gap-8 text-sm text-slate-300 md:flex">
          <a href="#funcionalidades" className="transition hover:text-cyan-300">Funcionalidades</a>
          <a href="#beneficios" className="transition hover:text-cyan-300">Beneficios</a>
          <a href="#planos" className="transition hover:text-cyan-300">Planos</a>
        </nav>

        <div className="flex items-center gap-3">
          <Link to="/login" className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-slate-500 hover:bg-slate-900 hover:text-white">
            Entrar
          </Link>
          <Link to="/register" className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-500 shadow-lg shadow-blue-900/40">
            Comecar
          </Link>
        </div>
      </div>
    </header>
  );
};

export default HeaderSection;
