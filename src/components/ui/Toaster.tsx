'use client'

import { useState, useEffect } from 'react'
import { CheckCircle, XCircle, X } from 'lucide-react'

interface ToastItem {
  id: number
  msg: string
  type: 'success' | 'error'
}

type ShowFn = (msg: string, type?: 'success' | 'error') => void
let _show: ShowFn | null = null

export function toast(msg: string, type: 'success' | 'error' = 'success') {
  _show?.(msg, type)
}

export default function Toaster() {
  const [items, setItems] = useState<ToastItem[]>([])

  useEffect(() => {
    _show = (msg, type = 'success') => {
      const id = Date.now()
      setItems((prev) => [...prev, { id, msg, type }])
      setTimeout(() => setItems((prev) => prev.filter((i) => i.id !== id)), 3000)
    }
    return () => { _show = null }
  }, [])

  if (items.length === 0) return null

  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-2 pointer-events-none">
      {items.map((item) => (
        <div
          key={item.id}
          className={`flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg border text-sm font-medium pointer-events-auto animate-in slide-in-from-right-4 fade-in duration-200 ${
            item.type === 'success'
              ? 'bg-white border-green-200 text-gray-800'
              : 'bg-white border-red-200 text-gray-800'
          }`}
        >
          {item.type === 'success'
            ? <CheckCircle size={16} className="text-green-500 shrink-0" />
            : <XCircle size={16} className="text-red-500 shrink-0" />
          }
          <span>{item.msg}</span>
          <button
            onClick={() => setItems((prev) => prev.filter((i) => i.id !== item.id))}
            className="ml-1 text-gray-400 hover:text-gray-600"
          >
            <X size={13} />
          </button>
        </div>
      ))}
    </div>
  )
}
