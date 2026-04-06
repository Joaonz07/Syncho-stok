import { motion, AnimatePresence } from 'framer-motion';
import { Minus, Plus, Trash2 } from 'lucide-react';

type CartItem = {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  stock: number;
};

type CartProps = {
  items: CartItem[];
  total: number;
  isDarkTheme: boolean;
  onIncrease: (productId: string) => void;
  onDecrease: (productId: string) => void;
  onRemove: (productId: string) => void;
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value || 0));

const Cart = ({ items, total, isDarkTheme, onIncrease, onDecrease, onRemove }: CartProps) => {
  return (
    <section className={[
      'rounded-2xl border p-4',
      isDarkTheme
        ? 'border-cyan-400/20 bg-slate-950/60 shadow-[0_0_24px_rgba(34,211,238,0.12)]'
        : 'border-slate-200 bg-white shadow-sm'
    ].join(' ')}>
      <h2 className={['mb-3 text-base font-bold', isDarkTheme ? 'text-cyan-100' : 'text-slate-800'].join(' ')}>
        Carrinho
      </h2>

      <div className="max-h-[320px] space-y-2 overflow-auto pr-1">
        <AnimatePresence initial={false}>
          {items.map((item) => (
            <motion.div
              key={item.productId}
              layout
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className={[
                'rounded-xl border p-3',
                isDarkTheme ? 'border-white/10 bg-black/20' : 'border-slate-200 bg-slate-50'
              ].join(' ')}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className={['truncate text-sm font-semibold', isDarkTheme ? 'text-slate-100' : 'text-slate-800'].join(' ')}>
                    {item.name}
                  </p>
                  <p className={['text-xs', isDarkTheme ? 'text-slate-400' : 'text-slate-500'].join(' ')}>
                    {formatCurrency(item.price)} • Estoque: {item.stock}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onRemove(item.productId)}
                  className="rounded-lg border border-rose-400/40 px-2 py-1 text-rose-300 hover:bg-rose-500/10"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="mt-2 flex items-center justify-between">
                <div className={[
                  'inline-flex items-center gap-2 rounded-lg border px-2 py-1',
                  isDarkTheme ? 'border-white/10 bg-white/5' : 'border-slate-200 bg-white'
                ].join(' ')}>
                  <button type="button" onClick={() => onDecrease(item.productId)} className="rounded px-1.5 py-0.5 hover:bg-white/10">
                    <Minus className="h-3.5 w-3.5" />
                  </button>
                  <span className={['min-w-[18px] text-center text-sm font-semibold', isDarkTheme ? 'text-slate-100' : 'text-slate-700'].join(' ')}>
                    {item.quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => onIncrease(item.productId)}
                    disabled={item.quantity >= item.stock}
                    className="rounded px-1.5 py-0.5 hover:bg-white/10 disabled:opacity-40"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
                <span className={['text-sm font-semibold', isDarkTheme ? 'text-cyan-200' : 'text-cyan-700'].join(' ')}>
                  {formatCurrency(item.price * item.quantity)}
                </span>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {!items.length ? (
          <p className={['rounded-xl border border-dashed py-8 text-center text-sm', isDarkTheme ? 'border-white/10 text-slate-400' : 'border-slate-300 text-slate-500'].join(' ')}>
            Carrinho vazio.
          </p>
        ) : null}
      </div>

      <div className={[
        'mt-3 rounded-xl border p-3',
        isDarkTheme ? 'border-cyan-400/20 bg-cyan-500/10' : 'border-cyan-200 bg-cyan-50'
      ].join(' ')}>
        <p className={['text-xs uppercase tracking-wide', isDarkTheme ? 'text-cyan-200/80' : 'text-cyan-700'].join(' ')}>
          Total
        </p>
        <p className={['mt-1 text-2xl font-black', isDarkTheme ? 'text-cyan-100' : 'text-cyan-800'].join(' ')}>
          {formatCurrency(total)}
        </p>
      </div>
    </section>
  );
};

export default Cart;
