'use client'

import { ResponsiveContainer, AreaChart, Area, Tooltip } from 'recharts'
import { formatCurrency } from '@/lib/utils'

interface SparklineChartProps {
  data: number[]
  color?: string
  formatValue?: (v: number) => string
  height?: number
}

export function SparklineChart({
  data,
  color = '#D4AF37',
  formatValue = (v) => formatCurrency(v),
  height = 50,
}: SparklineChartProps) {
  const chartData = data.map((value, index) => ({ index, value }))

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={chartData} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id={`gradient-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.3} />
            <stop offset="95%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Tooltip
          content={({ active, payload }) => {
            if (active && payload && payload.length) {
              return (
                <div className="bg-[#242424] border border-[#2e2e2e] rounded-lg px-2 py-1 text-xs">
                  <span className="text-white">{formatValue(payload[0].value as number)}</span>
                </div>
              )
            }
            return null
          }}
        />
        <Area
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={2}
          fill={`url(#gradient-${color.replace('#', '')})`}
          dot={false}
          activeDot={{ r: 3, fill: color }}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
