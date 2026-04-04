const features = [
  { title: 'Gestao de estoque', description: 'Controle entradas, saidas e reposicao em tempo real por empresa.', icon: '📦' },
  { title: 'Controle de vendas', description: 'Acompanhe vendas, historico e faturamento com visao clara.', icon: '💰' },
  { title: 'Dashboard inteligente', description: 'Metrica de desempenho com indicadores para decisoes rapidas.', icon: '📊' },
  { title: 'Chat em tempo real', description: 'Comunicacao fluida com equipe e suporte dentro da plataforma.', icon: '💬' },
  { title: 'Multi-empresa (SaaS)', description: 'Cada cliente com ambiente isolado e seguro.', icon: '🏢' },
  { title: 'Sistema de planos', description: 'Monetize com assinaturas Basic, Pro e Premium.', icon: '🧩' }
];

const FeaturesSection = () => {
  return (
    <section id="funcionalidades" className="mx-auto w-full max-w-7xl px-6 py-20">
      <div className="mb-10">
        <h2 className="text-3xl font-bold text-white md:text-4xl">Funcionalidades</h2>
        <p className="mt-3 text-slate-300">Tudo que voce precisa para operar e vender sua solucao SaaS.</p>
      </div>

      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {features.map((feature) => (
          <article key={feature.title} className="rounded-xl border border-slate-800 bg-slate-900/80 p-6 shadow-lg shadow-slate-950/50 transition hover:-translate-y-1 hover:border-blue-500/50">
            <span className="text-2xl">{feature.icon}</span>
            <h3 className="mt-4 text-lg font-semibold text-white">{feature.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-300">{feature.description}</p>
          </article>
        ))}
      </div>
    </section>
  );
};

export default FeaturesSection;
