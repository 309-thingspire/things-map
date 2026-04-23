'use client'

import { useEffect, useState } from 'react'
import { Copy, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import type { User } from '@/types'

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [newUser, setNewUser] = useState({ name: '', team: '', role: 'USER' })
  const [createdCode, setCreatedCode] = useState<{ name: string; code: string } | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)

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

  async function handleCreate() {
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newUser),
    })
    if (res.ok) {
      const json = await res.json()
      setCreatedCode({ name: json.data.name, code: json.data.approvalCode })
      setNewUser({ name: '', team: '', role: 'USER' })
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

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">계정 관리</h1>
        <Button onClick={() => setDialogOpen(true)}>+ 승인코드 발급</Button>
      </div>

      {createdCode && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-xl">
          <p className="text-sm font-medium text-green-800">{createdCode.name} 승인코드:</p>
          <div className="flex items-center gap-2 mt-1">
            <code className="text-sm font-mono bg-white border rounded px-2 py-1 flex-1 break-all">{createdCode.code}</code>
            <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(createdCode.code); }}>복사</Button>
          </div>
        </div>
      )}

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
              {users.map((user) => (
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
                    <Button size="sm" variant="outline" onClick={() => toggleActive(user)}>
                      {user.isActive ? '비활성화' : '활성화'}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>승인코드 발급</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input placeholder="이름" value={newUser.name} onChange={(e) => setNewUser({ ...newUser, name: e.target.value })} />
            <Input placeholder="팀 (예: 개발팀)" value={newUser.team} onChange={(e) => setNewUser({ ...newUser, team: e.target.value })} />
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
    </div>
  )
}
