"use strict";

const express = require("express");
const { Op } = require("sequelize");
const router = express.Router();

const models = require("../../models");
const auth = require("../../middlewares/auth");
const requireRole = require("../../middlewares/requireRole");

const {
  syncOsintData,
} = require("../../services/osint/osintDataIntegrator");

const OsintData = models.osint_data;

function buildListWhere(query) {
  const {
    source = "",
    event_type = "",
    priority_level = "",
    verification_status = "",
    analysis_status = "",
    match_status = "",
    search = "",
  } = query;

  const where = {};

  if (source) where.osint_source = source;
  if (event_type) where.osint_event_type = event_type;
  if (priority_level) where.osint_priority_level = priority_level;
  if (verification_status) where.osint_verification_status = verification_status;
  if (analysis_status) where.osint_analysis_status = analysis_status;
  if (match_status) where.osint_match_status = match_status;

  if (search) {
    where[Op.or] = [
      { osint_event_type: { [Op.like]: `%${search}%` } },
      { osint_area_text: { [Op.like]: `%${search}%` } },
      { osint_account_name: { [Op.like]: `%${search}%` } },
      { osint_account_username: { [Op.like]: `%${search}%` } },
      { osint_content: { [Op.like]: `%${search}%` } },
      { osint_bmkg_source_type: { [Op.like]: `%${search}%` } },
      { osint_weather_desc: { [Op.like]: `%${search}%` } },
      { osint_warning_event: { [Op.like]: `%${search}%` } },
      { osint_hashtags: { [Op.like]: `%${search}%` } },
    ];
  }

  return where;
}

function mergeWhere(baseWhere, extraWhere) {
  const baseKeys = Object.keys(baseWhere || {});
  const symbolKeys = Object.getOwnPropertySymbols(baseWhere || {});

  const hasBase = baseKeys.length > 0 || symbolKeys.length > 0;

  if (!hasBase) return extraWhere;

  return {
    [Op.and]: [baseWhere, extraWhere],
  };
}

async function buildSummary(baseWhere) {
  const maxAgeDays = Number(process.env.OSINT_MAX_DATA_AGE_DAYS || 30);
  const cutoff = new Date(Date.now() - maxAgeDays * 24 * 60 * 60 * 1000);

  const totalData = await OsintData.count({ where: baseWhere });

  const indikasiDarurat = await OsintData.count({
    where: mergeWhere(baseWhere, {
      osint_priority_level: {
        [Op.in]: ["TINGGI", "KRITIS"],
      },
    }),
  });

  const kontenKadaluarsa = await OsintData.count({
    where: mergeWhere(baseWhere, {
      [Op.or]: [
        {
          osint_post_time: {
            [Op.lt]: cutoff,
          },
        },
        {
          osint_event_time: {
            [Op.lt]: cutoff,
          },
        },
        {
          [Op.and]: [
            {
              osint_post_time: {
                [Op.is]: null,
              },
            },
            {
              osint_event_time: {
                [Op.is]: null,
              },
            },
            {
              creation_date: {
                [Op.lt]: cutoff,
              },
            },
          ],
        },
      ],
    }),
  });

  const perluVerifikasi = await OsintData.count({
    where: mergeWhere(baseWhere, {
      [Op.or]: [
        {
          osint_verification_status: "BELUM_DIVERIFIKASI",
        },
        {
          osint_match_status: "REVIEW",
        },
      ],
    }),
  });

  return {
    total_data_osint: totalData,
    indikasi_darurat: indikasiDarurat,
    konten_kadaluarsa: kontenKadaluarsa,
    perlu_verifikasi: perluVerifikasi,
    terkait_humint: 0,
  };
}

router.post("/sync", auth, requireRole("staff", "admin"), async (req, res) => {
  try {
    const includeRecords =
      req.query.preview === "1" || req.query.mode === "preview";

    const enableCorrelation =
      String(req.query.correlation || "true").toLowerCase() !== "false";

    const result = await syncOsintData({
      includeRecords,
      enableCorrelation,
    });

    return res.json(result);
  } catch (error) {
    console.error("[osint-data-sync] error:", error);

    return res.status(500).json({
      ok: false,
      message: "Gagal sinkronisasi osint_data",
      error: error.message,
    });
  }
});

router.get("/", auth, requireRole("staff", "admin"), async (req, res) => {
  try {
    const {
      limit = 50,
      offset = 0,
      sort = "newest",
    } = req.query;

    const where = buildListWhere(req.query);

    const order =
      sort === "oldest"
        ? [
            ["last_update_date", "ASC"],
            ["osint_event_time", "ASC"],
            ["osint_post_time", "ASC"],
          ]
        : [
            ["last_update_date", "DESC"],
            ["osint_event_time", "DESC"],
            ["osint_post_time", "DESC"],
          ];

    const rows = await OsintData.findAndCountAll({
      where,
      limit: Number(limit || 50),
      offset: Number(offset || 0),
      order,
    });

    const osintData = rows.rows.map((row) => row.get({ plain: true }));

    const summary = await buildSummary(where);

    return res.json({
      count: rows.count,
      limit: Number(limit || 50),
      offset: Number(offset || 0),
      summary,
      osint_data: osintData,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Gagal mengambil data OSINT",
      error: error.message,
    });
  }
});

router.get("/:id", auth, requireRole("staff", "admin"), async (req, res) => {
  try {
    const osintData = await OsintData.findOne({
      where: {
        osint_id: req.params.id,
      },
    });

    if (!osintData) {
      return res.status(404).json({
        message: "Data OSINT tidak ditemukan",
      });
    }

    return res.json({
      osint_data: osintData,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Gagal mengambil detail OSINT",
      error: error.message,
    });
  }
});

router.put("/:id/verify", auth, requireRole("staff", "admin"), async (req, res) => {
  try {
    const existing = await OsintData.findOne({
      where: {
        osint_id: req.params.id,
      },
    });

    if (!existing) {
      return res.status(404).json({
        message: "Data OSINT tidak ditemukan",
      });
    }

    const allowedVerificationStatus = [
      "BELUM_DIVERIFIKASI",
      "TERVERIFIKASI_OTOMATIS",
      "TERVERIFIKASI_MANUAL",
      "DITOLAK",
    ];

    const allowedPriorityLevel = ["RENDAH", "SEDANG", "TINGGI", "KRITIS"];

    const verificationStatus =
      req.body?.verification_status || "TERVERIFIKASI_MANUAL";

    const priorityLevel =
      req.body?.osint_priority_level || existing.osint_priority_level;

    if (!allowedVerificationStatus.includes(verificationStatus)) {
      return res.status(400).json({
        message: "Status verifikasi tidak valid",
      });
    }

    if (!allowedPriorityLevel.includes(priorityLevel)) {
      return res.status(400).json({
        message: "Priority level tidak valid",
      });
    }

    await existing.update({
      osint_verification_status: verificationStatus,
      osint_priority_level: priorityLevel,
      osint_analysis_status:
        verificationStatus === "DITOLAK" ? "REJECTED" : existing.osint_analysis_status,
      last_updated_by: req.user?.usr_nama_lengkap || "system",
      last_update_date: new Date(),
    });

    const updated = await OsintData.findOne({
      where: {
        osint_id: req.params.id,
      },
    });

    return res.json({
      message: "Status verifikasi OSINT berhasil diperbarui",
      osint_data: updated,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Gagal memperbarui status verifikasi OSINT",
      error: error.message,
    });
  }
});

module.exports = router;