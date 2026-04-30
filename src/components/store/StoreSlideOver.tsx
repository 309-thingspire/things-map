'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { X, PenLine, Heart, ExternalLink } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import RatingDisplay from '@/components/store/RatingDisplay'
import ReviewForm from '@/components/store/ReviewForm'
import LoginPromptModal from '@/components/store/LoginPromptModal'
import { useAuth } from '@/hooks/useAuth'
import { getIconSvgHtml } from '@/lib/markerIcons'
import type { StoreDetail, StoreListItem, Review } from '@/types'
import { OFFICE } from '@/lib/office'

interface Props {
  storeId: string | null
  userLocation?: { lat: number; lng: number } | null
  onClose: () => void
  onStoreSelect?: (store: StoreListItem) => void
  onFavoriteChange?: (isFavorited: boolean) => void
}

const PARTIAL_VISIBLE_PX = 310  // height of content visible in partial snap
const ANIM = 'transform 0.36s cubic-bezier(0.32,0.72,0,1)'

export default function StoreSlideOver({ storeId, userLocation, onClose, onStoreSelect, onFavoriteChange }: Props) {
  const { user } = useAuth()
  const [store, setStore] = useState<StoreDetail | null>(null)
  const [reviews, setReviews] = useState<Review[]>([])
  const [recommendations, setRecommendations] = useState<StoreListItem[]>([])
  const [loading, setLoading] = useState(false)
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false)
  const [loginPromptOpen, setLoginPromptOpen] = useState(false)
  const [open, setOpen] = useState(false)
  const [snapPoint, setSnapPoint] = useState<'partial' | 'full'>('partial')
  const [isDesktop, setIsDesktop] = useState(false)
  const [isFavorited, setIsFavorited] = useState(false)
  const [favoriteCount, setFavoriteCount] = useState(0)
  const [tmapWalking, setTmapWalking] = useState<{ distanceM: number; walkingMinutes: number } | null>(null)
  const [showAllMenus, setShowAllMenus] = useState(false)

  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<{ startY: number; startPx: number } | null>(null)
  const snapRef = useRef<'partial' | 'full'>('partial')
  const isDesktopRef = useRef(false)

  useLayoutEffect(() => {
    const mq = window.matchMedia('(min-width: 640px)')
    isDesktopRef.current = mq.matches
    setIsDesktop(mq.matches)
    const h = (e: MediaQueryListEvent) => { isDesktopRef.current = e.matches; setIsDesktop(e.matches) }
    mq.addEventListener('change', h)
    return () => mq.removeEventListener('change', h)
  }, [])

  function getPartialPx() {
    const h = panelRef.current?.offsetHeight ?? window.innerHeight
    return Math.max(0, h - PARTIAL_VISIBLE_PX)
  }

  function moveTo(px: number, animated: boolean) {
    const el = panelRef.current
    if (!el) return
    el.style.transition = animated ? ANIM : 'none'
    el.style.transform = `translateY(${px}px)`
  }

  // Entrance animation on each new storeId
  useLayoutEffect(() => {
    if (!storeId || isDesktopRef.current || !panelRef.current) return
    const el = panelRef.current
    el.style.transition = 'none'
    el.style.transform = `translateY(${el.offsetHeight}px)`
    requestAnimationFrame(() => {
      el.style.transition = ANIM
      el.style.transform = `translateY(${getPartialPx()}px)`
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeId])

  useEffect(() => {
    if (!storeId) {
      setOpen(false)
      return
    }

    setOpen(true)
    setSnapPoint('partial')
    snapRef.current = 'partial'
    setLoading(true)
    setStore(null)
    setReviews([])
    setRecommendations([])
    setIsFavorited(false)
    setFavoriteCount(0)
    setTmapWalking(null)
    setShowAllMenus(false)

    Promise.all([
      fetch(`/api/stores/${storeId}`).then((r) => r.ok ? r.json() : null),
      fetch(`/api/stores/${storeId}/reviews`).then((r) => r.ok ? r.json() : null),
    ]).then(async ([storeJson, reviewsJson]) => {
      const loadedStore: StoreDetail | null = storeJson?.data ?? null
      setStore(loadedStore)
      setIsFavorited(loadedStore?.isFavorited ?? false)
      setFavoriteCount(loadedStore?.favoriteCount ?? 0)
      setReviews(reviewsJson?.data.reviews ?? [])

      if (loadedStore?.lat && loadedStore?.lng) {
        const startParams = userLocation
          ? `&startLat=${userLocation.lat}&startLng=${userLocation.lng}`
          : ''
        fetch(`/api/tmap/walking?goalLat=${loadedStore.lat}&goalLng=${loadedStore.lng}${startParams}`)
          .then((r) => r.ok ? r.json() : null)
          .then((j) => { if (j?.walkingMinutes) setTmapWalking({ distanceM: j.distanceM, walkingMinutes: j.walkingMinutes }) })
          .catch(() => {})
      }

      if (loadedStore?.category?.id) {
        const recRes = await fetch(
          `/api/stores?lat=${OFFICE.lat}&lng=${OFFICE.lng}&categories=${loadedStore.category.id}&limit=12`
        )
        if (recRes.ok) {
          const recJson = await recRes.json()
          setRecommendations((recJson.data.stores ?? []).filter((s: StoreListItem) => s.id !== storeId))
        }
      }
    }).finally(() => setLoading(false))
  }, [storeId])

  async function toggleFavorite() {
    if (!user) { setLoginPromptOpen(true); return }
    if (!store) return
    const method = isFavorited ? 'DELETE' : 'POST'
    const res = await fetch(`/api/stores/${store.id}/favorite`, { method })
    if (res.ok) {
      const next = !isFavorited
      setIsFavorited(next)
      setFavoriteCount((c) => next ? c + 1 : Math.max(0, c - 1))
      onFavoriteChange?.(next)
    }
  }

  function handleClose() {
    if (panelRef.current && !isDesktopRef.current) {
      moveTo(panelRef.current.offsetHeight, true)
    }
    setOpen(false)
    setSnapPoint('partial')
    snapRef.current = 'partial'
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current)
    closeTimerRef.current = setTimeout(onClose, 380)
  }

  function initDrag(clientY: number) {
    if (isDesktopRef.current) return false
    const startPx = snapRef.current === 'full' ? 0 : getPartialPx()
    dragRef.current = { startY: clientY, startPx }
    if (panelRef.current) {
      panelRef.current.style.transition = 'none'
      panelRef.current.style.transform = `translateY(${startPx}px)`
    }
    return true
  }

  function onHandleTouchStart(e: React.TouchEvent) {
    initDrag(e.touches[0].clientY)
  }

  // 전체 패널 터치 — partial 모드이거나 full 모드에서 스크롤 최상단일 때만 드래그
  function onPanelTouchStart(e: React.TouchEvent) {
    if (isDesktopRef.current) return
    // 버튼·링크·인풋 위에서는 드래그 시작 안 함
    if ((e.target as HTMLElement).closest('button, a, input, textarea, select')) return
    // full 모드: 스크롤이 최상단이 아니면 스크롤에 양보
    if (snapRef.current === 'full' && (scrollRef.current?.scrollTop ?? 0) > 4) return
    initDrag(e.touches[0].clientY)
  }

  function onHandleTouchMove(e: React.TouchEvent) {
    if (!dragRef.current || !panelRef.current) return
    const deltaY = e.touches[0].clientY - dragRef.current.startY
    if (Math.abs(deltaY) < 4) return  // 미세한 탭은 무시
    const newY = Math.max(0, dragRef.current.startPx + deltaY)
    panelRef.current.style.transform = `translateY(${newY}px)`
  }

  function onHandleTouchEnd(e: React.TouchEvent) {
    if (!dragRef.current || !panelRef.current) return
    const deltaY = e.changedTouches[0].clientY - dragRef.current.startY
    const endY = Math.max(0, dragRef.current.startPx + deltaY)
    const prevSnap = snapRef.current
    dragRef.current = null

    const vh = window.innerHeight
    const partialPx = getPartialPx()

    if (endY < vh * 0.5) {
      // 화면 절반 이상 → full
      snapRef.current = 'full'
      setSnapPoint('full')
      moveTo(0, true)
    } else if (prevSnap === 'full' && deltaY > 8) {
      // full → 조금만 내려도 partial로 (8px)
      snapRef.current = 'partial'
      setSnapPoint('partial')
      moveTo(partialPx, true)
    } else if (prevSnap === 'partial' && deltaY > 60) {
      // partial → 아래로 많이 → 닫기
      moveTo(panelRef.current.offsetHeight, true)
      handleClose()
    } else {
      // 현재 위치로 복귀
      moveTo(prevSnap === 'full' ? 0 : partialPx, true)
    }
  }

  if (!storeId && !open) return null

  // Desktop only: slide in/out from right
  const desktopClass = open ? 'sm:translate-x-0' : 'sm:translate-x-[calc(100%+12px)]'
  // Border/radius: hidden when full-screen mobile (seamless edge)
  const isMobileFull = !isDesktop && snapPoint === 'full'

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 ${open ? '' : 'pointer-events-none'}`}
        onClick={handleClose}
      />

      {/* Panel */}
      <div
        ref={panelRef}
        className={`
          fixed z-50 bg-white flex flex-col shadow-2xl
          sm:transition-transform sm:duration-300
          inset-x-0 bottom-0 top-0
          sm:inset-x-auto sm:right-3 sm:top-3 sm:bottom-3 sm:w-full sm:max-w-[440px]
          sm:rounded-2xl sm:border
          ${isMobileFull ? '' : 'rounded-t-2xl border-t border-gray-200'}
          ${desktopClass}
        `}
        onTouchStart={onPanelTouchStart}
        onTouchMove={onHandleTouchMove}
        onTouchEnd={onHandleTouchEnd}
      >
        {/* 드래그 핸들 (모바일 전용) */}
        <div
          className="sm:hidden flex justify-center pt-3 pb-1 shrink-0 touch-none"
          onTouchStart={onHandleTouchStart}
          onTouchMove={onHandleTouchMove}
          onTouchEnd={onHandleTouchEnd}
        >
          <div className="w-10 h-1 rounded-full bg-gray-300" />
        </div>

        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-3 border-b shrink-0 sm:py-4 touch-none"
          onTouchStart={onHandleTouchStart}
          onTouchMove={onHandleTouchMove}
          onTouchEnd={onHandleTouchEnd}
        >
          <div className="flex items-center gap-1.5 min-w-0 pr-2">
            {favoriteCount >= 5 && (
              <span className="shrink-0" dangerouslySetInnerHTML={{ __html: getIconSvgHtml('award-fill', '#f59e0b', 16) }} />
            )}
            <span className="font-semibold text-gray-900 truncate">{store?.name ?? '불러오는 중...'}</span>
            {store?.naverUrl && (
              <a
                href={store.naverUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
                title="네이버 지도에서 보기"
              >
                <ExternalLink size={14} />
              </a>
            )}
          </div>
          <button onClick={handleClose} className="shrink-0 p-1.5 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Scrollable content */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto min-h-0">
          {loading ? (
            <div className="flex items-center justify-center h-48 text-gray-400 text-sm">불러오는 중...</div>
          ) : !store ? (
            <div className="flex items-center justify-center h-48 text-gray-400 text-sm">매장을 찾을 수 없습니다.</div>
          ) : (
            <div className="p-5 space-y-5">
              {/* 기본 정보 */}
              <div>
                <div className="flex flex-wrap gap-1 mb-2">
                  {store.category?.color ? (
                    <Badge style={{ background: store.category.color, color: 'white', border: 'none' }}>{store.category.name}</Badge>
                  ) : store.category?.name ? (
                    <Badge variant="secondary">{store.category.name}</Badge>
                  ) : (
                    <Badge variant="outline" className="text-gray-300">미지정</Badge>
                  )}
                </div>

                <div className="flex items-center gap-2 min-w-0 mt-1">
                  {favoriteCount >= 5 && (
                    <span className="shrink-0" dangerouslySetInnerHTML={{ __html: getIconSvgHtml('award-fill', '#f59e0b', 18) }} />
                  )}
                  <h2 className="text-xl font-bold text-gray-900 truncate">{store.name}</h2>
                </div>
                <p className="text-sm text-gray-500 mt-1">{store.address}</p>
                {(tmapWalking ?? (store.walkingMinutes != null ? { distanceM: store.officeDistanceM ?? 0, walkingMinutes: store.walkingMinutes } : null)) != null && (() => {
                  const w = tmapWalking ?? { distanceM: store.officeDistanceM ?? 0, walkingMinutes: store.walkingMinutes! }
                  return (
                    <p className="text-sm text-[#38c68b] mt-1">
                      🚶 도보 {w.walkingMinutes}분
                      {w.distanceM > 0 && <span className="text-gray-400 text-xs ml-1">({w.distanceM}m)</span>}
                    </p>
                  )
                })()}
                {/* 전화·영업시간 — 추후 표시 예정 */}

                <button
                  onClick={toggleFavorite}
                  className={`mt-3 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                    isFavorited
                      ? 'bg-red-50 text-red-500 hover:bg-red-100'
                      : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Heart size={16} className={isFavorited ? 'fill-red-500' : ''} />
                  {isFavorited ? '즐겨찾기 해제' : '즐겨찾기'}
                  {favoriteCount > 0 && <span className="font-bold ml-1">{favoriteCount}</span>}
                </button>
              </div>

              {/* 메뉴 */}
              {store.menus.length > 0 && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">메뉴</h3>
                  <div className="divide-y divide-gray-50">
                    {(showAllMenus ? store.menus : store.menus.slice(0, 5)).map((menu) => (
                      <div key={menu.id} className="flex items-center justify-between py-2 text-sm">
                        <div className="flex items-center gap-1.5 min-w-0 mr-4">
                          <span className="text-gray-800 truncate">{menu.name}</span>
                          {menu.isRepresentative && (
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 shrink-0">대표</Badge>
                          )}
                        </div>
                        <span className="shrink-0 text-gray-500 tabular-nums">
                          {menu.price != null ? `${menu.price.toLocaleString()}원` : '—'}
                        </span>
                      </div>
                    ))}
                  </div>
                  {store.menus.length > 5 && (
                    <button
                      onClick={() => setShowAllMenus((v) => !v)}
                      className="mt-2 w-full text-center text-sm text-gray-500 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                    >
                      {showAllMenus ? '접기' : `더보기 (+${store.menus.length - 5}개)`}
                    </button>
                  )}
                </div>
              )}

              {/* 평점 */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-gray-900">평점 및 리뷰</h3>
                  <button
                    onClick={() => user ? setReviewDialogOpen(true) : setLoginPromptOpen(true)}
                    className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                    title="리뷰 작성"
                  >
                    <PenLine size={16} />
                  </button>
                  {user && (
                    <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>리뷰 작성 — {store.name}</DialogTitle>
                        </DialogHeader>
                        <ReviewForm
                          storeId={store.id}
                          onSuccess={async () => {
                            setReviewDialogOpen(false)
                            // 리뷰 목록 + 평점 즉시 갱신
                            const [reviewsJson, storeJson] = await Promise.all([
                              fetch(`/api/stores/${store.id}/reviews`).then(r => r.ok ? r.json() : null),
                              fetch(`/api/stores/${store.id}`).then(r => r.ok ? r.json() : null),
                            ])
                            if (reviewsJson) setReviews(reviewsJson.data.reviews ?? [])
                            if (storeJson?.data) setStore(storeJson.data)
                          }}
                        />
                      </DialogContent>
                    </Dialog>
                  )}
                  {loginPromptOpen && (
                    <LoginPromptModal
                      onClose={() => setLoginPromptOpen(false)}
                      message="리뷰 작성은 로그인 후 이용할 수 있습니다."
                    />
                  )}
                </div>
                {store.internalRating ? (
                  <RatingDisplay rating={store.internalRating} />
                ) : (
                  <p className="text-sm text-gray-400">아직 리뷰가 없습니다.</p>
                )}
              </div>

              {/* 리뷰 목록 */}
              {reviews.length > 0 && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">리뷰 {reviews.length}개</h3>
                  <div className="space-y-4">
                    {reviews.map((review) => (
                      <div key={review.id} className="border-b last:border-0 pb-4 last:pb-0">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="font-medium text-sm">{review.user.name}</span>
                            <span className="text-xs text-gray-400 ml-2">{review.user.team}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-amber-400">★</span>
                            <span className="text-sm font-semibold">{review.scoreTotal.toFixed(1)}</span>
                          </div>
                        </div>
                        {review.content && (
                          <p className="text-sm text-gray-700 mt-2">{review.content}</p>
                        )}
                        <p className="text-xs text-gray-400 mt-1">
                          {new Date(review.createdAt).toLocaleDateString('ko-KR')}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 추천 매장 — 하단 고정 */}
        {recommendations.length > 0 && (
          <div className="shrink-0 border-t border-gray-100 py-4">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 px-5">
              {store?.category?.name ?? '같은 카테고리'} 추천
            </h3>
            <div className="flex gap-3 overflow-x-auto pb-1 pl-5" style={{ scrollbarWidth: 'none' }}>
              {recommendations.map((rec) => (
                <button
                  key={rec.id}
                  onClick={() => onStoreSelect?.(rec)}
                  className="flex-shrink-0 w-36 text-left rounded-xl border border-gray-100 bg-gray-50 p-3 hover:shadow-md transition-all"
                >
                  <p className="text-xs font-semibold text-gray-900 truncate">{rec.name}</p>
                  <div className="flex items-center gap-1.5 text-[10px] mt-0.5">
                    <span className={rec.internalRating ? 'text-amber-500' : 'text-gray-300'}>
                      ★ {rec.internalRating ? rec.internalRating.avgTotal.toFixed(1) : '0.0'}
                    </span>
                    {(rec.favoriteCount ?? 0) > 0 && (
                      <span className="text-gray-400">❤ {rec.favoriteCount}</span>
                    )}
                  </div>
                  {rec.walkingMinutes != null && (
                    <p className="text-[10px] text-blue-500 mt-0.5">🚶 도보 {rec.walkingMinutes}분</p>
                  )}
                </button>
              ))}
              <div className="shrink-0 w-5" />
            </div>
          </div>
        )}
      </div>
    </>
  )
}
