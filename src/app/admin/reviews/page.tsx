'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface ReviewRow {
  id: string
  storeId: string
  store: { name: string }
  user: { name: string; team: string }
  scoreTotal: number
  content: string | null
  status: string
  createdAt: string
}

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState<ReviewRow[]>([])
  const [loading, setLoading] = useState(true)

  async function fetchReviews() {
    const res = await fetch('/api/admin/reviews')
    if (res.ok) {
      const json = await res.json()
      setReviews(json.data.reviews)
    }
    setLoading(false)
  }

  useEffect(() => { fetchReviews() }, [])

  async function updateStatus(id: string, status: string) {
    await fetch(`/api/reviews/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    fetchReviews()
  }

  const statusLabel: Record<string, string> = { ACTIVE: '활성', HIDDEN: '숨김', REPORTED: '신고됨' }
  const statusVariant: Record<string, 'default' | 'secondary' | 'destructive'> = {
    ACTIVE: 'default',
    HIDDEN: 'secondary',
    REPORTED: 'destructive',
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">리뷰 관리</h1>

      {loading ? (
        <p className="text-gray-400">불러오는 중...</p>
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">매장</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">작성자</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">평점</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">내용</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">상태</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">관리</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {reviews.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">{r.store?.name}</td>
                  <td className="px-4 py-3">{r.user.name} <span className="text-gray-400 text-xs">({r.user.team})</span></td>
                  <td className="px-4 py-3 text-amber-500 font-medium">★ {r.scoreTotal.toFixed(1)}</td>
                  <td className="px-4 py-3 text-gray-600 max-w-xs truncate">{r.content ?? '-'}</td>
                  <td className="px-4 py-3">
                    <Badge variant={statusVariant[r.status]}>{statusLabel[r.status]}</Badge>
                  </td>
                  <td className="px-4 py-3 text-right space-x-1">
                    {r.status !== 'ACTIVE' && (
                      <Button size="sm" variant="outline" onClick={() => updateStatus(r.id, 'ACTIVE')}>활성화</Button>
                    )}
                    {r.status !== 'HIDDEN' && (
                      <Button size="sm" variant="secondary" onClick={() => updateStatus(r.id, 'HIDDEN')}>숨기기</Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
