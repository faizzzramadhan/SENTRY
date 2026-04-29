const express = require("express");
const multer = require("multer");
const path = require("path");

const router = express.Router();
const db = require("../../models");

const {
  laporan,
  identifikasi,
  analisis_sistem,
  dss_scoring,
  metadata_foto,
  humint_analysis_log,
  sequelize,
} = db;

const {
  extractExifLocation,
  hitungValidasiLokasi,
} = require("../../utils/exifFoto");

const {
  getKategoriValidasiExif,
  hitungSkorKelengkapanData,
  hitungSkorDampak,
  hitungSkorKonsistensiLaporan,
  getSkorKredibilitasLabel,
  getPrioritasByHumintScore,
} = require("../../utils/humintScoring");

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
          jenis_laporan: body.jenis_laporan || "NON_ASSESSMENT",
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
        batasMeter: 500,
      });

      const hasilExif = getKategoriValidasiExif(
        validasi.selisih_jarak,
        body.id_jenis
      );

      const korbanDummy = [];

      if (body.jenis_laporan === "ASSESSMENT") {
        korbanDummy.push({
          jumlah: Number(
            body.total_korban || body.jumlah_korban_identifikasi || 0
          ),
        });
      }

      const kelengkapanData = hitungSkorKelengkapanData(body, fotoKejadian);
      const dampakKorban = hitungSkorDampak(korbanDummy);
      const konsistensiLaporan = hitungSkorKonsistensiLaporan(
        body,
        fotoKejadian
      );

      const humintScore = Math.min(
        hasilExif.skorExif +
          kelengkapanData.skor +
          dampakKorban.skor +
          konsistensiLaporan.skor,
        100
      );

      const skorKredibilitas = getSkorKredibilitasLabel(humintScore);
      const prioritas = getPrioritasByHumintScore(humintScore);

      const parameterCek = {
        jenis_analisis: "HUMINT",
        mode: "USER_CREATE_REPORT",
        sumber_laporan: "MASYARAKAT",
        sumber_validasi: "Metadata EXIF foto kejadian dan data laporan",
        id_laporan: laporanId,
        id_jenis_bencana: Number(body.id_jenis),

        lokasi_laporan: {
          latitude: Number(body.latitude),
          longitude: Number(body.longitude),
          alamat_lengkap_kejadian: body.alamat_lengkap_kejadian,
        },

        lokasi_exif: {
          exif_latitude: exifData.exif_latitude,
          exif_longitude: exifData.exif_longitude,
          selisih_jarak_meter: validasi.selisih_jarak,
          kategori_validasi_exif: hasilExif.kategori,
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

        hasil_akhir: {
          skor_humint_total: humintScore,
          skor_kredibilitas: skorKredibilitas,
          prioritas,
        },
      };

      await metadata_foto.create(
        {
          laporan_id: laporanId,
          exif_latitude: exifData.exif_latitude,
          exif_longitude: exifData.exif_longitude,
          selisih_jarak: validasi.selisih_jarak,
          is_valid_location: hasilExif.isValidLocation,
          created_by: actor,
          creation_date: now,
          last_updated_by: actor,
          last_update_date: now,
        },
        { transaction: t }
      );

      await humint_analysis_log.create(
        {
          id_laporan: laporanId,
          parameter_cek: JSON.stringify(parameterCek),
          skor_hasil: humintScore,
          analyzed_at: now,
        },
        { transaction: t }
      );

      await identifikasi.create(
        {
          id_laporan: laporanId,
          jumlah_korban_identifikasi:
            body.jenis_laporan === "ASSESSMENT"
              ? Number(body.total_korban || body.jumlah_korban_identifikasi || 0)
              : 0,
          kerusakan_identifikasi:
            body.jenis_laporan === "ASSESSMENT"
              ? body.kerusakan_identifikasi || null
              : null,
          terdampak_identifikasi:
            body.jenis_laporan === "ASSESSMENT"
              ? body.terdampak_identifikasi || null
              : null,
          penyebab_identifikasi:
            body.jenis_laporan === "ASSESSMENT"
              ? body.penyebab_identifikasi || null
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
          prioritas,
          status_laporan: "IDENTIFIKASI",
          created_by: actor,
          creation_date: now,
          last_updated_by: actor,
          last_update_date: now,
        },
        { transaction: t }
      );

      await dss_scoring.create(
        {
          laporan_id: laporanId,
          humint_score: humintScore,
          osint_score: 0,
          spatial_score: 0,
          total_score: humintScore,
        },
        { transaction: t }
      );

      await t.commit();

      return res.status(201).json({
        message: "Laporan masyarakat berhasil dikirim",
        laporan_id: laporanId,
        metadata_foto: {
          exif_latitude: exifData.exif_latitude,
          exif_longitude: exifData.exif_longitude,
          selisih_jarak: validasi.selisih_jarak,
          kategori_validasi: hasilExif.kategori,
          is_valid_location: hasilExif.isValidLocation,
          keterangan: hasilExif.keterangan,
        },
        humint_analysis: {
          skor_exif: hasilExif.skorExif,
          skor_kelengkapan_data: kelengkapanData.skor,
          skor_dampak_korban: dampakKorban.skor,
          skor_konsistensi_laporan: konsistensiLaporan.skor,
          humint_score: humintScore,
          skor_kredibilitas: skorKredibilitas,
          prioritas,
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

module.exports = router;