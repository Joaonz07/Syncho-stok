import { apiFetch as fetch } from '../lib/api';
import { estoqueService } from './estoqueService';
import { pdvStore } from './pdvStore';
import { produtosService } from './produtosService';
import type { CriarVendaPayload, FormaPagamento, ItemVenda, Venda } from '../types/venda';

type ServiceContext = {
  token?: string;
};

const paymentMethodToApi = (value: FormaPagamento): 'cash' | 'pix' | 'card' => {
  if (value === 'dinheiro') return 'cash';
  if (value === 'cartao') return 'card';
  return 'pix';
};

const paymentMethodFromApi = (value: unknown): FormaPagamento => {
  const normalized = String(value || '').toLowerCase();
  if (normalized === 'cash') return 'dinheiro';
  if (normalized === 'card') return 'cartao';
  return 'pix';
};

const buildItemVenda = (produtos: Array<{ id: string; preco: number }>, itens: Array<{ produtoId: string; quantidade: number }>): ItemVenda[] => {
  return itens.map((item) => {
    const produto = produtos.find((entry) => entry.id === item.produtoId);
    if (!produto) {
      throw new Error('Produto nao encontrado para venda.');
    }

    return {
      produtoId: item.produtoId,
      quantidade: item.quantidade,
      precoUnitario: Number(produto.preco || 0)
    };
  });
};

export const vendasService = {
  async criarVenda(payload: CriarVendaPayload, context?: ServiceContext): Promise<Venda> {
    const token = context?.token;

    if (!payload.itens.length) {
      throw new Error('Adicione itens antes de finalizar a venda.');
    }

    if (token) {
      try {
        const produtos = await produtosService.listarProdutos({ companyId: payload.companyId, token });
        const itensComPreco = buildItemVenda(produtos, payload.itens);
        const total = itensComPreco.reduce((acc, item) => acc + item.precoUnitario * item.quantidade, 0);

        const response = await fetch('/api/dashboard/sales/checkout', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            companyId: payload.companyId,
            items: payload.itens.map((item) => ({ productId: item.produtoId, quantity: item.quantidade })),
            paymentMethod: paymentMethodToApi(payload.formaPagamento),
            customerName: null,
            amountReceived: Number(total.toFixed(2)),
            changeDue: 0
          })
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result?.message || 'Nao foi possivel finalizar a venda.');
        }

        const saleId = String(result?.sale?.id || result?.id || crypto.randomUUID());

        return {
          id: saleId,
          data: new Date().toISOString(),
          total,
          formaPagamento: payload.formaPagamento
        };
      } catch (_error) {
        // cai para modo simulado mantendo consistencia local
      }
    }

    const produtosAtuais = await produtosService.listarProdutos({ companyId: payload.companyId, token: undefined });
    const itensComPreco = buildItemVenda(produtosAtuais, payload.itens);

    estoqueService.atualizarEstoque({
      companyId: payload.companyId,
      itens: payload.itens,
      produtosAtuais
    });

    return pdvStore.criarVenda(payload.companyId, payload.formaPagamento, itensComPreco);
  },

  async listarVendas(companyId: string, context?: ServiceContext): Promise<Venda[]> {
    const token = context?.token;

    if (token) {
      try {
        const response = await fetch(`/api/dashboard/sales/analysis?companyId=${encodeURIComponent(companyId)}`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result?.message || 'Nao foi possivel listar vendas.');
        }

        const recentSales = Array.isArray(result?.recentSales) ? result.recentSales : [];

        return recentSales.map((sale: any) => ({
          id: String(sale.id || ''),
          data: String(sale.createdAt || new Date().toISOString()),
          total: Number(sale.total || 0),
          formaPagamento: paymentMethodFromApi(sale.paymentMethod)
        }));
      } catch (_error) {
        return pdvStore.listarVendas(companyId);
      }
    }

    return pdvStore.listarVendas(companyId);
  }
};
