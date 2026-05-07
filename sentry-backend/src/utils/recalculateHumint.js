"use strict";

const db = require("../models");

const {
  laporan,
  identifikasi,
  detail_korban,
  metadata_foto,
  analisis_sistem,
  tingkat_resiko,
  sequelize,
} = db;

const { calculateRuleBasedAnalysis } = require("./ruleBasedAnalysis");

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

function hasCoordinate(latitude, longitude) {
  return toNumberCoordinate(latitude) !== null && toNumberCoordinate(longitude) !== null;
}

function normalizeBooleanFlag(value) {
  if (value === true || value === 1) return true;
  if (value === false || value === 0 || value === null || value === undefined) return false;

  const text = String(value).trim().toLowerCase();

  return text === "1" || text === "true" || text === "ya" || text === "yes";
}

function getGpsSource(metadataPlain) {
  const adaExifGps = hasCoordinate(
    metadataPlain?.exif_latitude,
    metadataPlain?.exif_longitude
  );
  const adaBrowserGps = hasCoordinate(
    metadataPlain?.browser_latitude,
    metadataPlain?.browser_longitude
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

function getKategoriValidasiFoto(distanceMeter, gpsSource) {
  const distance = Number(distanceMeter);

  if (!Number.isFinite(distance)) {
    return {
      kategori: "METADATA GPS TIDAK TERSEDIA",
      is_valid_location: false,
      keterangan:
        "Foto tidak memiliki metadata GPS EXIF atau GPS fallback browser yang dapat dibandingkan dengan titik laporan.",
    };
  }

  if (distance <= 10) {
    return {
      kategori:
        gpsSource === "browser"
          ? "FALLBACK GPS BROWSER VALID <= 10 METER"
          : "EXIF VALID <= 10 METER",
      is_valid_location: true,
      keterangan:
        gpsSource === "browser"
          ? "Foto tidak memiliki metadata GPS EXIF, namun koordinat browser berada tidak lebih dari 10 meter dari titik laporan."
          : "Metadata GPS EXIF foto berada tidak lebih dari 10 meter dari titik laporan.",
    };
  }

  return {
    kategori: "PERLU PENGECEKAN",
    is_valid_location: false,
    keterangan:
      "Lokasi foto atau GPS fallback browser berjarak lebih dari 10 meter dari titik laporan sehingga kredibilitas HUMINT tidak dapat dikategorikan tinggi.",
  };
}

async function getTableColumns(tableName, transaction) {
  try {
    const rows = await sequelize.query(`SHOW COLUMNS FROM ${tableName}`, {
      type: sequelize.QueryTypes.SELECT,
      transaction,
    });

    return rows.map((row) => row.Field);
  } catch (error) {
    console.error(`Gagal membaca struktur tabel ${tableName}:`, error.message);
    return [];
  }
}

async function getLatestOsintReference(laporanId, transaction) {
  const referenceColumns = await getTableColumns("osint_reference", transaction);
  const dataColumns = await getTableColumns("osint_data", transaction);

  if (!referenceColumns.includes("laporan_id")) {
    return null;
  }

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

  const osintDataSelect = `
    ${osintReferenceFk ? `osr.${osintReferenceFk} AS osint_data_reference_id,` : "NULL AS osint_data_reference_id,"}
    ${hasOsintSource ? "od.osint_source AS osint_source," : "NULL AS osint_source,"}
    ${hasOsintContent ? "od.osint_content AS osint_content," : "NULL AS osint_content,"}
    ${hasOsintDataTable && osintReferenceFk ? `od.${osintDataPk} AS osint_data_id` : "NULL AS osint_data_id"}
  `;

  const osintDataJoin =
    osintReferenceFk && hasOsintDataTable
      ? `LEFT JOIN osint_data od ON od.${osintDataPk} = osr.${osintReferenceFk}`
      : "";

  const rows = await sequelize.query(
    `
    SELECT
      osr.osint_area_text,
      osr.verified_at,
      ${osintDataSelect}
    FROM osint_reference osr
    ${osintDataJoin}
    WHERE osr.laporan_id = :laporanId
    ORDER BY osr.last_update_date DESC, osr.creation_date DESC
    LIMIT 1
    `,
    {
      replacements: { laporanId },
      type: sequelize.QueryTypes.SELECT,
      transaction,
    }
  );

  return rows[0] || null;
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
      laporanPlain.last_updated_by || laporanPlain.created_by || "system-rule";

    const identifikasiRow = await identifikasi.findOne({
      where: { id_laporan: laporanId },
      transaction: t,
    });

    const identifikasiPlain = identifikasiRow
      ? identifikasiRow.get({ plain: true })
      : null;

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

    const hasilValidasiFoto = getKategoriValidasiFoto(selisihJarak, gpsSource);

    const tingkatResikoRow = await tingkat_resiko.findOne({
      where: {
        jenis_id: laporanPlain.id_jenis,
        kelurahan_id: laporanPlain.id_kelurahan,
      },
      transaction: t,
    });

    const tingkatResikoPlain = tingkatResikoRow
      ? tingkatResikoRow.get({ plain: true })
      : null;

    const osintReferencePlain = await getLatestOsintReference(laporanId, t);

    const metadataForRule = {
      ...(metadataPlain || {}),
      gps_source: gpsSource,
      selisih_jarak: selisihJarak,
      is_valid_location: hasilValidasiFoto.is_valid_location,
    };

    const ruleAnalysis = calculateRuleBasedAnalysis({
      laporan: laporanPlain,
      identifikasi: identifikasiPlain,
      detailKorban: korban,
      metadataFoto: metadataForRule,
      tingkatResiko: tingkatResikoPlain,
      osintReference: osintReferencePlain,
    });

    const existingAnalisis = await analisis_sistem.findOne({
      where: { id_laporan: laporanId },
      transaction: t,
    });

    const existingAnalisisPlain = existingAnalisis
      ? existingAnalisis.get({ plain: true })
      : null;

    const isPrioritasManual = normalizeBooleanFlag(
      existingAnalisisPlain?.is_prioritas_manual
    );
    const prioritasManual = isPrioritasManual
      ? existingAnalisisPlain?.prioritas_manual || null
      : null;
    const alasanPrioritasManual = isPrioritasManual
      ? existingAnalisisPlain?.alasan_prioritas_manual || null
      : null;
    const prioritasSistem = ruleAnalysis.prioritas;
    const prioritasFinal =
      isPrioritasManual && prioritasManual ? prioritasManual : prioritasSistem;
    const alasanPrioritasFinal =
      isPrioritasManual && prioritasManual
        ? alasanPrioritasManual ||
          "Prioritas akhir diubah manual oleh staff berdasarkan pertimbangan lapangan."
        : ruleAnalysis.alasan_prioritas;

    if (metadata) {
      await metadata_foto.update(
        {
          gps_source: gpsSource,
          selisih_jarak: selisihJarak,
          is_valid_location: hasilValidasiFoto.is_valid_location,
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

    if (existingAnalisis) {
      await analisis_sistem.update(
        {
          skor_kredibilitas: ruleAnalysis.skor_kredibilitas,
          prioritas: prioritasFinal,
          prioritas_sistem: prioritasSistem,
          prioritas_manual: isPrioritasManual ? prioritasManual : null,
          is_prioritas_manual: isPrioritasManual,
          alasan_prioritas_manual: isPrioritasManual ? alasanPrioritasManual : null,
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
          skor_kredibilitas: ruleAnalysis.skor_kredibilitas,
          prioritas: prioritasFinal,
          prioritas_sistem: prioritasSistem,
          prioritas_manual: null,
          is_prioritas_manual: false,
          alasan_prioritas_manual: null,
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
      kategori_validasi: hasilValidasiFoto.kategori,
      is_valid_location: hasilValidasiFoto.is_valid_location,
      skor_kredibilitas: ruleAnalysis.skor_kredibilitas,
      prioritas: prioritasFinal,
      prioritas_sistem: prioritasSistem,
      prioritas_manual: isPrioritasManual ? prioritasManual : null,
      is_prioritas_manual: isPrioritasManual,
      alasan_prioritas_manual: isPrioritasManual ? alasanPrioritasManual : null,
      alasan_kredibilitas: ruleAnalysis.alasan_kredibilitas,
      alasan_prioritas: alasanPrioritasFinal,
      alasan_prioritas_sistem: ruleAnalysis.alasan_prioritas,
      jenis_korban: ruleAnalysis.jenis_korban,
      jenis_lokasi: ruleAnalysis.jenis_lokasi,
      tingkat_resiko: ruleAnalysis.tingkat_resiko,
      is_zona_rawan: ruleAnalysis.is_zona_rawan,
      osint: osintReferencePlain,
      geoint: {
        resiko_id: tingkatResikoPlain?.resiko_id || null,
        tingkat_resiko: ruleAnalysis.tingkat_resiko,
        is_zona_rawan: ruleAnalysis.is_zona_rawan,
        keterangan: ruleAnalysis.is_zona_rawan
          ? `Titik laporan masuk zona rawan dengan tingkat risiko ${ruleAnalysis.tingkat_resiko}.`
          : "Titik laporan tidak memiliki data tingkat risiko pada tabel tingkat_resiko.",
      },
      rule_based: ruleAnalysis,
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
