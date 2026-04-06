import { motion } from 'framer-motion';
import { Search, PlusCircle } from 'lucide-react';

export type PDVProduct = {
  id: string;
  name: string;
  price: number;
  quantity: number;
  description?: string | null;
};

type ProductSelectorProps = {
  products: PDVProduct[];
  search: string;
  onSearchChange: (value: string) => void;
  onAddProduct: (productId: string) => void;
  isDarkTheme: boolean;
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value || 0));

const ProductSelector = ({
  products,
  search,
  onSearchChange,
  onAddProduct,
  isDarkTheme
}: ProductSelectorProps) => {
  return (
    <section className={[
      'rounded-2xl border p-4',
      isDarkTheme
        ? 'border-cyan-400/20 bg-slate-950/60 shadow-[0_0_24px_rgba(34,211,238,0.12)]'
        : 'border-slate-200 bg-white shadow-sm'
    ].join(' ')}>
      <div className="mb-3 flex items-center justify-between">
        <h2 className={['text-base font-bold', isDarkTheme ? 'text-cyan-100' : 'text-slate-800'].join(' ')}>
          Produtos
        </h2>
        <span className={['text-xs', isDarkTheme ? 'text-slate-400' : 'text-slate-500'].join(' ')}>
          {products.length} itens
        </span>
      </div>

      <div className={[
        'mb-3 flex items-center gap-2 rounded-xl border px-3 py-2',
        isDarkTheme ? 'border-white/10 bg-white/5' : 'border-slate-200 bg-slate-50'
      ].join(' ')}>
        <Search className={['h-4 w-4', isDarkTheme ? 'text-slate-400' : 'text-slate-500'].join(' ')} />
        <input
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Buscar produto..."
          className={[
            'w-full bg-transparent text-sm outline-none',
            isDarkTheme ? 'text-slate-100 placeholder:text-slate-500' : 'text-slate-700 placeholder:text-slate-400'
          ].join(' ')}
        />
      </div>

      <div className="max-h-[380px] space-y-2 overflow-auto pr-1">
        {products.map((product, index) => {
          const outOfStock = Number(product.quantity || 0) <= 0;

          return (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: index * 0.02 }}
              className={[
                'flex items-center justify-between gap-3 rounded-xl border px-3 py-2',
                isDarkTheme ? 'border-white/10 bg-black/20' : 'border-slate-200 bg-slate-50'
              ].join(' ')}
            >
              <div className="min-w-0">
                <p className={['truncate text-sm font-semibold', isDarkTheme ? 'text-slate-100' : 'text-slate-800'].join(' ')}>
                  {product.name}
                </p>
                <p className={['text-xs', isDarkTheme ? 'text-slate-400' : 'text-slate-500'].join(' ')}>
                  {formatCurrency(product.price)} • Estoque: {product.quantity}
                </p>
              </div>

              <button
                type="button"
                onClick={() => onAddProduct(product.id)}
                disabled={outOfStock}
                className={[
                  'inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-all',
                  outOfStock
                    ? 'cursor-not-allowed bg-slate-500/20 text-slate-400'
                    : isDarkTheme
                      ? 'border border-cyan-400/40 bg-cyan-500/15 text-cyan-200 hover:bg-cyan-500/25'
                      : 'border border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100'
                ].join(' ')}
              >
                <PlusCircle className="h-3.5 w-3.5" />
                Adicionar
              </button>
            </motion.div>
          );
        })}

        {!products.length ? (
          <p className={['py-8 text-center text-sm', isDarkTheme ? 'text-slate-400' : 'text-slate-500'].join(' ')}>
            Nenhum produto encontrado.
          </p>
        ) : null}
      </div>
    </section>
  );
};

export default ProductSelector;
