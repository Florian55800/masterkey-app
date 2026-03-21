'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import {
  ArrowLeft, TrendingUp, Trophy, Printer, Save, Check,
  Home, Building2, MapPin, User, Calendar, Percent,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { LoadingPage } from '@/components/ui/LoadingSpinner'
import { formatCurrency, formatPercent } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Owner {
  id: number
  name: string
}

interface MonthlyStat {
  month: number
  year: number
  label: string
  totalGross: number
  totalCleaning: number
  totalNet: number
  totalPartMK: number
  totalPartProprio: number
  nbSejours: number
  nbNuits: number
  daysInMonth: number
  tauxOccupation: number | null
  prixMoyenNuit: number | null
}

interface PropertyDetail {
  id: number
  name: string
  address: string
  city: string
  type: string
  typeGestion: string
  commissionRate: number
  description: string
  photo: string | null
  dateSigned: string
  status: string
  owner: Owner
  monthlyStats: MonthlyStat[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getTypeBadgeVariant(type: string): 'gold' | 'info' | 'default' | 'warning' {
  switch (type.toLowerCase()) {
    case 'maison': case 'villa': return 'gold'
    case 'appartement': return 'info'
    case 'studio': return 'default'
    case 'loft': return 'warning'
    default: return 'default'
  }
}

const RANK_COLORS = [
  { bg: 'bg-[#D4AF37]/15', text: 'text-[#D4AF37]', border: 'border-[#D4AF37]/30', rank: '1er' },
  { bg: 'bg-gray-400/10',  text: 'text-gray-300',  border: 'border-gray-400/20',  rank: '2e'  },
  { bg: 'bg-amber-700/10', text: 'text-amber-600',  border: 'border-amber-700/20', rank: '3e'  },
]

// ─── Component ────────────────────────────────────────────────────────────────

export default function PropertyDetailPage() {
  const router = useRouter()
  const params = useParams()
  const id = params?.id as string

  const [property, setProperty] = useState<PropertyDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  // Description editing
  const [description, setDescription] = useState('')
  const [savingDesc, setSavingDesc] = useState(false)
  const [savedDesc, setSavedDesc] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Print modal (rapport propriétaire)
  const [printModalOpen, setPrintModalOpen] = useState(false)
  const [selectedMonthKey, setSelectedMonthKey] = useState('')

  // PDF revenus mensuels
  const [printRevenuesOpen, setPrintRevenuesOpen] = useState(false)

  // ── Load property ──────────────────────────────────────────────────────────

  const loadProperty = useCallback(async () => {
    try {
      const res = await fetch(`/api/properties/${id}`)
      if (!res.ok) {
        setNotFound(true)
        setLoading(false)
        return
      }
      const data: PropertyDetail = await res.json()
      setProperty(data)
      setDescription(data.description ?? '')

      // Default selected month for print = last month with data
      const activeMonths = data.monthlyStats.filter((m) => m.totalGross > 0)
      if (activeMonths.length > 0) {
        const last = activeMonths[activeMonths.length - 1]
        setSelectedMonthKey(`${last.year}-${String(last.month).padStart(2, '0')}`)
      }
    } catch {
      setNotFound(true)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    loadProperty()
  }, [loadProperty])

  // ── Auto-resize textarea ───────────────────────────────────────────────────

  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [description])

  // ── Save description ───────────────────────────────────────────────────────

  const handleSaveDescription = async () => {
    if (!property) return
    setSavingDesc(true)
    try {
      await fetch(`/api/properties/${property.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description }),
      })
      setSavedDesc(true)
      setTimeout(() => setSavedDesc(false), 2000)
    } finally {
      setSavingDesc(false)
    }
  }

  // ── Derived data ───────────────────────────────────────────────────────────

  if (loading) return <LoadingPage />

  if (notFound || !property) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <Home className="w-12 h-12 text-gray-600" />
        <p className="text-gray-400">Logement introuvable.</p>
        <Button variant="ghost" onClick={() => router.push('/logements')}>
          <ArrowLeft className="w-4 h-4" />
          Retour aux logements
        </Button>
      </div>
    )
  }

  const isConciergerie = (property.typeGestion || 'conciergerie') === 'conciergerie'
  const activeMonths = property.monthlyStats.filter((m) => m.totalGross > 0)

  // Top 3 months by partMK (conciergerie) or totalNet (sous-location)
  const sortedByRevenue = [...activeMonths].sort((a, b) =>
    isConciergerie
      ? b.totalPartMK - a.totalPartMK
      : b.totalNet - a.totalNet
  )
  const top3 = sortedByRevenue.slice(0, 3)

  // Print month
  const selectedMonth = activeMonths.find((m) => {
    const key = `${m.year}-${String(m.month).padStart(2, '0')}`
    return key === selectedMonthKey
  }) ?? activeMonths[activeMonths.length - 1] ?? null

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 pb-10">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4">
        {/* Top row: back + actions */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            <span className="text-sm">Retour</span>
          </button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setPrintModalOpen(true)}
            disabled={activeMonths.length === 0}
          >
            <Printer className="w-3.5 h-3.5" />
            Rapport propriétaire
          </Button>
        </div>

        {/* Property card */}
        <Card className="overflow-hidden p-0">
          {/* Photo banner */}
          {property.photo && (
            <div className="relative w-full h-40 sm:h-52 overflow-hidden rounded-t-2xl">
              <img
                src={property.photo}
                alt={property.name}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#1c1c1c]/80 to-transparent" />
            </div>
          )}

          <div className="p-6">
            {/* Name + badges */}
            <div className="flex flex-wrap items-start gap-3 mb-4">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                {!property.photo && (
                  <div className="w-11 h-11 rounded-xl bg-[#D4AF37]/10 flex items-center justify-center flex-shrink-0">
                    <Home className="w-5 h-5 text-[#D4AF37]" />
                  </div>
                )}
                <div className="min-w-0">
                  <h1 className="text-2xl font-bold text-white leading-tight truncate">
                    {property.name}
                  </h1>
                  {property.address && (
                    <p className="text-gray-500 text-sm mt-0.5 truncate">{property.address}</p>
                  )}
                </div>
              </div>

              {/* Status badge */}
              <Badge variant={property.status === 'active' ? 'success' : 'danger'}>
                {property.status === 'active' ? 'Actif' : 'Inactif'}
              </Badge>
            </div>

            {/* Meta row */}
            <div className="flex flex-wrap gap-3">
              {/* City */}
              <div className="flex items-center gap-1.5 text-gray-300 text-sm">
                <MapPin className="w-3.5 h-3.5 text-gray-500" />
                <span>{property.city}</span>
              </div>

              {/* Type */}
              <Badge variant={getTypeBadgeVariant(property.type)}>
                {property.type}
              </Badge>

              {/* Gestion */}
              {isConciergerie ? (
                <div className="flex items-center gap-1.5 text-gray-300 text-sm">
                  <Percent className="w-3.5 h-3.5 text-[#D4AF37]" />
                  <span className="text-[#D4AF37] font-semibold">
                    Commission {formatPercent(property.commissionRate)}
                  </span>
                </div>
              ) : (
                <Badge variant="warning">Sous-location</Badge>
              )}

              {/* Owner */}
              <div className="flex items-center gap-1.5 text-gray-300 text-sm">
                <User className="w-3.5 h-3.5 text-gray-500" />
                <span>{property.owner.name}</span>
              </div>

              {/* Date signed */}
              {property.dateSigned && (
                <div className="flex items-center gap-1.5 text-gray-400 text-sm">
                  <Calendar className="w-3.5 h-3.5 text-gray-500" />
                  <span>
                    {new Date(property.dateSigned).toLocaleDateString('fr-FR', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </span>
                </div>
              )}
            </div>
          </div>
        </Card>
      </div>

      {/* ── Description ────────────────────────────────────────────────────── */}
      <Card>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-white font-semibold">Fiche logement</h2>
          <button
            onClick={handleSaveDescription}
            disabled={savingDesc}
            className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg transition-all font-medium ${
              savedDesc
                ? 'bg-green-500/15 text-green-400 border border-green-500/20'
                : 'bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/20 hover:bg-[#D4AF37]/20'
            } disabled:opacity-50`}
          >
            {savedDesc ? (
              <>
                <Check className="w-3.5 h-3.5" />
                Enregistré
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5" />
                Enregistrer
              </>
            )}
          </button>
        </div>

        <textarea
          ref={textareaRef}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Décrivez ce logement : équipements, accès, règles de la maison, informations pour les propriétaires..."
          className="w-full bg-[#141414] border border-[#2e2e2e] rounded-xl px-4 py-3 text-white placeholder-gray-600 resize-none
            focus:outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]/20 transition-colors
            text-sm leading-relaxed min-h-[100px] overflow-hidden"
        />
      </Card>

      {/* ── Monthly Stats ───────────────────────────────────────────────────── */}
      <Card>
        <div className="flex items-center gap-2 mb-5">
          <TrendingUp className="w-5 h-5 text-[#D4AF37]" />
          <h2 className="text-white font-semibold text-lg">Revenus mensuels</h2>
          {activeMonths.length > 0 && (
            <>
              <span className="text-gray-500 text-sm">{activeMonths.length} mois</span>
              <button
                onClick={() => setPrintRevenuesOpen(true)}
                className="ml-auto flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-white/[0.08] text-white/40 hover:text-white/70 hover:bg-white/5 transition-all"
              >
                <Printer className="w-3.5 h-3.5" />
                PDF
              </button>
            </>
          )}
        </div>

        {activeMonths.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <Building2 className="w-10 h-10 text-gray-700" />
            <p className="text-gray-500 text-sm">Aucune donnée de facturation disponible</p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-gray-400 text-xs border-b border-white/[0.06]">
                    <th className="text-left pb-3 pr-4 font-medium">Mois</th>
                    <th className="text-right pb-3 pr-4 font-medium">Brut</th>
                    <th className="text-right pb-3 pr-4 font-medium">Ménage</th>
                    <th className="text-right pb-3 pr-4 font-medium">Net</th>
                    {isConciergerie && (
                      <>
                        <th className="text-right pb-3 pr-4 font-medium">Part MK</th>
                        <th className="text-right pb-3 pr-4 font-medium">Part Proprio</th>
                      </>
                    )}
                    <th className="text-right pb-3 pr-4 font-medium">Séjours</th>
                    <th className="text-right pb-3 pr-4 font-medium">Nuits</th>
                    <th className="text-right pb-3 pr-4 font-medium">Taux occup.</th>
                    <th className="text-right pb-3 font-medium">Prix/nuit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {activeMonths.map((m) => (
                    <tr key={`${m.year}-${m.month}`} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-3 pr-4 text-white font-medium">{m.label}</td>
                      <td className="py-3 pr-4 text-right text-gray-200">{formatCurrency(m.totalGross)}</td>
                      <td className="py-3 pr-4 text-right text-gray-400">{formatCurrency(m.totalCleaning)}</td>
                      <td className="py-3 pr-4 text-right text-white font-medium">{formatCurrency(m.totalNet)}</td>
                      {isConciergerie && (
                        <>
                          <td className="py-3 pr-4 text-right text-[#D4AF37] font-semibold">
                            {formatCurrency(m.totalPartMK)}
                          </td>
                          <td className="py-3 pr-4 text-right text-gray-200">
                            {formatCurrency(m.totalPartProprio)}
                          </td>
                        </>
                      )}
                      <td className="py-3 pr-4 text-right text-gray-300">{m.nbSejours}</td>
                      <td className="py-3 pr-4 text-right text-gray-300">{m.nbNuits}</td>
                      <td className="py-3 pr-4 text-right">
                        {m.tauxOccupation != null && m.nbNuits > 0 ? (
                          <span className={`font-medium ${
                            m.tauxOccupation >= 70 ? 'text-green-400' :
                            m.tauxOccupation >= 40 ? 'text-amber-400' : 'text-gray-400'
                          }`}>
                            {m.tauxOccupation.toFixed(1)}%
                          </span>
                        ) : (
                          <span className="text-gray-600">—</span>
                        )}
                      </td>
                      <td className="py-3 text-right">
                        {m.prixMoyenNuit != null ? (
                          <span className="text-gray-200">{formatCurrency(m.prixMoyenNuit)}</span>
                        ) : (
                          <span className="text-gray-600">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
                {/* Totals / averages row */}
                {activeMonths.length > 1 && (() => {
                  const totGross    = activeMonths.reduce((s, m) => s + m.totalGross, 0)
                  const totCleaning = activeMonths.reduce((s, m) => s + m.totalCleaning, 0)
                  const totNet      = activeMonths.reduce((s, m) => s + m.totalNet, 0)
                  const totMK       = activeMonths.reduce((s, m) => s + m.totalPartMK, 0)
                  const totProprio  = activeMonths.reduce((s, m) => s + m.totalPartProprio, 0)
                  const totSejours  = activeMonths.reduce((s, m) => s + m.nbSejours, 0)
                  const totNuits    = activeMonths.reduce((s, m) => s + m.nbNuits, 0)
                  // Moyennes pondérées sur les mois avec des nuits renseignées
                  const moisAvecNuits = activeMonths.filter(m => m.nbNuits > 0)
                  const totNuitsAvg  = moisAvecNuits.reduce((s, m) => s + m.nbNuits, 0)
                  const totDaysAvg   = moisAvecNuits.reduce((s, m) => s + m.daysInMonth, 0)
                  const totNetAvg    = moisAvecNuits.reduce((s, m) => s + m.totalNet, 0)
                  const avgTaux      = totDaysAvg > 0 ? (totNuitsAvg / totDaysAvg) * 100 : null
                  const avgPrix      = totNuitsAvg > 0 ? totNetAvg / totNuitsAvg : null
                  return (
                    <tfoot>
                      <tr className="border-t border-[#D4AF37]/20">
                        <td className="pt-3 pr-4 text-gray-400 text-xs font-semibold uppercase tracking-wide">Total</td>
                        <td className="pt-3 pr-4 text-right text-[#D4AF37] font-bold">{formatCurrency(totGross)}</td>
                        <td className="pt-3 pr-4 text-right text-gray-400 font-medium">{formatCurrency(totCleaning)}</td>
                        <td className="pt-3 pr-4 text-right text-white font-bold">{formatCurrency(totNet)}</td>
                        {isConciergerie && (
                          <>
                            <td className="pt-3 pr-4 text-right text-[#D4AF37] font-bold">{formatCurrency(totMK)}</td>
                            <td className="pt-3 pr-4 text-right text-white font-bold">{formatCurrency(totProprio)}</td>
                          </>
                        )}
                        <td className="pt-3 pr-4 text-right text-gray-300 font-medium">{totSejours}</td>
                        <td className="pt-3 pr-4 text-right text-gray-300 font-medium">{totNuits}</td>
                        <td className="pt-3 pr-4 text-right">
                          {avgTaux != null ? (
                            <span className={`font-semibold ${avgTaux >= 70 ? 'text-green-400' : avgTaux >= 40 ? 'text-amber-400' : 'text-gray-400'}`}>
                              {avgTaux.toFixed(1)}%
                            </span>
                          ) : <span className="text-gray-600">—</span>}
                        </td>
                        <td className="pt-3 text-right">
                          {avgPrix != null ? (
                            <span className="text-gray-200 font-semibold">{formatCurrency(avgPrix)}</span>
                          ) : <span className="text-gray-600">—</span>}
                        </td>
                      </tr>
                      <tr>
                        <td colSpan={isConciergerie ? 10 : 8} className="pt-1 pb-0">
                          <p className="text-gray-600 text-xs text-right">Taux occup. et prix/nuit = moyennes sur {moisAvecNuits.length} mois avec données</p>
                        </td>
                      </tr>
                    </tfoot>
                  )
                })()}
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden space-y-3">
              {activeMonths.map((m) => (
                <div
                  key={`${m.year}-${m.month}`}
                  className="bg-[#141414] border border-white/[0.05] rounded-xl p-4 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-white font-semibold">{m.label}</span>
                    {m.tauxOccupation != null && m.nbNuits > 0 && (
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        m.tauxOccupation >= 70
                          ? 'bg-green-500/15 text-green-400'
                          : m.tauxOccupation >= 40
                          ? 'bg-amber-500/15 text-amber-400'
                          : 'bg-white/5 text-gray-400'
                      }`}>
                        {m.tauxOccupation.toFixed(1)}% occup.
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <p className="text-gray-500 text-xs">Brut</p>
                      <p className="text-gray-200 font-medium">{formatCurrency(m.totalGross)}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 text-xs">Net</p>
                      <p className="text-white font-semibold">{formatCurrency(m.totalNet)}</p>
                    </div>
                    {isConciergerie && (
                      <>
                        <div>
                          <p className="text-gray-500 text-xs">Part MK</p>
                          <p className="text-[#D4AF37] font-semibold">{formatCurrency(m.totalPartMK)}</p>
                        </div>
                        <div>
                          <p className="text-gray-500 text-xs">Part Proprio</p>
                          <p className="text-gray-200 font-medium">{formatCurrency(m.totalPartProprio)}</p>
                        </div>
                      </>
                    )}
                    <div>
                      <p className="text-gray-500 text-xs">Ménage</p>
                      <p className="text-gray-400">{formatCurrency(m.totalCleaning)}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 text-xs">Séjours / Nuits</p>
                      <p className="text-gray-300">{m.nbSejours} séj. · {m.nbNuits} nuits</p>
                    </div>
                    <div>
                      <p className="text-gray-500 text-xs">Prix moy./nuit</p>
                      <p className="text-gray-200">
                        {m.prixMoyenNuit != null ? formatCurrency(m.prixMoyenNuit) : '—'}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </Card>

      {/* ── Best Months Ranking ─────────────────────────────────────────────── */}
      {top3.length > 0 && (
        <Card>
          <div className="flex items-center gap-2 mb-5">
            <Trophy className="w-5 h-5 text-[#D4AF37]" />
            <h2 className="text-white font-semibold text-lg">Meilleurs mois</h2>
          </div>

          <div className="space-y-3">
            {top3.map((m, i) => {
              const colors = RANK_COLORS[i]
              const amount = isConciergerie ? m.totalPartMK : m.totalNet
              return (
                <div
                  key={`${m.year}-${m.month}`}
                  className={`flex items-center gap-4 p-4 rounded-xl border ${colors.bg} ${colors.border}`}
                >
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm flex-shrink-0 ${colors.bg} ${colors.text} border ${colors.border}`}>
                    {colors.rank}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium">{m.label}</p>
                    <p className="text-gray-500 text-xs mt-0.5">
                      {m.nbNuits} nuits · {m.nbSejours} séjour{m.nbSejours > 1 ? 's' : ''}
                    </p>
                  </div>
                  <p className={`font-bold text-base flex-shrink-0 ${colors.text}`}>
                    {formatCurrency(amount)}
                  </p>
                </div>
              )
            })}
          </div>

          {top3.length > 0 && (
            <p className="text-gray-600 text-xs mt-3 text-right">
              {isConciergerie ? 'Classement par part MasterKey' : 'Classement par revenu net'}
            </p>
          )}
        </Card>
      )}

      {/* ── PDF Revenus mensuels ────────────────────────────────────────────── */}
      <Modal isOpen={printRevenuesOpen} onClose={() => setPrintRevenuesOpen(false)} title="Revenus mensuels — PDF" size="lg">
        <div className="space-y-5">
          {(() => {
            const moisAvecNuits = activeMonths.filter(m => m.nbNuits > 0)
            const totGross    = activeMonths.reduce((s, m) => s + m.totalGross, 0)
            const totCleaning = activeMonths.reduce((s, m) => s + m.totalCleaning, 0)
            const totNet      = activeMonths.reduce((s, m) => s + m.totalNet, 0)
            const totMK       = activeMonths.reduce((s, m) => s + m.totalPartMK, 0)
            const totProprio  = activeMonths.reduce((s, m) => s + m.totalPartProprio, 0)
            const totSejours  = activeMonths.reduce((s, m) => s + m.nbSejours, 0)
            const totNuits    = activeMonths.reduce((s, m) => s + m.nbNuits, 0)
            const totNuitsAvg = moisAvecNuits.reduce((s, m) => s + m.nbNuits, 0)
            const totDaysAvg  = moisAvecNuits.reduce((s, m) => s + m.daysInMonth, 0)
            const totNetAvg   = moisAvecNuits.reduce((s, m) => s + m.totalNet, 0)
            const avgTaux     = totDaysAvg > 0 ? (totNuitsAvg / totDaysAvg) * 100 : null
            const avgPrix     = totNuitsAvg > 0 ? totNetAvg / totNuitsAvg : null
            return (
              <div id="print-revenues-area" className="bg-white text-gray-900 rounded-xl p-6 space-y-4 print:shadow-none text-sm">
                {/* En-tête */}
                <div className="border-b border-gray-200 pb-4 flex items-start justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">{property.name}</h2>
                    <p className="text-gray-500 text-xs mt-0.5">{property.city} · {property.type} · {property.owner.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-700">Revenus mensuels</p>
                    <p className="text-gray-500 text-xs">{activeMonths[0]?.label} – {activeMonths[activeMonths.length - 1]?.label}</p>
                  </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-gray-300 text-gray-500 text-left">
                        <th className="pb-2 pr-3 font-semibold">Mois</th>
                        <th className="pb-2 pr-3 text-right font-semibold">Brut</th>
                        <th className="pb-2 pr-3 text-right font-semibold">Ménage</th>
                        <th className="pb-2 pr-3 text-right font-semibold">Net</th>
                        {isConciergerie && <>
                          <th className="pb-2 pr-3 text-right font-semibold">Part MK</th>
                          <th className="pb-2 pr-3 text-right font-semibold">Part Proprio</th>
                        </>}
                        <th className="pb-2 pr-3 text-right font-semibold">Séjours</th>
                        <th className="pb-2 pr-3 text-right font-semibold">Nuits</th>
                        <th className="pb-2 pr-3 text-right font-semibold">Taux occ.</th>
                        <th className="pb-2 text-right font-semibold">Prix/nuit</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeMonths.map((m) => (
                        <tr key={`${m.year}-${m.month}`} className="border-b border-gray-100">
                          <td className="py-1.5 pr-3 font-medium text-gray-800">{m.label}</td>
                          <td className="py-1.5 pr-3 text-right text-gray-700">{formatCurrency(m.totalGross)}</td>
                          <td className="py-1.5 pr-3 text-right text-gray-500">{formatCurrency(m.totalCleaning)}</td>
                          <td className="py-1.5 pr-3 text-right font-medium text-gray-800">{formatCurrency(m.totalNet)}</td>
                          {isConciergerie && <>
                            <td className="py-1.5 pr-3 text-right font-semibold text-amber-700">{formatCurrency(m.totalPartMK)}</td>
                            <td className="py-1.5 pr-3 text-right text-gray-700">{formatCurrency(m.totalPartProprio)}</td>
                          </>}
                          <td className="py-1.5 pr-3 text-right text-gray-600">{m.nbSejours}</td>
                          <td className="py-1.5 pr-3 text-right text-gray-600">{m.nbNuits}</td>
                          <td className="py-1.5 pr-3 text-right text-gray-600">
                            {m.tauxOccupation != null && m.nbNuits > 0 ? `${m.tauxOccupation.toFixed(1)}%` : '—'}
                          </td>
                          <td className="py-1.5 text-right text-gray-600">
                            {m.prixMoyenNuit != null ? formatCurrency(m.prixMoyenNuit) : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-gray-300 font-semibold">
                        <td className="pt-2 pr-3 text-xs uppercase tracking-wide text-gray-500">Total / Moy.</td>
                        <td className="pt-2 pr-3 text-right text-gray-900">{formatCurrency(totGross)}</td>
                        <td className="pt-2 pr-3 text-right text-gray-600">{formatCurrency(totCleaning)}</td>
                        <td className="pt-2 pr-3 text-right text-gray-900">{formatCurrency(totNet)}</td>
                        {isConciergerie && <>
                          <td className="pt-2 pr-3 text-right text-amber-700">{formatCurrency(totMK)}</td>
                          <td className="pt-2 pr-3 text-right text-gray-900">{formatCurrency(totProprio)}</td>
                        </>}
                        <td className="pt-2 pr-3 text-right text-gray-900">{totSejours}</td>
                        <td className="pt-2 pr-3 text-right text-gray-900">{totNuits}</td>
                        <td className="pt-2 pr-3 text-right text-gray-800">{avgTaux != null ? `${avgTaux.toFixed(1)}%` : '—'}</td>
                        <td className="pt-2 text-right text-gray-800">{avgPrix != null ? formatCurrency(avgPrix) : '—'}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* Footer */}
                <div className="border-t border-gray-100 pt-3 flex items-center justify-between text-xs text-gray-400">
                  <span>MasterKey Conciergerie</span>
                  <span>Généré le {new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                </div>
              </div>
            )
          })()}

          <div className="flex gap-3 justify-end pt-1">
            <Button variant="ghost" onClick={() => setPrintRevenuesOpen(false)}>Fermer</Button>
            <Button onClick={() => window.print()}>
              <Printer className="w-4 h-4" />
              Imprimer / PDF
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── Print Modal ─────────────────────────────────────────────────────── */}
      <Modal
        isOpen={printModalOpen}
        onClose={() => setPrintModalOpen(false)}
        title="Rapport propriétaire"
        size="lg"
      >
        <div className="space-y-5">
          {/* Month selector */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Sélectionner le mois
            </label>
            <select
              value={selectedMonthKey}
              onChange={(e) => setSelectedMonthKey(e.target.value)}
              className="w-full bg-[#1b1b1b] border border-[#2e2e2e] rounded-lg px-3 py-2.5 text-white
                focus:outline-none focus:border-[#D4AF37] transition-colors text-sm"
            >
              {activeMonths.map((m) => {
                const key = `${m.year}-${String(m.month).padStart(2, '0')}`
                return (
                  <option key={key} value={key}>{m.label}</option>
                )
              })}
            </select>
          </div>

          {/* Preview */}
          {selectedMonth && (
            <div id="print-area" className="bg-white text-gray-900 rounded-xl p-6 space-y-5 print:shadow-none">
              {/* Report header */}
              <div className="border-b border-gray-200 pb-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">{property.name}</h2>
                    <p className="text-gray-500 text-sm mt-0.5">{property.city} · {property.type}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-700">Rapport mensuel</p>
                    <p className="text-gray-500 text-sm">{selectedMonth.label}</p>
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-4 text-sm text-gray-600">
                  <span>Propriétaire : <strong>{property.owner.name}</strong></span>
                  {isConciergerie && (
                    <span>Commission : <strong>{formatPercent(property.commissionRate)}</strong></span>
                  )}
                </div>
              </div>

              {/* Stats grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: 'Revenu brut',  value: formatCurrency(selectedMonth.totalGross),    highlight: false },
                  { label: 'Frais ménage', value: formatCurrency(selectedMonth.totalCleaning),  highlight: false },
                  { label: 'Revenu net',   value: formatCurrency(selectedMonth.totalNet),       highlight: false },
                  ...(isConciergerie ? [
                    { label: 'Part MasterKey', value: formatCurrency(selectedMonth.totalPartMK),    highlight: true  },
                    { label: 'Part propriétaire', value: formatCurrency(selectedMonth.totalPartProprio), highlight: false },
                  ] : []),
                ].map((item) => (
                  <div
                    key={item.label}
                    className={`rounded-lg p-3 text-center ${item.highlight ? 'bg-amber-50 border border-amber-200' : 'bg-gray-50 border border-gray-200'}`}
                  >
                    <p className="text-gray-500 text-xs mb-1">{item.label}</p>
                    <p className={`font-bold text-base ${item.highlight ? 'text-amber-700' : 'text-gray-900'}`}>
                      {item.value}
                    </p>
                  </div>
                ))}
              </div>

              {/* Occupation */}
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-lg bg-gray-50 border border-gray-200 p-3 text-center">
                  <p className="text-gray-500 text-xs mb-1">Séjours</p>
                  <p className="font-bold text-lg text-gray-900">{selectedMonth.nbSejours}</p>
                </div>
                <div className="rounded-lg bg-gray-50 border border-gray-200 p-3 text-center">
                  <p className="text-gray-500 text-xs mb-1">Nuits</p>
                  <p className="font-bold text-lg text-gray-900">{selectedMonth.nbNuits}</p>
                </div>
                <div className="rounded-lg bg-gray-50 border border-gray-200 p-3 text-center">
                  <p className="text-gray-500 text-xs mb-1">Taux occup.</p>
                  <p className="font-bold text-lg text-gray-900">
                    {selectedMonth.tauxOccupation != null && selectedMonth.nbNuits > 0
                      ? `${selectedMonth.tauxOccupation.toFixed(1)}%`
                      : '—'}
                  </p>
                </div>
              </div>

              {/* Price per night */}
              {selectedMonth.prixMoyenNuit != null && (
                <div className="rounded-lg bg-gray-50 border border-gray-200 p-3 flex items-center justify-between">
                  <span className="text-gray-600 text-sm">Prix moyen par nuit</span>
                  <span className="font-bold text-gray-900">{formatCurrency(selectedMonth.prixMoyenNuit)}</span>
                </div>
              )}

              {/* Footer */}
              <div className="border-t border-gray-100 pt-3 flex items-center justify-between text-xs text-gray-400">
                <span>MasterKey Conciergerie</span>
                <span>Généré le {new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 justify-end pt-1">
            <Button variant="ghost" onClick={() => setPrintModalOpen(false)}>
              Fermer
            </Button>
            <Button
              onClick={() => window.print()}
              disabled={!selectedMonth}
            >
              <Printer className="w-4 h-4" />
              Imprimer
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
