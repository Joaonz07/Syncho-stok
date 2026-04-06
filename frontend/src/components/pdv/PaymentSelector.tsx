import type { ComponentType } from 'react';
import { CreditCard, Landmark, QrCode } from 'lucide-react';

type PaymentMethod = 'cash' | 'card' | 'pix';

type PaymentSelectorProps = {
  value: PaymentMethod;
  onChange: (method: PaymentMethod) => void;
  isDarkTheme: boolean;
  amountReceivedInput: string;
  onAmountReceivedInputChange: (value: string) => void;
  missingAmount: number;
  changeDue: number;
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value || 0));

const methods: Array<{ id: PaymentMethod; label: string; icon: ComponentType<{ className?: string }> }> = [
  { id: 'cash', label: 'Dinheiro', icon: Landmark },
  { id: 'card', label: 'Cartao', icon: CreditCard },
  { id: 'pix', label: 'Pix', icon: QrCode }
];

const PaymentSelector = ({
  value,
  onChange,
  isDarkTheme,
  amountReceivedInput,
  onAmountReceivedInputChange,
  missingAmount,
  changeDue
}: PaymentSelectorProps) => {
  return (
    <section className={[
      'rounded-2xl border p-4',
      isDarkTheme
        ? 'border-cyan-400/20 bg-slate-950/60 shadow-[0_0_24px_rgba(34,211,238,0.12)]'
        : 'border-slate-200 bg-white shadow-sm'
    ].join(' ')}>
      <h2 className={['mb-3 text-base font-bold', isDarkTheme ? 'text-cyan-100' : 'text-slate-800'].join(' ')}>
        Pagamento
      </h2>

      <div className="grid grid-cols-3 gap-2">
        {methods.map((method) => {
          const Icon = method.icon;
          const active = value === method.id;

          return (
            <button
              key={method.id}
              type="button"
              onClick={() => onChange(method.id)}
              className={[
                'inline-flex items-center justify-center gap-1 rounded-xl border px-2 py-2 text-xs font-semibold transition-all',
                active
                  ? 'border-cyan-400 bg-cyan-500/20 text-cyan-200'
                  : isDarkTheme
                    ? 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
                    : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
              ].join(' ')}
            >
              <Icon className="h-3.5 w-3.5" />
              {method.label}
            </button>
          );
        })}
      </div>

      {value === 'cash' ? (
        <div className="mt-3 space-y-2">
          <input
            value={amountReceivedInput}
            onChange={(event) => onAmountReceivedInputChange(event.target.value)}
            placeholder="Valor recebido"
            className={[
              'w-full rounded-xl border px-3 py-2 text-sm outline-none',
              isDarkTheme
                ? 'border-white/10 bg-white/5 text-slate-100 placeholder:text-slate-500'
                : 'border-slate-200 bg-slate-50 text-slate-800 placeholder:text-slate-400'
            ].join(' ')}
          />

          {missingAmount > 0 ? (
            <p className="text-xs font-semibold text-rose-400">Falta: {formatCurrency(missingAmount)}</p>
          ) : (
            <p className="text-xs font-semibold text-emerald-400">Troco: {formatCurrency(changeDue)}</p>
          )}
        </div>
      ) : (
        <p className={['mt-3 text-xs', isDarkTheme ? 'text-slate-400' : 'text-slate-500'].join(' ')}>
          Pagamento digital selecionado. Valor recebido sera igual ao total.
        </p>
      )}
    </section>
  );
};

export default PaymentSelector;
