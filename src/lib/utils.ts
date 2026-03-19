import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number, currency = 'EUR'): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

export function formatPercent(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`
}

export function getMonthName(month: number): string {
  const months = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
  ]
  return months[month - 1] || ''
}

export interface Milestone {
  value: number
  label: string
}

export function getMilestoneProgress(
  current: number,
  milestones: Milestone[]
): {
  current: number
  next: Milestone | null
  prev: Milestone | null
  percent: number
} {
  const sorted = [...milestones].sort((a, b) => a.value - b.value)

  let prev: Milestone | null = null
  let next: Milestone | null = null

  for (const milestone of sorted) {
    if (milestone.value <= current) {
      prev = milestone
    } else if (!next) {
      next = milestone
    }
  }

  let percent = 0
  if (next) {
    const start = prev?.value ?? 0
    const end = next.value
    percent = Math.min(100, Math.round(((current - start) / (end - start)) * 100))
  } else {
    percent = 100
  }

  return { current, next, prev, percent }
}

export const EXPENSE_CATEGORIES = [
  { value: 'logiciel', label: 'Logiciels & Abonnements', color: '#3B82F6' },
  { value: 'marketing', label: 'Marketing & Publicité', color: '#8B5CF6' },
  { value: 'entretien', label: 'Entretien & Ménage', color: '#10B981' },
  { value: 'administratif', label: 'Administratif', color: '#F59E0B' },
  { value: 'deplacement', label: 'Déplacements', color: '#EF4444' },
  { value: 'formation', label: 'Formation', color: '#EC4899' },
  { value: 'materiel', label: 'Matériel & Équipement', color: '#06B6D4' },
  { value: 'autre', label: 'Autre', color: '#6B7280' },
]

export function getCategoryLabel(value: string): string {
  return EXPENSE_CATEGORIES.find((c) => c.value === value)?.label ?? value
}

export function getCategoryColor(value: string): string {
  return EXPENSE_CATEGORIES.find((c) => c.value === value)?.color ?? '#6B7280'
}
