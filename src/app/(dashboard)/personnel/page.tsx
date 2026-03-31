'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import {
  Plus, Trash2, Edit2, Phone, Mail, Home, Briefcase, User,
  ClipboardList, Copy, Check, X, Link, Upload, Image as ImageIcon,
} from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Badge } from '@/components/ui/Badge'
import { LoadingPage } from '@/components/ui/LoadingSpinner'
import { EmptyState } from '@/components/ui/EmptyState'

interface StaffMember {
  id: number
  name: string
  phone: string | null
  email: string | null
  role: string
  notes: string | null
  properties: { id: number; name: string; city: string }[]
}

interface CheckItem { id: string; label: string; isDefault?: boolean }
interface CleaningSheet {
  id: number
  propertyId: number
  propertyName: string
  propertyAddress: string | null
  propertyCity: string | null
  staffName: string | null
  staffPhone: string | null
  instructions: string
  checklist: CheckItem[]
  mediaUrls: string[]
  shareToken: string
}

const ROLES = [
  { value: 'ménage', label: 'Femme / Homme de ménage' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'accueil', label: 'Accueil / Check-in' },
  { value: 'autre', label: 'Autre' },
]
const ROLE_COLORS: Record<string, string> = {
  ménage: 'info', maintenance: 'warning', accueil: 'success', autre: 'default',
}
const EMPTY_FORM = { name: '', phone: '', email: '', role: 'ménage', notes: '' }
const VIDEO_EXTS = ['mp4', 'mov', 'avi', 'webm']
function isVideo(url: string) { return VIDEO_EXTS.includes(url.split('.').pop()?.toLowerCase() ?? '') }

// ─── Fiche Ménage Editor ──────────────────────────────────────────────────────

function FicheEditor({ sheet, onClose }: { sheet: CleaningSheet; onClose: () => void }) {
  const [instructions, setInstructions] = useState(sheet.instructions)
  const [checklist, setChecklist]       = useState<CheckItem[]>(sheet.checklist)
  const [mediaUrls, setMediaUrls]       = useState<string[]>(sheet.mediaUrls)
  const [newTask, setNewTask]           = useState('')
  const [saving, setSaving]             = useState(false)
  const [uploading, setUploading]       = useState(false)
  const [uploadError, setUploadError]   = useState<string | null>(null)
  const [copied, setCopied]             = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const shareUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/fiche/${sheet.shareToken}`
    : `/fiche/${sheet.shareToken}`

  const copyLink = () => {
    navigator.clipboard.writeText(shareUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const save = async () => {
    setSaving(true)
    await fetch(`/api/cleaning-sheets/${sheet.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ instructions, checklist, mediaUrls }),
    })
    setSaving(false)
  }

  const addTask = () => {
    if (!newTask.trim()) return
    setChecklist(prev => [...prev, { id: `custom-${Date.now()}`, label: newTask.trim() }])
    setNewTask('')
  }

  const removeTask = (id: string) => setChecklist(prev => prev.filter(t => t.id !== id))

  const uploadFile = async (file: File) => {
    setUploading(true)
    setUploadError(null)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch(`/api/cleaning-sheets/${sheet.id}`, { method: 'POST', body: fd })
      const data = await res.json()
      if (data.url) setMediaUrls(prev => [...prev, data.url])
      else setUploadError(data.error ?? 'Erreur lors de l\'upload')
    } catch {
      setUploadError('Erreur réseau')
    } finally {
      setUploading(false)
    }
  }

  const removeMedia = async (url: string) => {
    setMediaUrls(prev => prev.filter(u => u !== url))
    await fetch(`/api/cleaning-sheets/${sheet.id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-xl h-screen overflow-y-auto flex flex-col"
        style={{ background: '#161616', borderLeft: '1px solid rgba(255,255,255,0.07)', boxShadow: '-8px 0 32px rgba(0,0,0,0.5)' }}>

        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-4 border-b border-white/[0.07]"
          style={{ background: '#161616' }}>
          <div>
            <p className="text-white font-semibold">{sheet.propertyName}</p>
            <p className="text-gray-500 text-xs mt-0.5">Fiche de ménage</p>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" isLoading={saving} onClick={save}>Enregistrer</Button>
            <button onClick={onClose} className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/[0.06] transition-all">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 px-5 py-5 space-y-6">

          {/* Lien de partage */}
          <div>
            <p className="text-gray-400 text-xs font-medium uppercase tracking-wider mb-2">Lien prestataire</p>
            <div className="flex items-center gap-2 bg-[#1a1a1a] border border-[#2e2e2e] rounded-xl px-3 py-2.5">
              <Link className="w-4 h-4 text-gray-500 flex-shrink-0" />
              <p className="text-gray-400 text-xs truncate flex-1">{shareUrl}</p>
              <button onClick={copyLink}
                className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-lg font-medium transition-all flex-shrink-0 ${
                  copied ? 'bg-emerald-500/20 text-emerald-400' : 'bg-[#D4AF37]/10 text-[#D4AF37] hover:bg-[#D4AF37]/20'
                }`}>
                {copied ? <><Check className="w-3.5 h-3.5" />Copié</> : <><Copy className="w-3.5 h-3.5" />Copier</>}
              </button>
            </div>
            <p className="text-gray-600 text-xs mt-1.5">Envoyez ce lien par SMS ou WhatsApp au prestataire.</p>
          </div>

          {/* Consignes */}
          <div>
            <p className="text-gray-400 text-xs font-medium uppercase tracking-wider mb-2">Consignes spéciales</p>
            <textarea
              value={instructions}
              onChange={e => setInstructions(e.target.value)}
              rows={4}
              placeholder="Codes d'accès, points d'attention particuliers, localisation des produits ménagers..."
              className="w-full bg-[#1b1b1b] border border-[#2e2e2e] rounded-xl px-3 py-2.5 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-[#D4AF37]/50 resize-none"
            />
          </div>

          {/* Checklist */}
          <div>
            <p className="text-gray-400 text-xs font-medium uppercase tracking-wider mb-2">Checklist ({checklist.length} tâches)</p>
            <div className="space-y-1.5 mb-3">
              {checklist.map(task => (
                <div key={task.id} className="flex items-center gap-2 bg-[#1a1a1a] border border-[#2e2e2e] rounded-xl px-3 py-2.5 group">
                  <div className="w-4 h-4 rounded border border-white/20 flex-shrink-0" />
                  <span className="text-gray-300 text-sm flex-1">{task.label}</span>
                  {!task.isDefault && (
                    <button onClick={() => removeTask(task.id)}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded-lg text-gray-600 hover:text-red-400 transition-all">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            {/* Ajouter tâche */}
            <div className="flex gap-2">
              <input
                value={newTask}
                onChange={e => setNewTask(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addTask()}
                placeholder="Ajouter une tâche personnalisée..."
                className="flex-1 bg-[#1b1b1b] border border-[#2e2e2e] rounded-xl px-3 py-2 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-[#D4AF37]/50"
              />
              <Button size="sm" variant="ghost" onClick={addTask}><Plus className="w-4 h-4" /></Button>
            </div>
          </div>

          {/* Photos / vidéos */}
          <div>
            <p className="text-gray-400 text-xs font-medium uppercase tracking-wider mb-2">Photos & vidéos de référence</p>
            <input ref={fileRef} type="file" accept="image/*,video/*" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) uploadFile(f); e.target.value = '' }} />
            {uploadError && <p className="text-red-400 text-xs mb-2">{uploadError}</p>}
            {mediaUrls.length > 0 && (
              <div className="grid grid-cols-3 gap-2 mb-3">
                {mediaUrls.map((url, i) => (
                  <div key={i} className="relative group aspect-square">
                    {isVideo(url) ? (
                      <video src={url} className="w-full h-full object-cover rounded-xl" />
                    ) : (
                      <img src={url} alt="" className="w-full h-full object-cover rounded-xl" />
                    )}
                    <button
                      onClick={() => removeMedia(url)}
                      className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 bg-black/70 text-white p-1 rounded-full transition-all">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-[#2e2e2e] rounded-xl py-6 text-gray-500 hover:border-[#D4AF37]/40 hover:text-[#D4AF37] transition-all text-sm">
              {uploading ? (
                <div className="w-4 h-4 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin" />
              ) : (
                <><Upload className="w-4 h-4" />Ajouter une photo ou vidéo</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function PersonnelPage() {
  const [tab, setTab]             = useState<'equipe' | 'menage'>('equipe')
  const [staff, setStaff]         = useState<StaffMember[]>([])
  const [sheets, setSheets]       = useState<CleaningSheet[]>([])
  const [loading, setLoading]     = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editing, setEditing]     = useState<StaffMember | null>(null)
  const [form, setForm]           = useState(EMPTY_FORM)
  const [saving, setSaving]       = useState(false)
  const [error, setError]         = useState('')
  const [activeSheet, setActiveSheet] = useState<CleaningSheet | null>(null)

  const load = useCallback(async () => {
    try {
      const [staffRes, sheetsRes] = await Promise.all([
        fetch('/api/staff'),
        fetch('/api/cleaning-sheets'),
      ])
      const staffData  = await staffRes.json()
      const sheetsData = await sheetsRes.json()
      setStaff(Array.isArray(staffData) ? staffData : [])
      setSheets(Array.isArray(sheetsData) ? sheetsData : [])
    } catch { setStaff([]) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const openCreate = () => { setEditing(null); setForm(EMPTY_FORM); setError(''); setIsModalOpen(true) }
  const openEdit = (m: StaffMember) => {
    setEditing(m)
    setForm({ name: m.name, phone: m.phone ?? '', email: m.email ?? '', role: m.role, notes: m.notes ?? '' })
    setError('')
    setIsModalOpen(true)
  }

  const handleSave = async () => {
    if (!form.name.trim()) { setError('Le nom est obligatoire'); return }
    setSaving(true); setError('')
    try {
      const url    = editing ? `/api/staff/${editing.id}` : '/api/staff'
      const method = editing ? 'PUT' : 'POST'
      const res    = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      if (!res.ok) { const d = await res.json(); setError(d.error || 'Erreur'); return }
      await load()
      setIsModalOpen(false)
    } catch { setError('Erreur de connexion') }
    finally { setSaving(false) }
  }

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Supprimer ${name} ? Les logements associés seront désassignés.`)) return
    await fetch(`/api/staff/${id}`, { method: 'DELETE' })
    await load()
  }

  const openFiche = async (propertyId: number) => {
    // Create sheet if doesn't exist
    let existing = sheets.find(s => s.propertyId === propertyId)
    if (!existing) {
      const res = await fetch('/api/cleaning-sheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ propertyId }),
      })
      if (res.ok) {
        existing = await res.json()
        setSheets(prev => [existing!, ...prev])
      }
    }
    if (existing) setActiveSheet(existing)
  }

  const menageStaff = staff.filter(m => m.role === 'ménage')

  if (loading) return <LoadingPage />

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Personnel</h1>
          <p className="text-gray-400 mt-1">
            <span className="text-[#D4AF37] font-semibold">{staff.length}</span> membre{staff.length !== 1 ? 's' : ''} dans l&apos;équipe terrain
          </p>
        </div>
        <Button onClick={openCreate}><Plus className="w-4 h-4" />Ajouter</Button>
      </div>

      {/* Tabs */}
      <div className="flex items-center bg-[#1a1a1a] border border-[#2e2e2e] rounded-xl p-1 w-fit">
        {([['equipe', 'Équipe'], ['menage', 'Ménage']] as const).map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === key ? 'bg-[#D4AF37] text-black' : 'text-gray-400 hover:text-white'}`}>
            {label}
            {key === 'menage' && menageStaff.length > 0 && (
              <span className={`ml-2 text-xs px-1.5 py-0.5 rounded-full ${tab === key ? 'bg-black/20' : 'bg-white/10'}`}>
                {menageStaff.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {tab === 'equipe' ? (
        <>
          {/* Stats */}
          {staff.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {ROLES.map(r => {
                const count = staff.filter(m => m.role === r.value).length
                return count > 0 ? (
                  <Card key={r.value} padding="sm" className="text-center">
                    <p className="text-gray-400 text-xs mb-1 capitalize">{r.label}</p>
                    <p className="text-white font-bold text-2xl">{count}</p>
                  </Card>
                ) : null
              })}
              <Card padding="sm" className="text-center">
                <p className="text-gray-400 text-xs mb-1">Logements couverts</p>
                <p className="text-[#D4AF37] font-bold text-2xl">
                  {new Set(staff.flatMap(m => m.properties.map(p => p.id))).size}
                </p>
              </Card>
            </div>
          )}

          {staff.length === 0 ? (
            <EmptyState icon={Briefcase} title="Aucun membre du personnel"
              description="Ajoutez votre premier membre pour l'associer aux logements."
              actionLabel="Ajouter un membre" onAction={openCreate} />
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
              {staff.map(member => (
                <Card key={member.id} className="flex flex-col gap-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[#D4AF37]/10 flex items-center justify-center flex-shrink-0">
                        <User className="w-5 h-5 text-[#D4AF37]" />
                      </div>
                      <div>
                        <p className="text-white font-semibold">{member.name}</p>
                        <Badge variant={(ROLE_COLORS[member.role] ?? 'default') as 'info' | 'warning' | 'success' | 'default'} className="mt-0.5">
                          {ROLES.find(r => r.value === member.role)?.label ?? member.role}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => openEdit(member)} className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-white/[0.06] transition-all">
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleDelete(member.id, member.name)} className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-all">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    {member.phone && (
                      <a href={`tel:${member.phone}`} className="flex items-center gap-2 text-sm text-gray-300 hover:text-white transition-colors group">
                        <Phone className="w-3.5 h-3.5 text-gray-500 group-hover:text-[#D4AF37]" />{member.phone}
                      </a>
                    )}
                    {member.email && (
                      <a href={`mailto:${member.email}`} className="flex items-center gap-2 text-sm text-gray-300 hover:text-white transition-colors group">
                        <Mail className="w-3.5 h-3.5 text-gray-500 group-hover:text-[#D4AF37]" />{member.email}
                      </a>
                    )}
                  </div>
                  {member.notes && <p className="text-gray-500 text-xs border-t border-white/[0.05] pt-3">{member.notes}</p>}
                  <div className="border-t border-white/[0.05] pt-3">
                    <p className="text-gray-500 text-xs mb-2 flex items-center gap-1.5">
                      <Home className="w-3 h-3" />
                      {member.properties.length > 0 ? `${member.properties.length} logement${member.properties.length > 1 ? 's' : ''} assigné${member.properties.length > 1 ? 's' : ''}` : 'Aucun logement assigné'}
                    </p>
                    {member.properties.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {member.properties.map(p => (
                          <span key={p.id} className="text-xs px-2 py-0.5 rounded-lg bg-white/[0.05] text-gray-300 border border-white/[0.06]">{p.name}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </>
      ) : (
        /* ─── Ménage tab ─── */
        <>
          {menageStaff.length === 0 ? (
            <EmptyState icon={ClipboardList} title="Aucun prestataire de ménage"
              description="Ajoutez un membre avec le rôle 'Femme / Homme de ménage'."
              actionLabel="Ajouter" onAction={openCreate} />
          ) : (
            <div className="space-y-6">
              {menageStaff.map(member => (
                <div key={member.id}>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 rounded-xl bg-blue-500/10 flex items-center justify-center">
                      <User className="w-4 h-4 text-blue-400" />
                    </div>
                    <div>
                      <p className="text-white font-semibold">{member.name}</p>
                      {member.phone && <p className="text-gray-500 text-xs">{member.phone}</p>}
                    </div>
                  </div>

                  {member.properties.length === 0 ? (
                    <p className="text-gray-600 text-sm pl-11">Aucun logement assigné à ce prestataire.</p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pl-0">
                      {member.properties.map(prop => {
                        const sheet = sheets.find(s => s.propertyId === prop.id)
                        return (
                          <button key={prop.id} onClick={() => openFiche(prop.id)}
                            className="text-left bg-[#1a1a1a] border border-[#2e2e2e] hover:border-[#D4AF37]/30 rounded-2xl p-4 transition-all group">
                            <div className="flex items-start justify-between mb-2">
                              <p className="text-white font-medium text-sm">{prop.name}</p>
                              <div className={`w-2 h-2 rounded-full mt-1 ${sheet ? 'bg-emerald-500' : 'bg-gray-600'}`}
                                title={sheet ? 'Fiche créée' : 'Pas encore de fiche'} />
                            </div>
                            <p className="text-gray-500 text-xs">{prop.city}</p>
                            <div className="flex items-center gap-1.5 mt-3 text-xs text-[#D4AF37] group-hover:text-[#D4AF37] opacity-60 group-hover:opacity-100 transition-opacity">
                              <ClipboardList className="w-3.5 h-3.5" />
                              {sheet ? 'Voir / modifier la fiche' : 'Créer la fiche de ménage'}
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Staff modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}
        title={editing ? 'Modifier le membre' : 'Ajouter un membre'}>
        <div className="space-y-4">
          <Input label="Nom *" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Marie Dupont" />
          <Select label="Rôle" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
            {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
          </Select>
          <Input label="Téléphone" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="06 XX XX XX XX" />
          <Input label="Email" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="marie@exemple.fr" />
          <div>
            <label className="block text-sm text-gray-400 mb-1.5">Notes</label>
            <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={3}
              placeholder="Disponibilités, remarques..."
              className="w-full bg-[#1b1b1b] border border-[#2e2e2e] rounded-xl px-3 py-2.5 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-[#D4AF37]/50 resize-none" />
          </div>
          {error && <p className="text-red-400 text-sm bg-red-400/10 px-3 py-2 rounded-lg">{error}</p>}
          <div className="flex gap-3 justify-end">
            <Button variant="ghost" onClick={() => setIsModalOpen(false)}>Annuler</Button>
            <Button isLoading={saving} onClick={handleSave}>{editing ? 'Enregistrer' : 'Ajouter'}</Button>
          </div>
        </div>
      </Modal>

      {/* Fiche ménage editor */}
      {activeSheet && (
        <FicheEditor sheet={activeSheet} onClose={() => { setActiveSheet(null); load() }} />
      )}
    </div>
  )
}
