"use strict";

const BATAS_VALIDASI_FOTO_METER = 10;

function isFiniteNumber(value) {
  if (value === undefined || value === null || value === "") return false;
  const number = Number(String(value).trim().replace(/,/g, "."));
  return Number.isFinite(number);
}

function toNumber(value) {
  if (!isFiniteNumber(value)) return null;
  return Number(String(value).trim().replace(/,/g, "."));
}

function isValidPhotoLocation(metadataFoto) {
  if (!metadataFoto) return false;

  const distance = toNumber(metadataFoto.selisih_jarak);

  if (distance === null) return false;

  return distance <= BATAS_VALIDASI_FOTO_METER;
}

function isOsintRelevant(osintData) {
  if (!osintData) return false;

  if (osintData.osint_relevant === true) return true;
  if (osintData.relevan === true) return true;
  if (osintData.is_relevant === true) return true;

  return Boolean(osintData.keyword_match === true && osintData.time_match === true);
}

function calculateKredibilitas({ metadataFoto = null, osintData = null } = {}) {
  const validPhotoLocation = isValidPhotoLocation(metadataFoto);
  const osintRelevant = isOsintRelevant(osintData);
  const distance = metadataFoto ? toNumber(metadataFoto.selisih_jarak) : null;
  const gpsSource = metadataFoto?.gps_source || "none";

  if (validPhotoLocation) {
    return {
      skor_kredibilitas: "TINGGI",
      alasan_kredibilitas:
        gpsSource === "browser"
          ? "Foto tidak memiliki metadata GPS EXIF, tetapi foto diambil langsung dari kamera web dan GPS browser berada tidak lebih dari 10 meter dari titik laporan."
          : "Foto memiliki metadata GPS EXIF yang sesuai dengan titik laporan dengan jarak tidak lebih dari 10 meter.",
      valid_photo_location: true,
      osint_relevant: osintRelevant,
      batas_validasi_meter: BATAS_VALIDASI_FOTO_METER,
      selisih_jarak: distance,
      gps_source: gpsSource,
    };
  }

  if (osintRelevant) {
    return {
      skor_kredibilitas: "SEDANG",
      alasan_kredibilitas:
        "Metadata GPS foto tidak tersedia atau jaraknya melebihi 10 meter, tetapi terdapat OSINT relevan berdasarkan kecocokan keyword dan waktu.",
      valid_photo_location: false,
      osint_relevant: true,
      batas_validasi_meter: BATAS_VALIDASI_FOTO_METER,
      selisih_jarak: distance,
      gps_source: gpsSource,
    };
  }

  return {
    skor_kredibilitas: "RENDAH",
    alasan_kredibilitas:
      "Metadata GPS foto tidak tersedia atau jaraknya melebihi 10 meter, dan tidak terdapat OSINT relevan sebagai pendukung.",
    valid_photo_location: false,
    osint_relevant: false,
    batas_validasi_meter: BATAS_VALIDASI_FOTO_METER,
    selisih_jarak: distance,
    gps_source: gpsSource,
  };
}

module.exports = {
  BATAS_VALIDASI_FOTO_METER,
  calculateKredibilitas,
  isValidPhotoLocation,
  isOsintRelevant,
};
