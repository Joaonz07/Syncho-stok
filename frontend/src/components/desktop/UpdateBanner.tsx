import { useEffect, useMemo, useState } from 'react';

type DesktopUpdaterStatus = {
  status: 'checking' | 'available' | 'downloading' | 'downloaded' | 'not-available' | 'error';
  message: string;
  version?: string;
  progress?: number;
};

const shouldRenderBanner = (status: DesktopUpdaterStatus['status']) => {
  return status === 'available' || status === 'downloading' || status === 'downloaded' || status === 'error';
};

function UpdateBanner() {
  const [updateState, setUpdateState] = useState<DesktopUpdaterStatus | null>(null);

  useEffect(() => {
    if (!window.synchoDesktop?.isDesktop || !window.synchoDesktop?.updates) {
      return;
    }

    window.synchoDesktop.updates.checkNow();

    const unsubscribe = window.synchoDesktop.updates.onStatus((nextState) => {
      setUpdateState(nextState);
    });

    return unsubscribe;
  }, []);

  const visible = useMemo(() => {
    if (!updateState) {
      return false;
    }

    return shouldRenderBanner(updateState.status);
  }, [updateState]);

  if (!visible || !updateState) {
    return null;
  }

  const versionSuffix = updateState.version ? ` (v${updateState.version})` : '';
  const progressText = updateState.status === 'downloading' ? ` ${Math.round(updateState.progress || 0)}%` : '';
  const title = updateState.status === 'error' ? 'Falha na atualizacao' : `Nova atualizacao disponivel${versionSuffix}`;

  return (
    <section className="fixed left-1/2 top-4 z-[9999] w-[min(92vw,720px)] -translate-x-1/2 rounded-xl border border-amber-200/35 bg-slate-900/95 p-4 text-slate-100 shadow-2xl backdrop-blur">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-amber-300">{title}</p>
          <p className="text-xs text-slate-300">
            {updateState.message}
            {progressText}
          </p>
        </div>

        {updateState.status === 'downloaded' ? (
          <button
            type="button"
            onClick={() => window.synchoDesktop?.updates.installNow()}
            className="rounded-lg bg-emerald-500 px-3 py-2 text-sm font-semibold text-white transition hover:bg-emerald-400"
          >
            Atualizar agora
          </button>
        ) : null}
      </div>
    </section>
  );
}

export default UpdateBanner;
