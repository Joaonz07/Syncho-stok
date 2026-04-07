import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { Store } from 'lucide-react';
import Cart, { type CartItem } from '../../components/pdv/Cart';
import PaymentModal from '../../components/pdv/PaymentModal';
import ProductList from '../../components/pdv/ProductList';
import ProductSearch from '../../components/pdv/ProductSearch';
import InsightsPanel from '../../components/ai/InsightsPanel';
import Button from '../../components/ui/Button';
import { useAuth } from '../../context/AuthContext';
import { apiFetch as fetch } from '../../lib/api';
import { getAccessToken, getCompanyId as getSessionCompanyId } from '../../lib/session';
import { produtosService } from '../../services/produtosService';
import { vendasService } from '../../services/vendasService';
import type { Produto } from '../../types/produto';
import type { FormaPagamento } from '../../types/venda';
import type { Venda } from '../../types/venda';

type Company = {
  id: string;
  name: string;
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value || 0));

const PDVPage = () => {
  const { role, isAuthenticated, loading } = useAuth();
  const token = getAccessToken();
  const [uiTheme, setUiTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window === 'undefined') {
      return 'light';
    }

    return window.localStorage.getItem('dashboard-theme') === 'dark' ? 'dark' : 'light';
  });
  const isDarkTheme = uiTheme === 'dark';

  const [empresas, setEmpresas] = useState<Company[]>([]);
  const [empresaSelecionada, setEmpresaSelecionada] = useState('');

  const [termoBusca, setTermoBusca] = useState('');
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [vendas, setVendas] = useState<Venda[]>([]);
  const [carregandoProdutos, setCarregandoProdutos] = useState(false);

  const [itensCarrinho, setItensCarrinho] = useState<CartItem[]>([]);
  const [formaPagamento, setFormaPagamento] = useState<FormaPagamento>('pix');
  const [modalPagamentoAberto, setModalPagamentoAberto] = useState(false);
  const [processandoVenda, setProcessandoVenda] = useState(false);
  const [status, setStatus] = useState('');

  const companyIdSessao = getSessionCompanyId();

  const companyId = useMemo(() => {
    if (role === 'ADMIN') {
      return empresaSelecionada.trim();
    }

    return String(companyIdSessao || '').trim();
  }, [role, companyIdSessao, empresaSelecionada]);

  const total = useMemo(
    () => itensCarrinho.reduce((acc, item) => acc + item.produto.preco * item.quantidade, 0),
    [itensCarrinho]
  );

  const carregarProdutos = async (termo: string) => {
    if (!companyId) {
      setProdutos([]);
      return;
    }

    setCarregandoProdutos(true);

    try {
      const lista = termo.trim()
        ? await produtosService.buscarProduto({ companyId, token: token || undefined, termo })
        : await produtosService.listarProdutos({ companyId, token: token || undefined });

      setProdutos(lista);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Falha ao carregar produtos.');
    } finally {
      setCarregandoProdutos(false);
    }
  };

  const carregarVendasInsights = async () => {
    if (!companyId) {
      setVendas([]);
      return;
    }

    try {
      const lista = await vendasService.listarVendas(companyId, { token: token || undefined });
      setVendas(lista);
    } catch (_error) {
      setVendas([]);
    }
  };

  const carregarEmpresasAdmin = async () => {
    if (role !== 'ADMIN' || !token) {
      return;
    }

    try {
      const response = await fetch('/api/admin/dashboard', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result?.message || 'Falha ao carregar empresas.');
      }

      const companies = Array.isArray(result?.companies) ? result.companies : [];
      setEmpresas(companies);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Falha ao carregar empresas.');
    }
  };

  const adicionarAoCarrinho = (produto: Produto) => {
    setItensCarrinho((atual) => {
      const existente = atual.find((item) => item.produto.id === produto.id);
      if (!existente) {
        return [...atual, { produto, quantidade: 1 }];
      }

      return atual.map((item) => {
        if (item.produto.id !== produto.id) {
          return item;
        }

        const quantidade = Math.min(item.quantidade + 1, produto.estoque);
        return { ...item, quantidade };
      });
    });
  };

  const incrementarQuantidade = (produtoId: string) => {
    setItensCarrinho((atual) =>
      atual.map((item) => {
        if (item.produto.id !== produtoId) {
          return item;
        }

        return {
          ...item,
          quantidade: Math.min(item.quantidade + 1, item.produto.estoque)
        };
      })
    );
  };

  const decrementarQuantidade = (produtoId: string) => {
    setItensCarrinho((atual) =>
      atual
        .map((item) => {
          if (item.produto.id !== produtoId) {
            return item;
          }

          return { ...item, quantidade: item.quantidade - 1 };
        })
        .filter((item) => item.quantidade > 0)
    );
  };

  const removerItem = (produtoId: string) => {
    setItensCarrinho((atual) => atual.filter((item) => item.produto.id !== produtoId));
  };

  const aplicarBaixaEstoqueLocal = (itensVendidos: CartItem[]) => {
    const quantidadePorProduto = new Map<string, number>();

    for (const item of itensVendidos) {
      quantidadePorProduto.set(
        item.produto.id,
        Number(quantidadePorProduto.get(item.produto.id) || 0) + Number(item.quantidade || 0)
      );
    }

    setProdutos((atual) =>
      atual.map((produto) => {
        const qtdVendida = Number(quantidadePorProduto.get(produto.id) || 0);

        if (!qtdVendida) {
          return produto;
        }

        return {
          ...produto,
          estoque: Math.max(0, Number(produto.estoque || 0) - qtdVendida)
        };
      })
    );
  };

  const finalizarVenda = async () => {
    if (!companyId) {
      setStatus('Selecione a empresa para finalizar a venda.');
      return;
    }

    if (!itensCarrinho.length) {
      setStatus('Adicione itens no carrinho antes de finalizar.');
      return;
    }

    const itensVendidos = [...itensCarrinho];
    setProcessandoVenda(true);
    setModalPagamentoAberto(false);
    setStatus('Processando venda...');

    try {
      await vendasService.criarVenda(
        {
          companyId,
          formaPagamento,
          itens: itensCarrinho.map((item) => ({
            produtoId: item.produto.id,
            quantidade: item.quantidade
          }))
        },
        { token: token || undefined }
      );

      aplicarBaixaEstoqueLocal(itensVendidos);
      setStatus('Venda finalizada com sucesso.');
      setItensCarrinho([]);
      void Promise.all([carregarProdutos(termoBusca), carregarVendasInsights()]);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Falha ao finalizar venda.');
    } finally {
      setProcessandoVenda(false);
    }
  };

  useEffect(() => {
    if (role === 'ADMIN') {
      void carregarEmpresasAdmin();
    }
  }, [role]);

  useEffect(() => {
    if (!companyId) {
      return;
    }

    void carregarProdutos(termoBusca);
    void carregarVendasInsights();
  }, [companyId]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      if (!companyId) {
        return;
      }

      void carregarProdutos(termoBusca);
    }, 180);

    return () => window.clearTimeout(timeoutId);
  }, [termoBusca]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('dashboard-theme', uiTheme);
    }
  }, [uiTheme]);

  if (loading) {
    return (
      <main className="grid min-h-screen place-items-center bg-slate-950 text-slate-100">
        <p>Carregando PDV...</p>
      </main>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <main className={[
      'min-h-screen p-4 sm:p-6',
      isDarkTheme
        ? 'bg-[radial-gradient(circle_at_top,rgba(14,116,144,0.16),transparent_40%),linear-gradient(180deg,#020617,#0f172a)] text-slate-100'
        : 'bg-slate-100 text-slate-900'
    ].join(' ')}>
      <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-4">
        <header className={[
          'rounded-2xl border p-4',
          isDarkTheme ? 'border-white/10 bg-slate-900/60' : 'border-slate-200 bg-white'
        ].join(' ')}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className={[
                'rounded-xl p-2',
                isDarkTheme ? 'bg-cyan-500/20 text-cyan-300' : 'bg-cyan-100 text-cyan-700'
              ].join(' ')}>
                <Store className="h-5 w-5" />
              </div>
              <div>
                <h1 className={['text-2xl font-black', isDarkTheme ? 'text-slate-100' : 'text-slate-900'].join(' ')}>PDV Syncho</h1>
                <p className={['text-sm', isDarkTheme ? 'text-slate-400' : 'text-slate-500'].join(' ')}>Operacao de caixa em tela cheia, sem distracoes</p>
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

              <Link to="/dashboard" className={[
                'rounded-xl border px-4 py-2 text-sm font-semibold',
                isDarkTheme
                  ? 'border-white/10 bg-white/5 text-slate-200 hover:bg-white/10'
                  : 'border-slate-200 bg-slate-50 text-slate-700'
              ].join(' ')}>
                Voltar ao dashboard
              </Link>
              <Button
                onClick={() => setModalPagamentoAberto(true)}
                disabled={!itensCarrinho.length || processandoVenda || carregandoProdutos}
                className="min-h-[46px] min-w-[190px]"
              >
                Finalizar ({formatCurrency(total)})
              </Button>
            </div>
          </div>

          {role === 'ADMIN' ? (
            <div className="mt-3 max-w-sm">
              <label className={['mb-1 block text-xs font-semibold uppercase tracking-wide', isDarkTheme ? 'text-slate-400' : 'text-slate-500'].join(' ')}>Empresa</label>
              <select
                value={empresaSelecionada}
                onChange={(event) => setEmpresaSelecionada(event.target.value)}
                className={[
                  'w-full rounded-xl border px-3 py-2 text-sm outline-none',
                  isDarkTheme
                    ? 'border-white/10 bg-white/5 text-slate-100'
                    : 'border-slate-200 bg-slate-50 text-slate-800'
                ].join(' ')}
              >
                <option value="">Selecione a empresa</option>
                {empresas.map((empresa) => (
                  <option key={empresa.id} value={empresa.id}>{empresa.name}</option>
                ))}
              </select>
            </div>
          ) : null}
        </header>

        {!companyId ? (
          <section className={[
            'rounded-2xl border p-6 text-sm',
            isDarkTheme
              ? 'border-amber-500/20 bg-amber-500/10 text-amber-200'
              : 'border-amber-200 bg-amber-50 text-amber-700'
          ].join(' ')}>
            Selecione uma empresa para iniciar o PDV.
          </section>
        ) : (
          <>
            <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
              <div className="space-y-3">
                <ProductSearch termo={termoBusca} onTermoChange={setTermoBusca} isDarkTheme={isDarkTheme} />
                <ProductList produtos={produtos} onAddProduto={adicionarAoCarrinho} isDarkTheme={isDarkTheme} />
              </div>

              <Cart
                itens={itensCarrinho}
                onIncrementar={incrementarQuantidade}
                onDecrementar={decrementarQuantidade}
                onRemover={removerItem}
                isDarkTheme={isDarkTheme}
              />
            </section>

            <InsightsPanel
              empresaId={companyId}
              produtos={produtos.map((produto) => ({ ...produto, companyId }))}
              vendas={vendas.map((venda) => ({ ...venda, companyId }))}
              estoqueMinimo={10}
              isDarkTheme={isDarkTheme}
            />
          </>
        )}

        {status ? (
          <p className={['text-sm font-medium', isDarkTheme ? 'text-slate-300' : 'text-slate-700'].join(' ')}>
            {status}
          </p>
        ) : null}
      </div>

      <PaymentModal
        aberto={modalPagamentoAberto}
        total={total}
        formaPagamento={formaPagamento}
        processando={processandoVenda}
        onClose={() => setModalPagamentoAberto(false)}
        onFormaPagamentoChange={setFormaPagamento}
        onConfirmar={() => void finalizarVenda()}
      />
    </main>
  );
};

export default PDVPage;
