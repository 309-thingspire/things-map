'use client'

import { useState } from 'react'
import { X, MapPin } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import StoreSearchInput, { type StoreSuggestion } from './StoreSearchInput'

interface Props {
  onClose: () => void
}

export default function RequestModal({ onClose }: Props) {
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<StoreSuggestion | null>(null)
  const [memo, setMemo] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  function handleSelect(r: StoreSuggestion) {
    setSelected(r)
    setError('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selected) { setError('매장을 검색 후 선택해주세요.'); return }
    setSubmitting(true)
    setError('')

    const payload = {
      name: selected.name,
      address: selected.address,
      phone: selected.phone ?? null,
      categoryName: selected.category ?? null,
      themeTags: [],
      menus: [],
      memo: memo || null,
      lat: selected.lat,
      lng: selected.lng,
      naverUrl: selected.naverUrl,
    }

    const res = await fetch('/api/requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requestType: 'NEW', payload }),
    })

    if (res.ok) {
      setDone(true)
    } else {
      const json = await res.json()
      setError(json.error ?? '오류가 발생했습니다.')
    }
    setSubmitting(false)
  }

  return (
    <>
      <div className="fixed inset-0 z-[60] bg-black/50" onClick={onClose} />

      <div className="fixed inset-0 z-[61] flex items-center justify-center p-4 pointer-events-none">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl pointer-events-auto flex flex-col max-h-[90vh]">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b shrink-0">
            <h2 className="font-semibold text-gray-900">매장 등록 요청</h2>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto min-h-0 p-5">
            {done ? (
              <div className="text-center py-8">
                <div className="text-4xl mb-3">✅</div>
                <p className="font-semibold text-gray-900 mb-1">요청이 접수되었습니다</p>
                <p className="text-sm text-gray-500 mb-5">관리자 검토 후 등록됩니다.</p>
                <Button onClick={onClose} className="w-full">닫기</Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    매장 검색 <span className="text-red-500">*</span>
                  </label>
                  <StoreSearchInput
                    value={query}
                    onChange={setQuery}
                    onSelect={handleSelect}
                    placeholder="매장명으로 검색 (예: 스타벅스)"
                  />
                  <p className="text-xs text-gray-400 mt-1">회사 기준 가까운 지점 순으로 표시됩니다.</p>
                </div>

                {/* 선택된 매장 미리보기 */}
                {selected && (
                  <div className="bg-gray-50 rounded-xl p-3 flex items-start gap-2.5">
                    <MapPin size={15} className="text-blue-500 mt-0.5 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900">{selected.name}</p>
                      <p className="text-xs text-gray-500 truncate">{selected.address}</p>
                      <p className="text-xs text-blue-500 mt-0.5">도보 {selected.walkingMinutes}분</p>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    메모 <span className="text-xs text-gray-400">(선택)</span>
                  </label>
                  <Input
                    placeholder="추천 이유, 메뉴 등 자유롭게"
                    value={memo}
                    onChange={(e) => setMemo(e.target.value)}
                  />
                </div>

                {error && <p className="text-sm text-red-500">{error}</p>}

                <div className="flex gap-3 pt-1">
                  <Button type="button" variant="outline" className="flex-1" onClick={onClose}>취소</Button>
                  <Button type="submit" disabled={submitting || !selected} className="flex-1">
                    {submitting ? '제출 중...' : '등록 요청'}
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
