import React from 'react';

type FeatureItem = {
  title: string;
  description: string;
  icon: string;
};

type PlanItem = {
  name: 'Basic' | 'Pro' | 'Premium';
  price: string;
  highlight?: boolean;
  features: string[];
};

const features: FeatureItem[] = [
  {
    title: 'Gestao de estoque',
    description: 'Controle entradas, saidas e reposicao em tempo real por empresa.',
    icon: '📦'
  },
  {
    title: 'Controle de vendas',
    description: 'Acompanhe vendas, historico e faturamento com visao clara.',
    icon: '💰'
  },
  {
    title: 'Dashboard inteligente',
    description: 'Metrica de desempenho com indicadores para decisoes rapidas.',
    icon: '📊'
  },
  {
    title: 'Chat em tempo real',
    description: 'Comunicacao fluida com equipe e suporte dentro da plataforma.',
    icon: '💬'
  },
  {
    title: 'Multi-empresa (SaaS)',
    description: 'Cada cliente com ambiente isolado e seguro (multi-tenant).',
    icon: '🏢'
  },
  {
    title: 'Sistema de planos',
    description: 'Monetize com assinaturas Basic, Pro e Premium.',
    icon: '🧩'
  }
];

const plans: PlanItem[] = [
  {
    name: 'Basic',
    price: 'R$ 49/mes',
    features: ['Ate 50 produtos', 'Painel essencial', 'Suporte padrao']
  },
  {
    name: 'Pro',
    price: 'R$ 129/mes',
    highlight: true,
    features: ['Ate 500 produtos', 'Relatorios completos', 'Automacoes avancadas']
  },
  {
    name: 'Premium',
    price: 'R$ 299/mes',
    features: ['Produtos ilimitados', 'Acesso total', 'Chat prioritario']
  }
];

const HeaderSection = () => (
  <header className="sticky top-0 z-40 border-b border-slate-800 bg-slate-950/80 backdrop-blur">
    <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-4">
      <a href="#" className="text-xl font-bold tracking-tight text-white">
        Syncho Stock
      </a>

      <nav className="hidden items-center gap-8 text-sm text-slate-300 md:flex">
        <a href="#funcionalidades" className="transition hover:text-cyan-300">
          Funcionalidades
        </a>
        <a href="#beneficios" className="transition hover:text-cyan-300">
          Beneficios
        </a>
        <a href="#planos" className="transition hover:text-cyan-300">
          Planos
        </a>
      </nav>

      <div className="flex items-center gap-3">
        <button className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-slate-500 hover:text-white">
          Entrar
        </button>
        <button className="rounded-lg bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300">
          Cadastrar
        </button>
      </div>
    </div>
  </header>
);

const HeroSection = () => (
  <section className="relative overflow-hidden px-6 py-20 md:py-28">
    <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_20%_20%,rgba(34,211,238,0.25),transparent_35%),radial-gradient(circle_at_80%_0%,rgba(14,165,233,0.2),transparent_35%)]" />

    <div className="mx-auto grid w-full max-w-7xl items-center gap-12 lg:grid-cols-2">
      <div>
        <p className="mb-4 inline-flex rounded-full border border-cyan-500/40 bg-cyan-500/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">
          Plataforma SaaS White-label
        </p>

        <h1 className="text-4xl font-black leading-tight text-white sm:text-5xl lg:text-6xl">
          Gerencie e venda seu sistema de estoque com facilidade
        </h1>

        <p className="mt-6 max-w-2xl text-lg text-slate-300">
          Crie sua propria plataforma e gerencie empresas, produtos e vendas em poucos passos.
        </p>

        <div className="mt-10 flex flex-wrap gap-4">
          <button className="rounded-xl bg-cyan-400 px-6 py-3 text-base font-bold text-slate-950 transition hover:bg-cyan-300">
            Comecar agora
          </button>
          <button className="rounded-xl border border-slate-700 px-6 py-3 text-base font-semibold text-slate-200 transition hover:border-slate-500 hover:text-white">
            Falar com suporte
          </button>
        </div>
      </div>

      <div className="relative">
        <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-6 shadow-[0_30px_80px_-30px_rgba(34,211,238,0.45)]">
          <div className="mb-5 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-200">Mockup de Dashboard</h3>
            <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-300">
              Online
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
              <p className="text-xs text-slate-400">Empresas ativas</p>
              <p className="mt-2 text-2xl font-bold text-white">284</p>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
              <p className="text-xs text-slate-400">Produtos</p>
              <p className="mt-2 text-2xl font-bold text-white">95.120</p>
            </div>
            <div className="col-span-2 rounded-2xl border border-slate-800 bg-slate-950 p-4">
              <p className="text-xs text-slate-400">Vendas do mes</p>
              <p className="mt-2 text-2xl font-bold text-cyan-300">R$ 1.230.490</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
);

const FeaturesSection = () => (
  <section id="funcionalidades" className="mx-auto w-full max-w-7xl px-6 py-20">
    <div className="mb-10">
      <h2 className="text-3xl font-bold text-white md:text-4xl">Funcionalidades</h2>
      <p className="mt-3 text-slate-300">Tudo que voce precisa para operar e vender sua solucao SaaS.</p>
    </div>

    <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
      {features.map((feature) => (
        <article
          key={feature.title}
          className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 transition hover:-translate-y-1 hover:border-cyan-500/40"
        >
          <span className="text-2xl">{feature.icon}</span>
          <h3 className="mt-4 text-lg font-semibold text-white">{feature.title}</h3>
          <p className="mt-2 text-sm leading-relaxed text-slate-300">{feature.description}</p>
        </article>
      ))}
    </div>
  </section>
);

const BenefitsSection = () => (
  <section id="beneficios" className="bg-slate-900/50 py-20">
    <div className="mx-auto grid w-full max-w-7xl gap-10 px-6 lg:grid-cols-2">
      <div>
        <h2 className="text-3xl font-bold text-white md:text-4xl">Beneficios</h2>
        <ul className="mt-6 space-y-4 text-slate-200">
          <li>Produto pronto para venda</li>
          <li>Sistema white-label</li>
          <li>Controle total do cliente</li>
          <li>Escalavel</li>
          <li>Suporte integrado</li>
        </ul>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-950 p-6">
        <h3 className="text-xl font-semibold text-white">Como funciona</h3>
        <ol className="mt-6 space-y-4 text-slate-300">
          <li>
            <span className="font-semibold text-cyan-300">Passo 1:</span> Criar conta
          </li>
          <li>
            <span className="font-semibold text-cyan-300">Passo 2:</span> Criar empresa automaticamente
          </li>
          <li>
            <span className="font-semibold text-cyan-300">Passo 3:</span> Comecar a usar e vender
          </li>
        </ol>
      </div>
    </div>
  </section>
);

const PlansSection = () => (
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
            'rounded-2xl border p-6',
            plan.highlight
              ? 'border-cyan-400 bg-gradient-to-b from-cyan-500/15 to-slate-900 shadow-[0_18px_45px_-24px_rgba(34,211,238,0.8)]'
              : 'border-slate-800 bg-slate-900/80'
          ].join(' ')}
        >
          <h3 className="text-xl font-semibold text-white">{plan.name}</h3>
          <p className="mt-4 text-3xl font-black text-white">{plan.price}</p>
          <ul className="mt-6 space-y-2 text-sm text-slate-200">
            {plan.features.map((feature) => (
              <li key={feature}>• {feature}</li>
            ))}
          </ul>
          <button className="mt-8 w-full rounded-xl bg-cyan-400 px-4 py-3 font-semibold text-slate-950 transition hover:bg-cyan-300">
            Escolher plano
          </button>
        </article>
      ))}
    </div>
  </section>
);

const SocialProofSection = () => (
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

const FinalCtaSection = () => (
  <section className="mx-auto w-full max-w-7xl px-6 py-20">
    <div className="rounded-3xl border border-cyan-500/40 bg-cyan-500/10 p-10 text-center">
      <h2 className="text-3xl font-black text-white md:text-4xl">Comece agora gratuitamente</h2>
      <p className="mt-4 text-slate-200">Ative sua plataforma SaaS e transforme seu controle de estoque em negocio.</p>
      <button className="mt-8 rounded-2xl bg-cyan-400 px-8 py-4 text-lg font-bold text-slate-950 transition hover:bg-cyan-300">
        Comecar agora
      </button>
    </div>
  </section>
);

const FooterSection = () => (
  <footer className="border-t border-slate-800 py-8">
    <div className="mx-auto flex w-full max-w-7xl flex-col items-center justify-between gap-4 px-6 text-sm text-slate-400 md:flex-row">
      <p>© {new Date().getFullYear()} Syncho Stock</p>
      <div className="flex items-center gap-6">
        <a href="#" className="hover:text-slate-200">
          Termos
        </a>
        <a href="#" className="hover:text-slate-200">
          Privacidade
        </a>
        <a href="#" className="hover:text-slate-200">
          Contato
        </a>
      </div>
    </div>
  </footer>
);

const Home: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <HeaderSection />
      <HeroSection />
      <FeaturesSection />
      <BenefitsSection />
      <PlansSection />
      <SocialProofSection />
      <FinalCtaSection />
      <FooterSection />
    </div>
  );
};

export default Home;
