type Props = {
  termo: string;
  onTermoChange: (value: string) => void;
};

const ProductSearch = ({ termo, onTermoChange }: Props) => {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3">
      <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
        Buscar produto por nome ou codigo
      </label>
      <input
        value={termo}
        onChange={(event) => onTermoChange(event.target.value)}
        placeholder="Ex.: arroz ou 789100000001"
        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-base text-slate-800 outline-none focus:border-cyan-400"
      />
    </div>
  );
};

export default ProductSearch;
