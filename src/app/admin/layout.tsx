import Link from 'next/link'
import Toaster from '@/components/ui/Toaster'
import type { ReactNode } from 'react'

const navItems = [
  { href: '/admin', label: '대시보드' },
  { href: '/admin/stores', label: '매장 관리' },
  { href: '/admin/users', label: '계정 관리' },
  { href: '/admin/requests', label: '등록 요청' },
  { href: '/admin/reviews', label: '리뷰 관리' },
  { href: '/admin/crawl', label: '데이터 수집' },
  { href: '/admin/categories', label: '카테고리' },
]

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-screen bg-gray-100">
      {/* 사이드바 */}
      <aside className="w-56 bg-gray-900 text-white flex flex-col">
        <div className="px-5 py-5 border-b border-gray-700">
          <Link href="/" className="font-bold text-lg">things-map</Link>
          <p className="text-xs text-gray-400 mt-0.5">관리자</p>
        </div>
        <nav className="flex-1 py-4 space-y-1 px-3">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block px-3 py-2 rounded-lg text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="px-5 py-4 border-t border-gray-700">
          <Link href="/" className="text-xs text-gray-400 hover:text-gray-200">← 사이트로 돌아가기</Link>
        </div>
      </aside>

      {/* 메인 */}
      <main className="flex-1 overflow-y-auto p-6">{children}</main>
      <Toaster />
    </div>
  )
}
