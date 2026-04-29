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
  dss_scoring,
  metadata_foto,
  humint_analysis_log,
  sequelize,
} = db;

const {
  extractExifLocation,
  hitungValidasiLokasi,
} = require("../../utils/exifFoto");

/*
  HUMINT SCORING
  Total maksimal: 100

  1. EXIF lokasi: 0 - 50
  2. Kelengkapan data: 0 - 25
  3. Dampak korban: 0 - 15
  4. Konsistensi laporan: 0 - 10
*/

function getThresholdByJenisId(jenisId) {
  const id = Number(jenisId);

  const map = {
    60001: [200, 500, 1500], // Banjir
    60002: [100, 300, 700], // Tanah Longsor
    60003: [200, 500, 1500], // Gelombang Pasang dan Abrasi
    60004: [300, 800, 2000], // Cuaca Ekstrem
    60005: [500, 1500, 3000], // Kekeringan
    60006: [200, 700, 2000], // Kebakaran Hutan dan Lahan
    60007: [500, 2000, 5000], // Gempabumi
    60008: [500, 2000, 5000], // Tsunami
    60009: [300, 1000, 3000], // Erupsi Gunung Api
  };

  return map[id] || [100, 300, 700];
}

function getKategoriValidasiExif(distanceMeter, jenisId) {
  if (
    distanceMeter === null ||
    distanceMeter === undefined ||
    Number.isNaN(Number(distanceMeter))
  ) {
    return {
      kategori: "METADATA GPS TIDAK TERSEDIA",
      skorExif: 0,
      isValidLocation: false,
      keterangan:
        "Foto tidak memiliki metadata GPS, sehingga validasi lokasi tidak dapat dilakukan secara otomatis.",
    };
  }

  const distance = Number(distanceMeter);
  const [sangatAkurat, akurat, cukup] = getThresholdByJenisId(jenisId);

  if (distance <= sangatAkurat) {
    return {
      kategori: "SANGAT AKURAT",
      skorExif: 50,
      isValidLocation: true,
      keterangan:
        "Lokasi foto sangat dekat dengan titik lokasi kejadian yang dilaporkan.",
    };
  }

  if (distance <= akurat) {
    return {
      kategori: "AKURAT",
      skorExif: 40,
      isValidLocation: true,
      keterangan:
        "Lokasi foto masih berada dalam area kejadian yang wajar berdasarkan jenis bencana.",
    };
  }

  if (distance <= cukup) {
    return {
      kategori: "CUKUP",
      skorExif: 25,
      isValidLocation: true,
      keterangan:
        "Lokasi foto masih dapat diterima, namun tidak terlalu dekat dengan titik laporan.",
    };
  }

  return {
    kategori: "PERLU PENGECEKAN",
    skorExif: 5,
    isValidLocation: false,
    keterangan:
      "Lokasi foto cukup jauh dari titik laporan, sehingga perlu dilakukan verifikasi manual oleh staff.",
  };
}

function hitungSkorKelengkapanData(body, fotoKejadian) {
  let skor = 0;
  const detail = [];

  if (body.nama_pelapor) {
    skor += 3;
    detail.push("Nama pelapor tersedia (+3)");
  }

  if (body.no_hp) {
    skor += 3;
    detail.push("Nomor HP tersedia (+3)");
  }

  if (body.alamat_pelapor) {
    skor += 3;
    detail.push("Alamat pelapor tersedia (+3)");
  }

  if (body.id_jenis) {
    skor += 3;
    detail.push("Jenis bencana tersedia (+3)");
  }

  if (body.id_kecamatan) {
    skor += 3;
    detail.push("Kecamatan tersedia (+3)");
  }

  if (body.id_kelurahan) {
    skor += 3;
    detail.push("Kelurahan tersedia (+3)");
  }

  if (body.kronologi) {
    skor += 4;
    detail.push("Kronologi tersedia (+4)");
  }

  if (body.latitude && body.longitude) {
    skor += 4;
    detail.push("Koordinat lokasi tersedia (+4)");
  }

  if (fotoKejadian) {
    skor += 2;
    detail.push("Foto kejadian tersedia (+2)");
  }

  return {
    skor: Math.min(skor, 25),
    detail,
  };
}

function hitungSkorDampak(korban) {
  const totalKorban = korban.reduce((total, item) => {
    return total + Number(item.jumlah || 0);
  }, 0);

  if (totalKorban >= 10) {
    return {
      skor: 15,
      totalKorban,
      kategori: "DAMPAK BESAR",
      alasan:
        "Jumlah korban 10 orang atau lebih menunjukkan dampak kejadian yang besar dan membutuhkan prioritas perhatian lebih tinggi.",
    };
  }

  if (totalKorban >= 5) {
    return {
      skor: 12,
      totalKorban,
      kategori: "DAMPAK SEDANG",
      alasan:
        "Jumlah korban 5 sampai 9 orang menunjukkan adanya dampak nyata dengan tingkat urgensi sedang.",
    };
  }

  if (totalKorban >= 1) {
    return {
      skor: 8,
      totalKorban,
      kategori: "DAMPAK RINGAN",
      alasan:
        "Adanya korban menunjukkan laporan memiliki dampak langsung meskipun dalam skala terbatas.",
    };
  }

  return {
    skor: 5,
    totalKorban,
    kategori: "TANPA KORBAN",
    alasan:
      "Tidak terdapat korban, namun laporan tetap dapat dianggap relevan karena bencana tidak selalu menimbulkan korban.",
  };
}

function hitungSkorKonsistensiLaporan(body, fotoKejadian) {
  let skor = 0;
  const detail = [];

  if (body.kronologi && String(body.kronologi).trim().length >= 20) {
    skor += 4;
    detail.push("Kronologi cukup jelas (+4)");
  }

  if (
    body.alamat_lengkap_kejadian &&
    String(body.alamat_lengkap_kejadian).trim().length >= 10
  ) {
    skor += 3;
    detail.push("Alamat kejadian cukup detail (+3)");
  }

  if (fotoKejadian) {
    skor += 3;
    detail.push("Foto kejadian tersedia sebagai bukti visual (+3)");
  }

  return {
    skor: Math.min(skor, 10),
    detail,
  };
}

function getSkorKredibilitasLabel(humintScore) {
  if (humintScore >= 70) return "TINGGI";
  return "RENDAH";
}

function getPrioritasByHumintScore(humintScore) {
  if (humintScore >= 70) return "PRIORITAS TINGGI";
  return "PRIORITAS RENDAH";
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
      const korban = JSON.parse(body.korban || "[]");

      const fotoKejadianFile = req.files?.foto_kejadian?.[0] || null;
      const fotoKejadian = fotoKejadianFile?.filename || null;

      const fotoKerusakan =
        req.files?.foto_kerusakan?.map((file) => file.filename).join(",") ||
        null;

      const now = new Date();
      const actor = body.created_by || "staff";

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

      const kelengkapanData = hitungSkorKelengkapanData(body, fotoKejadian);
      const dampakKorban = hitungSkorDampak(korban);
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
        sumber_validasi: "Metadata EXIF foto kejadian dan data laporan",
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

      const korbanRows = korban
        .filter((item) => Number(item.jumlah) > 0)
        .map((item) => ({
          laporan_id: laporanId,
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

      await verifikasi_staff.create(
        {
          laporan_id: laporanId,
          kerusakan_verifikasi: body.kerusakan_identifikasi || null,
          terdampak_verifikasi: body.terdampak_identifikasi || null,
          penyebab_verifikasi: body.penyebab_identifikasi || null,
          tindak_lanjut: body.tindak_lanjut || null,
          petugas_trc: body.petugas_trc || null,
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
          status_laporan: body.status_laporan || "IDENTIFIKASI",
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
        message: "Laporan admin berhasil ditambahkan",
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
        message: "Gagal menambahkan laporan admin",
        error: error.message,
      });
    }
  }
);

module.exports = router;