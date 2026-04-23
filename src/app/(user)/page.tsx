'use client'

import { useState, useEffect, useRef } from 'react'
import dynamic from 'next/dynamic'
import { LocateFixed } from 'lucide-react'
import { useStores } from '@/hooks/useStores'
import { useMap, DEFAULT_CENTER, DEFAULT_ZOOM } from '@/hooks/useMap'
import { useViewMode } from '@/contexts/ViewModeContext'
import StoreSlideOver from '@/components/store/StoreSlideOver'
import { getIconSvgHtml } from '@/lib/markerIcons'
import type { StoreListItem, Category } from '@/types'

const NaverMap = dynamic(() => import('@/components/map/NaverMap'), { ssr: false })

function CategoryBadge({ category }: { category: StoreListItem['category'] }) {
  if (category?.color) {
    return (
      <span
        className="inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full text-white mb-1.5"
        style={{ background: category.color }}
      >
        {category.name}
      </span>
    )
  }
  if (category?.name) {
    return (
      <span className="inline-block text-[10px] font-medium px-2 py-0.5 rounded-full text-gray-400 bg-gray-100 mb-1.5">
        {category.name}
      </span>
    )
  }
  return (
    <span className="inline-block text-[10px] font-medium px-2 py-0.5 rounded-full text-gray-300 bg-gray-50 mb-1.5">
      미지정
    </span>
  )
}

function HorizontalStoreCard({ store, selected, onClick }: { store: StoreListItem; selected: boolean; onClick: () => void }) {
  return (
    <button
      data-store-id={store.id}
      onClick={onClick}
      className={`flex-shrink-0 w-44 text-left rounded-2xl p-3 shadow-sm border transition-all ${
        selected ? 'border-blue-500 bg-blue-50 shadow-md' : 'border-gray-100 bg-white hover:shadow-md'
      }`}
    >
      <CategoryBadge category={store.category} />
      <p className="text-sm font-semibold text-gray-900 truncate leading-tight">{store.name}</p>
      <p className="text-[11px] text-gray-400 truncate mt-0.5">{store.address}</p>
      {store.walkingMinutes != null && (
        <p className="text-[11px] text-blue-500 mt-1">🏢 회사로부터 {store.walkingMinutes}분</p>
      )}
      {store.internalRating && (
        <p className="text-[11px] text-amber-500 mt-0.5">★ {store.internalRating.avgTotal.toFixed(1)}</p>
      )}
    </button>
  )
}

export default function HomePage() {
  const { viewMode } = useViewMode()
  const [selectedStore, setSelectedStore] = useState<StoreListItem | null>(null)
  const [detailStoreId, setDetailStoreId] = useState<string | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [mapMoved, setMapMoved] = useState(false)
  const cardScrollRef = useRef<HTMLDivElement>(null)
  const { center, zoom, moveTo } = useMap()
  const selectedStoreId = selectedStore?.id ?? null

  const { stores, total, loading } = useStores({
    lat: center.lat,
    lng: center.lng,
    categories: selectedCategories.length > 0 ? selectedCategories : undefined,
  })

  useEffect(() => {
    fetch('/api/categories')
      .then((r) => r.json())
      .then((json) => setCategories(json.data?.categories ?? []))
      .catch(() => {})
  }, [])

  // 페이지 방문 기록 (비로그인 포함)
  useEffect(() => {
    const key = 'tm_sid'
    let sid = localStorage.getItem(key)
    if (!sid) { sid = crypto.randomUUID(); localStorage.setItem(key, sid) }
    const lastKey = `tm_visit_${new Date().toDateString()}`
    if (!sessionStorage.getItem(lastKey)) {
      sessionStorage.setItem(lastKey, '1')
      fetch('/api/track/visit', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId: sid }) }).catch(() => {})
    }
  }, [])

  useEffect(() => {
    if (!selectedStore || !cardScrollRef.current) return
    const container = cardScrollRef.current
    const card = container.querySelector<HTMLElement>(`[data-store-id="${selectedStore.id}"]`)
    if (card) {
      const containerRect = container.getBoundingClientRect()
      const cardRect = card.getBoundingClientRect()
      container.scrollTo({ left: container.scrollLeft + cardRect.left - containerRect.left - 16, behavior: 'smooth' })
    }
  }, [selectedStore])

  function handleStoreSelect(store: StoreListItem) {
    setSelectedStore(store)
  }

  function toggleCategory(id: string) {
    setSelectedCategories((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    )
  }

  function resetMapPosition() {
    moveTo(DEFAULT_CENTER.lat, DEFAULT_CENTER.lng, DEFAULT_ZOOM)
    setMapMoved(false)
  }

  return (
    <div className="h-full">
      {/* Map — fills full container (layout gives this full viewport) */}
      <div className="absolute inset-0 z-0">
        <NaverMap
          stores={stores}
          center={center}
          zoom={zoom}
          selectedStore={selectedStore}
          onStoreSelect={handleStoreSelect}
          onDeselect={() => setSelectedStore(null)}
          onStoreDetail={setDetailStoreId}
          onMapMove={() => setMapMoved(true)}
        />
        {loading && (
          <div className="absolute top-20 left-1/2 -translate-x-1/2 bg-white/90 rounded-full px-4 py-1.5 shadow text-sm text-gray-600 z-10">
            불러오는 중...
          </div>
        )}
      </div>

      {viewMode === 'map' && (
        /* Bottom overlay */
        <div className="absolute bottom-0 left-0 right-0 z-10 pointer-events-none">
          {/* 위치 초기화 버튼 — 지도 이동/확대축소 시만 표시 */}
          {mapMoved && (
            <div className="flex justify-center pb-2 pointer-events-auto">
              <button
                onClick={resetMapPosition}
                className="flex items-center gap-1.5 bg-white/95 backdrop-blur-sm text-gray-700 text-xs font-medium px-4 py-2 rounded-full shadow-md border border-gray-200 hover:shadow-lg transition-all"
              >
                <LocateFixed size={13} />
                위치 초기화
              </button>
            </div>
          )}

          {/* 카테고리 필터 */}
          <div className="flex gap-2 px-4 pb-2 overflow-x-auto pointer-events-auto" style={{ scrollbarWidth: 'none' }}>
            <button
              onClick={() => setSelectedCategories([])}
              className={`flex-shrink-0 text-sm px-4 py-2 rounded-full border transition-colors backdrop-blur-sm ${
                selectedCategories.length === 0
                  ? 'bg-blue-500 text-white border-blue-500'
                  : 'bg-white/80 text-gray-600 border-gray-200'
              }`}
            >
              전체
            </button>
            {categories.map((cat) => {
              const active = selectedCategories.includes(cat.id)
              return (
                <button
                  key={cat.id}
                  onClick={() => toggleCategory(cat.id)}
                  className={`flex-shrink-0 px-4 py-2 rounded-full border transition-colors backdrop-blur-sm flex items-center gap-1.5 text-sm whitespace-nowrap ${
                    active ? 'bg-blue-500 text-white border-blue-500' : 'bg-white/80 text-gray-600 border-gray-200'
                  }`}
                >
                  {cat.icon && (
                    <span
                      className="flex items-center"
                      dangerouslySetInnerHTML={{ __html: getIconSvgHtml(cat.icon, active ? 'white' : '#6b7280', 16) }}
                    />
                  )}
                  {cat.name}
                </button>
              )
            })}
            {/* 미분류 */}
            <button
              onClick={() => toggleCategory('__none__')}
              className={`flex-shrink-0 px-4 py-2 rounded-full border transition-colors backdrop-blur-sm text-sm ${
                selectedCategories.includes('__none__')
                  ? 'bg-blue-500 text-white border-blue-500'
                  : 'bg-white/80 text-gray-600 border-gray-200'
              }`}
            >
              미분류
            </button>
          </div>

          {/* 가로 스크롤 카드 */}
          <div ref={cardScrollRef} className="flex gap-3 px-4 pt-3 pb-5 overflow-x-auto pointer-events-auto" style={{ scrollbarWidth: 'none' }}>
            {loading ? (
              <div className="flex-shrink-0 w-44 h-24 bg-white/80 rounded-2xl animate-pulse" />
            ) : stores.length === 0 ? (
              <div className="flex-shrink-0 bg-white/90 rounded-2xl px-4 py-3 text-sm text-gray-400">
                매장이 없습니다.
              </div>
            ) : (
              stores.map((store) => (
                <HorizontalStoreCard
                  key={store.id}
                  store={store}
                  selected={selectedStoreId === store.id}
                  onClick={() => handleStoreSelect(store)}
                />
              ))
            )}
          </div>
        </div>
      )}

      {viewMode === 'list' && (
        /* 목록 뷰 — 전체화면, 네비 높이(56px) + 16px 패딩 */
        <div className="absolute inset-0 z-[5] bg-gray-50 overflow-y-auto pt-[72px]">
          <div className="p-4 max-w-2xl mx-auto">
            {/* 카테고리 필터 */}
            <div className="flex gap-2 mb-3 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
              <button
                onClick={() => setSelectedCategories([])}
                className={`flex-shrink-0 text-xs px-3.5 py-2 rounded-full border transition-colors ${
                  selectedCategories.length === 0 ? 'bg-blue-500 text-white border-blue-500' : 'text-gray-500 border-gray-200 hover:bg-gray-50'
                }`}
              >
                전체
              </button>
              {categories.map((cat) => {
                const active = selectedCategories.includes(cat.id)
                return (
                  <button
                    key={cat.id}
                    onClick={() => toggleCategory(cat.id)}
                    className={`flex-shrink-0 px-4 py-2 rounded-full border transition-colors flex items-center gap-1.5 text-sm whitespace-nowrap ${
                      active ? 'bg-blue-500 text-white border-blue-500' : 'text-gray-600 border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    {cat.icon && (
                      <span
                        className="flex items-center"
                        dangerouslySetInnerHTML={{ __html: getIconSvgHtml(cat.icon, active ? 'white' : '#6b7280', 16) }}
                      />
                    )}
                    {cat.name}
                  </button>
                )
              })}
              {/* 미분류 */}
              <button
                onClick={() => toggleCategory('__none__')}
                className={`flex-shrink-0 px-4 py-2 rounded-full border transition-colors text-sm ${
                  selectedCategories.includes('__none__')
                    ? 'bg-blue-500 text-white border-blue-500'
                    : 'text-gray-600 border-gray-200 hover:bg-gray-50'
                }`}
              >
                미분류
              </button>
            </div>

            <p className="text-sm text-gray-500 mb-3">총 {total}개 매장</p>
            <div className="space-y-2">
              {loading ? (
                <p className="text-center text-gray-400 py-8">불러오는 중...</p>
              ) : stores.length === 0 ? (
                <p className="text-center text-gray-400 py-8">매장이 없습니다.</p>
              ) : (
                stores.map((store) => (
                  <button
                    key={store.id}
                    onClick={() => setDetailStoreId(store.id)}
                    className="w-full text-left block border rounded-xl p-4 bg-white hover:shadow-md transition-all"
                  >
                    <CategoryBadge category={store.category} />
                    <p className="font-semibold text-gray-900">{store.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{store.address}</p>
                    <div className="flex gap-3 mt-1">
                      {store.walkingMinutes != null && (
                        <span className="text-xs text-blue-500">🏢 회사로부터 {store.walkingMinutes}분</span>
                      )}
                      {store.internalRating && (
                        <span className="text-xs text-amber-500">★ {store.internalRating.avgTotal.toFixed(1)}</span>
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      <StoreSlideOver
        storeId={detailStoreId}
        onClose={() => setDetailStoreId(null)}
        onStoreSelect={(store) => {
          setDetailStoreId(store.id)
          setSelectedStore(store)
          moveTo(store.lat, store.lng, 17)
        }}
      />
    </div>
  )
}
