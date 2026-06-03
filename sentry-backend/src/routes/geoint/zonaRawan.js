const express = require('express')

const router = express.Router()

const db =
  require('../../models')

const ZonaRawan =
  db.zona_rawan

// =========================
// GET ALL ZONA RAWAN
// =========================

router.get('/', async (req, res) => {

  try {

    const {

      jenis_id

    } = req.query

    // =========================
    // FILTER
    // =========================

    const whereClause = {

      status: 'AKTIF'
    }

    // =========================
    // FILTER JENIS BENCANA
    // =========================

    if (jenis_id) {

      whereClause.jenis_id =
        jenis_id
    }

    // =========================
    // GET DATA
    // =========================

    const data =
      await ZonaRawan.findAll({

        where: whereClause,

        order: [

          ['zona_id', 'DESC']
        ]
      })

    return res.status(200).json({

      success: true,

      data
    })

  } catch (error) {

    console.error(error)

    return res.status(500).json({

      success: false,

      message:
        'Gagal mengambil data zona rawan'
    })
  }
})


// =========================
// CREATE ZONA RAWAN
// =========================

router.post('/', async (req, res) => {

  try {

    const {

      jenis_id,

      nama_zona,

      geojson,

      tingkat_resiko,

      warna,

      uploaded_by

    } = req.body

    // =========================
    // VALIDASI
    // =========================

    if (

      !jenis_id ||

      !geojson

    ) {

      return res.status(400).json({

        success: false,

        message:
          'jenis_id dan geojson wajib diisi'
      })
    }

    // =========================
    // SIMPAN DATABASE
    // =========================

    const result =
      await ZonaRawan.create({

        jenis_id,

        nama_zona,

        geojson:
          JSON.stringify(
            geojson
          ),

        tingkat_resiko,

        warna,

        uploaded_by,

        status:
          'AKTIF',

        sumber_data:
          'MANUAL'
      })

    return res.status(200).json({

      success: true,

      message:
        'Zona rawan berhasil disimpan',

      data: result
    })

  } catch (error) {

    console.error(error)

    return res.status(500).json({

      success: false,

      message:
        'Internal server error'
    })
  }
})


// =========================
// UPDATE ZONA RAWAN
// EDIT METADATA
// =========================

router.put('/:id', async (req, res) => {

  try {

    const {

      id

    } = req.params

    const {

      nama_zona,

      tingkat_resiko,

      warna

    } = req.body

    const zona =
      await ZonaRawan.findByPk(id)

    if (!zona) {

      return res.status(404).json({

        success: false,

        message:
          'Zona tidak ditemukan'
      })
    }

    // =========================
    // UPDATE DATA
    // =========================

    await zona.update({

      nama_zona,

      tingkat_resiko,

      warna
    })

    return res.status(200).json({

      success: true,

      message:
        'Zona berhasil diperbarui',

      data: zona
    })

  } catch (error) {

    console.error(error)

    return res.status(500).json({

      success: false,

      message:
        'Gagal memperbarui zona'
    })
  }
})


// =========================
// DELETE ZONA RAWAN
// SOFT DELETE
// =========================

router.delete('/:id', async (req, res) => {

  try {

    const {

      id

    } = req.params

    const zona =
      await ZonaRawan.findByPk(id)

    if (!zona) {

      return res.status(404).json({

        success: false,

        message:
          'Zona tidak ditemukan'
      })
    }

    // =========================
    // NONAKTIFKAN
    // =========================

    await zona.update({

      status:
        'NONAKTIF'
    })

    return res.status(200).json({

      success: true,

      message:
        'Zona berhasil dihapus'
    })

  } catch (error) {

    console.error(error)

    return res.status(500).json({

      success: false,

      message:
        'Gagal menghapus zona'
    })
  }
})


// =========================
// RESET ZONA MANUAL
// =========================

router.patch('/reset', async (req, res) => {

  try {

    await ZonaRawan.update(

      {

        status:
          'NONAKTIF'

      },

      {

        where: {

          sumber_data:
            'MANUAL'
        }
      }
    )

    return res.status(200).json({

      success: true,

      message:
        'Zona berhasil direset ke default'
    })

  } catch (error) {

    console.error(error)

    return res.status(500).json({

      success: false,

      message:
        'Gagal reset zona'
    })
  }
})

module.exports = router