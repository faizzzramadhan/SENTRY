const express = require("express");
const router = express.Router();
const db = require("../../models");

const { sequelize, detail_korban } = db;

const { recalculateHumintById } = require("../../utils/recalculateHumint");

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

function sumTotalKorban(korbanRows) {
  if (!Array.isArray(korbanRows)) return 0;

  return korbanRows.reduce((total, item) => {
    const plain = typeof item.get === "function" ? item.get({ plain: true }) : item;
    return total + Number(plain?.jumlah || 0);
  }, 0);
}

async function getTableColumns(tableName) {
  try {
    const rows = await sequelize.query(`SHOW COLUMNS FROM ${tableName}`, {
      type: sequelize.QueryTypes.SELECT,
    });

    return rows.map((row) => row.Field);
  } catch (error) {
    console.error(`Gagal membaca struktur tabel ${tableName}:`, error.message);
    return [];
  }
}

async function getOsintJoinConfig() {
  const referenceColumns = await getTableColumns("osint_reference");
  const dataColumns = await getTableColumns("osint_data");

  const osintReferenceFk =
    ["osint_id", "osint_data_id", "reference_id", "data_osint_id"].find((columnName) =>
      referenceColumns.includes(columnName)
    ) || null;

  const osintDataPk =
    ["osint_id", "osint_data_id", "id"].find((columnName) =>
      dataColumns.includes(columnName)
    ) || "osint_id";

  const hasOsintDataTable = dataColumns.length > 0;
  const hasOsintSource = dataColumns.includes("osint_source");
  const hasOsintContent = dataColumns.includes("osint_content");

  return {
    osintReferenceFk,
    osintDataPk,
    hasOsintDataTable,
    osintDataJoin:
      osintReferenceFk && hasOsintDataTable
        ? `LEFT JOIN osint_data od ON od.${osintDataPk} = osr.${osintReferenceFk}`
        : "",
    osintDataSelect: `
        ${osintReferenceFk ? `osr.${osintReferenceFk} AS osint_data_reference_id,` : "NULL AS osint_data_reference_id,"}
        ${hasOsintSource ? "od.osint_source AS osint_source," : "NULL AS osint_source,"}
        ${hasOsintContent ? "od.osint_content AS osint_content," : "NULL AS osint_content,"}
        ${hasOsintDataTable && osintReferenceFk ? `od.${osintDataPk} AS osint_data_id` : "NULL AS osint_data_id"}
    `,
  };
}

function buildOsintReferenceObject(item) {
  const hasReference = Boolean(
    item.osint_area_text ||
      item.verified_at ||
      item.osint_source ||
      item.osint_content
  );

  if (!hasReference) return null;

  return {
    osint_area_text: item.osint_area_text || null,
    verified_at: item.verified_at || null,
    osint_source: item.osint_source || null,
    osint_content: item.osint_content || null,
    osint_data_id: item.osint_data_id || item.osint_data_reference_id || null,
  };
}

function buildGeointObject(item) {
  const tingkatResiko = item.tingkat_resiko || "TIDAK_RAWAN";
  const masukZonaRawan = Boolean(item.resiko_id);

  return {
    resiko_id: item.resiko_id || null,
    jenis_id: item.resiko_jenis_id || item.id_jenis || null,
    kelurahan_id: item.resiko_kelurahan_id || item.id_kelurahan || null,
    tingkat_resiko: masukZonaRawan ? tingkatResiko : "TIDAK_RAWAN",
    is_zona_rawan: masukZonaRawan,
    status: masukZonaRawan ? "MASUK_ZONA_RAWAN" : "TIDAK_MASUK_ZONA_RAWAN",
    keterangan: masukZonaRawan
      ? `Titik laporan masuk zona rawan dengan tingkat risiko ${tingkatResiko}.`
      : "Titik laporan tidak memiliki data tingkat risiko pada tabel tingkat_resiko.",
  };
}

router.get("/detail/:id", async (req, res) => {
  try {
    const { id } = req.params;

    let hasilRecalculate = null;

    try {
      hasilRecalculate = await recalculateHumintById(id);
    } catch (recalculateError) {
      console.error(
        "Recalculate rule-based detail laporan gagal:",
        recalculateError.message
      );
    }

    const osintJoinConfig = await getOsintJoinConfig();

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

        i.jenis_korban,
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
        a.prioritas_sistem,
        a.prioritas_manual,
        a.is_prioritas_manual,
        a.alasan_prioritas_manual,
        a.status_laporan,
        a.last_updated_by AS analisis_last_updated_by,

        mf.exif_latitude,
        mf.exif_longitude,
        mf.browser_latitude,
        mf.browser_longitude,
        mf.gps_source,
        mf.selisih_jarak,
        mf.is_valid_location,

        tr.resiko_id,
        tr.jenis_id AS resiko_jenis_id,
        tr.kelurahan_id AS resiko_kelurahan_id,
        tr.tingkat_resiko,

        osr.osint_area_text,
        osr.verified_at,
        ${osintJoinConfig.osintDataSelect}

      FROM laporan l
      LEFT JOIN jenis_bencana jb ON jb.jenis_id = l.id_jenis
      LEFT JOIN nama_bencana nb ON nb.bencana_id = l.id_bencana
      LEFT JOIN data_kecamatan dk ON dk.kecamatan_id = l.id_kecamatan
      LEFT JOIN data_kelurahan dl ON dl.kelurahan_id = l.id_kelurahan
      LEFT JOIN identifikasi i ON i.id_laporan = l.laporan_id
      LEFT JOIN verifikasi_staff vs ON vs.laporan_id = l.laporan_id
      LEFT JOIN user u ON u.usr_id = vs.usr_id
      LEFT JOIN analisis_sistem a ON a.id_laporan = l.laporan_id
      LEFT JOIN metadata_foto mf ON mf.laporan_id = l.laporan_id
      LEFT JOIN tingkat_resiko tr
        ON tr.jenis_id = l.id_jenis
       AND tr.kelurahan_id = l.id_kelurahan
      LEFT JOIN osint_reference osr
        ON osr.laporan_id = l.laporan_id
      ${osintJoinConfig.osintDataJoin}
      WHERE l.laporan_id = :id
      ORDER BY osr.last_update_date DESC, osr.creation_date DESC
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

    const finalIsValidLocation = Boolean(
      finalDistance !== null &&
        finalDistance !== undefined &&
        !Number.isNaN(Number(finalDistance)) &&
        Number(finalDistance) <= 10
    );
    const kategoriValidasiFoto = finalIsValidLocation
      ? "VALID <= 10 METER"
      : "PERLU PENGECEKAN";
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

    const osint = buildOsintReferenceObject(item);
    const geoint = buildGeointObject(item);

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
          jenis_korban: item.jenis_korban,
          jumlah_korban_identifikasi: item.jumlah_korban_identifikasi,
          kerusakan_identifikasi: item.kerusakan_identifikasi,
          terdampak_identifikasi: item.terdampak_identifikasi,
          penyebab_identifikasi: item.penyebab_identifikasi,
          total_korban: sumTotalKorban(korbanFinal),
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
          prioritas_sistem:
            hasilRecalculate?.prioritas_sistem || item.prioritas_sistem || item.prioritas,
          prioritas_manual:
            hasilRecalculate?.prioritas_manual || item.prioritas_manual || null,
          is_prioritas_manual:
            hasilRecalculate?.is_prioritas_manual ?? Boolean(item.is_prioritas_manual),
          alasan_prioritas_manual:
            hasilRecalculate?.alasan_prioritas_manual || item.alasan_prioritas_manual || null,
          alasan_kredibilitas: hasilRecalculate?.alasan_kredibilitas || null,
          alasan_prioritas: hasilRecalculate?.alasan_prioritas || null,
          alasan_prioritas_sistem: hasilRecalculate?.alasan_prioritas_sistem || null,
          status_laporan: item.status_laporan,
          last_updated_by: item.analisis_last_updated_by,
        },

        rule_based: hasilRecalculate?.rule_based || null,

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
