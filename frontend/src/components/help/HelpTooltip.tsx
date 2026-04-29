import { CircleHelp } from 'lucide-react';

type HelpTooltipProps = {
  text: string;
  label?: string;
  isDarkTheme?: boolean;
};

const HelpTooltip = ({ text, label = 'Ajuda', isDarkTheme = true }: HelpTooltipProps) => {
  return (
    <span className="group relative inline-flex items-center">
      <button
        type="button"
        aria-label={label}
        title={label}
        className={[
          'inline-flex h-5 w-5 items-center justify-center rounded-full border transition-colors',
          isDarkTheme
            ? 'border-white/20 bg-white/5 text-cyan-300 hover:bg-white/10'
            : 'border-slate-300 bg-white text-cyan-700 hover:bg-slate-50'
        ].join(' ')}
      >
        <CircleHelp className="h-3.5 w-3.5" />
      </button>
      <span
        className={[
          'pointer-events-none absolute left-1/2 top-full z-30 mt-2 w-64 -translate-x-1/2 rounded-lg border px-3 py-2 text-xs opacity-0 shadow-xl transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100',
          isDarkTheme
            ? 'border-white/15 bg-slate-900 text-slate-100'
            : 'border-slate-200 bg-white text-slate-700'
        ].join(' ')}
      >
        {text}
      </span>
    </span>
  );
};

export default HelpTooltip;
