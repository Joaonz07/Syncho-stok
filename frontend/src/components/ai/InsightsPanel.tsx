import { useMemo } from 'react';
import { aiService } from '../../services/aiService';
import type { AiItemVenda, AiProduto, AiVenda } from '../../services/aiService';

type Props = {
  empresaId: string;
  produtos: AiProduto[];
  vendas: AiVenda[];
  itensVenda?: AiItemVenda[];
  estoqueMinimo?: number;
  className?: string;
};

const getInsightTone = (insight: string) => {
  const normalized = insight.toLowerCase();

  if (normalized.includes('cairam') || normalized.includes('risco') || normalized.includes('baixo')) {
    return 'danger';
  }

  if (normalized.includes('cresceram') || normalized.includes('mais vendido')) {
    return 'success';
  }

  if (normalized.includes('menos vendido') || normalized.includes('estaveis')) {
    return 'warning';
  }

  return 'neutral';
};

const toneClassMap = {
  danger: 'border-rose-200 bg-rose-50 text-rose-800',
  success: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  warning: 'border-amber-200 bg-amber-50 text-amber-800',
  neutral: 'border-slate-200 bg-slate-50 text-slate-700'
};

const InsightsPanel = ({
  empresaId,
  produtos,
  vendas,
  itensVenda = [],
  estoqueMinimo = 10,
  className = ''
}: Props) => {
  const insights = useMemo(
    () =>
      aiService.generateInsights({
        empresaId,
        produtos,
        vendas,
        itensVenda,
        estoqueMinimo
      }),
    [empresaId, produtos, vendas, itensVenda, estoqueMinimo]
  );

  return (
    <section className={[
      'rounded-2xl border border-slate-200 bg-white p-4',
      className
    ].join(' ')}>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-black text-slate-900">Insights IA</h2>
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Analise automatica</span>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        {insights.map((insight, index) => {
          const tone = getInsightTone(insight) as keyof typeof toneClassMap;

          return (
            <article
              key={`${insight}-${index}`}
              className={[
                'rounded-xl border p-3 text-sm font-medium',
                toneClassMap[tone]
              ].join(' ')}
            >
              {insight}
            </article>
          );
        })}
      </div>
    </section>
  );
};

export default InsightsPanel;
