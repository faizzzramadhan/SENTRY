"use strict";

const KORBAN_PRIORITAS_TINGGI = [
  "MENINGGAL",
  "HILANG",
  "MENGUNGSI",
  "LUKA_SAKIT",
];

function normalizeJenisKorban(value) {
  if (!value) return "TIDAK_ADA";

  const text = String(value).trim().toUpperCase();

  if (
    text === "LUKA" ||
    text === "SAKIT" ||
    text === "LUKA/SAKIT" ||
    text === "SAKIT/LUKA"
  ) {
    return "LUKA_SAKIT";
  }

  if (text === "TIDAK ADA") return "TIDAK_ADA";

  return text || "TIDAK_ADA";
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

function hasKorbanPrioritasTinggi(jenisKorban) {
  return KORBAN_PRIORITAS_TINGGI.includes(normalizeJenisKorban(jenisKorban));
}

function isZonaRawanNaikPrioritas(zonaRawan) {
  const zona = normalizeTingkatResiko(zonaRawan);

  return zona === "SEDANG" || zona === "TINGGI";
}

function calculatePrioritas({
  jenisKorban = "TIDAK_ADA",
  jenisLokasi = null,
  zonaRawan = "TIDAK_RAWAN",
  tingkatResiko = null,
} = {}) {
  const korban = normalizeJenisKorban(jenisKorban);
  const lokasi = String(jenisLokasi || "").trim().toUpperCase();
  const zona = normalizeTingkatResiko(tingkatResiko || zonaRawan);

  if (hasKorbanPrioritasTinggi(korban)) {
    return {
      prioritas: "PRIORITAS TINGGI",
      alasan_prioritas:
        "Laporan memiliki korban meninggal, hilang, mengungsi, atau luka/sakit sehingga termasuk prioritas tinggi.",
      jenis_korban: korban,
      jenis_lokasi: lokasi,
      zona_rawan: zona,
    };
  }

  if (lokasi === "PEMUKIMAN") {
    return {
      prioritas: "PRIORITAS TINGGI",
      alasan_prioritas:
        "Lokasi kejadian berada di pemukiman sehingga berpotensi berdampak langsung pada masyarakat.",
      jenis_korban: korban,
      jenis_lokasi: lokasi,
      zona_rawan: zona,
    };
  }

  if (lokasi === "FASILITAS_UMUM" || lokasi === "FASILITAS UMUM") {
    return {
      prioritas: "PRIORITAS TINGGI",
      alasan_prioritas:
        "Lokasi kejadian berada di fasilitas umum sehingga berpotensi mengganggu layanan dan aktivitas publik.",
      jenis_korban: korban,
      jenis_lokasi: "FASILITAS_UMUM",
      zona_rawan: zona,
    };
  }

  if (lokasi === "JALAN_RAYA" || lokasi === "JALAN RAYA") {
    if (isZonaRawanNaikPrioritas(zona)) {
      return {
        prioritas: "PRIORITAS TINGGI",
        alasan_prioritas:
          "Lokasi berada di jalan raya dan masuk zona rawan sedang/tinggi sehingga dapat mengganggu akses evakuasi atau mobilitas penanganan.",
        jenis_korban: korban,
        jenis_lokasi: "JALAN_RAYA",
        zona_rawan: zona,
      };
    }

    return {
      prioritas: "PRIORITAS SEDANG",
      alasan_prioritas:
        "Lokasi berada di jalan raya sehingga berpotensi mengganggu akses dan mobilitas, tetapi tidak berada pada zona rawan sedang/tinggi.",
      jenis_korban: korban,
      jenis_lokasi: "JALAN_RAYA",
      zona_rawan: zona,
    };
  }

  if (lokasi === "AREA_TIDAK_PADAT" || lokasi === "AREA TIDAK PADAT") {
    if (isZonaRawanNaikPrioritas(zona)) {
      return {
        prioritas: "PRIORITAS SEDANG",
        alasan_prioritas:
          "Lokasi berada di area tidak padat, tetapi masuk zona rawan sedang/tinggi sehingga perlu dipantau.",
        jenis_korban: korban,
        jenis_lokasi: "AREA_TIDAK_PADAT",
        zona_rawan: zona,
      };
    }

    return {
      prioritas: "PRIORITAS RENDAH",
      alasan_prioritas:
        "Lokasi berada di area tidak padat, tidak terdapat korban prioritas tinggi, dan tidak berada pada zona rawan sedang/tinggi.",
      jenis_korban: korban,
      jenis_lokasi: "AREA_TIDAK_PADAT",
      zona_rawan: zona,
    };
  }

  return {
    prioritas: "PRIORITAS RENDAH",
    alasan_prioritas:
      "Data prioritas tidak memenuhi kondisi prioritas sedang atau tinggi.",
    jenis_korban: korban,
    jenis_lokasi: lokasi,
    zona_rawan: zona,
  };
}

module.exports = {
  KORBAN_PRIORITAS_TINGGI,
  calculatePrioritas,
  hasKorbanPrioritasTinggi,
  isZonaRawanNaikPrioritas,
  normalizeJenisKorban,
  normalizeTingkatResiko,
};
