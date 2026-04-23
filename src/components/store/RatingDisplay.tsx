import type { InternalRating } from '@/types'

interface RatingDisplayProps {
  rating: InternalRating
  compact?: boolean
}

const labels: { key: keyof InternalRating; label: string }[] = [
  { key: 'avgTaste', label: '맛' },
  { key: 'avgPrice', label: '가성비' },
  { key: 'avgService', label: '서비스' },
  { key: 'avgAmbiance', label: '분위기' },
  { key: 'avgCleanliness', label: '청결도' },
]

function StarBar({ value }: { value: number }) {
  const pct = (value / 5) * 100
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden">
        <div className="bg-amber-400 h-2 rounded-full" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-sm font-medium text-gray-700 w-8 text-right">{value.toFixed(1)}</span>
    </div>
  )
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
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <span className="text-4xl font-bold text-amber-500">{rating.avgTotal.toFixed(1)}</span>
        <div>
          <div className="flex text-amber-400">
            {'★'.repeat(Math.round(rating.avgTotal))}{'☆'.repeat(5 - Math.round(rating.avgTotal))}
          </div>
          <p className="text-sm text-gray-500">리뷰 {rating.reviewCount}개</p>
        </div>
      </div>
      <div className="space-y-2">
        {labels.map(({ key, label }) => (
          <div key={key} className="flex items-center gap-3">
            <span className="text-sm text-gray-600 w-14">{label}</span>
            <StarBar value={rating[key] as number} />
          </div>
        ))}
      </div>
    </div>
  )
}
