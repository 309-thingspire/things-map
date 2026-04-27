'use client'

import { useEffect, useState, useMemo } from 'react'
import { Copy, Check, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { toast } from '@/components/ui/Toaster'
import type { User } from '@/types'

const TEAMS = ['탄소플랫폼', '에너지플랫폼', '경영지원', 'CTO팀', '기타']

type SortKey = 'name' | 'team'

interface EditState {
  id: string
  team: string
  teamCustom: string   // '기타' 선택 시 직접 입력값
  role: string
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [sortKey, setSortKey] = useState<SortKey>('name')
  const [createOpen, setCreateOpen] = useState(false)
  const [newUser, setNewUser] = useState({ name: '', team: '', role: 'USER' })
  const [newTeamCustom, setNewTeamCustom] = useState('')
  const [createdCode, setCreatedCode] = useState<{ name: string; code: string } | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [editState, setEditState] = useState<EditState | null>(null)
  const [saving, setSaving] = useState(false)

  function copyCode(id: string, code: string) {
    navigator.clipboard.writeText(code)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 1500)
  }

  async function fetchUsers() {
    const res = await fetch('/api/users')
    if (res.ok) {
      const json = await res.json()
      setUsers(json.data.users)
    }
    setLoading(false)
  }

  useEffect(() => { fetchUsers() }, [])

  const sortedUsers = useMemo(() => {
    return [...users].sort((a, b) => {
      if (sortKey === 'team') {
        const teamCmp = a.team.localeCompare(b.team, 'ko')
        return teamCmp !== 0 ? teamCmp : a.name.localeCompare(b.name, 'ko')
      }
      return a.name.localeCompare(b.name, 'ko')
    })
  }, [users, sortKey])

  /** TEAMS 목록에 없는 팀은 '기타'로 취급 */
  function resolveTeamSelect(team: string) {
    return TEAMS.includes(team) ? team : '기타'
  }

  function openEdit(user: User) {
    const sel = resolveTeamSelect(user.team)
    setEditState({
      id: user.id,
      team: sel,
      teamCustom: sel === '기타' ? user.team : '',
      role: user.role,
    })
  }

  function effectiveTeam(state: EditState) {
    return state.team === '기타' ? state.teamCustom.trim() : state.team
  }

  async function handleCreate() {
    const team = newUser.team === '기타' ? newTeamCustom.trim() : newUser.team
    if (!newUser.name || !team) return
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...newUser, team }),
    })
    if (res.ok) {
      const json = await res.json()
      setCreatedCode({ name: json.data.name, code: json.data.approvalCode })
      setNewUser({ name: '', team: '', role: 'USER' })
      setNewTeamCustom('')
      setCreateOpen(false)
      fetchUsers()
    }
  }

  async function toggleActive(user: User) {
    await fetch(`/api/users/${user.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !user.isActive }),
    })
    fetchUsers()
  }

  async function handleSaveEdit() {
    if (!editState) return
    const team = effectiveTeam(editState)
    if (!team) { toast('팀을 입력해주세요.', 'error'); return }
    setSaving(true)
    const res = await fetch(`/api/users/${editState.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ team, role: editState.role }),
    })
    setSaving(false)
    if (res.ok) {
      toast('저장되었습니다.')
      setEditState(null)
      fetchUsers()
    } else {
      toast('저장에 실패했습니다.', 'error')
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">계정 관리</h1>
        <Button onClick={() => setCreateOpen(true)}>+ 승인코드 발급</Button>
      </div>

      {createdCode && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-xl">
          <p className="text-sm font-medium text-green-800">{createdCode.name} 승인코드:</p>
          <div className="flex items-center gap-2 mt-1">
            <code className="text-sm font-mono bg-white border rounded px-2 py-1 flex-1 break-all">{createdCode.code}</code>
            <Button size="sm" variant="outline" onClick={() => navigator.clipboard.writeText(createdCode.code)}>복사</Button>
          </div>
        </div>
      )}

      {/* 정렬 탭 */}
      <div className="flex gap-1 mb-3 bg-gray-100 p-1 rounded-lg w-fit">
        {(['name', 'team'] as SortKey[]).map((key) => (
          <button
            key={key}
            onClick={() => setSortKey(key)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              sortKey === key ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {key === 'name' ? '이름순' : '팀별'}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-gray-400">불러오는 중...</p>
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">이름</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">팀</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">역할</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">승인코드</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">마지막 로그인</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">상태</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">관리</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {sortedUsers.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{user.name}</td>
                  <td className="px-4 py-3 text-gray-500">{user.team}</td>
                  <td className="px-4 py-3">
                    <Badge variant={user.role === 'ADMIN' ? 'default' : 'secondary'}>
                      {user.role === 'ADMIN' ? '관리자' : '일반'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <code className="text-xs font-mono bg-gray-50 border rounded px-2 py-0.5">{user.approvalCode ?? '-'}</code>
                      {user.approvalCode && (
                        <button
                          onClick={() => copyCode(user.id, user.approvalCode!)}
                          className="p-0.5 text-gray-400 hover:text-gray-700 transition-colors"
                          title="복사"
                        >
                          {copiedId === user.id ? <Check size={13} className="text-green-500" /> : <Copy size={13} />}
                        </button>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {user.lastLogin ? new Date(user.lastLogin).toLocaleString('ko-KR') : '없음'}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={user.isActive ? 'default' : 'destructive'}>
                      {user.isActive ? '활성' : '비활성'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openEdit(user)}
                        className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                        title="정보 수정"
                      >
                        <Pencil size={14} />
                      </button>
                      <Button size="sm" variant="outline" onClick={() => toggleActive(user)}>
                        {user.isActive ? '비활성화' : '활성화'}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 승인코드 발급 모달 */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>승인코드 발급</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input placeholder="이름" value={newUser.name} onChange={(e) => setNewUser({ ...newUser, name: e.target.value })} />
            <div className="space-y-2">
              <select
                className="w-full border rounded-md px-3 py-2 text-sm"
                value={newUser.team}
                onChange={(e) => setNewUser({ ...newUser, team: e.target.value })}
              >
                <option value="" disabled>팀 선택</option>
                {TEAMS.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
              {newUser.team === '기타' && (
                <Input
                  placeholder="팀명 직접 입력"
                  value={newTeamCustom}
                  onChange={(e) => setNewTeamCustom(e.target.value)}
                />
              )}
            </div>
            <select
              className="w-full border rounded-md px-3 py-2 text-sm"
              value={newUser.role}
              onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
            >
              <option value="USER">일반 사용자</option>
              <option value="ADMIN">관리자</option>
            </select>
            <Button className="w-full" onClick={handleCreate}>발급</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 정보 수정 모달 */}
      <Dialog open={!!editState} onOpenChange={(open) => { if (!open) setEditState(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>정보 수정</DialogTitle>
          </DialogHeader>
          {editState && (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">팀</label>
                <select
                  className="w-full border rounded-md px-3 py-2 text-sm"
                  value={editState.team}
                  onChange={(e) => setEditState({ ...editState, team: e.target.value, teamCustom: '' })}
                >
                  {TEAMS.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
                {editState.team === '기타' && (
                  <Input
                    placeholder="팀명 직접 입력"
                    value={editState.teamCustom}
                    onChange={(e) => setEditState({ ...editState, teamCustom: e.target.value })}
                  />
                )}
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700">역할</label>
                <select
                  className="w-full border rounded-md px-3 py-2 text-sm"
                  value={editState.role}
                  onChange={(e) => setEditState({ ...editState, role: e.target.value })}
                >
                  <option value="USER">일반 사용자</option>
                  <option value="ADMIN">관리자</option>
                </select>
              </div>
              <div className="flex gap-2 pt-1">
                <Button variant="outline" className="flex-1" onClick={() => setEditState(null)}>취소</Button>
                <Button className="flex-1" onClick={handleSaveEdit} disabled={saving}>
                  {saving ? '저장 중…' : '저장'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
