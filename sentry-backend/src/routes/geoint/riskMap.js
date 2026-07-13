const express = require('express')

const router = express.Router()

const db = require('../../models')

const { sequelize } = db

// =========================
// HELPER
// =========================

function parseGeojson(value) {
  if (!value) {
    return null
  }

  if (typeof value === 'object') {
    return value
  }

  try {
    return JSON.parse(value)
  } catch (error) {
    console.error(
      'INVALID GEOJSON PARSE:',
      error
    )

    return null
  }
}

function getGeometryFromGeojson(value) {
  const geojson =
    parseGeojson(value)

  if (!geojson) {
    return null
  }

  // Jika data berupa Feature
  if (
    geojson.type === 'Feature' &&
    geojson.geometry
  ) {
    return geojson.geometry
  }

  // Jika data langsung berupa Geometry
  if (
    geojson.type &&
    geojson.coordinates
  ) {
    return geojson
  }

  return null
}

function isValidGeometry(geometry) {
  return (
    geometry &&
    typeof geometry === 'object' &&
    typeof geometry.type === 'string' &&
    Array.isArray(geometry.coordinates) &&
    geometry.coordinates.length > 0
  )
}

// =========================
// GET RISK MAP
// =========================

router.get('/', async (req, res) => {
  try {
    // =========================
    // QUERY PARAM
    // =========================

    const bencana =
      req.query.bencana

    // =========================
    // MAPPING ID
    // =========================

    const jenisMap = {
      banjir: 60001,
      longsor: 60002,
      gempa: 60007
    }

    const jenisId =
      jenisMap[bencana]

    if (!jenisId) {
      return res.status(400).json({
        success: false,
        message:
          'Parameter bencana tidak valid'
      })
    }

    // =========================
    // QUERY DEFAULT RISK
    // dari tingkat_resiko
    // =========================

    const defaultRows =
      await sequelize.query(
        `
        SELECT
          tr.resiko_id,
          tr.tingkat_resiko,
          jb.nama_jenis,
          dk.kelurahan_id,
          dk.nama_kelurahan,
          dk.geojson
        FROM tingkat_resiko tr

        LEFT JOIN jenis_bencana jb
          ON jb.jenis_id = tr.jenis_id

        LEFT JOIN data_kelurahan dk
          ON dk.kelurahan_id = tr.kelurahan_id

        WHERE
          dk.geojson IS NOT NULL
          AND tr.jenis_id = :jenisId
        `,
        {
          replacements: {
            jenisId
          },
          type: sequelize.QueryTypes.SELECT
        }
      )


    const manualRows =
      await sequelize.query(
        `
        SELECT
          zr.zona_id,
          zr.jenis_id,
          zr.kelurahan_id,
          zr.nama_zona,
          zr.geojson,
          zr.tingkat_resiko,
          zr.warna,
          zr.sumber_data,
          zr.status,
          jb.nama_jenis,
          dk.nama_kelurahan
        FROM zona_rawan zr

        LEFT JOIN jenis_bencana jb
          ON jb.jenis_id = zr.jenis_id

        LEFT JOIN data_kelurahan dk
          ON dk.kelurahan_id = zr.kelurahan_id

        WHERE
          zr.geojson IS NOT NULL
          AND zr.jenis_id = :jenisId
          AND zr.status = 'AKTIF'
          AND zr.sumber_data = 'MANUAL'
        `,
        {
          replacements: {
            jenisId
          },
          type: sequelize.QueryTypes.SELECT
        }
      )

    // =========================
    // DEFAULT FEATURES
    // =========================

    const defaultFeatures =
      defaultRows
        .map(item => {
          const geometry =
            getGeometryFromGeojson(
              item.geojson
            )

          if (
            !isValidGeometry(geometry)
          ) {
            return null
          }

          return {
            type: 'Feature',

            properties: {
              resiko_id:
                item.resiko_id,

              kelurahan:
                item.nama_kelurahan,

              bencana:
                item.nama_jenis,

              tingkat:
                item.tingkat_resiko,

              sumber_data:
                'DEFAULT'
            },

            geometry
          }
        })
        .filter(Boolean)

    // =========================
    // MANUAL FEATURES
    // =========================

    const manualFeatures =
      manualRows
        .map(item => {
          const geometry =
            getGeometryFromGeojson(
              item.geojson
            )

          if (
            !isValidGeometry(geometry)
          ) {
            return null
          }

          return {
            type: 'Feature',

            properties: {
              zona_id:
                item.zona_id,

              kelurahan:
                item.nama_kelurahan ||
                item.nama_zona ||
                'Zona Manual',

              nama_zona:
                item.nama_zona,

              bencana:
                item.nama_jenis,

              tingkat:
                item.tingkat_resiko,

              warna:
                item.warna,

              sumber_data:
                item.sumber_data ||
                'MANUAL'
            },

            geometry
          }
        })
        .filter(Boolean)

    // =========================
    // MERGE FEATURES
    // =========================

    const features = [
      ...defaultFeatures,
      ...manualFeatures
    ]

    return res.json({
      type: 'FeatureCollection',
      features
    })

  } catch (error) {
    console.error(
      'RISK MAP ERROR:',
      error
    )

    return res.status(500).json({
      success: false,
      message:
        'Failed load risk map'
    })
  }
})

module.exports = router