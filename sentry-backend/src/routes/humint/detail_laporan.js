const express = require("express");
const router = express.Router();
const db = require("../../models");

const { sequelize, detail_korban } = db;

const { recalculateHumintById } = require("../../utils/recalculateHumint");
const {
  calculateDssResult,
  calculateTotalDssScore,
} = require("../../utils/dssScoring");
const { calculateOsintPlaceholder } = require("../../utils/osintScoring");
const { calculateGeointPlaceholder } = require("../../utils/geointScoring");

function isValidCoordinate(value) {
  if (value === undefined || value === null || value === "") return false;

  const numberValue = Number(String(value).trim().replace(/,/g, "."));

  return Number.isFinite(numberValue);
}

function toNumberCoordinate(value) {
  if (!isValidCoordinate(value)) return null;

  return Number(String(value).trim().replace(/,/g, "."));
}

function calculateDistanceMeter(lat1, lon1, lat2, lon2) {
  const latitude1 = toNumberCoordinate(lat1);
  const longitude1 = toNumberCoordinate(lon1);
  const latitude2 = toNumberCoordinate(lat2);
  const longitude2 = toNumberCoordinate(lon2);

  if (
    latitude1 === null ||
    longitude1 === null ||
    latitude2 === null ||
    longitude2 === null
  ) {
    return null;
  }

  const earthRadiusMeter = 6371000;
  const toRad = (degree) => (degree * Math.PI) / 180;

  const dLat = toRad(latitude2 - latitude1);
  const dLon = toRad(longitude2 - longitude1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(latitude1)) *
      Math.cos(toRad(latitude2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = earthRadiusMeter * c;

  return Number(distance.toFixed(2));
}

function formatDistanceText(distanceMeter) {
  if (
    distanceMeter === null ||
    distanceMeter === undefined ||
    Number.isNaN(Number(distanceMeter))
  ) {
    return null;
  }

  return `${Number(distanceMeter).toFixed(2)} meter`;
}

function getThresholdByJenisId(jenisId) {
  const id = Number(jenisId);

  const map = {
    60001: [200, 500, 1500],
    60002: [100, 300, 700],
    60003: [200, 500, 1500],
    60004: [300, 800, 2000],
    60005: [500, 1500, 3000],
    60006: [200, 700, 2000],
    60007: [500, 2000, 5000],
    60008: [500, 2000, 5000],
    60009: [300, 1000, 3000],
  };

  return map[id] || [100, 300, 700];
}

function getKategoriValidasiGpsByDistance(distanceMeter, jenisId) {
  const distance = Number(distanceMeter);

  if (!Number.isFinite(distance)) {
    return {
      kategori: "METADATA GPS TIDAK TERSEDIA",
      skorExif: 0,
      isValidLocation: false,
    };
  }

  const [sangatAkurat, akurat, cukup] = getThresholdByJenisId(jenisId);

  if (distance <= sangatAkurat) {
    return {
      kategori: "SANGAT AKURAT",
      skorExif: 50,
      isValidLocation: true,
    };
  }

  if (distance <= akurat) {
    return {
      kategori: "AKURAT",
      skorExif: 40,
      isValidLocation: true,
    };
  }

  if (distance <= cukup) {
    return {
      kategori: "CUKUP",
      skorExif: 25,
      isValidLocation: true,
    };
  }

  return {
    kategori: "PERLU PENGECEKAN",
    skorExif: 5,
    isValidLocation: false,
  };
}

function sumTotalKorban(korbanRows) {
  if (!Array.isArray(korbanRows)) return 0;

  return korbanRows.reduce((total, item) => {
    const plain = typeof item.get === "function" ? item.get({ plain: true }) : item;
    return total + Number(plain?.jumlah || 0);
  }, 0);
}

router.get("/detail/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const hasilRecalculate = await recalculateHumintById(id);

    const rows = await sequelize.query(
      `
      SELECT
        l.laporan_id,
        l.jenis_laporan,
        l.nama_pelapor,
        l.no_hp,
        l.alamat_pelapor,
        l.id_jenis,
        l.id_bencana,
        l.id_kecamatan,
        l.id_kelurahan,
        l.kronologi,
        l.foto_kejadian,
        l.foto_kerusakan,
        l.jenis_lokasi,
        l.latitude,
        l.longitude,
        l.alamat_lengkap_kejadian,
        l.waktu_kejadian,
        l.waktu_laporan,

        jb.nama_jenis,
        nb.nama_bencana,
        dk.nama_kecamatan,
        dl.nama_kelurahan,

        i.jumlah_korban_identifikasi,
        i.kerusakan_identifikasi,
        i.terdampak_identifikasi,
        i.penyebab_identifikasi,

        vs.kerusakan_verifikasi,
        vs.terdampak_verifikasi,
        vs.penyebab_verifikasi,
        vs.prakiraan_kerugian,
        vs.rekomendasi_tindak_lanjut,
        vs.tindak_lanjut,
        vs.petugas_trc,
        vs.last_updated_by AS verifikasi_last_updated_by,

        u.usr_nama_lengkap,

        a.skor_kredibilitas,
        a.prioritas,
        a.status_laporan,
        a.last_updated_by AS analisis_last_updated_by,

        d.humint_score,
        d.osint_score,
        d.spatial_score,
        d.total_score,

        mf.exif_latitude,
        mf.exif_longitude,
        mf.browser_latitude,
        mf.browser_longitude,
        mf.gps_source,
        mf.selisih_jarak,
        mf.is_valid_location,

        su.osint_reference_id,
        su.zona_rawan_id,
        su.last_analyzed_at

      FROM laporan l
      LEFT JOIN jenis_bencana jb ON jb.jenis_id = l.id_jenis
      LEFT JOIN nama_bencana nb ON nb.bencana_id = l.id_bencana
      LEFT JOIN data_kecamatan dk ON dk.kecamatan_id = l.id_kecamatan
      LEFT JOIN data_kelurahan dl ON dl.kelurahan_id = l.id_kelurahan
      LEFT JOIN identifikasi i ON i.id_laporan = l.laporan_id
      LEFT JOIN verifikasi_staff vs ON vs.laporan_id = l.laporan_id
      LEFT JOIN user u ON u.usr_id = vs.usr_id
      LEFT JOIN analisis_sistem a ON a.id_laporan = l.laporan_id
      LEFT JOIN dss_scoring d ON d.laporan_id = l.laporan_id
      LEFT JOIN metadata_foto mf ON mf.laporan_id = l.laporan_id
      LEFT JOIN status_update su ON su.id_laporan = l.laporan_id
      WHERE l.laporan_id = :id
      LIMIT 1
      `,
      {
        replacements: { id },
        type: sequelize.QueryTypes.SELECT,
      }
    );

    if (!rows.length) {
      return res.status(404).json({
        message: "Laporan tidak ditemukan",
      });
    }

    const item = rows[0];

    const korbanFinal = await detail_korban.findAll({
      where: { laporan_id: item.laporan_id },
      order: [
        ["jenis_korban", "ASC"],
        ["jenis_kelamin", "ASC"],
        ["kelompok_umur", "ASC"],
      ],
    });

    const adaExifGps =
      isValidCoordinate(item.exif_latitude) && isValidCoordinate(item.exif_longitude);
    const adaBrowserGps =
      isValidCoordinate(item.browser_latitude) && isValidCoordinate(item.browser_longitude);
    const gpsSource = adaExifGps
      ? "exif"
      : adaBrowserGps
      ? "browser"
      : item.gps_source || "none";

    const gpsLatitude = adaExifGps
      ? item.exif_latitude
      : adaBrowserGps
      ? item.browser_latitude
      : null;

    const gpsLongitude = adaExifGps
      ? item.exif_longitude
      : adaBrowserGps
      ? item.browser_longitude
      : null;

    const calculatedDistance = calculateDistanceMeter(
      item.latitude,
      item.longitude,
      gpsLatitude,
      gpsLongitude
    );

    const finalDistance =
      item.selisih_jarak !== null &&
      item.selisih_jarak !== undefined &&
      !Number.isNaN(Number(item.selisih_jarak))
        ? Number(Number(item.selisih_jarak).toFixed(2))
        : calculatedDistance;

    const hasilValidasiGps = getKategoriValidasiGpsByDistance(
      finalDistance,
      item.id_jenis
    );

    const finalIsValidLocation = hasilValidasiGps.isValidLocation;
    const kategoriValidasiFoto = hasilValidasiGps.kategori;
    const distanceText = formatDistanceText(finalDistance);

    let statusValidasiFoto = "METADATA GPS TIDAK TERSEDIA";
    let keteranganValidasiFoto =
      "Foto tidak memiliki metadata GPS EXIF dan GPS browser tidak tersedia sehingga diperlukan pengecekan manual oleh petugas.";

    if (gpsSource === "exif" && finalIsValidLocation) {
      statusValidasiFoto = kategoriValidasiFoto;
      keteranganValidasiFoto = distanceText
        ? `Foto memiliki metadata GPS EXIF dan lokasi foto sesuai dengan lokasi laporan. Selisih jarak: ${distanceText}.`
        : "Foto memiliki metadata GPS EXIF dan lokasi foto sesuai dengan lokasi laporan.";
    }

    if (gpsSource === "exif" && !finalIsValidLocation) {
      statusValidasiFoto = "PERLU PENGECEKAN";
      keteranganValidasiFoto =
        "Foto memiliki metadata GPS EXIF, namun lokasi yang diperoleh berbeda dengan lokasi laporan sehingga diperlukan pengecekan lebih lanjut oleh petugas.";
    }

    if (gpsSource === "browser" && finalIsValidLocation) {
      statusValidasiFoto = `FALLBACK GPS BROWSER - ${kategoriValidasiFoto}`;
      keteranganValidasiFoto = distanceText
        ? `Foto tidak memiliki metadata GPS EXIF. Sistem menggunakan GPS browser sebagai alternatif dan lokasi yang diperoleh sesuai dengan lokasi laporan. Selisih jarak: ${distanceText}.`
        : "Foto tidak memiliki metadata GPS EXIF. Sistem menggunakan GPS browser sebagai alternatif dan lokasi yang diperoleh sesuai dengan lokasi laporan.";
    }

    if (gpsSource === "browser" && !finalIsValidLocation) {
      statusValidasiFoto = "FALLBACK GPS BROWSER - PERLU PENGECEKAN";
      keteranganValidasiFoto =
        "Foto tidak memiliki metadata GPS EXIF. Sistem menggunakan GPS browser sebagai alternatif, namun lokasi yang diperoleh berbeda dengan lokasi laporan sehingga diperlukan pengecekan lebih lanjut oleh petugas.";
    }

    const osintScore = Number(item.osint_score || 0);
    const spatialScore = Number(item.spatial_score || 0);
    const humintScore = Number(item.humint_score || 0);
    const totalKorban = sumTotalKorban(korbanFinal);
    const totalScore = calculateTotalDssScore({
      humintScore,
      osintScore: osintScore > 0 ? osintScore : null,
      spatialScore: spatialScore > 0 ? spatialScore : null,
    });

    const dssResult = calculateDssResult({
      humintScore,
      osintScore,
      spatialScore,
      totalScore,
      totalKorban,
      skorExif: hasilValidasiGps.skorExif,
      gpsSource,
      jenisLaporan: item.jenis_laporan,
    });

    const osint = calculateOsintPlaceholder({
      laporanId: item.laporan_id,
      osintReferenceId: item.osint_reference_id,
      lastAnalyzedAt: item.last_analyzed_at,
    });

    osint.score = osintScore;
    osint.status = osintScore > 0 || item.osint_reference_id ? "TERSEDIA" : "BELUM_TERSEDIA";
    osint.status_label = osintScore > 0 || item.osint_reference_id
      ? "Data OSINT tersedia"
      : "Data OSINT belum tersedia";

    const geoint = calculateGeointPlaceholder({
      laporanId: item.laporan_id,
      zonaRawanId: item.zona_rawan_id,
      lastAnalyzedAt: item.last_analyzed_at,
    });

    geoint.score = spatialScore;
    geoint.status = spatialScore > 0 || item.zona_rawan_id ? "TERSEDIA" : "BELUM_TERSEDIA";
    geoint.status_label = spatialScore > 0 || item.zona_rawan_id
      ? "Data GEOINT tersedia"
      : "Data GEOINT belum tersedia";

    return res.json({
      message: "Detail laporan berhasil diambil",
      data: {
        laporan_id: item.laporan_id,
        jenis_laporan: item.jenis_laporan,
        nama_pelapor: item.nama_pelapor,
        no_hp: item.no_hp,
        alamat_pelapor: item.alamat_pelapor,
        jenis_bencana: item.nama_jenis,
        nama_bencana: item.nama_bencana,
        kecamatan: item.nama_kecamatan,
        kelurahan: item.nama_kelurahan,
        kronologi: item.kronologi,
        foto_kejadian: item.foto_kejadian,
        foto_kerusakan: item.foto_kerusakan,
        jenis_lokasi: item.jenis_lokasi,
        latitude: item.latitude,
        longitude: item.longitude,
        alamat_lengkap_kejadian: item.alamat_lengkap_kejadian,
        waktu_kejadian: item.waktu_kejadian,
        waktu_laporan: item.waktu_laporan,

        identifikasi: {
          jumlah_korban_identifikasi: item.jumlah_korban_identifikasi,
          kerusakan_identifikasi: item.kerusakan_identifikasi,
          terdampak_identifikasi: item.terdampak_identifikasi,
          penyebab_identifikasi: item.penyebab_identifikasi,
        },

        verifikasi: {
          kerusakan_verifikasi: item.kerusakan_verifikasi,
          terdampak_verifikasi: item.terdampak_verifikasi,
          penyebab_verifikasi: item.penyebab_verifikasi,
          prakiraan_kerugian: item.prakiraan_kerugian,
          rekomendasi_tindak_lanjut: item.rekomendasi_tindak_lanjut,
          tindak_lanjut: item.tindak_lanjut,
          petugas_trc: item.petugas_trc,
          petugas_nama: item.usr_nama_lengkap,
          last_updated_by: item.verifikasi_last_updated_by,
        },

        analisis: {
          skor_kredibilitas:
            hasilRecalculate?.skor_kredibilitas || item.skor_kredibilitas,
          prioritas: hasilRecalculate?.prioritas || item.prioritas,
          status_laporan: item.status_laporan,
          last_updated_by: item.analisis_last_updated_by,
        },

        dss: hasilRecalculate?.dss || dssResult,

        metadata_foto: {
          exif_latitude: item.exif_latitude,
          exif_longitude: item.exif_longitude,
          browser_latitude: item.browser_latitude,
          browser_longitude: item.browser_longitude,
          gps_source: gpsSource,
          selisih_jarak: finalDistance,
          is_valid_location: finalIsValidLocation,
          status_validasi: statusValidasiFoto,
          kategori_validasi: kategoriValidasiFoto,
          keterangan: keteranganValidasiFoto,
        },

        detail_korban: korbanFinal,
        osint,
        geoint,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Gagal mengambil detail laporan",
      error: error.message,
    });
  }
});

module.exports = router;
