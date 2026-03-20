'use client'

import { useEffect, useState, useCallback } from 'react'
import { Users, Edit2, Plus, Crown, Medal, TrendingUp, Star, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { LoadingPage } from '@/components/ui/LoadingSpinner'

// ─── Types ────────────────────────────────────────────────────────────────────

interface TeamUser {
  id: number
  name: string
  color: string
  photo?: string | null
  role: string
  totalSigned: number
  totalAppointments: number
  goalsAchieved: number
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

function Avatar({ user, size = 'md' }: { user: TeamUser; size?: 'sm' | 'md' | 'lg' }) {
  const sizes = { sm: 'w-8 h-8 text-sm', md: 'w-14 h-14 text-xl', lg: 'w-20 h-20 text-3xl' }
  if (user.photo) {
    return <img src={user.photo} alt={user.name} className={`${sizes[size]} rounded-2xl object-cover flex-shrink-0`} />
  }
  return (
    <div
      className={`${sizes[size]} rounded-2xl flex items-center justify-center text-white font-bold flex-shrink-0`}
      style={{ backgroundColor: user.color }}
    >
      {user.name.charAt(0)}
    </div>
  )
}

// ─── Member Form Modal ────────────────────────────────────────────────────────

const COLORS = ['#D4AF37', '#3B82F6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4']

function MemberModal({
  isOpen,
  onClose,
  initial,
  onSave,
}: {
  isOpen: boolean
  onClose: () => void
  initial: TeamUser | null
  onSave: (data: { name: string; color: string; pin: string; photo: string; role: string }) => Promise<void>
}) {
  const isEdit = !!initial
  const [form, setForm] = useState({ name: '', color: '#D4AF37', pin: '', photo: '', role: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setForm({
        name: initial?.name ?? '',
        color: initial?.color ?? '#D4AF37',
        pin: '',
        photo: initial?.photo ?? '',
        role: initial?.role ?? '',
      })
    }
  }, [isOpen, initial])

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => setForm(f => ({ ...f, photo: ev.target?.result as string }))
    reader.readAsDataURL(file)
  }

  const handleSave = async () => {
    if (!form.name.trim()) return
    if (!isEdit && form.pin.length !== 4) return
    setSaving(true)
    await onSave(form)
    setSaving(false)
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isEdit ? `Modifier — ${initial?.name}` : 'Ajouter un membre'}>
      <div className="space-y-5">
        {/* Photo */}
        <div className="flex items-center gap-4">
          <div
            className="w-16 h-16 rounded-2xl flex-shrink-0 flex items-center justify-center text-white font-bold text-2xl overflow-hidden"
            style={{ backgroundColor: form.photo ? 'transparent' : form.color }}
          >
            {form.photo ? (
              <img src={form.photo} alt="Photo" className="w-full h-full object-cover" />
            ) : (
              form.name.charAt(0) || '?'
            )}
          </div>
          <div className="space-y-2 flex-1">
            <p className="text-sm text-white/40 font-medium">Photo de profil</p>
            <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white/60 hover:text-white transition-all bg-white/5 border border-white/[0.08]">
              Choisir une image
              <input type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
            </label>
            {form.photo && (
              <button onClick={() => setForm(f => ({ ...f, photo: '' }))} className="text-xs text-red-400/60 hover:text-red-400 transition-colors ml-2">
                Supprimer
              </button>
            )}
          </div>
        </div>

        <Input
          label="Prénom / Nom"
          value={form.name}
          onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
          placeholder="ex: Florian"
        />

        <Input
          label="Poste / Fonction"
          value={form.role}
          onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
          placeholder="ex: Gestionnaire, Commercial, Ménage..."
        />

        <div>
          <p className="text-sm text-white/40 font-medium mb-2">Couleur</p>
          <div className="flex items-center gap-2 flex-wrap">
            {COLORS.map(c => (
              <button
                key={c}
                onClick={() => setForm(f => ({ ...f, color: c }))}
                className="w-8 h-8 rounded-lg transition-all"
                style={{
                  backgroundColor: c,
                  outline: form.color === c ? '2px solid white' : 'none',
                  outlineOffset: '2px',
                  transform: form.color === c ? 'scale(1.15)' : 'scale(1)',
                }}
              />
            ))}
          </div>
        </div>

        <div>
          <label className="text-sm text-white/40 font-medium block mb-1.5">
            {isEdit ? 'Nouveau code PIN (laisser vide pour ne pas changer)' : 'Code PIN — 4 chiffres *'}
          </label>
          <input
            type="password"
            maxLength={4}
            inputMode="numeric"
            value={form.pin}
            onChange={e => setForm(f => ({ ...f, pin: e.target.value.replace(/\D/g, '').slice(0, 4) }))}
            placeholder={isEdit ? 'Laisser vide pour conserver' : '••••'}
            className="w-full bg-[#1b1b1b] border border-white/[0.08] rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-[#D4AF37]/40 transition-colors text-sm tracking-widest"
          />
          {form.pin.length > 0 && form.pin.length < 4 && (
            <p className="text-amber-400 text-xs mt-1">{4 - form.pin.length} chiffre(s) restant(s)</p>
          )}
          {form.pin.length === 4 && <p className="text-green-400 text-xs mt-1">✓ PIN valide</p>}
        </div>

        <div className="flex gap-3 justify-end pt-2">
          <Button variant="ghost" onClick={onClose}>Annuler</Button>
          <Button
            isLoading={saving}
            onClick={handleSave}
            disabled={!form.name.trim() || (!isEdit && form.pin.length !== 4)}
          >
            {isEdit ? 'Enregistrer' : 'Ajouter'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function EquipePage() {
  const [users, setUsers] = useState<TeamUser[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<TeamUser | null>(null)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/team')
      const data = await res.json()
      if (Array.isArray(data.users)) setUsers(data.users)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const openAdd = () => { setEditingUser(null); setModalOpen(true) }
  const openEdit = (user: TeamUser) => { setEditingUser(user); setModalOpen(true) }

  const handleSave = async (form: { name: string; color: string; pin: string; photo: string; role: string }) => {
    if (editingUser) {
      await fetch(`/api/users/${editingUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
    } else {
      await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
    }
    await load()
  }

  if (loading) return <LoadingPage />

  const sorted = [...users].sort((a, b) => b.totalSigned - a.totalSigned)
  const rankIcons = [Crown, Medal, Medal]
  const rankColors = ['text-[#D4AF37]', 'text-gray-300', 'text-amber-600']

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Équipe</h1>
          <p className="text-white/40 mt-1">{users.length} membre{users.length > 1 ? 's' : ''}</p>
        </div>
        <Button onClick={openAdd}>
          <Plus className="w-4 h-4 mr-1.5" />
          Ajouter un membre
        </Button>
      </div>

      {/* Members Grid */}
      {users.length === 0 ? (
        <div className="text-center py-16 bg-[#181818] border border-white/[0.06] rounded-2xl">
          <Users className="w-10 h-10 text-white/10 mx-auto mb-3" />
          <p className="text-white/40 text-sm mb-4">Aucun membre dans l&apos;équipe</p>
          <Button onClick={openAdd}>
            <Plus className="w-4 h-4 mr-1.5" />
            Ajouter le premier membre
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {users.map(user => (
            <div
              key={user.id}
              className="relative bg-[#181818] border border-white/[0.06] rounded-2xl p-5 hover:border-white/[0.12] transition-all"
            >
              {/* Color bar */}
              <div
                className="absolute top-0 left-6 right-6 h-0.5 rounded-b-full"
                style={{ backgroundColor: user.color }}
              />

              <div className="flex items-start justify-between mt-1">
                <div className="flex items-center gap-3">
                  <Avatar user={user} size="md" />
                  <div>
                    <p className="text-white font-semibold">{user.name}</p>
                    {user.role ? (
                      <Badge variant="default" className="mt-1">{user.role}</Badge>
                    ) : (
                      <p className="text-white/30 text-xs mt-0.5 italic">Aucun poste défini</p>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => openEdit(user)}
                  className="p-2 rounded-xl text-white/20 hover:text-[#D4AF37] hover:bg-[#D4AF37]/10 transition-all flex-shrink-0"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
              </div>

              {/* Mini stats */}
              <div className="flex items-center gap-2 mt-4 pt-4 border-t border-white/[0.04]">
                <div className="flex items-center gap-1.5 text-[#D4AF37]">
                  <Star className="w-3.5 h-3.5" />
                  <span className="font-bold text-sm">{user.totalSigned}</span>
                  <span className="text-white/30 text-xs">signatures</span>
                </div>
                <div className="w-px h-4 bg-white/10" />
                <div className="flex items-center gap-1.5 text-purple-400">
                  <Calendar className="w-3.5 h-3.5" />
                  <span className="font-bold text-sm">{user.totalAppointments}</span>
                  <span className="text-white/30 text-xs">visites</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Leaderboard */}
      {users.length > 1 && (
        <div className="bg-[#181818] border border-white/[0.06] rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-[#D4AF37]/20 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-[#D4AF37]" />
            </div>
            <h3 className="text-white font-semibold">Classement</h3>
            <span className="ml-auto text-white/30 text-xs">Signatures cumulées</span>
          </div>
          <div className="space-y-2">
            {sorted.map((user, i) => {
              const RankIcon = rankIcons[i] ?? TrendingUp
              const rankColor = rankColors[i] ?? 'text-white/40'
              return (
                <div
                  key={user.id}
                  className={`flex items-center gap-3 p-3 rounded-xl ${i === 0 ? 'bg-[#D4AF37]/5 border border-[#D4AF37]/10' : 'bg-[#141414]'}`}
                >
                  <RankIcon className={`w-4 h-4 ${rankColor} flex-shrink-0`} />
                  <Avatar user={user} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium">{user.name}</p>
                    {user.role && <p className="text-white/30 text-xs truncate">{user.role}</p>}
                  </div>
                  <div className="flex items-center gap-1">
                    <Star className="w-3.5 h-3.5 text-[#D4AF37]" />
                    <span className="text-[#D4AF37] font-bold">{user.totalSigned}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <MemberModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        initial={editingUser}
        onSave={handleSave}
      />
    </div>
  )
}
