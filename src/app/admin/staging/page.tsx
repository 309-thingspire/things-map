'use client'

import { useEffect, useState } from 'react'
import { CheckCircle, XCircle, ChevronDown, ChevronUp, ExternalLink, Tag } from 'lucide-react'
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
  lat?: number | null
  lng?: number | null
  kakaoUrl?: string
  naverUrl?: string | null
  menus?: { name: string; price: number | null }[]
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
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  createdAt: string
  crawlJob: { platform: string; keyword: string } | null
}

export default function AdminStagingPage() {
  const [items, setItems] = useState<StagingItem[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [processing, setProcessing] = useState<string | null>(null)

  async function fetchItems() {
    const res = await fetch('/api/crawl/staging?status=PENDING')
    if (res.ok) {
      const json = await res.json()
      setItems(json.data.items)
    }
    setLoading(false)
  }

  useEffect(() => { fetchItems() }, [])

  async function handleApprove(id: string) {
    setProcessing(id)
    const item = items.find(i => i.id === id)
    const menus = item?.menus ?? item?.rawData?.menus ?? []
    const themeTags = item?.themeTags?.length ? item.themeTags : (item?.rawData?.tags ?? [])
    const res = await fetch(`/api/crawl/staging/${id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ menus, themeTags }),
    })
    const json = await res.json()
    if (res.ok) {
      toast('승인 완료 — 매장이 등록되었습니다.')
      fetchItems()
    } else if (res.status === 409) {
      toast(json.error ?? '중복 매장', 'error')
    } else {
      toast(json.error ?? '승인 실패', 'error')
    }
    setProcessing(null)
  }

  async function handleReject(id: string) {
    setProcessing(id)
    const res = await fetch(`/api/crawl/staging/${id}`, { method: 'DELETE' })
    if (res.ok) {
      toast('거절되었습니다.')
      fetchItems()
    } else {
      toast('처리 실패', 'error')
    }
    setProcessing(null)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">크롤링 스테이징</h1>
          <p className="text-sm text-gray-500 mt-0.5">크롤링된 데이터를 확인하고 승인하면 매장으로 등록됩니다.</p>
        </div>
        <Badge variant="secondary">{items.length}개 대기 중</Badge>
      </div>

      {loading ? (
        <p className="text-gray-400">불러오는 중…</p>
      ) : items.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center text-gray-400">
          <p className="text-lg">대기 중인 항목이 없습니다.</p>
          <p className="text-sm mt-1">크롤링 후 여기서 결과를 확인하세요.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => {
            const raw = item.rawData
            const menus: { name: string; price: number | null }[] =
              Array.isArray(item.menus) ? item.menus :
              Array.isArray(raw?.menus) ? raw.menus : []
            const isOpen = expanded === item.id

            return (
              <div key={item.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                {/* 헤더 행 */}
                <div
                  className="flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-gray-50 select-none"
                  onClick={() => setExpanded(isOpen ? null : item.id)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-900">{item.name}</span>
                      {raw?.category && <Badge variant="outline" className="text-xs shrink-0">{raw.category}</Badge>}
                    </div>
                    <p className="text-sm text-gray-500 truncate mt-0.5">{item.address}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-gray-400">{menus.length}개 메뉴</span>
                    {item.lat && item.lng && <span className="text-xs text-green-600">좌표 ✓</span>}
                    {!item.lat && <span className="text-xs text-red-400">좌표 없음</span>}
                    <button
                      className="p-1 text-gray-400 hover:text-gray-600"
                      onClick={(e) => { e.stopPropagation(); setExpanded(isOpen ? null : item.id) }}
                    >
                      {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                  </div>
                </div>

                {/* 상세 펼침 */}
                {isOpen && (
                  <div className="border-t border-gray-100 px-5 py-4 space-y-4">
                    {/* 기본 정보 */}
                    <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
                      <div><span className="text-gray-400 mr-2">전화</span>{item.phone ?? raw?.phone ?? <span className="text-gray-300">없음</span>}</div>
                      <div><span className="text-gray-400 mr-2">좌표</span>{item.lat && item.lng ? `${item.lat.toFixed(5)}, ${item.lng.toFixed(5)}` : <span className="text-red-400">없음</span>}</div>
                      <div className="col-span-2"><span className="text-gray-400 mr-2">영업시간</span>{item.businessHours ?? raw?.businessHours ?? <span className="text-gray-300">없음</span>}</div>
                      {(() => {
                        const allTags = [...new Set([...(item.themeTags ?? []), ...(raw?.tags ?? [])])]
                        return allTags.length > 0 ? (
                          <div className="col-span-2">
                            <p className="text-gray-400 text-xs mb-1.5 flex items-center gap-1"><Tag size={11} /> 테마 태그</p>
                            <div className="flex flex-wrap gap-1.5">
                              {allTags.map(tag => (
                                <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
                              ))}
                            </div>
                          </div>
                        ) : null
                      })()}
                      <div>
                        <span className="text-gray-400 mr-2">카카오</span>
                        {raw?.kakaoUrl ? <a href={raw.kakaoUrl} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline flex items-center gap-1 inline-flex"><ExternalLink size={12} /> 열기</a> : <span className="text-gray-300">없음</span>}
                      </div>
                      <div>
                        <span className="text-gray-400 mr-2">네이버</span>
                        {raw?.naverUrl ? <a href={raw.naverUrl} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline flex items-center gap-1 inline-flex"><ExternalLink size={12} /> 열기</a> : <span className="text-gray-300">없음</span>}
                      </div>
                      <div><span className="text-gray-400 mr-2">크롤 키워드</span>{item.crawlJob?.keyword ?? '-'}</div>
                      <div><span className="text-gray-400 mr-2">수집일</span>{new Date(item.createdAt).toLocaleString('ko-KR')}</div>
                    </div>

                    {/* 메뉴 목록 */}
                    {menus.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-gray-500 mb-2">메뉴 ({menus.length}개)</p>
                        <div className="grid grid-cols-2 gap-1.5 max-h-48 overflow-y-auto">
                          {menus.map((m, i) => (
                            <div key={i} className="flex justify-between items-center px-3 py-1.5 bg-gray-50 rounded-lg text-sm">
                              <span className="truncate">{m.name}</span>
                              <span className="text-gray-500 shrink-0 ml-2">{m.price != null ? `${m.price.toLocaleString()}원` : '-'}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 승인/거절 버튼 */}
                    <div className="flex gap-2 pt-1">
                      <Button
                        className="flex-1"
                        onClick={() => handleApprove(item.id)}
                        disabled={processing === item.id || !item.lat}
                      >
                        <CheckCircle size={14} className="mr-1.5" />
                        {processing === item.id ? '처리 중…' : '승인 — 매장 등록'}
                      </Button>
                      <Button
                        variant="outline"
                        className="flex-1 text-red-500 border-red-200 hover:bg-red-50"
                        onClick={() => handleReject(item.id)}
                        disabled={processing === item.id}
                      >
                        <XCircle size={14} className="mr-1.5" />
                        거절
                      </Button>
                    </div>
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
