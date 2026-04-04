const BenefitsSection = () => {
  const cards = [
    { icon: '🚀', title: 'Produto pronto para venda', text: 'Comece a vender em dias, sem desenvolver tudo do zero.' },
    { icon: '🎨', title: 'Sistema white-label', text: 'Personalize marca, logo e identidade visual por empresa.' },
    { icon: '🛡️', title: 'Controle total do cliente', text: 'Gestao centralizada com permissoes e isolamento por tenant.' },
    { icon: '📈', title: 'Escalavel', text: 'Arquitetura pronta para crescer com novos clientes e planos.' },
    { icon: '🤝', title: 'Suporte integrado', text: 'Contato e atendimento diretamente dentro da plataforma.' },
    { icon: '⚡', title: 'Automacao de operacao', text: 'Reduza tarefas manuais e ganhe velocidade no dia a dia.' }
  ];

  return (
    <section id="beneficios" className="bg-slate-900/50 py-20">
      <div className="mx-auto w-full max-w-7xl px-6">
        <div>
          <h2 className="text-3xl font-bold text-white md:text-4xl">Beneficios</h2>
          <p className="mt-3 text-slate-300">Uma base completa para operar e vender sua SaaS com aparencia profissional.</p>
        </div>

        <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {cards.map((card) => (
            <article key={card.title} className="rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-lg shadow-slate-950/50">
              <span className="text-2xl">{card.icon}</span>
              <h3 className="mt-4 text-lg font-semibold text-white">{card.title}</h3>
              <p className="mt-2 text-sm text-slate-300">{card.text}</p>
            </article>
          ))}
        </div>

        <div className="mt-10 rounded-2xl border border-slate-800 bg-slate-950 p-6">
          <h3 className="text-xl font-semibold text-white">Como funciona</h3>
          <ol className="mt-6 grid gap-4 text-slate-300 md:grid-cols-3">
            <li className="rounded-xl border border-slate-800 bg-slate-900 p-4"><span className="font-semibold text-cyan-300">Passo 1:</span> Criar conta</li>
            <li className="rounded-xl border border-slate-800 bg-slate-900 p-4"><span className="font-semibold text-cyan-300">Passo 2:</span> Criar empresa automaticamente</li>
            <li className="rounded-xl border border-slate-800 bg-slate-900 p-4"><span className="font-semibold text-cyan-300">Passo 3:</span> Comecar a usar e vender</li>
          </ol>
        </div>
      </div>
    </section>
  );
};

export default BenefitsSection;
