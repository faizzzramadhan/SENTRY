'use client'

import { useEffect, useMemo } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'

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
  const markerIcon = useMemo(
    () =>
      L.divIcon({
        className: '',
        iconSize: [36, 46],
        iconAnchor: [18, 44],
        popupAnchor: [0, -42],
        html: `
          <div style="
            width: 36px;
            height: 46px;
            display: flex;
            align-items: flex-start;
            justify-content: center;
            pointer-events: none;
          ">
            <div style="
              position: relative;
              width: 28px;
              height: 28px;
              background: #ef4444;
              border: 3px solid #ffffff;
              border-radius: 50% 50% 50% 0;
              transform: rotate(-45deg);
              box-shadow: 0 10px 24px rgba(0,0,0,0.38);
            ">
              <div style="
                position: absolute;
                top: 50%;
                left: 50%;
                width: 9px;
                height: 9px;
                background: #ffffff;
                border-radius: 999px;
                transform: translate(-50%, -50%);
              "></div>
            </div>
          </div>
        `,
      }),
    []
  )

  return (
    <MapContainer
      center={position}
      zoom={16}
      minZoom={12}
      maxBounds={MALANG_BOUNDS}
      maxBoundsViscosity={1}
      style={{ height: '100%', minHeight: '420px', width: '100%' }}
    >
      <TileLayer
        attribution="&copy; OpenStreetMap contributors"
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <RecenterMap position={position} />
      <Marker position={position} icon={markerIcon}>
        <Popup>Lokasi kejadian yang dipilih</Popup>
      </Marker>
    </MapContainer>
  )
}
