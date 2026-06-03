'use client'

import { useEffect, useMemo, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

type MapPickerProps = {
  position: [number, number]
  onChange?: (lat: number, lng: number) => void
}

const MALANG_CENTER: [number, number] = [-7.96662, 112.63263]

const MALANG_BOUNDS: [[number, number], [number, number]] = [
  [-8.06, 112.52],
  [-7.88, 112.75],
]

function isValidPosition(position: [number, number] | undefined): position is [number, number] {
  return (
    Array.isArray(position) &&
    typeof position[0] === 'number' &&
    Number.isFinite(position[0]) &&
    typeof position[1] === 'number' &&
    Number.isFinite(position[1])
  )
}

function isInsideMalang(lat: number, lng: number) {
  return (
    lat >= MALANG_BOUNDS[0][0] &&
    lat <= MALANG_BOUNDS[1][0] &&
    lng >= MALANG_BOUNDS[0][1] &&
    lng <= MALANG_BOUNDS[1][1]
  )
}

export default function MapPicker({ position, onChange }: MapPickerProps) {
  const mapElementRef = useRef<HTMLDivElement | null>(null)
  const mapInstanceRef = useRef<L.Map | null>(null)
  const markerRef = useRef<L.Marker | null>(null)
  const onChangeRef = useRef<MapPickerProps['onChange']>(onChange)

  const safePosition = useMemo<[number, number]>(() => {
    return isValidPosition(position) ? position : MALANG_CENTER
  }, [position])

  useEffect(() => {
    onChangeRef.current = onChange
  }, [onChange])

  useEffect(() => {
    if (!mapElementRef.current) return
    if (mapInstanceRef.current) return

    const bounds = L.latLngBounds(MALANG_BOUNDS)

    const markerIcon = L.icon({
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41],
    })

    const map = L.map(mapElementRef.current, {
      center: safePosition,
      zoom: 13,
      minZoom: 12,
      maxZoom: 18,
      maxBounds: bounds,
      maxBoundsViscosity: 1,
      scrollWheelZoom: true,
    })

    mapInstanceRef.current = map

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map)

    markerRef.current = L.marker(safePosition, { icon: markerIcon }).addTo(map)

    map.on('click', (event: L.LeafletMouseEvent) => {
      const { lat, lng } = event.latlng

      if (!isInsideMalang(lat, lng)) {
        alert('Lokasi harus berada di wilayah Kota Malang.')
        return
      }

      markerRef.current?.setLatLng([lat, lng])
      onChangeRef.current?.(lat, lng)
    })

    const resizeTimer = window.setTimeout(() => {
      map.invalidateSize()
    }, 250)

    return () => {
      window.clearTimeout(resizeTimer)
      map.off()
      map.remove()
      mapInstanceRef.current = null
      markerRef.current = null

      if (mapElementRef.current) {
        mapElementRef.current.innerHTML = ''
        mapElementRef.current.removeAttribute('class')
      }
    }
    // Map sengaja dibuat sekali saja agar Leaflet tidak reuse container.
    // Update posisi ditangani di useEffect terpisah di bawah.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const map = mapInstanceRef.current
    const marker = markerRef.current

    if (!map || !marker) return

    marker.setLatLng(safePosition)
    map.setView(safePosition, map.getZoom(), { animate: false })

    const timer = window.setTimeout(() => {
      map.invalidateSize()
    }, 150)

    return () => window.clearTimeout(timer)
  }, [safePosition])

  return (
    <div
      style={{
        width: '100%',
        height: 350,
        minHeight: 350,
        borderRadius: 16,
        overflow: 'hidden',
        position: 'relative',
        zIndex: 1,
      }}
    >
      <div
        ref={mapElementRef}
        style={{
          width: '100%',
          height: '100%',
          minHeight: 350,
        }}
      />
    </div>
  )
}
