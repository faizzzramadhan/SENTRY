const express = require("express");
const router = express.Router();
const { Op } = require("sequelize");

const models = require("../../models");
const auth = require("../../middlewares/auth");
const requireRole = require("../../middlewares/requireRole");
const { runBmkgCrawler } = require("../../services/bmkg/bmkgCrawler");

const OsintDataBmkg = models.osint_data_bmkg;

router.post("/run", auth, requireRole("staff", "admin"), async (req, res) => {
  try {
    const includeRecords =
      req.query.preview === "1" || req.query.mode === "preview";

    const result = await runBmkgCrawler({
      manual: true,
      includeRecords,
    });

    return res.json(result);
  } catch (error) {
    return res.status(500).json({
      ok: false,
      message: error.message,
    });
  }
});

router.get("/", auth, requireRole("staff", "admin"), async (req, res) => {
  try {
    const {
      search = "",
      sort = "newest",
      source_type = "",
      priority_level = "",
      verification_status = "",
    } = req.query;

    const where = {};

    if (source_type) {
      where.source_type = source_type;
    }

    if (priority_level) {
      where.priority_level = priority_level;
    }

    if (verification_status) {
      where.verification_status = verification_status;
    }

    if (search) {
      where[Op.or] = [
        { wilayah_episenter: { [Op.like]: `%${search}%` } },
        { wilayah_administratif: { [Op.like]: `%${search}%` } },
        { dirasakan: { [Op.like]: `%${search}%` } },
        { potensi_tsunami: { [Op.like]: `%${search}%` } },
        { weather_desc: { [Op.like]: `%${search}%` } },
        { warning_event: { [Op.like]: `%${search}%` } },
        { warning_headline: { [Op.like]: `%${search}%` } },
        { warning_description: { [Op.like]: `%${search}%` } },
      ];
    }

    const order =
      sort === "oldest"
        ? [["event_datetime_utc", "ASC"]]
        : [["event_datetime_utc", "DESC"]];

    const rows = await OsintDataBmkg.findAll({
      where,
      order,
    });

    return res.json({
      count: rows.length,
      osint_data_bmkg: rows,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

router.get("/:osint_bmkg_id", auth, requireRole("staff", "admin"), async (req, res) => {
  try {
    const row = await OsintDataBmkg.findOne({
      where: {
        osint_bmkg_id: req.params.osint_bmkg_id,
      },
    });

    if (!row) {
      return res.status(404).json({
        message: "Data OSINT BMKG tidak ditemukan",
      });
    }

    return res.json({
      osint_data_bmkg: row,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

router.put("/:osint_bmkg_id/verify", auth, requireRole("staff", "admin"), async (req, res) => {
  try {
    const existing = await OsintDataBmkg.findOne({
      where: {
        osint_bmkg_id: req.params.osint_bmkg_id,
      },
    });

    if (!existing) {
      return res.status(404).json({
        message: "Data OSINT BMKG tidak ditemukan",
      });
    }

    const allowedStatus = [
      "BELUM_DIVERIFIKASI",
      "TERVERIFIKASI_OTOMATIS",
      "TERVERIFIKASI_MANUAL",
      "DITOLAK",
    ];

    const verificationStatus =
      req.body?.verification_status || existing.verification_status;

    if (!allowedStatus.includes(verificationStatus)) {
      return res.status(400).json({
        message: "Status verifikasi tidak valid",
      });
    }

    await OsintDataBmkg.update(
      {
        verification_status: verificationStatus,
        updated_at: new Date(),
      },
      {
        where: {
          osint_bmkg_id: req.params.osint_bmkg_id,
        },
      }
    );

    const updated = await OsintDataBmkg.findOne({
      where: {
        osint_bmkg_id: req.params.osint_bmkg_id,
      },
    });

    return res.json({
      message: "Status verifikasi OSINT BMKG berhasil diperbarui",
      osint_data_bmkg: updated,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

module.exports = router;