'use client'

import { useState } from 'react'

interface MapCenter {
  lat: number
  lng: number
}

// 띵스파이어 (서울특별시 용산구 한강대로96길 27)
export const DEFAULT_CENTER: MapCenter = { lat: 37.5472294, lng: 126.9733870 }
export const DEFAULT_ZOOM = 16
const DEFAULT_RADIUS = 3000

export function useMap() {
  const [center, setCenter] = useState<MapCenter>(DEFAULT_CENTER)
  const [radius, setRadius] = useState(DEFAULT_RADIUS)
  const [zoom, setZoom] = useState(DEFAULT_ZOOM)

  function moveTo(lat: number, lng: number, zoomLevel?: number) {
    setCenter({ lat, lng })
    if (zoomLevel) setZoom(zoomLevel)
  }

  return { center, radius, zoom, setCenter, setRadius, setZoom, moveTo }
}
