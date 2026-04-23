export interface Category {
  id: string
  name: string
  icon: string | null
  color: string | null
}

export interface InternalRating {
  avgTotal: number
  avgTaste: number
  avgPrice: number
  avgService: number
  avgAmbiance: number
  avgCleanliness: number
  reviewCount: number
}

export interface StoreListItem {
  id: string
  name: string
  address: string
  lat: number
  lng: number
  category: Category | null
  themeTags: string[]
  internalRating: Pick<InternalRating, 'avgTotal' | 'reviewCount'> | null
  officeDistanceM: number | null
  walkingMinutes: number | null
}

export interface Menu {
  id: string
  name: string
  price: number | null
  isRepresentative: boolean
}

export interface StoreDetail extends StoreListItem {
  phone: string | null
  businessHours: string | null
  menus: Menu[]
  internalRating: InternalRating | null
  naverUrl: string | null
  kakaoUrl: string | null
  googleUrl: string | null
  status: 'ACTIVE' | 'INACTIVE'
}

export interface ReviewUser {
  name: string
  team: string
}

export interface Review {
  id: string
  user: ReviewUser
  scoreTotal: number
  scoreTaste: number
  scorePrice: number
  scoreService: number
  scoreAmbiance: number
  scoreCleanliness: number
  content: string | null
  visitedAt: string | null
  likes: number
  status: 'ACTIVE' | 'HIDDEN' | 'REPORTED'
  createdAt: string
}

export interface User {
  id: string
  name: string
  team: string
  role: 'USER' | 'ADMIN'
  isActive: boolean
  lastLogin: string | null
  approvalCode?: string
  createdAt: string
}

export interface StoreRequest {
  id: string
  userId: string
  user: ReviewUser
  storeId: string | null
  requestType: 'NEW' | 'EDIT'
  payload: Record<string, unknown>
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  adminNote: string | null
  createdAt: string
  reviewedAt: string | null
}

export interface StagingStore {
  id: string
  crawlJobId: string | null
  name: string
  address: string
  lat: number | null
  lng: number | null
  phone: string | null
  businessHours: string | null
  categoryId: string | null
  themeTags: string[]
  menus: unknown
  rawData: unknown
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  createdAt: string
}

export interface CrawlJob {
  id: string
  platform: 'KAKAO' | 'NAVER' | 'PLAYWRIGHT'
  keyword: string
  source: 'API' | 'PLAYWRIGHT'
  status: 'PENDING' | 'RUNNING' | 'DONE' | 'FAILED'
  resultCount: number
  executedAt: string
}
