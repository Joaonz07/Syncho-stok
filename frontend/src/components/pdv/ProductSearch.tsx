type Props = {
  termo: string;
  onTermoChange: (value: string) => void;
  isDarkTheme?: boolean;
};

const ProductSearch = ({ termo, onTermoChange, isDarkTheme = false }: Props) => {
  return (
    <div className={[
      'rounded-2xl border p-3',
      isDarkTheme ? 'border-white/10 bg-slate-900/60' : 'border-slate-200 bg-white'
    ].join(' ')}>
      <label className={['mb-2 block text-xs font-semibold uppercase tracking-wide', isDarkTheme ? 'text-slate-400' : 'text-slate-500'].join(' ')}>
        Buscar produto por nome ou codigo
      </label>
      <input
        value={termo}
        onChange={(event) => onTermoChange(event.target.value)}
        placeholder="Ex.: arroz ou 789100000001"
        className={[
          'w-full rounded-xl border px-4 py-3 text-base outline-none focus:border-cyan-400',
          isDarkTheme
            ? 'border-white/10 bg-white/5 text-slate-100 placeholder:text-slate-500'
            : 'border-slate-200 bg-slate-50 text-slate-800'
        ].join(' ')}
      />
    </div>
  );
};

export default ProductSearch;
