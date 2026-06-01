const express = require('express')

const router = express.Router()

const db = require('../../models')

const { sequelize } = db

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

    // =========================
    // QUERY DATABASE
    // =========================

    const rows = await sequelize.query(

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

    // =========================
    // GEOJSON FEATURE
    // =========================

    const features = rows.map(item => {

      let geometry = null

      try {

        geometry =
          JSON.parse(item.geojson)

      } catch (error) {

        geometry = null
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
        },

        geometry
      }
    })

    return res.json({

      type: 'FeatureCollection',

      features:
        features.filter(
          item => item.geometry
        )
    })

  } catch (error) {

    console.error(
      'RISK MAP ERROR:',
      error
    )

    return res.status(500).json({

      message:
        'Failed load risk map'
    })
  }
})

module.exports = router