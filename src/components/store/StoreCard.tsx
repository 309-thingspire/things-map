import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import type { StoreListItem } from '@/types'

interface StoreCardProps {
  store: StoreListItem
  selected?: boolean
  onClick?: () => void
}

export default function StoreCard({ store, selected, onClick }: StoreCardProps) {
  return (
    <div
      className={`border rounded-xl p-4 cursor-pointer transition-all hover:shadow-md ${selected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white'}`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 truncate">{store.name}</h3>
          <p className="text-sm text-gray-500 truncate mt-0.5">{store.address}</p>
          {store.walkingMinutes != null && (
            <p className="text-xs text-blue-500 mt-0.5">🚶 도보 {store.walkingMinutes}분</p>
          )}
        </div>
        {store.internalRating && (
          <div className="text-right shrink-0">
            <span className="text-amber-500 font-bold text-sm">★ {store.internalRating.avgTotal.toFixed(1)}</span>
            <p className="text-xs text-gray-400">{store.internalRating.reviewCount}개</p>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-1 mt-2">
        {store.category && (
          <Badge variant="secondary" className="text-xs">
            {store.category.name}
          </Badge>
        )}
        {store.themeTags.slice(0, 3).map((tag) => (
          <Badge key={tag} variant="outline" className="text-xs">
            {tag}
          </Badge>
        ))}
      </div>

      <Link
        href={`/stores/${store.id}`}
        className="text-xs text-blue-500 mt-2 inline-block hover:underline"
        onClick={(e) => e.stopPropagation()}
      >
        상세보기 →
      </Link>
    </div>
  )
}
