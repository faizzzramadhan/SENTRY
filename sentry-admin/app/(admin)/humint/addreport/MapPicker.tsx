'use client'

import { useEffect } from 'react'
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet'

type MapPickerProps = {
  position: [number, number]
}

const MALANG_BOUNDS: [[number, number], [number, number]] = [
  [-8.06, 112.56],
  [-7.86, 112.72],
]

function RecenterMap({ position }: MapPickerProps) {
  const map = useMap()

  useEffect(() => {
    map.setView(position, 16)
  }, [map, position])

  return null
}

export default function MapPicker({ position }: MapPickerProps) {
  return (
    <MapContainer
      center={position}
      zoom={13}
      minZoom={12}
      maxBounds={MALANG_BOUNDS}
      maxBoundsViscosity={1}
      style={{ height: '300px', width: '100%' }}
    >
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <RecenterMap position={position} />
      <Marker position={position} />
    </MapContainer>
  )
}
