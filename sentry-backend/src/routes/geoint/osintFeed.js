const express = require('express')

const router = express.Router()

const {sequelize} = require('../../models')

// =========================
// GET OSINT SOCIAL FEED
// =========================

router.get('/', async (req, res) => {

  try {

    const [rows] = await sequelize.query(`

      SELECT

    osint_id,
    osint_source,
    osint_event_type,
    osint_content,
    osint_area_text,
    osint_priority_level,
    osint_post_time,
    osint_link_url,
    osint_account_name,
    osint_account_username,
    osint_verification_status,
    osint_like_count,
    osint_share_count,
    osint_reply_count
  FROM osint_data
  WHERE
    UPPER(TRIM(osint_source))
    IN ('X', 'TWITTER')
  ORDER BY osint_post_time DESC
  LIMIT 50
    `)

    res.json({

      success: true,

      total: rows.length,

      data: rows
    })

  } catch (err) {

    console.error(err)

    res.status(500).json({

      success: false,

      message: 'Gagal mengambil feed OSINT'
    })
  }
})

module.exports = router