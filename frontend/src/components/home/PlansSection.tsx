const plans = [
  { name: 'Basic', price: 'R$ 49/mes', features: ['Ate 50 produtos', 'Painel essencial', 'Suporte padrao'], highlight: false },
  { name: 'Pro', price: 'R$ 129/mes', features: ['Ate 500 produtos', 'Relatorios completos', 'Automacoes avancadas'], highlight: true },
  { name: 'Premium', price: 'R$ 299/mes', features: ['Produtos ilimitados', 'Acesso total', 'Chat prioritario'], highlight: false }
];

const PlansSection = () => {
  return (
    <section id="planos" className="mx-auto w-full max-w-7xl px-6 py-20">
      <div className="mb-10">
        <h2 className="text-3xl font-bold text-white md:text-4xl">Planos</h2>
        <p className="mt-3 text-slate-300">Escolha o plano ideal para escalar seu negocio.</p>
      </div>

      <div className="grid gap-5 md:grid-cols-3">
        {plans.map((plan) => (
          <article
            key={plan.name}
            className={[
              'rounded-xl border p-6 shadow-lg transition hover:-translate-y-1',
              plan.highlight
                ? 'border-blue-500 bg-gradient-to-b from-blue-500/20 to-slate-900 shadow-[0_20px_50px_-25px_rgba(59,130,246,0.9)]'
                : 'border-slate-800 bg-slate-900/80 hover:border-slate-700'
            ].join(' ')}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold text-white">{plan.name}</h3>
              {plan.highlight ? <span className="rounded-full bg-blue-500/20 px-3 py-1 text-xs font-semibold text-blue-200">Mais recomendado</span> : null}
            </div>
            <p className="mt-4 text-3xl font-black text-white">{plan.price}</p>
            <ul className="mt-6 space-y-2 text-sm text-slate-200">
              {plan.features.map((feature) => (
                <li key={feature}>• {feature}</li>
              ))}
            </ul>
            <button className="mt-8 w-full rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white transition hover:bg-blue-500">
              Escolher plano
            </button>
          </article>
        ))}
      </div>
    </section>
  );
};

export default PlansSection;
