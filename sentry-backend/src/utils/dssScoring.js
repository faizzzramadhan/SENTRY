"use strict";

function clampScore(value) {
  const number = Number(value || 0);

  if (!Number.isFinite(number)) {
    return 0;
  }

  return Math.max(0, Math.min(100, Math.round(number)));
}

function isSupportScoreAvailable(value) {
  return value !== null && value !== undefined && Number(value) > 0;
}

function normalizePriorityLabel(value) {
  const text = String(value || "").trim().toUpperCase();

  if (text === "TINGGI") return "Tinggi";
  if (text === "SEDANG") return "Sedang";
  return "Rendah";
}

function getDssProfileByLevel(levelNumber) {
  const level = Number(levelNumber || 1);

  if (level >= 5) {
    return {
      level_number: 5,
      level: "Level 5",
      dss_level: "Level 5",
      skor_range: "85-100",
      prioritas_dss: "Tinggi",
      rekomendasi: [
        "Segera kirim Tim Reaksi Cepat (TRC)",
        "Prioritaskan evakuasi korban",
        "Koordinasikan ambulans dan perangkat wilayah terkait",
        "Siapkan bantuan logistik awal",
        "Eskalasi penanganan ke Command Center BPBD",
      ],
    };
  }

  if (level === 4) {
    return {
      level_number: 4,
      level: "Level 4",
      dss_level: "Level 4",
      skor_range: "70-84",
      prioritas_dss: "Tinggi",
      rekomendasi: [
        "Segera kirim Tim Reaksi Cepat (TRC)",
        "Validasi korban di lokasi kejadian",
        "Lakukan koordinasi dengan perangkat wilayah terkait",
        "Dokumentasikan kondisi lapangan",
        "Perbarui status laporan berdasarkan hasil penanganan",
      ],
    };
  }

  if (level === 3) {
    return {
      level_number: 3,
      level: "Level 3",
      dss_level: "Level 3",
      skor_range: "50-69",
      prioritas_dss: "Sedang",
      rekomendasi: [
        "Lakukan verifikasi laporan",
        "Cek ulang data korban atau lokasi kejadian",
        "Konfirmasi laporan ke kelurahan atau kecamatan setempat",
        "Siapkan TRC apabila kondisi memburuk",
      ],
    };
  }

  if (level === 2) {
    return {
      level_number: 2,
      level: "Level 2",
      dss_level: "Level 2",
      skor_range: "30-49",
      prioritas_dss: "Rendah",
      rekomendasi: [
        "Hubungi pelapor untuk konfirmasi awal",
        "Minta data tambahan atau foto tambahan",
        "Cek lokasi kejadian secara administratif",
        "Lakukan identifikasi awal terhadap laporan",
      ],
    };
  }

  return {
    level_number: 1,
    level: "Level 1",
    dss_level: "Level 1",
    skor_range: "0-29",
    prioritas_dss: "Rendah",
    rekomendasi: [
      "Monitoring laporan tambahan",
      "Cek kemungkinan laporan serupa",
      "Belum diperlukan tindakan lapangan cepat",
    ],
  };
}

function getBaseDssLevel(totalScore) {
  const score = clampScore(totalScore);

  if (score >= 85) return getDssProfileByLevel(5);
  if (score >= 70) return getDssProfileByLevel(4);
  if (score >= 50) return getDssProfileByLevel(3);
  if (score >= 30) return getDssProfileByLevel(2);
  return getDssProfileByLevel(1);
}

function calculateTotalDssScore({
  humintScore = 0,
  osintScore = null,
  spatialScore = null,
}) {
  const humint = clampScore(humintScore);
  const osintAvailable = isSupportScoreAvailable(osintScore);
  const spatialAvailable = isSupportScoreAvailable(spatialScore);

  if (!osintAvailable && !spatialAvailable) {
    return humint;
  }

  const weights = {
    humint: 50,
    osint: osintAvailable ? 30 : 0,
    geoint: spatialAvailable ? 20 : 0,
  };

  const totalWeight = weights.humint + weights.osint + weights.geoint;

  const weightedScore =
    (humint * weights.humint +
      clampScore(osintScore) * weights.osint +
      clampScore(spatialScore) * weights.geoint) /
    totalWeight;

  return clampScore(weightedScore);
}

function getSupportDataNote(osintScore, spatialScore) {
  const osintAvailable = isSupportScoreAvailable(osintScore);
  const spatialAvailable = isSupportScoreAvailable(spatialScore);

  if (!osintAvailable && !spatialAvailable) {
    return "OSINT dan GEOINT belum tersedia, sehingga keputusan DSS sementara dihitung berdasarkan HUMINT.";
  }

  if (osintAvailable && !spatialAvailable) {
    return "OSINT sudah tersedia sebagai data pendukung, sedangkan GEOINT belum tersedia.";
  }

  if (!osintAvailable && spatialAvailable) {
    return "GEOINT sudah tersedia sebagai data pendukung, sedangkan OSINT belum tersedia.";
  }

  return "OSINT dan GEOINT sudah tersedia sebagai data pendukung keputusan.";
}

function applyDssRules({
  baseLevelNumber,
  totalKorban = 0,
  jenisLaporan = "ASSESSMENT",
  skorExif = 0,
  gpsSource = "none",
  osintScore = 0,
  spatialScore = 0,
}) {
  let finalLevel = Number(baseLevelNumber || 1);
  const appliedRules = [];
  const korban = Number(totalKorban || 0);
  const laporanType = String(jenisLaporan || "ASSESSMENT").toUpperCase();
  const exifScore = Number(skorExif || 0);
  const osint = clampScore(osintScore);
  const geoint = clampScore(spatialScore);
  const source = String(gpsSource || "none").toLowerCase();

  if (korban >= 10) {
    finalLevel = Math.max(finalLevel, 5);
    appliedRules.push({
      kode: "OVERRIDE_KORBAN_BESAR",
      keterangan:
        "Jumlah korban 10 orang atau lebih sehingga level dinaikkan menjadi minimal Level 5.",
    });
  } else if (korban >= 5) {
    finalLevel = Math.max(finalLevel, 4);
    appliedRules.push({
      kode: "OVERRIDE_KORBAN_SEDANG",
      keterangan:
        "Jumlah korban 5 sampai 9 orang sehingga level dinaikkan menjadi minimal Level 4.",
    });
  }

  if (geoint >= 70) {
    finalLevel = Math.max(finalLevel, 4);
    appliedRules.push({
      kode: "OVERRIDE_GEOINT_TINGGI",
      keterangan:
        "Skor GEOINT tinggi sehingga level dinaikkan menjadi minimal Level 4.",
    });
  }

  if ((source === "none" || exifScore === 0) && osint >= 70 && geoint >= 70) {
    finalLevel = Math.max(finalLevel, 3);
    appliedRules.push({
      kode: "OVERRIDE_EXIF_TIDAK_ADA_DATA_PENDUKUNG_KUAT",
      keterangan:
        "EXIF tidak tersedia, tetapi OSINT dan GEOINT kuat sehingga laporan tetap perlu diverifikasi cepat.",
    });
  }

  if (korban === 0 && finalLevel > 3) {
    finalLevel = 3;
    appliedRules.push({
      kode: "CAP_TANPA_KORBAN",
      keterangan:
        "Tidak terdapat korban sehingga level dibatasi maksimal Level 3.",
    });
  }

  if (exifScore <= 5 && osint < 30 && geoint < 30 && korban < 5 && finalLevel > 2) {
    finalLevel = 2;
    appliedRules.push({
      kode: "CAP_EXIF_LEMAH_DATA_PENDUKUNG_LEMAH",
      keterangan:
        "EXIF lemah dan data pendukung belum kuat sehingga level dibatasi maksimal Level 2. Cap ini tidak menurunkan laporan dengan korban 5 orang atau lebih.",
    });
  }

  if (laporanType === "NON_ASSESSMENT" && korban < 5 && finalLevel > 2) {
    finalLevel = 2;
    appliedRules.push({
      kode: "CAP_NON_ASSESSMENT",
      keterangan:
        "Jenis laporan NON_ASSESSMENT sehingga level dibatasi maksimal Level 2. Cap ini tidak menurunkan laporan yang sudah memiliki korban 5 orang atau lebih.",
    });
  }

  return {
    finalLevel,
    appliedRules,
  };
}

function calculateDssResult({
  humintScore = 0,
  osintScore = 0,
  spatialScore = 0,
  totalScore = null,
  totalKorban = 0,
  skorExif = 0,
  gpsSource = "none",
  jenisLaporan = "ASSESSMENT",
}) {
  const finalTotalScore =
    totalScore === null || totalScore === undefined
      ? calculateTotalDssScore({ humintScore, osintScore, spatialScore })
      : clampScore(totalScore);

  const baseProfile = getBaseDssLevel(finalTotalScore);
  const ruleResult = applyDssRules({
    baseLevelNumber: baseProfile.level_number,
    totalKorban,
    jenisLaporan,
    skorExif,
    gpsSource,
    osintScore,
    spatialScore,
  });

  const finalProfile = getDssProfileByLevel(ruleResult.finalLevel);

  return {
    humint_score: clampScore(humintScore),
    osint_score: clampScore(osintScore),
    spatial_score: clampScore(spatialScore),
    total_score: finalTotalScore,
    base_level_number: baseProfile.level_number,
    base_level: baseProfile.level,
    level_number: finalProfile.level_number,
    level: finalProfile.level,
    dss_level: finalProfile.dss_level,
    skor_range: finalProfile.skor_range,
    prioritas_dss: normalizePriorityLabel(finalProfile.prioritas_dss),
    rekomendasi: finalProfile.rekomendasi,
    aturan_terpakai: ruleResult.appliedRules,
    catatan_data_pendukung: getSupportDataNote(osintScore, spatialScore),
  };
}

function getAnalisisPrioritasFromDss(dssResult) {
  const levelNumber = Number(dssResult?.level_number || 1);

  if (levelNumber >= 4) return "PRIORITAS TINGGI";
  if (levelNumber === 3) return "PRIORITAS SEDANG";
  return "PRIORITAS RENDAH";
}

module.exports = {
  clampScore,
  calculateTotalDssScore,
  calculateDssResult,
  getBaseDssLevel,
  getDssProfileByLevel,
  getAnalisisPrioritasFromDss,
  getSupportDataNote,
};
