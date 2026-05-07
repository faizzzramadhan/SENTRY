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

const {
  getReferencesForOsintIds,
} = require("../../services/osint/osintReferenceIntegrator");

const OsintData = models.osint_data;
const OsintDataScore = models.osint_data_score;
const OsintReference = models.osint_reference;

const VALID_REFERENCE_STATUS = ["MATCHED", "REVIEW"];

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
      { osint_warning_headline: { [Op.like]: `%${search}%` } },
      { osint_warning_description: { [Op.like]: `%${search}%` } },
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

function normalizeBooleanFilter(value) {
  const text = String(value || "").toLowerCase();

  if (["true", "1", "yes", "ada", "related"].includes(text)) return true;
  if (["false", "0", "no", "tidak", "none"].includes(text)) return false;

  return null;
}

async function getHumintRelatedOsintIds() {
  if (!OsintReference) return [];

  const refs = await OsintReference.findAll({
    where: {
      reference_status: {
        [Op.in]: VALID_REFERENCE_STATUS,
      },
    },
    attributes: ["osint_id"],
    raw: true,
  });

  return [...new Set(refs.map((item) => Number(item.osint_id)).filter(Boolean))];
}

async function applyHumintRelatedWhere(baseWhere, humintRelatedQuery) {
  const humintRelated = normalizeBooleanFilter(humintRelatedQuery);

  if (humintRelated === null) return baseWhere;

  const relatedOsintIds = await getHumintRelatedOsintIds();

  if (humintRelated === true) {
    if (!relatedOsintIds.length) {
      return mergeWhere(baseWhere, {
        osint_id: {
          [Op.in]: [-1],
        },
      });
    }

    return mergeWhere(baseWhere, {
      osint_id: {
        [Op.in]: relatedOsintIds,
      },
    });
  }

  if (humintRelated === false) {
    if (!relatedOsintIds.length) {
      return baseWhere;
    }

    return mergeWhere(baseWhere, {
      osint_id: {
        [Op.notIn]: relatedOsintIds,
      },
    });
  }

  return baseWhere;
}

async function getScoreMap(osintIds) {
  if (!osintIds.length) return {};

  const scores = await OsintDataScore.findAll({
    where: {
      osint_id: {
        [Op.in]: osintIds,
      },
    },
    raw: true,
  });

  return scores.reduce((acc, item) => {
    acc[item.osint_id] = item;
    return acc;
  }, {});
}

async function countRelatedHumint(baseWhere) {
  if (!OsintReference) return 0;

  const relatedOsintIds = await getHumintRelatedOsintIds();

  if (!relatedOsintIds.length) return 0;

  const count = await OsintData.count({
    where: mergeWhere(baseWhere, {
      osint_id: {
        [Op.in]: relatedOsintIds,
      },
    }),
  });

  return count;
}

async function buildSummary(baseWhere) {
  const maxAgeDays = Number(process.env.OSINT_MAX_DATA_AGE_DAYS || 30);
  const cutoff = new Date(Date.now() - maxAgeDays * 24 * 60 * 60 * 1000);

  const totalData = await OsintData.count({
    where: baseWhere,
  });

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

  const terkaitHumint = await countRelatedHumint(baseWhere);

  return {
    total_data_osint: totalData,
    indikasi_darurat: indikasiDarurat,
    konten_kadaluarsa: kontenKadaluarsa,
    perlu_verifikasi: perluVerifikasi,
    terkait_humint: terkaitHumint,
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
      humint_related = "",
    } = req.query;

    const baseWhere = buildListWhere(req.query);
    const where = await applyHumintRelatedWhere(baseWhere, humint_related);

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

    const plainRows = rows.rows.map((row) => row.get({ plain: true }));
    const osintIds = plainRows.map((row) => row.osint_id).filter(Boolean);

    const scoreMap = await getScoreMap(osintIds);
    const referenceMap = await getReferencesForOsintIds(osintIds);

    const osintData = plainRows.map((row) => {
      const references = referenceMap[row.osint_id] || [];

      return {
        ...row,
        osint_score: scoreMap[row.osint_id] || null,

        osint_reference_count: references.length,
        humint_related: references.length > 0,
        humint_label: references.length > 0 ? "Ada Data HUMINT" : "Tidak Ada",
        osint_references: references,
      };
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
    console.error("[osint-data-list] error:", error);

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

    const plainOsintData = osintData.get({ plain: true });

    const score = await OsintDataScore.findOne({
      where: {
        osint_id: req.params.id,
      },
      raw: true,
    });

    const referenceMap = await getReferencesForOsintIds([req.params.id]);
    const references =
      referenceMap[req.params.id] ||
      referenceMap[Number(req.params.id)] ||
      [];

    return res.json({
      osint_data: {
        ...plainOsintData,

        osint_reference_count: references.length,
        humint_related: references.length > 0,
        humint_label: references.length > 0 ? "Ada Data HUMINT" : "Tidak Ada",
        osint_references: references,
      },
      osint_score: score || null,
    return res.json({
      osint_data: osintData,
    });
  } catch (error) {
    console.error("[osint-data-detail] error:", error);

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
        allowed_status: allowedVerificationStatus,
      });
    }

    if (!allowedPriorityLevel.includes(priorityLevel)) {
      return res.status(400).json({
        message: "Priority level tidak valid",
        allowed_priority: allowedPriorityLevel,
      });
    }

    await existing.update({
      osint_verification_status: verificationStatus,
      osint_priority_level: priorityLevel,
      osint_analysis_status:
        verificationStatus === "DITOLAK"
          ? "REJECTED"
          : existing.osint_analysis_status,
      last_updated_by:
        req.user?.usr_nama_lengkap || req.user?.usr_email || "system",
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
    console.error("[osint-data-verify] error:", error);

    return res.status(500).json({
      message: "Gagal memperbarui status verifikasi OSINT",
      error: error.message,
    });
  }
});

module.exports = router;