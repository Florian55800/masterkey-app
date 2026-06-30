'use client'

import { useEffect, useState } from 'react'
import { Check, MapPin, Clock, LogOut, LogIn, Key, ChevronDown, ChevronUp, Camera } from 'lucide-react'

interface CheckItem { id: string; label: string }
interface CustomSection { title: string; content: string }

interface Sheet {
  id: number
  propertyName: string
  propertyAddress: string
  propertyCity: string
  propertyPhoto: string | null
  accessCode: string | null
  checkoutTime: string | null
  nextCheckinTime: string | null
  instructions: string | null
  checklist: CheckItem[]
  customSections: CustomSection[]
  mediaUrls: string[]
}

const VIDEO_EXTS = ['mp4', 'mov', 'avi', 'webm']
const isVideo = (url: string) => VIDEO_EXTS.includes(url.split('.').pop()?.toLowerCase() ?? '')

export default function FicheMenagePage({ params }: { params: { token: string } }) {
  const [sheet, setSheet] = useState<Sheet | null>(null)
  const [loading, setLoading] = useState(true)
  const [checks, setChecks] = useState<Record<string, boolean>>({})
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({ instructions: true })
  const [expandedPhoto, setExpandedPhoto] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/cleaning-sheets/${params.token}`)
      .then(r => r.json())
      .then(data => { setSheet(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [params.token])

  const toggle = (id: string) => setChecks(prev => ({ ...prev, [id]: !prev[id] }))
  const toggleSection = (key: string) => setOpenSections(prev => ({ ...prev, [key]: !prev[key] }))

  const done  = sheet ? sheet.checklist.filter(t => checks[t.id]).length : 0
  const total = sheet?.checklist.length ?? 0
  const pct   = total > 0 ? Math.round((done / total) * 100) : 0
  const allDone = pct === 100 && total > 0

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#0c0c0c' }}>
      <div className="w-8 h-8 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (!sheet || (sheet as any).error) return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: '#0c0c0c' }}>
      <div className="text-center">
        <p className="text-5xl mb-4">🔗</p>
        <p className="text-white font-bold text-lg">Fiche introuvable</p>
        <p className="text-white/40 text-sm mt-2">Ce lien n&apos;est pas valide ou a été supprimé.</p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen pb-24" style={{ background: '#0c0c0c' }}>

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <div className="relative h-52 overflow-hidden" style={{ background: 'linear-gradient(135deg, #1a1a1a 0%, #111 100%)' }}>
        {sheet.propertyPhoto && (
          <img src={sheet.propertyPhoto} alt="" className="absolute inset-0 w-full h-full object-cover opacity-50" />
        )}
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, #0c0c0c 0%, rgba(12,12,12,0.4) 60%, transparent 100%)' }} />
        <div className="absolute bottom-0 left-0 right-0 px-5 pb-5">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full mb-3 text-xs font-bold"
            style={{ background: 'rgba(212,175,55,0.2)', color: '#D4AF37', border: '1px solid rgba(212,175,55,0.35)' }}>
            🧹 FICHE DE MÉNAGE
          </div>
          <h1 className="text-white text-2xl font-bold leading-tight">{sheet.propertyName}</h1>
          {(sheet.propertyAddress || sheet.propertyCity) && (
            <p className="text-white/50 text-sm flex items-center gap-1.5 mt-1">
              <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
              {[sheet.propertyAddress, sheet.propertyCity].filter(Boolean).join(', ')}
            </p>
          )}
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-5 space-y-3">

        {/* ── Infos rapides ─────────────────────────────────────────────── */}
        {(sheet.accessCode || sheet.checkoutTime || sheet.nextCheckinTime) && (
          <div className="grid gap-2" style={{
            gridTemplateColumns: [sheet.checkoutTime, sheet.nextCheckinTime, sheet.accessCode].filter(Boolean).length === 1
              ? '1fr' : [sheet.checkoutTime, sheet.nextCheckinTime, sheet.accessCode].filter(Boolean).length === 2
              ? '1fr 1fr' : '1fr 1fr 1fr'
          }}>
            {sheet.checkoutTime && (
              <div className="rounded-2xl p-3 text-center" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)' }}>
                <div className="flex items-center justify-center gap-1 mb-1">
                  <LogOut className="w-3.5 h-3.5 text-red-400" />
                  <span className="text-red-400 text-[10px] font-semibold uppercase tracking-wider">Départ</span>
                </div>
                <p className="text-white font-bold text-lg leading-none">{sheet.checkoutTime}</p>
              </div>
            )}
            {sheet.nextCheckinTime && (
              <div className="rounded-2xl p-3 text-center" style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.15)' }}>
                <div className="flex items-center justify-center gap-1 mb-1">
                  <LogIn className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400 text-[10px] font-semibold uppercase tracking-wider">Arrivée</span>
                </div>
                <p className="text-white font-bold text-lg leading-none">{sheet.nextCheckinTime}</p>
              </div>
            )}
            {sheet.accessCode && (
              <div className="rounded-2xl p-3 text-center" style={{ background: 'rgba(212,175,55,0.08)', border: '1px solid rgba(212,175,55,0.18)' }}>
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Key className="w-3.5 h-3.5 text-[#D4AF37]" />
                  <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: '#D4AF37' }}>Accès</span>
                </div>
                <p className="text-white font-bold text-lg leading-none tracking-widest">{sheet.accessCode}</p>
              </div>
            )}
          </div>
        )}

        {/* ── Progression ──────────────────────────────────────────────── */}
        <div className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-white font-semibold text-sm">Progression</p>
              <p className="text-white/40 text-xs mt-0.5">{done}/{total} tâches</p>
            </div>
            <div className="relative w-14 h-14 flex-shrink-0">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 56 56">
                <circle cx="28" cy="28" r="22" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="5" />
                <circle cx="28" cy="28" r="22" fill="none"
                  stroke={allDone ? '#22c55e' : '#D4AF37'} strokeWidth="5"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 22}`}
                  strokeDashoffset={`${2 * Math.PI * 22 * (1 - pct / 100)}`}
                  style={{ transition: 'stroke-dashoffset 0.5s ease, stroke 0.3s' }}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className={`text-sm font-bold ${allDone ? 'text-emerald-400' : 'text-[#D4AF37]'}`}>{pct}%</span>
              </div>
            </div>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
            <div className="h-full rounded-full transition-all duration-500"
              style={{ width: `${pct}%`, background: allDone ? '#22c55e' : '#D4AF37' }} />
          </div>
          {allDone && (
            <p className="text-emerald-400 text-sm font-semibold text-center mt-3">✅ Ménage terminé — merci !</p>
          )}
        </div>

        {/* ── Instructions générales ────────────────────────────────────── */}
        {sheet.instructions && (
          <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <button onClick={() => toggleSection('instructions')}
              className="w-full flex items-center justify-between px-4 py-3.5 text-left">
              <div className="flex items-center gap-2">
                <span className="text-base">📋</span>
                <p className="text-white font-semibold text-sm">Consignes</p>
              </div>
              {openSections['instructions']
                ? <ChevronUp className="w-4 h-4 text-white/30" />
                : <ChevronDown className="w-4 h-4 text-white/30" />}
            </button>
            {openSections['instructions'] && (
              <div className="px-4 pb-4 pt-1">
                <div className="h-px mb-3" style={{ background: 'rgba(255,255,255,0.05)' }} />
                <p className="text-white/70 text-sm leading-relaxed whitespace-pre-wrap">{sheet.instructions}</p>
              </div>
            )}
          </div>
        )}

        {/* ── Sections personnalisées ───────────────────────────────────── */}
        {sheet.customSections.map((sec, i) => (
          <div key={i} className="rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <button onClick={() => toggleSection(`sec-${i}`)}
              className="w-full flex items-center justify-between px-4 py-3.5 text-left">
              <div className="flex items-center gap-2">
                <span className="text-base">📌</span>
                <p className="text-white font-semibold text-sm">{sec.title || 'Section'}</p>
              </div>
              {openSections[`sec-${i}`] !== false
                ? <ChevronUp className="w-4 h-4 text-white/30" />
                : <ChevronDown className="w-4 h-4 text-white/30" />}
            </button>
            {openSections[`sec-${i}`] !== false && (
              <div className="px-4 pb-4 pt-1">
                <div className="h-px mb-3" style={{ background: 'rgba(255,255,255,0.05)' }} />
                <p className="text-white/70 text-sm leading-relaxed whitespace-pre-wrap">{sec.content}</p>
              </div>
            )}
          </div>
        ))}

        {/* ── Checklist ────────────────────────────────────────────────── */}
        {sheet.checklist.length > 0 && (
          <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <div className="flex items-center gap-2 px-4 py-3.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <span className="text-base">✅</span>
              <p className="text-white font-semibold text-sm">Checklist</p>
              <span className="ml-auto text-xs font-medium px-2 py-0.5 rounded-full"
                style={{ background: allDone ? 'rgba(34,197,94,0.15)' : 'rgba(212,175,55,0.12)', color: allDone ? '#22c55e' : '#D4AF37' }}>
                {done}/{total}
              </span>
            </div>
            <div>
              {sheet.checklist.map((task, idx) => {
                const checked = !!checks[task.id]
                return (
                  <button key={task.id} onClick={() => toggle(task.id)}
                    className="w-full flex items-center gap-3.5 px-4 text-left transition-all"
                    style={{
                      minHeight: '56px',
                      background: checked ? 'rgba(34,197,94,0.05)' : 'transparent',
                      borderTop: idx > 0 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                    }}>
                    <div className="w-6 h-6 rounded-lg flex-shrink-0 flex items-center justify-center transition-all"
                      style={{
                        background: checked ? '#22c55e' : 'transparent',
                        border: checked ? '2px solid #22c55e' : '2px solid rgba(255,255,255,0.2)',
                      }}>
                      {checked && <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />}
                    </div>
                    <span className="text-sm py-3 leading-snug flex-1"
                      style={{ color: checked ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.85)', textDecoration: checked ? 'line-through' : 'none' }}>
                      {task.label}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* ── Photos & vidéos de référence ─────────────────────────────── */}
        {sheet.mediaUrls.length > 0 && (
          <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <div className="flex items-center gap-2 px-4 py-3.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <Camera className="w-4 h-4 text-white/50" />
              <p className="text-white font-semibold text-sm">Photos & vidéos de référence</p>
            </div>
            <div className="p-3 grid grid-cols-2 gap-2">
              {sheet.mediaUrls.map((url, i) =>
                isVideo(url) ? (
                  <video key={i} src={url} controls className="w-full rounded-xl aspect-video object-cover" />
                ) : (
                  <button key={i} onClick={() => setExpandedPhoto(url)} className="block">
                    <img src={url} alt="" className="w-full rounded-xl aspect-square object-cover hover:opacity-80 transition-opacity" />
                  </button>
                )
              )}
            </div>
          </div>
        )}

        <p className="text-center text-white/15 text-xs pb-4 pt-2">MasterKey Conciergerie</p>
      </div>

      {/* ── Lightbox photo ────────────────────────────────────────────────── */}
      {expandedPhoto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.92)' }}
          onClick={() => setExpandedPhoto(null)}>
          <img src={expandedPhoto} alt="" className="max-w-full max-h-full rounded-2xl object-contain" />
        </div>
      )}
    </div>
  )
}
