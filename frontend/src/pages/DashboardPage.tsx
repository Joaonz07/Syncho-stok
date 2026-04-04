import { useEffect, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { dashboardApi } from '../services/api';
import type { DashboardStats } from '@shared/types';
import StatCard from '../components/StatCard';

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    dashboardApi
      .stats()
      .then((res) => setStats(res.data.data))
      .catch(() => setError('Falha ao carregar dados'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="card text-center text-red-600 py-12">
        <p className="text-4xl mb-4">⚠️</p>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-1">Visão geral do seu negócio</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total de Vendas"
          value={stats?.totalSales ?? 0}
          icon="🛒"
          color="blue"
          subtitle="todas as vendas"
        />
        <StatCard
          title="Receita Total"
          value={`R$ ${(stats?.totalRevenue ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
          icon="💰"
          color="green"
          subtitle="receita acumulada"
        />
        <StatCard
          title="Produtos Baixo Estoque"
          value={stats?.lowStockProducts.length ?? 0}
          icon="⚠️"
          color="yellow"
          subtitle="≤ 10 unidades"
        />
        <StatCard
          title="Top Produto"
          value={stats?.topProducts[0]?.product.name ?? '—'}
          icon="🏆"
          color="purple"
          subtitle={`${stats?.topProducts[0]?.totalSold ?? 0} un. vendidas`}
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Sales Chart */}
        <div className="card">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Vendas Mensais</h2>
          {stats?.monthlySales && stats.monthlySales.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={stats.monthlySales}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  formatter={(value: number) =>
                    `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                  }
                />
                <Bar dataKey="total" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-400 text-center py-16">Sem dados de vendas ainda</p>
          )}
        </div>

        {/* Top Products */}
        <div className="card">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Produtos Mais Vendidos</h2>
          {stats?.topProducts && stats.topProducts.length > 0 ? (
            <div className="space-y-3">
              {stats.topProducts.map(({ product, totalSold }, idx) => (
                <div key={product.id} className="flex items-center gap-3">
                  <span className="text-lg font-bold text-gray-300 w-6">
                    {idx + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {product.name}
                    </p>
                    <div className="h-1.5 bg-gray-100 rounded-full mt-1">
                      <div
                        className="h-1.5 bg-primary-500 rounded-full"
                        style={{
                          width: `${Math.min(
                            100,
                            (totalSold / (stats.topProducts[0]?.totalSold || 1)) * 100,
                          )}%`,
                        }}
                      />
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-gray-700">
                    {totalSold} un.
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400 text-center py-16">Sem vendas registradas</p>
          )}
        </div>
      </div>

      {/* Low Stock Warning */}
      {stats?.lowStockProducts && stats.lowStockProducts.length > 0 && (
        <div className="card border-yellow-200 bg-yellow-50">
          <h2 className="text-base font-semibold text-yellow-800 mb-3">
            ⚠️ Produtos com Estoque Baixo
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-yellow-700">
                  <th className="pb-2 font-medium">Produto</th>
                  <th className="pb-2 font-medium">Código</th>
                  <th className="pb-2 font-medium text-right">Qtd.</th>
                </tr>
              </thead>
              <tbody>
                {stats.lowStockProducts.map((p) => (
                  <tr key={p.id} className="border-t border-yellow-200">
                    <td className="py-2 text-gray-800">{p.name}</td>
                    <td className="py-2 text-gray-500">{p.code}</td>
                    <td className="py-2 text-right font-semibold text-red-600">
                      {p.quantity}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
