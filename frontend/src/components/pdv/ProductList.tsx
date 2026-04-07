import type { Produto } from '../../types/produto';
import Button from '../ui/Button';

type Props = {
  produtos: Produto[];
  onAddProduto: (produto: Produto) => void;
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value || 0));

const ProductList = ({ produtos, onAddProduto }: Props) => {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-black text-slate-900">Produtos disponiveis</h2>
        <span className="text-sm font-medium text-slate-500">{produtos.length} itens</span>
      </div>

      <div className="max-h-[52vh] space-y-2 overflow-auto pr-1">
        {produtos.map((produto) => (
          <article key={produto.id} className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-3">
            <div className="min-w-0">
              <p className="truncate text-base font-bold text-slate-900">{produto.nome}</p>
              <p className="text-sm text-slate-600">
                Cod.: {produto.codigo || '-'} | Estoque: {produto.estoque}
              </p>
              <p className="text-sm font-semibold text-cyan-700">{formatCurrency(produto.preco)}</p>
            </div>
            <Button
              onClick={() => onAddProduto(produto)}
              disabled={produto.estoque <= 0}
              className="min-h-[44px] min-w-[132px]"
            >
              {produto.estoque <= 0 ? 'Sem estoque' : 'Adicionar'}
            </Button>
          </article>
        ))}

        {!produtos.length ? (
          <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
            Nenhum produto encontrado para o filtro informado.
          </div>
        ) : null}
      </div>
    </section>
  );
};

export default ProductList;
