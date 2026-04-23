'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { OFFICE } from '@/lib/office'
import { CheckCircle, XCircle } from 'lucide-react'

const NaverMap = dynamic(() => import('@/components/map/NaverMap'), { ssr: false })

interface Toast {
  type: 'success' | 'error'
  message: string
}

function ToastBar({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 3000)
    return () => clearTimeout(t)
  }, [onDismiss])

  return (
    <div
      className={`fixed top-5 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium transition-all ${
        toast.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'
      }`}
    >
      {toast.type === 'success' ? <CheckCircle size={16} /> : <XCircle size={16} />}
      {toast.message}
    </div>
  )
}

export default function LoginPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [approvalCode, setApprovalCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState<Toast | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setToast(null)

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, approvalCode }),
      })

      const json = await res.json()

      if (!res.ok) {
        setToast({ type: 'error', message: json.error ?? '로그인에 실패했습니다.' })
        return
      }

      setToast({ type: 'success', message: '로그인되었습니다.' })
      setTimeout(() => {
        router.push(json.data.role === 'ADMIN' ? '/admin' : '/')
        router.refresh()
      }, 800)
    } catch {
      setToast({ type: 'error', message: '서버 연결에 실패했습니다.' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {toast && <ToastBar toast={toast} onDismiss={() => setToast(null)} />}

      {/* Map background */}
      <div className="fixed inset-0" style={{ zIndex: 0 }}>
        <NaverMap stores={[]} center={OFFICE} zoom={15} />
      </div>

      {/* Dark overlay */}
      <div className="fixed inset-0 bg-black/60" style={{ zIndex: 1 }} />

      {/* Login form */}
      <div className="fixed inset-0 flex items-center justify-center p-4" style={{ zIndex: 2 }}>
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
