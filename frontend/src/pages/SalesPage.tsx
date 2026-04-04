import { useState } from 'react';
import { useSales } from '../hooks/useSales';
import { useProducts } from '../hooks/useProducts';
import type { SaleItem } from '@shared/types';

export default function SalesPage() {
  const { sales, loading, createSale } = useSales();
  const { products } = useProducts();
  const [showForm, setShowForm] = useState(false);
  const [items, setItems] = useState<SaleItem[]>([
    { productId: '', quantity: 1, unitPrice: 0 },
  ]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAddItem = () => {
    setItems([...items, { productId: '', quantity: 1, unitPrice: 0 }]);
  };

  const handleItemChange = (idx: number, field: keyof SaleItem, value: string | number) => {
    const updated = [...items];
    if (field === 'productId') {
      const product = products.find((p) => p.id === value);
      updated[idx] = {
        ...updated[idx],
        productId: value as string,
        unitPrice: product ? Number(product.price) : 0,
      };
    } else {
      updated[idx] = { ...updated[idx], [field]: Number(value) };
    }
    setItems(updated);
  };

  const handleRemoveItem = (idx: number) => {
    setItems(items.filter((_, i) => i !== idx));
  };

  const total = items.reduce((acc, item) => acc + item.quantity * item.unitPrice, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await createSale({ items });
      setShowForm(false);
      setItems([{ productId: '', quantity: 1, unitPrice: 0 }]);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create sale');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Vendas</h1>
          <p className="text-gray-500 mt-1">{sales.length} venda(s) registrada(s)</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2">
          <span>+</span> Nova Venda
        </button>
      </div>

      {/* New Sale Form */}
      {showForm && (
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Registrar Venda</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            {items.map((item, idx) => (
              <div key={idx} className="flex gap-3 items-end">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Produto</label>
                  <select
                    className="input"
                    required
                    value={item.productId}
                    onChange={(e) => handleItemChange(idx, 'productId', e.target.value)}
                  >
                    <option value="">Selecione...</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} (Estoque: {p.quantity})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="w-24">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Qtd.</label>
                  <input
                    className="input"
                    type="number"
                    min="1"
                    required
                    value={item.quantity}
                    onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                  />
                </div>
                <div className="w-32">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Preço Unit.
                  </label>
                  <input
                    className="input"
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={item.unitPrice}
                    onChange={(e) => handleItemChange(idx, 'unitPrice', e.target.value)}
                  />
                </div>
                {items.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveItem(idx)}
                    className="btn-danger mb-0.5"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}

            <button type="button" onClick={handleAddItem} className="btn-secondary text-sm">
              + Adicionar item
            </button>

            <div className="border-t border-gray-200 pt-4 flex items-center justify-between">
              <span className="text-lg font-semibold text-gray-900">
                Total: R${' '}
                {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="btn-secondary"
                >
                  Cancelar
                </button>
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? 'Salvando...' : 'Registrar Venda'}
                </button>
              </div>
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}
          </form>
        </div>
      )}

      {/* Sales Table */}
      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr className="text-left text-gray-500">
                <th className="px-6 py-3 font-medium">ID</th>
                <th className="px-6 py-3 font-medium">Data</th>
                <th className="px-6 py-3 font-medium">Itens</th>
                <th className="px-6 py-3 font-medium text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sales.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-gray-400">
                    Nenhuma venda registrada
                  </td>
                </tr>
              ) : (
                sales.map((sale) => (
                  <tr key={sale.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 font-mono text-xs text-gray-500">
                      {sale.id.slice(0, 8)}…
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {new Date(sale.createdAt).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {sale.items?.length ?? 0} item(s)
                    </td>
                    <td className="px-6 py-4 text-right font-semibold text-gray-900">
                      R${' '}
                      {Number(sale.total).toLocaleString('pt-BR', {
                        minimumFractionDigits: 2,
                      })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
