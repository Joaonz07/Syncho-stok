import { pdvStore } from './pdvStore';
import type { Produto } from '../types/produto';

type AtualizarEstoqueParams = {
  companyId: string;
  itens: Array<{ produtoId: string; quantidade: number }>;
  produtosAtuais: Produto[];
};

export const estoqueService = {
  atualizarEstoque({ companyId, itens, produtosAtuais }: AtualizarEstoqueParams): Produto[] {
    pdvStore.atualizarEstoque(companyId, itens);

    const byId = new Map(produtosAtuais.map((produto) => [produto.id, produto]));

    for (const item of itens) {
      const produto = byId.get(item.produtoId);
      if (!produto) {
        continue;
      }

      byId.set(item.produtoId, {
        ...produto,
        estoque: Math.max(0, Number(produto.estoque || 0) - Number(item.quantidade || 0))
      });
    }

    return Array.from(byId.values());
  }
};
