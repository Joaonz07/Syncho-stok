import { memo } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar
} from 'recharts';

type DataPoint = { month?: string; name?: string; sales?: number; value?: number; valor?: number };

type Props = {
  isDarkTheme: boolean;
  monthlySalesSeries: DataPoint[];
  sourcePieData: Array<{ name: string; value: number }>;
  analyticsTopProducts: Array<{ name: string; valor: number }>;
  sellerPerformanceData: Array<{ name: string; valor: number }>;
  formatCurrency: (value: number) => string;
};

const pieFallback = [
  { name: 'Loja', value: 40 },
  { name: 'WhatsApp', value: 30 },
  { name: 'Direto', value: 20 },
  { name: 'Outros', value: 10 }
];

const AnalyticsCharts = ({
  isDarkTheme,
  monthlySalesSeries,
  sourcePieData,
  analyticsTopProducts,
  sellerPerformanceData,
  formatCurrency
}: Props) => {
  const compactMonthlySeries = monthlySalesSeries.slice(-10);
  const compactProducts = analyticsTopProducts.slice(0, 10);
  const compactSellers = sellerPerformanceData.slice(0, 10);
  const pieData = sourcePieData.length > 0 ? sourcePieData.slice(0, 6) : pieFallback;

  return (
    <>
      <div className="grid gap-4 lg:grid-cols-3">
        <div className={[
          'col-span-2 rounded-2xl border p-5 shadow-xl',
          isDarkTheme ? 'border-blue-500/20 bg-[#0d1117]' : 'border-slate-200 bg-white'
        ].join(' ')}>
          <h3 className={['text-base font-bold', isDarkTheme ? 'text-slate-100' : 'text-slate-800'].join(' ')}>Tendencia de Vendas</h3>
          <p className={['mb-3 text-xs', isDarkTheme ? 'text-slate-500' : 'text-slate-400'].join(' ')}>Evolucao mensal do faturamento</p>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={compactMonthlySeries} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="analyticsGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={isDarkTheme ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)'} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: isDarkTheme ? '#64748b' : '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: isDarkTheme ? '#64748b' : '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={(v) => `R$${(Number(v) / 1000).toFixed(0)}k`} width={52} />
              <Tooltip
                contentStyle={{
                  background: isDarkTheme ? '#0d1117' : '#fff',
                  border: isDarkTheme ? '1px solid rgba(59,130,246,0.3)' : '1px solid #e2e8f0',
                  borderRadius: '12px',
                  color: isDarkTheme ? '#f1f5f9' : '#1e293b',
                  fontSize: 12
                }}
                formatter={(v: unknown) => [formatCurrency(Number(v)), 'Vendas']}
              />
              <Area type="monotone" dataKey="sales" stroke="#3b82f6" strokeWidth={2.5} fill="url(#analyticsGrad)" dot={{ fill: '#3b82f6', r: 3, strokeWidth: 0 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className={[
          'rounded-2xl border p-5 shadow-xl',
          isDarkTheme ? 'border-purple-500/20 bg-[#0d1117]' : 'border-slate-200 bg-white'
        ].join(' ')}>
          <h3 className={['text-base font-bold', isDarkTheme ? 'text-slate-100' : 'text-slate-800'].join(' ')}>Origens</h3>
          <p className={['mb-2 text-xs', isDarkTheme ? 'text-slate-500' : 'text-slate-400'].join(' ')}>Distribuicao de leads</p>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={44} outerRadius={68} paddingAngle={3}>
                {pieData.map((_entry, i) => (
                  <Cell key={i} fill={['#3b82f6', '#a855f7', '#06b6d4', '#f43f5e'][i % 4]} stroke="rgba(255,255,255,0.08)" strokeWidth={1} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: isDarkTheme ? '#0d1117' : '#fff',
                  border: isDarkTheme ? '1px solid rgba(168,85,247,0.3)' : '1px solid #e2e8f0',
                  borderRadius: '10px',
                  fontSize: 12,
                  color: isDarkTheme ? '#f1f5f9' : '#1e293b'
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className={[
          'rounded-2xl border p-5 shadow-xl',
          isDarkTheme ? 'border-cyan-500/20 bg-[#0d1117]' : 'border-slate-200 bg-white'
        ].join(' ')}>
          <h3 className={['text-base font-bold', isDarkTheme ? 'text-slate-100' : 'text-slate-800'].join(' ')}>Top Produtos</h3>
          <p className={['mb-3 text-xs', isDarkTheme ? 'text-slate-500' : 'text-slate-400'].join(' ')}>Valor em estoque por produto</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={compactProducts} margin={{ top: 4, right: 4, bottom: 0, left: 0 }} barSize={24}>
              <CartesianGrid strokeDasharray="3 3" stroke={isDarkTheme ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)'} vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: isDarkTheme ? '#64748b' : '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: isDarkTheme ? '#64748b' : '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={(v) => `R$${(Number(v) / 1000).toFixed(0)}k`} width={48} />
              <Tooltip
                contentStyle={{
                  background: isDarkTheme ? '#0d1117' : '#fff',
                  border: isDarkTheme ? '1px solid rgba(6,182,212,0.3)' : '1px solid #e2e8f0',
                  borderRadius: '12px',
                  color: isDarkTheme ? '#f1f5f9' : '#1e293b',
                  fontSize: 12
                }}
                formatter={(v: unknown) => [formatCurrency(Number(v)), 'Valor']}
              />
              <Bar dataKey="valor" fill="#06b6d4" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className={[
          'rounded-2xl border p-5 shadow-xl',
          isDarkTheme ? 'border-purple-500/20 bg-[#0d1117]' : 'border-slate-200 bg-white'
        ].join(' ')}>
          <h3 className={['text-base font-bold', isDarkTheme ? 'text-slate-100' : 'text-slate-800'].join(' ')}>Desempenho por Vendedor</h3>
          <p className={['mb-3 text-xs', isDarkTheme ? 'text-slate-500' : 'text-slate-400'].join(' ')}>Volume por membro</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={compactSellers} margin={{ top: 4, right: 4, bottom: 0, left: 0 }} barSize={22} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke={isDarkTheme ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)'} horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11, fill: isDarkTheme ? '#64748b' : '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={(v) => `R$${(Number(v) / 1000).toFixed(0)}k`} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: isDarkTheme ? '#64748b' : '#94a3b8' }} axisLine={false} tickLine={false} width={60} />
              <Tooltip
                contentStyle={{
                  background: isDarkTheme ? '#0d1117' : '#fff',
                  border: isDarkTheme ? '1px solid rgba(168,85,247,0.3)' : '1px solid #e2e8f0',
                  borderRadius: '12px',
                  color: isDarkTheme ? '#f1f5f9' : '#1e293b',
                  fontSize: 12
                }}
                formatter={(v: unknown) => [formatCurrency(Number(v)), 'Vendas']}
              />
              <Bar dataKey="valor" fill="#a855f7" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </>
  );
};

export default memo(AnalyticsCharts);
