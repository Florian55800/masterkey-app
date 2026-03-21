'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Building2, Edit2, Trash2, Home, Star, Eye } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Badge } from '@/components/ui/Badge'
import { LoadingPage } from '@/components/ui/LoadingSpinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { MilestoneWidget } from '@/components/dashboard/MilestoneWidget'
import { formatCurrency, formatPercent } from '@/lib/utils'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

interface Owner {
  id: number
  name: string
}

interface Property {
  id: number
  name: string
  address: string
  city: string
  type: string
  typeGestion: string
  ownerId: number
  owner: Owner
  commissionRate: number
  dateSigned: string
  dateLost: string | null
  status: string
}

const PROPERTY_MILESTONES = [
  { value: 5, label: 'Premier pas' },
  { value: 10, label: 'En route' },
  { value: 25, label: 'En croissance' },
  { value: 50, label: 'Leader local' },
  { value: 100, label: 'Référence régionale' },
]

const PROPERTY_TYPES = ['Appartement', 'Studio', 'Maison', 'Villa', 'Loft', 'Chambre', 'Autre']

export default function LogementsPage() {
  const router = useRouter()
  const [properties, setProperties] = useState<Property[]>([])
  const [owners, setOwners] = useState<Owner[]>([])
  const [loading, setLoading] = useState(true)
  const [typeGestionTab, setTypeGestionTab] = useState<'conciergerie' | 'sous-location'>('conciergerie')
  const [filter, setFilter] = useState<'tous' | 'actifs' | 'inactifs'>('actifs')
  const [cityFilter, setCityFilter] = useState('tous')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingProperty, setEditingProperty] = useState<Property | null>(null)
  const [form, setForm] = useState({
    name: '',
    address: '',
    city: '',
    type: 'Appartement',
    typeGestion: 'conciergerie',
    ownerId: '',
    commissionRate: '20',
    dateSigned: format(new Date(), 'yyyy-MM-dd'),
    status: 'active',
    photo: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [loadError, setLoadError] = useState('')

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => setForm(f => ({ ...f, photo: ev.target?.result as string }))
    reader.readAsDataURL(file)
  }

  useEffect(() => {
    // Affiche immédiatement depuis le cache local pour éviter tout spinner
    const cached = localStorage.getItem('mk_properties_cache')
    if (cached) {
      try {
        const { properties: p, owners: o } = JSON.parse(cached)
        if (Array.isArray(p)) { setProperties(p); setOwners(o ?? []); setLoading(false) }
      } catch { /* cache corrompu, on ignore */ }
    }
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoadError('')
      const abort = new AbortController()
      const tid = setTimeout(() => abort.abort(), 15_000)
      // Un seul appel — les owners sont déjà inclus dans chaque property
      const propsRes = await fetch('/api/properties', { signal: abort.signal })
        .finally(() => clearTimeout(tid))
      const propsData = await propsRes.json()
      if (!Array.isArray(propsData)) {
        setLoadError(propsData?.error || 'Erreur de chargement')
      } else {
        setProperties(propsData)
        // Extraire les owners uniques depuis les properties (évite un 2e appel réseau)
        const uniqueOwners = Array.from(
          new Map(propsData.map((p: Property) => [p.owner.id, p.owner])).values()
        ) as Owner[]
        setOwners(uniqueOwners)
        localStorage.setItem('mk_properties_cache', JSON.stringify({
          properties: propsData,
          owners: uniqueOwners,
        }))
      }
    } catch {
      setLoadError('Serveur lent — données en cache affichées')
    } finally {
      setLoading(false)
    }
  }

  const activeProperties = properties.filter((p) => p.status === 'active')
  const tabProperties = properties.filter((p) => (p.typeGestion || 'conciergerie') === typeGestionTab)
  const cities = Array.from(new Set(tabProperties.map((p) => p.city))).sort()

  const filteredProperties = tabProperties.filter((p) => {
    const statusMatch =
      filter === 'tous' ? true : filter === 'actifs' ? p.status === 'active' : p.status !== 'active'
    const cityMatch = cityFilter === 'tous' ? true : p.city === cityFilter
    return statusMatch && cityMatch
  })

  const openCreateModal = () => {
    setEditingProperty(null)
    setForm({
      name: '',
      address: '',
      city: '',
      type: 'Appartement',
      typeGestion: typeGestionTab,
      ownerId: owners[0]?.id ? String(owners[0].id) : '',
      commissionRate: '20',
      dateSigned: format(new Date(), 'yyyy-MM-dd'),
      status: 'active',
      photo: '',
    })
    setError('')
    setIsModalOpen(true)
  }

  const openEditModal = (property: Property) => {
    setEditingProperty(property)
    setForm({
      name: property.name,
      address: property.address,
      city: property.city,
      type: property.type,
      typeGestion: property.typeGestion || 'conciergerie',
      ownerId: String(property.ownerId),
      commissionRate: String(property.commissionRate),
      dateSigned: format(new Date(property.dateSigned), 'yyyy-MM-dd'),
      status: property.status,
      photo: (property as Property & { photo?: string }).photo ?? '',
    })
    setError('')
    setIsModalOpen(true)
  }

  const handleSave = async () => {
    setSaving(true)
    setError('')

    try {
      const url = editingProperty ? `/api/properties/${editingProperty.id}` : '/api/properties'
      const method = editingProperty ? 'PUT' : 'POST'

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

      await loadData()
      setIsModalOpen(false)
    } catch {
      setError('Erreur de connexion')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Marquer ce logement comme inactif ?')) return
    await fetch(`/api/properties/${id}`, { method: 'DELETE' })
    await loadData()
  }

  const getTypeBadgeVariant = (type: string) => {
    switch (type.toLowerCase()) {
      case 'maison': case 'villa': return 'gold'
      case 'appartement': return 'info'
      case 'studio': return 'default'
      case 'loft': return 'warning'
      default: return 'default'
    }
  }

  if (loading) return <LoadingPage />

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Logements</h1>
          <p className="text-gray-400 mt-1">
            <span className="text-[#D4AF37] font-semibold">{activeProperties.length}</span> actifs sur {properties.length} total
          </p>
        </div>
        <Button onClick={openCreateModal}>
          <Plus className="w-4 h-4" />
          Ajouter logement
        </Button>
      </div>

      {loadError && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-red-400 text-sm">
          ⚠️ {loadError}
        </div>
      )}

      {/* TypeGestion Tabs */}
      <div className="flex items-center bg-[#1a1a1a] border border-[#2e2e2e] rounded-2xl p-1 w-fit">
        {(['conciergerie', 'sous-location'] as const).map((tab) => {
          const count = properties.filter((p) => (p.typeGestion || 'conciergerie') === tab).length
          return (
            <button
              key={tab}
              onClick={() => { setTypeGestionTab(tab); setCityFilter('tous') }}
              className={`px-5 py-2 rounded-xl text-sm font-medium transition-all capitalize flex items-center gap-2 ${
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

      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card padding="sm" className="text-center">
          <p className="text-gray-400 text-xs mb-1">Actifs</p>
          <p className="text-[#D4AF37] font-bold text-2xl">{tabProperties.filter(p => p.status === 'active').length}</p>
        </Card>
        <Card padding="sm" className="text-center">
          <p className="text-gray-400 text-xs mb-1">Inactifs</p>
          <p className="text-red-400 font-bold text-2xl">{tabProperties.filter((p) => p.status !== 'active').length}</p>
        </Card>
        <Card padding="sm" className="text-center">
          <p className="text-gray-400 text-xs mb-1">Comm. moy.</p>
          <p className="text-white font-bold text-2xl">
            {tabProperties.filter(p => p.status === 'active').length > 0
              ? formatPercent(tabProperties.filter(p => p.status === 'active').reduce((s, p) => s + p.commissionRate, 0) / tabProperties.filter(p => p.status === 'active').length)
              : '—'}
          </p>
        </Card>
        <Card padding="sm" className="text-center">
          <p className="text-gray-400 text-xs mb-1">Villes</p>
          <p className="text-white font-bold text-2xl">{cities.length}</p>
        </Card>
      </div>

      {/* Milestone Widget */}
      <MilestoneWidget
        current={activeProperties.length}
        milestones={PROPERTY_MILESTONES}
        title="Paliers de croissance"
        unit="logements actifs"
      />

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center bg-[#242424] border border-[#2e2e2e] rounded-xl p-1">
          {(['tous', 'actifs', 'inactifs'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium capitalize transition-all ${
                filter === f ? 'bg-[#D4AF37] text-black' : 'text-gray-400 hover:text-white'
              }`}
            >
              {f === 'tous' ? 'Tous' : f === 'actifs' ? 'Actifs' : 'Inactifs'}
            </button>
          ))}
        </div>

        {cities.length > 0 && (
          <select
            value={cityFilter}
            onChange={(e) => setCityFilter(e.target.value)}
            className="bg-[#242424] border border-[#2e2e2e] rounded-xl px-3 py-2 text-gray-300 text-sm focus:outline-none focus:border-[#D4AF37]"
          >
            <option value="tous">Toutes les villes</option>
            {cities.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        )}

        <span className="text-gray-500 text-sm ml-auto">
          {filteredProperties.length} logement(s)
        </span>
      </div>

      {/* Properties List */}
      {filteredProperties.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="Aucun logement trouvé"
          description="Ajoutez votre premier logement pour commencer."
          actionLabel="Ajouter un logement"
          onAction={openCreateModal}
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredProperties.map((property) => (
            <Card key={property.id} className={`relative ${property.status !== 'active' ? 'opacity-60' : ''}`}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-[#D4AF37]/10 flex items-center justify-center flex-shrink-0">
                    <Home className="w-4.5 h-4.5 text-[#D4AF37]" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-white font-semibold text-sm truncate">{property.name}</p>
                    <p className="text-gray-500 text-xs truncate">{property.city}</p>
                  </div>
                </div>
                <Badge variant={property.status === 'active' ? 'success' : 'danger'} className="flex-shrink-0 ml-2">
                  {property.status === 'active' ? 'Actif' : 'Inactif'}
                </Badge>
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Type</span>
                  <Badge variant={getTypeBadgeVariant(property.type)}>{property.type}</Badge>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Propriétaire</span>
                  <span className="text-white font-medium truncate max-w-[60%] text-right">{property.owner.name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Commission</span>
                  <span className="text-[#D4AF37] font-semibold">{formatPercent(property.commissionRate)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Signé le</span>
                  <span className="text-gray-300">
                    {format(new Date(property.dateSigned), 'd MMM yyyy', { locale: fr })}
                  </span>
                </div>
              </div>

              <p className="text-gray-500 text-xs mb-4 truncate">{property.address}</p>

              <div className="flex gap-2">
                <button
                  onClick={() => router.push(`/logements/${property.id}`)}
                  className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-[#2e2e2e] text-gray-400 hover:text-[#D4AF37] hover:border-[#D4AF37]/30 transition-all text-sm"
                >
                  <Eye className="w-3.5 h-3.5" />
                  Voir la fiche
                </button>
                <button
                  onClick={() => openEditModal(property)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border border-[#2e2e2e] text-gray-400 hover:text-white hover:border-[#D4AF37]/30 transition-all text-sm"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  Modifier
                </button>
                {property.status === 'active' && (
                  <button
                    onClick={() => handleDelete(property.id)}
                    className="px-3 py-2 rounded-lg border border-[#2e2e2e] text-gray-500 hover:text-red-400 hover:border-red-500/20 transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingProperty ? 'Modifier le logement' : 'Nouveau logement'}
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
                  🏠
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
            label="Nom du logement"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Appartement Centre Ville Nancy"
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Ville"
              value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
              placeholder="Nancy"
            />
            <Select
              label="Type"
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
            >
              {PROPERTY_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </Select>
          </div>

          <Select
            label="Type de gestion"
            value={form.typeGestion}
            onChange={(e) => setForm({ ...form, typeGestion: e.target.value })}
          >
            <option value="conciergerie">Conciergerie</option>
            <option value="sous-location">Sous-location</option>
          </Select>

          <Input
            label="Adresse"
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            placeholder="12 rue de la Paix"
          />

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Propriétaire"
              value={form.ownerId}
              onChange={(e) => setForm({ ...form, ownerId: e.target.value })}
            >
              <option value="">Sélectionner...</option>
              {owners.map((o) => (
                <option key={o.id} value={o.id}>{o.name}</option>
              ))}
            </Select>
            <Input
              label="Commission (%)"
              type="number"
              value={form.commissionRate}
              onChange={(e) => setForm({ ...form, commissionRate: e.target.value })}
              placeholder="20"
            />
          </div>

          <Input
            label="Date de signature"
            type="date"
            value={form.dateSigned}
            onChange={(e) => setForm({ ...form, dateSigned: e.target.value })}
          />

          {editingProperty && (
            <Select
              label="Statut"
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
            >
              <option value="active">Actif</option>
              <option value="inactive">Inactif</option>
            </Select>
          )}

          {error && (
            <p className="text-red-400 text-sm bg-red-400/10 px-3 py-2 rounded-lg">{error}</p>
          )}

          <div className="flex gap-3 justify-end">
            <Button variant="ghost" onClick={() => setIsModalOpen(false)}>Annuler</Button>
            <Button isLoading={saving} onClick={handleSave}>
              {editingProperty ? 'Enregistrer' : 'Ajouter le logement'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
