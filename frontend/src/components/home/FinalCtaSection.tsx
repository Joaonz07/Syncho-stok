import { Link } from 'react-router-dom';

const FinalCtaSection = () => {
  return (
    <section className="mx-auto w-full max-w-7xl px-6 py-20">
      <div className="rounded-3xl border border-cyan-500/40 bg-cyan-500/10 p-10 text-center">
        <h2 className="text-3xl font-black text-white md:text-4xl">Comece agora gratuitamente</h2>
        <p className="mt-4 text-slate-200">Ative sua plataforma SaaS e transforme seu controle de estoque em negocio.</p>
        <Link to="/register" className="mt-8 inline-block rounded-2xl bg-cyan-400 px-8 py-4 text-lg font-bold text-slate-950 transition hover:bg-cyan-300">
          Comecar agora
        </Link>
      </div>
    </section>
  );
};

export default FinalCtaSection;
