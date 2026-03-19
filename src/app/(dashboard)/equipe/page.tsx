'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  Trophy, Edit2, Star, Target, Check, Phone, Calendar,
  TrendingUp, Medal, Crown
} from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Select } from '@/components/ui/Select'
import { Badge } from '@/components/ui/Badge'
import { LoadingPage } from '@/components/ui/LoadingSpinner'
import { getMonthName } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────

interface TeamGoal {
  id: number
  userId: number
  reportId: number
  propertiesSigned: number
  appointmentsMade: number
  callsMade: number
  personalGoal: string | null
  goalStatus: string
}

interface TeamUser {
  id: number
  name: string
  color: string
  photo?: string | null
  totalSigned: number
  totalAppointments: number
  totalCalls: number
  goalsAchieved: number
  currentGoal: TeamGoal | null
}

interface Report {
  id: number
  month: number
  year: number
  teamGoals: Array<TeamGoal & { user: TeamUser }>
}

interface TeamData {
  users: TeamUser[]
  currentReport: Report | null
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

function Avatar({ user, size = 'md' }: { user: TeamUser; size?: 'sm' | 'md' | 'lg' }) {
  const sizes = { sm: 'w-8 h-8 text-sm', md: 'w-11 h-11 text-base', lg: 'w-14 h-14 text-xl' }
  const cls = sizes[size]
  if (user.photo) {
    return <img src={user.photo} alt={user.name} className={`${cls} rounded-xl object-cover flex-shrink-0`} />
  }
  return (
    <div
      className={`${cls} rounded-xl flex items-center justify-center text-white font-bold flex-shrink-0`}
      style={{ backgroundColor: user.color }}
    >
      {user.name.charAt(0)}
    </div>
  )
}

// ─── Stat Pill ────────────────────────────────────────────────────────────────

function StatPill({
  icon: Icon,
  value,
  label,
  color,
}: {
  icon: React.ElementType
  value: number
  label: string
  color: string
}) {
  return (
    <div className="flex flex-col items-center gap-1 px-3 py-2 rounded-xl bg-[#141414] min-w-[64px]">
      <div className="flex items-center gap-1">
        <Icon className={`w-3.5 h-3.5 ${color}`} />
        <span className={`font-bold text-lg leading-none ${color}`}>{value}</span>
      </div>
      <span className="text-white/30 text-[10px]">{label}</span>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function EquipePage() {
  const [data, setData] = useState<TeamData | null>(null)
  const [loading, setLoading] = useState(true)
  const [reports, setReports] = useState<Array<{ id: number; month: number; year: number }>>([])
  const [selectedReportId, setSelectedReportId] = useState<number | null>(null)
  const [selectedReport, setSelectedReport] = useState<Report | null>(null)

  // Goal modal
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingUserId, setEditingUserId] = useState<number | null>(null)
  const [goalForm, setGoalForm] = useState({
    propertiesSigned: '0',
    appointmentsMade: '0',
    callsMade: '0',
    personalGoal: '',
    goalStatus: 'en_cours',
  })
  const [saving, setSaving] = useState(false)

  // User profile modal
  const [isUserModalOpen, setIsUserModalOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<TeamUser | null>(null)
  const [userForm, setUserForm] = useState({ name: '', color: '', photo: '', pin: '' })
  const [savingUser, setSavingUser] = useState(false)

  const COLORS = ['#D4AF37', '#3B82F6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4']

  const openUserModal = (user: TeamUser) => {
    setEditingUser(user)
    setUserForm({ name: user.name, color: user.color, photo: user.photo ?? '', pin: '' })
    setIsUserModalOpen(true)
  }

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => setUserForm((f) => ({ ...f, photo: ev.target?.result as string }))
    reader.readAsDataURL(file)
  }

  const handleSaveUser = async () => {
    if (!editingUser) return
    setSavingUser(true)
    await fetch(`/api/users/${editingUser.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userForm),
    })
    await loadData()
    setSavingUser(false)
    setIsUserModalOpen(false)
  }

  const loadData = useCallback(async () => {
    try {
      const [teamRes, reportsRes] = await Promise.all([
        fetch('/api/team'),
        fetch('/api/reports'),
      ])
      const [teamData, reportsData] = await Promise.all([teamRes.json(), reportsRes.json()])
      // Only store if valid response (has .users array)
      if (Array.isArray(teamData.users)) setData(teamData)
      if (Array.isArray(reportsData)) {
        setReports(reportsData)
        if (teamData.currentReport) {
          setSelectedReportId(teamData.currentReport.id)
          setSelectedReport(teamData.currentReport)
        } else if (reportsData.length > 0) {
          setSelectedReportId(reportsData[0].id)
          loadReportDetails(reportsData[0].id)
        }
      }
    } catch (e) {
      console.error('Team load error:', e)
    } finally {
      setLoading(false)
    }
  }, [])

  const loadReportDetails = async (reportId: number) => {
    const res = await fetch(`/api/reports/${reportId}`)
    const report = await res.json()
    setSelectedReport(report)
  }

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleSelectReport = async (reportId: number) => {
    setSelectedReportId(reportId)
    await loadReportDetails(reportId)
  }

  const openGoalModal = (userId: number) => {
    if (!selectedReport) return
    const existingGoal = selectedReport.teamGoals.find((g) => g.userId === userId)
    setEditingUserId(userId)
    setGoalForm({
      propertiesSigned: String(existingGoal?.propertiesSigned ?? 0),
      appointmentsMade: String(existingGoal?.appointmentsMade ?? 0),
      callsMade: String(existingGoal?.callsMade ?? 0),
      personalGoal: existingGoal?.personalGoal ?? '',
      goalStatus: existingGoal?.goalStatus ?? 'en_cours',
    })
    setIsModalOpen(true)
  }

  const handleSaveGoal = async () => {
    if (!selectedReport || !editingUserId) return
    setSaving(true)

    if (goalForm.goalStatus === 'atteint') {
      try {
        const confetti = (await import('canvas-confetti')).default
        confetti({
          particleCount: 150,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#D4AF37', '#E8C84D', '#B8962B', '#ffffff'],
        })
      } catch {}
    }

    await fetch('/api/team/goals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: editingUserId,
        reportId: selectedReport.id,
        ...goalForm,
      }),
    })

    await loadReportDetails(selectedReport.id)
    await loadData()
    setIsModalOpen(false)
    setSaving(false)
  }

  if (loading) return <LoadingPage />
  // Guard against API error responses (e.g. { error: '...' } with no .users)
  if (!data?.users) return <div className="text-gray-400 text-center py-20">Erreur de chargement de l'équipe</div>

  const sortedUsers = data.users.slice().sort((a, b) => b.totalSigned - a.totalSigned)
  const rankIcons = [Crown, Medal, Medal]
  const rankColors = ['text-[#D4AF37]', 'text-gray-300', 'text-amber-600']

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Équipe</h1>
          <p className="text-white/40 mt-1">Performances et objectifs mensuels</p>
        </div>
        {/* Team profile quick-access */}
        <div className="flex items-center gap-2">
          {data.users.map((user) => (
            <button
              key={user.id}
              onClick={() => openUserModal(user)}
              title={`Modifier ${user.name}`}
              className="relative group"
            >
              <Avatar user={user} size="sm" />
              <div className="absolute inset-0 rounded-xl bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Edit2 className="w-3 h-3 text-white" />
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Month Selector */}
      {reports.length > 0 && (
        <div className="flex items-center gap-3">
          <span className="text-white/40 text-sm flex-shrink-0">Mois :</span>
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {reports.slice(0, 10).map((r) => (
              <button
                key={r.id}
                onClick={() => handleSelectReport(r.id)}
                className={`px-3 py-1.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all flex-shrink-0 ${
                  selectedReportId === r.id
                    ? 'bg-[#D4AF37] text-black'
                    : 'bg-[#242424] border border-white/[0.06] text-white/40 hover:text-white hover:border-white/20'
                }`}
              >
                {getMonthName(r.month).substring(0, 3)} {r.year}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Monthly Goal Cards */}
      {selectedReport && (
        <div>
          <h2 className="text-white/60 text-sm font-medium mb-3 uppercase tracking-wider">
            {getMonthName(selectedReport.month)} {selectedReport.year}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {data.users.map((user) => {
              const goal = selectedReport.teamGoals.find((g) => g.userId === user.id)
              const isAchieved = goal?.goalStatus === 'atteint'

              return (
                <div
                  key={user.id}
                  className={`relative rounded-2xl border p-5 transition-all ${
                    isAchieved
                      ? 'border-green-500/20 bg-green-500/5'
                      : 'border-white/[0.06] bg-[#181818]'
                  }`}
                >
                  {/* Card header */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <Avatar user={user} size="md" />
                      <div>
                        <p className="text-white font-semibold">{user.name}</p>
                        <Badge variant={isAchieved ? 'success' : goal ? 'warning' : 'default'}>
                          {goal
                            ? isAchieved
                              ? '✓ Objectif atteint'
                              : 'En cours'
                            : 'Non défini'}
                        </Badge>
                      </div>
                    </div>
                    <button
                      onClick={() => openGoalModal(user.id)}
                      className="p-2 rounded-xl text-white/20 hover:text-[#D4AF37] hover:bg-[#D4AF37]/10 transition-all"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Stats */}
                  {goal ? (
                    <div className="flex items-center gap-2">
                      <StatPill icon={Star} value={goal.propertiesSigned} label="Signatures" color="text-[#D4AF37]" />
                      <StatPill icon={Calendar} value={goal.appointmentsMade} label="Visites" color="text-purple-400" />
                      <StatPill icon={Phone} value={goal.callsMade} label="Appels" color="text-green-400" />
                      {goal.personalGoal && (
                        <p className="text-white/30 text-xs italic ml-auto max-w-[120px] text-right line-clamp-2">
                          "{goal.personalGoal}"
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-3">
                      <p className="text-white/30 text-sm mb-3">Aucun objectif ce mois</p>
                      <Button size="sm" variant="outline" onClick={() => openGoalModal(user.id)}>
                        Définir un objectif
                      </Button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* No report */}
      {!selectedReport && reports.length === 0 && (
        <Card>
          <p className="text-white/40 text-sm text-center py-8">
            Aucun rapport mensuel disponible. Créez un rapport dans la section Rapports pour commencer.
          </p>
        </Card>
      )}

      {/* Leaderboard */}
      <Card>
        <div className="flex items-center gap-2 mb-5">
          <div className="w-8 h-8 rounded-lg bg-[#D4AF37]/20 flex items-center justify-center">
            <Trophy className="w-4 h-4 text-[#D4AF37]" />
          </div>
          <h3 className="text-white font-semibold">Classement général</h3>
          <span className="ml-auto text-white/30 text-xs">Cumulé toutes périodes</span>
        </div>

        <div className="space-y-3">
          {sortedUsers.map((user, index) => {
            const RankIcon = rankIcons[index] ?? TrendingUp
            const rankColor = rankColors[index] ?? 'text-white/40'
            const isFirst = index === 0

            return (
              <div
                key={user.id}
                className={`flex items-center gap-3 p-4 rounded-2xl border transition-all ${
                  isFirst
                    ? 'border-[#D4AF37]/20 bg-[#D4AF37]/5'
                    : 'border-white/[0.04] bg-[#141414]'
                }`}
              >
                <RankIcon className={`w-5 h-5 ${rankColor} flex-shrink-0`} />
                <Avatar user={user} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium text-sm">{user.name}</p>
                  <p className="text-white/30 text-xs">
                    {user.goalsAchieved} objectif(s) atteint(s)
                  </p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <div className="text-center hidden sm:block">
                    <div className="flex items-center gap-1 justify-center">
                      <Star className="w-3.5 h-3.5 text-[#D4AF37]" />
                      <span className="text-[#D4AF37] font-bold text-lg">{user.totalSigned}</span>
                    </div>
                    <p className="text-white/30 text-[10px]">signatures</p>
                  </div>
                  <div className="text-center hidden sm:block">
                    <div className="flex items-center gap-1 justify-center">
                      <Calendar className="w-3.5 h-3.5 text-purple-400" />
                      <span className="text-white font-bold text-lg">{user.totalAppointments}</span>
                    </div>
                    <p className="text-white/30 text-[10px]">visites</p>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center gap-1 justify-center">
                      <Phone className="w-3.5 h-3.5 text-green-400" />
                      <span className="text-green-400 font-bold text-lg">{user.totalCalls ?? 0}</span>
                    </div>
                    <p className="text-white/30 text-[10px]">appels</p>
                  </div>
                  {/* Mobile: just signatures */}
                  <div className="text-center sm:hidden">
                    <div className="flex items-center gap-1 justify-center">
                      <Star className="w-3.5 h-3.5 text-[#D4AF37]" />
                      <span className="text-[#D4AF37] font-bold text-lg">{user.totalSigned}</span>
                    </div>
                    <p className="text-white/30 text-[10px]">sign.</p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </Card>

      {/* User Profile Modal */}
      <Modal
        isOpen={isUserModalOpen}
        onClose={() => setIsUserModalOpen(false)}
        title={`Modifier — ${editingUser?.name}`}
      >
        <div className="space-y-5">
          {/* Photo */}
          <div className="flex items-center gap-4">
            <div className="flex-shrink-0">
              {userForm.photo ? (
                <img src={userForm.photo} alt="Photo" className="w-16 h-16 rounded-2xl object-cover" />
              ) : (
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center text-white font-bold text-2xl"
                  style={{ backgroundColor: userForm.color || editingUser?.color }}
                >
                  {userForm.name.charAt(0) || editingUser?.name.charAt(0)}
                </div>
              )}
            </div>
            <div className="flex-1 space-y-2">
              <label className="text-sm text-white/40 font-medium block">Photo de profil</label>
              <label
                className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white/60 hover:text-white transition-all"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
              >
                <span>Choisir une image</span>
                <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
              </label>
              {userForm.photo && (
                <button
                  onClick={() => setUserForm((f) => ({ ...f, photo: '' }))}
                  className="text-xs text-red-400/60 hover:text-red-400 transition-colors ml-2"
                >
                  Supprimer
                </button>
              )}
            </div>
          </div>

          <Input
            label="Prénom"
            value={userForm.name}
            onChange={(e) => setUserForm((f) => ({ ...f, name: e.target.value }))}
          />

          <div>
            <label className="text-sm text-white/40 font-medium block mb-2">Couleur</label>
            <div className="flex items-center gap-2 flex-wrap">
              {COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setUserForm((f) => ({ ...f, color: c }))}
                  className="w-8 h-8 rounded-lg transition-all"
                  style={{
                    backgroundColor: c,
                    outline: userForm.color === c ? '2px solid white' : 'none',
                    outlineOffset: '2px',
                    transform: userForm.color === c ? 'scale(1.15)' : 'scale(1)',
                  }}
                />
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm text-white/40 font-medium block mb-1.5">
              Nouveau code PIN (4 chiffres)
            </label>
            <input
              type="password"
              maxLength={4}
              inputMode="numeric"
              pattern="[0-9]{4}"
              value={userForm.pin}
              onChange={(e) =>
                setUserForm((f) => ({ ...f, pin: e.target.value.replace(/\D/g, '').slice(0, 4) }))
              }
              placeholder="Laisser vide pour ne pas changer"
              className="w-full bg-[#1b1b1b] border border-white/[0.08] rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-[#D4AF37]/40 transition-colors text-sm tracking-widest"
            />
            {userForm.pin.length > 0 && userForm.pin.length < 4 && (
              <p className="text-amber-400 text-xs mt-1">{4 - userForm.pin.length} chiffre(s) restant(s)</p>
            )}
            {userForm.pin.length === 4 && (
              <p className="text-green-400 text-xs mt-1">✓ PIN valide</p>
            )}
          </div>

          <div className="flex gap-3 justify-end pt-2">
            <Button variant="ghost" onClick={() => setIsUserModalOpen(false)}>Annuler</Button>
            <Button isLoading={savingUser} onClick={handleSaveUser}>Enregistrer</Button>
          </div>
        </div>
      </Modal>

      {/* Goal Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Saisir les résultats du mois"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs text-white/40 flex items-center gap-1">
                <Star className="w-3 h-3 text-[#D4AF37]" /> Signatures
              </label>
              <input
                type="number"
                min="0"
                value={goalForm.propertiesSigned}
                onChange={(e) => setGoalForm({ ...goalForm, propertiesSigned: e.target.value })}
                className="w-full bg-[#1b1b1b] border border-white/[0.08] rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#D4AF37]/40 transition-colors"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-white/40 flex items-center gap-1">
                <Calendar className="w-3 h-3 text-purple-400" /> Visites
              </label>
              <input
                type="number"
                min="0"
                value={goalForm.appointmentsMade}
                onChange={(e) => setGoalForm({ ...goalForm, appointmentsMade: e.target.value })}
                className="w-full bg-[#1b1b1b] border border-white/[0.08] rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#D4AF37]/40 transition-colors"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-white/40 flex items-center gap-1">
                <Phone className="w-3 h-3 text-green-400" /> Appels
              </label>
              <input
                type="number"
                min="0"
                value={goalForm.callsMade}
                onChange={(e) => setGoalForm({ ...goalForm, callsMade: e.target.value })}
                className="w-full bg-[#1b1b1b] border border-white/[0.08] rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#D4AF37]/40 transition-colors"
              />
            </div>
          </div>

          <Textarea
            label="Objectif personnel"
            value={goalForm.personalGoal}
            onChange={(e) => setGoalForm({ ...goalForm, personalGoal: e.target.value })}
            placeholder="Décrivez votre objectif pour ce mois..."
            rows={2}
          />

          <Select
            label="Statut"
            value={goalForm.goalStatus}
            onChange={(e) => setGoalForm({ ...goalForm, goalStatus: e.target.value })}
          >
            <option value="en_cours">En cours</option>
            <option value="atteint">Atteint 🎉</option>
            <option value="non_atteint">Non atteint</option>
          </Select>

          {goalForm.goalStatus === 'atteint' && (
            <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/20 rounded-xl p-3">
              <Check className="w-4 h-4 text-green-400" />
              <p className="text-green-400 text-sm">Félicitations ! Des confettis vous attendent 🎊</p>
            </div>
          )}

          <div className="flex gap-3 justify-end">
            <Button variant="ghost" onClick={() => setIsModalOpen(false)}>Annuler</Button>
            <Button isLoading={saving} onClick={handleSaveGoal}>Enregistrer</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
