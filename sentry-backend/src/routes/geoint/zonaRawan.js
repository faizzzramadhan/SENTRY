const express = require('express')

const router = express.Router()

const db =
  require('../../models')

const ZonaRawan =
  db.zona_rawan

const { sequelize } =
  db

// =========================
// HELPER
// =========================

function getBencanaLabel(jenisId) {
  const id =
    Number(jenisId)

  if (id === 60001) {
    return 'Banjir'
  }

  if (id === 60002) {
    return 'Longsor'
  }

  if (id === 60007) {
    return 'Gempa'
  }

  if (jenisId === 'all') {
    return 'Semua'
  }

  return 'Tidak diketahui'
}

async function createUploadLog({
  uploaded_by = 'admin',
  file_name,
  total_feature = 1,
  status = 'PROCESSED',
  notes = ''
}) {
  try {
    const [result, metadata] =
      await sequelize.query(
        `
        INSERT INTO zona_upload
          (
            uploaded_by,
            file_name,
            total_feature,
            status,
            notes
          )
        VALUES
          (
            :uploaded_by,
            :file_name,
            :total_feature,
            :status,
            :notes
          )
        `,
        {
          replacements: {
            uploaded_by,
            file_name,
            total_feature,
            status,
            notes
          }
        }
      )

    const insertId =
      metadata?.insertId ||
      result?.insertId ||
      null

    if (insertId) {
      return insertId
    }

    const rows =
      await sequelize.query(
        `
        SELECT
          id_upload
        FROM zona_upload
        WHERE
          uploaded_by = :uploaded_by
          AND file_name = :file_name
        ORDER BY id_upload DESC
        LIMIT 1
        `,
        {
          replacements: {
            uploaded_by,
            file_name
          },
          type: sequelize.QueryTypes.SELECT
        }
      )

    return rows?.[0]?.id_upload || null
  } catch (error) {
    console.error(
      'CREATE ZONA UPLOAD LOG ERROR:',
      error
    )

    return null
  }
}

function sanitizeFileName(value) {
  return String(value || 'zona-manual')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function buildFileName(action, jenisId, namaZona = '') {
  const bencana =
    sanitizeFileName(
      getBencanaLabel(jenisId)
    )

  const zona =
    sanitizeFileName(
      namaZona || 'zona-manual'
    )

  return `manual-${action}-${bencana}-${zona}-${Date.now()}.geojson`
}

function getUploader(req, fallback = 'admin') {
  return (
    req.body?.uploaded_by ||
    req.query?.uploaded_by ||
    fallback ||
    'admin'
  )
}

// =========================
// GET ALL ZONA RAWAN
// =========================

router.get('/', async (req, res) => {
  try {
    const {
      jenis_id
    } = req.query

    const whereClause = {
      status: 'AKTIF'
    }

    if (jenis_id) {
      whereClause.jenis_id =
        jenis_id
    }

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
    console.error(
      'GET ZONA RAWAN ERROR:',
      error
    )

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

    const uploader =
      uploaded_by || 'admin'

    const idUpload =
      await createUploadLog({
        uploaded_by:
          uploader,

        file_name:
          buildFileName(
            'create',
            jenis_id,
            nama_zona
          ),

        total_feature:
          1,

        status:
          'PROCESSED',

        notes:
          `Membuat polygon manual zona rawan ${getBencanaLabel(jenis_id)} dengan tingkat risiko ${tingkat_resiko || 'SEDANG'}`
      })


    const result =
      await ZonaRawan.create({
        id_upload:
          idUpload,

        jenis_id,

        nama_zona:
          nama_zona || 'Zona Manual',

        geojson:
          typeof geojson === 'string'
            ? geojson
            : JSON.stringify(geojson),

        tingkat_resiko:
          tingkat_resiko || 'SEDANG',

        warna,

        uploaded_by:
          uploader,

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
    console.error(
      'CREATE ZONA RAWAN ERROR:',
      error
    )

    return res.status(500).json({
      success: false,
      message:
        'Internal server error'
    })
  }
})

// =========================
// UPDATE ZONA RAWAN
// =========================

router.put('/:id', async (req, res) => {
  try {
    const {
      id
    } = req.params

    const {
      nama_zona,
      tingkat_resiko,
      warna,
      geojson,
      uploaded_by
    } = req.body

    const zona =
      await ZonaRawan.findByPk(id)

    if (!zona) {
      return res.status(404).json({
        success: false,
        message:
          'Zona rawan tidak ditemukan'
      })
    }

    const uploader =
      uploaded_by ||
      zona.uploaded_by ||
      'admin'

    const idUpload =
      await createUploadLog({
        uploaded_by:
          uploader,

        file_name:
          buildFileName(
            'update',
            zona.jenis_id,
            nama_zona || zona.nama_zona
          ),

        total_feature:
          1,

        status:
          'PROCESSED',

        notes:
          `Memperbarui polygon manual zona rawan ID ${id}. Nama zona: ${nama_zona || zona.nama_zona || '-'}, tingkat risiko: ${tingkat_resiko || zona.tingkat_resiko || '-'}`
      })

    const updateData = {}

    if (idUpload) {
      updateData.id_upload =
        idUpload
    }

    if (nama_zona !== undefined) {
      updateData.nama_zona =
        nama_zona
    }

    if (tingkat_resiko !== undefined) {
      updateData.tingkat_resiko =
        tingkat_resiko
    }

    if (warna !== undefined) {
      updateData.warna =
        warna
    }

    if (uploaded_by !== undefined) {
      updateData.uploaded_by =
        uploaded_by
    }

    if (geojson !== undefined) {
      updateData.geojson =
        typeof geojson === 'string'
          ? geojson
          : JSON.stringify(geojson)
    }

    await zona.update(updateData)

    return res.status(200).json({
      success: true,
      message:
        'Zona rawan berhasil diperbarui',
      data: zona
    })
  } catch (error) {
    console.error(
      'UPDATE ZONA RAWAN ERROR:',
      error
    )

    return res.status(500).json({
      success: false,
      message:
        'Gagal memperbarui zona rawan'
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

    const uploader =
      getUploader(
        req,
        zona.uploaded_by
      )

    await createUploadLog({
      uploaded_by:
        uploader,

      file_name:
        buildFileName(
          'delete',
          zona.jenis_id,
          zona.nama_zona
        ),

      total_feature:
        1,

      status:
        'DELETED',

      notes:
        `Menghapus/nonaktifkan polygon manual zona rawan ID ${id}. Nama zona: ${zona.nama_zona || '-'}`
    })

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
    console.error(
      'DELETE ZONA RAWAN ERROR:',
      error
    )

    return res.status(500).json({
      success: false,
      message:
        'Gagal menghapus zona'
    })
  }
})

// =========================
// RESET ZONA MANUAL BY JENIS
// =========================

router.patch('/reset/:jenis_id', async (req, res) => {
  try {
    const {
      jenis_id
    } = req.params

    const uploader =
      getUploader(req)

    const resetResult =
      await ZonaRawan.update(
        {
          status:
            'NONAKTIF'
        },
        {
          where: {
            jenis_id,

            sumber_data:
              'MANUAL'
          }
        }
      )

    const totalFeature =
      Array.isArray(resetResult)
        ? resetResult[0]
        : 0

    await createUploadLog({
      uploaded_by:
        uploader,

      file_name:
        buildFileName(
          'reset',
          jenis_id
        ),

      total_feature:
        totalFeature || 0,

      status:
        'DELETED',

      notes:
        `Reset polygon manual zona rawan ${getBencanaLabel(jenis_id)} ke data default BPBD`
    })

    return res.status(200).json({
      success: true,
      message:
        'Zona manual berhasil direset berdasarkan jenis bencana'
    })
  } catch (error) {
    console.error(
      'RESET ZONA RAWAN BY JENIS ERROR:',
      error
    )

    return res.status(500).json({
      success: false,
      message:
        'Gagal reset zona berdasarkan jenis bencana'
    })
  }
})

// =========================
// RESET ZONA MANUAL SEMUA
// =========================

router.patch('/reset', async (req, res) => {
  try {
    const uploader =
      getUploader(req)

    const resetResult =
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

    const totalFeature =
      Array.isArray(resetResult)
        ? resetResult[0]
        : 0

    await createUploadLog({
      uploaded_by:
        uploader,

      file_name:
        buildFileName(
          'reset-all',
          'all'
        ),

      total_feature:
        totalFeature || 0,

      status:
        'DELETED',

      notes:
        'Reset seluruh polygon manual zona rawan ke data default BPBD'
    })

    return res.status(200).json({
      success: true,
      message:
        'Zona berhasil direset ke default'
    })
  } catch (error) {
    console.error(
      'RESET ZONA RAWAN ERROR:',
      error
    )

    return res.status(500).json({
      success: false,
      message:
        'Gagal reset zona'
    })
  }
})

module.exports = router