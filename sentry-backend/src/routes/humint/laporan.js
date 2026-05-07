const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const db = require("../../models");

const {
  laporan,
  identifikasi,
  analisis_sistem,
  detail_korban,
  metadata_foto,
  data_kecamatan,
  data_kelurahan,
  jenis_bencana,
  nama_bencana,
  sequelize,
} = db;

const {
  extractExifLocation,
  hitungValidasiLokasi,
} = require("../../utils/exifFoto");

const uploadDir = path.join(__dirname, "../../uploads");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, filename);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
  fileFilter: function (req, file, cb) {
    const allowedMime = ["image/jpeg", "image/jpg"];

    if (!allowedMime.includes(file.mimetype)) {
      return cb(new Error("File harus berupa foto JPG/JPEG asli dari kamera"));
    }

    cb(null, true);
  },
});

router.get("/data-kecamatan", async (req, res) => {
  try {
    const data = await data_kecamatan.findAll({
      order: [["nama_kecamatan", "ASC"]],
    });

    res.json({ data });
  } catch (error) {
    res.status(500).json({
      message: "Gagal mengambil data kecamatan",
      error: error.message,
    });
  }
});

router.get("/data-kelurahan", async (req, res) => {
  try {
    const kecamatanId = req.query.kecamatan_id || req.query.id_kecamatan;
    const where = kecamatanId ? { id_kecamatan: kecamatanId } : {};

    const data = await data_kelurahan.findAll({
      where,
      order: [["nama_kelurahan", "ASC"]],
    });

    res.json({ data });
  } catch (error) {
    res.status(500).json({
      message: "Gagal mengambil data kelurahan",
      error: error.message,
    });
  }
});

router.get("/jenis-bencana", async (req, res) => {
  try {
    const data = await jenis_bencana.findAll({
      order: [["nama_jenis", "ASC"]],
    });

    res.json({ data });
  } catch (error) {
    res.status(500).json({
      message: "Gagal mengambil jenis bencana",
      error: error.message,
    });
  }
});

router.get("/nama-bencana", async (req, res) => {
  try {
    const jenisId = req.query.jenis_id || req.query.id_jenis;
    const where = jenisId ? { jenis_id: jenisId } : {};

    const data = await nama_bencana.findAll({
      where,
      order: [["nama_bencana", "ASC"]],
    });

    res.json({ data });
  } catch (error) {
    res.status(500).json({
      message: "Gagal mengambil nama bencana",
      error: error.message,
    });
  }
});

router.post(
  "/create",
  upload.fields([
    { name: "foto_kejadian", maxCount: 1 },
    { name: "foto_kerusakan", maxCount: 2 },
  ]),
  async (req, res) => {
    const t = await sequelize.transaction();

    try {
      const body = req.body;
      const now = new Date();

      const actor =
        body.created_by ||
        body.last_updated_by ||
        body.nama_pelapor ||
        "staff";

      const fotoKejadianFile = req.files?.foto_kejadian?.[0] || null;
      const fotoKerusakanFiles = req.files?.foto_kerusakan || [];

      const fotoKejadianName = fotoKejadianFile
        ? fotoKejadianFile.filename
        : null;

      const fotoKerusakanName =
        fotoKerusakanFiles.length > 0
          ? fotoKerusakanFiles.map((file) => file.filename).join(",")
          : null;

      const laporanBaru = await laporan.create(
        {
          jenis_laporan: body.jenis_laporan || "ASSESSMENT",
          nama_pelapor: body.nama_pelapor || null,
          no_hp: body.no_hp || null,
          alamat_pelapor: body.alamat_pelapor || null,

          id_jenis: body.id_jenis || null,
          id_bencana: body.id_bencana || null,
          id_kecamatan: body.id_kecamatan || null,
          id_kelurahan: body.id_kelurahan || null,

          kronologi: body.kronologi || null,
          foto_kejadian: fotoKejadianName,
          foto_kerusakan: fotoKerusakanName,

          jenis_lokasi: body.jenis_lokasi || null,
          latitude: body.latitude || null,
          longitude: body.longitude || null,
          alamat_lengkap_kejadian: body.alamat_lengkap_kejadian || null,

          waktu_kejadian: body.waktu_kejadian || now,
          waktu_laporan: body.waktu_laporan || now,

          created_by: actor,
          creation_date: now,
          last_updated_by: actor,
          last_update_date: now,
        },
        { transaction: t }
      );

      await identifikasi.create(
        {
          id_laporan: laporanBaru.laporan_id,
          jenis_korban: body.jenis_korban || body.jenisKorban || "TIDAK_ADA",
          jumlah_korban_identifikasi:
            body.jumlah_korban_identifikasi || body.total_korban || 0,
          kerusakan_identifikasi: body.kerusakan_identifikasi || null,
          terdampak_identifikasi: body.terdampak_identifikasi || null,
          penyebab_identifikasi: body.penyebab_identifikasi || null,
          created_by: actor,
          creation_date: now,
          last_updated_by: actor,
          last_update_date: now,
        },
        { transaction: t }
      );

      await analisis_sistem.create(
        {
          id_laporan: laporanBaru.laporan_id,
          skor_kredibilitas: body.skor_kredibilitas || "RENDAH",
          prioritas: body.prioritas || "PRIORITAS RENDAH",
          prioritas_sistem: body.prioritas_sistem || body.prioritas || "PRIORITAS RENDAH",
          prioritas_manual: body.prioritas_manual || null,
          is_prioritas_manual: Boolean(body.is_prioritas_manual),
          alasan_prioritas_manual: body.alasan_prioritas_manual || null,
          status_laporan: body.status_laporan || "IDENTIFIKASI",
          created_by: actor,
          creation_date: now,
          last_updated_by: actor,
          last_update_date: now,
        },
        { transaction: t }
      );

      if (Array.isArray(body.detail_korban)) {
        const korbanRows = body.detail_korban
          .filter((item) => Number(item.jumlah) > 0)
          .map((item) => ({
            laporan_id: laporanBaru.laporan_id,
            jenis_korban: item.jenis_korban,
            jenis_kelamin: item.jenis_kelamin,
            kelompok_umur: item.kelompok_umur,
            jumlah: Number(item.jumlah),
            created_at: now,
            updated_at: now,
            created_by: actor,
            creation_date: now,
            last_updated_by: actor,
            last_update_date: now,
          }));

        if (korbanRows.length > 0) {
          await detail_korban.bulkCreate(korbanRows, { transaction: t });
        }
      }

      if (typeof body.detail_korban === "string") {
        try {
          const detailKorbanParsed = JSON.parse(body.detail_korban);

          if (Array.isArray(detailKorbanParsed)) {
            const korbanRows = detailKorbanParsed
              .filter((item) => Number(item.jumlah) > 0)
              .map((item) => ({
                laporan_id: laporanBaru.laporan_id,
                jenis_korban: item.jenis_korban,
                jenis_kelamin: item.jenis_kelamin,
                kelompok_umur: item.kelompok_umur,
                jumlah: Number(item.jumlah),
                created_at: now,
                updated_at: now,
                created_by: actor,
                creation_date: now,
                last_updated_by: actor,
                last_update_date: now,
              }));

            if (korbanRows.length > 0) {
              await detail_korban.bulkCreate(korbanRows, { transaction: t });
            }
          }
        } catch {
          console.log("detail_korban bukan JSON valid");
        }
      }

      let exifData = {
        exif_latitude: null,
        exif_longitude: null,
      };

      if (fotoKejadianFile) {
        exifData = await extractExifLocation(fotoKejadianFile.path);
      }

      const validasi = hitungValidasiLokasi({
        laporanLatitude: body.latitude,
        laporanLongitude: body.longitude,
        exifLatitude: exifData.exif_latitude,
        exifLongitude: exifData.exif_longitude,
        batasMeter: 10,
      });

      await metadata_foto.create(
        {
          laporan_id: laporanBaru.laporan_id,
          exif_latitude: exifData.exif_latitude,
          exif_longitude: exifData.exif_longitude,
          selisih_jarak: validasi.selisih_jarak,
          is_valid_location: validasi.is_valid_location,
          created_by: actor,
        },
        { transaction: t }
      );

      await t.commit();

      return res.status(201).json({
        message: "Laporan berhasil dibuat",
        laporan_id: laporanBaru.laporan_id,
        foto_kejadian: fotoKejadianName,
        foto_kerusakan: fotoKerusakanName,
        metadata_foto: {
          exif_latitude: exifData.exif_latitude,
          exif_longitude: exifData.exif_longitude,
          selisih_jarak: validasi.selisih_jarak,
          is_valid_location: validasi.is_valid_location,
        },
      });
    } catch (error) {
      await t.rollback();

      console.error("Gagal membuat laporan:", error);

      return res.status(500).json({
        message: "Gagal membuat laporan",
        error: error.message,
      });
    }
  }
);

router.get("/list", async (req, res) => {
  try {
    const data = await laporan.findAll({
      limit: 100,
      order: [["creation_date", "DESC"]],
      include: [
        {
          model: jenis_bencana,
          as: "jenis_bencana",
          attributes: ["nama_jenis"],
        },
        {
          model: analisis_sistem,
          attributes: ["status_laporan", "prioritas"],
        },
      ],
    });

    const result = data.map((item, index) => ({
      no: index + 1,
      laporan_id: item.laporan_id,
      nama_pelapor: item.nama_pelapor || "-",
      jenis_bencana: item.jenis_bencana?.nama_jenis || "-",
      lokasi:
        item.latitude && item.longitude
          ? `${item.latitude}, ${item.longitude}`
          : item.alamat_lengkap_kejadian || "-",
      prioritas: item.analisis_sistem?.prioritas || "PRIORITAS RENDAH",
      status: item.analisis_sistem?.status_laporan || "IDENTIFIKASI",
    }));

    res.json({ data: result });
  } catch (error) {
    res.status(500).json({
      message: "Gagal mengambil data HUMINT",
      error: error.message,
    });
  }
});

router.get("/dashboard", async (req, res) => {
  try {
    const statusDalamPenanganan = [
      "PENANGANAN",
      "DITANGANI",
      "ASSESSMENT",
      "TINDAK_LANJUT",
      "SELESAI",
    ];

    const statusButuhVerifikasi = [
      "IDENTIFIKASI",
      "VERIFIKASI",
      "MENUNGGU_VERIFIKASI",
      "TERVERIFIKASI",
    ];

    const laporanTerbaru = await sequelize.query(
      `
      SELECT
        l.laporan_id,
        l.nama_pelapor,
        l.latitude,
        l.longitude,
        l.alamat_lengkap_kejadian,
        l.waktu_kejadian,
        l.creation_date,
        l.waktu_laporan,
        jb.nama_jenis,
        nb.nama_bencana,
        a.status_laporan,
        a.prioritas
      FROM laporan l
      LEFT JOIN jenis_bencana jb ON jb.jenis_id = l.id_jenis
      LEFT JOIN nama_bencana nb ON nb.bencana_id = l.id_bencana
      LEFT JOIN analisis_sistem a ON a.id_laporan = l.laporan_id
      ORDER BY l.laporan_id DESC
      LIMIT 10
      `,
      {
        type: sequelize.QueryTypes.SELECT,
      }
    );

    const laporanBulanIniRows = await sequelize.query(
      `
      SELECT
        l.laporan_id,
        l.creation_date,
        l.waktu_laporan,
        l.waktu_kejadian,
        a.status_laporan,
        a.prioritas
      FROM laporan l
      LEFT JOIN analisis_sistem a ON a.id_laporan = l.laporan_id
      WHERE
        COALESCE(l.waktu_laporan, l.creation_date, l.waktu_kejadian) >= DATE_FORMAT(CURDATE(), '%Y-%m-01')
        AND COALESCE(l.waktu_laporan, l.creation_date, l.waktu_kejadian) < DATE_ADD(DATE_FORMAT(CURDATE(), '%Y-%m-01'), INTERVAL 1 MONTH)
      ORDER BY l.laporan_id ASC
      `,
      {
        type: sequelize.QueryTypes.SELECT,
      }
    );

    const semuaLaporan = await sequelize.query(
      `
      SELECT
        l.laporan_id,
        a.status_laporan,
        a.prioritas
      FROM laporan l
      LEFT JOIN analisis_sistem a ON a.id_laporan = l.laporan_id
      ORDER BY l.laporan_id ASC
      `,
      {
        type: sequelize.QueryTypes.SELECT,
      }
    );

    const osintSourceRows = await sequelize.query(
      `
      SELECT
        UPPER(COALESCE(osint_source, 'LAINNYA')) AS source,
        COUNT(*) AS total
      FROM osint_data
      WHERE
        COALESCE(osint_created_at, creation_date, last_update_date) >= DATE_FORMAT(CURDATE(), '%Y-%m-01')
        AND COALESCE(osint_created_at, creation_date, last_update_date) < DATE_ADD(DATE_FORMAT(CURDATE(), '%Y-%m-01'), INTERVAL 1 MONTH)
      GROUP BY UPPER(COALESCE(osint_source, 'LAINNYA'))
      `,
      {
        type: sequelize.QueryTypes.SELECT,
      }
    ).catch((error) => {
      console.error("Gagal mengambil sumber data OSINT:", error.message);
      return [];
    });

    const laporanBulanIni = laporanBulanIniRows.length;

    const laporanDalamPenanganan = semuaLaporan.filter((item) =>
      statusDalamPenanganan.includes(item.status_laporan || "")
    ).length;

    const laporanButuhVerifikasi = semuaLaporan.filter((item) =>
      statusButuhVerifikasi.includes(item.status_laporan || "")
    ).length;

    const trend = [
      { name: "Minggu 1", baru: 0, ditangani: 0 },
      { name: "Minggu 2", baru: 0, ditangani: 0 },
      { name: "Minggu 3", baru: 0, ditangani: 0 },
      { name: "Minggu 4", baru: 0, ditangani: 0 },
    ];

    laporanBulanIniRows.forEach((item) => {
      const tanggal =
        item.waktu_laporan || item.creation_date || item.waktu_kejadian;

      if (!tanggal) {
        trend[0].baru += 1;
        return;
      }

      const day = new Date(tanggal).getDate();

      let weekIndex = 0;

      if (day >= 1 && day <= 7) {
        weekIndex = 0;
      } else if (day >= 8 && day <= 14) {
        weekIndex = 1;
      } else if (day >= 15 && day <= 21) {
        weekIndex = 2;
      } else {
        weekIndex = 3;
      }

      trend[weekIndex].baru += 1;

      if (statusDalamPenanganan.includes(item.status_laporan || "")) {
        trend[weekIndex].ditangani += 1;
      }
    });

    const sourceLabelMap = {
      INSTAGRAM: "Instagram",
      IG: "Instagram",
      X: "X",
      TWITTER: "X",
      BMKG: "BMKG",
      TIKTOK: "TikTok",
      HUMINT: "HUMINT",
      LAINNYA: "Lainnya",
    };

    const sourceAccumulator = {
      Instagram: 0,
      X: 0,
      BMKG: 0,
      TikTok: 0,
      HUMINT: laporanBulanIni,
    };

    osintSourceRows.forEach((item) => {
      const sourceKey = String(item.source || "LAINNYA").trim().toUpperCase();
      const label = sourceLabelMap[sourceKey] || sourceKey;
      const total = Number(item.total || 0);

      sourceAccumulator[label] = (sourceAccumulator[label] || 0) + total;
    });

    const sumber_data = Object.entries(sourceAccumulator)
      .map(([label, value]) => ({
        label,
        value,
      }))
      .filter((item) => item.value > 0 || item.label === "HUMINT");

    const table = laporanTerbaru.map((item, index) => {
      const waktu = item.waktu_kejadian
        ? new Date(item.waktu_kejadian).toLocaleString("id-ID", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })
        : "-";

      return {
        no: index + 1,
        laporan_id: item.laporan_id,
        jenis: item.nama_bencana || item.nama_jenis || "-",
        lokasi:
          item.latitude && item.longitude
            ? `${item.latitude}, ${item.longitude}`
            : item.alamat_lengkap_kejadian || "-",
        waktu,
        status: item.status_laporan || "IDENTIFIKASI",
        prioritas: item.prioritas || "PRIORITAS RENDAH",
      };
    });

    return res.json({
      data: {
        kpi: {
          laporan_bulan_ini: laporanBulanIni,
          laporan_dalam_penanganan: laporanDalamPenanganan,
          laporan_butuh_verifikasi: laporanButuhVerifikasi,
        },
        trend,
        sumber_data,
        table,
      },
    });
  } catch (error) {
    console.error("Gagal mengambil data dashboard:", error);

    return res.status(500).json({
      message: "Gagal mengambil data dashboard",
      error: error.message,
    });
  }
});

router.get("/home-stats", async (req, res) => {
  try {
    const totalLaporanResult = await sequelize.query(
      `
      SELECT COUNT(*) AS total
      FROM laporan
      `,
      {
        type: sequelize.QueryTypes.SELECT,
      }
    );

    const totalKorbanResult = await sequelize.query(
      `
      SELECT COALESCE(SUM(jumlah), 0) AS total
      FROM detail_korban
      `,
      {
        type: sequelize.QueryTypes.SELECT,
      }
    );

    const totalKejadianResult = await sequelize.query(
      `
      SELECT COUNT(*) AS total
      FROM laporan
      `,
      {
        type: sequelize.QueryTypes.SELECT,
      }
    );

    const lastUpdateResult = await sequelize.query(
      `
      SELECT MAX(COALESCE(last_update_date, creation_date, waktu_laporan)) AS last_update
      FROM laporan
      `,
      {
        type: sequelize.QueryTypes.SELECT,
      }
    );

    return res.json({
      message: "Statistik halaman utama berhasil diambil",
      data: {
        total_laporan_masuk: Number(totalLaporanResult[0]?.total || 0),
        total_korban: Number(totalKorbanResult[0]?.total || 0),
        total_kejadian: Number(totalKejadianResult[0]?.total || 0),
        last_update: lastUpdateResult[0]?.last_update || null,
      },
    });
  } catch (error) {
    console.error("Gagal mengambil statistik halaman utama:", error);

    return res.status(500).json({
      message: "Gagal mengambil statistik halaman utama",
      error: error.message,
    });
  }
});

module.exports = router;