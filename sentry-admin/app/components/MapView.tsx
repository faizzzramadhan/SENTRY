'use client'

import { MapContainer, TileLayer, Marker } from 'react-leaflet'


export default function MapView() {
  return (
    <MapContainer
      center={[-7.95, 112.61]}
      zoom={13}
      style={{ height: '240px', width: '100%' }}
    >
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"/>
      <Marker position={[-7.95, 112.61]} />
    </MapContainer>
  )
}