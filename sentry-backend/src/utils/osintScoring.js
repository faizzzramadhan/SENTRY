"use strict";

function calculateOsintPlaceholder({
  laporanId = null,
  osintReferenceId = null,
  lastAnalyzedAt = null,
} = {}) {
  return {
    laporan_id: laporanId,
    score: 0,
    status: "BELUM_TERSEDIA",
    status_label: "Data OSINT belum tersedia",
    osint_reference_id: osintReferenceId,
    last_analyzed_at: lastAnalyzedAt,
    komponen: {
      kesesuaian_keyword: 0,
      lokasi_post: 0,
      waktu_post: 0,
      engagement: 0,
      jumlah_post_serupa: 0,
    },
    keterangan:
      "OSINT masih menjadi data pendukung. Skor akan dihitung setelah data OSINT tersedia.",
  };
}

module.exports = {
  calculateOsintPlaceholder,
};
