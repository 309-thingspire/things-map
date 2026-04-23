'use client'

import { X, LogIn } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'

interface Props {
  onClose: () => void
  message?: string
}

export default function LoginPromptModal({ onClose, message = '이 기능은 로그인 후 이용할 수 있습니다.' }: Props) {
  const router = useRouter()

  function goLogin() {
    onClose()
    router.push('/login')
  }

  return (
    <>
      <div className="fixed inset-0 z-[70] bg-black/50" onClick={onClose} />
      <div className="fixed inset-0 z-[71] flex items-center justify-center p-4 pointer-events-none">
        <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl pointer-events-auto p-6 text-center">
          <button onClick={onClose} className="absolute top-3 right-3 p-1.5 text-gray-400 hover:text-gray-600">
            <X size={16} />
          </button>
          <div className="text-3xl mb-3">🔐</div>
          <p className="font-semibold text-gray-900 mb-1">로그인이 필요합니다</p>
          <p className="text-sm text-gray-500 mb-5">{message}</p>
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={onClose}>취소</Button>
            <Button className="flex-1 gap-1.5" onClick={goLogin}>
              <LogIn size={14} />
              로그인
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}
