"use strict";

const express = require("express");
const { Op } = require("sequelize");
const router = express.Router();

const models = require("../../models");
const auth = require("../../middlewares/auth");
const requireRole = require("../../middlewares/requireRole");

const {
  syncOsintReferences,
  getReferencesForLaporan,
} = require("../../services/osint/osintReferenceIntegrator");

const OsintReference = models.osint_reference;
const OsintData = models.osint_data;
const Laporan = models.laporan;

router.post("/sync", auth, requireRole("staff", "admin"), async (req, res) => {
  try {
    const includeRecords =
      req.query.preview === "1" || req.query.mode === "preview";

    const result = await syncOsintReferences({
      includeRecords,
    });

    return res.json(result);
  } catch (error) {
    console.error("[osint-reference-sync] error:", error);

    return res.status(500).json({
      ok: false,
      message: "Gagal sinkronisasi osint_reference",
      error: error.message,
    });
  }
});

router.get("/", auth, requireRole("staff", "admin"), async (req, res) => {
  try {
    const {
      laporan_id = "",
      osint_id = "",
      reference_status = "",
      limit = 50,
      offset = 0,
    } = req.query;

    const where = {};

    if (laporan_id) where.laporan_id = laporan_id;
    if (osint_id) where.osint_id = osint_id;
    if (reference_status) where.reference_status = reference_status;

    const rows = await OsintReference.findAndCountAll({
      where,
      limit: Number(limit || 50),
      offset: Number(offset || 0),
      order: [["last_update_date", "DESC"]],
      raw: true,
    });

    const osintIds = rows.rows.map((item) => item.osint_id).filter(Boolean);
    const laporanIds = rows.rows.map((item) => item.laporan_id).filter(Boolean);

    const osintRows = osintIds.length
      ? await OsintData.findAll({
          where: {
            osint_id: {
              [Op.in]: osintIds,
            },
          },
          raw: true,
        })
      : [];

    const laporanRows = laporanIds.length
      ? await Laporan.findAll({
          where: {
            laporan_id: {
              [Op.in]: laporanIds,
            },
          },
          raw: true,
        })
      : [];

    const osintMap = osintRows.reduce((acc, item) => {
      acc[item.osint_id] = item;
      return acc;
    }, {});

    const laporanMap = laporanRows.reduce((acc, item) => {
      acc[item.laporan_id] = item;
      return acc;
    }, {});

    return res.json({
      count: rows.count,
      limit: Number(limit || 50),
      offset: Number(offset || 0),
      osint_references: rows.rows.map((item) => ({
        ...item,
        osint_data: osintMap[item.osint_id] || null,
        laporan: laporanMap[item.laporan_id] || null,
      })),
    });
  } catch (error) {
    return res.status(500).json({
      message: "Gagal mengambil data osint_reference",
      error: error.message,
    });
  }
});

router.get(
  "/laporan/:laporanId",
  auth,
  requireRole("staff", "admin"),
  async (req, res) => {
    try {
      const refs = await getReferencesForLaporan(req.params.laporanId);

      return res.json({
        laporan_id: Number(req.params.laporanId),
        count: refs.length,
        osint_references: refs,
      });
    } catch (error) {
      return res.status(500).json({
        message: "Gagal mengambil reference OSINT untuk laporan",
        error: error.message,
      });
    }
  }
);

router.get("/:id", auth, requireRole("staff", "admin"), async (req, res) => {
  try {
    const row = await OsintReference.findOne({
      where: {
        osint_reference_id: req.params.id,
      },
      raw: true,
    });

    if (!row) {
      return res.status(404).json({
        message: "Data osint_reference tidak ditemukan",
      });
    }

    const osint = await OsintData.findOne({
      where: {
        osint_id: row.osint_id,
      },
      raw: true,
    });

    const laporan = await Laporan.findOne({
      where: {
        laporan_id: row.laporan_id,
      },
      raw: true,
    });

    return res.json({
      osint_reference: row,
      osint_data: osint || null,
      laporan: laporan || null,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Gagal mengambil detail osint_reference",
      error: error.message,
    });
  }
});

router.put("/:id/verify", auth, requireRole("staff", "admin"), async (req, res) => {
  try {
    const row = await OsintReference.findOne({
      where: {
        osint_reference_id: req.params.id,
      },
    });

    if (!row) {
      return res.status(404).json({
        message: "Data osint_reference tidak ditemukan",
      });
    }

    const allowedStatus = ["MATCHED", "REVIEW", "REJECTED"];
    const referenceStatus = String(req.body.reference_status || "").toUpperCase();

    if (!allowedStatus.includes(referenceStatus)) {
      return res.status(400).json({
        message: "reference_status tidak valid",
        allowed_status: allowedStatus,
      });
    }

    await row.update({
      reference_status: referenceStatus,
      reference_source: "MANUAL",
      verified_by: req.user?.usr_nama_lengkap || req.user?.usr_email || "system",
      verified_at: new Date(),
      last_updated_by: req.user?.usr_nama_lengkap || req.user?.usr_email || "system",
      last_update_date: new Date(),
    });

    return res.json({
      message: "Status osint_reference berhasil diperbarui",
      osint_reference: row,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Gagal verifikasi osint_reference",
      error: error.message,
    });
  }
});

module.exports = router;