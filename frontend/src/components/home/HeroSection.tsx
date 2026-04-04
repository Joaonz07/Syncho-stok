import { Link } from 'react-router-dom';

const HeroSection = () => {
  return (
    <section className="relative overflow-hidden px-6 pt-20 pb-24 md:pt-28 md:pb-28">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_20%_20%,rgba(59,130,246,0.25),transparent_35%),radial-gradient(circle_at_80%_0%,rgba(34,211,238,0.2),transparent_40%)]" />

      <div className="mx-auto w-full max-w-7xl">
        <div className="mx-auto max-w-4xl text-center">
          <p className="mb-5 inline-flex rounded-full border border-blue-500/40 bg-blue-500/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-blue-300">
            Plataforma SaaS White-label
          </p>

          <h1 className="text-4xl font-black leading-tight text-white sm:text-5xl lg:text-6xl">
            Gerencie e venda seu sistema de estoque com facilidade
          </h1>

          <p className="mx-auto mt-6 max-w-3xl text-lg text-slate-300">
            Crie sua propria plataforma e gerencie empresas, produtos e vendas em poucos passos.
          </p>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link to="/register" className="rounded-xl bg-blue-600 px-6 py-3 text-base font-bold text-white transition hover:bg-blue-500 shadow-lg shadow-blue-900/40">
              Comecar agora
            </Link>
            <a href="mailto:contato@syncho.cloud" className="rounded-xl border border-slate-700 px-6 py-3 text-base font-semibold text-slate-200 transition hover:border-slate-500 hover:bg-slate-900 hover:text-white">
              Falar com suporte
            </a>
          </div>
        </div>

        <div className="relative mx-auto mt-16 w-full max-w-4xl">
          <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-6 shadow-[0_30px_80px_-30px_rgba(59,130,246,0.55)]">
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-200">Mockup de Dashboard</h3>
              <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-300">
                Online
              </span>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5">
                <p className="text-xs text-slate-400">Empresas ativas</p>
                <p className="mt-2 text-2xl font-bold text-white">284</p>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5">
                <p className="text-xs text-slate-400">Produtos</p>
                <p className="mt-2 text-2xl font-bold text-white">95.120</p>
              </div>
              <div className="sm:col-span-2 rounded-2xl border border-slate-800 bg-slate-950 p-5">
                <p className="text-xs text-slate-400">Vendas do mes</p>
                <p className="mt-2 text-2xl font-bold text-cyan-300">R$ 1.230.490</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
