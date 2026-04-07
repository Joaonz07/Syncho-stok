import type { Produto } from '../types/produto';
import type { FormaPagamento, ItemVenda, Venda, VendaCompleta } from '../types/venda';

type ProdutoInterno = Produto & { companyId: string };

const nowIso = () => new Date().toISOString();

const mockProdutos: ProdutoInterno[] = [
  { id: 'p-1', nome: 'Arroz 5kg', codigo: '789100000001', preco: 29.9, estoque: 44, companyId: 'mock-company' },
  { id: 'p-2', nome: 'Feijao 1kg', codigo: '789100000002', preco: 8.75, estoque: 78, companyId: 'mock-company' },
  { id: 'p-3', nome: 'Cafe 500g', codigo: '789100000003', preco: 16.5, estoque: 36, companyId: 'mock-company' },
  { id: 'p-4', nome: 'Acucar 1kg', codigo: '789100000004', preco: 5.2, estoque: 92, companyId: 'mock-company' }
];

const mockVendas: Array<VendaCompleta & { companyId: string }> = [];

const mapProduto = (produto: ProdutoInterno): Produto => ({
  id: produto.id,
  nome: produto.nome,
  codigo: produto.codigo,
  preco: Number(produto.preco || 0),
  estoque: Number(produto.estoque || 0)
});

const getCompanyKey = (companyId: string) => String(companyId || '').trim() || 'mock-company';

export const pdvStore = {
  listarProdutos(companyId: string): Produto[] {
    const companyKey = getCompanyKey(companyId);
    return mockProdutos.filter((produto) => produto.companyId === companyKey).map(mapProduto);
  },

  atualizarEstoque(companyId: string, itens: Array<{ produtoId: string; quantidade: number }>) {
    const companyKey = getCompanyKey(companyId);

    for (const item of itens) {
      const produto = mockProdutos.find((entry) => entry.companyId === companyKey && entry.id === item.produtoId);
      if (!produto) {
        throw new Error('Produto nao encontrado no estoque.');
      }
      if (item.quantidade <= 0) {
        throw new Error('Quantidade invalida para atualizacao de estoque.');
      }
      if (produto.estoque < item.quantidade) {
        throw new Error(`Estoque insuficiente para ${produto.nome}.`);
      }
    }

    for (const item of itens) {
      const produto = mockProdutos.find((entry) => entry.companyId === companyKey && entry.id === item.produtoId);
      if (produto) {
        produto.estoque -= item.quantidade;
      }
    }
  },

  criarVenda(
    companyId: string,
    formaPagamento: FormaPagamento,
    itens: ItemVenda[]
  ): Venda {
    const companyKey = getCompanyKey(companyId);
    const saleId = `mock-sale-${mockVendas.length + 1}`;
    const total = itens.reduce((acc, item) => acc + item.quantidade * item.precoUnitario, 0);

    const venda: Venda = {
      id: saleId,
      data: nowIso(),
      total,
      formaPagamento
    };

    mockVendas.unshift({ ...venda, itens, companyId: companyKey });

    return venda;
  },

  listarVendas(companyId: string): Venda[] {
    const companyKey = getCompanyKey(companyId);

    return mockVendas
      .filter((venda) => venda.companyId === companyKey)
      .map((venda) => ({
      id: venda.id,
      data: venda.data,
      total: venda.total,
      formaPagamento: venda.formaPagamento
      }));
  }
};
