'use client'

import { useEffect, useRef } from 'react'
import type { StoreListItem } from '@/types'
import { getMarkerSvgHtml } from '@/lib/markerIcons'
import { OFFICE } from '@/lib/office'

declare global {
  interface Window {
    naver: {
      maps: {
        Map: new (el: HTMLElement, options: object) => NaverMapInstance
        LatLng: new (lat: number, lng: number) => NaverLatLng
        Marker: new (options: object) => NaverMarker
        InfoWindow: new (options: object) => NaverInfoWindow
        Polyline: new (options: object) => NaverPolyline
        Size: new (w: number, h: number) => NaverSize
        Point: new (x: number, y: number) => NaverPoint
        Event: {
          addListener: (target: object, event: string, handler: () => void) => void
        }
        MapTypeId: { NORMAL: string }
      }
    }
    __openStoreDetail?: (id: string) => void
  }
  interface NaverMapInstance {
    setCenter(latlng: NaverLatLng): void
    setZoom(zoom: number): void
    destroy(): void
  }
  interface NaverLatLng {}
  interface NaverSize {}
  interface NaverPoint {}
  interface NaverMarker {
    setMap(map: NaverMapInstance | null): void
    getPosition(): NaverLatLng
    setIcon(icon: object): void
    setPosition(position: NaverLatLng): void
  }
  interface NaverInfoWindow {
    open(map: NaverMapInstance, marker: NaverMarker): void
    close(): void
  }
  interface NaverPolyline {
    setMap(map: NaverMapInstance | null): void
  }
}

interface NaverMapProps {
  stores: StoreListItem[]
  center: { lat: number; lng: number }
  zoom: number
  selectedStore?: StoreListItem | null
  onStoreSelect?: (store: StoreListItem) => void
  onDeselect?: () => void
  onStoreDetail?: (id: string) => void
  onMapMove?: () => void
}

export default function NaverMap({ stores, center, zoom, selectedStore, onStoreSelect, onDeselect, onStoreDetail, onMapMove }: NaverMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstance = useRef<NaverMapInstance | null>(null)
  const markersMap = useRef<Map<string, NaverMarker>>(new Map())
  const infoWindowsMap = useRef<Map<string, NaverInfoWindow>>(new Map())
  const markerDataMap = useRef<Map<string, { cat: StoreListItem['category'] }>>(new Map())
  const activeInfoWindow = useRef<NaverInfoWindow | null>(null)
  const officeMarkerRef = useRef<NaverMarker | null>(null)
  const locationMarkerRef = useRef<NaverMarker | null>(null)
  const watchIdRef = useRef<number | null>(null)
  const headingRef = useRef<number | null>(null)
  const onStoreSelectRef = useRef(onStoreSelect)
  const onDeselectRef = useRef(onDeselect)
  const onStoreDetailRef = useRef(onStoreDetail)
  const onMapMoveRef = useRef(onMapMove)
  const isProgrammaticRef = useRef(false)
  const selectedStoreRef = useRef(selectedStore)
  const prevSelectedIdRef = useRef<string | null>(null)

  useEffect(() => { onStoreSelectRef.current = onStoreSelect })
  useEffect(() => { onDeselectRef.current = onDeselect })
  useEffect(() => { onMapMoveRef.current = onMapMove })
  useEffect(() => {
    onStoreDetailRef.current = onStoreDetail
    window.__openStoreDetail = (id: string) => onStoreDetailRef.current?.(id)
  })
  useEffect(() => { selectedStoreRef.current = selectedStore })

  // Map init
  useEffect(() => {
    if (!mapRef.current || !window.naver?.maps) return

    mapInstance.current = new window.naver.maps.Map(mapRef.current, {
      center: new window.naver.maps.LatLng(center.lat, center.lng),
      zoom,
      mapTypeId: window.naver.maps.MapTypeId.NORMAL,
    })

    officeMarkerRef.current = new window.naver.maps.Marker({
      position: new window.naver.maps.LatLng(OFFICE.lat, OFFICE.lng),
      map: mapInstance.current,
      icon: {
        content: `<div style="width:32px;height:32px;background:#38c68b;border-radius:6px;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;font-size:16px;">🏢</div>`,
        size: new window.naver.maps.Size(32, 32),
        anchor: new window.naver.maps.Point(16, 16),
      },
      zIndex: 100,
    })

    // Map move/zoom → notify parent
    window.naver.maps.Event.addListener(mapInstance.current, 'dragend', () => {
      if (!isProgrammaticRef.current) onMapMoveRef.current?.()
    })
    window.naver.maps.Event.addListener(mapInstance.current, 'zoom_changed', () => {
      if (!isProgrammaticRef.current) onMapMoveRef.current?.()
    })

    // Map click → deselect
    window.naver.maps.Event.addListener(mapInstance.current, 'click', () => {
      activeInfoWindow.current?.close()
      activeInfoWindow.current = null
      if (prevSelectedIdRef.current) {
        const prevMarker = markersMap.current.get(prevSelectedIdRef.current)
        const prevData = markerDataMap.current.get(prevSelectedIdRef.current)
        if (prevMarker && prevData) {
          prevMarker.setIcon(buildIconStatic(prevData.cat, false))
        }
      }
      prevSelectedIdRef.current = null
      onDeselectRef.current?.()
    })

    if (navigator.geolocation) {
      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          if (!window.naver?.maps) return
          const position = new window.naver.maps.LatLng(pos.coords.latitude, pos.coords.longitude)
          const heading = pos.coords.heading != null && !isNaN(pos.coords.heading) ? pos.coords.heading : headingRef.current
          if (!locationMarkerRef.current) {
            locationMarkerRef.current = new window.naver.maps.Marker({
              position,
              map: mapInstance.current!,
              icon: buildLocationIcon(heading),
              zIndex: 90,
            })
          } else {
            locationMarkerRef.current.setPosition(position)
            locationMarkerRef.current.setIcon(buildLocationIcon(heading))
          }
        },
        () => {},
        { enableHighAccuracy: true, maximumAge: 10000 }
      )
    }

    function onOrientation(e: DeviceOrientationEvent) {
      let heading: number | null = null
      // iOS Safari uses webkitCompassHeading (absolute, clockwise from north)
      const ev = e as DeviceOrientationEvent & { webkitCompassHeading?: number }
      if (typeof ev.webkitCompassHeading === 'number') {
        heading = ev.webkitCompassHeading
      } else if (e.absolute && e.alpha != null) {
        // Android absolute — alpha is counter-clockwise from north
        heading = (360 - e.alpha) % 360
      }
      if (heading == null) return
      headingRef.current = heading
      if (locationMarkerRef.current) {
        locationMarkerRef.current.setIcon(buildLocationIcon(heading))
      }
    }
    window.addEventListener('deviceorientationabsolute' as 'deviceorientation', onOrientation as EventListener, true)
    window.addEventListener('deviceorientation', onOrientation as EventListener, true)

    return () => {
      window.__openStoreDetail = undefined
      window.removeEventListener('deviceorientationabsolute' as 'deviceorientation', onOrientation as EventListener, true)
      window.removeEventListener('deviceorientation', onOrientation as EventListener, true)
      if (watchIdRef.current != null) navigator.geolocation.clearWatch(watchIdRef.current)
      mapInstance.current?.destroy()
    }
  }, []) // eslint-disable-line

  // Center/zoom update (programmatic — suppress onMapMove)
  useEffect(() => {
    if (!mapInstance.current || !window.naver?.maps) return
    isProgrammaticRef.current = true
    mapInstance.current.setCenter(new window.naver.maps.LatLng(center.lat, center.lng))
    mapInstance.current.setZoom(zoom)
    const t = setTimeout(() => { isProgrammaticRef.current = false }, 400)
    return () => clearTimeout(t)
  }, [center, zoom])

  // Markers effect — stable (no onStoreSelect in deps)
  useEffect(() => {
    if (!mapInstance.current || !window.naver?.maps) return

    markersMap.current.forEach((m) => m.setMap(null))
    markersMap.current.clear()
    activeInfoWindow.current?.close()
    infoWindowsMap.current.clear()
    markerDataMap.current.clear()
    prevSelectedIdRef.current = null

    stores.forEach((store) => {
      const cat = store.category
      const isSelected = selectedStoreRef.current?.id === store.id
      const icon = buildIconStatic(cat, isSelected)

      const marker = new window.naver.maps.Marker({
        position: new window.naver.maps.LatLng(store.lat, store.lng),
        map: mapInstance.current,
        title: store.name,
        icon,
      })

      const iw = new window.naver.maps.InfoWindow({
        content: `
          <div style="padding:14px;min-width:200px;max-width:260px;font-family:'Pretendard Variable',sans-serif;border-radius:12px;background:white;box-shadow:0 8px 24px rgba(0,0,0,0.18);">
            ${cat?.color ? `<span style="display:inline-block;background:${cat.color};color:white;font-size:10px;font-weight:600;padding:2px 8px;border-radius:20px;margin-bottom:6px;">${cat.name}</span>` : ''}
            <strong style="font-size:14px;display:block;margin-bottom:2px;">${store.name}</strong>
            <p style="font-size:11px;color:#888;margin:0 0 6px;line-height:1.4;">${store.address}</p>
            ${store.walkingMinutes != null ? `<p style="font-size:12px;color:#38c68b;margin:0 0 2px;">🏢 본사로부터 ${store.walkingMinutes}분</p>` : ''}
            ${store.internalRating ? `<p style="font-size:12px;color:#f59e0b;margin:0 0 8px;">★ ${store.internalRating.avgTotal.toFixed(1)} <span style="color:#aaa;">(${store.internalRating.reviewCount}개)</span></p>` : '<div style="margin-bottom:8px;"></div>'}
            <button onclick="window.__openStoreDetail?.('${store.id}')" style="width:100%;text-align:center;border:1px solid #e5e7eb;color:#374151;padding:6px 0;border-radius:8px;font-size:12px;background:white;cursor:pointer;">상세보기</button>
          </div>
        `,
        borderWidth: 0,
        borderColor: 'transparent',
        backgroundColor: 'transparent',
        anchorSkew: true,
      })

      window.naver.maps.Event.addListener(marker, 'click', () => {
        // Reset previous selected marker
        if (prevSelectedIdRef.current && prevSelectedIdRef.current !== store.id) {
          const prevMarker = markersMap.current.get(prevSelectedIdRef.current)
          const prevData = markerDataMap.current.get(prevSelectedIdRef.current)
          if (prevMarker && prevData) prevMarker.setIcon(buildIconStatic(prevData.cat, false))
        }
        // Scale up selected marker
        marker.setIcon(buildIconStatic(cat, true))
        prevSelectedIdRef.current = store.id

        activeInfoWindow.current?.close()
        iw.open(mapInstance.current!, marker)
        activeInfoWindow.current = iw
        onStoreSelectRef.current?.(store)
      })

      markersMap.current.set(store.id, marker)
      infoWindowsMap.current.set(store.id, iw)
      markerDataMap.current.set(store.id, { cat })
    })

    // Re-open InfoWindow for currently selected store
    const sel = selectedStoreRef.current
    if (sel) {
      const marker = markersMap.current.get(sel.id)
      const iw = infoWindowsMap.current.get(sel.id)
      if (marker && iw) {
        marker.setIcon(buildIconStatic(markerDataMap.current.get(sel.id)?.cat ?? null, true))
        iw.open(mapInstance.current!, marker)
        activeInfoWindow.current = iw
        prevSelectedIdRef.current = sel.id
      }
    }
  }, [stores]) // eslint-disable-line

  // selectedStore prop change
  useEffect(() => {
    if (!mapInstance.current || !window.naver?.maps) return

    // Reset previous
    if (prevSelectedIdRef.current) {
      const prevMarker = markersMap.current.get(prevSelectedIdRef.current)
      const prevData = markerDataMap.current.get(prevSelectedIdRef.current)
      if (prevMarker && prevData) prevMarker.setIcon(buildIconStatic(prevData.cat, false))
    }

    if (!selectedStore) {
      activeInfoWindow.current?.close()
      prevSelectedIdRef.current = null
      return
    }

    const marker = markersMap.current.get(selectedStore.id)
    const data = markerDataMap.current.get(selectedStore.id)
    if (marker && data) marker.setIcon(buildIconStatic(data.cat, true))
    prevSelectedIdRef.current = selectedStore.id

    const iw = infoWindowsMap.current.get(selectedStore.id)
    if (marker && iw) {
      activeInfoWindow.current?.close()
      iw.open(mapInstance.current!, marker)
      activeInfoWindow.current = iw
    }
  }, [selectedStore]) // eslint-disable-line

  return <div ref={mapRef} className="w-full h-full" />
}

function buildLocationIcon(heading: number | null) {
  const size = 80
  const half = size / 2
  const radius = 34
  const halfAngleDeg = 30

  // Sector (fan) pointing "up" before rotation — like Naver Maps
  const cone = heading != null ? (() => {
    const a1 = (-90 - halfAngleDeg) * Math.PI / 180
    const a2 = (-90 + halfAngleDeg) * Math.PI / 180
    const x1 = (half + radius * Math.cos(a1)).toFixed(2)
    const y1 = (half + radius * Math.sin(a1)).toFixed(2)
    const x2 = (half + radius * Math.cos(a2)).toFixed(2)
    const y2 = (half + radius * Math.sin(a2)).toFixed(2)
    return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" style="position:absolute;top:0;left:0;" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="headingGrad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#3b82f6" stop-opacity="0.55"/>
          <stop offset="100%" stop-color="#3b82f6" stop-opacity="0.08"/>
        </radialGradient>
      </defs>
      <g transform="rotate(${heading}, ${half}, ${half})">
        <path d="M ${half} ${half} L ${x1} ${y1} A ${radius} ${radius} 0 0 1 ${x2} ${y2} Z" fill="url(#headingGrad)" />
      </g>
    </svg>`
  })() : ''

  const content = `<div style="position:relative;width:${size}px;height:${size}px;">
    ${cone}
    <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:18px;height:18px;background:#3b82f6;border-radius:50%;border:3px solid white;box-shadow:0 0 0 7px rgba(59,130,246,0.18);"></div>
  </div>`
  return {
    content,
    size: new window.naver.maps.Size(size, size),
    anchor: new window.naver.maps.Point(half, half),
  }
}

function buildIconStatic(cat: StoreListItem['category'] | null | undefined, selected: boolean) {
  const color = cat?.color ?? '#38c68b'
  const iconName = cat?.icon ?? 'map-pin'
  const base = 36
  const size = selected ? Math.round(base * 1.1) : base
  return {
    content: getMarkerSvgHtml(iconName, color, size),
    size: new window.naver.maps.Size(size, size),
    anchor: new window.naver.maps.Point(size / 2, size / 2),
  }
}
