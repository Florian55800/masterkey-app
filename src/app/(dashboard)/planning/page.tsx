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

const LODGIFY_PROPERTIES: Record<number, string> = {
  690597: 'T2 Commercy',
  690679: 'Studio Rochelle',
  694500: 'T2 Pompidou Metz',
  702625: 'Studio Ligny',
  702626: 'T2 Cosy Ligny',
  705470: 'Studio Nancy Rives',
  745678: 'T2 Bar-le-Duc',
  783021: 'T4 Stanislas',
  783678: 'Studio Saint-Dizier',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SOURCE_META: Record<string, { label: string; color: string; bg: string; border: string }> = {
  Airbnb:     { label: 'Airbnb',      color: 'text-rose-400',   bg: 'bg-rose-500/10',   border: 'border-rose-500/20' },
  BookingCom: { label: 'Booking.com', color: 'text-blue-400',   bg: 'bg-blue-500/10',   border: 'border-blue-500/20' },
  Lodgify:    { label: 'Direct',      color: 'text-[#D4AF37]',  bg: 'bg-[#D4AF37]/10',  border: 'border-[#D4AF37]/20' },
  Direct:     { label: 'Direct',      color: 'text-[#D4AF37]',  bg: 'bg-[#D4AF37]/10',  border: 'border-[#D4AF37]/20' },
}
function sourceMeta(s: string) {
  return SOURCE_META[s] ?? { label: s, color: 'text-gray-400', bg: 'bg-gray-500/10', border: 'border-gray-500/20' }
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

// ─── Calendar view ────────────────────────────────────────────────────────────

function CalendarView({ bookings }: { bookings: Booking[] }) {
  const today = new Date()
  const [year,  setYear]  = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())   // 0-based

  const prev = () => { if (month === 0) { setMonth(11); setYear(y => y - 1) } else setMonth(m => m - 1) }
  const next = () => { if (month === 11) { setMonth(0); setYear(y => y + 1) } else setMonth(m => m + 1) }

  const firstDay   = new Date(year, month, 1).getDay()   // 0=Sun
  const startOffset = (firstDay + 6) % 7                 // Mon-based
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  // Which bookings overlap this month?
  const monthStart = new Date(year, month, 1)
  const monthEnd   = new Date(year, month + 1, 0)

  const relevant = bookings.filter(b => {
    if (['Declined','Cancelled','Canceled'].includes(b.status)) return false
    const arr = new Date(b.arrival); const dep = new Date(b.departure)
    return arr <= monthEnd && dep >= monthStart
  })

  function bookingsOnDay(day: number) {
    const d = new Date(year, month, day)
    return relevant.filter(b => {
      const arr = new Date(b.arrival); const dep = new Date(b.departure)
      // arrival day counts, departure day does NOT (checkout day)
      return d >= arr && d < dep
    })
  }

  const cells = Array.from({ length: startOffset + daysInMonth }, (_, i) =>
    i < startOffset ? null : i - startOffset + 1
  )

  return (
    <Card>
      {/* Month nav */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={prev} className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/[0.06] transition-all">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <h3 className="text-white font-semibold">{MONTHS_FR[month]} {year}</h3>
        <button onClick={next} className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/[0.06] transition-all">
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 mb-2">
        {['Lun','Mar','Mer','Jeu','Ven','Sam','Dim'].map(d => (
          <div key={d} className="text-center text-gray-600 text-xs font-medium py-1">{d}</div>
        ))}
      </div>

      {/* Days */}
      <div className="grid grid-cols-7 gap-0.5">
        {cells.map((day, i) => {
          if (!day) return <div key={`empty-${i}`} />
          const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear()
          const bks = bookingsOnDay(day)
          return (
            <div key={day} className={`min-h-[64px] rounded-xl p-1 border transition-colors ${
              isToday ? 'border-[#D4AF37]/40 bg-[#D4AF37]/05' : 'border-transparent hover:border-white/[0.06]'
            }`}>
              <span className={`text-xs font-medium block text-center mb-1 ${isToday ? 'text-[#D4AF37]' : 'text-gray-400'}`}>
                {day}
              </span>
              <div className="space-y-0.5">
                {bks.slice(0, 2).map(b => {
                  const sm = sourceMeta(b.source)
                  const isArrival = new Date(b.arrival).getDate() === day &&
                    new Date(b.arrival).getMonth() === month &&
                    new Date(b.arrival).getFullYear() === year
                  return (
                    <div key={b.id} className={`text-[10px] px-1 py-0.5 rounded truncate ${sm.bg} ${sm.color} ${isArrival ? 'font-semibold' : 'opacity-70'}`}
                      title={`${b.guest.name} — ${LODGIFY_PROPERTIES[b.property_id] ?? b.property_id}`}>
                      {isArrival ? '→ ' : ''}{b.guest.name.split(' ')[0]}
                    </div>
                  )
                })}
                {bks.length > 2 && <div className="text-[10px] text-gray-500 text-center">+{bks.length - 2}</div>}
              </div>
            </div>
          )
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-4 pt-3 border-t border-white/[0.05]">
        {Object.entries(SOURCE_META).map(([key, sm]) => (
          <div key={key} className="flex items-center gap-1.5">
            <div className={`w-2.5 h-2.5 rounded-full ${sm.bg} ${sm.color} border ${sm.border}`} />
            <span className="text-gray-500 text-xs">{sm.label}</span>
          </div>
        ))}
      </div>
    </Card>
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
  const [payoutMap,  setPayoutMap]  = useState<Record<number, { commissionRate: number; cleaningFee: number; name: string }>>({})
  const PAGE_SIZE = 50

  // Load payout map once
  useEffect(() => {
    fetch('/api/lodgify/payout-map').then(r => r.json()).then(data => {
      if (data && typeof data === 'object' && !data.error) setPayoutMap(data)
    }).catch(() => {})
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

  // Filters applied client-side
  const displayed = bookings.filter(b => {
    if (srcFilter !== 'tous' && b.source !== srcFilter) return false
    if (statusFilter !== 'tous' && b.status !== statusFilter) return false
    return true
  })

  // Stats
  const confirmed  = bookings.filter(b => b.status === 'Confirmed').length
  const totalRev   = bookings.filter(b => b.status === 'Confirmed').reduce((s, b) => s + b.subtotals.stay, 0)
  const totalNights = bookings.filter(b => b.status === 'Confirmed').reduce((s, b) => s + nights(b.arrival, b.departure), 0)

  const allSources = Array.from(new Set(bookings.map(b => b.source)))
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
        <CalendarView bookings={displayed} />
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
