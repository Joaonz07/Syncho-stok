import type { Produto } from '../../types/produto';
import Button from '../ui/Button';

type Props = {
  produtos: Produto[];
  onAddProduto: (produto: Produto) => void;
  isDarkTheme?: boolean;
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value || 0));

const ProductList = ({ produtos, onAddProduto, isDarkTheme = false }: Props) => {
  return (
    <section className={[
      'rounded-2xl border p-4',
      isDarkTheme ? 'border-white/10 bg-slate-900/60' : 'border-slate-200 bg-white'
    ].join(' ')}>
      <div className="mb-3 flex items-center justify-between">
        <h2 className={['text-lg font-black', isDarkTheme ? 'text-slate-100' : 'text-slate-900'].join(' ')}>Produtos disponiveis</h2>
        <span className={['text-sm font-medium', isDarkTheme ? 'text-slate-400' : 'text-slate-500'].join(' ')}>{produtos.length} itens</span>
      </div>

      <div className="max-h-[52vh] space-y-2 overflow-auto pr-1">
        {produtos.map((produto) => (
          <article key={produto.id} className={[
            'flex items-center justify-between rounded-xl border p-3',
            isDarkTheme ? 'border-white/10 bg-black/20' : 'border-slate-200 bg-slate-50'
          ].join(' ')}>
            <div className="min-w-0">
              <p className={['truncate text-base font-bold', isDarkTheme ? 'text-slate-100' : 'text-slate-900'].join(' ')}>{produto.nome}</p>
              <p className={['text-sm', isDarkTheme ? 'text-slate-400' : 'text-slate-600'].join(' ')}>
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
          <div className={[
            'rounded-xl border border-dashed p-6 text-center text-sm',
            isDarkTheme ? 'border-white/10 text-slate-400' : 'border-slate-300 text-slate-500'
          ].join(' ')}>
            Nenhum produto encontrado para o filtro informado.
          </div>
        ) : null}
      </div>
    </section>
  );
};

export default ProductList;
