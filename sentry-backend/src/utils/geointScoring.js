"use strict";

function calculateGeointPlaceholder({
  laporanId = null,
  zonaRawanId = null,
  lastAnalyzedAt = null,
} = {}) {
  return {
    laporan_id: laporanId,
    score: 0,
    status: "BELUM_TERSEDIA",
    status_label: "Data GEOINT belum tersedia",
    zona_rawan_id: zonaRawanId,
    last_analyzed_at: lastAnalyzedAt,
    komponen: {
      zona_rawan: 0,
      historis_kejadian: 0,
    },
    keterangan:
      "GEOINT masih menjadi data pendukung. Skor akan dihitung setelah data zona rawan dan historis kejadian tersedia.",
  };
}

module.exports = {
  calculateGeointPlaceholder,
};
