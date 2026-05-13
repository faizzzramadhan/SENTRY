"use strict";

function toNumber(value) {
  if (value === undefined || value === null || value === "") return null;

  const number = Number(String(value).trim().replace(/,/g, "."));

  return Number.isFinite(number) ? number : null;
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
    .map((item) => item?.jenis_korban || "TIDAK_ADA");

  for (const jenis of order) {
    if (available.includes(jenis)) return jenis;
  }

  return "TIDAK_ADA";
}

function isZonaRawanNaikPrioritas(tingkatResiko) {
  return tingkatResiko === "SEDANG" || tingkatResiko === "TINGGI";
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
  const korban = jenisKorban || "TIDAK_ADA";
  const lokasi = jenisLokasi || "AREA_TIDAK_PADAT";
  const resiko = tingkatResiko || "TIDAK_RAWAN";

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
  const jenisKorbanIdentifikasi = identifikasi?.jenis_korban || "TIDAK_ADA";
  const jenisKorbanDetail = getJenisKorbanFromDetail(detailKorban);
  const jenisKorban =
    jenisKorbanDetail !== "TIDAK_ADA"
      ? jenisKorbanDetail
      : jenisKorbanIdentifikasi;

  const tingkatResikoValue = tingkatResiko?.tingkat_resiko || "TIDAK_RAWAN";
  const jenisLokasiValue = laporan?.jenis_lokasi || "AREA_TIDAK_PADAT";

  const kredibilitas = calculateKredibilitas({
    metadataFoto,
    osintReference,
  });

  const prioritas = calculatePrioritas({
    jenisKorban,
    jenisLokasi: jenisLokasiValue,
    tingkatResiko: tingkatResikoValue,
  });

  return {
    skor_kredibilitas: kredibilitas.skor_kredibilitas,
    prioritas: prioritas.prioritas,
    alasan_kredibilitas: kredibilitas.alasan_kredibilitas,
    alasan_prioritas: prioritas.alasan_prioritas,
    jenis_korban: jenisKorban,
    jenis_lokasi: jenisLokasiValue,
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
};
