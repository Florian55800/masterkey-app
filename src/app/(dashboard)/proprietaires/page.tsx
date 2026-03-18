'use client'

import { useEffect, useState } from 'react'
import { Plus, Search, Users, Phone, Mail, Edit2, Bell, Star } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { Badge } from '@/components/ui/Badge'
import { LoadingPage } from '@/components/ui/LoadingSpinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { formatCurrency } from '@/lib/utils'
import { format, isPast, isWithinInterval, addDays } from 'date-fns'
import { fr } from 'date-fns/locale'

interface SatisfactionScore {
  id: number
  score: number
  quarter: number
  year: number
}

interface Property {
  id: number
  name: string
  status: string
  typeGestion: string
}

interface Owner {
  id: number
  name: string
  phone: string | null
  email: string | null
  notes: string | null
  lastContact: string | null
  relanceDate: string | null
  relanceNote: string | null
  source: string | null
  properties: Property[]
  satisfactions: SatisfactionScore[]
}

const SOURCES = ['Recommandation', 'Réseaux sociaux', 'Bouche à oreille', 'Prospection directe', 'Site web', 'Partenaire', 'Autre']

export default function ProprietairesPage() {
  const [owners, setOwners] = useState<Owner[]>([])
  const [loading, setLoading] = useState(true)
  const [typeGestionTab, setTypeGestionTab] = useState<'conciergerie' | 'sous-location'>('conciergerie')
  const [search, setSearch] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingOwner, setEditingOwner] = useState<Owner | null>(null)
  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    notes: '',
    lastContact: '',
    relanceDate: '',
    relanceNote: '',
    source: '',
    photo: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => setForm(f => ({ ...f, photo: ev.target?.result as string }))
    reader.readAsDataURL(file)
  }

  useEffect(() => {
    loadOwners()
  }, [])

  const loadOwners = async () => {
    const res = await fetch('/api/owners')
    const data = await res.json()
    setOwners(data)
    setLoading(false)
  }

  const tabOwners = owners.filter((o) =>
    o.properties.some((p) => (p.typeGestion || 'conciergerie') === typeGestionTab)
  )

  const filteredOwners = tabOwners.filter((o) =>
    o.name.toLowerCase().includes(search.toLowerCase()) ||
    o.email?.toLowerCase().includes(search.toLowerCase()) ||
    o.phone?.includes(search)
  )

  const getRelanceStatus = (owner: Owner) => {
    if (!owner.relanceDate) return null
    const date = new Date(owner.relanceDate)
    if (isPast(date)) return 'overdue'
    if (isWithinInterval(date, { start: new Date(), end: addDays(new Date(), 7) })) return 'upcoming'
    return 'future'
  }

  const getAvgSatisfaction = (owner: Owner) => {
    if (!owner.satisfactions.length) return null
    const avg = owner.satisfactions.reduce((s, sc) => s + sc.score, 0) / owner.satisfactions.length
    return avg.toFixed(1)
  }

  const openCreateModal = () => {
    setEditingOwner(null)
    setForm({ name: '', phone: '', email: '', notes: '', lastContact: '', relanceDate: '', relanceNote: '', source: '', photo: '' })
    setError('')
    setIsModalOpen(true)
  }

  const openEditModal = (owner: Owner) => {
    setEditingOwner(owner)
    setForm({
      name: owner.name,
      phone: owner.phone ?? '',
      email: owner.email ?? '',
      notes: owner.notes ?? '',
      lastContact: owner.lastContact ? format(new Date(owner.lastContact), 'yyyy-MM-dd') : '',
      relanceDate: owner.relanceDate ? format(new Date(owner.relanceDate), 'yyyy-MM-dd') : '',
      relanceNote: owner.relanceNote ?? '',
      source: owner.source ?? '',
      photo: (owner as Owner & { photo?: string }).photo ?? '',
    })
    setError('')
    setIsModalOpen(true)
  }

  const handleSave = async () => {
    setSaving(true)
    setError('')
    try {
      const url = editingOwner ? `/api/owners/${editingOwner.id}` : '/api/owners'
      const method = editingOwner ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Erreur')
        return
      }
      await loadOwners()
      setIsModalOpen(false)
    } catch {
      setError('Erreur de connexion')
    } finally {
      setSaving(false)
    }
  }

  const overdueCount = tabOwners.filter((o) => getRelanceStatus(o) === 'overdue').length
  const upcomingCount = tabOwners.filter((o) => getRelanceStatus(o) === 'upcoming').length
  const activeOwnersCount = tabOwners.filter((o) => o.properties.some((p) => p.status === 'active')).length

  if (loading) return <LoadingPage />

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Propriétaires</h1>
          <p className="text-gray-400 mt-1">
            {owners.length} propriétaire(s) · {activeOwnersCount} actif(s)
          </p>
        </div>
        <Button onClick={openCreateModal}>
          <Plus className="w-4 h-4" />
          Ajouter
        </Button>
      </div>

      {/* TypeGestion Tabs */}
      <div className="flex items-center bg-[#1a1a1a] border border-[#2e2e2e] rounded-2xl p-1 w-fit">
        {(['conciergerie', 'sous-location'] as const).map((tab) => {
          const count = owners.filter((o) => o.properties.some((p) => (p.typeGestion || 'conciergerie') === tab)).length
          return (
            <button
              key={tab}
              onClick={() => { setTypeGestionTab(tab); setSearch('') }}
              className={`px-5 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2 ${
                typeGestionTab === tab
                  ? 'bg-[#D4AF37] text-black'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {tab === 'conciergerie' ? 'Conciergerie' : 'Sous-location'}
              <span className={`text-xs px-1.5 py-0.5 rounded-md font-semibold ${typeGestionTab === tab ? 'bg-black/20 text-black/70' : 'bg-[#2e2e2e] text-gray-500'}`}>
                {count}
              </span>
            </button>
          )
        })}
      </div>

      {/* Alert badges */}
      {(overdueCount > 0 || upcomingCount > 0) && (
        <div className="flex flex-wrap gap-3">
          {overdueCount > 0 && (
            <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2">
              <Bell className="w-4 h-4 text-red-400" />
              <span className="text-red-400 text-sm font-medium">
                {overdueCount} relance(s) en retard
              </span>
            </div>
          )}
          {upcomingCount > 0 && (
            <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-2">
              <Bell className="w-4 h-4 text-amber-400" />
              <span className="text-amber-400 text-sm font-medium">
                {upcomingCount} relance(s) cette semaine
              </span>
            </div>
          )}
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher un propriétaire..."
          className="w-full bg-[#242424] border border-[#2e2e2e] rounded-xl pl-11 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[#D4AF37] transition-colors"
        />
      </div>

      {/* Owners List */}
      {filteredOwners.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Aucun propriétaire trouvé"
          description="Ajoutez vos premiers propriétaires pour gérer vos relations."
          actionLabel="Ajouter un propriétaire"
          onAction={openCreateModal}
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredOwners.map((owner) => {
            const relanceStatus = getRelanceStatus(owner)
            const avgScore = getAvgSatisfaction(owner)
            const activeProperties = owner.properties.filter((p) => p.status === 'active')

            return (
              <Card key={owner.id} className={`relative ${
                relanceStatus === 'overdue' ? 'border-red-500/20' :
                relanceStatus === 'upcoming' ? 'border-amber-500/20' : ''
              }`}>
                {relanceStatus === 'overdue' && (
                  <div className="absolute top-3 right-3">
                    <Badge variant="danger">Relance en retard</Badge>
                  </div>
                )}
                {relanceStatus === 'upcoming' && (
                  <div className="absolute top-3 right-3">
                    <Badge variant="warning">Relance proche</Badge>
                  </div>
                )}

                <div className="flex items-start gap-3 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-[#D4AF37]/10 border border-[#D4AF37]/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-[#D4AF37] font-bold">{owner.name.charAt(0)}</span>
                  </div>
                  <div className="flex-1 min-w-0 pr-20">
                    <h3 className="text-white font-semibold">{owner.name}</h3>
                    {owner.source && (
                      <p className="text-gray-500 text-xs mt-0.5">{owner.source}</p>
                    )}
                  </div>
                </div>

                {/* Stats */}
                <div className="flex flex-wrap gap-2 mb-3">
                  <div className="flex items-center gap-1.5 bg-[#1b1b1b] rounded-lg px-2.5 py-1.5">
                    <span className="text-[#D4AF37] font-bold text-sm">{activeProperties.length}</span>
                    <span className="text-gray-400 text-xs">logement(s)</span>
                  </div>
                  {avgScore && (
                    <div className="flex items-center gap-1.5 bg-[#1b1b1b] rounded-lg px-2.5 py-1.5">
                      <Star className="w-3 h-3 text-amber-400" />
                      <span className="text-white text-sm font-medium">{avgScore}/10</span>
                    </div>
                  )}
                </div>

                {/* Contact info */}
                <div className="space-y-1.5 mb-3">
                  {owner.phone && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
                      <a href={`tel:${owner.phone}`} className="text-gray-300 hover:text-white transition-colors">
                        {owner.phone}
                      </a>
                    </div>
                  )}
                  {owner.email && (
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
                      <a href={`mailto:${owner.email}`} className="text-gray-300 hover:text-white transition-colors truncate">
                        {owner.email}
                      </a>
                    </div>
                  )}
                </div>

                {/* Relance info */}
                {owner.relanceDate && (
                  <div className={`text-xs px-2.5 py-1.5 rounded-lg mb-3 ${
                    relanceStatus === 'overdue' ? 'bg-red-500/10 text-red-400' :
                    relanceStatus === 'upcoming' ? 'bg-amber-500/10 text-amber-400' :
                    'bg-[#1b1b1b] text-gray-400'
                  }`}>
                    <Bell className="w-3 h-3 inline mr-1" />
                    Relance: {format(new Date(owner.relanceDate), 'd MMM yyyy', { locale: fr })}
                    {owner.relanceNote && <span className="ml-1">— {owner.relanceNote}</span>}
                  </div>
                )}

                {owner.lastContact && (
                  <p className="text-gray-500 text-xs mb-3">
                    Dernier contact: {format(new Date(owner.lastContact), 'd MMM yyyy', { locale: fr })}
                  </p>
                )}

                {owner.notes && (
                  <p className="text-gray-400 text-xs italic mb-3 line-clamp-2">"{owner.notes}"</p>
                )}

                <button
                  onClick={() => openEditModal(owner)}
                  className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg border border-[#2e2e2e] text-gray-400 hover:text-white hover:border-[#D4AF37]/30 transition-all text-sm"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  Modifier
                </button>
              </Card>
            )
          })}
        </div>
      )}

      {/* Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingOwner ? 'Modifier le propriétaire' : 'Nouveau propriétaire'}
        size="lg"
      >
        <div className="space-y-4">
          {/* Photo */}
          <div className="flex items-center gap-4">
            <div className="flex-shrink-0">
              {form.photo ? (
                <img src={form.photo} alt="Photo" className="w-14 h-14 rounded-xl object-cover" />
              ) : (
                <div className="w-14 h-14 rounded-xl flex items-center justify-center text-white/20 text-2xl"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px dashed rgba(255,255,255,0.1)' }}>
                  👤
                </div>
              )}
            </div>
            <div>
              <label className="text-sm text-white/40 font-medium block mb-1.5">Photo (optionnel)</label>
              <label className="cursor-pointer inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm text-white/60 hover:text-white transition-all"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <span>Choisir</span>
                <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
              </label>
              {form.photo && <button onClick={() => setForm(f => ({ ...f, photo: '' }))}
                className="text-xs text-red-400/60 hover:text-red-400 ml-2 transition-colors">Supprimer</button>}
            </div>
          </div>

          <Input
            label="Nom complet"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Jean-Pierre Martin"
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Téléphone"
              type="tel"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="06 12 34 56 78"
            />
            <Input
              label="Email"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="jean@example.com"
            />
          </div>

          <Select
            label="Source"
            value={form.source}
            onChange={(e) => setForm({ ...form, source: e.target.value })}
          >
            <option value="">Sélectionner une source</option>
            {SOURCES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </Select>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Dernier contact"
              type="date"
              value={form.lastContact}
              onChange={(e) => setForm({ ...form, lastContact: e.target.value })}
            />
            <Input
              label="Date de relance"
              type="date"
              value={form.relanceDate}
              onChange={(e) => setForm({ ...form, relanceDate: e.target.value })}
            />
          </div>

          <Input
            label="Note de relance"
            value={form.relanceNote}
            onChange={(e) => setForm({ ...form, relanceNote: e.target.value })}
            placeholder="Ex: Rappeler pour renouvellement"
          />

          <Textarea
            label="Notes"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            placeholder="Observations, préférences..."
            rows={3}
          />

          {error && (
            <p className="text-red-400 text-sm bg-red-400/10 px-3 py-2 rounded-lg">{error}</p>
          )}

          <div className="flex gap-3 justify-end">
            <Button variant="ghost" onClick={() => setIsModalOpen(false)}>Annuler</Button>
            <Button isLoading={saving} onClick={handleSave}>
              {editingOwner ? 'Enregistrer' : 'Ajouter le propriétaire'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
