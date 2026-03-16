'use client'

import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { SparklineChart } from '@/components/charts/SparklineChart'
import { cn } from '@/lib/utils'

interface KPICardProps {
  label: string
  value: string
  trend?: number
  trendLabel?: string
  sparklineData?: number[]
  icon?: React.ReactNode
  valueColor?: string
  formatSparkline?: (v: number) => string
}

export function KPICard({
  label,
  value,
  trend,
  trendLabel,
  sparklineData,
  icon,
  valueColor = 'text-[#D4AF37]',
  formatSparkline,
}: KPICardProps) {
  const trendPositive = trend !== undefined && trend > 0
  const trendNegative = trend !== undefined && trend < 0
  const trendNeutral = trend !== undefined && trend === 0

  return (
    <div
      className="rounded-2xl p-5 relative overflow-hidden flex flex-col"
      style={{
        background: 'linear-gradient(135deg, #1e1e1e 0%, #181818 100%)',
        border: '1px solid rgba(255,255,255,0.06)',
        boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
      }}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <p className="text-white/40 text-xs font-semibold uppercase tracking-widest">{label}</p>
        {icon && (
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.07)',
            }}
          >
            {icon}
          </div>
        )}
      </div>

      {/* Value */}
      <p className={cn('text-3xl font-bold tracking-tight mb-3 leading-none', valueColor)}>{value}</p>

      {/* Trend */}
      {trend !== undefined && (
        <div className="flex items-center gap-1.5 mb-1">
          <div
            className={cn(
              'flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold',
              trendPositive && 'bg-green-500/10 text-green-400',
              trendNegative && 'bg-red-500/10 text-red-400',
              trendNeutral && 'bg-white/5 text-white/30',
            )}
          >
            {trendPositive && <TrendingUp className="w-3 h-3" />}
            {trendNegative && <TrendingDown className="w-3 h-3" />}
            {trendNeutral && <Minus className="w-3 h-3" />}
            {trendPositive ? '+' : ''}{trend.toFixed(1)}%
          </div>
          {trendLabel && (
            <span className="text-white/25 text-xs">{trendLabel}</span>
          )}
        </div>
      )}

      {sparklineData && sparklineData.length > 0 && (
        <div className="mt-auto pt-3 -mx-1">
          <SparklineChart data={sparklineData} formatValue={formatSparkline} height={44} />
        </div>
      )}
    </div>
  )
}
