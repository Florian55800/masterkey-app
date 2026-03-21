'use client'

import { useEffect, useState } from 'react'
import { Plus, Edit2, Trash2, ExternalLink, Phone, Mail, Search, Settings, X, GripVertical, Calendar, MapPin, CalendarDays } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { LoadingPage } from '@/components/ui/LoadingSpinner'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

interface Visit {
  id: number
  leadId: number | null
  lead: { nom: string } | null
  date: string
  address: string
  notes: string | null
  createdAt: string
}

const TASK_TYPES = [
  { value: 'visite',   label: 'Visite',    icon: '🏠' },
  { value: 'appel',    label: 'Appel',     icon: '📞' },
  { value: 'email',    label: 'Email',     icon: '📧' },
  { value: 'reunion',  label: 'Réunion',   icon: '🤝' },
  { value: 'autre',    label: 'Autre',     icon: '📌' },
]

const emptyVisitForm = { leadId: '', date: '', time: '', address: '', notes: '' }

interface Lead {
  id: number
  nom: string
  email: string | null
  telephone: string | null
  adresseBien: string | null
  ville: string | null
  typeBien: string | null
  nbChambres: string | null
  surface: number | null
  lienAnnonce: string | null
  statut: string
  commentaires: string | null
  dateContact: string
  relanceDate: string | null
  relanceNote: string | null
}

interface Statut {
  label: string
  color: string
}

const DEFAULT_STATUTS: Statut[] = [
  { label: 'À contacter',       color: 'blue' },
  { label: 'Follow up',         color: 'amber' },
  { label: 'En passe de signer', color: 'green' },
  { label: 'Signé',             color: 'emerald' },
  { label: 'Mort',              color: 'red' },
]

const COLOR_OPTIONS = [
  { value: 'blue',    label: 'Bleu',   cls: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  { value: 'amber',   label: 'Orange', cls: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
  { value: 'green',   label: 'Vert',   cls: 'bg-green-500/20 text-green-400 border-green-500/30' },
  { value: 'emerald', label: 'Émeraude', cls: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
  { value: 'red',     label: 'Rouge',  cls: 'bg-red-500/20 text-red-400 border-red-500/30' },
  { value: 'purple',  label: 'Violet', cls: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
  { value: 'pink',    label: 'Rose',   cls: 'bg-pink-500/20 text-pink-400 border-pink-500/30' },
  { value: 'gray',    label: 'Gris',   cls: 'bg-gray-500/20 text-gray-400 border-gray-500/30' },
]

function getColorCls(color: string) {
  return COLOR_OPTIONS.find(c => c.value === color)?.cls ?? 'bg-gray-500/20 text-gray-400 border-gray-500/30'
}

const TYPES_BIEN = ['Appartement', 'Studio', 'Maison', 'Villa', 'Loft', 'Chambre', 'Autre']

const emptyForm = {
  nom: '', email: '', telephone: '', adresseBien: '', ville: '', typeBien: 'Appartement',
  nbChambres: '', surface: '', lienAnnonce: '', statut: 'À contacter',
  commentaires: '', dateContact: new Date().toISOString().split('T')[0],
  relanceDate: '', relanceNote: '',
}

export default function LeadsPage() {
  const [mainTab, setMainTab] = useState<'leads' | 'visites'>('leads')

  // ── Leads state ────────────────────────────────────────────────────────────
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterStatut, setFilterStatut] = useState('tous')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingLead, setEditingLead] = useState<Lead | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [expandedId, setExpandedId] = useState<number | null>(null)

  // Gestion des statuts
  const [statuts, setStatuts] = useState<Statut[]>(DEFAULT_STATUTS)
  const [isStatutsModalOpen, setIsStatutsModalOpen] = useState(false)
  const [editingStatuts, setEditingStatuts] = useState<Statut[]>([])
  const [newLabel, setNewLabel] = useState('')
  const [newColor, setNewColor] = useState('blue')
  const [savingStatuts, setSavingStatuts] = useState(false)

  // ── Visites state ──────────────────────────────────────────────────────────
  const [visits, setVisits] = useState<Visit[]>([])
  const [isVisitModalOpen, setIsVisitModalOpen] = useState(false)
  const [visitForm, setVisitForm] = useState(emptyVisitForm)
  const [savingVisit, setSavingVisit] = useState(false)

  useEffect(() => {
    fetch('/api/leads')
      .then(r => r.json())
      .then(d => { setLeads(Array.isArray(d) ? d : []); setLoading(false) })
      .catch(() => { setLeads([]); setLoading(false) })

    fetch('/api/config/lead_statuts')
      .then(r => r.json())
      .then(d => { if (d.value) setStatuts(JSON.parse(d.value)) })
      .catch(() => {})

    fetch('/api/visits')
      .then(r => r.json())
      .then(d => setVisits(Array.isArray(d) ? d : []))
      .catch(() => {})
  }, [])

  const handleSaveVisit = async () => {
    if (!visitForm.date || !visitForm.address) return
    setSavingVisit(true)
    const dateTime = visitForm.time ? `${visitForm.date}T${visitForm.time}:00` : `${visitForm.date}T00:00:00`
    const res = await fetch('/api/visits', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        leadId: visitForm.leadId ? parseInt(visitForm.leadId) : null,
        date: dateTime,
        address: visitForm.address,
        notes: visitForm.notes || null,
      }),
    })
    if (res.ok) {
      const saved = await res.json()
      // Reload to get lead relation
      const all = await fetch('/api/visits').then(r => r.json())
      setVisits(Array.isArray(all) ? all : [])
      setIsVisitModalOpen(false)
      setVisitForm(emptyVisitForm)
    }
    setSavingVisit(false)
  }

  const handleDeleteVisit = async (id: number) => {
    if (!confirm('Supprimer cette visite ?')) return
    await fetch(`/api/visits/${id}`, { method: 'DELETE' })
    setVisits(v => v.filter(x => x.id !== id))
  }

  const openCreate = () => { setEditingLead(null); setForm(emptyForm); setIsModalOpen(true) }
  const openEdit = (lead: Lead) => {
    setEditingLead(lead)
    setForm({
      nom: lead.nom, email: lead.email ?? '', telephone: lead.telephone ?? '',
      adresseBien: lead.adresseBien ?? '', ville: lead.ville ?? '',
      typeBien: lead.typeBien ?? 'Appartement', nbChambres: lead.nbChambres ?? '',
      surface: lead.surface ? String(lead.surface) : '', lienAnnonce: lead.lienAnnonce ?? '',
      statut: lead.statut, commentaires: lead.commentaires ?? '',
      dateContact: lead.dateContact.split('T')[0],
      relanceDate: lead.relanceDate ? lead.relanceDate.split('T')[0] : '',
      relanceNote: lead.relanceNote ?? '',
    })
    setIsModalOpen(true)
  }

  const handleSave = async () => {
    if (!form.nom) return
    setSaving(true)
    const url = editingLead ? `/api/leads/${editingLead.id}` : '/api/leads'
    const method = editingLead ? 'PUT' : 'POST'
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    if (res.ok) {
      const data = await res.json()
      if (editingLead) setLeads(l => l.map(x => x.id === data.id ? data : x))
      else setLeads(l => [data, ...l])
      setIsModalOpen(false)
    }
    setSaving(false)
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Supprimer ce lead ?')) return
    await fetch(`/api/leads/${id}`, { method: 'DELETE' })
    setLeads(l => l.filter(x => x.id !== id))
  }

  const handleStatutChange = async (lead: Lead, newStatut: string) => {
    const res = await fetch(`/api/leads/${lead.id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...lead, statut: newStatut }),
    })
    if (res.ok) {
      const data = await res.json()
      setLeads(l => l.map(x => x.id === data.id ? data : x))
    }
  }

  // ── Gestion des statuts ────────────────────────────────────────────────────
  const openStatutsModal = () => {
    setEditingStatuts([...statuts])
    setNewLabel('')
    setNewColor('blue')
    setIsStatutsModalOpen(true)
  }

  const addStatut = () => {
    const label = newLabel.trim()
    if (!label || editingStatuts.some(s => s.label === label)) return
    setEditingStatuts(s => [...s, { label, color: newColor }])
    setNewLabel('')
    setNewColor('blue')
  }

  const removeStatut = (label: string) => {
    setEditingStatuts(s => s.filter(x => x.label !== label))
  }

  const saveStatuts = async () => {
    setSavingStatuts(true)
    const res = await fetch('/api/config/lead_statuts', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value: JSON.stringify(editingStatuts) }),
    })
    if (res.ok) {
      setStatuts(editingStatuts)
      setIsStatutsModalOpen(false)
    }
    setSavingStatuts(false)
  }

  const filtered = leads.filter(l => {
    const matchSearch = !search || l.nom.toLowerCase().includes(search.toLowerCase()) ||
      l.ville?.toLowerCase().includes(search.toLowerCase()) ||
      l.telephone?.includes(search)
    const matchStatut = filterStatut === 'tous' || l.statut === filterStatut
    return matchSearch && matchStatut
  })

  if (loading) return <LoadingPage />

  const counts = statuts.reduce((acc, s) => ({ ...acc, [s.label]: leads.filter(l => l.statut === s.label).length }), {} as Record<string, number>)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Leads</h1>
          <p className="text-gray-400 mt-1">{leads.length} prospect{leads.length > 1 ? 's' : ''} · {visits.length} visite{visits.length > 1 ? 's' : ''}</p>
        </div>
        <div className="flex gap-2">
          {mainTab === 'leads' ? (
            <>
              <button onClick={openStatutsModal} className="p-2 rounded-xl border border-white/[0.08] text-white/40 hover:text-white/70 hover:bg-white/5 transition-all" title="Gérer les statuts">
                <Settings className="w-4 h-4" />
              </button>
              <Button onClick={openCreate}><Plus className="w-4 h-4 mr-2" />Nouveau lead</Button>
            </>
          ) : (
            <Button onClick={() => { setVisitForm(emptyVisitForm); setIsVisitModalOpen(true) }}>
              <Plus className="w-4 h-4 mr-2" />Planifier une visite
            </Button>
          )}
        </div>
      </div>

      {/* Onglets principaux */}
      <div className="flex items-center bg-[#1a1a1a] border border-[#2e2e2e] rounded-2xl p-1 w-fit">
        {([['leads', 'Leads', leads.length], ['visites', 'Visites', visits.length]] as const).map(([tab, label, count]) => (
          <button key={tab} onClick={() => setMainTab(tab)}
            className={`px-5 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2 ${mainTab === tab ? 'bg-[#D4AF37] text-black' : 'text-gray-400 hover:text-white'}`}>
            {label}
            <span className={`text-xs px-1.5 py-0.5 rounded-md font-semibold ${mainTab === tab ? 'bg-black/20 text-black/70' : 'bg-[#2e2e2e] text-gray-500'}`}>{count}</span>
          </button>
        ))}
      </div>

      {/* ═══════════════════════ ONGLET VISITES ═══════════════════════ */}
      {mainTab === 'visites' && (
        <div className="space-y-3">
          {visits.length === 0 ? (
            <Card className="text-center py-16">
              <CalendarDays className="w-10 h-10 text-white/10 mx-auto mb-3" />
              <p className="text-white/30 font-medium">Aucune visite planifiée</p>
              <p className="text-white/20 text-sm mt-1">Ajoutez votre première visite</p>
            </Card>
          ) : (
            visits.map(visit => {
              const d = new Date(visit.date)
              const isPast = d < new Date()
              return (
                <Card key={visit.id} padding="none" className={`flex items-center gap-4 p-4 ${isPast ? 'opacity-50' : ''}`}>
                  {/* Date block */}
                  <div className="flex-shrink-0 w-14 text-center bg-[#D4AF37]/10 border border-[#D4AF37]/20 rounded-xl py-2 px-1">
                    <p className="text-[#D4AF37] font-bold text-lg leading-none">{d.getDate()}</p>
                    <p className="text-[#D4AF37]/70 text-xs capitalize">{format(d, 'MMM', { locale: fr })}</p>
                    {visit.date.includes('T') && d.getHours() > 0 && (
                      <p className="text-white/40 text-xs mt-1">{format(d, 'HH:mm')}</p>
                    )}
                  </div>
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <MapPin className="w-3.5 h-3.5 text-white/30 flex-shrink-0" />
                      <p className="text-white font-medium text-sm truncate">{visit.address}</p>
                    </div>
                    {visit.lead && (
                      <p className="text-[#D4AF37]/80 text-xs ml-5">Lead : {visit.lead.nom}</p>
                    )}
                    {visit.notes && (
                      <p className="text-white/30 text-xs ml-5 mt-0.5 truncate">{visit.notes}</p>
                    )}
                  </div>
                  {/* Delete */}
                  <button onClick={() => handleDeleteVisit(visit.id)}
                    className="flex-shrink-0 p-2 rounded-xl hover:bg-red-500/10 text-white/20 hover:text-red-400 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </Card>
              )
            })
          )}
        </div>
      )}

      {/* Modal nouvelle visite */}
      <Modal isOpen={isVisitModalOpen} onClose={() => setIsVisitModalOpen(false)} title="Planifier une visite">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-white/60 mb-1.5">Date *</label>
              <input type="date" value={visitForm.date} onChange={e => setVisitForm(f => ({ ...f, date: e.target.value }))}
                className="w-full bg-[#1b1b1b] border border-white/[0.08] rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#D4AF37]/40" />
            </div>
            <div>
              <label className="block text-sm font-medium text-white/60 mb-1.5">Heure</label>
              <input type="time" value={visitForm.time} onChange={e => setVisitForm(f => ({ ...f, time: e.target.value }))}
                className="w-full bg-[#1b1b1b] border border-white/[0.08] rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#D4AF37]/40" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-white/60 mb-1.5">Adresse *</label>
            <input value={visitForm.address} onChange={e => setVisitForm(f => ({ ...f, address: e.target.value }))}
              placeholder="Ex: 15 rue du Général Leclerc, Nancy"
              className="w-full bg-[#1b1b1b] border border-white/[0.08] rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#D4AF37]/40 placeholder-white/20" />
          </div>

          <div>
            <label className="block text-sm font-medium text-white/60 mb-1.5">Lead associé</label>
            <select value={visitForm.leadId} onChange={e => setVisitForm(f => ({ ...f, leadId: e.target.value }))}
              className="w-full bg-[#1b1b1b] border border-white/[0.08] rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#D4AF37]/40">
              <option value="">— Aucun —</option>
              {leads.map(l => <option key={l.id} value={l.id}>{l.nom}{l.ville ? ` (${l.ville})` : ''}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-white/60 mb-1.5">Notes</label>
            <textarea value={visitForm.notes} onChange={e => setVisitForm(f => ({ ...f, notes: e.target.value }))}
              rows={2} placeholder="Informations complémentaires..."
              className="w-full bg-[#1b1b1b] border border-white/[0.08] rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#D4AF37]/40 resize-none placeholder-white/20" />
          </div>

          <div className="flex gap-3 pt-2">
            <Button variant="ghost" onClick={() => setIsVisitModalOpen(false)} className="flex-1">Annuler</Button>
            <Button onClick={handleSaveVisit} disabled={savingVisit || !visitForm.date || !visitForm.address} className="flex-1">
              {savingVisit ? 'Enregistrement...' : 'Planifier'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ═══════════════════════ ONGLET LEADS ═══════════════════════ */}
      {mainTab === 'leads' && <>

      {/* Stats par statut */}
      <div className="flex flex-wrap gap-2">
        <button onClick={() => setFilterStatut('tous')} className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${filterStatut === 'tous' ? 'bg-white/10 text-white border-white/20' : 'border-white/[0.06] text-white/40 hover:text-white/60'}`}>
          Tous ({leads.length})
        </button>
        {statuts.map(s => (
          <button key={s.label} onClick={() => setFilterStatut(s.label === filterStatut ? 'tous' : s.label)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${filterStatut === s.label ? getColorCls(s.color) : 'border-white/[0.06] text-white/40 hover:text-white/60'}`}>
            {s.label} ({counts[s.label] ?? 0})
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher par nom, ville, téléphone..."
          className="w-full bg-[#1c1c1c] border border-white/[0.06] rounded-xl pl-9 pr-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-[#D4AF37]/40 text-sm" />
      </div>

      {/* Table */}
      <Card padding="none">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/[0.06]">
                {['Nom', 'Contact', 'Bien', 'Ville', 'Statut', 'Date contact', 'Relance', 'Actions'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-white/30 uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {filtered.map(lead => (
                <>
                  <tr key={lead.id} className="hover:bg-white/[0.02] transition-colors cursor-pointer" onClick={() => setExpandedId(expandedId === lead.id ? null : lead.id)}>
                    <td className="px-4 py-3">
                      <p className="text-white font-medium text-sm">{lead.nom}</p>
                      {lead.typeBien && <p className="text-white/30 text-xs">{lead.typeBien}{lead.nbChambres ? ` · T${lead.nbChambres}` : ''}{lead.surface ? ` · ${lead.surface}m²` : ''}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-0.5">
                        {lead.telephone && <a href={`tel:${lead.telephone}`} onClick={e => e.stopPropagation()} className="text-white/60 text-xs hover:text-white flex items-center gap-1"><Phone className="w-3 h-3" />{lead.telephone}</a>}
                        {lead.email && <a href={`mailto:${lead.email}`} onClick={e => e.stopPropagation()} className="text-white/60 text-xs hover:text-white flex items-center gap-1"><Mail className="w-3 h-3" />{lead.email}</a>}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-white/60 text-xs">{lead.adresseBien || '—'}</p>
                      {lead.lienAnnonce && <a href={lead.lienAnnonce} target="_blank" onClick={e => e.stopPropagation()} className="text-[#D4AF37] text-xs hover:underline flex items-center gap-1"><ExternalLink className="w-3 h-3" />Annonce</a>}
                    </td>
                    <td className="px-4 py-3"><p className="text-white/60 text-xs">{lead.ville || '—'}</p></td>
                    <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                      <select value={lead.statut} onChange={e => handleStatutChange(lead, e.target.value)}
                        className={`text-xs font-semibold px-2 py-1 rounded-lg border cursor-pointer bg-transparent ${getColorCls(statuts.find(s => s.label === lead.statut)?.color ?? 'gray')}`}>
                        {statuts.map(s => <option key={s.label} value={s.label} className="bg-[#1c1c1c] text-white">{s.label}</option>)}
                        {/* Affiche le statut actuel même s'il a été supprimé */}
                        {!statuts.some(s => s.label === lead.statut) && (
                          <option value={lead.statut} className="bg-[#1c1c1c] text-white">{lead.statut}</option>
                        )}
                      </select>
                    </td>
                    <td className="px-4 py-3"><p className="text-white/50 text-xs whitespace-nowrap">{format(new Date(lead.dateContact), 'd MMM yyyy', { locale: fr })}</p></td>
                    <td className="px-4 py-3">
                      {lead.relanceDate ? (
                        <div>
                          <p className={`text-xs font-medium whitespace-nowrap ${new Date(lead.relanceDate) < new Date() ? 'text-red-400' : 'text-amber-400'}`}>
                            {format(new Date(lead.relanceDate), 'd MMM', { locale: fr })}
                          </p>
                          {lead.relanceNote && <p className="text-white/30 text-xs truncate max-w-[100px]">{lead.relanceNote}</p>}
                        </div>
                      ) : <p className="text-white/20 text-xs">—</p>}
                    </td>
                    <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                      <div className="flex gap-1">
                        <button onClick={() => openEdit(lead)} className="p-1.5 rounded-lg hover:bg-white/5 text-white/30 hover:text-white transition-colors"><Edit2 className="w-3.5 h-3.5" /></button>
                        <button onClick={() => handleDelete(lead.id)} className="p-1.5 rounded-lg hover:bg-red-500/10 text-white/30 hover:text-red-400 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </td>
                  </tr>
                  {expandedId === lead.id && lead.commentaires && (
                    <tr key={`${lead.id}-expanded`} className="bg-white/[0.01]">
                      <td colSpan={8} className="px-4 py-3">
                        <p className="text-white/40 text-xs uppercase tracking-wider mb-1">Commentaires</p>
                        <p className="text-white/70 text-sm">{lead.commentaires}</p>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="text-center py-16 text-white/30">
              <p className="text-4xl mb-3">🎯</p>
              <p className="font-medium">Aucun lead trouvé</p>
            </div>
          )}
        </div>
      </Card>

      {/* Modal lead */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingLead ? 'Modifier le lead' : 'Nouveau lead'}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><Input label="Nom complet *" value={form.nom} onChange={e => setForm(f => ({ ...f, nom: e.target.value }))} placeholder="Ex: Hakan NIZAM" /></div>
            <Input label="Téléphone" value={form.telephone} onChange={e => setForm(f => ({ ...f, telephone: e.target.value }))} placeholder="06 XX XX XX XX" />
            <Input label="Email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="email@exemple.com" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><Input label="Adresse du bien" value={form.adresseBien} onChange={e => setForm(f => ({ ...f, adresseBien: e.target.value }))} placeholder="111 rue Jeanne d'Arc" /></div>
            <Input label="Ville" value={form.ville} onChange={e => setForm(f => ({ ...f, ville: e.target.value }))} placeholder="Nancy" />
            <div>
              <label className="block text-sm font-medium text-white/60 mb-1.5">Type de bien</label>
              <select value={form.typeBien} onChange={e => setForm(f => ({ ...f, typeBien: e.target.value }))}
                className="w-full bg-[#1b1b1b] border border-white/[0.08] rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#D4AF37]/40">
                {TYPES_BIEN.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <Input label="Nb chambres" value={form.nbChambres} onChange={e => setForm(f => ({ ...f, nbChambres: e.target.value }))} placeholder="T2, T3..." />
            <Input label="Surface (m²)" type="number" value={form.surface} onChange={e => setForm(f => ({ ...f, surface: e.target.value }))} placeholder="50" />
            <div>
              <label className="block text-sm font-medium text-white/60 mb-1.5">Statut</label>
              <select value={form.statut} onChange={e => setForm(f => ({ ...f, statut: e.target.value }))}
                className="w-full bg-[#1b1b1b] border border-white/[0.08] rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#D4AF37]/40">
                {statuts.map(s => <option key={s.label} value={s.label}>{s.label}</option>)}
              </select>
            </div>
          </div>

          <Input label="Lien annonce" value={form.lienAnnonce} onChange={e => setForm(f => ({ ...f, lienAnnonce: e.target.value }))} placeholder="https://seloger.com/..." />

          <div className="grid grid-cols-2 gap-3">
            <Input label="Date de contact" type="date" value={form.dateContact} onChange={e => setForm(f => ({ ...f, dateContact: e.target.value }))} />
            <Input label="Date de relance" type="date" value={form.relanceDate} onChange={e => setForm(f => ({ ...f, relanceDate: e.target.value }))} />
          </div>

          <Input label="Note de relance" value={form.relanceNote} onChange={e => setForm(f => ({ ...f, relanceNote: e.target.value }))} placeholder="Ex: Rappeler après visite" />

          <div>
            <label className="block text-sm font-medium text-white/60 mb-1.5">Commentaires</label>
            <textarea value={form.commentaires} onChange={e => setForm(f => ({ ...f, commentaires: e.target.value }))}
              rows={3} placeholder="Notes sur le prospect..."
              className="w-full bg-[#1b1b1b] border border-white/[0.08] rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#D4AF37]/40 resize-none" />
          </div>

          <div className="flex gap-3 pt-2">
            <Button variant="ghost" onClick={() => setIsModalOpen(false)} className="flex-1">Annuler</Button>
            <Button onClick={handleSave} disabled={saving} className="flex-1">{saving ? 'Enregistrement...' : 'Enregistrer'}</Button>
          </div>
        </div>
      </Modal>

      </> /* fin onglet leads */}

      {/* Modal gestion des statuts */}
      <Modal isOpen={isStatutsModalOpen} onClose={() => setIsStatutsModalOpen(false)} title="Gérer les statuts">
        <div className="space-y-4">
          {/* Liste des statuts existants */}
          <div className="space-y-2">
            {editingStatuts.map(s => (
              <div key={s.label} className="flex items-center gap-3 px-3 py-2 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                <GripVertical className="w-4 h-4 text-white/20 flex-shrink-0" />
                <span className={`px-2 py-0.5 rounded-md text-xs font-semibold border flex-1 ${getColorCls(s.color)}`}>
                  {s.label}
                </span>
                <button onClick={() => removeStatut(s.label)} className="p-1 rounded-lg hover:bg-red-500/10 text-white/30 hover:text-red-400 transition-colors flex-shrink-0">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
            {editingStatuts.length === 0 && (
              <p className="text-white/30 text-sm text-center py-4">Aucun statut</p>
            )}
          </div>

          {/* Ajout d'un nouveau statut */}
          <div className="pt-2 border-t border-white/[0.06]">
            <p className="text-white/40 text-xs uppercase tracking-wider mb-3">Ajouter un statut</p>
            <div className="flex gap-2">
              <input
                value={newLabel}
                onChange={e => setNewLabel(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addStatut()}
                placeholder="Nom du statut..."
                className="flex-1 bg-[#1b1b1b] border border-white/[0.08] rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-[#D4AF37]/40 placeholder-white/20"
              />
              <select
                value={newColor}
                onChange={e => setNewColor(e.target.value)}
                className="bg-[#1b1b1b] border border-white/[0.08] rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-[#D4AF37]/40"
              >
                {COLOR_OPTIONS.map(c => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
              <button
                onClick={addStatut}
                disabled={!newLabel.trim()}
                className="px-3 py-2 rounded-xl bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/20 hover:bg-[#D4AF37]/20 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button variant="ghost" onClick={() => setIsStatutsModalOpen(false)} className="flex-1">Annuler</Button>
            <Button onClick={saveStatuts} disabled={savingStatuts} className="flex-1">
              {savingStatuts ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
