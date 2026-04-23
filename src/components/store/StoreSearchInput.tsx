'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Search, Loader2 } from 'lucide-react'
import { Input } from '@/components/ui/input'

export interface StoreSuggestion {
  name: string
  address: string
  lat: number
  lng: number
  phone: string | null
  category: string | null
  naverUrl: string
  officeDistanceM: number
  walkingMinutes: number
}

interface Props {
  value: string
  onChange: (value: string) => void
  onSelect: (result: StoreSuggestion) => void
  placeholder?: string
}

export default function StoreSearchInput({ value, onChange, onSelect, placeholder = '매장명 검색 (예: 스타벅스)' }: Props) {
  const [results, setResults] = useState<StoreSuggestion[]>([])
  const [loading, setLoading] = useState(false)
  const [typing, setTyping] = useState(false)  // debounce 대기 중
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const search = useCallback(async (q: string) => {
    setTyping(false)
    if (!q.trim()) { setResults([]); setOpen(false); return }
    setLoading(true)
    try {
      const res = await fetch(`/api/stores/suggest?q=${encodeURIComponent(q)}`)
      const json = await res.json()
      const list: StoreSuggestion[] = json.data?.results ?? []
      setResults(list)
      setOpen(true)
    } catch {
      setResults([])
    } finally {
      setLoading(false)
    }
  }, [])

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value
    onChange(v)
    if (!v.trim()) {
      setTyping(false)
      setOpen(false)
      setResults([])
      if (debounceRef.current) clearTimeout(debounceRef.current)
      return
    }
    setTyping(true)
    setOpen(true)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => search(v), 200)
  }

  function handleSelect(r: StoreSuggestion) {
    onChange(r.name)
    setOpen(false)
    setTyping(false)
    setResults([])
    onSelect(r)
  }

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const showDropdown = open && value.trim().length > 0

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Input
          value={value}
          onChange={handleChange}
          placeholder={placeholder}
          className="pr-8"
        />
        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
          {loading ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
        </span>
      </div>

      {showDropdown && (
        <ul className="absolute z-50 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
          {typing || loading ? (
            <li className="px-4 py-3 text-sm text-gray-400 flex items-center gap-2">
              <Loader2 size={13} className="animate-spin" />
              입력 중...
            </li>
          ) : results.length === 0 ? (
            <li className="px-4 py-3 text-sm text-gray-400">검색 결과가 없습니다.</li>
          ) : (
            results.map((r, i) => (
              <li key={i}>
                <button
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); handleSelect(r) }}
                  className="w-full text-left px-4 py-2.5 hover:bg-gray-50 transition-colors border-b last:border-b-0 border-gray-100"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-gray-900 truncate">{r.name}</span>
                    <span className="text-xs text-blue-500 shrink-0">도보 {r.walkingMinutes}분</span>
                  </div>
                  <p className="text-xs text-gray-400 truncate mt-0.5">{r.address}</p>
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  )
}
