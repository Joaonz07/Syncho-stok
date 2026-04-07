import type { FormaPagamento } from '../../types/venda';
import Button from '../ui/Button';

type Props = {
  aberto: boolean;
  total: number;
  formaPagamento: FormaPagamento;
  processando: boolean;
  onClose: () => void;
  onFormaPagamentoChange: (value: FormaPagamento) => void;
  onConfirmar: () => void;
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value || 0));

const PaymentModal = ({
  aberto,
  total,
  formaPagamento,
  processando,
  onClose,
  onFormaPagamentoChange,
  onConfirmar
}: Props) => {
  if (!aberto) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4">
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
        <div className="mb-4">
          <h3 className="text-xl font-black text-slate-900">Confirmar pagamento</h3>
          <p className="text-sm text-slate-500">Selecione a forma de pagamento e confirme a venda.</p>
        </div>

        <div className="mb-4 grid grid-cols-3 gap-2">
          <Button variant={formaPagamento === 'dinheiro' ? 'primary' : 'secondary'} onClick={() => onFormaPagamentoChange('dinheiro')}>
            Dinheiro
          </Button>
          <Button variant={formaPagamento === 'pix' ? 'primary' : 'secondary'} onClick={() => onFormaPagamentoChange('pix')}>
            Pix
          </Button>
          <Button variant={formaPagamento === 'cartao' ? 'primary' : 'secondary'} onClick={() => onFormaPagamentoChange('cartao')}>
            Cartao
          </Button>
        </div>

        <div className="mb-5 rounded-xl border border-cyan-200 bg-cyan-50 p-4">
          <p className="text-xs uppercase tracking-wide text-cyan-800">Total da compra</p>
          <p className="text-3xl font-black text-cyan-900">{formatCurrency(total)}</p>
        </div>

        <div className="flex gap-2">
          <Button variant="ghost" onClick={onClose} fullWidth>
            Cancelar
          </Button>
          <Button onClick={onConfirmar} disabled={processando} fullWidth>
            {processando ? 'Finalizando...' : 'Confirmar venda'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PaymentModal;
