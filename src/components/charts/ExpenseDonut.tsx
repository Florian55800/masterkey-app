'use client'

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { formatCurrency, getCategoryLabel, getCategoryColor } from '@/lib/utils'

interface ExpenseData {
  category: string
  amount: number
}

interface ExpenseDonutProps {
  data: ExpenseData[]
}

const CustomTooltip = ({ active, payload }: {
  active?: boolean
  payload?: Array<{ name: string; value: number; payload: { color: string } }>
}) => {
  if (active && payload && payload.length) {
    const item = payload[0]
    return (
      <div className="bg-[#242424] border border-[#2e2e2e] rounded-xl p-3 shadow-xl">
        <p className="text-white font-medium">{getCategoryLabel(item.name)}</p>
        <p className="text-[#D4AF37]">{formatCurrency(item.value)}</p>
      </div>
    )
  }
  return null
}

const RADIAN = Math.PI / 180
const renderCustomizedLabel = ({
  cx, cy, midAngle, innerRadius, outerRadius, percent,
}: {
  cx: number; cy: number; midAngle: number; innerRadius: number
  outerRadius: number; percent: number
}) => {
  if (percent < 0.05) return null
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5
  const x = cx + radius * Math.cos(-midAngle * RADIAN)
  const y = cy + radius * Math.sin(-midAngle * RADIAN)
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight="600">
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  )
}

export function ExpenseDonut({ data }: ExpenseDonutProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-gray-500">
        Aucune dépense enregistrée
      </div>
    )
  }

  const chartData = data.map((d) => ({
    name: d.category,
    value: d.amount,
    color: getCategoryColor(d.category),
    label: getCategoryLabel(d.category),
  }))

  const total = data.reduce((sum, d) => sum + d.amount, 0)

  return (
    <div>
      <div className="relative">
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={90}
              paddingAngle={2}
              dataKey="value"
              labelLine={false}
              label={renderCustomizedLabel}
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
        {/* Center total */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center">
            <p className="text-xs text-gray-400">Total</p>
            <p className="text-white font-bold text-sm">{formatCurrency(total)}</p>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="mt-3 space-y-2">
        {chartData.map((item) => (
          <div key={item.name} className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
              <span className="text-gray-400">{getCategoryLabel(item.name)}</span>
            </div>
            <span className="text-white font-medium">{formatCurrency(item.value)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
