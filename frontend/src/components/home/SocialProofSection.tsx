const SocialProofSection = () => {
  return (
    <section className="bg-slate-900/40 py-20">
      <div className="mx-auto w-full max-w-7xl px-6">
        <div className="rounded-3xl border border-slate-800 bg-slate-950 p-8 md:p-12">
          <p className="text-lg italic text-slate-200">
            "Com o Syncho Stock, conseguimos lancar nossa operacao SaaS white-label em semanas e escalar com seguranca."
          </p>
          <p className="mt-4 text-sm font-semibold text-cyan-300">Cliente satisfeito • Rede Parceira</p>

          <div className="mt-8 grid grid-cols-2 gap-4 md:w-2/3">
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <p className="text-3xl font-black text-white">+10k</p>
              <p className="text-sm text-slate-300">usuarios</p>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <p className="text-3xl font-black text-white">+1M</p>
              <p className="text-sm text-slate-300">produtos gerenciados</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default SocialProofSection;
