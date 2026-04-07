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
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value || 0));

const Cart = ({ itens, onIncrementar, onDecrementar, onRemover }: Props) => {
  const subtotal = itens.reduce((acc, item) => acc + item.quantidade * item.produto.preco, 0);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4">
      <h2 className="mb-3 text-lg font-black text-slate-900">Carrinho</h2>

      <div className="max-h-[52vh] space-y-2 overflow-auto pr-1">
        {itens.map((item) => (
          <article key={item.produto.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-slate-900">{item.produto.nome}</p>
                <p className="text-xs text-slate-600">Estoque atual: {item.produto.estoque}</p>
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
                <span className="w-8 text-center text-base font-bold text-slate-900">{item.quantidade}</span>
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
          <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
            Nenhum item no carrinho.
          </p>
        ) : null}
      </div>

      <div className="mt-3 rounded-xl border border-cyan-200 bg-cyan-50 p-4">
        <p className="text-xs uppercase tracking-wide text-cyan-800">Subtotal</p>
        <p className="text-2xl font-black text-cyan-900">{formatCurrency(subtotal)}</p>
      </div>
    </section>
  );
};

export default Cart;
