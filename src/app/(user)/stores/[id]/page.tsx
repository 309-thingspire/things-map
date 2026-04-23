'use client'

import { use, useEffect, useState } from 'react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import RatingDisplay from '@/components/store/RatingDisplay'
import ReviewForm from '@/components/store/ReviewForm'
import { useAuth } from '@/hooks/useAuth'
import type { StoreDetail, Review } from '@/types'

export default function StoreDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { user } = useAuth()
  const [store, setStore] = useState<StoreDetail | null>(null)
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false)

  async function fetchStore() {
    const res = await fetch(`/api/stores/${id}`)
    if (res.ok) {
      const json = await res.json()
      setStore(json.data)
    }
  }

  async function fetchReviews() {
    const res = await fetch(`/api/stores/${id}/reviews`)
    if (res.ok) {
      const json = await res.json()
      setReviews(json.data.reviews)
    }
  }

  useEffect(() => {
    Promise.all([fetchStore(), fetchReviews()]).finally(() => setLoading(false))
  }, [id]) // eslint-disable-line

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">불러오는 중...</p>
      </div>
    )
  }

  if (!store) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-gray-500">매장을 찾을 수 없습니다.</p>
        <Link href="/" className="text-blue-500 hover:underline">홈으로</Link>
      </div>
    )
  }

  return (
    <div className="bg-gray-50">
      <div className="px-4 pt-4 max-w-2xl mx-auto">
        <Link href="/" className="text-sm text-gray-500 hover:text-gray-700">← 뒤로</Link>
      </div>

      <main className="max-w-2xl mx-auto p-4 space-y-6">
        {/* 기본 정보 */}
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{store.name}</h2>
              <p className="text-gray-500 mt-1">{store.address}</p>
            </div>
            <div className="flex flex-wrap gap-1 justify-end">
              {store.category && <Badge variant="secondary">{store.category.name}</Badge>}
              {store.themeTags.map((tag) => (
                <Badge key={tag} variant="outline">{tag}</Badge>
              ))}
            </div>
          </div>

          {store.phone && (
            <p className="mt-3 text-sm text-gray-600">📞 {store.phone}</p>
          )}
          {store.businessHours && (
            <p className="mt-1 text-sm text-gray-600">🕐 {store.businessHours}</p>
          )}

          <div className="flex gap-3 mt-4">
            {store.naverUrl && (
              <a href={store.naverUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-green-600 hover:underline">네이버 지도</a>
            )}
            {store.kakaoUrl && (
              <a href={store.kakaoUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-yellow-600 hover:underline">카카오 지도</a>
            )}
            {store.googleUrl && (
              <a href={store.googleUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline">구글 지도</a>
            )}
          </div>
        </div>

        {/* 메뉴 */}
        {store.menus.length > 0 && (
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <h3 className="font-semibold text-gray-900 mb-3">메뉴</h3>
            <div className="space-y-2">
              {store.menus.map((menu) => (
                <div key={menu.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-800">{menu.name}</span>
                    {menu.isRepresentative && <Badge className="text-xs">대표</Badge>}
                  </div>
                  {menu.price != null && (
                    <span className="text-sm text-gray-600">{menu.price.toLocaleString()}원</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 평점 */}
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">평점 및 리뷰</h3>
            {user ? (
              <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">리뷰 작성</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>리뷰 작성 — {store.name}</DialogTitle>
                  </DialogHeader>
                  <ReviewForm
                    storeId={id}
                    onSuccess={() => {
                      setReviewDialogOpen(false)
                      fetchStore()
                      fetchReviews()
                    }}
                  />
                </DialogContent>
              </Dialog>
            ) : (
              <Link href="/login">
                <Button size="sm" variant="outline">로그인 후 작성</Button>
              </Link>
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
          <div className="bg-white rounded-2xl p-6 shadow-sm space-y-4">
            <h3 className="font-semibold text-gray-900">리뷰 {reviews.length}개</h3>
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
                  {review.visitedAt ? `방문: ${review.visitedAt.slice(0, 10)} · ` : ''}
                  {new Date(review.createdAt).toLocaleDateString('ko-KR')}
                </p>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
