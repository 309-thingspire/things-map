'use client'

import { useEffect, useState, useCallback } from 'react'
import { RefreshCw, Trash2, ExternalLink, Tag, ChevronDown, ChevronUp, RotateCcw } from 'lucide-react'
import { toast } from '@/components/ui/Toaster'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface RawData {
  name?: string
  address?: string
  phone?: string | null
  businessHours?: string | null
  category?: string | null
  tags?: string[]
  menus?: { name: string; price: number | null }[]
  kakaoUrl?: string
  naverUrl?: string | null
}

interface StagingItem {
  id: string
  name: string
  address: string
  phone: string | null
  businessHours: string | null
  lat: number | null
  lng: number | null
  themeTags: string[]
  menus: { name: string; price: number | null }[] | null
  rawData: RawData
  status: 'PENDING' | 'APPROVED' | 'UNREGISTERED' | 'REJECTED'
  createdAt: string
  crawlJob: { platform: string; keyword: string } | null
}

type TabKey = 'APPROVED' | 'UNREGISTERED' | 'REJECTED'

const TAB_LABELS: Record<TabKey, string> = {
  APPROVED: '성공',
  UNREGISTERED: '미등록',
  REJECTED: '실패',
}

export default function AdminStagingPage() {
  const [items, setItems] = useState<Record<TabKey, StagingItem[]>>({ APPROVED: [], UNREGISTERED: [], REJECTED: [] })
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<TabKey>('APPROVED')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [processing, setProcessing] = useState<Set<string>>(new Set())

  const fetchItems = useCallback(async () => {
    setLoading(true)
    try {
      const [approvedRes, unregisteredRes, rejectedRes] = await Promise.all([
        fetch('/api/crawl/staging?status=APPROVED'),
        fetch('/api/crawl/staging?status=UNREGISTERED'),
        fetch('/api/crawl/staging?status=REJECTED'),
      ])
      const [a, u, r] = await Promise.all([approvedRes.json(), unregisteredRes.json(), rejectedRes.json()])
      setItems({
        APPROVED: a.data?.items ?? [],
        UNREGISTERED: u.data?.items ?? [],
        REJECTED: r.data?.items ?? [],
      })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchItems() }, [fetchItems])

  function setProc(id: string, on: boolean) {
    setProcessing(prev => { const s = new Set(prev); on ? s.add(id) : s.delete(id); return s })
  }

  async function handleRetry(id: string) {
    setProc(id, true)
    const res = await fetch(`/api/crawl/staging/${id}`, { method: 'PATCH' })
    const json = await res.json()
    if (res.ok) {
      toast(`재시도 완료 — ${json.data.status}`)
      fetchItems()
    } else {
      toast(json.error ?? '재시도 실패', 'error')
    }
    setProc(id, false)
  }

  async function handleRetryAll() {
    const targets = items.REJECTED.map(i => i.id)
    if (targets.length === 0) return
    toast(`${targets.length}개 재시도 시작…`)
    let approved = 0, unregistered = 0, failed = 0
    for (const id of targets) {
      setProc(id, true)
      try {
        const res = await fetch(`/api/crawl/staging/${id}`, { method: 'PATCH' })
        const json = await res.json()
        if (res.ok) {
          if (json.data?.status === 'APPROVED') approved++
          else if (json.data?.status === 'UNREGISTERED') unregistered++
          else failed++
        } else {
          failed++
          toast(`오류: ${json.error ?? '알 수 없음'}`, 'error')
        }
      } catch {
        failed++
      }
      setProc(id, false)
    }
    await fetchItems()
    toast(`완료 — 성공 ${approved} · 미등록 ${unregistered} · 실패 ${failed}`)
  }

  async function handleDelete(id: string) {
    if (!confirm('삭제하시겠습니까?')) return
    setProc(id, true)
    const res = await fetch(`/api/crawl/staging/${id}`, { method: 'DELETE' })
    if (res.ok) { toast('삭제되었습니다.'); fetchItems() }
    else toast('삭제 실패', 'error')
    setProc(id, false)
  }

  const tabItems = items[activeTab]

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">크롤링 스테이징</h1>
          <p className="text-sm text-gray-500 mt-0.5">크롤링 결과가 자동으로 매장 정보를 업데이트합니다.</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchItems}>
          <RefreshCw size={14} className="mr-1.5" /> 새로고침
        </Button>
      </div>

      {/* 탭 */}
      <div className="flex gap-1 mb-4 bg-gray-100 p-1 rounded-lg w-fit">
        {(Object.keys(TAB_LABELS) as TabKey[]).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5 ${
              activeTab === tab ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {TAB_LABELS[tab]}
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${
              activeTab === tab
                ? tab === 'APPROVED' ? 'bg-green-100 text-green-700'
                : tab === 'UNREGISTERED' ? 'bg-yellow-100 text-yellow-700'
                : 'bg-red-100 text-red-700'
                : 'bg-gray-200 text-gray-500'
            }`}>
              {items[tab].length}
            </span>
          </button>
        ))}
      </div>

      {/* 실패 탭 전체 재시도 버튼 */}
      {activeTab === 'REJECTED' && items.REJECTED.length > 0 && (
        <div className="mb-3 flex justify-end">
          <Button variant="outline" size="sm" onClick={handleRetryAll}>
            <RotateCcw size={13} className="mr-1.5" /> 전체 다시시도
          </Button>
        </div>
      )}

      {loading ? (
        <p className="text-gray-400">불러오는 중…</p>
      ) : tabItems.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center text-gray-400">
          <p>항목이 없습니다.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {tabItems.map(item => {
            const raw = item.rawData
            const menus: { name: string; price: number | null }[] =
              Array.isArray(item.menus) ? item.menus :
              Array.isArray(raw?.menus) ? raw.menus : []
            const allTags = [...new Set([...(item.themeTags ?? []), ...(raw?.tags ?? [])])]
            const isOpen = expanded === item.id
            const isProcessing = processing.has(item.id)

            return (
              <div key={item.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                {/* 헤더 행 */}
                <div
                  className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 select-none"
                  onClick={() => setExpanded(isOpen ? null : item.id)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900 text-sm">{item.name}</span>
                      {raw?.category && <span className="text-xs text-gray-400">{raw.category}</span>}
                    </div>
                    <p className="text-xs text-gray-400 truncate mt-0.5">
                      {item.crawlJob?.keyword && item.crawlJob.keyword !== item.name && (
                        <span className="mr-2 text-blue-400">키워드: {item.crawlJob.keyword}</span>
                      )}
                      {item.address}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-gray-400">{new Date(item.createdAt).toLocaleDateString('ko-KR')}</span>
                    {menus.length > 0 && <span className="text-xs text-gray-400">메뉴 {menus.length}</span>}

                    {/* 삭제 (미등록/실패) */}
                    {(activeTab === 'UNREGISTERED' || activeTab === 'REJECTED') && (
                      <button
                        className="p-1 text-gray-300 hover:text-red-500 transition-colors"
                        onClick={e => { e.stopPropagation(); handleDelete(item.id) }}
                        disabled={isProcessing}
                        title="삭제"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}

                    {/* 다시시도 (실패) */}
                    {activeTab === 'REJECTED' && (
                      <button
                        className="p-1 text-gray-400 hover:text-blue-500 transition-colors"
                        onClick={e => { e.stopPropagation(); handleRetry(item.id) }}
                        disabled={isProcessing}
                        title="다시시도"
                      >
                        <RotateCcw size={14} className={isProcessing ? 'animate-spin' : ''} />
                      </button>
                    )}

                    <button className="p-1 text-gray-300">
                      {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                  </div>
                </div>

                {/* 상세 펼침 */}
                {isOpen && (
                  <div className="border-t border-gray-100 px-4 py-3 space-y-3 text-sm">
                    <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                      <div><span className="text-gray-400 mr-2">전화</span>{item.phone ?? raw?.phone ?? <span className="text-gray-300">없음</span>}</div>
                      <div><span className="text-gray-400 mr-2">수집일</span>{new Date(item.createdAt).toLocaleString('ko-KR')}</div>
                      <div className="col-span-2"><span className="text-gray-400 mr-2">영업시간</span>{item.businessHours ?? raw?.businessHours ?? <span className="text-gray-300">없음</span>}</div>
                      <div>
                        <span className="text-gray-400 mr-2">카카오</span>
                        {raw?.kakaoUrl ? <a href={raw.kakaoUrl} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline inline-flex items-center gap-1"><ExternalLink size={11} />열기</a> : <span className="text-gray-300">없음</span>}
                      </div>
                    </div>

                    {allTags.length > 0 && (
                      <div>
                        <p className="text-xs text-gray-400 mb-1 flex items-center gap-1"><Tag size={11} /> 태그</p>
                        <div className="flex flex-wrap gap-1">
                          {allTags.map(t => <Badge key={t} variant="secondary" className="text-xs">{t}</Badge>)}
                        </div>
                      </div>
                    )}

                    {menus.length > 0 && (
                      <div>
                        <p className="text-xs text-gray-400 mb-1.5">메뉴 ({menus.length}개)</p>
                        <div className="grid grid-cols-2 gap-1">
                          {menus.map((m, i) => (
                            <div key={i} className="flex justify-between px-2.5 py-1.5 bg-gray-50 rounded text-xs">
                              <span className="truncate">{m.name}</span>
                              <span className="text-gray-500 ml-2 shrink-0">{m.price != null ? `${m.price.toLocaleString()}원` : '-'}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
