const express = require("express");
const router = express.Router();

const { recalculateHumintById } = require("../../utils/recalculateHumint");

router.post("/recalculate/:id", async (req, res) => {
  try {
    const result = await recalculateHumintById(req.params.id);

    if (!result) {
      return res.status(404).json({
        message: "Laporan tidak ditemukan",
      });
    }

    return res.json({
      message: "Recalculate HUMINT dan DSS berhasil",
      laporan_id: result.laporan_id,
      metadata_foto: {
        exif_latitude: result.exif_latitude,
        exif_longitude: result.exif_longitude,
        browser_latitude: result.browser_latitude,
        browser_longitude: result.browser_longitude,
        gps_source: result.gps_source,
        selisih_jarak: result.selisih_jarak,
        kategori_validasi: result.kategori_validasi,
        is_valid_location: result.is_valid_location,
      },
      humint_analysis: {
        humint_score: result.humint_score,
        skor_kredibilitas: result.skor_kredibilitas,
        prioritas: result.prioritas,
        total_korban: result.total_korban,
      },
      osint: result.osint || null,
      geoint: result.geoint || null,
      dss: result.dss || null,
    });
  } catch (error) {
    console.error("Gagal recalculate HUMINT dan DSS:", error);

    return res.status(500).json({
      message: "Gagal recalculate HUMINT dan DSS",
      error: error.message,
    });
  }
});

module.exports = router;
