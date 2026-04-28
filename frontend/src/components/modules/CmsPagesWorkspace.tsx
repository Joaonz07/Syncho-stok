import { AnimatePresence, motion } from 'framer-motion';
import { FilePlus2, PencilLine, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';

type CmsPage = {
  id: string;
  title: string;
  slug: string;
  content: string;
  updatedAt: string;
};

type Props = {
  showToast: (message: string) => void;
};

const cardShell =
  'rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.9),rgba(2,6,23,0.82))] shadow-[0_24px_70px_-44px_rgba(15,23,42,0.95)] backdrop-blur-xl';

const initialPages: CmsPage[] = [
  {
    id: 'pg_1',
    title: 'Landing principal',
    slug: 'landing-principal',
    content: 'Bem-vindo ao ecossistema SYNCHO. Nossa plataforma conecta vendas, operacao e suporte em um unico fluxo.',
    updatedAt: '2026-04-28'
  },
  {
    id: 'pg_2',
    title: 'Politica de privacidade',
    slug: 'politica-privacidade',
    content: 'Todos os dados trafegam com criptografia e seguem as diretrizes de LGPD para tratamento seguro.',
    updatedAt: '2026-04-20'
  },
  {
    id: 'pg_3',
    title: 'Termos de uso',
    slug: 'termos-de-uso',
    content: 'Ao utilizar o sistema, o cliente concorda com as politicas de seguranca, faturamento e suporte.',
    updatedAt: '2026-04-15'
  }
];

const emptyDraft = {
  title: '',
  slug: '',
  content: ''
};

const CmsPagesWorkspace = ({ showToast }: Props) => {
  const [pages, setPages] = useState<CmsPage[]>(initialPages);
  const [search, setSearch] = useState('');
  const [selectedPageId, setSelectedPageId] = useState<string | null>(pages[0]?.id || null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState(emptyDraft);

  const filteredPages = useMemo(() => {
    return pages.filter((page) => `${page.title} ${page.slug}`.toLowerCase().includes(search.toLowerCase()));
  }, [pages, search]);

  const selectedPage = useMemo(() => pages.find((page) => page.id === selectedPageId) || null, [pages, selectedPageId]);

  const openCreate = () => {
    setEditingId(null);
    setDraft(emptyDraft);
    setEditorOpen(true);
  };

  const openEdit = (page: CmsPage) => {
    setEditingId(page.id);
    setDraft({
      title: page.title,
      slug: page.slug,
      content: page.content
    });
    setEditorOpen(true);
  };

  const savePage = () => {
    const title = draft.title.trim();
    const slug = draft.slug.trim();
    const content = draft.content.trim();

    if (!title || !slug || !content) {
      showToast('Preencha titulo, slug e conteudo');
      return;
    }

    if (editingId) {
      setPages((current) =>
        current.map((page) => (page.id === editingId ? { ...page, title, slug, content, updatedAt: new Date().toISOString().slice(0, 10) } : page))
      );
      showToast('Pagina atualizada');
    } else {
      const created: CmsPage = {
        id: `pg_${Date.now()}`,
        title,
        slug,
        content,
        updatedAt: new Date().toISOString().slice(0, 10)
      };
      setPages((current) => [created, ...current]);
      setSelectedPageId(created.id);
      showToast('Nova pagina criada');
    }

    setEditorOpen(false);
    setEditingId(null);
    setDraft(emptyDraft);
  };

  const deletePage = (id: string) => {
    setPages((current) => current.filter((page) => page.id !== id));
    if (selectedPageId === id) {
      setSelectedPageId(null);
    }
    showToast('Pagina removida');
  };

  return (
    <div className="space-y-5">
      <section className={[cardShell, 'p-5 sm:p-6'].join(' ')}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-cyan-300">Paginas CMS</p>
            <h1 className="mt-2 text-3xl font-black text-white">Gestor de conteudo</h1>
            <p className="mt-1 text-sm text-slate-400">Modulo de paginas com lista, criacao, edicao e exclusao em editor simples.</p>
          </div>
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-400 to-blue-500 px-4 py-3 text-sm font-bold text-slate-950"
          >
            <FilePlus2 className="h-4 w-4" />
            Criar nova
          </button>
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <section className={[cardShell, 'p-4 sm:p-5'].join(' ')}>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar pagina por titulo ou slug"
            className="mb-4 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-slate-100 outline-none focus:border-cyan-400"
          />

          <div className="grid gap-2">
            {filteredPages.map((page) => (
              <button
                key={page.id}
                type="button"
                onClick={() => setSelectedPageId(page.id)}
                className={[
                  'rounded-2xl border px-4 py-3 text-left transition-all',
                  selectedPageId === page.id ? 'border-cyan-400/50 bg-cyan-500/10 text-cyan-100' : 'border-white/10 bg-black/20 text-slate-300 hover:bg-white/5'
                ].join(' ')}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold">{page.title}</p>
                    <p className="mt-1 text-xs text-slate-400">/{page.slug}</p>
                    <p className="mt-1 text-[11px] text-slate-500">Atualizado em {page.updatedAt}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <span
                      onClick={(event) => {
                        event.stopPropagation();
                        openEdit(page);
                      }}
                      className="rounded-lg border border-white/10 p-2 text-slate-300 hover:bg-white/10"
                    >
                      <PencilLine className="h-3.5 w-3.5" />
                    </span>
                    <span
                      onClick={(event) => {
                        event.stopPropagation();
                        deletePage(page.id);
                      }}
                      className="rounded-lg border border-rose-400/30 p-2 text-rose-300 hover:bg-rose-500/10"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </section>

        <section className={[cardShell, 'p-5 sm:p-6'].join(' ')}>
          {selectedPage ? (
            <>
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-300">Preview</p>
              <h2 className="mt-2 text-2xl font-black text-white">{selectedPage.title}</h2>
              <p className="mt-1 text-sm text-slate-400">/{selectedPage.slug}</p>
              <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="whitespace-pre-wrap text-sm leading-7 text-slate-200">{selectedPage.content}</p>
              </div>
              <div className="mt-4 flex gap-2">
                <button type="button" onClick={() => openEdit(selectedPage)} className="rounded-2xl border border-white/10 px-4 py-2.5 text-sm font-semibold text-slate-200 hover:bg-white/10">Editar</button>
                <button type="button" onClick={() => deletePage(selectedPage.id)} className="rounded-2xl border border-rose-400/30 px-4 py-2.5 text-sm font-semibold text-rose-300 hover:bg-rose-500/10">Deletar</button>
              </div>
            </>
          ) : (
            <div className="rounded-2xl border border-dashed border-white/15 px-4 py-12 text-center text-sm text-slate-500">
              Selecione uma pagina para visualizar.
            </div>
          )}
        </section>
      </div>

      <AnimatePresence>
        {editorOpen ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[90] grid place-items-center bg-slate-950/70 p-4 backdrop-blur-sm"
          >
            <motion.div
              initial={{ opacity: 0, y: 16, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.98 }}
              className={[cardShell, 'w-full max-w-2xl p-6'].join(' ')}
            >
              <h3 className="text-xl font-black text-white">{editingId ? 'Editar pagina' : 'Criar pagina'}</h3>
              <div className="mt-4 grid gap-3">
                <input value={draft.title} onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))} placeholder="Titulo" className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-slate-100 outline-none focus:border-cyan-400" />
                <input value={draft.slug} onChange={(event) => setDraft((current) => ({ ...current, slug: event.target.value }))} placeholder="Slug (ex: pagina-inicial)" className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-slate-100 outline-none focus:border-cyan-400" />
                <textarea value={draft.content} onChange={(event) => setDraft((current) => ({ ...current, content: event.target.value }))} rows={10} placeholder="Conteudo da pagina" className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-slate-100 outline-none focus:border-cyan-400" />
              </div>
              <div className="mt-5 flex justify-end gap-2">
                <button type="button" onClick={() => setEditorOpen(false)} className="rounded-2xl border border-white/10 px-4 py-2.5 text-sm font-semibold text-slate-200 hover:bg-white/10">Cancelar</button>
                <button type="button" onClick={savePage} className="rounded-2xl bg-gradient-to-r from-cyan-400 to-blue-500 px-4 py-2.5 text-sm font-bold text-slate-950">Salvar pagina</button>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
};

export default CmsPagesWorkspace;
