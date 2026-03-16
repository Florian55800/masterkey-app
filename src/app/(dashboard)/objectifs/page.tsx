'use client'

import { useEffect, useState } from 'react'
import { Trophy, MapPin, Lock, Unlock, Calculator, Star } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { LoadingPage } from '@/components/ui/LoadingSpinner'
import { formatCurrency, formatPercent, getMilestoneProgress } from '@/lib/utils'

interface City {
  id: number
  name: string
  isActive: boolean
}

interface MilestoneItem {
  value: number
  label: string
  unlocked: boolean
}

interface MilestoneCategory {
  current: number
  milestones: MilestoneItem[]
}

interface ObjectivesData {
  milestones: {
    properties: MilestoneCategory
    cities: MilestoneCategory
    revenue: MilestoneCategory
  }
  cities: City[]
  activeProperties: number
  activeCities: number
  totalRevenue: number
  totalNights: number
}

const BADGES = [
  { id: 'first_property', label: 'Premier logement', description: 'Signer votre 1er logement', threshold: 1, metric: 'properties', icon: '🏠' },
  { id: 'five_properties', label: '5 logements', description: 'Atteindre 5 logements actifs', threshold: 5, metric: 'properties', icon: '⭐' },
  { id: 'ten_properties', label: '10 logements', description: 'Atteindre 10 logements actifs', threshold: 10, metric: 'properties', icon: '🔥' },
  { id: 'twentyfive_properties', label: '25 logements', description: 'Atteindre 25 logements actifs', threshold: 25, metric: 'properties', icon: '💫' },
  { id: 'fifty_properties', label: '50 logements', description: 'Atteindre 50 logements actifs', threshold: 50, metric: 'properties', icon: '🚀' },
  { id: 'hundred_properties', label: '100 logements', description: 'Atteindre 100 logements', threshold: 100, metric: 'properties', icon: '👑' },
  { id: 'first_city', label: 'Première ville', description: 'Couvrir une ville', threshold: 1, metric: 'cities', icon: '🌆' },
  { id: 'three_cities', label: '3 villes', description: 'Couvrir 3 villes', threshold: 3, metric: 'cities', icon: '🗺️' },
  { id: 'five_cities', label: '5 villes', description: 'Couvrir toute la Lorraine', threshold: 5, metric: 'cities', icon: '🏆' },
  { id: 'revenue_10k', label: '10 000€ CA', description: 'Atteindre 10k€ de CA cumulé', threshold: 10000, metric: 'revenue', icon: '💰' },
  { id: 'revenue_50k', label: '50 000€ CA', description: 'Atteindre 50k€ de CA cumulé', threshold: 50000, metric: 'revenue', icon: '💎' },
  { id: 'revenue_100k', label: '100 000€ CA', description: 'Atteindre 100k€ de CA cumulé', threshold: 100000, metric: 'revenue', icon: '🌟' },
]

const PROPERTY_MILESTONES = [5, 10, 25, 50, 100]
const CITY_MILESTONES = [1, 3, 5]

export default function ObjectifsPage() {
  const [data, setData] = useState<ObjectivesData | null>(null)
  const [loading, setLoading] = useState(true)
  const [togglingCity, setTogglingCity] = useState<number | null>(null)
  const [commission, setCommission] = useState({
    avgRevenue: '10000',
    properties: '5',
    rate: '20',
    months: '12',
  })
  const [simResult, setSimResult] = useState<{
    annualCA: number
    annualCommission: number
    monthlyCommission: number
  } | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    const res = await fetch('/api/objectives')
    const d = await res.json()
    setData(d)
    setLoading(false)
  }

  const handleToggleCity = async (cityId: number) => {
    setTogglingCity(cityId)
    await fetch(`/api/objectives/cities/${cityId}`, { method: 'POST' })
    await loadData()
    setTogglingCity(null)
  }

  const simulate = () => {
    const avg = parseFloat(commission.avgRevenue)
    const props = parseFloat(commission.properties)
    const rate = parseFloat(commission.rate)
    const months = parseFloat(commission.months)

    if (!isNaN(avg) && !isNaN(props) && !isNaN(rate) && !isNaN(months)) {
      const monthlyCA = avg * props
      const annualCA = monthlyCA * months
      const annualCommission = (annualCA * rate) / 100
      setSimResult({ annualCA, annualCommission, monthlyCommission: annualCommission / 12 })
    }
  }

  if (loading) return <LoadingPage />
  if (!data) return null

  const { milestones, cities } = data

  const propProgress = getMilestoneProgress(
    data.activeProperties,
    PROPERTY_MILESTONES.map((v, i) => ({ value: v, label: ['Premier pas', 'En route', 'En croissance', 'Leader local', 'Référence'][i] }))
  )
  const cityProgress = getMilestoneProgress(
    data.activeCities,
    CITY_MILESTONES.map((v, i) => ({ value: v, label: ['Première ville', 'Expansion', 'Lorraine'][i] }))
  )

  const getBadgeUnlocked = (badge: typeof BADGES[0]) => {
    if (badge.metric === 'properties') return data.activeProperties >= badge.threshold
    if (badge.metric === 'cities') return data.activeCities >= badge.threshold
    if (badge.metric === 'revenue') return data.totalRevenue >= badge.threshold
    return false
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Objectifs & Croissance</h1>
        <p className="text-gray-400 mt-1">Suivez vos paliers et progressez vers l'excellence</p>
      </div>

      {/* Progress Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <p className="text-gray-400 text-sm mb-3">Logements actifs</p>
          <div className="flex items-end justify-between mb-3">
            <span className="text-4xl font-bold text-[#D4AF37]">{data.activeProperties}</span>
            {propProgress.next && (
              <span className="text-gray-400 text-sm">/ {propProgress.next.value}</span>
            )}
          </div>
          <div className="h-2 bg-[#1b1b1b] rounded-full overflow-hidden mb-2">
            <div
              className="h-full bg-gradient-to-r from-[#B8962B] to-[#D4AF37] rounded-full transition-all duration-700"
              style={{ width: `${propProgress.percent}%` }}
            />
          </div>
          <p className="text-gray-500 text-xs">
            {propProgress.next ? `${propProgress.percent}% vers "${propProgress.next.label}"` : 'Tous paliers atteints!'}
          </p>
        </Card>

        <Card>
          <p className="text-gray-400 text-sm mb-3">Villes couvertes</p>
          <div className="flex items-end justify-between mb-3">
            <span className="text-4xl font-bold text-blue-400">{data.activeCities}</span>
            {cityProgress.next && (
              <span className="text-gray-400 text-sm">/ {cityProgress.next.value}</span>
            )}
          </div>
          <div className="h-2 bg-[#1b1b1b] rounded-full overflow-hidden mb-2">
            <div
              className="h-full bg-gradient-to-r from-blue-700 to-blue-400 rounded-full transition-all duration-700"
              style={{ width: `${cityProgress.percent}%` }}
            />
          </div>
          <p className="text-gray-500 text-xs">
            {cityProgress.next ? `${cityProgress.percent}% vers "${cityProgress.next.label}"` : 'Couverture complète!'}
          </p>
        </Card>

        <Card>
          <p className="text-gray-400 text-sm mb-3">CA Total cumulé</p>
          <p className="text-4xl font-bold text-green-400 mb-3">{formatCurrency(data.totalRevenue)}</p>
          <div className="space-y-1">
            {milestones.revenue.milestones.map((m) => (
              <div key={m.value} className="flex items-center gap-2 text-sm">
                <div className={`w-2 h-2 rounded-full ${m.unlocked ? 'bg-green-400' : 'bg-[#2e2e2e]'}`} />
                <span className={m.unlocked ? 'text-green-400' : 'text-gray-600'}>
                  {formatCurrency(m.value)} — {m.label}
                </span>
                {m.unlocked && <span className="ml-auto text-green-400 text-xs">✓</span>}
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Milestones Timeline */}
      <Card>
        <div className="flex items-center gap-2 mb-6">
          <Trophy className="w-5 h-5 text-[#D4AF37]" />
          <h3 className="text-white font-semibold">Paliers de logements</h3>
        </div>
        <div className="relative">
          {/* Track */}
          <div className="absolute top-5 left-0 right-0 h-0.5 bg-[#2e2e2e]" />
          <div
            className="absolute top-5 left-0 h-0.5 bg-gradient-to-r from-[#B8962B] to-[#D4AF37] transition-all duration-700"
            style={{
              width: `${Math.min(100, (data.activeProperties / 100) * 100)}%`,
            }}
          />
          <div className="relative flex justify-between">
            {PROPERTY_MILESTONES.map((milestone) => {
              const unlocked = data.activeProperties >= milestone
              return (
                <div key={milestone} className="flex flex-col items-center">
                  <div
                    className={`w-10 h-10 rounded-full border-2 flex items-center justify-center z-10 relative transition-all ${
                      unlocked
                        ? 'border-[#D4AF37] bg-[#D4AF37] text-black glow-gold-sm'
                        : 'border-[#2e2e2e] bg-[#1b1b1b] text-gray-600'
                    }`}
                  >
                    {unlocked ? (
                      <span className="text-sm font-bold">{milestone >= 100 ? '★' : milestone >= 50 ? '◆' : '✓'}</span>
                    ) : (
                      <Lock className="w-3.5 h-3.5" />
                    )}
                  </div>
                  <div className="mt-3 text-center">
                    <p className={`font-bold text-sm ${unlocked ? 'text-[#D4AF37]' : 'text-gray-600'}`}>{milestone}</p>
                    <p className={`text-xs ${unlocked ? 'text-gray-400' : 'text-gray-700'}`}>
                      {['Premier pas', 'En route', 'En croissance', 'Leader local', 'Référence'][PROPERTY_MILESTONES.indexOf(milestone)]}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </Card>

      {/* Cities Coverage */}
      <Card>
        <div className="flex items-center gap-2 mb-5">
          <MapPin className="w-5 h-5 text-blue-400" />
          <h3 className="text-white font-semibold">Couverture géographique</h3>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {cities.map((city) => (
            <button
              key={city.id}
              onClick={() => handleToggleCity(city.id)}
              disabled={togglingCity === city.id}
              className={`relative p-4 rounded-xl border-2 transition-all text-left ${
                city.isActive
                  ? 'border-blue-500/50 bg-blue-500/10 glow-gold-sm'
                  : 'border-[#2e2e2e] bg-[#1b1b1b] hover:border-[#3e3e3e]'
              } ${togglingCity === city.id ? 'opacity-50' : ''}`}
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 ${
                city.isActive ? 'bg-blue-500/20' : 'bg-[#2e2e2e]'
              }`}>
                <MapPin className={`w-4 h-4 ${city.isActive ? 'text-blue-400' : 'text-gray-500'}`} />
              </div>
              <p className={`font-medium text-sm ${city.isActive ? 'text-white' : 'text-gray-400'}`}>
                {city.name}
              </p>
              <p className={`text-xs mt-0.5 ${city.isActive ? 'text-blue-400' : 'text-gray-600'}`}>
                {city.isActive ? 'Active' : 'Inactive'}
              </p>
            </button>
          ))}
        </div>
      </Card>

      {/* Badges */}
      <Card>
        <div className="flex items-center gap-2 mb-5">
          <Star className="w-5 h-5 text-[#D4AF37]" />
          <h3 className="text-white font-semibold">Badges & Récompenses</h3>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {BADGES.map((badge) => {
            const unlocked = getBadgeUnlocked(badge)
            return (
              <div
                key={badge.id}
                className={`p-4 rounded-xl border-2 text-center transition-all ${
                  unlocked
                    ? 'border-[#D4AF37]/30 bg-[#D4AF37]/5 glow-gold-sm'
                    : 'border-[#2e2e2e] bg-[#1b1b1b] grayscale opacity-50'
                }`}
              >
                <div className="text-3xl mb-2">{badge.icon}</div>
                <p className={`font-semibold text-sm mb-1 ${unlocked ? 'text-[#D4AF37]' : 'text-gray-500'}`}>
                  {badge.label}
                </p>
                <p className="text-gray-500 text-xs">{badge.description}</p>
                {unlocked && (
                  <div className="mt-2 flex items-center justify-center gap-1">
                    <Unlock className="w-3 h-3 text-[#D4AF37]" />
                    <span className="text-[#D4AF37] text-xs font-medium">Débloqué</span>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </Card>

      {/* Commission Simulator */}
      <Card>
        <div className="flex items-center gap-2 mb-5">
          <Calculator className="w-5 h-5 text-[#D4AF37]" />
          <h3 className="text-white font-semibold">Simulateur de revenus annuels</h3>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
          <div className="space-y-1.5">
            <label className="text-xs text-gray-400">CA moy / logement / mois (€)</label>
            <input
              type="number"
              value={commission.avgRevenue}
              onChange={(e) => setCommission({ ...commission, avgRevenue: e.target.value })}
              className="w-full bg-[#1b1b1b] border border-[#2e2e2e] rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#D4AF37] transition-colors"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-gray-400">Nombre de logements</label>
            <input
              type="number"
              value={commission.properties}
              onChange={(e) => setCommission({ ...commission, properties: e.target.value })}
              className="w-full bg-[#1b1b1b] border border-[#2e2e2e] rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#D4AF37] transition-colors"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-gray-400">Taux de commission (%)</label>
            <input
              type="number"
              value={commission.rate}
              onChange={(e) => setCommission({ ...commission, rate: e.target.value })}
              className="w-full bg-[#1b1b1b] border border-[#2e2e2e] rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#D4AF37] transition-colors"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-gray-400">Durée (mois)</label>
            <input
              type="number"
              value={commission.months}
              onChange={(e) => setCommission({ ...commission, months: e.target.value })}
              className="w-full bg-[#1b1b1b] border border-[#2e2e2e] rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#D4AF37] transition-colors"
            />
          </div>
        </div>

        <button
          onClick={simulate}
          className="bg-[#D4AF37] text-black font-semibold px-6 py-2.5 rounded-xl hover:bg-[#E8C84D] transition-colors text-sm"
        >
          Simuler
        </button>

        {simResult && (
          <div className="mt-4 grid grid-cols-3 gap-4">
            <div className="bg-[#1b1b1b] rounded-xl p-4 text-center">
              <p className="text-gray-400 text-xs mb-1">CA annuel</p>
              <p className="text-white font-bold text-lg">{formatCurrency(simResult.annualCA)}</p>
            </div>
            <div className="bg-[#D4AF37]/10 border border-[#D4AF37]/20 rounded-xl p-4 text-center">
              <p className="text-gray-400 text-xs mb-1">Commission annuelle</p>
              <p className="text-[#D4AF37] font-bold text-lg">{formatCurrency(simResult.annualCommission)}</p>
            </div>
            <div className="bg-[#1b1b1b] rounded-xl p-4 text-center">
              <p className="text-gray-400 text-xs mb-1">Commission / mois</p>
              <p className="text-green-400 font-bold text-lg">{formatCurrency(simResult.monthlyCommission)}</p>
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}
