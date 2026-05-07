"use strict";

function toNumber(value) {
  if (value === undefined || value === null || value === "") return null;

  const number = Number(String(value).trim().replace(/,/g, "."));

  return Number.isFinite(number) ? number : null;
}

function normalizeJenisKorban(value) {
  if (!value) return "TIDAK_ADA";

  const text = String(value).trim().toUpperCase();

  if (text === "LUKA" || text === "SAKIT") return "LUKA_SAKIT";
  if (text === "LUKA/SAKIT") return "LUKA_SAKIT";
  if (text === "SAKIT/LUKA") return "LUKA_SAKIT";
  if (text === "TIDAK ADA") return "TIDAK_ADA";

  const allowed = [
    "TIDAK_ADA",
    "TERDAMPAK",
    "MENINGGAL",
    "HILANG",
    "MENGUNGSI",
    "LUKA_SAKIT",
  ];

  return allowed.includes(text) ? text : "TIDAK_ADA";
}

function normalizeJenisLokasi(value) {
  if (!value) return "AREA_TIDAK_PADAT";

  const text = String(value).trim().toUpperCase();

  if (text === "PEMUKIMAN") return "PEMUKIMAN";
  if (text === "FASILITAS_UMUM" || text === "FASILITAS UMUM") {
    return "FASILITAS_UMUM";
  }
  if (text === "JALAN_RAYA" || text === "JALAN RAYA") {
    return "JALAN_RAYA";
  }
  if (text === "AREA_TIDAK_PADAT" || text === "AREA TIDAK PADAT") {
    return "AREA_TIDAK_PADAT";
  }

  return text;
}

function normalizeTingkatResiko(value) {
  if (!value) return "TIDAK_RAWAN";

  const text = String(value).trim().toUpperCase();

  if (text === "RENDAH") return "RENDAH";
  if (text === "SEDANG") return "SEDANG";
  if (text === "TINGGI") return "TINGGI";
  if (text === "TIDAK_RAWAN" || text === "TIDAK RAWAN") return "TIDAK_RAWAN";

  return "TIDAK_RAWAN";
}

function getJenisKorbanFromDetail(detailKorban = []) {
  if (!Array.isArray(detailKorban)) return "TIDAK_ADA";

  const order = [
    "MENINGGAL",
    "HILANG",
    "MENGUNGSI",
    "LUKA_SAKIT",
    "TERDAMPAK",
  ];

  const available = detailKorban
    .filter((item) => Number(item?.jumlah || 0) > 0)
    .map((item) => normalizeJenisKorban(item?.jenis_korban));

  for (const jenis of order) {
    if (available.includes(jenis)) return jenis;
  }

  return "TIDAK_ADA";
}

function isZonaRawanNaikPrioritas(tingkatResiko) {
  const resiko = normalizeTingkatResiko(tingkatResiko);

  return resiko === "SEDANG" || resiko === "TINGGI";
}

function calculateKredibilitas({ metadataFoto = null, osintReference = null } = {}) {
  const distance = toNumber(metadataFoto?.selisih_jarak);
  const gpsSource = metadataFoto?.gps_source || "none";
  const hasValidGps = distance !== null && distance <= 10;
  const hasOsintReference = Boolean(osintReference);

  if (hasValidGps) {
    return {
      skor_kredibilitas: "TINGGI",
      alasan_kredibilitas:
        gpsSource === "browser"
          ? "Foto tidak memiliki metadata GPS EXIF, tetapi GPS browser berada tidak lebih dari 10 meter dari titik laporan."
          : "Metadata GPS EXIF foto berada tidak lebih dari 10 meter dari titik laporan.",
      valid_photo_location: true,
      has_osint_reference: hasOsintReference,
      selisih_jarak: distance,
      gps_source: gpsSource,
    };
  }

  if (hasOsintReference) {
    return {
      skor_kredibilitas: "SEDANG",
      alasan_kredibilitas:
        "Metadata GPS foto tidak tersedia atau berjarak lebih dari 10 meter, tetapi terdapat data OSINT reference sebagai data pendukung laporan.",
      valid_photo_location: false,
      has_osint_reference: true,
      selisih_jarak: distance,
      gps_source: gpsSource,
    };
  }

  return {
    skor_kredibilitas: "RENDAH",
    alasan_kredibilitas:
      "Metadata GPS foto tidak tersedia atau berjarak lebih dari 10 meter, dan tidak terdapat data OSINT reference sebagai pendukung.",
    valid_photo_location: false,
    has_osint_reference: false,
    selisih_jarak: distance,
    gps_source: gpsSource,
  };
}

function calculatePrioritas({ jenisKorban, jenisLokasi, tingkatResiko } = {}) {
  const korban = normalizeJenisKorban(jenisKorban);
  const lokasi = normalizeJenisLokasi(jenisLokasi);
  const resiko = normalizeTingkatResiko(tingkatResiko);

  if (["MENINGGAL", "HILANG", "MENGUNGSI", "LUKA_SAKIT"].includes(korban)) {
    return {
      prioritas: "PRIORITAS TINGGI",
      alasan_prioritas:
        "Terdapat korban meninggal, hilang, mengungsi, atau luka/sakit sehingga laporan dikategorikan prioritas tinggi.",
      jenis_korban: korban,
      jenis_lokasi: lokasi,
      tingkat_resiko: resiko,
    };
  }

  if (lokasi === "PEMUKIMAN") {
    return {
      prioritas: "PRIORITAS TINGGI",
      alasan_prioritas:
        "Lokasi kejadian berada di pemukiman sehingga berpotensi berdampak langsung pada masyarakat.",
      jenis_korban: korban,
      jenis_lokasi: lokasi,
      tingkat_resiko: resiko,
    };
  }

  if (lokasi === "FASILITAS_UMUM") {
    return {
      prioritas: "PRIORITAS TINGGI",
      alasan_prioritas:
        "Lokasi kejadian berada di fasilitas umum sehingga berpotensi mengganggu layanan dan aktivitas publik.",
      jenis_korban: korban,
      jenis_lokasi: lokasi,
      tingkat_resiko: resiko,
    };
  }

  if (lokasi === "JALAN_RAYA") {
    if (isZonaRawanNaikPrioritas(resiko)) {
      return {
        prioritas: "PRIORITAS TINGGI",
        alasan_prioritas:
          "Lokasi berada di jalan raya dan masuk zona rawan sedang/tinggi sehingga dapat mengganggu akses evakuasi atau mobilitas penanganan.",
        jenis_korban: korban,
        jenis_lokasi: lokasi,
        tingkat_resiko: resiko,
      };
    }

    return {
      prioritas: "PRIORITAS SEDANG",
      alasan_prioritas:
        "Lokasi berada di jalan raya sehingga berpotensi mengganggu akses dan mobilitas, tetapi tidak berada pada zona rawan sedang/tinggi.",
      jenis_korban: korban,
      jenis_lokasi: lokasi,
      tingkat_resiko: resiko,
    };
  }

  if (lokasi === "AREA_TIDAK_PADAT") {
    if (isZonaRawanNaikPrioritas(resiko)) {
      return {
        prioritas: "PRIORITAS SEDANG",
        alasan_prioritas:
          "Lokasi berada di area tidak padat, tetapi masuk zona rawan sedang/tinggi sehingga perlu dipantau.",
        jenis_korban: korban,
        jenis_lokasi: lokasi,
        tingkat_resiko: resiko,
      };
    }

    return {
      prioritas: "PRIORITAS RENDAH",
      alasan_prioritas:
        "Lokasi berada di area tidak padat, tidak terdapat korban prioritas tinggi, dan tidak berada pada zona rawan sedang/tinggi.",
      jenis_korban: korban,
      jenis_lokasi: lokasi,
      tingkat_resiko: resiko,
    };
  }

  return {
    prioritas: "PRIORITAS RENDAH",
    alasan_prioritas:
      "Data prioritas tidak memenuhi kondisi prioritas sedang atau tinggi.",
    jenis_korban: korban,
    jenis_lokasi: lokasi,
    tingkat_resiko: resiko,
  };
}

function calculateRuleBasedAnalysis({
  laporan = null,
  identifikasi = null,
  detailKorban = [],
  metadataFoto = null,
  tingkatResiko = null,
  osintReference = null,
} = {}) {
  const jenisKorbanIdentifikasi = normalizeJenisKorban(
    identifikasi?.jenis_korban
  );
  const jenisKorbanDetail = getJenisKorbanFromDetail(detailKorban);
  const jenisKorban =
    jenisKorbanDetail !== "TIDAK_ADA"
      ? jenisKorbanDetail
      : jenisKorbanIdentifikasi;

  const tingkatResikoValue = normalizeTingkatResiko(
    tingkatResiko?.tingkat_resiko
  );

  const kredibilitas = calculateKredibilitas({
    metadataFoto,
    osintReference,
  });

  const prioritas = calculatePrioritas({
    jenisKorban,
    jenisLokasi: laporan?.jenis_lokasi,
    tingkatResiko: tingkatResikoValue,
  });

  return {
    skor_kredibilitas: kredibilitas.skor_kredibilitas,
    prioritas: prioritas.prioritas,
    alasan_kredibilitas: kredibilitas.alasan_kredibilitas,
    alasan_prioritas: prioritas.alasan_prioritas,
    jenis_korban: jenisKorban,
    jenis_lokasi: normalizeJenisLokasi(laporan?.jenis_lokasi),
    tingkat_resiko: tingkatResikoValue,
    is_zona_rawan: tingkatResikoValue !== "TIDAK_RAWAN",
    kredibilitas_detail: kredibilitas,
    prioritas_detail: prioritas,
    osint_reference: osintReference,
    geoint: {
      resiko_id: tingkatResiko?.resiko_id || null,
      tingkat_resiko: tingkatResikoValue,
      is_zona_rawan: tingkatResikoValue !== "TIDAK_RAWAN",
    },
  };
}

module.exports = {
  calculateRuleBasedAnalysis,
  calculateKredibilitas,
  calculatePrioritas,
  normalizeJenisKorban,
  normalizeJenisLokasi,
  normalizeTingkatResiko,
};
