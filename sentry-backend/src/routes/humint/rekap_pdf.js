const express = require("express");
const router = express.Router();
const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");

const db = require("../../models");
const { sequelize, detail_korban } = db;

const PAGE = {
  width: 841.89,
  height: 595.28,
  marginLeft: 28,
  marginRight: 28,
  marginTop: 28,
  marginBottom: 30,
  contentBottom: 540,
};

const MONTH_NAMES = [
  "JANUARI",
  "FEBRUARI",
  "MARET",
  "APRIL",
  "MEI",
  "JUNI",
  "JULI",
  "AGUSTUS",
  "SEPTEMBER",
  "OKTOBER",
  "NOVEMBER",
  "DESEMBER",
];

function safe(value) {
  if (value === null || value === undefined || value === "") return "-";
  return String(value);
}

function valueOrEmpty(value) {
  if (value === null || value === undefined || value === "") return "";
  return String(value);
}

function pad2(value) {
  return String(value).padStart(2, "0");
}

function formatTanggal(value) {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function formatTanggalJam(value) {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  const tanggal = date.toLocaleDateString("id-ID", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  const jam = date.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return `${tanggal}\nPukul ${jam} WIB`;
}

function formatRupiah(value) {
  if (value === null || value === undefined || value === "") return "-";

  const number = Number(value);
  if (Number.isNaN(number)) return safe(value);

  return `Rp ${number.toLocaleString("id-ID")}`;
}

function getMonthRange(year, month) {
  const start = new Date(Number(year), Number(month) - 1, 1, 0, 0, 0);
  const end = new Date(Number(year), Number(month), 0, 23, 59, 59);

  return {
    start,
    end,
    startSql: `${year}-${pad2(month)}-01 00:00:00`,
    endSql: `${year}-${pad2(month)}-${pad2(end.getDate())} 23:59:59`,
  };
}

function resolveLogoPath() {
  const possiblePaths = [
    path.join(process.cwd(), "assets", "logo.png"),
    path.join(process.cwd(), "src", "assets", "logo.png"),
    path.join(process.cwd(), "public", "logo.png"),
    path.join(process.cwd(), "public", "assets", "logo.png"),
    path.join(__dirname, "../../../assets/logo.png"),
    path.join(__dirname, "../../assets/logo.png"),
  ];

  for (const logoPath of possiblePaths) {
    if (fs.existsSync(logoPath)) return logoPath;
  }

  return null;
}

function drawOuterBorder(doc) {
  doc.save();
  doc.lineWidth(1);
  doc.rect(18, 18, PAGE.width - 36, PAGE.height - 36).stroke("#111");
  doc.lineWidth(0.8);
  doc.rect(22, 22, PAGE.width - 44, PAGE.height - 44).stroke("#111");
  doc.restore();
}

function drawFooter(doc, pageNumber) {
  doc.save();
  doc.font("Helvetica").fontSize(6).fillColor("#111");
  doc.text("SISTEM SENTRY BPBD KOTA MALANG", PAGE.width - 240, PAGE.height - 28, {
    width: 190,
    align: "right",
  });
  doc.text(`Halaman ${pageNumber}`, PAGE.width - 50, PAGE.height - 28, {
    width: 30,
    align: "right",
  });
  doc.restore();
}

function drawHeader(doc, year, month, pageNumber) {
  drawOuterBorder(doc);
  drawFooter(doc, pageNumber);

  const logoPath = resolveLogoPath();
  if (logoPath) {
    try {
      doc.image(logoPath, 48, 42, { width: 62, height: 62 });
    } catch (error) {
      console.error("Logo gagal ditampilkan:", error.message);
    }
  }

  const monthName = MONTH_NAMES[Number(month) - 1];

  doc.font("Helvetica-Bold").fontSize(16).fillColor("#000");
  doc.text("LOG BOOK REKAPITULASI KEJADIAN BENCANA ALAM", 155, 52, {
    width: 520,
    align: "center",
  });

  doc.font("Helvetica-Bold").fontSize(14);
  doc.text(`PERIODE: ${monthName} ${year}`, 155, 73, {
    width: 520,
    align: "center",
  });

  doc.text("UNIT : PUSDALOPS BPBD KOTA MALANG", 155, 93, {
    width: 520,
    align: "center",
  });

  doc.font("Helvetica-Bold").fontSize(11);
  doc.text(`NO: ${year}${pad2(month)}`, 675, 42, {
    width: 120,
    align: "right",
  });
}

function textHeight(doc, text, width, fontSize = 8, bold = false) {
  doc.font(bold ? "Helvetica-Bold" : "Helvetica").fontSize(fontSize);

  return doc.heightOfString(safe(text), {
    width,
    lineGap: 1.2,
  });
}

function drawWrappedText(doc, text, x, y, width, height, options = {}) {
  doc.save();

  doc
    .font(options.bold ? "Helvetica-Bold" : "Helvetica")
    .fontSize(options.fontSize || 8)
    .fillColor("#000");

  doc.text(safe(text), x, y, {
    width,
    height,
    align: options.align || "left",
    lineGap: options.lineGap || 1.2,
    ellipsis: true,
  });

  doc.restore();
}

function drawTableHeader(doc, y, columns) {
  const headerHeight = 50;

  doc.save();
  doc.lineWidth(0.8).strokeColor("#111").fillColor("#000");
  doc.font("Helvetica-Bold").fontSize(8);

  columns.forEach((col) => {
    doc.rect(col.x, y, col.width, headerHeight).stroke();
    doc.text(col.title, col.x + 4, y + 9, {
      width: col.width - 8,
      height: headerHeight - 12,
      align: "center",
      lineGap: 1,
    });
  });

  doc.restore();

  return y + headerHeight;
}

function drawTableRow(doc, y, rowHeight, row, columns) {
  doc.save();
  doc.lineWidth(0.6).strokeColor("#111");

  columns.forEach((col) => {
    doc.rect(col.x, y, col.width, rowHeight).stroke();
  });

  drawWrappedText(doc, row.no, columns[0].x + 4, y + 5, columns[0].width - 8, rowHeight - 8, {
    fontSize: 8,
    align: "center",
  });

  drawWrappedText(doc, row.jenis, columns[1].x + 5, y + 5, columns[1].width - 10, rowHeight - 8, {
    fontSize: 8,
    bold: true,
  });

  drawWrappedText(doc, row.waktu, columns[2].x + 5, y + 5, columns[2].width - 10, rowHeight - 8, {
    fontSize: 7.5,
  });

  drawWrappedText(doc, row.lokasi, columns[3].x + 5, y + 5, columns[3].width - 10, rowHeight - 8, {
    fontSize: 7.6,
  });

  drawWrappedText(doc, row.dampak, columns[4].x + 5, y + 5, columns[4].width - 10, rowHeight - 8, {
    fontSize: 7.6,
  });

  drawWrappedText(doc, row.kronologi, columns[5].x + 5, y + 5, columns[5].width - 10, rowHeight - 8, {
    fontSize: 7.6,
  });

  drawWrappedText(doc, row.tindakLanjut, columns[6].x + 5, y + 5, columns[6].width - 10, rowHeight - 8, {
    fontSize: 7.6,
  });

  drawWrappedText(doc, row.petugas, columns[7].x + 5, y + 5, columns[7].width - 10, rowHeight - 8, {
    fontSize: 7.6,
    align: "center",
  });

  doc.restore();
}

function buildKorbanText(korbanRows) {
  if (!korbanRows.length) {
    return "a. Korban jiwa: Nihil";
  }

  const grouped = {};

  korbanRows.forEach((item) => {
    const jenis = safe(item.jenis_korban);
    if (!grouped[jenis]) grouped[jenis] = 0;
    grouped[jenis] += Number(item.jumlah || 0);
  });

  return Object.entries(grouped)
    .map(([jenis, jumlah], index) => {
      const label = String.fromCharCode(97 + index);
      return `${label}. ${jenis}: ${jumlah} orang`;
    })
    .join("\n");
}

function buildLokasiText(item) {
  const wilayah = [];

  if (item.nama_kecamatan) wilayah.push(`Kec. ${safe(item.nama_kecamatan)}`);
  if (item.nama_kelurahan) wilayah.push(`Kel. ${safe(item.nama_kelurahan)}`);

  const alamat = valueOrEmpty(item.alamat_lengkap_kejadian);
  const jenisLokasi = valueOrEmpty(item.jenis_lokasi);
  const latitude = valueOrEmpty(item.latitude);
  const longitude = valueOrEmpty(item.longitude);

  const lines = [];

  if (wilayah.length > 0) {
    lines.push(`a. Wilayah:\n   ${wilayah.join(", ")}`);
  }

  if (alamat) {
    lines.push(`b. Alamat:\n   ${alamat}`);
  }

  if (jenisLokasi) {
    lines.push(`c. Jenis lokasi:\n   ${jenisLokasi}`);
  }

  if (latitude && longitude) {
    lines.push(`d. Titik koordinat:\n   ${latitude}, ${longitude}`);
  }

  if (!lines.length) {
    return "-";
  }

  return lines.join("\n");
}

function buildDampakText(item, korbanRows) {
  const lines = [];
  const korbanText = buildKorbanText(korbanRows);

  lines.push(korbanText);

  const terdampak = item.terdampak_verifikasi || item.terdampak_identifikasi;
  const kerusakan = item.kerusakan_verifikasi || item.kerusakan_identifikasi;
  const penyebab = item.penyebab_verifikasi || item.penyebab_identifikasi;
  const kerugian = item.prakiraan_kerugian;

  if (terdampak) {
    lines.push(`b. Terdampak:\n   ${safe(terdampak)}`);
  }

  if (kerusakan) {
    lines.push(`c. Kerusakan:\n   ${safe(kerusakan)}`);
  }

  if (kerugian) {
    lines.push(`d. Prakiraan kerugian:\n   ${formatRupiah(kerugian)}`);
  }

  if (penyebab) {
    lines.push(`e. Penyebab:\n   ${safe(penyebab)}`);
  }

  return lines.join("\n");
}

function buildWaktuText(item) {
  const sumber = item.nama_pelapor || item.created_by || "Masyarakat";

  return [
    formatTanggalJam(item.waktu_kejadian),
    `Sumber Informasi:\n${safe(sumber)}`,
    `Info masuk:\n${formatTanggalJam(item.waktu_laporan)}`,
  ].join("\n\n");
}

function buildRowHeight(doc, row, columns) {
  const heights = [
    textHeight(doc, row.jenis, columns[1].width - 10, 8, true),
    textHeight(doc, row.waktu, columns[2].width - 10, 7.5),
    textHeight(doc, row.lokasi, columns[3].width - 10, 7.6),
    textHeight(doc, row.dampak, columns[4].width - 10, 7.6),
    textHeight(doc, row.kronologi, columns[5].width - 10, 7.6),
    textHeight(doc, row.tindakLanjut, columns[6].width - 10, 7.6),
    textHeight(doc, row.petugas, columns[7].width - 10, 7.6),
  ];

  const maxHeight = Math.max(...heights) + 14;

  return Math.max(45, Math.min(maxHeight, 250));
}

router.get("/rekap-bulanan/download", async (req, res) => {
  try {
    const year = req.query.year || new Date().getFullYear();
    const month = req.query.month || new Date().getMonth() + 1;

    if (Number(month) < 1 || Number(month) > 12) {
      return res.status(400).json({
        message: "Bulan tidak valid",
      });
    }

    const range = getMonthRange(year, month);

    const rows = await sequelize.query(
      `
      SELECT
        l.laporan_id,
        l.jenis_laporan,
        l.nama_pelapor,
        l.no_hp,
        l.alamat_pelapor,
        l.kronologi,
        l.jenis_lokasi,
        l.latitude,
        l.longitude,
        l.alamat_lengkap_kejadian,
        l.waktu_kejadian,
        l.waktu_laporan,
        l.created_by,
        l.last_updated_by,

        jb.nama_jenis,
        nb.nama_bencana,
        dk.nama_kecamatan,
        dl.nama_kelurahan,

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
        vs.last_updated_by AS staff_puskodal,

        a.status_laporan,
        a.prioritas

      FROM laporan l
      LEFT JOIN jenis_bencana jb ON jb.jenis_id = l.id_jenis
      LEFT JOIN nama_bencana nb ON nb.bencana_id = l.id_bencana
      LEFT JOIN data_kecamatan dk ON dk.kecamatan_id = l.id_kecamatan
      LEFT JOIN data_kelurahan dl ON dl.kelurahan_id = l.id_kelurahan
      LEFT JOIN identifikasi i ON i.id_laporan = l.laporan_id
      LEFT JOIN verifikasi_staff vs ON vs.laporan_id = l.laporan_id
      LEFT JOIN analisis_sistem a ON a.id_laporan = l.laporan_id
      WHERE l.waktu_laporan BETWEEN :startDate AND :endDate
      ORDER BY l.waktu_laporan ASC, l.laporan_id ASC
      `,
      {
        replacements: {
          startDate: range.startSql,
          endDate: range.endSql,
        },
        type: sequelize.QueryTypes.SELECT,
      }
    );

    const laporanIds = rows.map((item) => item.laporan_id);

    const korbanByLaporan = {};

    if (laporanIds.length > 0) {
      const korbanRows = await detail_korban.findAll({
        where: {
          laporan_id: laporanIds,
        },
        order: [
          ["laporan_id", "ASC"],
          ["jenis_korban", "ASC"],
          ["jenis_kelamin", "ASC"],
          ["kelompok_umur", "ASC"],
        ],
      });

      korbanRows.forEach((item) => {
        const id = item.laporan_id;
        if (!korbanByLaporan[id]) korbanByLaporan[id] = [];
        korbanByLaporan[id].push(item);
      });
    }

    const doc = new PDFDocument({
      size: "A4",
      layout: "landscape",
      margin: 0,
      bufferPages: true,
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=rekap_bulanan_${year}_${pad2(month)}.pdf`
    );

    doc.pipe(res);

    let pageNumber = 1;
    drawHeader(doc, year, month, pageNumber);

    const columns = [
      { title: "No", x: 36, width: 32 },
      { title: "Jenis\nKejadian", x: 68, width: 70 },
      { title: "Hari/Tanggal/\nJam dan\nSumber\nInformasi", x: 138, width: 105 },
      { title: "Lokasi\nKejadian", x: 243, width: 145 },
      { title: "Dampak\nKejadian\nBencana", x: 388, width: 135 },
      { title: "Kronologi\nKejadian", x: 523, width: 125 },
      { title: "Tindak\nLanjut", x: 648, width: 108 },
      { title: "Petugas", x: 756, width: 55 },
    ];

    let y = drawTableHeader(doc, 125, columns);

    if (rows.length === 0) {
      const emptyHeight = 55;
      const emptyRow = {
        no: "-",
        jenis: "-",
        waktu: "-",
        lokasi: "-",
        dampak: "Tidak ada laporan pada periode ini",
        kronologi: "-",
        tindakLanjut: "-",
        petugas: "-",
      };

      drawTableRow(doc, y, emptyHeight, emptyRow, columns);
      y += emptyHeight;
    } else {
      for (let i = 0; i < rows.length; i++) {
        const item = rows[i];
        const korbanRows = korbanByLaporan[item.laporan_id] || [];

        const row = {
          no: `${i + 1}.`,
          jenis: safe(item.nama_jenis || item.nama_bencana || item.jenis_laporan),
          waktu: buildWaktuText(item),
          lokasi: buildLokasiText(item),
          dampak: buildDampakText(item, korbanRows),
          kronologi: safe(item.kronologi),
          tindakLanjut: safe(item.tindak_lanjut || item.rekomendasi_tindak_lanjut),
          petugas: safe(item.petugas_trc || item.staff_puskodal || item.last_updated_by),
        };

        const rowHeight = buildRowHeight(doc, row, columns);

        if (y + rowHeight > PAGE.contentBottom) {
          doc.addPage();
          pageNumber += 1;
          drawHeader(doc, year, month, pageNumber);
          y = drawTableHeader(doc, 125, columns);
        }

        drawTableRow(doc, y, rowHeight, row, columns);
        y += rowHeight;
      }
    }

    doc.end();
  } catch (error) {
    console.error("Gagal generate rekap PDF:", error);
    return res.status(500).json({
      message: "Gagal generate rekap PDF",
      error: error.message,
    });
  }
});

module.exports = router;