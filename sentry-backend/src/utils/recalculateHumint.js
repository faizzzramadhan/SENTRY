"use strict";

const db = require("../models");

const {
  laporan,
  detail_korban,
  metadata_foto,
  humint_analysis_log,
  analisis_sistem,
  dss_scoring,
  status_update,
  sequelize,
} = db;

const {
  getKategoriValidasiExif,
  hitungSkorKelengkapanData,
  hitungSkorDampak,
  hitungSkorKonsistensiLaporan,
  getSkorKredibilitasLabel,
} = require("./humintScoring");

const {
  calculateDssResult,
  calculateTotalDssScore,
  getAnalisisPrioritasFromDss,
} = require("./dssScoring");

const { calculateOsintPlaceholder } = require("./osintScoring");
const { calculateGeointPlaceholder } = require("./geointScoring");

function toNumberCoordinate(value) {
  if (value === undefined || value === null || value === "") return null;

  const number = Number(String(value).trim().replace(/,/g, "."));

  if (!Number.isFinite(number)) return null;

  return number;
}

function calculateDistanceMeter(lat1, lon1, lat2, lon2) {
  const firstLat = toNumberCoordinate(lat1);
  const firstLon = toNumberCoordinate(lon1);
  const secondLat = toNumberCoordinate(lat2);
  const secondLon = toNumberCoordinate(lon2);

  if (
    firstLat === null ||
    firstLon === null ||
    secondLat === null ||
    secondLon === null
  ) {
    return null;
  }

  const earthRadiusMeter = 6371000;
  const toRad = (degree) => (degree * Math.PI) / 180;

  const dLat = toRad(secondLat - firstLat);
  const dLon = toRad(secondLon - firstLon);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(firstLat)) *
      Math.cos(toRad(secondLat)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Number((earthRadiusMeter * c).toFixed(2));
}

function getGpsSource(metadataPlain) {
  const adaExifGps = Boolean(
    metadataPlain?.exif_latitude && metadataPlain?.exif_longitude
  );
  const adaBrowserGps = Boolean(
    metadataPlain?.browser_latitude && metadataPlain?.browser_longitude
  );

  if (adaExifGps) return "exif";
  if (adaBrowserGps) return "browser";

  return metadataPlain?.gps_source || "none";
}

function getGpsCoordinate(metadataPlain, gpsSource) {
  if (gpsSource === "exif") {
    return {
      latitude: metadataPlain?.exif_latitude || null,
      longitude: metadataPlain?.exif_longitude || null,
    };
  }

  if (gpsSource === "browser") {
    return {
      latitude: metadataPlain?.browser_latitude || null,
      longitude: metadataPlain?.browser_longitude || null,
    };
  }

  return {
    latitude: null,
    longitude: null,
  };
}

async function recalculateHumintById(laporanId) {
  const t = await sequelize.transaction();
  let transactionFinished = false;

  try {
    const dataLaporan = await laporan.findOne({
      where: { laporan_id: laporanId },
      transaction: t,
    });

    if (!dataLaporan) {
      await t.rollback();
      transactionFinished = true;
      return null;
    }

    const laporanPlain = dataLaporan.get({ plain: true });
    const now = new Date();
    const actor =
      laporanPlain.last_updated_by || laporanPlain.created_by || "system-dss";

    const korbanRows = await detail_korban.findAll({
      where: { laporan_id: laporanId },
      transaction: t,
    });

    const korban = korbanRows.map((item) => item.get({ plain: true }));

    const metadata = await metadata_foto.findOne({
      where: { laporan_id: laporanId },
      transaction: t,
    });

    const metadataPlain = metadata ? metadata.get({ plain: true }) : null;
    const gpsSource = getGpsSource(metadataPlain);
    const gpsCoordinate = getGpsCoordinate(metadataPlain, gpsSource);

    const selisihJarak = calculateDistanceMeter(
      laporanPlain.latitude,
      laporanPlain.longitude,
      gpsCoordinate.latitude,
      gpsCoordinate.longitude
    );

    const hasilExif = getKategoriValidasiExif(selisihJarak, laporanPlain.id_jenis);

    if (gpsSource === "browser") {
      hasilExif.kategori = `FALLBACK GPS BROWSER - ${hasilExif.kategori}`;
      hasilExif.keterangan = hasilExif.isValidLocation
        ? "Foto tidak memiliki metadata GPS EXIF. Sistem menggunakan GPS browser sebagai alternatif dan lokasi yang diperoleh sesuai dengan lokasi laporan."
        : "Foto tidak memiliki metadata GPS EXIF. Sistem menggunakan GPS browser sebagai alternatif, namun lokasi yang diperoleh berbeda dengan lokasi laporan sehingga diperlukan pengecekan lebih lanjut oleh petugas.";
    }

    if (gpsSource === "none") {
      hasilExif.keterangan =
        "Foto tidak memiliki metadata GPS EXIF dan GPS browser tidak tersedia sehingga diperlukan pengecekan manual oleh petugas.";
    }

    const kelengkapanData = hitungSkorKelengkapanData(
      laporanPlain,
      laporanPlain.foto_kejadian
    );
    const dampakKorban = hitungSkorDampak(korban);
    const konsistensiLaporan = hitungSkorKonsistensiLaporan(
      laporanPlain,
      laporanPlain.foto_kejadian
    );

    const humintScore = Math.min(
      hasilExif.skorExif +
        kelengkapanData.skor +
        dampakKorban.skor +
        konsistensiLaporan.skor,
      100
    );

    const skorKredibilitas = getSkorKredibilitasLabel(humintScore);

    const existingDss = await dss_scoring.findOne({
      where: { laporan_id: laporanId },
      transaction: t,
    });

    const statusUpdate = await status_update.findOne({
      where: { id_laporan: laporanId },
      transaction: t,
    });

    const statusUpdatePlain = statusUpdate ? statusUpdate.get({ plain: true }) : null;

    const osintPlaceholder = calculateOsintPlaceholder({
      laporanId,
      osintReferenceId: statusUpdatePlain?.osint_reference_id || null,
      lastAnalyzedAt: statusUpdatePlain?.last_analyzed_at || null,
    });

    const geointPlaceholder = calculateGeointPlaceholder({
      laporanId,
      zonaRawanId: statusUpdatePlain?.zona_rawan_id || null,
      lastAnalyzedAt: statusUpdatePlain?.last_analyzed_at || null,
    });

    const osintScore = Number(existingDss?.osint_score || osintPlaceholder.score || 0);
    const spatialScore = Number(existingDss?.spatial_score || geointPlaceholder.score || 0);

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
      totalKorban: dampakKorban.totalKorban,
      skorExif: hasilExif.skorExif,
      gpsSource,
      jenisLaporan: laporanPlain.jenis_laporan,
    });

    const prioritasAnalisis = getAnalisisPrioritasFromDss(dssResult);

    const parameterCek = {
      jenis_analisis: "HUMINT",
      mode: "RECALCULATE_HUMINT_DSS",
      id_laporan: Number(laporanId),
      jenis_laporan: laporanPlain.jenis_laporan,
      lokasi_laporan: {
        latitude: laporanPlain.latitude,
        longitude: laporanPlain.longitude,
        alamat_lengkap_kejadian: laporanPlain.alamat_lengkap_kejadian,
      },
      lokasi_foto: {
        gps_source: gpsSource,
        exif_latitude: metadataPlain?.exif_latitude || null,
        exif_longitude: metadataPlain?.exif_longitude || null,
        browser_latitude: metadataPlain?.browser_latitude || null,
        browser_longitude: metadataPlain?.browser_longitude || null,
        selisih_jarak_meter: selisihJarak,
        kategori_validasi: hasilExif.kategori,
        is_valid_location: hasilExif.isValidLocation,
        skor_exif: hasilExif.skorExif,
        keterangan: hasilExif.keterangan,
      },
      kelengkapan_data: {
        skor: kelengkapanData.skor,
        detail: kelengkapanData.detail,
      },
      dampak_korban: {
        skor: dampakKorban.skor,
        total_korban: dampakKorban.totalKorban,
        kategori: dampakKorban.kategori,
        alasan: dampakKorban.alasan,
      },
      konsistensi_laporan: {
        skor: konsistensiLaporan.skor,
        detail: konsistensiLaporan.detail,
      },
      osint: osintPlaceholder,
      geoint: geointPlaceholder,
      dss: dssResult,
    };

    if (metadata) {
      await metadata_foto.update(
        {
          gps_source: gpsSource,
          selisih_jarak: selisihJarak,
          is_valid_location: hasilExif.isValidLocation,
          last_updated_by: actor,
          last_update_date: now,
        },
        {
          where: { laporan_id: laporanId },
          transaction: t,
        }
      );
    } else {
      await metadata_foto.create(
        {
          laporan_id: laporanId,
          exif_latitude: null,
          exif_longitude: null,
          browser_latitude: null,
          browser_longitude: null,
          gps_source: "none",
          selisih_jarak: null,
          is_valid_location: false,
          created_by: actor,
          creation_date: now,
          last_updated_by: actor,
          last_update_date: now,
        },
        { transaction: t }
      );
    }

    await humint_analysis_log.create(
      {
        id_laporan: laporanId,
        parameter_cek: JSON.stringify(parameterCek),
        skor_hasil: humintScore,
        analyzed_at: now,
      },
      { transaction: t }
    );

    if (existingDss) {
      await dss_scoring.update(
        {
          humint_score: humintScore,
          osint_score: osintScore,
          spatial_score: spatialScore,
          total_score: totalScore,
        },
        {
          where: { laporan_id: laporanId },
          transaction: t,
        }
      );
    } else {
      await dss_scoring.create(
        {
          laporan_id: laporanId,
          humint_score: humintScore,
          osint_score: osintScore,
          spatial_score: spatialScore,
          total_score: totalScore,
        },
        { transaction: t }
      );
    }

    const existingAnalisis = await analisis_sistem.findOne({
      where: { id_laporan: laporanId },
      transaction: t,
    });

    if (existingAnalisis) {
      await analisis_sistem.update(
        {
          skor_kredibilitas: skorKredibilitas,
          prioritas: prioritasAnalisis,
          last_updated_by: actor,
          last_update_date: now,
        },
        {
          where: { id_laporan: laporanId },
          transaction: t,
        }
      );
    } else {
      await analisis_sistem.create(
        {
          id_laporan: laporanId,
          skor_kredibilitas: skorKredibilitas,
          prioritas: prioritasAnalisis,
          status_laporan: "IDENTIFIKASI",
          created_by: actor,
          creation_date: now,
          last_updated_by: actor,
          last_update_date: now,
        },
        { transaction: t }
      );
    }

    await t.commit();
    transactionFinished = true;

    return {
      laporan_id: Number(laporanId),
      jenis_laporan: laporanPlain.jenis_laporan,
      exif_latitude: metadataPlain?.exif_latitude || null,
      exif_longitude: metadataPlain?.exif_longitude || null,
      browser_latitude: metadataPlain?.browser_latitude || null,
      browser_longitude: metadataPlain?.browser_longitude || null,
      gps_source: gpsSource,
      selisih_jarak: selisihJarak,
      kategori_validasi: hasilExif.kategori,
      is_valid_location: hasilExif.isValidLocation,
      humint_score: humintScore,
      skor_kredibilitas: skorKredibilitas,
      prioritas: prioritasAnalisis,
      total_korban: dampakKorban.totalKorban,
      osint: osintPlaceholder,
      geoint: geointPlaceholder,
      dss: dssResult,
    };
  } catch (error) {
    if (!transactionFinished) {
      await t.rollback();
    }

    throw error;
  }
}

module.exports = {
  recalculateHumintById,
};
