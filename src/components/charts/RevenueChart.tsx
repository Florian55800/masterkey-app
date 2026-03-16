'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { getMonthName, formatCurrency } from '@/lib/utils'

interface RevenueData {
  month: number
  year: number
  caBrut: number
  commissions: number
  expenses?: number
  netProfit?: number
}

interface RevenueChartProps {
  data: RevenueData[]
}

const CustomTooltip = ({ active, payload, label }: {
  active?: boolean
  payload?: Array<{ name: string; value: number; color: string }>
  label?: string
}) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#242424] border border-[#2e2e2e] rounded-xl p-4 shadow-xl">
        <p className="text-white font-medium mb-3">{label}</p>
        {payload.map((entry) => (
          <div key={entry.name} className="flex items-center gap-2 text-sm mb-1">
            <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: entry.color }} />
            <span className="text-gray-400">{entry.name}:</span>
            <span className="text-white font-medium">{formatCurrency(entry.value)}</span>
          </div>
        ))}
      </div>
    )
  }
  return null
}

export function RevenueChart({ data }: RevenueChartProps) {
  const chartData = data.map((d) => ({
    name: `${getMonthName(d.month).substring(0, 3)} ${d.year}`,
    'CA Brut': d.caBrut,
    'Commissions': d.commissions,
    'Dépenses': d.expenses || 0,
    'Bénéfice': d.netProfit || 0,
  }))

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#2e2e2e" vertical={false} />
        <XAxis
          dataKey="name"
          tick={{ fill: '#9ca3af', fontSize: 12 }}
          axisLine={{ stroke: '#2e2e2e' }}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: '#9ca3af', fontSize: 12 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => `${(v / 1000).toFixed(0)}k€`}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
        <Legend
          wrapperStyle={{ color: '#9ca3af', fontSize: '12px', paddingTop: '16px' }}
        />
        <Bar dataKey="CA Brut" fill="#D4AF37" radius={[4, 4, 0, 0]} />
        <Bar dataKey="Commissions" fill="#E8C84D" radius={[4, 4, 0, 0]} />
        <Bar dataKey="Dépenses" fill="#ef4444" radius={[4, 4, 0, 0]} />
        <Bar dataKey="Bénéfice" fill="#22c55e" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
