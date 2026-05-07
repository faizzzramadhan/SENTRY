const fs = require("fs");
const exifr = require("exifr");
const geolib = require("geolib");

/**
 * Ambil koordinat dari EXIF foto.
 *
 * Catatan rule terbaru:
 * - Upload file biasa hanya memakai metadata EXIF.
 * - GPS browser hanya boleh dipakai sebagai fallback kalau foto benar-benar
 *   diambil langsung dari kamera web.
 * - Supaya tidak mengganggu pemanggilan lama, parameter kedua tetap ada,
 *   tetapi fallback browser hanya aktif jika browserGps.isCameraCapture === true
 *   atau browserGps.source === "WEB_CAMERA".
 */
async function extractExifLocation(filePath, browserGps = {}) {
  const browserLat =
    browserGps.latitude != null ? Number(browserGps.latitude) : null;

  const browserLng =
    browserGps.longitude != null ? Number(browserGps.longitude) : null;

  const hasBrowserGps =
    browserLat !== null &&
    browserLng !== null &&
    !Number.isNaN(browserLat) &&
    !Number.isNaN(browserLng);

  const allowBrowserFallback =
    browserGps.isCameraCapture === true ||
    browserGps.is_camera_capture === true ||
    browserGps.source === "WEB_CAMERA" ||
    browserGps.foto_kejadian_source === "WEB_CAMERA";

  try {
    console.log("========== DEBUG EXIF ==========");
    console.log("filePath:", filePath);
    console.log("browserGps:", browserGps);
    console.log("allowBrowserFallback:", allowBrowserFallback);

    const exists = fs.existsSync(filePath);

    if (!exists) {
      if (hasBrowserGps && allowBrowserFallback) {
        console.log("FILE TIDAK ADA DAN FOTO DARI WEB CAMERA -> pakai browser GPS");
        return {
          exif_latitude: null,
          exif_longitude: null,
          browser_latitude: browserLat,
          browser_longitude: browserLng,
          source: "browser",
        };
      }

      return {
        exif_latitude: null,
        exif_longitude: null,
        browser_latitude: null,
        browser_longitude: null,
        source: "none",
      };
    }

    const exif = await exifr.parse(filePath, {
      gps: true,
      mergeOutput: true,
    });

    console.log("HASIL EXIF:", exif);

    if (!exif || !exif.latitude || !exif.longitude) {
      console.log("EXIF TIDAK ADA GPS");

      if (hasBrowserGps && allowBrowserFallback) {
        console.log("FALLBACK WEB CAMERA -> browser GPS");

        return {
          exif_latitude: null,
          exif_longitude: null,
          browser_latitude: browserLat,
          browser_longitude: browserLng,
          source: "browser",
        };
      }

      return {
        exif_latitude: null,
        exif_longitude: null,
        browser_latitude: null,
        browser_longitude: null,
        source: "none",
      };
    }

    console.log("GPS DARI EXIF:", exif.latitude, exif.longitude);

    return {
      exif_latitude: Number(exif.latitude),
      exif_longitude: Number(exif.longitude),
      browser_latitude: null,
      browser_longitude: null,
      source: "exif",
    };
  } catch (error) {
    console.error("ERROR EXIF:", error);

    if (hasBrowserGps && allowBrowserFallback) {
      console.log("ERROR EXIF DAN FOTO DARI WEB CAMERA -> fallback browser GPS");

      return {
        exif_latitude: null,
        exif_longitude: null,
        browser_latitude: browserLat,
        browser_longitude: browserLng,
        source: "browser",
      };
    }

    return {
      exif_latitude: null,
      exif_longitude: null,
      browser_latitude: null,
      browser_longitude: null,
      source: "none",
    };
  }
}

/**
 * Hitung validasi lokasi foto terhadap titik laporan.
 * Batas default dibuat 10 meter sesuai rule kredibilitas terbaru.
 */
function hitungValidasiLokasi({
  laporanLatitude,
  laporanLongitude,
  exifLatitude,
  exifLongitude,
  batasMeter = 10,
}) {
  if (
    laporanLatitude == null ||
    laporanLongitude == null ||
    exifLatitude == null ||
    exifLongitude == null
  ) {
    return {
      selisih_jarak: null,
      is_valid_location: false,
    };
  }

  const laporanLat = Number(laporanLatitude);
  const laporanLng = Number(laporanLongitude);
  const exifLat = Number(exifLatitude);
  const exifLng = Number(exifLongitude);

  if (
    Number.isNaN(laporanLat) ||
    Number.isNaN(laporanLng) ||
    Number.isNaN(exifLat) ||
    Number.isNaN(exifLng)
  ) {
    return {
      selisih_jarak: null,
      is_valid_location: false,
    };
  }

  const jarakMeter = geolib.getDistance(
    { latitude: laporanLat, longitude: laporanLng },
    { latitude: exifLat, longitude: exifLng }
  );

  console.log("JARAK:", jarakMeter, "meter");

  return {
    selisih_jarak: Number(jarakMeter.toFixed(2)),
    is_valid_location: jarakMeter <= batasMeter,
  };
}

module.exports = {
  extractExifLocation,
  hitungValidasiLokasi,
};
