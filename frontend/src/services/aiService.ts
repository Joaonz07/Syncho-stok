import type { Produto } from '../types/produto';
import type { ItemVenda, Venda } from '../types/venda';

export type AiProduto = Produto & { companyId?: string };
export type AiVenda = Venda & { companyId?: string };
export type AiItemVenda = ItemVenda & { companyId?: string };

export type InsightInput = {
  empresaId: string;
  produtos: AiProduto[];
  vendas: AiVenda[];
  itensVenda?: AiItemVenda[];
  dataReferencia?: Date;
  estoqueMinimo?: number;
};

type InsightProvider = 'local' | 'openai';

const startOfDay = (date: Date) => {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
};

const endOfDay = (date: Date) => {
  const next = new Date(date);
  next.setHours(23, 59, 59, 999);
  return next;
};

const filterByEmpresa = <T extends { companyId?: string }>(items: T[], empresaId: string) => {
  const target = String(empresaId || '').trim();
  return items.filter((item) => String(item.companyId || '').trim() === target);
};

const sumSalesInRange = (vendas: AiVenda[], from: Date, to: Date) => {
  return vendas
    .filter((venda) => {
      const vendaDate = new Date(venda.data);
      return vendaDate >= from && vendaDate <= to;
    })
    .reduce((acc, venda) => acc + Number(venda.total || 0), 0);
};

const calculateVariationPercent = (today: number, yesterday: number) => {
  if (yesterday <= 0) {
    return today > 0 ? 100 : 0;
  }

  return ((today - yesterday) / yesterday) * 100;
};

const formatPercent = (value: number) => `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;

const topByQuantity = (
  itensVenda: AiItemVenda[],
  produtos: AiProduto[],
  direction: 'max' | 'min'
): AiProduto | null => {
  const quantityByProduct = new Map<string, number>();

  for (const item of itensVenda) {
    quantityByProduct.set(
      item.produtoId,
      Number(quantityByProduct.get(item.produtoId) || 0) + Number(item.quantidade || 0)
    );
  }

  const validProducts = produtos.filter((produto) => quantityByProduct.has(produto.id));

  if (!validProducts.length) {
    return null;
  }

  return validProducts.reduce((selected, current) => {
    if (!selected) {
      return current;
    }

    const selectedQty = Number(quantityByProduct.get(selected.id) || 0);
    const currentQty = Number(quantityByProduct.get(current.id) || 0);

    if (direction === 'max') {
      return currentQty > selectedQty ? current : selected;
    }

    return currentQty < selectedQty ? current : selected;
  }, validProducts[0]);
};

const estimateRuptureDays = (produto: AiProduto, itensVenda: AiItemVenda[], janelaDias: number) => {
  const quantidadeVendida = itensVenda
    .filter((item) => item.produtoId === produto.id)
    .reduce((acc, item) => acc + Number(item.quantidade || 0), 0);

  const mediaDiaria = quantidadeVendida / Math.max(1, janelaDias);

  if (mediaDiaria <= 0) {
    return null;
  }

  return Number(produto.estoque || 0) / mediaDiaria;
};

const generateLocalInsights = (dados: InsightInput): string[] => {
  const estoqueMinimo = Number(dados.estoqueMinimo || 10);
  const hoje = startOfDay(dados.dataReferencia || new Date());
  const fimHoje = endOfDay(hoje);
  const ontem = new Date(hoje);
  ontem.setDate(ontem.getDate() - 1);
  const fimOntem = endOfDay(ontem);

  const produtosEmpresa = filterByEmpresa(dados.produtos, dados.empresaId);
  const vendasEmpresa = filterByEmpresa(dados.vendas, dados.empresaId);
  const itensEmpresa = filterByEmpresa(dados.itensVenda || [], dados.empresaId);

  const vendasHoje = sumSalesInRange(vendasEmpresa, hoje, fimHoje);
  const vendasOntem = sumSalesInRange(vendasEmpresa, ontem, fimOntem);
  const variacao = calculateVariationPercent(vendasHoje, vendasOntem);

  const insights: string[] = [];

  if (vendasHoje > 0 || vendasOntem > 0) {
    if (variacao < 0) {
      insights.push(`As vendas cairam ${Math.abs(variacao).toFixed(1)}% hoje vs ontem.`);
    } else if (variacao > 0) {
      insights.push(`As vendas cresceram ${formatPercent(variacao)} hoje vs ontem.`);
    } else {
      insights.push('As vendas de hoje estao estaveis em relacao a ontem.');
    }
  } else {
    insights.push('Ainda nao ha vendas suficientes para comparar hoje vs ontem.');
  }

  const estoqueBaixo = produtosEmpresa.filter((produto) => Number(produto.estoque || 0) <= estoqueMinimo);

  if (estoqueBaixo.length) {
    const nomes = estoqueBaixo.slice(0, 3).map((produto) => produto.nome).join(', ');
    insights.push(`Estoque baixo detectado para: ${nomes}.`);
  } else {
    insights.push('Nao ha produtos com estoque baixo no momento.');
  }

  const produtosEmRisco = produtosEmpresa
    .map((produto) => ({
      produto,
      dias: estimateRuptureDays(produto, itensEmpresa, 7)
    }))
    .filter((item) => item.dias !== null && Number(item.dias) <= 7)
    .sort((a, b) => Number(a.dias) - Number(b.dias));

  if (produtosEmRisco.length) {
    const alvo = produtosEmRisco[0];
    insights.push(`Risco de ruptura: ${alvo.produto.nome} pode zerar em cerca de ${Math.ceil(Number(alvo.dias))} dias.`);
  } else {
    insights.push('Sem risco imediato de ruptura nos proximos 7 dias.');
  }

  const maisVendido = topByQuantity(itensEmpresa, produtosEmpresa, 'max');
  const menosVendido = topByQuantity(itensEmpresa, produtosEmpresa, 'min');

  if (maisVendido) {
    insights.push(`${maisVendido.nome} e o produto mais vendido no periodo analisado.`);
  } else {
    insights.push('Nao foi possivel identificar o produto mais vendido ainda.');
  }

  if (menosVendido) {
    insights.push(`${menosVendido.nome} e o produto menos vendido no periodo analisado.`);
  } else {
    insights.push('Nao foi possivel identificar o produto menos vendido ainda.');
  }

  return insights;
};

export const generateInsights = (dados: InsightInput, provider: InsightProvider = 'local'): string[] => {
  if (provider === 'openai') {
    // Placeholder para futura integracao com API externa.
    return generateLocalInsights(dados);
  }

  return generateLocalInsights(dados);
};

export const aiService = {
  generateInsights
};
