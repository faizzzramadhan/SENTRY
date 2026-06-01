const express = require('express')

const router = express.Router()

const { sequelize } =
require('../../models')

// =========================
// GET OSINT MAP DATA
// =========================

router.get('/', async (req, res) => {

  try {

    const [rows] =
      await sequelize.query(`

        SELECT

          osint_id,

          osint_source,

          osint_event_type,

          osint_area_text,

          osint_content,

          osint_latitude,

          osint_longitude,

          osint_post_time,

          osint_event_time,

          osint_priority_level,

          osint_verification_status,

          osint_weather_desc,

          osint_temperature_c,

          osint_humidity_percent,

          osint_wind_speed_kmh,

          osint_warning_headline,

          osint_warning_description,

          osint_link_url,

          osint_media_url,

          osint_account_name,

          osint_account_username,

          osint_like_count,

          osint_share_count,

          osint_reply_count,

          osint_view_count

        FROM osint_data

      `)

    return res.status(200).json({

      success: true,

      total: rows.length,

      data: rows
    })

  }

  catch (error) {

    console.error(
      'OSINT MAP ERROR:',
      error
    )

    return res.status(500).json({

      success: false,

      message:
        'Gagal mengambil data OSINT'
    })
  }
})

module.exports = router