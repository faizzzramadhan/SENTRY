const express = require("express");
const multer = require("multer");
const path = require("path");

const router = express.Router();
const db = require("../../models");

const {
  laporan,
  identifikasi,
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

function getSingleValue(value, fallback = null) {
  if (Array.isArray(value)) {
    const validValue = value.find((item) => {
      if (item === undefined || item === null) return false;
      return String(item).trim() !== "";
    });

    return validValue !== undefined && validValue !== null
      ? String(validValue).trim()
      : fallback;
  }

  if (value === undefined || value === null) {
    return fallback;
  }

  const text = String(value).trim();

  return text.length > 0 ? text : fallback;
}

function getFirstSingleValue(values, fallback = null) {
  if (!Array.isArray(values)) {
    return getSingleValue(values, fallback);
  }

  for (const value of values) {
    const singleValue = getSingleValue(value, null);

    if (
      singleValue !== null &&
      singleValue !== undefined &&
      String(singleValue).trim() !== ""
    ) {
      return String(singleValue).trim();
    }
  }

  return fallback;
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

function toNumberSafe(value, fallback = 0) {
  const singleValue = getSingleValue(value, fallback);
  const numberValue = Number(singleValue);

  return Number.isFinite(numberValue) ? numberValue : fallback;
}

function normalizeJenisKorban(value) {
  const rawValue = String(getSingleValue(value, "TIDAK_ADA"))
    .trim()
    .toUpperCase();

  if (rawValue === "LUKA" || rawValue === "SAKIT") {
    return "LUKA_SAKIT";
  }

  if (rawValue === "LUKA/SAKIT" || rawValue === "SAKIT/LUKA") {
    return "LUKA_SAKIT";
  }

  if (rawValue === "TIDAK ADA") return "TIDAK_ADA";

  const allowedValues = [
    "TIDAK_ADA",
    "TERDAMPAK",
    "MENINGGAL",
    "HILANG",
    "MENGUNGSI",
    "LUKA_SAKIT",
  ];

  return allowedValues.includes(rawValue) ? rawValue : "TIDAK_ADA";
}

function normalizeJenisLaporan(value) {
  const text = String(value || "NON_ASSESSMENT")
    .trim()
    .toUpperCase();

  if (text === "ASSESSMENT") return "ASSESSMENT";

  return "NON_ASSESSMENT";
}

function normalizeBoolean(value) {
  if (value === true || value === 1) return true;
  if (value === false || value === 0 || value === null || value === undefined) {
    return false;
  }

  const text = String(value).trim().toLowerCase();

  return text === "true" || text === "1" || text === "ya" || text === "yes";
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

function resolveJenisKorbanFromBody(body) {
  const jumlahKorbanInput = toNumberSafe(
    body.total_korban || body.jumlah_korban_identifikasi,
    0
  );

  const jenisKorbanInput = normalizeJenisKorban(
    getFirstSingleValue(
      [
        body.jenis_korban,
        body.jenisKorban,
        body.jenis_korban_identifikasi,
      ],
      jumlahKorbanInput > 0 ? "TERDAMPAK" : "TIDAK_ADA"
    )
  );

  return {
    jenis_korban: jenisKorbanInput,
    jumlah_korban_identifikasi:
      jenisKorbanInput === "TIDAK_ADA" ? 0 : jumlahKorbanInput,
  };
}

function buildDetailKorbanForRule(jenisKorban, jumlahKorban) {
  if (!jenisKorban || jenisKorban === "TIDAK_ADA" || Number(jumlahKorban) <= 0) {
    return [];
  }

  return [
    {
      jenis_korban: jenisKorban,
      jumlah: Number(jumlahKorban),
    },
  ];
}

function getFotoSource(body) {
  return String(
    body.foto_kejadian_source ||
      body.fotoKejadianSource ||
      body.camera_source ||
      body.cameraSource ||
      "FILE_UPLOAD"
  ).toUpperCase();
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
      const now = new Date();
      const actor = "MASYARAKAT";
      const jenisLaporan = normalizeJenisLaporan(body.jenis_laporan);

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

      const fotoKejadianFile = req.files?.foto_kejadian?.[0] || null;
      const fotoKejadian = fotoKejadianFile?.filename || null;

      const fotoKerusakan =
        req.files?.foto_kerusakan?.map((file) => file.filename).join(",") ||
        null;

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
          jenis_laporan: jenisLaporan,
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

      const fotoKejadianSource = getFotoSource(body);
      const isCameraCapture =
        fotoKejadianSource === "WEB_CAMERA" ||
        normalizeBoolean(body.is_camera_capture) ||
        normalizeBoolean(body.isCameraCapture);

      const adaExifGps = Boolean(exifData.exif_latitude && exifData.exif_longitude);
      const adaBrowserGps = isCameraCapture && Boolean(browserLatitude && browserLongitude);
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

      const identifikasiKorban = resolveJenisKorbanFromBody(body);
      const detailKorbanForRule = buildDetailKorbanForRule(
        identifikasiKorban.jenis_korban,
        identifikasiKorban.jumlah_korban_identifikasi
      );

      const ruleAnalysis = calculateRuleBasedAnalysis({
        laporan: {
          jenis_lokasi: body.jenis_lokasi,
          waktu_laporan: now,
          waktu_kejadian: body.waktu_kejadian,
        },
        identifikasi: {
          jenis_korban: identifikasiKorban.jenis_korban,
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

      await identifikasi.create(
        {
          id_laporan: laporanId,
          jenis_korban: identifikasiKorban.jenis_korban,
          jumlah_korban_identifikasi:
            jenisLaporan === "ASSESSMENT"
              ? identifikasiKorban.jumlah_korban_identifikasi
              : 0,
          kerusakan_identifikasi:
            jenisLaporan === "ASSESSMENT"
              ? getSingleValue(body.kerusakan_identifikasi, null)
              : null,
          terdampak_identifikasi:
            jenisLaporan === "ASSESSMENT"
              ? getSingleValue(body.terdampak_identifikasi, null)
              : null,
          penyebab_identifikasi:
            jenisLaporan === "ASSESSMENT"
              ? getSingleValue(body.penyebab_identifikasi, null)
              : null,
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
          status_laporan: "IDENTIFIKASI",
          created_by: actor,
          creation_date: now,
          last_updated_by: actor,
          last_update_date: now,
        },
        { transaction: t }
      );

      await t.commit();

      return res.status(201).json({
        message: "Laporan masyarakat berhasil dikirim",
        laporan_id: laporanId,
        nomor_laporan: `LAP-${String(laporanId).padStart(4, "0")}`,
        cek_status_url: `/cek-status?id=${laporanId}`,
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
        message: "Gagal mengirim laporan masyarakat",
        error: error.message,
      });
    }
  }
);

router.get("/status/:id", async (req, res) => {
  try {
    const rawId = String(req.params.id || "").trim();
    const laporanId = rawId.replace(/^LAP-/i, "").replace(/^0+/, "");

    if (!laporanId) {
      return res.status(400).json({
        message: "ID laporan tidak valid",
      });
    }

    const rows = await sequelize.query(
      `
      SELECT
        l.laporan_id,
        l.jenis_laporan,
        l.nama_pelapor,
        l.no_hp,
        l.alamat_pelapor,
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

        a.status_laporan,
        a.prioritas

      FROM laporan l
      LEFT JOIN jenis_bencana jb ON jb.jenis_id = l.id_jenis
      LEFT JOIN nama_bencana nb ON nb.bencana_id = l.id_bencana
      LEFT JOIN data_kecamatan dk ON dk.kecamatan_id = l.id_kecamatan
      LEFT JOIN data_kelurahan dl ON dl.kelurahan_id = l.id_kelurahan
      LEFT JOIN identifikasi i ON i.id_laporan = l.laporan_id
      LEFT JOIN analisis_sistem a ON a.id_laporan = l.laporan_id
      WHERE l.laporan_id = :laporanId
      LIMIT 1
      `,
      {
        replacements: { laporanId },
        type: sequelize.QueryTypes.SELECT,
      }
    );

    if (!rows.length) {
      return res.status(404).json({
        message: "Laporan tidak ditemukan",
      });
    }

    const item = rows[0];

    return res.json({
      message: "Status laporan berhasil diambil",
      data: {
        laporan_id: item.laporan_id,
        nomor_laporan: `LAP-${String(item.laporan_id).padStart(4, "0")}`,
        status_laporan: item.status_laporan || "IDENTIFIKASI",
        prioritas: item.prioritas || "PRIORITAS RENDAH",

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

        lampiran: {
          foto_kejadian: item.foto_kejadian,
          foto_kerusakan: item.foto_kerusakan,
        },

        identifikasi: {
          jenis_korban: item.jenis_korban,
          jumlah_korban_identifikasi: item.jumlah_korban_identifikasi,
          kerusakan_identifikasi: item.kerusakan_identifikasi,
          terdampak_identifikasi: item.terdampak_identifikasi,
          penyebab_identifikasi: item.penyebab_identifikasi,
        },
      },
    });
  } catch (error) {
    console.error("Gagal cek status laporan:", error);

    return res.status(500).json({
      message: "Gagal cek status laporan",
      error: error.message,
    });
  }
});

module.exports = router;
