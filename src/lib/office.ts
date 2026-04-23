// 회사 기준 위치: 띵스파이어 (서울특별시 용산구 한강대로96길 27)
export const OFFICE = {
  address: '서울특별시 용산구 한강대로96길 27',
  lat: 37.5472294,
  lng: 126.9733870,
} as const

export function calcOfficeDistance(lat: number, lng: number): { officeDistanceM: number; walkingMinutes: number } {
  const R = 6371000
  const dLat = ((lat - OFFICE.lat) * Math.PI) / 180
  const dLng = ((lng - OFFICE.lng) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((OFFICE.lat * Math.PI) / 180) *
      Math.cos((lat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2
  const distanceM = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  // 도보: 직선거리 * 1.3(경로계수) ÷ 75m/min
  const walkingMinutes = Math.max(1, Math.round((distanceM * 1.3) / 75))
  return { officeDistanceM: Math.round(distanceM), walkingMinutes }
}
