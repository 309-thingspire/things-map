import Link from 'next/link'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

async function getStats() {
  const [storeCount, userCount, pendingRequests, pendingStaging] = await Promise.all([
    prisma.store.count({ where: { status: 'ACTIVE' } }),
    prisma.user.count({ where: { isActive: true } }),
    prisma.storeRequest.count({ where: { status: 'PENDING' } }),
    prisma.stagingStore.count({ where: { status: 'PENDING' } }),
  ])
  return { storeCount, userCount, pendingRequests, pendingStaging }
}

export default async function AdminDashboard() {
  const stats = await getStats()

  const cards = [
    { label: '활성 매장', value: stats.storeCount, href: '/admin/stores', color: 'bg-blue-500' },
    { label: '활성 사용자', value: stats.userCount, href: '/admin/users', color: 'bg-green-500' },
    { label: '대기 중인 요청', value: stats.pendingRequests, href: '/admin/requests', color: 'bg-amber-500' },
    { label: '수집 미검토', value: stats.pendingStaging, href: '/admin/crawl', color: 'bg-purple-500' },
  ]

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">대시보드</h1>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {cards.map((card) => (
          <Link key={card.label} href={card.href}>
            <div className={`${card.color} text-white rounded-xl p-5 hover:opacity-90 transition-opacity`}>
              <p className="text-sm font-medium opacity-80">{card.label}</p>
              <p className="text-3xl font-bold mt-1">{card.value}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
