import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Store, ChevronLeft, ReceiptText } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiFetch as fetch } from '../lib/api';
import { getAccessToken, getCompanyId as getSessionCompanyId } from '../lib/session';
import ProductSelector, { type PDVProduct } from '../components/pdv/ProductSelector';
import Cart from '../components/pdv/Cart';
import PaymentSelector from '../components/pdv/PaymentSelector';

type Company = {
  id: string;
  name: string;
};

type SalesAnalysis = {
  totalRevenue: number;
  totalSales: number;
};

type PaymentMethod = 'cash' | 'pix' | 'card';

type CartItem = {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  stock: number;
};

const parseMoneyInput = (value: string) => {
  const normalized = String(value || '').replace(',', '.').replace(/[^\d.]/g, '');
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value || 0));

const PDVPage = () => {
  const { role, isAuthenticated, loading: authLoading } = useAuth();
  const token = getAccessToken();

  const [uiTheme, setUiTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window === 'undefined') {
      return 'light';
    }

    return window.localStorage.getItem('dashboard-theme') === 'dark' ? 'dark' : 'light';
  });
  const isDarkTheme = uiTheme === 'dark';

  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState('');

  const [products, setProducts] = useState<PDVProduct[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [search, setSearch] = useState('');

  const [cart, setCart] = useState<Record<string, number>>({});
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('pix');
  const [amountReceivedInput, setAmountReceivedInput] = useState('');
  const [submittingSale, setSubmittingSale] = useState(false);

  const [salesAnalysis, setSalesAnalysis] = useState<SalesAnalysis | null>(null);
  const [status, setStatus] = useState('');

  const companyIdFromSession = getSessionCompanyId();

  const targetCompanyId = useMemo(() => {
    if (role === 'ADMIN') {
      return selectedCompanyId.trim() || '';
    }

    return String(companyIdFromSession || '').trim();
  }, [role, selectedCompanyId, companyIdFromSession]);

  const filteredProducts = useMemo(() => {
    const normalized = search.trim().toLowerCase();

    if (!normalized) {
      return products;
    }

    return products.filter((product) => String(product.name || '').toLowerCase().includes(normalized));
  }, [products, search]);

  const cartItems = useMemo<CartItem[]>(() => {
    return Object.entries(cart)
      .map(([productId, quantity]) => {
        const product = products.find((item) => item.id === productId);

        if (!product) {
          return null;
        }

        return {
          productId,
          name: product.name,
          price: Number(product.price || 0),
          quantity: Math.max(1, Number(quantity || 0)),
          stock: Number(product.quantity || 0)
        };
      })
      .filter((item): item is CartItem => Boolean(item));
  }, [cart, products]);

  const total = useMemo(
    () => cartItems.reduce((acc, item) => acc + Number(item.price || 0) * Number(item.quantity || 0), 0),
    [cartItems]
  );

  const amountReceived = useMemo(() => {
    if (paymentMethod !== 'cash') {
      return total;
    }

    return parseMoneyInput(amountReceivedInput);
  }, [paymentMethod, amountReceivedInput, total]);

  const changeDue = useMemo(() => {
    if (paymentMethod !== 'cash') {
      return 0;
    }

    const change = amountReceived - total;
    return change > 0 ? change : 0;
  }, [paymentMethod, amountReceived, total]);

  const missingAmount = useMemo(() => {
    if (paymentMethod !== 'cash') {
      return 0;
    }

    return Math.max(0, total - amountReceived);
  }, [paymentMethod, amountReceived, total]);

  const fetchAdminCompanies = async () => {
    if (!token || role !== 'ADMIN') {
      return;
    }

    try {
      const response = await fetch('/api/admin/dashboard', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const result = await response.json();

      if (!response.ok) {
        setStatus(result.message || 'Falha ao carregar empresas.');
        return;
      }

      setCompanies((result.companies || []) as Company[]);
    } catch (_error) {
      setStatus('Erro de rede ao carregar empresas.');
    }
  };

  const fetchProducts = async () => {
    if (!token) {
      return;
    }

    if (!targetCompanyId) {
      setProducts([]);
      return;
    }

    setProductsLoading(true);

    try {
      const response = await fetch(`/api/dashboard/products?companyId=${encodeURIComponent(targetCompanyId)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const result = await response.json();

      if (!response.ok) {
        setStatus(result.message || 'Falha ao carregar produtos.');
        return;
      }

      setProducts((result.products || []) as PDVProduct[]);
    } catch (_error) {
      setStatus('Erro de rede ao carregar produtos.');
    } finally {
      setProductsLoading(false);
    }
  };

  const fetchSalesAnalysis = async () => {
    if (!token || !targetCompanyId) {
      setSalesAnalysis(null);
      return;
    }

    try {
      const response = await fetch(`/api/dashboard/sales/analysis?companyId=${encodeURIComponent(targetCompanyId)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const result = await response.json();

      if (!response.ok) {
        return;
      }

      setSalesAnalysis(result as SalesAnalysis);
    } catch (_error) {
      // Silencioso para nao poluir a UX do PDV.
    }
  };

  const addProductToCart = (productId: string) => {
    const product = products.find((item) => item.id === productId);

    if (!product || Number(product.quantity || 0) <= 0) {
      return;
    }

    setCart((current) => {
      const currentQuantity = Number(current[productId] || 0);
      const nextQuantity = Math.min(Number(product.quantity || 0), currentQuantity + 1);
      return { ...current, [productId]: nextQuantity };
    });
  };

  const increaseQuantity = (productId: string) => {
    const product = products.find((item) => item.id === productId);

    if (!product) {
      return;
    }

    setCart((current) => {
      const currentQuantity = Number(current[productId] || 0);
      const nextQuantity = Math.min(Number(product.quantity || 0), currentQuantity + 1);
      return { ...current, [productId]: nextQuantity };
    });
  };

  const decreaseQuantity = (productId: string) => {
    setCart((current) => {
      const currentQuantity = Number(current[productId] || 0);

      if (currentQuantity <= 1) {
        const next = { ...current };
        delete next[productId];
        return next;
      }

      return { ...current, [productId]: currentQuantity - 1 };
    });
  };

  const removeItem = (productId: string) => {
    setCart((current) => {
      const next = { ...current };
      delete next[productId];
      return next;
    });
  };

  const checkoutSale = async () => {
    if (!token || !targetCompanyId) {
      setStatus('Selecione uma empresa para finalizar venda.');
      return;
    }

    const items = cartItems
      .map((item) => ({ productId: item.productId, quantity: item.quantity }))
      .filter((item) => item.productId && item.quantity > 0);

    if (!items.length) {
      setStatus('Adicione ao menos um item no carrinho.');
      return;
    }

    if (paymentMethod === 'cash' && missingAmount > 0) {
      setStatus(`Valor recebido insuficiente. Falta ${formatCurrency(missingAmount)}.`);
      return;
    }

    setSubmittingSale(true);

    try {
      const response = await fetch('/api/dashboard/sales/checkout', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          companyId: targetCompanyId,
          items,
          paymentMethod,
          customerName: null,
          amountReceived: Number(amountReceived.toFixed(2)),
          changeDue: Number(changeDue.toFixed(2))
        })
      });
      const result = await response.json();

      if (!response.ok) {
        setStatus(result.message || 'Falha ao finalizar venda.');
        return;
      }

      setCart({});
      setAmountReceivedInput('');
      setPaymentMethod('pix');
      setStatus('Venda finalizada com sucesso.');
      await Promise.all([fetchProducts(), fetchSalesAnalysis()]);
    } catch (_error) {
      setStatus('Erro de rede ao finalizar venda.');
    } finally {
      setSubmittingSale(false);
    }
  };

  useEffect(() => {
    if (role === 'ADMIN') {
      void fetchAdminCompanies();
    }
  }, [role, token]);

  useEffect(() => {
    if (!targetCompanyId) {
      return;
    }

    void fetchProducts();
    void fetchSalesAnalysis();
  }, [targetCompanyId, token]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('dashboard-theme', uiTheme);
    }
  }, [uiTheme]);

  if (authLoading) {
    return (
      <main className="grid min-h-screen place-items-center bg-slate-950 text-slate-100">
        <p>Carregando PDV...</p>
      </main>
    );
  }

  if (!isAuthenticated || !token) {
    return <Navigate to="/login" replace />;
  }

  return (
    <main className={[
      'min-h-screen p-4 sm:p-6',
      isDarkTheme
        ? 'bg-[radial-gradient(circle_at_top,rgba(14,116,144,0.18),transparent_40%),linear-gradient(180deg,#020617,#0f172a)] text-slate-100'
        : 'bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.10),transparent_35%),linear-gradient(180deg,#f8fafc,#eef2ff)] text-slate-900'
    ].join(' ')}>
      <div className="mx-auto w-full max-w-7xl">
        <motion.header
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          className={[
            'mb-5 rounded-2xl border p-4',
            isDarkTheme ? 'border-white/10 bg-slate-900/50' : 'border-slate-200 bg-white'
          ].join(' ')}
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-cyan-500/20 p-2 text-cyan-300">
                <Store className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-2xl font-black">PDV</h1>
                <p className={['text-sm', isDarkTheme ? 'text-slate-400' : 'text-slate-500'].join(' ')}>
                  Ponto de venda rapido e moderno
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className={[
                'flex items-center gap-1 rounded-xl border px-1 py-1 text-xs',
                isDarkTheme ? 'border-white/10 bg-white/5' : 'border-slate-200 bg-slate-100'
              ].join(' ')}>
                <button
                  type="button"
                  onClick={() => setUiTheme('light')}
                  className={[
                    'rounded-lg px-3 py-1.5 font-semibold',
                    uiTheme === 'light' ? 'bg-blue-600 text-white' : isDarkTheme ? 'text-slate-400' : 'text-slate-600'
                  ].join(' ')}
                >
                  Claro
                </button>
                <button
                  type="button"
                  onClick={() => setUiTheme('dark')}
                  className={[
                    'rounded-lg px-3 py-1.5 font-semibold',
                    uiTheme === 'dark' ? 'bg-cyan-500 text-slate-900' : isDarkTheme ? 'text-slate-400' : 'text-slate-600'
                  ].join(' ')}
                >
                  Escuro
                </button>
              </div>

              <Link
                to="/dashboard"
                className={[
                  'inline-flex items-center gap-1 rounded-xl border px-3 py-2 text-sm font-semibold transition-all',
                  isDarkTheme ? 'border-white/10 bg-white/5 hover:bg-white/10' : 'border-slate-200 bg-white hover:bg-slate-50'
                ].join(' ')}
              >
                <ChevronLeft className="h-4 w-4" />
                Dashboard
              </Link>
            </div>
          </div>

          {role === 'ADMIN' ? (
            <div className="mt-4 max-w-sm">
              <select
                value={selectedCompanyId}
                onChange={(event) => setSelectedCompanyId(event.target.value)}
                className={[
                  'w-full rounded-xl border px-3 py-2 text-sm outline-none',
                  isDarkTheme
                    ? 'border-white/10 bg-white/5 text-slate-100'
                    : 'border-slate-200 bg-slate-50 text-slate-700'
                ].join(' ')}
              >
                <option value="">Selecione a empresa</option>
                {companies.map((company) => (
                  <option key={company.id} value={company.id}>{company.name}</option>
                ))}
              </select>
            </div>
          ) : null}
        </motion.header>

        {!targetCompanyId ? (
          <div className={[
            'rounded-2xl border px-4 py-6 text-center text-sm',
            isDarkTheme ? 'border-amber-500/20 bg-amber-500/10 text-amber-200' : 'border-amber-200 bg-amber-50 text-amber-700'
          ].join(' ')}>
            Selecione uma empresa para usar o PDV.
          </div>
        ) : (
          <>
            <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <div className={[
                'rounded-2xl border p-4',
                isDarkTheme ? 'border-cyan-400/20 bg-slate-950/60' : 'border-slate-200 bg-white'
              ].join(' ')}>
                <p className={['text-xs uppercase tracking-wide', isDarkTheme ? 'text-slate-400' : 'text-slate-500'].join(' ')}>
                  Receita total
                </p>
                <p className={['mt-1 text-2xl font-black', isDarkTheme ? 'text-cyan-100' : 'text-slate-800'].join(' ')}>
                  {formatCurrency(Number(salesAnalysis?.totalRevenue || 0))}
                </p>
              </div>
              <div className={[
                'rounded-2xl border p-4',
                isDarkTheme ? 'border-cyan-400/20 bg-slate-950/60' : 'border-slate-200 bg-white'
              ].join(' ')}>
                <p className={['text-xs uppercase tracking-wide', isDarkTheme ? 'text-slate-400' : 'text-slate-500'].join(' ')}>
                  Total de vendas
                </p>
                <p className={['mt-1 text-2xl font-black', isDarkTheme ? 'text-cyan-100' : 'text-slate-800'].join(' ')}>
                  {Number(salesAnalysis?.totalSales || 0)}
                </p>
              </div>
              <div className={[
                'rounded-2xl border p-4',
                isDarkTheme ? 'border-cyan-400/20 bg-slate-950/60' : 'border-slate-200 bg-white'
              ].join(' ')}>
                <p className={['text-xs uppercase tracking-wide', isDarkTheme ? 'text-slate-400' : 'text-slate-500'].join(' ')}>
                  Itens no carrinho
                </p>
                <p className={['mt-1 text-2xl font-black', isDarkTheme ? 'text-cyan-100' : 'text-slate-800'].join(' ')}>
                  {cartItems.length}
                </p>
              </div>
            </div>

            <div className="grid gap-4 xl:grid-cols-[1.3fr_0.7fr]">
              <ProductSelector
                products={filteredProducts}
                search={search}
                onSearchChange={setSearch}
                onAddProduct={addProductToCart}
                isDarkTheme={isDarkTheme}
              />

              <div className="space-y-4">
                <Cart
                  items={cartItems}
                  total={total}
                  isDarkTheme={isDarkTheme}
                  onIncrease={increaseQuantity}
                  onDecrease={decreaseQuantity}
                  onRemove={removeItem}
                />

                <PaymentSelector
                  value={paymentMethod}
                  onChange={setPaymentMethod}
                  isDarkTheme={isDarkTheme}
                  amountReceivedInput={amountReceivedInput}
                  onAmountReceivedInputChange={setAmountReceivedInput}
                  missingAmount={missingAmount}
                  changeDue={changeDue}
                />

                <button
                  type="button"
                  disabled={submittingSale || productsLoading || !cartItems.length}
                  onClick={() => void checkoutSale()}
                  className={[
                    'w-full inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-60',
                    isDarkTheme
                      ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 shadow-[0_0_24px_rgba(34,211,238,0.3)] hover:opacity-90'
                      : 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow hover:opacity-95'
                  ].join(' ')}
                >
                  <ReceiptText className="h-4 w-4" />
                  {submittingSale ? 'Finalizando...' : 'Finalizar venda'}
                </button>
              </div>
            </div>
          </>
        )}

        {status ? (
          <p className={['mt-4 text-sm', isDarkTheme ? 'text-slate-400' : 'text-slate-600'].join(' ')}>{status}</p>
        ) : null}
      </div>
    </main>
  );
};

export default PDVPage;
