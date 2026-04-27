'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Users, Store, ClipboardList, TrendingUp, ChevronDown, ChevronUp } from 'lucide-react'

interface DauPoint { date: string; count: number }
interface PopularStore {
  id: string
  name: string
  category: { name: string; color: string | null } | null
  internalRating: { avgTotal: number; reviewCount: number } | null
  walkingMinutes: number | null
  viewCount: number
  chatCount: number
  favoriteCount: number
}
interface UserStat {
  id: string; name: string; team: string
  lastLogin: string | null
  loginCount: number; reviewCount: number; requestCount: number
}
interface CategoryScore {
  categoryId: string; categoryName: string; color: string | null
  views: number; favorites: number; reviews: number
  avgScore: number | null; score: number
}
interface UserPreference {
  userId: string; userName: string; team: string
  topCategories: CategoryScore[]
}
interface TeamStat {
  team: string; memberCount: number; loginCount: number; reviewCount: number; requestCount: number
}
interface ReviewDimensions {
  count: number
  avg: { total: number; taste: number; price: number; service: number; ambiance: number; cleanliness: number }
}
interface CategoryStat {
  id: string; name: string; color: string | null; storeCount: number; viewCount: number
}
interface RecentStore {
  id: string; name: string; address: string; createdAt: string
  category: { name: string; color: string | null } | null
}
interface Stats {
  summary: { storeCount: number; userCount: number; pendingRequests: number }
  dau: number; mau: number
  visitors: { today: number; todayAnon: number; month: number }
  dauTrend: DauPoint[]
  dauTrend30: DauPoint[]
  popularStores: PopularStore[]
  teamStats: TeamStat[]
  reviewDimensions: ReviewDimensions
  categoryStats: CategoryStat[]
  recentStores: RecentStore[]
  userStats: UserStat[]
}

type UserSortKey = 'name' | 'loginCount' | 'reviewCount' | 'requestCount'

function MiniBar({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0
  return (
    <div className="flex items-center gap-2">
      <div className="w-20 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full bg-blue-400 rounded-full" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-gray-500 w-5 text-right">{value}</span>
    </div>
  )
}

function ScoreBar({ label, value, max = 5 }: { label: string; value: number; max?: number }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-gray-500 w-12 shrink-0">{label}</span>
      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full bg-amber-400 rounded-full" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-medium text-gray-700 w-8 text-right">{value.toFixed(1)}</span>
    </div>
  )
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [showAllStores, setShowAllStores] = useState(false)
  const [userSort, setUserSort] = useState<UserSortKey>('loginCount')
  const [userSortDir, setUserSortDir] = useState<'asc' | 'desc'>('desc')
  const [preferences, setPreferences] = useState<UserPreference[]>([])
  const [trendPeriod, setTrendPeriod] = useState<7 | 30>(7)

  useEffect(() => {
    fetch('/api/admin/stats').then(r => r.json()).then(j => { setStats(j.data); setLoading(false) })
    fetch('/api/admin/user-preferences').then(r => r.json()).then(j => { if (j.data) setPreferences(j.data) })
  }, [])

  function toggleUserSort(key: UserSortKey) {
    if (userSort === key) setUserSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setUserSort(key); setUserSortDir('desc') }
  }

  if (loading || !stats) {
    return <div className="text-gray-400 p-4">불러오는 중...</div>
  }

  const { summary, dau, mau, visitors, dauTrend, dauTrend30, popularStores, teamStats, reviewDimensions, categoryStats, recentStores, userStats } = stats

  const activeTrend = trendPeriod === 7 ? dauTrend : dauTrend30
  const maxDau = Math.max(...activeTrend.map(d => d.count), 1)

  const sortedUsers = [...userStats].sort((a, b) => {
    const av = a[userSort] ?? 0, bv = b[userSort] ?? 0
    if (typeof av === 'string' && typeof bv === 'string') return userSortDir === 'asc' ? av.localeCompare(bv, 'ko') : bv.localeCompare(av, 'ko')
    return userSortDir === 'asc' ? (av as number) - (bv as number) : (bv as number) - (av as number)
  })

  const displayedStores = showAllStores ? popularStores : popularStores.slice(0, 10)

  const maxCatViews = Math.max(...categoryStats.map(c => c.viewCount), 1)
  const maxTeamLogin = Math.max(...teamStats.map(t => t.loginCount), 1)

  function SortBtn({ k, label }: { k: UserSortKey; label: string }) {
    const active = userSort === k
    return (
      <th
        className="text-left px-3 py-2.5 font-medium text-gray-500 cursor-pointer select-none hover:text-gray-800 whitespace-nowrap"
        onClick={() => toggleUserSort(k)}
      >
        {label}
        {active ? (userSortDir === 'asc' ? ' ↑' : ' ↓') : ' ↕'}
      </th>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">대시보드</h1>

      {/* 요약 카드 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: '활성 매장', value: summary.storeCount, href: '/admin/stores', icon: Store, color: 'bg-blue-500' },
          { label: '활성 사용자', value: summary.userCount, href: '/admin/users', icon: Users, color: 'bg-green-500' },
          { label: '대기 요청', value: summary.pendingRequests, href: '/admin/requests', icon: ClipboardList, color: 'bg-amber-500' },
          { label: '오늘 DAU', value: dau, href: '#dau', icon: TrendingUp, color: 'bg-purple-500' },
        ].map((c) => (
          <Link key={c.label} href={c.href}>
            <div className={`${c.color} text-white rounded-xl p-5 hover:opacity-90 transition-opacity`}>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium opacity-80">{c.label}</p>
                <c.icon size={18} className="opacity-60" />
              </div>
              <p className="text-3xl font-bold">{c.value}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* DAU / MAU + 트렌드 */}
      <div id="dau" className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-sm border p-5 flex flex-col justify-between">
          <p className="text-sm font-medium text-gray-500">DAU (오늘)</p>
          <p className="text-4xl font-bold text-gray-900 mt-1">{dau}</p>
          <p className="text-xs text-gray-400 mt-1">로그인 {dau}명 · 비로그인 {visitors.todayAnon}명</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-5 flex flex-col justify-between">
          <p className="text-sm font-medium text-gray-500">방문자 (오늘 / 이번 달)</p>
          <p className="text-4xl font-bold text-gray-900 mt-1">{visitors.today}</p>
          <p className="text-xs text-gray-400 mt-1">MAU {mau}명 · 이번 달 누적 {visitors.month}명</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-gray-500">DAU 트렌드</p>
            <div className="flex gap-1 bg-gray-100 p-0.5 rounded-md">
              {([7, 30] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setTrendPeriod(p)}
                  className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${trendPeriod === p ? 'bg-white shadow text-gray-900' : 'text-gray-400 hover:text-gray-600'}`}
                >
                  {p}일
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-end gap-0.5 h-14">
            {activeTrend.map((d, i) => {
              const showLabel = trendPeriod === 7 || i % 5 === 0 || i === activeTrend.length - 1
              return (
                <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
                  <div
                    className="w-full bg-blue-400 rounded-sm"
                    style={{ height: `${Math.max(2, Math.round((d.count / maxDau) * 44))}px` }}
                    title={`${d.date}: ${d.count}명`}
                  />
                  {showLabel && (
                    <span className="text-[8px] text-gray-400 leading-none whitespace-nowrap">
                      {d.date.replace('월 ', '/').replace('일', '')}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* 팀별 활동 + 리뷰 세부 분석 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* 팀별 활동 */}
        {teamStats.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            <div className="px-5 py-4 border-b">
              <h2 className="font-semibold text-gray-900">팀별 활동 현황</h2>
              <p className="text-xs text-gray-400 mt-0.5">관리자 제외 · 전체 기간 누적</p>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b text-gray-500 text-xs">
                <tr>
                  <th className="text-left px-4 py-2.5 font-medium">팀</th>
                  <th className="text-center px-3 py-2.5 font-medium">인원</th>
                  <th className="text-left px-4 py-2.5 font-medium">로그인</th>
                  <th className="text-center px-3 py-2.5 font-medium">리뷰</th>
                  <th className="text-center px-3 py-2.5 font-medium">요청</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {teamStats.map((t) => (
                  <tr key={t.team} className="hover:bg-gray-50">
                    <td className="px-4 py-2.5 font-medium text-gray-900">{t.team}</td>
                    <td className="px-3 py-2.5 text-center text-gray-500 text-xs">{t.memberCount}명</td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-400 rounded-full" style={{ width: `${Math.round((t.loginCount / maxTeamLogin) * 100)}%` }} />
                        </div>
                        <span className="text-xs text-gray-600">{t.loginCount}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-center text-amber-600 text-xs font-medium">{t.reviewCount || '-'}</td>
                    <td className="px-3 py-2.5 text-center text-green-600 text-xs font-medium">{t.requestCount || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* 리뷰 세부 점수 */}
        {reviewDimensions.count > 0 && (
          <div className="bg-white rounded-xl shadow-sm border p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-semibold text-gray-900">리뷰 점수 분석</h2>
                <p className="text-xs text-gray-400 mt-0.5">전체 리뷰 {reviewDimensions.count}개 기준</p>
              </div>
              <span className="text-3xl font-bold text-amber-500">{reviewDimensions.avg.total.toFixed(1)}</span>
            </div>
            <div className="space-y-2.5">
              <ScoreBar label="맛" value={reviewDimensions.avg.taste} />
              <ScoreBar label="가격" value={reviewDimensions.avg.price} />
              <ScoreBar label="서비스" value={reviewDimensions.avg.service} />
              <ScoreBar label="분위기" value={reviewDimensions.avg.ambiance} />
              <ScoreBar label="청결도" value={reviewDimensions.avg.cleanliness} />
            </div>
          </div>
        )}
      </div>

      {/* 카테고리 분포 + 최근 등록 매장 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* 카테고리별 조회 분포 */}
        {categoryStats.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border p-5">
            <h2 className="font-semibold text-gray-900 mb-1">카테고리별 조회</h2>
            <p className="text-xs text-gray-400 mb-4">전체 기간 · 매장 상세 조회 기준</p>
            <div className="space-y-2.5">
              {categoryStats.map((c) => (
                <div key={c.id} className="flex items-center gap-3">
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ background: c.color ?? '#9ca3af' }}
                  />
                  <span className="text-xs text-gray-700 w-24 truncate">{c.name}</span>
                  <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.round((c.viewCount / maxCatViews) * 100)}%`,
                        background: c.color ?? '#9ca3af',
                        opacity: 0.8,
                      }}
                    />
                  </div>
                  <span className="text-xs text-gray-500 w-12 text-right">{c.viewCount}회</span>
                  <span className="text-xs text-gray-300 w-8 text-right">{c.storeCount}곳</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 최근 등록 매장 */}
        {recentStores.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            <div className="px-5 py-4 border-b flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">최근 등록 매장</h2>
              <Link href="/admin/stores" className="text-xs text-blue-500 hover:text-blue-700">전체 보기</Link>
            </div>
            <div className="divide-y">
              {recentStores.map((s) => (
                <div key={s.id} className="px-5 py-3 flex items-center gap-3 hover:bg-gray-50">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm text-gray-900 truncate">{s.name}</span>
                      {s.category && (
                        <span
                          className="text-[10px] px-1.5 py-0.5 rounded-full text-white shrink-0"
                          style={{ background: s.category.color ?? '#9ca3af' }}
                        >
                          {s.category.name}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 truncate mt-0.5">{s.address}</p>
                  </div>
                  <span className="text-xs text-gray-400 shrink-0">
                    {new Date(s.createdAt).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 인기 매장 */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="px-5 py-4 border-b flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">많이 본 매장</h2>
          <span className="text-xs text-gray-400">상세보기 기준 · 조회수 없으면 리뷰수 대체</span>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b text-gray-500">
            <tr>
              <th className="text-left px-4 py-2.5 font-medium w-8">#</th>
              <th className="text-left px-4 py-2.5 font-medium">매장명</th>
              <th className="text-left px-4 py-2.5 font-medium">카테고리</th>
              <th className="text-left px-4 py-2.5 font-medium">도보</th>
              <th className="text-left px-4 py-2.5 font-medium">평점</th>
              <th className="text-left px-4 py-2.5 font-medium">조회수</th>
              <th className="text-left px-4 py-2.5 font-medium">띵봇</th>
              <th className="text-left px-4 py-2.5 font-medium">즐겨찾기</th>
              <th className="text-left px-4 py-2.5 font-medium">리뷰수</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {displayedStores.map((store, i) => (
              <tr key={store.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-gray-400 font-mono text-xs">{i + 1}</td>
                <td className="px-4 py-3 font-medium text-gray-900">{store.name}</td>
                <td className="px-4 py-3">
                  {store.category ? (
                    <span
                      className="text-xs px-2 py-0.5 rounded-full text-white"
                      style={{ background: store.category.color ?? '#9ca3af' }}
                    >
                      {store.category.name}
                    </span>
                  ) : <span className="text-gray-400 text-xs">미분류</span>}
                </td>
                <td className="px-4 py-3 text-blue-500 text-xs">
                  {store.walkingMinutes != null ? `🚶 ${store.walkingMinutes}분` : '-'}
                </td>
                <td className="px-4 py-3 text-amber-500 text-xs">
                  {store.internalRating ? `★ ${store.internalRating.avgTotal.toFixed(1)}` : '-'}
                </td>
                <td className="px-4 py-3 text-gray-700 font-medium">{store.viewCount}</td>
                <td className="px-4 py-3 text-purple-500 font-medium">{store.chatCount > 0 ? `🤖 ${store.chatCount}` : '-'}</td>
                <td className="px-4 py-3 text-rose-500 font-medium">{store.favoriteCount > 0 ? `♥ ${store.favoriteCount}` : '-'}</td>
                <td className="px-4 py-3 text-gray-500">{store.internalRating?.reviewCount ?? 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {popularStores.length > 10 && (
          <div className="px-4 py-3 border-t flex justify-center">
            <button
              onClick={() => setShowAllStores(v => !v)}
              className="flex items-center gap-1 text-sm text-blue-500 hover:text-blue-700"
            >
              {showAllStores ? <><ChevronUp size={14} /> 접기</> : <><ChevronDown size={14} /> 전체 보기 ({popularStores.length}개)</>}
            </button>
          </div>
        )}
      </div>

      {/* 개인별 취향 분석 */}
      {preferences.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <div className="px-5 py-4 border-b">
            <h2 className="font-semibold text-gray-900">개인별 카테고리 취향</h2>
            <p className="text-xs text-gray-400 mt-0.5">최근 90일 기준 · 조회×1 + 즐겨찾기×3 + 리뷰×5 · 관리자 제외</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-2.5 font-medium text-gray-500 whitespace-nowrap">이름</th>
                  <th className="text-left px-4 py-2.5 font-medium text-gray-500">팀</th>
                  <th className="text-left px-4 py-2.5 font-medium text-gray-500">선호 카테고리 (점수순)</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {preferences.map((u) => (
                  <tr key={u.userId} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">{u.userName}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{u.team}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1.5">
                        {u.topCategories.map((c) => (
                          <span
                            key={c.categoryId}
                            className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full text-white font-medium"
                            style={{ background: c.color ?? '#9ca3af' }}
                            title={`조회 ${c.views} · 즐겨찾기 ${c.favorites} · 리뷰 ${c.reviews}${c.avgScore != null ? ` · 평균 ${c.avgScore.toFixed(1)}점` : ''}`}
                          >
                            {c.categoryName}
                            <span className="opacity-75">·{c.score}</span>
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 계정별 통계 */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="px-5 py-4 border-b">
          <h2 className="font-semibold text-gray-900">계정별 활동</h2>
          <p className="text-xs text-gray-400 mt-0.5">관리자 제외 · 전체 기간 누적</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <SortBtn k="name" label="이름" />
                <th className="text-left px-3 py-2.5 font-medium text-gray-500">팀</th>
                <SortBtn k="loginCount" label="로그인" />
                <SortBtn k="reviewCount" label="리뷰" />
                <SortBtn k="requestCount" label="등록요청" />
                <th className="text-left px-3 py-2.5 font-medium text-gray-500">마지막 로그인</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {sortedUsers.map((u) => {
                const maxLogin = Math.max(...userStats.map(x => x.loginCount), 1)
                const maxReview = Math.max(...userStats.map(x => x.reviewCount), 1)
                const maxReq = Math.max(...userStats.map(x => x.requestCount), 1)
                return (
                  <tr key={u.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2.5 font-medium text-gray-900">{u.name}</td>
                    <td className="px-3 py-2.5 text-gray-500 text-xs">{u.team}</td>
                    <td className="px-3 py-2.5"><MiniBar value={u.loginCount} max={maxLogin} /></td>
                    <td className="px-3 py-2.5"><MiniBar value={u.reviewCount} max={maxReview} /></td>
                    <td className="px-3 py-2.5"><MiniBar value={u.requestCount} max={maxReq} /></td>
                    <td className="px-3 py-2.5 text-gray-400 text-xs">
                      {u.lastLogin ? new Date(u.lastLogin).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
