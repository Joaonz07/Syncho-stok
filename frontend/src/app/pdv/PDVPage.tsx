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

  const finalizarVenda = async () => {
    if (!companyId) {
      setStatus('Selecione a empresa para finalizar a venda.');
      return;
    }

    if (!itensCarrinho.length) {
      setStatus('Adicione itens no carrinho antes de finalizar.');
      return;
    }

    setProcessandoVenda(true);

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

      setStatus('Venda finalizada com sucesso.');
      setItensCarrinho([]);
      setModalPagamentoAberto(false);
      await Promise.all([carregarProdutos(termoBusca), carregarVendasInsights()]);
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
    <main className="min-h-screen bg-slate-100 p-4 sm:p-6">
      <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-4">
        <header className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-cyan-100 p-2 text-cyan-700">
                <Store className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-2xl font-black text-slate-900">PDV Syncho</h1>
                <p className="text-sm text-slate-500">Operacao de caixa em tela cheia, sem distracoes</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Link to="/dashboard" className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700">
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
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Empresa</label>
              <select
                value={empresaSelecionada}
                onChange={(event) => setEmpresaSelecionada(event.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 outline-none"
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
          <section className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-700">
            Selecione uma empresa para iniciar o PDV.
          </section>
        ) : (
          <>
            <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
              <div className="space-y-3">
                <ProductSearch termo={termoBusca} onTermoChange={setTermoBusca} />
                <ProductList produtos={produtos} onAddProduto={adicionarAoCarrinho} />
              </div>

              <Cart
                itens={itensCarrinho}
                onIncrementar={incrementarQuantidade}
                onDecrementar={decrementarQuantidade}
                onRemover={removerItem}
              />
            </section>

            <InsightsPanel
              empresaId={companyId}
              produtos={produtos.map((produto) => ({ ...produto, companyId }))}
              vendas={vendas.map((venda) => ({ ...venda, companyId }))}
              estoqueMinimo={10}
            />
          </>
        )}

        {status ? <p className="text-sm font-medium text-slate-700">{status}</p> : null}
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
