'use client'

import { useEffect, useRef, useState } from 'react'
import { X, PenLine, Heart } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import RatingDisplay from '@/components/store/RatingDisplay'
import ReviewForm from '@/components/store/ReviewForm'
import LoginPromptModal from '@/components/store/LoginPromptModal'
import { useAuth } from '@/hooks/useAuth'
import { getIconSvgHtml } from '@/lib/markerIcons'
import type { StoreDetail, StoreListItem, Review } from '@/types'
import { OFFICE } from '@/lib/office'

function NaverIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <rect width="20" height="20" rx="3" fill="#03C75A" />
      <path d="M5 15V5h2.8l4.4 7V5H15v10h-2.8l-4.4-7v7H5z" fill="white" />
    </svg>
  )
}

interface Props {
  storeId: string | null
  onClose: () => void
  onStoreSelect?: (store: StoreListItem) => void
  onFavoriteChange?: (isFavorited: boolean) => void
}

export default function StoreSlideOver({ storeId, onClose, onStoreSelect, onFavoriteChange }: Props) {
  const { user } = useAuth()
  const [store, setStore] = useState<StoreDetail | null>(null)
  const [reviews, setReviews] = useState<Review[]>([])
  const [recommendations, setRecommendations] = useState<StoreListItem[]>([])
  const [loading, setLoading] = useState(false)
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false)
  const [loginPromptOpen, setLoginPromptOpen] = useState(false)
  const [open, setOpen] = useState(false)
  const [isFavorited, setIsFavorited] = useState(false)
  const [favoriteCount, setFavoriteCount] = useState(0)
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!storeId) {
      setOpen(false)
      return
    }

    setOpen(true)
    setLoading(true)
    setStore(null)
    setReviews([])
    setRecommendations([])
    setIsFavorited(false)
    setFavoriteCount(0)

    Promise.all([
      fetch(`/api/stores/${storeId}`).then((r) => r.ok ? r.json() : null),
      fetch(`/api/stores/${storeId}/reviews`).then((r) => r.ok ? r.json() : null),
    ]).then(async ([storeJson, reviewsJson]) => {
      const loadedStore: StoreDetail | null = storeJson?.data ?? null
      setStore(loadedStore)
      setIsFavorited(loadedStore?.isFavorited ?? false)
      setFavoriteCount(loadedStore?.favoriteCount ?? 0)
      setReviews(reviewsJson?.data.reviews ?? [])

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
    setOpen(false)
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current)
    closeTimerRef.current = setTimeout(onClose, 300)
  }

  if (!storeId && !open) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 ${open ? '' : 'pointer-events-none'}`}
        onClick={handleClose}
      />

      {/* Panel — full screen on mobile, floating on desktop */}
      <div
        className={`
          fixed z-50 bg-white flex flex-col shadow-2xl
          transition-transform duration-300
          inset-x-0 bottom-0 top-14 rounded-t-2xl border-t border-gray-200
          sm:inset-x-auto sm:right-3 sm:top-3 sm:bottom-3 sm:w-full sm:max-w-[440px] sm:rounded-2xl sm:border
          ${open
            ? 'translate-y-0 sm:translate-y-0 sm:translate-x-0'
            : 'translate-y-full sm:translate-y-0 sm:translate-x-[calc(100%+12px)]'
          }
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b shrink-0">
          <div className="flex items-center gap-1.5 min-w-0 pr-2">
            {favoriteCount >= 5 && (
              <span className="shrink-0" dangerouslySetInnerHTML={{ __html: getIconSvgHtml('award-fill', '#f59e0b', 16) }} />
            )}
            <span className="font-semibold text-gray-900 truncate">{store?.name ?? '불러오는 중...'}</span>
          </div>
          <button onClick={handleClose} className="shrink-0 p-1.5 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto min-h-0">
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
                  {store.themeTags.map((tag) => (
                    <Badge key={tag} variant="outline">{tag}</Badge>
                  ))}
                </div>

                <div className="flex items-start justify-between gap-2 mt-1">
                  <div className="flex items-center gap-2 min-w-0">
                    {favoriteCount >= 5 && (
                      <span className="shrink-0" dangerouslySetInnerHTML={{ __html: getIconSvgHtml('award-fill', '#f59e0b', 18) }} />
                    )}
                    <h2 className="text-xl font-bold text-gray-900 truncate">{store.name}</h2>
                  </div>
                  {store.naverUrl && (
                    <a
                      href={store.naverUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 p-1 text-green-500 hover:text-green-700 transition-colors"
                      title="네이버 지도에서 보기"
                    >
                      <NaverIcon size={22} />
                    </a>
                  )}
                </div>
                <p className="text-sm text-gray-500 mt-1">{store.address}</p>
                {store.walkingMinutes != null && (
                  <p className="text-sm text-[#38c68b] mt-1">🏢 회사로부터 {store.walkingMinutes}분</p>
                )}
                {store.phone && <p className="text-sm text-gray-600 mt-1">📞 {store.phone}</p>}
                {store.businessHours && <p className="text-sm text-gray-600 mt-1">🕐 {store.businessHours}</p>}

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
                  <h3 className="font-semibold text-gray-900 mb-3">메뉴</h3>
                  <div className="space-y-2">
                    {store.menus.map((menu) => (
                      <div key={menu.id} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-800">{menu.name}</span>
                          {menu.isRepresentative && <Badge className="text-xs">대표</Badge>}
                        </div>
                        {menu.price != null && (
                          <span className="text-gray-600">{menu.price.toLocaleString()}원</span>
                        )}
                      </div>
                    ))}
                  </div>
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
                          onSuccess={() => setReviewDialogOpen(false)}
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
          <div className="shrink-0 border-t border-gray-100 px-5 py-4">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
              {store?.category?.name ?? '같은 카테고리'} 추천
            </h3>
            <div className="flex gap-3 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
              {recommendations.map((rec) => (
                <button
                  key={rec.id}
                  onClick={() => onStoreSelect?.(rec)}
                  className="flex-shrink-0 w-36 text-left rounded-xl border border-gray-100 bg-gray-50 p-3 hover:shadow-md transition-all"
                >
                  <p className="text-xs font-semibold text-gray-900 truncate">{rec.name}</p>
                  <p className="text-[10px] text-gray-400 truncate mt-0.5">{rec.address}</p>
                  {rec.walkingMinutes != null && (
                    <p className="text-[10px] text-[#38c68b] mt-1">🏢 {rec.walkingMinutes}분</p>
                  )}
                  {rec.internalRating && (
                    <p className="text-[10px] text-amber-500 mt-0.5">★ {rec.internalRating.avgTotal.toFixed(1)}</p>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  )
}
