'use client'

import {

  MapContainer,
  TileLayer,
  FeatureGroup

} from 'react-leaflet'

import {

  EditControl

} from 'react-leaflet-draw'

import 'leaflet/dist/leaflet.css'

import 'leaflet-draw/dist/leaflet.draw.css'

export default function ZonaRawanPage() {

  // =========================
  // HANDLE CREATE POLYGON
  // =========================

  const handleCreated = async (

    e: any

  ) => {

    try {

      // =========================
      // AMBIL LAYER
      // =========================

      const layer = e.layer

      // =========================
      // CONVERT TO GEOJSON
      // =========================

      const geojson =
        layer.toGeoJSON()

      console.log(
        'POLYGON:',
        geojson
      )

      // =========================
      // SIMPAN KE BACKEND
      // =========================

      const response =
        await fetch(

          'http://localhost:5555/api/geoint/zona-rawan',

          {

            method: 'POST',

            headers: {

              'Content-Type':
                'application/json'
            },

            body: JSON.stringify({

              // sementara hardcode dulu
              // nanti bisa dibuat form

              jenis_id: 60001,

              nama_zona:
                'Zona Manual Admin',

              geojson:

                geojson,

              tingkat_resiko:
                'TINGGI',

              warna:
                'red',

              uploaded_by:
                'admin'
            })
          }
        )

      // =========================
      // RESPONSE
      // =========================

      const result =
        await response.json()

      console.log(
        'RESULT:',
        result
      )

      // =========================
      // SUCCESS
      // =========================

      if (result.success) {

        alert(
          'Polygon berhasil disimpan!'
        )

      } else {

        alert(
          'Gagal simpan polygon'
        )
      }

    } catch (error) {

      console.error(
        'ERROR:',
        error
      )

      alert(
        'Terjadi error saat menyimpan polygon'
      )
    }
  }

  return (

    <div

      style={{

        width: '100%',

        minHeight: '100vh',

        padding: '20px',

        background:
          '#e8ecf7',

        color:
          'white'
      }}
    >

      {/* =========================
          HEADER
      ========================= */}

      <h1

        style={{

          fontSize: '42px',

          fontWeight: 'bold',

          marginBottom: '10px'
        }}
      >

        Manajemen Zona Rawan

      </h1>

      <p

        style={{

          marginBottom: '20px',

          color:
            '#b8c1d1'
        }}
      >

        Gambar polygon zona rawan secara manual
        lalu simpan ke database.

      </p>

      {/* =========================
          MAP CONTAINER
      ========================= */}

      <div

        style={{

          width: '100%',

          height: '80vh',

          borderRadius: '20px',

          overflow: 'hidden',

          border:
            '1px solid rgba(255,255,255,0.1)'
        }}
      >

        <MapContainer

          center={[
            -7.98,
            112.63
          ]}

          zoom={12}

          style={{

            width: '100%',

            height: '100%'
          }}
        >

          {/* =========================
              TILE LAYER
          ========================= */}

          <TileLayer

            attribution='&copy; OpenStreetMap'

            url='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
          />

          {/* =========================
              DRAW TOOLS
          ========================= */}

          <FeatureGroup>

            <EditControl

              position='topright'

              onCreated={
                handleCreated
              }

              draw={{

                rectangle:
                  false,

                circle:
                  false,

                circlemarker:
                  false,

                marker:
                  false,

                polyline:
                  false
              }}

            />

          </FeatureGroup>

        </MapContainer>

      </div>

    </div>
  )
}