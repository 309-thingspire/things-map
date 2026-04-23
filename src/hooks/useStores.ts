'use client'

import { useEffect, useState, useCallback } from 'react'
import type { StoreListItem } from '@/types'

interface StoreFilters {
  lat?: number
  lng?: number
  radius?: number
  categories?: string[]  // 복수 선택 카테고리
  category?: string
  theme?: string
  minRating?: number
  sort?: 'distance' | 'rating' | 'latest'
  page?: number
  limit?: number
}

export function useStores(filters: StoreFilters = {}) {
  const [stores, setStores] = useState<StoreListItem[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)

  const fetchStores = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filters.lat) params.set('lat', String(filters.lat))
      if (filters.lng) params.set('lng', String(filters.lng))
      if (filters.radius) params.set('radius', String(filters.radius))
      if (filters.categories?.length) params.set('categories', filters.categories.join(','))
      if (filters.category) params.set('category', filters.category)
      if (filters.theme) params.set('theme', filters.theme)
      if (filters.minRating) params.set('minRating', String(filters.minRating))
      if (filters.sort) params.set('sort', filters.sort)
      if (filters.page) params.set('page', String(filters.page))
      if (filters.limit) params.set('limit', String(filters.limit))

      const res = await fetch(`/api/stores?${params.toString()}`)
      if (res.ok) {
        const json = await res.json()
        setStores(json.data.stores)
        setTotal(json.data.total)
      }
    } finally {
      setLoading(false)
    }
  }, [JSON.stringify(filters)]) // eslint-disable-line

  useEffect(() => {
    fetchStores()
  }, [fetchStores])

  return { stores, total, loading, refetch: fetchStores }
}
