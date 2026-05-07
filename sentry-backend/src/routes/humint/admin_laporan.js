const express = require("express");
const multer = require("multer");
const path = require("path");

const router = express.Router();
const db = require("../../models");

const {
  laporan,
  detail_korban,
  verifikasi_staff,
  analisis_sistem,
  metadata_foto,
  tingkat_resiko,
  sequelize,
} = db;

const {
  extractExifLocation,
  hitungValidasiLokasi,
} = require("../../utils/exifFoto");

const { calculateRuleBasedAnalysis } = require("../../utils/ruleBasedAnalysis");

function normalizeText(value) {
  if (value === undefined || value === null) return null;

  const text = String(value).trim();

  return text.length ? text : null;
}

function normalizeDecimal(value) {
  if (value === undefined || value === null || value === "") return null;

  const cleaned = String(value)
    .replace(/Rp/gi, "")
    .replace(/\s/g, "")
    .replace(/\./g, "")
    .replace(/,/g, ".");

  const number = Number(cleaned);

  if (Number.isNaN(number)) return null;

  return number.toFixed(2);
}

function normalizeInteger(value) {
  if (value === undefined || value === null || value === "") return null;

  const number = Number(value);

  if (!Number.isInteger(number)) return null;

  return number;
}

function normalizeCoordinate(value) {
  if (value === undefined || value === null || value === "") return null;

  const cleaned = String(value)
    .trim()
    .replace(/,/g, ".");

  if (!cleaned) return null;

  const number = Number(cleaned);

  if (Number.isNaN(number)) return null;

  return cleaned;
}

function getFirstCoordinate(body, keys) {
  for (const key of keys) {
    const value = normalizeCoordinate(body[key]);

    if (value !== null) {
      return value;
    }
  }

  return null;
}

function parseKorbanPayload(value) {
  if (!value) return [];

  if (Array.isArray(value)) return value;

  try {
    const parsed = JSON.parse(value);

    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
}

function normalizeJenisKorban(value) {
  if (!value) return "TIDAK_ADA";

  const text = String(value).trim().toUpperCase();

  if (text === "LUKA" || text === "SAKIT" || text === "LUKA/SAKIT") {
    return "LUKA_SAKIT";
  }

  if (text === "TIDAK ADA") return "TIDAK_ADA";

  return text;
}

function getValidasiFotoRuleBased(distanceMeter, gpsSource) {
  const distance = Number(distanceMeter);

  if (!Number.isFinite(distance)) {
    return {
      kategori: "METADATA GPS TIDAK TERSEDIA",
      isValidLocation: false,
      keterangan:
        "Foto tidak memiliki metadata GPS EXIF dan GPS browser tidak tersedia sehingga diperlukan pengecekan manual oleh petugas.",
    };
  }

  if (distance <= 10) {
    if (gpsSource === "browser") {
      return {
        kategori: "FALLBACK GPS BROWSER VALID <= 10 METER",
        isValidLocation: true,
        keterangan:
          `Foto tidak memiliki metadata GPS EXIF. Sistem menggunakan GPS browser sebagai fallback dan lokasi browser sesuai dengan titik laporan. Selisih jarak: ${distance.toFixed(2)} meter.`,
      };
    }

    return {
      kategori: "VALID <= 10 METER",
      isValidLocation: true,
      keterangan:
        `Foto memiliki metadata GPS EXIF dan lokasi foto sesuai dengan titik laporan. Selisih jarak: ${distance.toFixed(2)} meter.`,
    };
  }

  if (gpsSource === "browser") {
    return {
      kategori: "FALLBACK GPS BROWSER PERLU PENGECEKAN",
      isValidLocation: false,
      keterangan:
        `Foto tidak memiliki metadata GPS EXIF. Sistem menggunakan GPS browser sebagai fallback, namun lokasinya berjarak lebih dari 10 meter dari titik laporan. Selisih jarak: ${distance.toFixed(2)} meter.`,
    };
  }

  return {
    kategori: "PERLU PENGECEKAN",
    isValidLocation: false,
    keterangan:
      `Lokasi foto berjarak lebih dari 10 meter dari titik laporan sehingga diperlukan pengecekan lebih lanjut oleh petugas. Selisih jarak: ${distance.toFixed(2)} meter.`,
  };
}

function buildDetailKorbanForRule(korban = []) {
  return korban
    .filter((item) => Number(item?.jumlah || 0) > 0)
    .map((item) => ({
      jenis_korban: normalizeJenisKorban(item.jenis_korban),
      jumlah: Number(item.jumlah || 0),
    }));
}

function buildDetailKorbanRows(korban = [], laporanId, now, actor) {
  return korban
    .filter((item) => Number(item?.jumlah || 0) > 0)
    .map((item) => ({
      laporan_id: laporanId,
      jenis_korban: normalizeJenisKorban(item.jenis_korban),
      jenis_kelamin: normalizeText(item.jenis_kelamin) || "TIDAK_DIKETAHUI",
      kelompok_umur: normalizeText(item.kelompok_umur) || "TIDAK_DIKETAHUI",
      jumlah: Number(item.jumlah || 0),
      created_at: now,
      updated_at: now,
      created_by: actor,
      creation_date: now,
      last_updated_by: actor,
      last_update_date: now,
    }));
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueName + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
});

router.post(
  "/add-report",
  upload.fields([
    { name: "foto_kejadian", maxCount: 1 },
    { name: "foto_kerusakan", maxCount: 2 },
  ]),
  async (req, res) => {
    const t = await sequelize.transaction();

    try {
      const body = req.body;
      const korban = parseKorbanPayload(body.korban);

      const fotoKejadianFile = req.files?.foto_kejadian?.[0] || null;
      const fotoKejadian = fotoKejadianFile?.filename || null;

      const fotoKerusakan =
        req.files?.foto_kerusakan?.map((file) => file.filename).join(",") ||
        null;

      const now = new Date();

      const actor =
        normalizeText(body.staff_puskodal) ||
        normalizeText(body.last_updated_by) ||
        normalizeText(body.created_by) ||
        "staff";

      const usrId = normalizeInteger(body.usr_id);

      const browserLatitude = getFirstCoordinate(body, [
        "browser_latitude",
        "browserLatitude",
        "browser_gps_lat",
        "browserGpsLat",
        "browser_gps_latitude",
        "browserGpsLatitude",
        "gps_browser_lat",
        "gpsBrowserLat",
        "gps_browser_latitude",
        "gpsBrowserLatitude",
        "foto_browser_latitude",
        "fotoBrowserLatitude",
        "foto_gps_lat",
        "fotoGpsLat",
      ]);

      const browserLongitude = getFirstCoordinate(body, [
        "browser_longitude",
        "browserLongitude",
        "browser_gps_lng",
        "browserGpsLng",
        "browser_gps_longitude",
        "browserGpsLongitude",
        "gps_browser_lng",
        "gpsBrowserLng",
        "gps_browser_longitude",
        "gpsBrowserLongitude",
        "foto_browser_longitude",
        "fotoBrowserLongitude",
        "foto_gps_lng",
        "fotoGpsLng",
      ]);

      if (!fotoKejadian) {
        await t.rollback();

        return res.status(400).json({
          message: "Foto kejadian wajib diupload",
        });
      }

      if (
        !body.nama_pelapor ||
        !body.no_hp ||
        !body.alamat_pelapor ||
        !body.id_jenis ||
        !body.id_kecamatan ||
        !body.id_kelurahan ||
        !body.kronologi ||
        !body.jenis_lokasi ||
        !body.latitude ||
        !body.longitude ||
        !body.alamat_lengkap_kejadian ||
        !body.waktu_kejadian
      ) {
        await t.rollback();

        return res.status(400).json({
          message: "Data wajib belum lengkap",
        });
      }

      const newLaporan = await laporan.create(
        {
          jenis_laporan: "ASSESSMENT",
          nama_pelapor: body.nama_pelapor,
          no_hp: body.no_hp,
          alamat_pelapor: body.alamat_pelapor,
          id_jenis: body.id_jenis,
          id_bencana: body.id_bencana || null,
          id_kecamatan: body.id_kecamatan,
          id_kelurahan: body.id_kelurahan,
          kronologi: body.kronologi,
          foto_kejadian: fotoKejadian,
          foto_kerusakan: fotoKerusakan,
          jenis_lokasi: body.jenis_lokasi,
          latitude: body.latitude,
          longitude: body.longitude,
          alamat_lengkap_kejadian: body.alamat_lengkap_kejadian,
          waktu_kejadian: body.waktu_kejadian,
          waktu_laporan: now,
          created_by: actor,
          creation_date: now,
          last_updated_by: actor,
          last_update_date: now,
        },
        { transaction: t }
      );

      const laporanId = newLaporan.laporan_id;

      const tingkatResikoRow = tingkat_resiko
        ? await tingkat_resiko.findOne({
            where: {
              jenis_id: body.id_jenis,
              kelurahan_id: body.id_kelurahan,
            },
            transaction: t,
          })
        : null;

      const tingkatResikoPlain = tingkatResikoRow
        ? tingkatResikoRow.get({ plain: true })
        : null;

      let exifData = {
        exif_latitude: null,
        exif_longitude: null,
      };

      if (fotoKejadianFile) {
        exifData = await extractExifLocation(fotoKejadianFile.path);
      }

      const adaExifGps = Boolean(exifData.exif_latitude && exifData.exif_longitude);
      const adaBrowserGps = Boolean(browserLatitude && browserLongitude);
      const gpsSource = adaExifGps ? "exif" : adaBrowserGps ? "browser" : "none";

      const gpsValidasiLatitude = adaExifGps
        ? exifData.exif_latitude
        : adaBrowserGps
        ? browserLatitude
        : null;

      const gpsValidasiLongitude = adaExifGps
        ? exifData.exif_longitude
        : adaBrowserGps
        ? browserLongitude
        : null;

      const validasi = hitungValidasiLokasi({
        laporanLatitude: body.latitude,
        laporanLongitude: body.longitude,
        exifLatitude: gpsValidasiLatitude,
        exifLongitude: gpsValidasiLongitude,
        batasMeter: 10,
      });

      const hasilValidasiFoto = getValidasiFotoRuleBased(
        validasi.selisih_jarak,
        gpsSource
      );

      const detailKorbanForRule = buildDetailKorbanForRule(korban);

      const ruleAnalysis = calculateRuleBasedAnalysis({
        laporan: {
          jenis_lokasi: body.jenis_lokasi,
          waktu_laporan: now,
          waktu_kejadian: body.waktu_kejadian,
        },
        identifikasi: {
          jenis_korban: "TIDAK_ADA",
        },
        detailKorban: detailKorbanForRule,
        metadataFoto: {
          gps_source: gpsSource,
          selisih_jarak: validasi.selisih_jarak,
          is_valid_location: hasilValidasiFoto.isValidLocation,
        },
        tingkatResiko: tingkatResikoPlain,
        osintReference: null,
      });

      const skorKredibilitas = ruleAnalysis.skor_kredibilitas;
      const prioritasSistem = ruleAnalysis.prioritas;
      const prioritasFinal = prioritasSistem;

      await metadata_foto.create(
        {
          laporan_id: laporanId,
          exif_latitude: exifData.exif_latitude,
          exif_longitude: exifData.exif_longitude,
          browser_latitude: browserLatitude,
          browser_longitude: browserLongitude,
          gps_source: gpsSource,
          selisih_jarak: validasi.selisih_jarak,
          is_valid_location: hasilValidasiFoto.isValidLocation,
          created_by: actor,
          creation_date: now,
          last_updated_by: actor,
          last_update_date: now,
        },
        { transaction: t }
      );

      const korbanRows = buildDetailKorbanRows(korban, laporanId, now, actor);

      if (korbanRows.length > 0) {
        await detail_korban.bulkCreate(korbanRows, { transaction: t });
      }

      await verifikasi_staff.create(
        {
          laporan_id: laporanId,
          kerusakan_verifikasi: normalizeText(
            body.kerusakan_identifikasi || body.kerusakan_verifikasi
          ),
          terdampak_verifikasi: normalizeText(
            body.terdampak_identifikasi || body.terdampak_verifikasi
          ),
          penyebab_verifikasi: normalizeText(
            body.penyebab_identifikasi || body.penyebab_verifikasi
          ),
          prakiraan_kerugian: normalizeDecimal(body.prakiraan_kerugian),
          rekomendasi_tindak_lanjut: normalizeText(body.rekomendasi_tindak_lanjut),
          tindak_lanjut: normalizeText(body.tindak_lanjut),
          petugas_trc: normalizeText(body.petugas_trc),
          usr_id: usrId,
          created_by: actor,
          creation_date: now,
          last_updated_by: actor,
          last_update_date: now,
        },
        { transaction: t }
      );

      await analisis_sistem.create(
        {
          id_laporan: laporanId,
          skor_kredibilitas: skorKredibilitas,
          prioritas: prioritasFinal,
          prioritas_sistem: prioritasSistem,
          prioritas_manual: null,
          is_prioritas_manual: false,
          alasan_prioritas_manual: null,
          status_laporan: body.status_laporan || "IDENTIFIKASI",
          created_by: actor,
          creation_date: now,
          last_updated_by: actor,
          last_update_date: now,
        },
        { transaction: t }
      );

      await t.commit();

      return res.status(201).json({
        message: "Laporan admin berhasil ditambahkan",
        laporan_id: laporanId,
        staff_puskodal: actor,
        prakiraan_kerugian: normalizeDecimal(body.prakiraan_kerugian),
        metadata_foto: {
          exif_latitude: exifData.exif_latitude,
          exif_longitude: exifData.exif_longitude,
          browser_latitude: browserLatitude,
          browser_longitude: browserLongitude,
          gps_source: gpsSource,
          selisih_jarak: validasi.selisih_jarak,
          kategori_validasi: hasilValidasiFoto.kategori,
          is_valid_location: hasilValidasiFoto.isValidLocation,
          keterangan: hasilValidasiFoto.keterangan,
        },
        analisis_sistem: {
          skor_kredibilitas: skorKredibilitas,
          prioritas: prioritasFinal,
          prioritas_sistem: prioritasSistem,
          prioritas_manual: null,
          is_prioritas_manual: false,
          alasan_prioritas_manual: null,
          alasan_kredibilitas: ruleAnalysis.alasan_kredibilitas,
          alasan_prioritas: ruleAnalysis.alasan_prioritas,
          jenis_korban: ruleAnalysis.jenis_korban,
          jenis_lokasi: ruleAnalysis.jenis_lokasi,
          tingkat_resiko: ruleAnalysis.tingkat_resiko,
          is_zona_rawan: ruleAnalysis.is_zona_rawan,
        },
      });
    } catch (error) {
      await t.rollback();

      console.error(error);

      if (error.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({
          message: "Ukuran foto maksimal 10MB per file",
        });
      }

      return res.status(500).json({
        message: "Gagal menambahkan laporan admin",
        error: error.message,
      });
    }
  }
);

module.exports = router;
