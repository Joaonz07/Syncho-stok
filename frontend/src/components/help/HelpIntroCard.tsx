import { Lightbulb, X } from 'lucide-react';

type HelpIntroCardProps = {
  title: string;
  description: string;
  example?: string;
  isDarkTheme?: boolean;
  onClose?: () => void;
};

const HelpIntroCard = ({
  title,
  description,
  example,
  isDarkTheme = true,
  onClose,
}: HelpIntroCardProps) => {
  return (
    <section
      className={[
        'mb-4 rounded-2xl border p-4',
        isDarkTheme
          ? 'border-cyan-400/20 bg-cyan-500/10'
          : 'border-cyan-200 bg-cyan-50'
      ].join(' ')}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className={['inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide', isDarkTheme ? 'text-cyan-200' : 'text-cyan-700'].join(' ')}>
            <Lightbulb className="h-4 w-4" />
            Ajuda rapida
          </p>
          <h3 className={['mt-1 text-sm font-bold', isDarkTheme ? 'text-white' : 'text-slate-900'].join(' ')}>{title}</h3>
          <p className={['mt-1 text-sm', isDarkTheme ? 'text-slate-200' : 'text-slate-700'].join(' ')}>{description}</p>
          {example ? (
            <p className={['mt-2 text-xs', isDarkTheme ? 'text-slate-300' : 'text-slate-600'].join(' ')}>
              Exemplo: {example}
            </p>
          ) : null}
        </div>
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            className={[
              'rounded-lg border px-2 py-1 text-xs font-semibold',
              isDarkTheme
                ? 'border-white/20 text-slate-200 hover:bg-white/10'
                : 'border-slate-300 text-slate-700 hover:bg-white'
            ].join(' ')}
          >
            <span className="inline-flex items-center gap-1">
              <X className="h-3.5 w-3.5" />
              Entendi
            </span>
          </button>
        ) : null}
      </div>
    </section>
  );
};

export default HelpIntroCard;
