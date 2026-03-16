'use client'

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'
import { getMonthName, formatCurrency } from '@/lib/utils'

interface SeasonalityData {
  month: number
  year: number
  caBrut: number
}

interface SeasonalityChartProps {
  data: SeasonalityData[]
}

const CustomTooltip = ({ active, payload, label }: {
  active?: boolean
  payload?: Array<{ value: number }>
  label?: string
}) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#242424] border border-[#2e2e2e] rounded-xl p-3 shadow-xl">
        <p className="text-white font-medium text-sm">{label}</p>
        <p className="text-[#D4AF37] font-bold">{formatCurrency(payload[0].value)}</p>
      </div>
    )
  }
  return null
}

export function SeasonalityChart({ data }: SeasonalityChartProps) {
  const chartData = data.map((d) => ({
    name: `${getMonthName(d.month).substring(0, 3)}`,
    value: d.caBrut,
  }))

  const avg = chartData.length > 0
    ? chartData.reduce((sum, d) => sum + d.value, 0) / chartData.length
    : 0

  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
        <defs>
          <linearGradient id="seasonGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#D4AF37" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#D4AF37" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#2e2e2e" vertical={false} />
        <XAxis
          dataKey="name"
          tick={{ fill: '#9ca3af', fontSize: 11 }}
          axisLine={{ stroke: '#2e2e2e' }}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: '#9ca3af', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => `${(v / 1000).toFixed(0)}k€`}
        />
        <Tooltip content={<CustomTooltip />} />
        {avg > 0 && (
          <ReferenceLine
            y={avg}
            stroke="#6b7280"
            strokeDasharray="4 4"
            label={{ value: 'Moy.', fill: '#6b7280', fontSize: 11 }}
          />
        )}
        <Area
          type="monotone"
          dataKey="value"
          stroke="#D4AF37"
          strokeWidth={2}
          fill="url(#seasonGradient)"
          dot={{ fill: '#D4AF37', r: 3 }}
          activeDot={{ r: 5 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
