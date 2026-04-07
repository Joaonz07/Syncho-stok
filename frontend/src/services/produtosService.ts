import { apiFetch as fetch } from '../lib/api';
import { pdvStore } from './pdvStore';
import type { Produto } from '../types/produto';

type ServiceParams = {
  companyId: string;
  token?: string;
};

const toProduto = (value: any): Produto => ({
  id: String(value?.id || ''),
  nome: String(value?.name || value?.nome || ''),
  codigo: String(value?.code || value?.codigo || ''),
  preco: Number(value?.price || value?.preco || 0),
  estoque: Number(value?.quantity || value?.estoque || 0)
});

const filterByTerm = (produtos: Produto[], termo: string) => {
  const normalized = termo.trim().toLowerCase();

  if (!normalized) {
    return produtos;
  }

  return produtos.filter((produto) => {
    const nome = String(produto.nome || '').toLowerCase();
    const codigo = String(produto.codigo || '').toLowerCase();
    return nome.includes(normalized) || codigo.includes(normalized);
  });
};

export const produtosService = {
  async listarProdutos({ companyId, token }: ServiceParams): Promise<Produto[]> {
    const headers = token ? { Authorization: `Bearer ${token}` } : undefined;

    try {
      if (!token) {
        return pdvStore.listarProdutos(companyId);
      }

      const response = await fetch(`/api/dashboard/products?companyId=${encodeURIComponent(companyId)}`, {
        headers
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result?.message || 'Falha ao listar produtos.');
      }

      return Array.isArray(result?.products) ? result.products.map(toProduto) : [];
    } catch (_error) {
      return pdvStore.listarProdutos(companyId);
    }
  },

  async buscarProduto({ companyId, token, termo }: ServiceParams & { termo: string }): Promise<Produto[]> {
    const produtos = await this.listarProdutos({ companyId, token });
    return filterByTerm(produtos, termo);
  }
};
