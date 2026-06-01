const express = require('express')

const router = express.Router()

const db = require('../../models')

router.get('/', async (req, res) => {

  try {

    const query = `
      SELECT

        l.laporan_id,

        l.jenis_laporan,

        l.nama_pelapor,

        l.no_hp,

        l.alamat_pelapor,

        l.kronologi,

        l.foto_kejadian,

        l.foto_kerusakan,

        l.jenis_lokasi,

        l.alamat_lengkap_kejadian,

        l.latitude,

        l.longitude,

        l.waktu_kejadian,

        l.waktu_laporan,

        l.creation_date,

        nb.nama_bencana,

        jb.nama_jenis,

        dk.nama_kelurahan,

        dc.nama_kecamatan,

        ans.status_laporan,

        ans.prioritas_sistem

      FROM laporan l

      LEFT JOIN analisis_sistem ans
        ON ans.id_laporan = l.laporan_id

      LEFT JOIN nama_bencana nb
        ON l.id_bencana = nb.bencana_id

      LEFT JOIN jenis_bencana jb
        ON l.id_jenis = jb.jenis_id

      LEFT JOIN data_kelurahan dk
        ON l.id_kelurahan = dk.kelurahan_id

      LEFT JOIN data_kecamatan dc
        ON l.id_kecamatan = dc.kecamatan_id

      WHERE l.latitude IS NOT NULL
      AND l.longitude IS NOT NULL
    `

    const [rows] = await db.sequelize.query(query)

    const result = rows.map(item => ({

      id: item.laporan_id,

      source: 'humint',

      title:
        item.nama_bencana
        || 'Tidak diketahui',

      category:
        item.nama_jenis
        || 'Tidak diketahui',

      kelurahan:
        item.nama_kelurahan
        || '-',

      kecamatan:
        item.nama_kecamatan
        || '-',

      latitude:
        parseFloat(item.latitude),

      longitude:
        parseFloat(item.longitude),

      waktu_kejadian:
        item.waktu_kejadian,

      waktu_laporan:
        item.waktu_laporan,

      created_at:
        item.creation_date,

      status_laporan:
        item.status_laporan
        || 'IDENTIFIKASI',

      prioritas:
        item.prioritas_sistem
        || 'PRIORITAS RENDAH',

      nama_pelapor:
        item.nama_pelapor
        || '-',

      no_hp:
        item.no_hp
        || '-',

      alamat_pelapor:
        item.alamat_pelapor
        || '-',

      kronologi:
        item.kronologi
        || '-',

      foto_kejadian:
        item.foto_kejadian
        || null,

      foto_kerusakan:
        item.foto_kerusakan
        || null,

      jenis_lokasi:
        item.jenis_lokasi
        || '-',

      alamat_lengkap:
        item.alamat_lengkap_kejadian
        || '-',

        jenis_laporan:
          item.jenis_laporan
          || '-'

    }))

    res.status(200).json({

      success: true,

      total: result.length,

      data: result

    })

  } catch (error) {

    console.error(
      'HUMINT MAP ERROR:',
      error
    )

    res.status(500).json({

      success: false,

      message:
        'Failed load HUMINT map',

      error:
        error.message
    })
  }
})

module.exports = router