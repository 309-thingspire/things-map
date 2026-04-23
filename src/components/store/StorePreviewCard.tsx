import Link from 'next/link'
import { X } from 'lucide-react'
import type { StoreListItem } from '@/types'
import { OFFICE } from '@/lib/office'

interface StorePreviewCardProps {
  store: StoreListItem
  onClose: () => void
}

export default function StorePreviewCard({ store, onClose }: StorePreviewCardProps) {
  const directionsUrl = `https://map.naver.com/v5/directions/${OFFICE.lng},${OFFICE.lat},${encodeURIComponent('회사')}/${store.lng},${store.lat},${encodeURIComponent(store.name)}/walk`

  return (
    <div className="bg-white rounded-xl shadow-lg p-4 relative">
      <button
        onClick={onClose}
        className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"
        aria-label="닫기"
      >
        <X size={16} />
      </button>

      {/* 카테고리 뱃지 */}
      {store.category && (
        <span
          className="inline-block text-xs font-medium px-2 py-0.5 rounded-full text-white mb-2"
          style={{ background: store.category.color ?? '#6b7280' }}
        >
          {store.category.name}
        </span>
      )}

      <h3 className="font-semibold text-gray-900 text-base leading-tight pr-6">{store.name}</h3>
      <p className="text-xs text-gray-500 mt-0.5">{store.address}</p>

      <div className="mt-2 space-y-1">
        {store.walkingMinutes != null && (
          <p className="text-xs text-blue-500">
            🚶 도보 {store.walkingMinutes}분
            {store.officeDistanceM != null && ` (${store.officeDistanceM}m)`}
          </p>
        )}
        {store.internalRating && (
          <p className="text-xs text-amber-500">
            ★ {store.internalRating.avgTotal.toFixed(1)}{' '}
            <span className="text-gray-400">({store.internalRating.reviewCount}개 리뷰)</span>
          </p>
        )}
        {store.themeTags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {store.themeTags.map((tag) => (
              <span key={tag} className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="mt-3 flex gap-2">
        <a
          href={directionsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 text-center text-xs bg-blue-500 hover:bg-blue-600 text-white py-1.5 rounded-lg transition-colors font-semibold"
        >
          길찾기
        </a>
        <Link
          href={`/stores/${store.id}`}
          className="flex-1 text-center text-xs border border-gray-300 hover:bg-gray-50 text-gray-700 py-1.5 rounded-lg transition-colors"
        >
          상세보기
        </Link>
      </div>
    </div>
  )
}
