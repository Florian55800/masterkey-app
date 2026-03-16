'use client'

import { Trophy } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { getMilestoneProgress } from '@/lib/utils'

interface MilestoneWidgetProps {
  current: number
  milestones: Array<{ value: number; label: string }>
  title?: string
  unit?: string
}

export function MilestoneWidget({
  current,
  milestones,
  title = 'Progression',
  unit = 'logements',
}: MilestoneWidgetProps) {
  const progress = getMilestoneProgress(current, milestones)

  return (
    <Card>
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-lg bg-[#D4AF37]/20 flex items-center justify-center">
          <Trophy className="w-4 h-4 text-[#D4AF37]" />
        </div>
        <h3 className="text-white font-semibold">{title}</h3>
      </div>

      {/* Current status */}
      <div className="flex items-end justify-between mb-3">
        <div>
          <span className="text-3xl font-bold text-[#D4AF37]">{current}</span>
          <span className="text-gray-400 ml-2 text-sm">{unit}</span>
        </div>
        {progress.next && (
          <div className="text-right">
            <p className="text-gray-400 text-xs">Prochain palier</p>
            <p className="text-white font-semibold">{progress.next.value} {unit}</p>
            <p className="text-[#D4AF37] text-xs">{progress.next.label}</p>
          </div>
        )}
        {!progress.next && (
          <div className="text-right">
            <p className="text-[#D4AF37] font-semibold text-sm">Tous paliers atteints!</p>
          </div>
        )}
      </div>

      {/* Progress bar */}
      <div className="mb-4">
        <div className="flex justify-between text-xs text-gray-500 mb-1.5">
          <span>{progress.prev?.value ?? 0}</span>
          {progress.next && <span>{progress.next.value}</span>}
        </div>
        <div className="h-3 bg-[#1b1b1b] rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[#B8962B] to-[#D4AF37] rounded-full transition-all duration-700"
            style={{ width: `${progress.percent}%` }}
          />
        </div>
        <p className="text-xs text-gray-400 mt-1 text-right">{progress.percent}%</p>
      </div>

      {/* Milestones timeline */}
      <div className="flex items-center gap-1.5 mt-3">
        {milestones.map((milestone) => {
          const unlocked = current >= milestone.value
          return (
            <div key={milestone.value} className="flex-1 text-center">
              <div
                className={`h-1.5 rounded-full mb-1.5 ${
                  unlocked ? 'bg-[#D4AF37]' : 'bg-[#2e2e2e]'
                }`}
              />
              <p className={`text-xs ${unlocked ? 'text-[#D4AF37]' : 'text-gray-600'}`}>
                {milestone.value}
              </p>
            </div>
          )
        })}
      </div>
    </Card>
  )
}
