'use client'

import { useEffect, useState } from 'react'
import { Check, MapPin, Phone, ChevronDown, ChevronUp } from 'lucide-react'

interface CheckItem { id: string; label: string }
interface Sheet {
  id: number
  propertyId: number
  propertyName: string
  propertyAddress: string
  propertyCity: string
  propertyPhoto: string | null
  staffName: string | null
  staffPhone: string | null
  instructions: string
  checklist: CheckItem[]
  mediaUrls: string[]
}

const VIDEO_EXTS = ['mp4', 'mov', 'avi', 'webm']

function isVideo(url: string) {
  const ext = url.split('.').pop()?.toLowerCase() ?? ''
  return VIDEO_EXTS.includes(ext)
}

export default function FicheMenagePage({ params }: { params: { token: string } }) {
  const [sheet, setSheet] = useState<Sheet | null>(null)
  const [loading, setLoading] = useState(true)
  const [checks, setChecks] = useState<Record<string, boolean>>({})
  const [showInstructions, setShowInstructions] = useState(true)

  useEffect(() => {
    fetch(`/api/cleaning-sheets/${params.token}`)
      .then(r => r.json())
      .then(data => { setSheet(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [params.token])

  const toggle = (id: string) => setChecks(prev => ({ ...prev, [id]: !prev[id] }))

  const done = sheet ? sheet.checklist.filter(t => checks[t.id]).length : 0
  const total = sheet?.checklist.length ?? 0
  const pct = total > 0 ? Math.round((done / total) * 100) : 0

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!sheet || (sheet as any).error) {
    return (
      <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-4xl mb-4">🔗</p>
          <p className="text-white font-semibold text-lg">Fiche introuvable</p>
          <p className="text-gray-500 text-sm mt-2">Ce lien n'est pas valide ou a été supprimé.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0f0f0f] pb-20">
      {/* Header photo */}
      <div className="relative h-48 bg-gradient-to-br from-[#1a1a1a] to-[#111]">
        {sheet.propertyPhoto ? (
          <img src={sheet.propertyPhoto} alt={sheet.propertyName} className="w-full h-full object-cover opacity-60" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-6xl opacity-30">🏠</span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0f0f0f] via-transparent" />
        <div className="absolute bottom-4 left-4 right-4">
          <div className="inline-block bg-[#D4AF37] text-black text-xs font-bold px-3 py-1 rounded-full mb-2">
            FICHE DE MÉNAGE
          </div>
          <h1 className="text-white text-xl font-bold">{sheet.propertyName}</h1>
          {(sheet.propertyAddress || sheet.propertyCity) && (
            <p className="text-gray-300 text-sm flex items-center gap-1 mt-0.5">
              <MapPin className="w-3 h-3" />{sheet.propertyAddress}{sheet.propertyCity ? `, ${sheet.propertyCity}` : ''}
            </p>
          )}
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-4 space-y-4">

        {/* Prestataire */}
        {sheet.staffName && (
          <div className="bg-[#1a1a1a] border border-[#2e2e2e] rounded-2xl px-4 py-3 flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-xs">Prestataire assigné</p>
              <p className="text-white font-semibold">{sheet.staffName}</p>
            </div>
            {sheet.staffPhone && (
              <a href={`tel:${sheet.staffPhone}`}
                className="flex items-center gap-2 bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/20 px-3 py-2 rounded-xl text-sm font-medium">
                <Phone className="w-4 h-4" />{sheet.staffPhone}
              </a>
            )}
          </div>
        )}

        {/* Progress */}
        <div className="bg-[#1a1a1a] border border-[#2e2e2e] rounded-2xl px-4 py-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-white font-semibold">Progression</p>
            <p className={`text-2xl font-bold ${pct === 100 ? 'text-emerald-400' : 'text-[#D4AF37]'}`}>{pct}%</p>
          </div>
          <div className="h-2.5 bg-white/[0.06] rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${pct === 100 ? 'bg-emerald-500' : 'bg-[#D4AF37]'}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="text-gray-500 text-xs mt-2">{done}/{total} tâches effectuées</p>
          {pct === 100 && (
            <p className="text-emerald-400 text-sm font-semibold mt-2 text-center">✅ Ménage terminé — merci !</p>
          )}
        </div>

        {/* Consignes */}
        {sheet.instructions && (
          <div className="bg-[#1a1a1a] border border-[#2e2e2e] rounded-2xl overflow-hidden">
            <button
              onClick={() => setShowInstructions(o => !o)}
              className="w-full flex items-center justify-between px-4 py-3 text-left"
            >
              <p className="text-white font-semibold text-sm">📋 Consignes spéciales</p>
              {showInstructions ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
            </button>
            {showInstructions && (
              <div className="px-4 pb-4">
                <p className="text-gray-300 text-sm whitespace-pre-wrap border-t border-white/[0.05] pt-3">{sheet.instructions}</p>
              </div>
            )}
          </div>
        )}

        {/* Checklist */}
        <div className="bg-[#1a1a1a] border border-[#2e2e2e] rounded-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-white/[0.05]">
            <p className="text-white font-semibold text-sm">✅ Checklist</p>
          </div>
          <div className="divide-y divide-white/[0.04]">
            {sheet.checklist.map(task => {
              const checked = !!checks[task.id]
              return (
                <button
                  key={task.id}
                  onClick={() => toggle(task.id)}
                  className={`w-full flex items-center gap-3 px-4 py-4 text-left transition-colors ${checked ? 'bg-emerald-500/5' : 'hover:bg-white/[0.02]'}`}
                >
                  <div className={`w-6 h-6 rounded-lg border-2 flex-shrink-0 flex items-center justify-center transition-all ${
                    checked ? 'bg-emerald-500 border-emerald-500' : 'border-white/20'
                  }`}>
                    {checked && <Check className="w-4 h-4 text-white" strokeWidth={3} />}
                  </div>
                  <span className={`text-sm leading-relaxed ${checked ? 'line-through text-gray-500' : 'text-gray-200'}`}>
                    {task.label}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Photos / vidéos de référence */}
        {sheet.mediaUrls.length > 0 && (
          <div className="bg-[#1a1a1a] border border-[#2e2e2e] rounded-2xl overflow-hidden">
            <div className="px-4 py-3 border-b border-white/[0.05]">
              <p className="text-white font-semibold text-sm">📸 Photos & vidéos de référence</p>
            </div>
            <div className="p-3 grid grid-cols-2 gap-2">
              {sheet.mediaUrls.map((url, i) => (
                isVideo(url) ? (
                  <video key={i} src={url} controls className="w-full rounded-xl aspect-video object-cover" />
                ) : (
                  <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                    <img src={url} alt={`media-${i}`} className="w-full rounded-xl aspect-square object-cover hover:opacity-80 transition-opacity" />
                  </a>
                )
              ))}
            </div>
          </div>
        )}

        <p className="text-center text-gray-600 text-xs pb-4">MasterKey Conciergerie</p>
      </div>
    </div>
  )
}
