'use client'

import { Users, Star } from 'lucide-react'
import { Card } from '@/components/ui/Card'

interface TeamMember {
  id: number
  name: string
  color: string
  propertiesSigned: number
  appointmentsMade: number
  goalStatus: string
}

interface TeamChallengeWidgetProps {
  members: TeamMember[]
  month?: string
}

export function TeamChallengeWidget({ members, month }: TeamChallengeWidgetProps) {
  const sorted = [...members].sort((a, b) => b.propertiesSigned - a.propertiesSigned)

  const rankIcons = ['🥇', '🥈', '🥉']

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
            <Users className="w-4 h-4 text-blue-400" />
          </div>
          <h3 className="text-white font-semibold">Challenge Équipe</h3>
        </div>
        {month && <span className="text-gray-400 text-sm">{month}</span>}
      </div>

      <div className="space-y-3">
        {sorted.map((member, index) => (
          <div
            key={member.id}
            className="flex items-center gap-3 p-3 rounded-xl bg-[#1b1b1b] border border-[#2e2e2e]"
          >
            <span className="text-lg w-6 text-center flex-shrink-0">
              {index < 3 ? rankIcons[index] : `#${index + 1}`}
            </span>
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
              style={{ backgroundColor: member.color }}
            >
              {member.name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-medium">{member.name}</p>
              <p className="text-gray-400 text-xs">
                {member.appointmentsMade} RDV
              </p>
            </div>
            <div className="text-right flex-shrink-0">
              <div className="flex items-center gap-1 justify-end">
                <Star className="w-3.5 h-3.5 text-[#D4AF37]" />
                <span className="text-[#D4AF37] font-bold">{member.propertiesSigned}</span>
              </div>
              <p className="text-gray-500 text-xs">signatures</p>
            </div>
            <div className="flex-shrink-0">
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                  member.goalStatus === 'atteint'
                    ? 'bg-green-500/20 text-green-400'
                    : 'bg-amber-500/20 text-amber-400'
                }`}
              >
                {member.goalStatus === 'atteint' ? '✓ Atteint' : 'En cours'}
              </span>
            </div>
          </div>
        ))}

        {sorted.length === 0 && (
          <p className="text-gray-500 text-sm text-center py-4">
            Aucun objectif défini ce mois-ci
          </p>
        )}
      </div>
    </Card>
  )
}
