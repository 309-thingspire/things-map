'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { OFFICE } from '@/lib/office'

const NaverMap = dynamic(() => import('@/components/map/NaverMap'), { ssr: false })

export default function LoginPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [approvalCode, setApprovalCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, approvalCode }),
      })

      const json = await res.json()

      if (!res.ok) {
        setError(json.error ?? '로그인에 실패했습니다.')
        return
      }

      if (json.data.role === 'ADMIN') {
        router.push('/admin')
      } else {
        router.push('/')
      }
      router.refresh()
    } catch {
      setError('서버 연결에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {/* Map background */}
      <div className="fixed inset-0" style={{ zIndex: 0 }}>
        <NaverMap stores={[]} center={OFFICE} zoom={15} />
      </div>

      {/* Dark overlay */}
      <div className="fixed inset-0 bg-black/60" style={{ zIndex: 1 }} />

      {/* Login form */}
      <div
        className="relative flex min-h-[calc(100vh-3.5rem)] items-center justify-center p-4"
        style={{ zIndex: 2 }}
      >
        <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl p-8">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-900">띵스파이어 맛집 지도</h1>
            <p className="text-sm text-gray-500 mt-2">커뮤니티 맛집 지도</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">이름</label>
              <Input
                type="text"
                placeholder="이름을 입력하세요"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoFocus
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">승인코드</label>
              <Input
                type="text"
                placeholder="관리자에게 받은 승인코드"
                value={approvalCode}
                onChange={(e) => setApprovalCode(e.target.value)}
                required
              />
            </div>

            {error && (
              <p className="text-sm text-red-500 text-center">{error}</p>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? '로그인 중...' : '로그인'}
            </Button>
          </form>

          <p className="text-xs text-center text-gray-400 mt-6">
            승인코드는 관리자에게 문의하세요.
          </p>
        </div>
      </div>
    </>
  )
}
