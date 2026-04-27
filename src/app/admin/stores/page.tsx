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
  lastCrawledAt: string | null
}

export default function AdminStoresPage() {
  const [stores, setStores] = useState<StoreRow[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [detailOpen, setDetailOpen] = useState(false)
  const [viewStore, setViewStore] = useState<StoreRow | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [editStore, setEditStore] = useState<StoreRow | null>(null)
  const [form, setForm] = useState({ name: '', address: '', lat: '', lng: '', phone: '', categoryId: '', themeTags: '', status: 'ACTIVE', naverUrl: '' })
  const [csvLoading, setCsvLoading] = useState(false)
  const [importResult, setImportResult] = useState<{ success: string[]; failed: string[] } | null>(null)
  const csvInputRef = useRef<HTMLInputElement>(null)
  const isCrawlEnabled = process.env.NEXT_PUBLIC_CRAWL_ENABLED === 'true'
  const [crawlOpen, setCrawlOpen] = useState(false)
  const [crawlFilter, setCrawlFilter] = useState('')
  const [crawlSelected, setCrawlSelected] = useState<Set<string>>(new Set())
  const [crawlRunning, setCrawlRunning] = useState(false)
  const crawlAbortRef = useRef(false)
  type CrawlItemResult = { storeName: string; ok: boolean; name?: string; stagingId?: string; error?: string }
  const [crawlProgress, setCrawlProgress] = useState<{ done: number; total: number; results: CrawlItemResult[] } | null>(null)
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

  async function openDetail(store: StoreRow) {
    setViewStore(store)
    setDetailOpen(true)
    setDetailLoading(true)
    try {
      const res = await fetch(`/api/stores/${store.id}`)
      if (res.ok) {
        const json = await res.json()
        setViewStore({ ...store, ...json.data })
      }
    } finally {
      setDetailLoading(false)
    }
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
    setDetailOpen(false)
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


  async function handleCrawlStart() {
    const targets = stores.filter(s => crawlSelected.has(s.id)).map(s => s.name)
    if (targets.length === 0) return
    setCrawlRunning(true)
    crawlAbortRef.current = false
    setCrawlProgress({ done: 0, total: targets.length, results: [] })

    for (let i = 0; i < targets.length; i++) {
      if (crawlAbortRef.current) break
      const storeName = targets[i]
      try {
        const res = await fetch('/api/crawl/playwright', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ storeName }),
        })
        const json = await res.json()
        if (res.ok) {
          setCrawlProgress(p => p ? { ...p, done: i + 1, results: [...p.results, { storeName, ok: true, name: json.data.preview.name, stagingId: json.data.stagingId }] } : p)
        } else {
          setCrawlProgress(p => p ? { ...p, done: i + 1, results: [...p.results, { storeName, ok: false, error: json.error }] } : p)
        }
      } catch (err) {
        setCrawlProgress(p => p ? { ...p, done: i + 1, results: [...p.results, { storeName, ok: false, error: String(err) }] } : p)
      }
      // 봇 탐지 방지 딜레이
      if (i < targets.length - 1 && !crawlAbortRef.current) {
        await new Promise(r => setTimeout(r, 2000 + Math.random() * 1500))
      }
    }
    setCrawlRunning(false)
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
            <Button variant="outline" size="icon" title="메뉴 크롤링" onClick={() => {
              setCrawlOpen(true); setCrawlProgress(null); setCrawlFilter('')
              // 크롤 안 된 매장만 기본 선택
              const uncrawled = stores.filter(s => !s.lastCrawledAt).map(s => s.id)
              setCrawlSelected(new Set(uncrawled.length > 0 ? uncrawled : stores.map(s => s.id)))
            }}>
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
                  onClick={() => openDetail(store)}
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

      {/* 상세 보기 모달 (읽기 전용) */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-2xl w-full" style={{ maxHeight: '88vh', display: 'flex', flexDirection: 'column' }}>
          <DialogHeader className="shrink-0 pr-6">
            <DialogTitle>{viewStore?.name}</DialogTitle>
            <div className="flex items-center gap-2 mt-1">
              {viewStore?.category && (
                <Badge variant="outline" style={{ backgroundColor: (viewStore.category.color ?? '#888') + '20', borderColor: viewStore.category.color ?? undefined, color: viewStore.category.color ?? undefined }}>
                  {viewStore.category.name}
                </Badge>
              )}
              <Badge variant={viewStore?.status === 'ACTIVE' ? 'default' : 'secondary'}>
                {viewStore?.status === 'ACTIVE' ? '운영중' : '비활성'}
              </Badge>
            </div>
          </DialogHeader>

          {viewStore && (
            <div className="flex-1 overflow-y-auto space-y-5 pr-1">
              {/* 기본 정보 */}
              <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
                <div className="col-span-2">
                  <p className="text-xs text-gray-400 mb-0.5">주소</p>
                  <p className="font-medium">{viewStore.address}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">전화번호</p>
                  <p>{viewStore.phone ?? <span className="text-gray-300">없음</span>}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">도보 (본사 기준)</p>
                  <p>{viewStore.walkingMinutes != null ? `🚶 ${viewStore.walkingMinutes}분 (${viewStore.officeDistanceM}m)` : <span className="text-gray-300">없음</span>}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">좌표</p>
                  <p className="font-mono text-xs">{viewStore.lat}, {viewStore.lng}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">평점</p>
                  <p>{viewStore.internalRating ? <span className="text-amber-500 font-medium">★ {viewStore.internalRating.avgTotal.toFixed(1)}</span> : <span className="text-gray-300">없음</span>}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-xs text-gray-400 mb-0.5">영업시간</p>
                  <p className="whitespace-pre-line">{viewStore.businessHours ?? <span className="text-gray-300">없음</span>}</p>
                </div>
                {viewStore.themeTags.length > 0 && (
                  <div className="col-span-2">
                    <p className="text-xs text-gray-400 mb-1">테마 태그</p>
                    <div className="flex flex-wrap gap-1.5">
                      {viewStore.themeTags.map(tag => <Badge key={tag} variant="secondary">{tag}</Badge>)}
                    </div>
                  </div>
                )}
                <div className="col-span-2 flex gap-3">
                  {viewStore.naverUrl && (
                    <a href={viewStore.naverUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-blue-500 hover:underline text-sm">
                      <ExternalLink size={13} /> 네이버 지도
                    </a>
                  )}
                  {viewStore.kakaoUrl && (
                    <a href={viewStore.kakaoUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-yellow-600 hover:underline text-sm">
                      <ExternalLink size={13} /> 카카오 지도
                    </a>
                  )}
                </div>
              </div>

              {/* 메뉴 */}
              {detailLoading && <p className="text-xs text-gray-400 flex items-center gap-1.5"><Loader2 size={12} className="animate-spin" /> 상세 정보 불러오는 중…</p>}
              {!detailLoading && viewStore.menus?.length > 0 && (
                <div>
                  <p className="text-xs text-gray-400 mb-2">메뉴 ({viewStore.menus?.length}개)</p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {viewStore.menus?.map(m => (
                      <div key={m.id} className="flex justify-between items-center px-3 py-2 bg-gray-50 rounded-lg text-sm">
                        <span className="truncate">{m.isRepresentative && <span className="text-amber-400 mr-1">★</span>}{m.name}</span>
                        <span className="text-gray-500 shrink-0 ml-2">{m.price != null ? `${m.price.toLocaleString()}원` : '-'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 등록/수정 일시 */}
              <div className="flex gap-6 text-xs text-gray-400 pt-1 border-t">
                <span>등록: {new Date(viewStore.createdAt).toLocaleString('ko-KR')}</span>
                <span>수정: {new Date(viewStore.updatedAt).toLocaleString('ko-KR')}</span>
              </div>
            </div>
          )}

          <div className="shrink-0 pt-3 border-t flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setDetailOpen(false)}>닫기</Button>
            <Button className="flex-1" onClick={() => viewStore && openEdit(viewStore)}>수정</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 매장 추가/수정 폼 모달 */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-xl">
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
        <Dialog open={crawlOpen} onOpenChange={(open) => { if (!crawlRunning) { setCrawlOpen(open); if (!open) { setCrawlProgress(null); setCrawlSelected(new Set()); setCrawlFilter('') } } }}>
          <DialogContent className="max-w-lg flex flex-col" style={{ maxHeight: '85vh' }}>
            <DialogHeader className="shrink-0">
              <DialogTitle className="flex items-center gap-2"><Terminal size={16} /> 메뉴 크롤링</DialogTitle>
            </DialogHeader>

            {/* 진행 중 화면 */}
            {crawlProgress ? (
              <div className="flex flex-col gap-3 min-h-0">
                {/* 진행률 */}
                <div className="shrink-0">
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>{crawlRunning ? `진행 중…` : '완료'}</span>
                    <span>{crawlProgress.done} / {crawlProgress.total}</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-1.5">
                    <div
                      className="bg-blue-500 h-1.5 rounded-full transition-all"
                      style={{ width: `${(crawlProgress.done / crawlProgress.total) * 100}%` }}
                    />
                  </div>
                </div>
                {/* 결과 목록 */}
                <div className="flex-1 overflow-y-auto space-y-1 min-h-0 max-h-96">
                  {crawlProgress.results.map((r, i) => (
                    <div key={i} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${r.ok ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-700'}`}>
                      {r.ok ? <CheckCircle size={13} className="shrink-0" /> : <XCircle size={13} className="shrink-0" />}
                      <span className="font-medium truncate">{r.storeName}</span>
                      {r.ok ? <span className="text-xs text-green-600 ml-auto shrink-0">→ {r.name}</span> : <span className="text-xs ml-auto shrink-0 truncate max-w-32">{r.error}</span>}
                    </div>
                  ))}
                  {crawlRunning && crawlProgress.done < crawlProgress.total && (
                    <div className="flex items-center gap-2 px-3 py-2 text-sm text-gray-500">
                      <Loader2 size={13} className="animate-spin shrink-0" />
                      <span className="truncate">{stores.filter(s => crawlSelected.has(s.id))[crawlProgress.done]?.name ?? '…'}</span>
                    </div>
                  )}
                </div>
                <div className="shrink-0 flex gap-2">
                  {crawlRunning ? (
                    <Button variant="outline" className="flex-1" onClick={() => { crawlAbortRef.current = true }}>중단</Button>
                  ) : (
                    <>
                      <a href="/admin/staging" className="flex-1">
                        <Button variant="outline" className="w-full">스테이징에서 확인</Button>
                      </a>
                      <Button className="flex-1" onClick={() => { setCrawlProgress(null); setCrawlSelected(new Set()); setCrawlFilter('') }}>다시 선택</Button>
                    </>
                  )}
                </div>
              </div>
            ) : (
              /* 선택 화면 — 테이블 */
              <div className="flex flex-col gap-3 min-h-0">
                <div className="shrink-0">
                  <Input
                    placeholder="매장 검색…"
                    value={crawlFilter}
                    onChange={(e) => setCrawlFilter(e.target.value)}
                  />
                </div>
                {(() => {
                  const filtered = [...stores]
                    .filter(s => !crawlFilter || s.name.includes(crawlFilter))
                    // 신규(크롤 안 된) → 최근 실패(크롤됐지만 오래된) → 성공 순
                    .sort((a, b) => {
                      const aNew = !a.lastCrawledAt, bNew = !b.lastCrawledAt
                      if (aNew !== bNew) return aNew ? -1 : 1
                      if (!a.lastCrawledAt && !b.lastCrawledAt) return a.name.localeCompare(b.name, 'ko')
                      return new Date(a.lastCrawledAt!).getTime() - new Date(b.lastCrawledAt!).getTime()
                    })
                  const allChecked = filtered.length > 0 && filtered.every(s => crawlSelected.has(s.id))
                  const someChecked = filtered.some(s => crawlSelected.has(s.id))
                  return (
                    <div className="flex-1 overflow-y-auto border rounded-lg min-h-0 max-h-96">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 sticky top-0">
                          <tr>
                            <th className="w-10 px-3 py-2 text-left">
                              <input
                                type="checkbox"
                                className="rounded"
                                checked={allChecked}
                                ref={el => { if (el) el.indeterminate = someChecked && !allChecked }}
                                onChange={() => {
                                  if (allChecked) {
                                    const next = new Set(crawlSelected)
                                    filtered.forEach(s => next.delete(s.id))
                                    setCrawlSelected(next)
                                  } else {
                                    const next = new Set(crawlSelected)
                                    filtered.forEach(s => next.add(s.id))
                                    setCrawlSelected(next)
                                  }
                                }}
                              />
                            </th>
                            <th className="text-left px-2 py-2 font-medium text-gray-500">매장명</th>
                            <th className="text-left px-2 py-2 font-medium text-gray-500 w-28">크롤링 일시</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {filtered.map(s => (
                            <tr key={s.id} className="hover:bg-gray-50">
                              <td className="px-3 py-2">
                                <input
                                  type="checkbox"
                                  className="rounded"
                                  checked={crawlSelected.has(s.id)}
                                  onChange={(e) => {
                                    const next = new Set(crawlSelected)
                                    if (e.target.checked) { next.add(s.id) } else { next.delete(s.id) }
                                    setCrawlSelected(next)
                                  }}
                                />
                              </td>
                              <td className="px-2 py-2 font-medium truncate max-w-0" style={{ maxWidth: '200px' }}>{s.name}</td>
                              <td className="px-2 py-2 text-xs text-gray-400 whitespace-nowrap">
                                {s.lastCrawledAt
                                  ? new Date(s.lastCrawledAt).toLocaleDateString('ko-KR')
                                  : <span className="text-amber-500">미크롤링</span>}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )
                })()}
                <div className="shrink-0">
                  <Button className="w-full" disabled={crawlSelected.size === 0} onClick={handleCrawlStart}>
                    {crawlSelected.size > 0 ? `${crawlSelected.size}개 크롤링 시작` : '매장을 선택해주세요'}
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
