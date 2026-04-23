'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'

interface ReviewFormProps {
  storeId: string
  onSuccess?: () => void
}

export default function ReviewForm({ storeId, onSuccess }: ReviewFormProps) {
  const [score, setScore] = useState(0)
  const [content, setContent] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (score === 0) {
      setError('평점을 선택해주세요.')
      return
    }
    setError('')
    setLoading(true)

    try {
      const res = await fetch(`/api/stores/${storeId}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scoreTotal: score,
          scoreTaste: score,
          scorePrice: score,
          scoreService: score,
          scoreAmbiance: score,
          scoreCleanliness: score,
          content: content || null,
          visitedAt: null,
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error ?? '오류가 발생했습니다.')
        return
      }
      onSuccess?.()
    } catch {
      setError('서버 연결에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* 별점 */}
      <div className="flex flex-col items-center gap-2 py-2">
        <p className="text-sm text-gray-500">전체 평점</p>
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setScore(v)}
              className={`text-4xl transition-colors ${score >= v ? 'text-amber-400' : 'text-gray-200'} hover:text-amber-400`}
            >
              ★
            </button>
          ))}
        </div>
        {score > 0 && (
          <p className="text-sm font-semibold text-amber-500">{score}.0 / 5.0</p>
        )}
      </div>

      {/* 내용 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">리뷰 내용 (선택)</label>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="경험을 공유해주세요..."
          rows={3}
          className="border rounded-md px-3 py-2 text-sm w-full resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <Button type="submit" disabled={loading} className="w-full">
        {loading ? '제출 중...' : '리뷰 작성'}
      </Button>
    </form>
  )
}
