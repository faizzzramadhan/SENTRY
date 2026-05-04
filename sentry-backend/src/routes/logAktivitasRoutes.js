const express     = require("express");
const router      = express.Router();
const models      = require("../models");
const auth        = require("../middlewares/auth");
const requireRole = require("../middlewares/requireRole");
const { createLogAktivitas } = require("../utils/activityLogger");

// GET semua log aktivitas (admin only)
router.get("/", auth, requireRole("admin"), async (req, res) => {
  try {
    const { nama_user, role, dari, sampai, limit = 500 } = req.query;

    const conditions   = [];
    const replacements = [];

    if (nama_user) {
      conditions.push("la.nama_user LIKE ?");
      replacements.push(`%${nama_user}%`);
    }

    // Validasi ENUM sebelum masuk query
    if (role && ["admin", "staff"].includes(role)) {
      conditions.push("la.role = ?");
      replacements.push(role);
    }

    if (dari) {
      conditions.push("la.waktu_aktivitas >= ?");
      replacements.push(`${dari} 00:00:00`);
    }

    if (sampai) {
      conditions.push("la.waktu_aktivitas <= ?");
      replacements.push(`${sampai} 23:59:59`);
    }

    const whereClause = conditions.length
      ? "WHERE " + conditions.join(" AND ")
      : "";

    replacements.push(Math.min(Number(limit) || 500, 1000)); // max cap 1000

    const [rows] = await models.sequelize.query(
      `SELECT
         la.log_id,
         la.usr_id,
         la.nama_user,
         la.role,
         la.nama_aktivitas,
         DATE_FORMAT(la.waktu_aktivitas, '%Y-%m-%d %H:%i:%s') AS waktu_aktivitas
       FROM log_aktivitas la
       ${whereClause}
       ORDER BY la.waktu_aktivitas DESC
       LIMIT ?`,
      { replacements }
    );

    return res.status(200).json({
      message : "Berhasil mengambil log aktivitas",
      total   : rows.length,
      data    : rows,
    });
  } catch (error) {
    return res.status(500).json({
      message : "Gagal mengambil log aktivitas",
      error   : error.message,
    });
  }
});

// POST: catat aktivitas download CSV log aktivitas oleh admin
// Dipanggil dari frontend setelah klik tombol Download CSV
router.post("/catat-download-csv", auth, requireRole("admin"), async (req, res) => {
  try {
    await createLogAktivitas({
      req,
      namaAktivitas: "Mengunduh log aktivitas dalam format CSV",
    });

    return res.status(200).json({ message: "Aktivitas download CSV berhasil dicatat" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

module.exports = router;
