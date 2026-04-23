'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface Props {
  onClose: () => void
}

export default function RequestModal({ onClose }: Props) {
  const [form, setForm] = useState({ name: '', address: '', phone: '', category: '', themeTags: '', menus: '' })
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError('')

    const payload = {
      name: form.name,
      address: form.address || null,
      phone: form.phone || null,
      categoryName: form.category || null,
      themeTags: form.themeTags.split(',').map(t => t.trim()).filter(Boolean),
      menus: form.menus ? form.menus.split(',').map(m => ({ name: m.trim() })) : [],
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
      {/* Backdrop */}
      <div className="fixed inset-0 z-[60] bg-black/50" onClick={onClose} />

      {/* Modal */}
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
              <form onSubmit={handleSubmit} className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">매장명 <span className="text-red-500">*</span></label>
                  <Input placeholder="예: 성수동 XX카페" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">주소</label>
                  <Input placeholder="예: 서울 성동구 성수동..." value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">전화번호</label>
                  <Input placeholder="예: 02-000-0000" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">카테고리</label>
                  <Input placeholder="예: 카페, 한식, 이탈리안..." value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">테마 태그 <span className="text-xs text-gray-400">(쉼표로 구분)</span></label>
                  <Input placeholder="예: 데이트, 혼밥, 주차" value={form.themeTags} onChange={e => setForm({ ...form, themeTags: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">대표 메뉴 <span className="text-xs text-gray-400">(쉼표로 구분)</span></label>
                  <Input placeholder="예: 아메리카노, 크로플" value={form.menus} onChange={e => setForm({ ...form, menus: e.target.value })} />
                </div>

                {error && <p className="text-sm text-red-500">{error}</p>}

                <div className="flex gap-3 pt-1">
                  <Button type="button" variant="outline" className="flex-1" onClick={onClose}>취소</Button>
                  <Button type="submit" disabled={submitting} className="flex-1">
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
