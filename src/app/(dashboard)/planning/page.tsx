'use client'

import { useEffect, useState, useCallback } from 'react'
import { Calendar, List, ChevronLeft, ChevronRight, MessageSquare, RefreshCw, X } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { LoadingPage } from '@/components/ui/LoadingSpinner'
import { formatCurrency } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Booking {
  id: number
  arrival: string
  departure: string
  property_id: number
  status: string
  source: string
  total_amount: number
  subtotals: { stay: number; fees: number; taxes: number }
  guest: { name: string; email: string; phone: string }
  check_in:  { time: string }
  check_out: { time: string }
  thread_uid: string | null
  notes: string
}

interface Message { type: string; body: string; created_at: string; sender: { name: string } }
interface Thread  { messages: Message[]; booking_id: number; property_name?: string }

// ─── Lodgify property map (IDs → names) ───────────────────────────────────────

// Liste complète des logements Lodgify (source de vérité pour les IDs)
const LODGIFY_PROPERTIES: Record<number, string> = {
  690597: 'T2 Commercy',
  690679: 'Studio Rochelle',
  694500: 'T2 Pompidou Metz',
  702625: 'Studio Ligny Centre',
  702626: 'T2 Cosy Ligny',
  705470: 'Studio Nancy Rives',
  745678: 'T2 Bar-le-Duc',
  783021: 'T4 Stanislas Nancy',
  783678: 'Studio Saint-Dizier',
  784842: 'T2 Hyper-Centre Nancy',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Lodgify et Direct sont en réalité des réservations Airbnb
const SOURCE_META: Record<string, { label: string; color: string; bg: string; border: string }> = {
  Airbnb:     { label: 'Airbnb',      color: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/20' },
  BookingCom: { label: 'Booking',     color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
  Lodgify:    { label: 'Airbnb',      color: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/20' },
  Direct:     { label: 'Airbnb',      color: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/20' },
}
function sourceMeta(s: string) {
  return SOURCE_META[s] ?? { label: 'Airbnb', color: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/20' }
}

const STATUS_META: Record<string, { label: string; color: string }> = {
  Confirmed:  { label: 'Confirmé',  color: 'text-emerald-400' },
  Request:    { label: 'Demande',   color: 'text-amber-400' },
  Tentative:  { label: 'Tentative', color: 'text-yellow-400' },
  Declined:   { label: 'Refusé',    color: 'text-red-400' },
  Cancelled:  { label: 'Annulé',    color: 'text-red-400' },
  Canceled:   { label: 'Annulé',    color: 'text-red-400' },
  CheckedIn:  { label: 'En cours',  color: 'text-blue-400' },
  CheckedOut: { label: 'Terminé',   color: 'text-gray-400' },
}
function statusMeta(s: string) {
  return STATUS_META[s] ?? { label: s, color: 'text-gray-400' }
}

function nights(arrival: string, departure: string) {
  return Math.round((new Date(departure).getTime() - new Date(arrival).getTime()) / 86400000)
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
}

const MONTHS_FR = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre']

// ─── Timeline calendar (style Lodgify) ───────────────────────────────────────

function CalendarView({ bookings, activeProps }: { bookings: Booking[]; activeProps: { id: number; name: string }[] }) {
  const todayD = new Date(); todayD.setHours(0, 0, 0, 0)
  const [year,  setYear]  = useState(todayD.getFullYear())
  const [month, setMonth] = useState(todayD.getMonth())
  const [selected, setSelected] = useState<Booking | null>(null)

  const prev    = () => { if (month === 0) { setMonth(11); setYear(y => y - 1) } else setMonth(m => m - 1) }
  const next    = () => { if (month === 11) { setMonth(0); setYear(y => y + 1) } else setMonth(m => m + 1) }
  const goToday = () => { setYear(todayD.getFullYear()); setMonth(todayD.getMonth()) }

  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const DAY_W  = 36
  const PROP_W = 160
  const ROW_H  = 50
  const BAR_H  = 26
  const BAR_TOP = (ROW_H - BAR_H) / 2

  const monthStart = new Date(year, month, 1)
  const monthEnd   = new Date(year, month + 1, 0)

  const relevant = bookings.filter(b => {
    if (['Declined','Cancelled','Canceled'].includes(b.status)) return false
    const arr = new Date(b.arrival); const dep = new Date(b.departure)
    return arr <= monthEnd && dep > monthStart
  })

  const byProp: Record<number, Booking[]> = {}
  for (const b of relevant) {
    if (!byProp[b.property_id]) byProp[b.property_id] = []
    byProp[b.property_id].push(b)
  }

  const allProps = activeProps.length > 0
    ? activeProps
    : Object.entries(LODGIFY_PROPERTIES).map(([id, name]) => ({ id: Number(id), name })).sort((a, b) => a.name.localeCompare(b.name))


  function barLayout(b: Booking) {
    const arr = new Date(b.arrival); arr.setHours(0, 0, 0, 0)
    const dep = new Date(b.departure); dep.setHours(0, 0, 0, 0)
    const startsBefore = arr < monthStart
    const endsAfter    = dep > monthEnd
    const arrDay = startsBefore ? 0 : arr.getDate() - 1
    const depDay = endsAfter ? daysInMonth : dep.getDate() - 1
    const left  = arrDay * DAY_W + 2
    const width = Math.max((depDay - arrDay) * DAY_W - 4, DAY_W / 2)
    return { left, width, startsBefore, endsAfter }
  }

  const DOW = ['Di','Lu','Ma','Me','Je','Ve','Sa']

  return (
    <div className="bg-[#181818] border border-white/[0.06] rounded-2xl overflow-hidden">
      {/* Navigation */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.06]">
        <div className="flex items-center gap-2">
          <button onClick={prev} className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/[0.05] transition-all">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-white font-semibold text-sm w-36 text-center">{MONTHS_FR[month]} {year}</span>
          <button onClick={next} className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/[0.05] transition-all">
            <ChevronRight className="w-4 h-4" />
          </button>
          <button onClick={goToday} className="ml-1 px-2.5 py-1 rounded-lg text-xs text-white/40 hover:text-white border border-white/[0.08] hover:border-white/20 transition-all">
            Aujourd'hui
          </button>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5"><div className="w-3 h-2.5 rounded-sm bg-rose-500" /><span className="text-white/30 text-xs">Airbnb</span></div>
          <div className="flex items-center gap-1.5"><div className="w-3 h-2.5 rounded-sm bg-blue-600" /><span className="text-white/30 text-xs">Booking</span></div>
        </div>
      </div>

      {/* Scrollable grid */}
      <div className="overflow-x-auto">
        <div style={{ minWidth: PROP_W + daysInMonth * DAY_W }}>

          {/* Day header */}
          <div className="flex border-b border-white/[0.06]" style={{ background: '#181818', position: 'sticky', top: 0, zIndex: 10 }}>
            <div style={{ width: PROP_W, minWidth: PROP_W }} className="flex-shrink-0 px-3 py-2 border-r border-white/[0.06] flex items-center">
              <span className="text-white/20 text-[10px] uppercase tracking-widest">Logement</span>
            </div>
            {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(d => {
              const date = new Date(year, month, d)
              const isToday   = d === todayD.getDate() && month === todayD.getMonth() && year === todayD.getFullYear()
              const isWeekend = date.getDay() === 0 || date.getDay() === 6
              return (
                <div key={d} style={{ width: DAY_W, minWidth: DAY_W }}
                  className={`flex-shrink-0 text-center py-2 border-l border-white/[0.04] ${
                    isToday ? 'bg-[#D4AF37]/20' : isWeekend ? 'bg-white/[0.025]' : ''
                  }`}>
                  <div className={`text-[9px] leading-none mb-0.5 ${isToday ? 'text-[#D4AF37]' : 'text-white/20'}`}>{DOW[date.getDay()]}</div>
                  <div className={`text-sm font-bold leading-none ${isToday ? 'text-[#D4AF37]' : isWeekend ? 'text-white/50' : 'text-white/55'}`}>{d}</div>
                </div>
              )
            })}
          </div>

          {/* Property rows */}
          {allProps.map(({ id, name }) => {
            const propBookings = byProp[id] ?? []
            return (
              <div key={id} className="flex border-b border-white/[0.04] hover:bg-white/[0.01] transition-colors" style={{ height: ROW_H }}>
                {/* Label */}
                <div style={{ width: PROP_W, minWidth: PROP_W, height: ROW_H }}
                  className="flex-shrink-0 px-3 flex items-center border-r border-white/[0.04]">
                  <span className="text-white/55 text-xs font-medium truncate" title={name}>{name}</span>
                </div>
                {/* Timeline area */}
                <div className="flex-1 relative" style={{ height: ROW_H }}>
                  {/* Day cell backgrounds */}
                  <div className="absolute inset-0 flex pointer-events-none">
                    {Array.from({ length: daysInMonth }, (_, i) => {
                      const d = i + 1
                      const date = new Date(year, month, d)
                      const isToday   = d === todayD.getDate() && month === todayD.getMonth() && year === todayD.getFullYear()
                      const isWeekend = date.getDay() === 0 || date.getDay() === 6
                      return (
                        <div key={d} style={{ width: DAY_W, minWidth: DAY_W, flexShrink: 0 }}
                          className={`h-full border-l border-white/[0.03] ${
                            isToday ? 'bg-[#D4AF37]/[0.06]' : isWeekend ? 'bg-white/[0.015]' : ''
                          }`} />
                      )
                    })}
                  </div>

                  {/* Booking bars */}
                  {propBookings.map(b => {
                    const { left, width, startsBefore, endsAfter } = barLayout(b)
                    const n = nights(b.arrival, b.departure)
                    const guestFirst = b.guest.name.split(' ')[0]
                    const isSelected = selected?.id === b.id
                    const barCls = b.source === 'BookingCom'
                      ? 'bg-blue-600 border-blue-300/20 text-white'
                      : 'bg-rose-500 border-rose-300/20 text-white'
                    return (
                      <div
                        key={b.id}
                        onClick={() => setSelected(isSelected ? null : b)}
                        title={`${b.guest.name} • ${n} nuits • ${fmtDate(b.arrival)} → ${fmtDate(b.departure)} • ${formatCurrency(b.subtotals.stay)}`}
                        style={{
                          position: 'absolute',
                          left,
                          top: BAR_TOP,
                          width,
                          height: BAR_H,
                          borderRadius: startsBefore ? '0 5px 5px 0' : endsAfter ? '5px 0 0 5px' : 5,
                          zIndex: 2,
                        }}
                        className={`${barCls} border flex items-center px-2 gap-1 overflow-hidden cursor-pointer select-none shadow-sm transition-all ${
                          isSelected ? 'ring-2 ring-white/60 brightness-110' : 'hover:brightness-110'
                        }`}
                      >
                        <span className="text-[11px] font-semibold truncate leading-none">{guestFirst}</span>
                        {width > 70 && <span className="text-[10px] opacity-60 flex-shrink-0 leading-none">{n}n</span>}
                        {width > 128 && b.subtotals.stay > 0 && (
                          <span className="text-[10px] opacity-70 ml-auto flex-shrink-0 leading-none">{Math.round(b.subtotals.stay)}€</span>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Detail panel (clic sur une résa) */}
      {selected && (
        <div className="border-t border-white/[0.06] px-5 py-3 flex items-center justify-between gap-4 bg-white/[0.02]">
          <div className="flex items-center gap-4 flex-wrap text-sm">
            <div>
              <p className="text-white font-semibold">{selected.guest.name}</p>
              <p className="text-white/30 text-xs">{LODGIFY_PROPERTIES[selected.property_id] ?? `#${selected.property_id}`}</p>
            </div>
            <span className="text-white/40">{fmtDate(selected.arrival)} → {fmtDate(selected.departure)} <span className="text-white/20">({nights(selected.arrival, selected.departure)} nuits)</span></span>
            {selected.guest.phone && <span className="text-white/40">{selected.guest.phone}</span>}
            {selected.subtotals.stay > 0 && <span className="text-[#D4AF37] font-bold">{formatCurrency(selected.subtotals.stay)}</span>}
            <span className={`text-xs px-2 py-0.5 rounded-full border ${sourceMeta(selected.source).bg} ${sourceMeta(selected.source).color} ${sourceMeta(selected.source).border}`}>
              {sourceMeta(selected.source).label}
            </span>
            <span className={`text-xs font-medium ${statusMeta(selected.status).color}`}>{statusMeta(selected.status).label}</span>
          </div>
          <button onClick={() => setSelected(null)} className="text-white/20 hover:text-white transition-colors flex-shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Message drawer ────────────────────────────────────────────────────────────

function MessageDrawer({ threadUid, guestName, onClose }: { threadUid: string; guestName: string; onClose: () => void }) {
  const [thread, setThread]   = useState<Thread | null>(null)
  const [loading, setLoading] = useState(true)
  const [reply,   setReply]   = useState('')
  const [sending, setSending] = useState(false)

  useEffect(() => {
    fetch(`/api/lodgify/messages?uid=${threadUid}`)
      .then(r => r.json()).then(setThread).finally(() => setLoading(false))
  }, [threadUid])

  const sendMessage = async () => {
    if (!reply.trim()) return
    setSending(true)
    await fetch('/api/lodgify/messages', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid: threadUid, message: reply }),
    })
    setReply('')
    // Reload thread
    const data = await fetch(`/api/lodgify/messages?uid=${threadUid}`).then(r => r.json())
    setThread(data)
    setSending(false)
  }

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md flex flex-col"
      style={{ background: '#161616', borderLeft: '1px solid rgba(255,255,255,0.07)', boxShadow: '-8px 0 32px rgba(0,0,0,0.5)' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.07]">
        <div>
          <p className="text-white font-semibold">{guestName}</p>
          <p className="text-gray-500 text-xs mt-0.5">Messages voyageur</p>
        </div>
        <button onClick={onClose} className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/[0.06] transition-all">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
        {loading ? (
          <p className="text-gray-500 text-sm text-center mt-10">Chargement…</p>
        ) : !thread?.messages?.length ? (
          <p className="text-gray-500 text-sm text-center mt-10">Aucun message</p>
        ) : (
          thread.messages.map((msg, i) => {
            const isHost = msg.type === 'HostMessage' || msg.sender?.name === 'MasterKey'
            return (
              <div key={i} className={`flex ${isHost ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm ${
                  isHost ? 'bg-[#D4AF37]/20 text-white rounded-br-sm' : 'bg-white/[0.06] text-gray-200 rounded-bl-sm'
                }`}>
                  <p className="leading-relaxed">{msg.body}</p>
                  <p className="text-[10px] mt-1 opacity-50">
                    {new Date(msg.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Reply */}
      <div className="px-4 pb-5 pt-3 border-t border-white/[0.07]">
        <div className="flex gap-2">
          <textarea
            value={reply} onChange={e => setReply(e.target.value)}
            rows={2} placeholder="Écrire un message…"
            className="flex-1 bg-white/[0.05] border border-white/[0.1] rounded-xl px-3 py-2 text-white text-sm resize-none focus:outline-none focus:border-[#D4AF37]/40 placeholder-gray-600"
          />
          <Button onClick={sendMessage} isLoading={sending} disabled={!reply.trim()}>Envoyer</Button>
        </div>
      </div>
    </div>
  )
}

// ─── Main page ─────────────────────────────────────────────────────────────────

export default function PlanningPage() {
  const [view,       setView]       = useState<'list' | 'calendar'>('list')
  const [filter,     setFilter]     = useState<'Upcoming' | 'Historic'>('Upcoming')
  const [bookings,   setBookings]   = useState<Booking[]>([])
  const [loading,    setLoading]    = useState(true)
  const [propFilter, setPropFilter] = useState<number | null>(null)
  const [srcFilter,  setSrcFilter]  = useState<string>('tous')
  const [statusFilter, setStatusFilter] = useState<string>('tous')
  const [activeThread, setActiveThread] = useState<{ uid: string; guest: string } | null>(null)
  const [page,       setPage]       = useState(1)
  const [total,      setTotal]      = useState(0)
  const [payoutMap,  setPayoutMap]  = useState<Record<number, { commissionRate: number; cleaningFee: number; name: string; status: string }>>({})
  const [activeProps, setActiveProps] = useState<{ id: number; name: string }[]>([])
  const PAGE_SIZE = 50

  // Load payout map once — pour commissions + filtrage actif/inactif
  useEffect(() => {
    fetch('/api/lodgify/payout-map').then(r => r.json()).then(data => {
      if (data && typeof data === 'object' && !data.error) {
        setPayoutMap(data)
        // Construire la liste des Lodgify IDs actifs :
        // Un logement est inactif si le payout-map le connaît ET le marque inactif.
        // Les logements non encore dans le payout-map sont considérés actifs.
        const inactiveLodgifyIds = new Set(
          Object.entries(data as Record<string, any>)
            .filter(([, info]) => info.status !== 'active')
            .map(([id]) => Number(id))
        )
        const active = Object.entries(LODGIFY_PROPERTIES)
          .map(([id, name]) => ({ id: Number(id), name }))
          .filter(({ id }) => !inactiveLodgifyIds.has(id))
          .sort((a, b) => a.name.localeCompare(b.name))
        setActiveProps(active)
      }
    }).catch(() => {
      // Si payout-map échoue, afficher tous les logements
      const all = Object.entries(LODGIFY_PROPERTIES)
        .map(([id, name]) => ({ id: Number(id), name }))
        .sort((a, b) => a.name.localeCompare(b.name))
      setActiveProps(all)
    })
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const url = `/api/lodgify/bookings?filter=${filter}&size=${PAGE_SIZE}&page=${page}${propFilter ? `&propertyId=${propFilter}` : ''}`
      const res  = await fetch(url)
      const data = await res.json()
      setBookings(Array.isArray(data.items) ? data.items : [])
      setTotal(data.count ?? 0)
    } catch { setBookings([]) }
    finally { setLoading(false) }
  }, [filter, page, propFilter])

  useEffect(() => { load() }, [load])

  // Normalise Lodgify/Direct → Airbnb
  function normSource(s: string) { return (s === 'Lodgify' || s === 'Direct') ? 'Airbnb' : s }

  // Filters applied client-side
  const displayed = bookings.filter(b => {
    if (srcFilter !== 'tous' && normSource(b.source) !== srcFilter) return false
    if (statusFilter !== 'tous' && b.status !== statusFilter) return false
    return true
  })

  // Stats
  const confirmed  = bookings.filter(b => b.status === 'Confirmed').length
  const totalRev   = bookings.filter(b => b.status === 'Confirmed').reduce((s, b) => s + b.subtotals.stay, 0)
  const totalNights = bookings.filter(b => b.status === 'Confirmed').reduce((s, b) => s + nights(b.arrival, b.departure), 0)

  const allSources = Array.from(new Set(bookings.map(b => normSource(b.source))))
  const allStatuses = Array.from(new Set(bookings.map(b => b.status)))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Planning</h1>
          <p className="text-gray-400 mt-1">Réservations synchronisées depuis Lodgify</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} className="p-2 rounded-xl border border-white/[0.08] text-gray-400 hover:text-white transition-all">
            <RefreshCw className="w-4 h-4" />
          </button>
          {/* List / Calendar toggle */}
          <div className="flex items-center bg-[#1a1a1a] border border-[#2e2e2e] rounded-xl p-1">
            <button onClick={() => setView('list')}
              className={`p-2 rounded-lg transition-all ${view === 'list' ? 'bg-[#D4AF37] text-black' : 'text-gray-400 hover:text-white'}`}>
              <List className="w-4 h-4" />
            </button>
            <button onClick={() => setView('calendar')}
              className={`p-2 rounded-lg transition-all ${view === 'calendar' ? 'bg-[#D4AF37] text-black' : 'text-gray-400 hover:text-white'}`}>
              <Calendar className="w-4 h-4" />
            </button>
          </div>
          {/* Upcoming / Historic */}
          <div className="flex items-center bg-[#1a1a1a] border border-[#2e2e2e] rounded-xl p-1">
            {(['Upcoming', 'Historic'] as const).map(f => (
              <button key={f} onClick={() => { setFilter(f); setPage(1) }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${filter === f ? 'bg-[#D4AF37] text-black' : 'text-gray-400 hover:text-white'}`}>
                {f === 'Upcoming' ? 'À venir' : 'Historique'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card padding="sm" className="text-center">
          <p className="text-gray-400 text-xs mb-1">Réservations</p>
          <p className="text-[#D4AF37] font-bold text-2xl">{confirmed}</p>
          <p className="text-gray-500 text-xs">confirmées</p>
        </Card>
        <Card padding="sm" className="text-center">
          <p className="text-gray-400 text-xs mb-1">CA séjours</p>
          <p className="text-white font-bold text-2xl">{formatCurrency(totalRev)}</p>
        </Card>
        <Card padding="sm" className="text-center">
          <p className="text-gray-400 text-xs mb-1">Nuits</p>
          <p className="text-white font-bold text-2xl">{totalNights}</p>
        </Card>
        <Card padding="sm" className="text-center">
          <p className="text-gray-400 text-xs mb-1">Total chargé</p>
          <p className="text-gray-300 font-bold text-2xl">{total}</p>
          <p className="text-gray-500 text-xs">résa(s)</p>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        {/* Property */}
        <select value={propFilter ?? ''} onChange={e => { setPropFilter(e.target.value ? Number(e.target.value) : null); setPage(1) }}
          className="bg-[#242424] border border-[#2e2e2e] rounded-xl px-3 py-2 text-gray-300 text-sm focus:outline-none focus:border-[#D4AF37]">
          <option value="">Tous les logements</option>
          {Object.entries(LODGIFY_PROPERTIES).map(([id, name]) => (
            <option key={id} value={id}>{name}</option>
          ))}
        </select>
        {/* Source */}
        <select value={srcFilter} onChange={e => setSrcFilter(e.target.value)}
          className="bg-[#242424] border border-[#2e2e2e] rounded-xl px-3 py-2 text-gray-300 text-sm focus:outline-none focus:border-[#D4AF37]">
          <option value="tous">Toutes plateformes</option>
          {allSources.map(s => <option key={s} value={s}>{sourceMeta(s).label}</option>)}
        </select>
        {/* Status */}
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="bg-[#242424] border border-[#2e2e2e] rounded-xl px-3 py-2 text-gray-300 text-sm focus:outline-none focus:border-[#D4AF37]">
          <option value="tous">Tous statuts</option>
          {allStatuses.map(s => <option key={s} value={s}>{statusMeta(s).label}</option>)}
        </select>
        <span className="text-gray-500 text-sm ml-auto">{displayed.length} résultat(s)</span>
      </div>

      {loading ? <LoadingPage /> : view === 'calendar' ? (
        <CalendarView bookings={displayed} activeProps={activeProps} />
      ) : (
        <Card padding="none">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-400 text-xs border-b border-white/[0.06]">
                  <th className="text-left px-5 py-3">Logement</th>
                  <th className="text-left px-4 py-3">Voyageur</th>
                  <th className="text-left px-4 py-3">Arrivée</th>
                  <th className="text-left px-4 py-3">Départ</th>
                  <th className="text-center px-4 py-3">Nuits</th>
                  <th className="text-left px-4 py-3">Plateforme</th>
                  <th className="text-left px-4 py-3">Statut</th>
                  <th className="text-right px-4 py-3">Séjour</th>
                  <th className="text-right px-4 py-3">Virement</th>
                  <th className="px-4 py-3 w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {displayed.length === 0 ? (
                  <tr><td colSpan={10} className="text-center py-12 text-gray-500">Aucune réservation</td></tr>
                ) : displayed.map(b => {
                  const sm = sourceMeta(b.source)
                  const st = statusMeta(b.status)
                  const n  = nights(b.arrival, b.departure)
                  const propName = LODGIFY_PROPERTIES[b.property_id] ?? `#${b.property_id}`
                  const AIRBNB_FEE = 0.1861
                  const payout = payoutMap[b.property_id]
                  const isAirbnb = b.source === 'Airbnb'
                  const virementAmount = isAirbnb && payout
                    ? (b.subtotals.stay + payout.cleaningFee) * (1 - AIRBNB_FEE)
                    : null
                  return (
                    <tr key={b.id} className="hover:bg-white/[0.02] transition-colors group">
                      <td className="px-5 py-3 font-medium text-white">{propName}</td>
                      <td className="px-4 py-3">
                        <p className="text-white">{b.guest.name}</p>
                        {b.guest.phone && <p className="text-gray-500 text-xs">{b.guest.phone}</p>}
                      </td>
                      <td className="px-4 py-3 text-gray-300 whitespace-nowrap">
                        {fmtDate(b.arrival)}
                        <span className="text-gray-600 ml-1 text-xs">{b.check_in?.time?.slice(0,5)}</span>
                      </td>
                      <td className="px-4 py-3 text-gray-300 whitespace-nowrap">
                        {fmtDate(b.departure)}
                        <span className="text-gray-600 ml-1 text-xs">{b.check_out?.time?.slice(0,5)}</span>
                      </td>
                      <td className="px-4 py-3 text-center text-gray-300">{n}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${sm.bg} ${sm.color} ${sm.border}`}>
                          {sm.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-medium ${st.color}`}>{st.label}</span>
                      </td>
                      <td className="px-4 py-3 text-right text-gray-400 font-medium">
                        {b.subtotals.stay > 0 ? formatCurrency(b.subtotals.stay) : '—'}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold">
                        {virementAmount !== null ? (
                          <span className="text-emerald-400">{formatCurrency(virementAmount)}</span>
                        ) : (
                          <span className="text-gray-600 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {b.thread_uid && (
                          <button
                            onClick={() => setActiveThread({ uid: b.thread_uid!, guest: b.guest.name })}
                            className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-gray-500 hover:text-[#D4AF37] hover:bg-[#D4AF37]/10 transition-all"
                            title="Messages"
                          >
                            <MessageSquare className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {total > PAGE_SIZE && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-white/[0.05]">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="flex items-center gap-1 text-sm text-gray-400 hover:text-white disabled:opacity-30 transition-all">
                <ChevronLeft className="w-4 h-4" />Précédent
              </button>
              <span className="text-gray-500 text-sm">Page {page} / {Math.ceil(total / PAGE_SIZE)}</span>
              <button onClick={() => setPage(p => p + 1)} disabled={page >= Math.ceil(total / PAGE_SIZE)}
                className="flex items-center gap-1 text-sm text-gray-400 hover:text-white disabled:opacity-30 transition-all">
                Suivant<ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </Card>
      )}

      {/* Message drawer */}
      {activeThread && (
        <>
          <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" onClick={() => setActiveThread(null)} />
          <MessageDrawer threadUid={activeThread.uid} guestName={activeThread.guest} onClose={() => setActiveThread(null)} />
        </>
      )}
    </div>
  )
}
