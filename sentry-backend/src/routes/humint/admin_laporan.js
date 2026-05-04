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

const {
  calculateDssResult,
  calculateTotalDssScore,
  getAnalisisPrioritasFromDss,
} = require("../../utils/dssScoring");

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



function toNumberCoordinate(value) {
  if (value === undefined || value === null || value === "") return null;

  const number = Number(String(value).trim().replace(/,/g, "."));

  if (Number.isNaN(number)) return null;

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

function hitungValidasiLokasiAman({
  laporanLatitude,
  laporanLongitude,
  gpsLatitude,
  gpsLongitude,
  batasMeter = 500,
}) {
  const jarakFallback = calculateDistanceMeter(
    laporanLatitude,
    laporanLongitude,
    gpsLatitude,
    gpsLongitude
  );

  let validasi = {
    selisih_jarak: jarakFallback,
    is_valid_location:
      jarakFallback !== null ? jarakFallback <= Number(batasMeter) : false,
  };

  try {
    const validasiUtil = hitungValidasiLokasi({
      laporanLatitude,
      laporanLongitude,
      exifLatitude: gpsLatitude,
      exifLongitude: gpsLongitude,
      batasMeter,
    });

    if (
      validasiUtil &&
      validasiUtil.selisih_jarak !== null &&
      validasiUtil.selisih_jarak !== undefined &&
      !Number.isNaN(Number(validasiUtil.selisih_jarak))
    ) {
      validasi = {
        selisih_jarak: Number(Number(validasiUtil.selisih_jarak).toFixed(2)),
        is_valid_location: Boolean(validasiUtil.is_valid_location),
      };
    }
  } catch (error) {
    console.error("Validasi lokasi util gagal, memakai perhitungan fallback:", error.message);
  }

  return validasi;
}


function getKategoriValidasiGpsByDistance(distanceMeter, jenisId) {
  const distance = Number(distanceMeter);

  if (!Number.isFinite(distance)) {
    return {
      kategori: "METADATA GPS TIDAK TERSEDIA",
      skorExif: 0,
      isValidLocation: false,
      keterangan:
        "Data lokasi foto tidak tersedia sehingga diperlukan pengecekan manual oleh petugas.",
    };
  }

  const [sangatAkurat, akurat, cukup] = getThresholdByJenisId(jenisId);

  if (distance <= sangatAkurat) {
    return {
      kategori: "SANGAT AKURAT",
      skorExif: 50,
      isValidLocation: true,
      keterangan:
        "Lokasi foto sangat dekat dengan lokasi laporan sehingga dapat dianggap sangat akurat.",
    };
  }

  if (distance <= akurat) {
    return {
      kategori: "AKURAT",
      skorExif: 40,
      isValidLocation: true,
      keterangan:
        "Lokasi foto masih sesuai dengan lokasi laporan.",
    };
  }

  if (distance <= cukup) {
    return {
      kategori: "CUKUP",
      skorExif: 25,
      isValidLocation: true,
      keterangan:
        "Lokasi foto masih dapat diterima, namun tidak terlalu dekat dengan lokasi laporan.",
    };
  }

  return {
    kategori: "PERLU PENGECEKAN",
    skorExif: 5,
    isValidLocation: false,
    keterangan:
      "Lokasi yang diperoleh berbeda dengan lokasi laporan sehingga diperlukan pengecekan lebih lanjut oleh petugas.",
  };
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

function hitungSkorKonsistensiLaporan(body) {
  const jenisLokasi = String(body?.jenis_lokasi || "")
    .trim()
    .toUpperCase();

  if (jenisLokasi === "PEMUKIMAN") {
    return {
      skor: 10,
      detail: ["Lokasi kejadian berada di area pemukiman (+10)"],
    };
  }

  if (jenisLokasi === "FASILITAS_UMUM") {
    return {
      skor: 9,
      detail: ["Lokasi kejadian berada di fasilitas umum (+9)"],
    };
  }

  if (jenisLokasi === "JALAN_RAYA") {
    return {
      skor: 8,
      detail: ["Lokasi kejadian berada di jalan raya (+8)"],
    };
  }

  if (jenisLokasi === "AREA_TIDAK_PADAT") {
    return {
      skor: 5,
      detail: ["Lokasi kejadian berada di area tidak padat (+5)"],
    };
  }

  return {
    skor: 0,
    detail: ["Jenis lokasi tidak dikenali oleh sistem (+0)"],
  };
}

function getSkorKredibilitasLabel(humintScore) {
  const score = Number(humintScore || 0);

  if (score >= 70) return "TINGGI";
  if (score >= 50) return "SEDANG";
  return "RENDAH";
}

function getPrioritasByHumintScore(humintScore) {
  const score = Number(humintScore || 0);

  if (score >= 70) return "PRIORITAS TINGGI";
  if (score >= 50) return "PRIORITAS SEDANG";
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

      const actor =
        normalizeText(body.staff_puskodal) ||
        normalizeText(body.last_updated_by) ||
        normalizeText(body.created_by) ||
        "staff";

      const usrId = normalizeInteger(body.usr_id);

      // ---------------------------------------------------------------------------
      // Ambil browser GPS dari berbagai kemungkinan nama field yang dikirim frontend
      // Ini dipakai sebagai FALLBACK jika metadata EXIF foto tidak terbaca
      // PENTING: Nilai ini TIDAK menggantikan koordinat lokasi kejadian (latitude/longitude)
      // ---------------------------------------------------------------------------
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
          // latitude & longitude di bawah adalah koordinat LOKASI KEJADIAN,
          // bukan koordinat GPS browser/EXIF foto. Tidak boleh diubah.
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

      // ---------------------------------------------------------------------------
      // Ekstrak metadata EXIF dari foto kejadian
      // ---------------------------------------------------------------------------
      let exifData = {
        exif_latitude: null,
        exif_longitude: null,
      };

      if (fotoKejadianFile) {
        exifData = await extractExifLocation(fotoKejadianFile.path);
      }

      const adaExifGps = Boolean(exifData.exif_latitude && exifData.exif_longitude);
      const adaBrowserGps = Boolean(browserLatitude && browserLongitude);

      // gps_source menentukan sumber GPS yang dipakai untuk validasi metadata foto:
      // - "exif"    : metadata EXIF foto berhasil dibaca → pakai EXIF
      // - "browser" : EXIF tidak tersedia, tapi browser GPS ada → fallback browser
      // - "none"    : tidak ada sumber GPS sama sekali
      // CATATAN: Nilai ini HANYA untuk kolom metadata_foto, bukan koordinat laporan
      const gpsSource = adaExifGps ? "exif" : adaBrowserGps ? "browser" : "none";

      // Tentukan koordinat yang dipakai untuk menghitung selisih jarak validasi foto
      // Prioritas: EXIF > browser GPS > null (tidak ada validasi)
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

      // Hitung selisih jarak antara GPS foto (exif/browser) vs koordinat lokasi kejadian
      const validasi = hitungValidasiLokasi({
        laporanLatitude: body.latitude,
        laporanLongitude: body.longitude,
        exifLatitude: gpsValidasiLatitude,
        exifLongitude: gpsValidasiLongitude,
        batasMeter: 500,
      });

      // Dapatkan kategori validasi berdasarkan selisih jarak
      // Jika gpsSource "none", selisih_jarak akan null dan kategori otomatis "METADATA GPS TIDAK TERSEDIA"
      const hasilExif = getKategoriValidasiGpsByDistance(
        validasi.selisih_jarak,
        body.id_jenis
      );

      // Jika EXIF tidak tersedia, GPS browser tetap memakai aturan jarak yang sama
      // dengan validasi EXIF: SANGAT AKURAT, AKURAT, CUKUP, atau PERLU PENGECEKAN.
      if (gpsSource === "browser") {
        hasilExif.kategori = `FALLBACK GPS BROWSER - ${hasilExif.kategori}`;

        if (hasilExif.isValidLocation) {
          hasilExif.keterangan =
            "Foto tidak memiliki metadata GPS EXIF. Sistem menggunakan GPS browser sebagai alternatif dan lokasi yang diperoleh sesuai dengan lokasi laporan.";
        } else {
          hasilExif.keterangan =
            "Foto tidak memiliki metadata GPS EXIF. Sistem menggunakan GPS browser sebagai alternatif, namun lokasi yang diperoleh berbeda dengan lokasi laporan sehingga diperlukan pengecekan lebih lanjut oleh petugas.";
        }
      }

      // Keterangan khusus jika tidak ada GPS sama sekali
      if (gpsSource === "none") {
        hasilExif.keterangan =
          "Foto tidak memiliki metadata GPS EXIF dan GPS browser tidak tersedia sehingga diperlukan pengecekan manual oleh petugas.";
      }

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

      const totalScore = calculateTotalDssScore({
        humintScore,
        osintScore: null,
        spatialScore: null,
      });

      const dssResult = calculateDssResult({
        humintScore,
        osintScore: 0,
        spatialScore: 0,
        totalScore,
        totalKorban: dampakKorban.totalKorban,
        skorExif: hasilExif.skorExif,
        gpsSource,
        jenisLaporan: body.jenis_laporan || ("ASSESSMENT"),
      });

      const prioritas = getAnalisisPrioritasFromDss(dssResult);

      const parameterCek = {
        jenis_analisis: "HUMINT",
        sumber_validasi:
          gpsSource === "exif"
            ? "Metadata EXIF foto kejadian dan data laporan"
            : gpsSource === "browser"
            ? "Fallback GPS browser dan data laporan"
            : "Data laporan tanpa GPS foto",
        id_jenis_bencana: Number(body.id_jenis),
        lokasi_laporan: {
          latitude: Number(body.latitude),
          longitude: Number(body.longitude),
          alamat_lengkap_kejadian: body.alamat_lengkap_kejadian,
        },
        lokasi_exif: {
          exif_latitude: exifData.exif_latitude,
          exif_longitude: exifData.exif_longitude,
          browser_latitude: browserLatitude,
          browser_longitude: browserLongitude,
          gps_source: gpsSource,
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
          dss: dssResult,
        },
      };

      // Simpan metadata foto termasuk browser GPS (fallback)
      // Kolom browser_latitude/browser_longitude adalah data metadata foto,
      // bukan pengganti koordinat lokasi kejadian di tabel laporan
      await metadata_foto.create(
        {
          laporan_id: laporanId,
          exif_latitude: exifData.exif_latitude,
          exif_longitude: exifData.exif_longitude,
          browser_latitude: browserLatitude,
          browser_longitude: browserLongitude,
          gps_source: gpsSource,
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
          kerusakan_verifikasi: normalizeText(body.kerusakan_identifikasi || body.kerusakan_verifikasi),
          terdampak_verifikasi: normalizeText(body.terdampak_identifikasi || body.terdampak_verifikasi),
          penyebab_verifikasi: normalizeText(body.penyebab_identifikasi || body.penyebab_verifikasi),
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
          total_score: totalScore,
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
          dss: dssResult,
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