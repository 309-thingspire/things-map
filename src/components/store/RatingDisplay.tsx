import type { InternalRating } from '@/types'

interface RatingDisplayProps {
  rating: InternalRating
  compact?: boolean
}

export default function RatingDisplay({ rating, compact }: RatingDisplayProps) {
  if (compact) {
    return (
      <div className="flex items-center gap-1">
        <span className="text-amber-500 text-lg font-bold">★</span>
        <span className="text-lg font-bold">{rating.avgTotal.toFixed(1)}</span>
        <span className="text-sm text-gray-500">({rating.reviewCount}개)</span>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-3">
      <span className="text-4xl font-bold text-amber-500">{rating.avgTotal.toFixed(1)}</span>
      <div>
        <div className="flex text-amber-400 text-lg">
          {'★'.repeat(Math.round(rating.avgTotal))}{'☆'.repeat(5 - Math.round(rating.avgTotal))}
        </div>
        <p className="text-sm text-gray-500">리뷰 {rating.reviewCount}개</p>
      </div>
    </div>
  )
}
