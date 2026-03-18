'use client'

import { useEffect, useState } from 'react'
import { Plus, Edit2, Trash2, ExternalLink, Phone, Mail, Search } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { LoadingPage } from '@/components/ui/LoadingSpinner'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

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

const STATUTS = ['À contacter', 'Follow up', 'En passe de signer', 'Signé', 'Mort']

const STATUT_COLORS: Record<string, string> = {
  'À contacter': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  'Follow up': 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  'En passe de signer': 'bg-green-500/20 text-green-400 border-green-500/30',
  'Signé': 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  'Mort': 'bg-red-500/20 text-red-400 border-red-500/30',
}

const TYPES_BIEN = ['Appartement', 'Studio', 'Maison', 'Villa', 'Loft', 'Chambre', 'Autre']

const emptyForm = {
  nom: '', email: '', telephone: '', adresseBien: '', ville: '', typeBien: 'Appartement',
  nbChambres: '', surface: '', lienAnnonce: '', statut: 'À contacter',
  commentaires: '', dateContact: new Date().toISOString().split('T')[0],
  relanceDate: '', relanceNote: '',
}

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterStatut, setFilterStatut] = useState('tous')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingLead, setEditingLead] = useState<Lead | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [expandedId, setExpandedId] = useState<number | null>(null)

  useEffect(() => {
    fetch('/api/leads').then(r => r.json()).then(d => { setLeads(d); setLoading(false) })
  }, [])

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

  const filtered = leads.filter(l => {
    const matchSearch = !search || l.nom.toLowerCase().includes(search.toLowerCase()) ||
      l.ville?.toLowerCase().includes(search.toLowerCase()) ||
      l.telephone?.includes(search)
    const matchStatut = filterStatut === 'tous' || l.statut === filterStatut
    return matchSearch && matchStatut
  })

  if (loading) return <LoadingPage />

  const counts = STATUTS.reduce((acc, s) => ({ ...acc, [s]: leads.filter(l => l.statut === s).length }), {} as Record<string, number>)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Leads</h1>
          <p className="text-gray-400 mt-1">{leads.length} prospect{leads.length > 1 ? 's' : ''} au total</p>
        </div>
        <Button onClick={openCreate}><Plus className="w-4 h-4 mr-2" />Nouveau lead</Button>
      </div>

      {/* Stats par statut */}
      <div className="flex flex-wrap gap-2">
        <button onClick={() => setFilterStatut('tous')} className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${filterStatut === 'tous' ? 'bg-white/10 text-white border-white/20' : 'border-white/[0.06] text-white/40 hover:text-white/60'}`}>
          Tous ({leads.length})
        </button>
        {STATUTS.map(s => (
          <button key={s} onClick={() => setFilterStatut(s === filterStatut ? 'tous' : s)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${filterStatut === s ? STATUT_COLORS[s] : 'border-white/[0.06] text-white/40 hover:text-white/60'}`}>
            {s} ({counts[s] ?? 0})
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
                        className={`text-xs font-semibold px-2 py-1 rounded-lg border cursor-pointer bg-transparent ${STATUT_COLORS[lead.statut] ?? 'text-white/60 border-white/20'}`}>
                        {STATUTS.map(s => <option key={s} value={s} className="bg-[#1c1c1c] text-white">{s}</option>)}
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

      {/* Modal */}
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
                {STATUTS.map(s => <option key={s} value={s}>{s}</option>)}
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
            <Button variant="secondary" onClick={() => setIsModalOpen(false)} className="flex-1">Annuler</Button>
            <Button onClick={handleSave} disabled={saving} className="flex-1">{saving ? 'Enregistrement...' : 'Enregistrer'}</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
