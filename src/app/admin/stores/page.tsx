'use client'

import { useEffect, useRef, useState } from 'react'
import { Trash2, ChevronUp, ChevronDown, ChevronsUpDown, ExternalLink, Terminal, Loader2, CheckCircle, XCircle } from 'lucide-react'
import { toast } from '@/components/ui/Toaster'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import StoreSearchInput, { type StoreSuggestion } from '@/components/store/StoreSearchInput'
import type { StoreDetail, Category } from '@/types'

interface StoreRow extends StoreDetail {
  createdAt: string
  updatedAt: string
  officeDistanceM: number | null
  walkingMinutes: number | null
}

export default function AdminStoresPage() {
  const [stores, setStores] = useState<StoreRow[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editStore, setEditStore] = useState<StoreRow | null>(null)
  const [form, setForm] = useState({ name: '', address: '', lat: '', lng: '', phone: '', categoryId: '', themeTags: '', status: 'ACTIVE', naverUrl: '' })
  const [csvLoading, setCsvLoading] = useState(false)
  const [importResult, setImportResult] = useState<{ success: string[]; failed: string[] } | null>(null)
  const csvInputRef = useRef<HTMLInputElement>(null)
  const isCrawlEnabled = process.env.NEXT_PUBLIC_CRAWL_ENABLED === 'true'
  const [crawlOpen, setCrawlOpen] = useState(false)
  const [crawlInput, setCrawlInput] = useState('')
  const [crawlLoading, setCrawlLoading] = useState(false)
  type CrawlResult = { ok: true; stagingId: string; name: string; address: string; menus: number } | { ok: false; error: string }
  const [crawlResult, setCrawlResult] = useState<CrawlResult | null>(null)
  type SortField = 'name' | 'category' | 'walkingMinutes' | 'rating' | 'status'
  const [sortField, setSortField] = useState<SortField>('name')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  function toggleSort(field: SortField) {
    if (sortField === field) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortField(field); setSortDir('asc') }
  }

  const sortedStores = [...stores].sort((a, b) => {
    let cmp = 0
    if (sortField === 'name') cmp = a.name.localeCompare(b.name, 'ko')
    else if (sortField === 'category') cmp = (a.category?.name ?? '').localeCompare(b.category?.name ?? '', 'ko')
    else if (sortField === 'walkingMinutes') cmp = (a.walkingMinutes ?? 9999) - (b.walkingMinutes ?? 9999)
    else if (sortField === 'rating') cmp = (b.internalRating?.avgTotal ?? 0) - (a.internalRating?.avgTotal ?? 0)
    else if (sortField === 'status') cmp = a.status.localeCompare(b.status)
    return sortDir === 'asc' ? cmp : -cmp
  })

  function SortIcon({ field }: { field: SortField }) {
    if (sortField !== field) return <ChevronsUpDown size={13} className="inline ml-1 text-gray-400" />
    return sortDir === 'asc'
      ? <ChevronUp size={13} className="inline ml-1 text-blue-500" />
      : <ChevronDown size={13} className="inline ml-1 text-blue-500" />
  }

  async function fetchStores() {
    const res = await fetch('/api/stores?limit=200')
    if (res.ok) {
      const json = await res.json()
      setStores(json.data.stores)
    }
    setLoading(false)
  }

  async function fetchCategories() {
    const res = await fetch('/api/categories')
    if (res.ok) {
      const json = await res.json()
      setCategories(json.data.categories ?? [])
    }
  }

  useEffect(() => { fetchStores(); fetchCategories() }, [])

  function openCreate() {
    setEditStore(null)
    setForm({ name: '', address: '', lat: '', lng: '', phone: '', categoryId: '', themeTags: '', status: 'ACTIVE', naverUrl: '' })
    setDialogOpen(true)
  }

  function openEdit(store: StoreRow) {
    setEditStore(store)
    setForm({
      name: store.name,
      address: store.address,
      lat: String(store.lat),
      lng: String(store.lng),
      phone: store.phone ?? '',
      categoryId: store.category?.id ?? '',
      themeTags: store.themeTags.join(', '),
      status: store.status,
      naverUrl: store.naverUrl ?? '',
    })
    setDialogOpen(true)
  }

  function handleSuggestSelect(r: StoreSuggestion) {
    const matched = categories.find((c) => c.name === r.category)
    setForm((prev) => ({
      ...prev,
      name: r.name,
      address: r.address,
      lat: String(r.lat),
      lng: String(r.lng),
      phone: r.phone ?? prev.phone,
      categoryId: matched?.id ?? prev.categoryId,
      naverUrl: r.naverUrl,
    }))
  }

  async function handleSave() {
    const payload = {
      name: form.name,
      address: form.address,
      lat: parseFloat(form.lat),
      lng: parseFloat(form.lng),
      phone: form.phone || null,
      categoryId: form.categoryId || null,
      themeTags: form.themeTags.split(',').map((t) => t.trim()).filter(Boolean),
      status: form.status,
      naverUrl: form.naverUrl || null,
    }

    const url = editStore ? `/api/stores/${editStore.id}` : '/api/stores'
    const method = editStore ? 'PUT' : 'POST'

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (res.ok) {
      toast(editStore ? '매장이 수정되었습니다.' : '매장이 등록되었습니다.')
      setDialogOpen(false)
      fetchStores()
    } else {
      toast('저장에 실패했습니다.', 'error')
    }
  }


  async function handleCrawl() {
    if (!crawlInput.trim()) return
    setCrawlLoading(true)
    setCrawlResult(null)
    try {
      const res = await fetch('/api/crawl/playwright', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storeName: crawlInput.trim() }),
      })
      const json = await res.json()
      if (res.ok) {
        const p = json.data.preview
        setCrawlResult({ ok: true, stagingId: json.data.stagingId, name: p.name, address: p.address, menus: p.menus?.length ?? 0 })
        setCrawlInput('')
        toast(`크롤링 완료 — ${p.name}`)
      } else {
        setCrawlResult({ ok: false, error: json.error ?? '크롤링 실패' })
      }
    } catch (err) {
      setCrawlResult({ ok: false, error: String(err) })
    } finally {
      setCrawlLoading(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('삭제하시겠습니까?')) return
    const res = await fetch(`/api/stores/${id}`, { method: 'DELETE' })
    if (res.ok) toast('매장이 삭제되었습니다.', 'error')
    else toast('삭제에 실패했습니다.', 'error')
    fetchStores()
  }

  function handleExportCsv() {
    window.location.href = '/api/stores/csv'
  }

  function handleImportClick() {
    csvInputRef.current?.click()
  }

  async function handleCsvFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setCsvLoading(true)
    setImportResult(null)

    try {
      const text = await file.text()
      const res = await fetch('/api/stores/csv', {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
        body: text,
      })
      if (res.ok) {
        const { data } = await res.json()
        setImportResult(data)
        toast(`CSV 가져오기 완료 — ${data.success.length}개 성공`)
        fetchStores()
      } else {
        const { error } = await res.json()
        toast(error ?? 'CSV 가져오기 실패', 'error')
      }
    } finally {
      setCsvLoading(false)
      e.target.value = ''
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">매장 관리</h1>
        <div className="flex gap-2">
          <input ref={csvInputRef} type="file" accept=".csv" className="hidden" onChange={handleCsvFile} />
          <Button variant="outline" onClick={handleImportClick} disabled={csvLoading}>
            {csvLoading ? '가져오는 중...' : '📥 CSV 가져오기'}
          </Button>
          <Button variant="outline" onClick={handleExportCsv}>📤 CSV 내보내기</Button>
          {isCrawlEnabled ? (
            <Button variant="outline" size="icon" title="메뉴 크롤링" onClick={() => { setCrawlOpen(true); setCrawlResult(null) }}>
              <Terminal size={15} />
            </Button>
          ) : (
            <a href="http://localhost:3000/admin/stores" target="_blank" rel="noopener noreferrer" title="로컬에서 크롤링 실행">
              <Button variant="outline" size="icon">
                <Terminal size={15} />
              </Button>
            </a>
          )}
          <Button onClick={openCreate}>+ 매장 추가</Button>
        </div>
      </div>

      {importResult && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-xl text-sm">
          <p className="font-medium text-green-800">가져오기 완료: {importResult.success.length}개 성공, {importResult.failed.length}개 실패</p>
          {importResult.failed.length > 0 && (
            <p className="text-red-600 mt-1">실패: {importResult.failed.join(', ')}</p>
          )}
        </div>
      )}

      <p className="text-xs text-gray-400 mb-3">
        CSV 형식: name, address, lat, lng, phone, category, themeTags, businessHours, naverUrl
        &nbsp;·&nbsp; address/lat/lng 비워두면 매장명으로 자동 검색
      </p>

      {loading ? (
        <p className="text-gray-400">불러오는 중...</p>
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600 cursor-pointer select-none hover:text-gray-900" onClick={() => toggleSort('name')}>매장명<SortIcon field="name" /></th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 cursor-pointer select-none hover:text-gray-900" onClick={() => toggleSort('category')}>카테고리<SortIcon field="category" /></th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">주소</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 cursor-pointer select-none hover:text-gray-900" onClick={() => toggleSort('walkingMinutes')}>도보<SortIcon field="walkingMinutes" /></th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 cursor-pointer select-none hover:text-gray-900" onClick={() => toggleSort('rating')}>평점<SortIcon field="rating" /></th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 cursor-pointer select-none hover:text-gray-900" onClick={() => toggleSort('status')}>상태<SortIcon field="status" /></th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">관리</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {sortedStores.map((store) => (
                <tr
                  key={store.id}
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => openEdit(store)}
                >
                  <td className="px-4 py-3 font-medium">{store.name}</td>
                  <td className="px-4 py-3 text-gray-500">{store.category?.name ?? '-'}</td>
                  <td className="px-4 py-3 text-gray-500 max-w-xs truncate">{store.address}</td>
                  <td className="px-4 py-3 text-blue-600 whitespace-nowrap">
                    {store.walkingMinutes != null ? `🚶 ${store.walkingMinutes}분` : '-'}
                  </td>
                  <td className="px-4 py-3">
                    {store.internalRating ? (
                      <span className="text-amber-500 font-medium">★ {store.internalRating.avgTotal.toFixed(1)}</span>
                    ) : '-'}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={store.status === 'ACTIVE' ? 'default' : 'secondary'}>
                      {store.status === 'ACTIVE' ? '운영중' : '비활성'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {store.naverUrl ? (
                        <a
                          href={store.naverUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="p-1.5 text-gray-400 hover:text-blue-500 transition-colors rounded"
                          title="네이버 지도에서 보기"
                        >
                          <ExternalLink size={15} />
                        </a>
                      ) : (
                        <span className="p-1.5 text-gray-200 cursor-not-allowed" title="URL 없음">
                          <ExternalLink size={15} />
                        </span>
                      )}
                      <button
                        className="p-1.5 text-gray-400 hover:text-red-500 transition-colors rounded"
                        onClick={(e) => { e.stopPropagation(); handleDelete(store.id) }}
                        title="삭제"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editStore ? '매장 수정' : '매장 추가'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <StoreSearchInput
              value={form.name}
              onChange={(v) => setForm({ ...form, name: v })}
              onSelect={handleSuggestSelect}
              placeholder="매장명 검색 후 선택하면 자동완성"
            />
            <Input placeholder="주소" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            <div className="flex gap-2">
              <Input placeholder="위도 (lat)" value={form.lat} onChange={(e) => setForm({ ...form, lat: e.target.value })} />
              <Input placeholder="경도 (lng)" value={form.lng} onChange={(e) => setForm({ ...form, lng: e.target.value })} />
            </div>
            <Input placeholder="전화번호 (선택)" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            <Input placeholder="네이버 지도 URL (선택)" value={form.naverUrl} onChange={(e) => setForm({ ...form, naverUrl: e.target.value })} />
            <select
              className="w-full border rounded-md px-3 py-2 text-sm"
              value={form.categoryId}
              onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
            >
              <option value="">카테고리 선택</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <Input placeholder="테마 태그 (쉼표로 구분)" value={form.themeTags} onChange={(e) => setForm({ ...form, themeTags: e.target.value })} />
            <select
              className="w-full border rounded-md px-3 py-2 text-sm"
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
            >
              <option value="ACTIVE">운영중</option>
              <option value="INACTIVE">비활성</option>
            </select>
            {form.lat && form.lng && !isNaN(parseFloat(form.lat)) && (
              <p className="text-xs text-blue-500">
                🚶 회사까지 도보 약 {Math.max(1, Math.round((
                  (() => {
                    const R = 6371000
                    const lat1 = 37.5472294, lng1 = 126.9733870
                    const lat2 = parseFloat(form.lat), lng2 = parseFloat(form.lng)
                    const dLat = ((lat2 - lat1) * Math.PI) / 180
                    const dLng = ((lng2 - lng1) * Math.PI) / 180
                    const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)**2
                    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
                  })()
                ) * 1.3 / 75))}분 예상
              </p>
            )}
            <Button className="w-full" onClick={handleSave}>저장</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 크롤링 모달 — 로컬 개발 환경에서만 표시 */}
      {isCrawlEnabled && (
        <Dialog open={crawlOpen} onOpenChange={setCrawlOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2"><Terminal size={16} /> 메뉴 크롤링</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <p className="text-xs text-gray-500">매장명을 입력하면 카카오 지도에서 정보를 크롤링해 스테이징에 저장합니다.</p>
              <div className="flex gap-2">
                <Input
                  placeholder="매장명 (예: 맥도날드 용산점)"
                  value={crawlInput}
                  onChange={(e) => setCrawlInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !crawlLoading && handleCrawl()}
                  disabled={crawlLoading}
                />
                <Button onClick={handleCrawl} disabled={crawlLoading || !crawlInput.trim()} className="shrink-0">
                  {crawlLoading ? <Loader2 size={15} className="animate-spin" /> : '실행'}
                </Button>
              </div>

              {crawlResult && (
                crawlResult.ok ? (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm space-y-1">
                    <p className="flex items-center gap-1.5 font-medium text-green-800"><CheckCircle size={14} /> 크롤링 성공</p>
                    <p className="text-gray-700">{crawlResult.name}</p>
                    <p className="text-gray-500 text-xs">{crawlResult.address}</p>
                    <p className="text-gray-500 text-xs">메뉴 {crawlResult.menus}개 · staging ID: {crawlResult.stagingId.slice(0, 8)}…</p>
                    <a href="/admin/staging" className="text-blue-500 text-xs hover:underline">→ 스테이징에서 확인</a>
                  </div>
                ) : (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm flex items-start gap-1.5 text-red-700">
                    <XCircle size={14} className="mt-0.5 shrink-0" /> {crawlResult.error}
                  </div>
                )
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
