interface KakaoPlace {
  id: string
  place_name: string
  address_name: string
  road_address_name: string
  phone: string
  category_name: string
  x: string // lng
  y: string // lat
  place_url: string
}

interface KakaoResult {
  name: string
  address: string
  lat: number
  lng: number
  phone: string | null
  category: string | null
  kakaoUrl: string
  rawData: KakaoPlace
}

export async function searchKakao(keyword: string, page = 1, size = 15): Promise<KakaoResult[]> {
  const apiKey = process.env.KAKAO_REST_API_KEY
  if (!apiKey) throw new Error('KAKAO_REST_API_KEY is not set')

  const params = new URLSearchParams({
    query: keyword,
    category_group_code: 'FD6,CE7', // 음식점 + 카페
    page: String(page),
    size: String(size),
  })

  const res = await fetch(`https://dapi.kakao.com/v2/local/search/keyword.json?${params}`, {
    headers: { Authorization: `KakaoAK ${apiKey}` },
  })

  if (!res.ok) throw new Error(`Kakao API error: ${res.status}`)

  const json = await res.json()
  const documents: KakaoPlace[] = json.documents ?? []

  return documents.map((d) => ({
    name: d.place_name,
    address: d.road_address_name || d.address_name,
    lat: parseFloat(d.y),
    lng: parseFloat(d.x),
    phone: d.phone || null,
    category: d.category_name.split('>').pop()?.trim() ?? null,
    kakaoUrl: d.place_url,
    rawData: d,
  }))
}
