"use strict";

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

function hitungSkorKelengkapanData(data, fotoKejadian) {
  let skor = 0;
  const detail = [];

  if (data.nama_pelapor) {
    skor += 3;
    detail.push("Nama pelapor tersedia (+3)");
  }

  if (data.no_hp) {
    skor += 3;
    detail.push("Nomor HP tersedia (+3)");
  }

  if (data.alamat_pelapor) {
    skor += 3;
    detail.push("Alamat pelapor tersedia (+3)");
  }

  if (data.id_jenis) {
    skor += 3;
    detail.push("Jenis bencana tersedia (+3)");
  }

  if (data.id_kecamatan) {
    skor += 3;
    detail.push("Kecamatan tersedia (+3)");
  }

  if (data.id_kelurahan) {
    skor += 3;
    detail.push("Kelurahan tersedia (+3)");
  }

  if (data.kronologi) {
    skor += 4;
    detail.push("Kronologi tersedia (+4)");
  }

  if (data.latitude && data.longitude) {
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
  const listKorban = Array.isArray(korban) ? korban : [];

  const totalKorban = listKorban.reduce((total, item) => {
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

function hitungSkorKarakteristikLokasi(data) {
  const jenisLokasi = String(data?.jenis_lokasi || "")
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

function hitungSkorKonsistensiLaporan(data) {
  return hitungSkorKarakteristikLokasi(data);
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

module.exports = {
  getThresholdByJenisId,
  getKategoriValidasiExif,
  hitungSkorKelengkapanData,
  hitungSkorDampak,
  hitungSkorKarakteristikLokasi,
  hitungSkorKonsistensiLaporan,
  getSkorKredibilitasLabel,
  getPrioritasByHumintScore,
};
