'use client'

import { MapContainer, TileLayer, Marker } from 'react-leaflet'

export default function MapPicker({ position }: any) {
  return (
    <MapContainer center={position} zoom={13} style={{ height: '300px' }}>
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"/>
      <Marker position={position}/>
    </MapContainer>
  )
}