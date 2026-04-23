'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/hooks/useAuth'

export default function RequestPage() {
  const router = useRouter()
  const { user, loading } = useAuth()
  const [form, setForm] = useState({
    name: '', address: '', phone: '', category: '', themeTags: '', menus: ''
  })
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  if (!loading && !user) {
    router.push('/login')
    return null
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError('')

    const payload = {
      name: form.name,
      address: form.address,
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

  if (done) {
    return (
      <div className="max-w-lg mx-auto mt-16 text-center p-8">
        <div className="text-5xl mb-4">✅</div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">요청이 접수되었습니다</h2>
        <p className="text-gray-500 text-sm mb-6">관리자 검토 후 등록됩니다.</p>
        <Button onClick={() => router.push('/')}>홈으로</Button>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto p-6 mt-4">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">매장 등록 요청</h1>
      <p className="text-sm text-gray-500 mb-6">관리자가 검토 후 지도에 등록됩니다.</p>

      <form onSubmit={handleSubmit} className="space-y-4 bg-white rounded-2xl p-6 shadow-sm">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">매장명 <span className="text-red-500">*</span></label>
          <Input placeholder="예: 성수동 XX카페" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">주소</label>
          <Input placeholder="예: 서울 성동구 성수동..." value={form.address} onChange={e => setForm({...form, address: e.target.value})} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">전화번호</label>
          <Input placeholder="예: 02-000-0000" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">카테고리</label>
          <Input placeholder="예: 카페, 한식, 이탈리안..." value={form.category} onChange={e => setForm({...form, category: e.target.value})} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">테마 태그 (쉼표로 구분)</label>
          <Input placeholder="예: 데이트, 혼밥, 주차" value={form.themeTags} onChange={e => setForm({...form, themeTags: e.target.value})} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">대표 메뉴 (쉼표로 구분)</label>
          <Input placeholder="예: 아메리카노, 크로플" value={form.menus} onChange={e => setForm({...form, menus: e.target.value})} />
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <div className="flex gap-3">
          <Button type="button" variant="outline" className="flex-1" onClick={() => router.back()}>
            취소
          </Button>
          <Button type="submit" disabled={submitting} className="flex-1">
            {submitting ? '제출 중...' : '등록 요청'}
          </Button>
        </div>
      </form>
    </div>
  )
}
