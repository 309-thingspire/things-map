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
interface Stats {
  summary: { storeCount: number; userCount: number; pendingRequests: number }
  dau: number; mau: number
  visitors: { today: number; todayAnon: number; month: number }
  dauTrend: DauPoint[]
  popularStores: PopularStore[]
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

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [showAllStores, setShowAllStores] = useState(false)
  const [userSort, setUserSort] = useState<UserSortKey>('loginCount')
  const [userSortDir, setUserSortDir] = useState<'asc' | 'desc'>('desc')

  useEffect(() => {
    fetch('/api/admin/stats').then(r => r.json()).then(j => { setStats(j.data); setLoading(false) })
  }, [])

  function toggleUserSort(key: UserSortKey) {
    if (userSort === key) setUserSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setUserSort(key); setUserSortDir('desc') }
  }

  if (loading || !stats) {
    return <div className="text-gray-400 p-4">불러오는 중...</div>
  }

  const { summary, dau, mau, visitors, dauTrend, popularStores, userStats } = stats
  const maxDau = Math.max(...dauTrend.map(d => d.count), 1)

  const sortedUsers = [...userStats].sort((a, b) => {
    const av = a[userSort] ?? 0, bv = b[userSort] ?? 0
    if (typeof av === 'string' && typeof bv === 'string') return userSortDir === 'asc' ? av.localeCompare(bv, 'ko') : bv.localeCompare(av, 'ko')
    return userSortDir === 'asc' ? (av as number) - (bv as number) : (bv as number) - (av as number)
  })

  const displayedStores = showAllStores ? popularStores : popularStores.slice(0, 10)

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

      {/* DAU / MAU + 7일 트렌드 */}
      <div id="dau" className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-sm border p-5 flex flex-col justify-between">
          <p className="text-sm font-medium text-gray-500">DAU (오늘)</p>
          <p className="text-4xl font-bold text-gray-900 mt-1">{dau}</p>
          <p className="text-xs text-gray-400 mt-1">로그인 {dau}명 · 비로그인 {visitors.todayAnon}명</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-5 flex flex-col justify-between">
          <p className="text-sm font-medium text-gray-500">방문자 (오늘 / 이번 달)</p>
          <p className="text-4xl font-bold text-gray-900 mt-1">{visitors.today}</p>
          <p className="text-xs text-gray-400 mt-1">이번 달 누적 {visitors.month}명 방문</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-5">
          <p className="text-sm font-medium text-gray-500 mb-3">최근 7일 DAU</p>
          <div className="flex items-end gap-1 h-14">
            {dauTrend.map((d) => (
              <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className="w-full bg-blue-400 rounded-sm"
                  style={{ height: `${Math.max(4, Math.round((d.count / maxDau) * 48))}px` }}
                  title={`${d.date}: ${d.count}명`}
                />
                <span className="text-[9px] text-gray-400 leading-none">{d.date.replace('월 ', '/').replace('일', '')}</span>
              </div>
            ))}
          </div>
        </div>
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

      {/* 계정별 통계 */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="px-5 py-4 border-b">
          <h2 className="font-semibold text-gray-900">계정별 활동</h2>
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
