'use client'

import { useEffect, useState } from 'react'
import { Plus, Trash2, Edit2, Phone, Mail, Home, Briefcase, User } from 'lucide-react'
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

const ROLES = [
  { value: 'ménage', label: 'Femme / Homme de ménage' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'accueil', label: 'Accueil / Check-in' },
  { value: 'autre', label: 'Autre' },
]

const ROLE_COLORS: Record<string, string> = {
  ménage: 'info',
  maintenance: 'warning',
  accueil: 'success',
  autre: 'default',
}

const EMPTY_FORM = { name: '', phone: '', email: '', role: 'ménage', notes: '' }

export default function PersonnelPage() {
  const [staff, setStaff] = useState<StaffMember[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editing, setEditing] = useState<StaffMember | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => { load() }, [])

  const load = async () => {
    try {
      const res = await fetch('/api/staff')
      const data = await res.json()
      setStaff(Array.isArray(data) ? data : [])
    } catch { setStaff([]) }
    finally { setLoading(false) }
  }

  const openCreate = () => {
    setEditing(null)
    setForm(EMPTY_FORM)
    setError('')
    setIsModalOpen(true)
  }

  const openEdit = (m: StaffMember) => {
    setEditing(m)
    setForm({ name: m.name, phone: m.phone ?? '', email: m.email ?? '', role: m.role, notes: m.notes ?? '' })
    setError('')
    setIsModalOpen(true)
  }

  const handleSave = async () => {
    if (!form.name.trim()) { setError('Le nom est obligatoire'); return }
    setSaving(true)
    setError('')
    try {
      const url  = editing ? `/api/staff/${editing.id}` : '/api/staff'
      const method = editing ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
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
        <Button onClick={openCreate}>
          <Plus className="w-4 h-4" />Ajouter
        </Button>
      </div>

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

      {/* List */}
      {staff.length === 0 ? (
        <EmptyState icon={Briefcase} title="Aucun membre du personnel"
          description="Ajoutez votre premier membre pour l'associer aux logements."
          actionLabel="Ajouter un membre" onAction={openCreate} />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {staff.map((member) => (
            <Card key={member.id} className="flex flex-col gap-4">
              {/* Header */}
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
                  <button onClick={() => openEdit(member)}
                    className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-white/[0.06] transition-all">
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => handleDelete(member.id, member.name)}
                    className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-all">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Contact */}
              <div className="space-y-1.5">
                {member.phone && (
                  <a href={`tel:${member.phone}`} className="flex items-center gap-2 text-sm text-gray-300 hover:text-white transition-colors group">
                    <Phone className="w-3.5 h-3.5 text-gray-500 group-hover:text-[#D4AF37]" />
                    {member.phone}
                  </a>
                )}
                {member.email && (
                  <a href={`mailto:${member.email}`} className="flex items-center gap-2 text-sm text-gray-300 hover:text-white transition-colors group">
                    <Mail className="w-3.5 h-3.5 text-gray-500 group-hover:text-[#D4AF37]" />
                    {member.email}
                  </a>
                )}
                {!member.phone && !member.email && (
                  <p className="text-gray-600 text-xs">Aucune coordonnée renseignée</p>
                )}
              </div>

              {/* Notes */}
              {member.notes && (
                <p className="text-gray-500 text-xs border-t border-white/[0.05] pt-3">{member.notes}</p>
              )}

              {/* Assigned properties */}
              <div className="border-t border-white/[0.05] pt-3">
                <p className="text-gray-500 text-xs mb-2 flex items-center gap-1.5">
                  <Home className="w-3 h-3" />
                  {member.properties.length > 0
                    ? `${member.properties.length} logement${member.properties.length > 1 ? 's' : ''} assigné${member.properties.length > 1 ? 's' : ''}`
                    : 'Aucun logement assigné'}
                </p>
                {member.properties.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {member.properties.map(p => (
                      <span key={p.id} className="text-xs px-2 py-0.5 rounded-lg bg-white/[0.05] text-gray-300 border border-white/[0.06]">
                        {p.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}
        title={editing ? 'Modifier le membre' : 'Ajouter un membre'}>
        <div className="space-y-4">
          <Input label="Nom *" value={form.name}
            onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Marie Dupont" />

          <Select label="Rôle" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
            {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
          </Select>

          <Input label="Téléphone" value={form.phone}
            onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="06 XX XX XX XX" />

          <Input label="Email" type="email" value={form.email}
            onChange={e => setForm({ ...form, email: e.target.value })} placeholder="marie@exemple.fr" />

          <div>
            <label className="block text-sm text-gray-400 mb-1.5">Notes</label>
            <textarea
              value={form.notes}
              onChange={e => setForm({ ...form, notes: e.target.value })}
              rows={3}
              placeholder="Disponibilités, remarques..."
              className="w-full bg-[#1b1b1b] border border-[#2e2e2e] rounded-xl px-3 py-2.5 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-[#D4AF37]/50 resize-none"
            />
          </div>

          {error && <p className="text-red-400 text-sm bg-red-400/10 px-3 py-2 rounded-lg">{error}</p>}

          <div className="flex gap-3 justify-end">
            <Button variant="ghost" onClick={() => setIsModalOpen(false)}>Annuler</Button>
            <Button isLoading={saving} onClick={handleSave}>
              {editing ? 'Enregistrer' : 'Ajouter'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
