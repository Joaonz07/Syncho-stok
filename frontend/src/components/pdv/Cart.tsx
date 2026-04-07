import type { Produto } from '../../types/produto';
import Button from '../ui/Button';

export type CartItem = {
  produto: Produto;
  quantidade: number;
};

type Props = {
  itens: CartItem[];
  onIncrementar: (produtoId: string) => void;
  onDecrementar: (produtoId: string) => void;
  onRemover: (produtoId: string) => void;
  isDarkTheme?: boolean;
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value || 0));

const Cart = ({ itens, onIncrementar, onDecrementar, onRemover, isDarkTheme = false }: Props) => {
  const subtotal = itens.reduce((acc, item) => acc + item.quantidade * item.produto.preco, 0);

  return (
    <section className={[
      'rounded-2xl border p-4',
      isDarkTheme ? 'border-white/10 bg-slate-900/60' : 'border-slate-200 bg-white'
    ].join(' ')}>
      <h2 className={['mb-3 text-lg font-black', isDarkTheme ? 'text-slate-100' : 'text-slate-900'].join(' ')}>Carrinho</h2>

      <div className="max-h-[52vh] space-y-2 overflow-auto pr-1">
        {itens.map((item) => (
          <article key={item.produto.id} className={[
            'rounded-xl border p-3',
            isDarkTheme ? 'border-white/10 bg-black/20' : 'border-slate-200 bg-slate-50'
          ].join(' ')}>
            <div className="mb-2 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className={['truncate text-sm font-bold', isDarkTheme ? 'text-slate-100' : 'text-slate-900'].join(' ')}>{item.produto.nome}</p>
                <p className={['text-xs', isDarkTheme ? 'text-slate-400' : 'text-slate-600'].join(' ')}>Estoque atual: {item.produto.estoque}</p>
              </div>
              <Button variant="danger" className="px-3 py-2 text-xs" onClick={() => onRemover(item.produto.id)}>
                Remover
              </Button>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button variant="secondary" className="px-3 py-2" onClick={() => onDecrementar(item.produto.id)}>
                  -
                </Button>
                <span className={['w-8 text-center text-base font-bold', isDarkTheme ? 'text-slate-100' : 'text-slate-900'].join(' ')}>{item.quantidade}</span>
                <Button
                  variant="secondary"
                  className="px-3 py-2"
                  onClick={() => onIncrementar(item.produto.id)}
                  disabled={item.quantidade >= item.produto.estoque}
                >
                  +
                </Button>
              </div>

              <p className="text-sm font-bold text-cyan-700">{formatCurrency(item.quantidade * item.produto.preco)}</p>
            </div>
          </article>
        ))}

        {!itens.length ? (
          <p className={[
            'rounded-xl border border-dashed p-6 text-center text-sm',
            isDarkTheme ? 'border-white/10 text-slate-400' : 'border-slate-300 text-slate-500'
          ].join(' ')}>
            Nenhum item no carrinho.
          </p>
        ) : null}
      </div>

      <div className={[
        'mt-3 rounded-xl border p-4',
        isDarkTheme ? 'border-cyan-500/20 bg-cyan-500/10' : 'border-cyan-200 bg-cyan-50'
      ].join(' ')}>
        <p className={['text-xs uppercase tracking-wide', isDarkTheme ? 'text-cyan-200' : 'text-cyan-800'].join(' ')}>Subtotal</p>
        <p className={['text-2xl font-black', isDarkTheme ? 'text-cyan-100' : 'text-cyan-900'].join(' ')}>{formatCurrency(subtotal)}</p>
      </div>
    </section>
  );
};

export default Cart;
