const express = require("express");
const router = express.Router();
const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");

const db = require("../../models");
const { sequelize, detail_korban } = db;

const { recalculateHumintById } = require("../../utils/recalculateHumint");

const PAGE = {
  width: 595.28,
  height: 841.89,
  marginLeft: 48,
  marginRight: 48,
  marginTop: 36,
  marginBottom: 42,
  contentBottom: 780,
};

function safe(value) {
  if (value === null || value === undefined || value === "") return "-";
  return String(value);
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
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  const jam = date.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return `${tanggal}, Pukul ${jam} WIB`;
}

function formatTanggalSingkat(value) {
  const date = value ? new Date(value) : new Date();

  if (Number.isNaN(date.getTime())) {
    return new Date().toLocaleDateString("id-ID");
  }

  return date.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatRupiah(value) {
  if (value === null || value === undefined || value === "") return "-";

  const number = Number(value);
  if (Number.isNaN(number)) return safe(value);

  return `Rp ${number.toLocaleString("id-ID")}`;
}

function getStatusText(value) {
  if (!value) return "-";

  if (value === "IDENTIFIKASI") return "IDENTIFIKASI";
  if (value === "TERVERIFIKASI") return "TERVERIFIKASI";
  if (value === "DITANGANI") return "DITANGANI";
  if (value === "SELESAI") return "SELESAI";

  return value;
}

function getValidasiLokasiText(value) {
  if (value === null || value === undefined || value === "") return "-";

  if (
    value === true ||
    value === 1 ||
    value === "1" ||
    value === "true" ||
    value === "TRUE"
  ) {
    return "Sesuai GPS";
  }

  if (
    value === false ||
    value === 0 ||
    value === "0" ||
    value === "false" ||
    value === "FALSE"
  ) {
    return "Tidak sesuai GPS";
  }

  return safe(value);
}

function getGpsSourceText(value) {
  if (!value) return "-";

  if (value === "exif") return "Menggunakan GPS dari EXIF Foto";
  if (value === "browser") return "Menggunakan GPS Browser / Fallback";
  if (value === "none") return "Tidak ada data GPS";

  return safe(value);
}

function getStaffPuskodalName(d) {
  return (
    d.verifikasi_last_updated_by ||
    d.analisis_last_updated_by ||
    d.laporan_last_updated_by ||
    d.staff_puskodal ||
    d.last_updated_by ||
    "-"
  );
}

function normalizeFileName(filename) {
  if (!filename) return null;

  let cleanName = String(filename).trim();

  if (!cleanName) return null;

  cleanName = cleanName.replace(/^\/+/, "");
  cleanName = cleanName.replace(/^uploads[\\/]/, "");
  cleanName = cleanName.replace(/^src[\\/]uploads[\\/]/, "");

  return cleanName;
}

function resolveImagePath(filename) {
  const cleanName = normalizeFileName(filename);
  if (!cleanName) return null;

  const possiblePaths = [
    path.join(process.cwd(), "uploads", cleanName),
    path.join(process.cwd(), "src", "uploads", cleanName),
    path.join(process.cwd(), "public", "uploads", cleanName),
    path.join(__dirname, "../../../uploads", cleanName),
    path.join(__dirname, "../../uploads", cleanName),
    path.join(__dirname, "../../../src/uploads", cleanName),
    path.join(__dirname, "../../src/uploads", cleanName),
    cleanName,
  ];

  for (const imagePath of possiblePaths) {
    if (fs.existsSync(imagePath)) {
      return imagePath;
    }
  }

  return null;
}

function resolveMultipleImagePaths(value) {
  if (!value) return [];

  return String(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => resolveImagePath(item))
    .filter(Boolean);
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
    if (fs.existsSync(logoPath)) {
      return logoPath;
    }
  }

  return null;
}

function makeNomorSurat(d) {
  return safe(d.laporan_id);
}

function sumTotalKorban(korbanRows) {
  if (!Array.isArray(korbanRows)) return 0;

  return korbanRows.reduce((total, item) => {
    const jumlah = Number(item?.jumlah || 0);
    return total + (Number.isFinite(jumlah) ? jumlah : 0);
  }, 0);
}

function formatListAsBullets(items) {
  if (!Array.isArray(items) || items.length === 0) return "-";

  return items
    .map((item) => `• ${safe(item)}`)
    .join("\n");
}

function formatRulesAsBullets(items) {
  if (!Array.isArray(items) || items.length === 0) return "-";

  return items
    .map((item) => {
      if (!item) return null;

      const kode = item.kode ? `[${item.kode}] ` : "";
      const keterangan = item.keterangan || "";

      return `• ${kode}${keterangan}`;
    })
    .filter(Boolean)
    .join("\n");
}

function drawOuterBorder(doc) {
  doc.save();

  doc.lineWidth(1);
  doc.rect(24, 24, 547, 794).stroke("#263238");

  doc.lineWidth(0.8);
  doc.rect(29, 29, 537, 784).stroke("#263238");

  doc.restore();
}

function drawFooter(doc, pageNumber) {
  doc.save();

  doc.font("Helvetica").fontSize(6).fillColor("#222");

  doc.text("SISTEM SENTRY BPBD KOTA MALANG", 335, 802, {
    width: 160,
    align: "right",
  });

  doc.text(`Halaman ${pageNumber}`, 500, 802, {
    width: 45,
    align: "right",
  });

  doc.restore();
}

function drawPageFrame(doc, pageNumber) {
  drawOuterBorder(doc);
  drawFooter(doc, pageNumber);
}

function addNewPage(doc, state) {
  doc.addPage();
  state.pageNumber += 1;
  drawPageFrame(doc, state.pageNumber);
  return 48;
}

function ensureSpace(doc, state, y, neededHeight) {
  if (y + neededHeight > PAGE.contentBottom) {
    return addNewPage(doc, state);
  }

  return y;
}

function drawTopHeader(doc, d, nomorSurat) {
  drawPageFrame(doc, 1);

  doc.font("Helvetica").fontSize(7).fillColor("#333");
  doc.text(`NO: ${nomorSurat}`, 38, 36, { width: 170 });

  doc.text(`Tanggal Laporan: ${formatTanggalSingkat(d.waktu_laporan)}`, 390, 36, {
    width: 140,
    align: "right",
  });

  const logoPath = resolveLogoPath();

  if (logoPath) {
    try {
      doc.image(logoPath, 42, 54, { width: 70, height: 70 });
    } catch (error) {
      console.error("Logo gagal ditampilkan:", error.message);
    }
  }

  doc.font("Helvetica-Bold").fontSize(20).fillColor("#000");
  doc.text("LAPORAN KEJADIAN BENCANA", 125, 58, {
    width: 390,
    align: "center",
  });

  doc.font("Helvetica-Bold").fontSize(15);
  doc.text("SISTEM SENTRY BPBD KOTA MALANG", 125, 84, {
    width: 390,
    align: "center",
  });

  doc.font("Helvetica").fontSize(14);
  doc.text(`NO: ${nomorSurat}`, 125, 107, {
    width: 390,
    align: "center",
  });

  doc.font("Helvetica").fontSize(13);
  doc.text(`Tanggal Laporan: ${formatTanggal(d.waktu_laporan)}`, 330, 137, {
    width: 205,
    align: "right",
  });

  return 170;
}

function drawSectionTitle(doc, state, title, x, y, width) {
  y = ensureSpace(doc, state, y, 32);

  doc.save();

  doc.font("Helvetica-Bold").fontSize(14).fillColor("#000");
  doc.text(title, x, y, { width });

  doc
    .moveTo(x, y + 19)
    .lineTo(x + width, y + 19)
    .lineWidth(0.5)
    .strokeColor("#bdbdbd")
    .stroke();

  doc.restore();

  return y + 26;
}

function calculateRowHeight(doc, label, value, labelWidth, valueWidth, minHeight = 20) {
  doc.font("Helvetica").fontSize(10);

  const textHeight = doc.heightOfString(safe(value), {
    width: valueWidth - 18,
    lineGap: 0,
  });

  const labelHeight = doc.heightOfString(safe(label), {
    width: labelWidth - 14,
    lineGap: 0,
  });

  return Math.max(minHeight, textHeight + 11, labelHeight + 11);
}

function drawInfoRow(doc, state, label, value, x, y, labelWidth, valueWidth, options = {}) {
  const minHeight = options.height || 20;
  const rowHeight = calculateRowHeight(doc, label, value, labelWidth, valueWidth, minHeight);

  y = ensureSpace(doc, state, y, rowHeight + 2);

  doc.save();

  doc.lineWidth(0.4).strokeColor("#c7c7c7");
  doc.moveTo(x, y + rowHeight).lineTo(x + labelWidth + valueWidth, y + rowHeight).stroke();

  doc.font("Helvetica-Bold").fontSize(options.fontSize || 10).fillColor("#000");
  doc.text(safe(label), x + 8, y + 5, {
    width: labelWidth - 14,
    height: rowHeight - 6,
    lineGap: 0,
  });

  doc.font("Helvetica").fontSize(options.fontSize || 10);
  doc.text(":", x + labelWidth, y + 5, { width: 8 });

  doc.text(safe(value), x + labelWidth + 14, y + 5, {
    width: valueWidth - 18,
    height: rowHeight - 6,
    lineGap: 0,
  });

  doc.restore();

  return y + rowHeight;
}

function drawKorbanTable(doc, state, korbanRows, x, y, width) {
  y = ensureSpace(doc, state, y, 52);

  const colJenis = 135;
  const colKelamin = 105;
  const colUmur = 145;
  const colJumlah = width - colJenis - colKelamin - colUmur;
  const headerHeight = 22;
  const rowHeight = 22;

  function drawHeader() {
    doc.save();

    doc.lineWidth(0.6).strokeColor("#333");
    doc.rect(x, y, width, headerHeight).stroke();

    doc.font("Helvetica-Bold").fontSize(9).fillColor("#000");
    doc.text("Jenis Korban", x + 7, y + 7, { width: colJenis - 10 });
    doc.text("Jenis Kelamin", x + colJenis + 7, y + 7, { width: colKelamin - 10 });
    doc.text("Kelompok Umur", x + colJenis + colKelamin + 7, y + 7, { width: colUmur - 10 });
    doc.text("Jumlah", x + colJenis + colKelamin + colUmur + 7, y + 7, {
      width: colJumlah - 10,
      align: "center",
    });

    doc.moveTo(x + colJenis, y).lineTo(x + colJenis, y + headerHeight).stroke();
    doc.moveTo(x + colJenis + colKelamin, y).lineTo(x + colJenis + colKelamin, y + headerHeight).stroke();
    doc.moveTo(x + colJenis + colKelamin + colUmur, y).lineTo(x + colJenis + colKelamin + colUmur, y + headerHeight).stroke();

    doc.restore();

    y += headerHeight;
  }

  drawHeader();

  if (!korbanRows.length) {
    doc.save();

    doc.rect(x, y, width, rowHeight).stroke();
    doc.font("Helvetica").fontSize(9);
    doc.text("Tidak ada data korban", x + 7, y + 7, { width: width - 14 });

    doc.restore();

    return y + rowHeight;
  }

  for (const item of korbanRows) {
    y = ensureSpace(doc, state, y, rowHeight + 24);

    if (y === 48) {
      drawHeader();
    }

    doc.save();

    doc.lineWidth(0.4).strokeColor("#c7c7c7");
    doc.rect(x, y, width, rowHeight).stroke();

    doc.moveTo(x + colJenis, y).lineTo(x + colJenis, y + rowHeight).stroke();
    doc.moveTo(x + colJenis + colKelamin, y).lineTo(x + colJenis + colKelamin, y + rowHeight).stroke();
    doc.moveTo(x + colJenis + colKelamin + colUmur, y).lineTo(x + colJenis + colKelamin + colUmur, y + rowHeight).stroke();

    doc.font("Helvetica").fontSize(9).fillColor("#000");
    doc.text(safe(item.jenis_korban), x + 7, y + 6, { width: colJenis - 10 });
    doc.text(safe(item.jenis_kelamin), x + colJenis + 7, y + 6, { width: colKelamin - 10 });
    doc.text(safe(item.kelompok_umur), x + colJenis + colKelamin + 7, y + 6, { width: colUmur - 10 });
    doc.text(`${safe(item.jumlah)} orang`, x + colJenis + colKelamin + colUmur + 7, y + 6, {
      width: colJumlah - 10,
      align: "center",
    });

    doc.restore();

    y += rowHeight;
  }

  return y;
}

function drawImageBox(doc, title, imagePath, x, y, width, height) {
  doc.save();

  doc.lineWidth(0.7).strokeColor("#333").rect(x, y, width, height).stroke();

  doc.font("Helvetica-Bold").fontSize(11).fillColor("#000");
  doc.text(title, x, y + 5, {
    width,
    height: 16,
    align: "center",
  });

  doc.moveTo(x, y + 25).lineTo(x + width, y + 25).stroke();

  if (imagePath && fs.existsSync(imagePath)) {
    try {
      doc.image(imagePath, x + 6, y + 31, {
        fit: [width - 12, height - 37],
        align: "center",
        valign: "center",
      });
    } catch (error) {
      doc.font("Helvetica").fontSize(8);
      doc.text("Foto tidak dapat ditampilkan", x + 6, y + 65, {
        width: width - 12,
        align: "center",
      });
    }
  } else {
    doc.font("Helvetica").fontSize(8);
    doc.text("Foto tidak tersedia", x + 6, y + 65, {
      width: width - 12,
      align: "center",
    });
  }

  doc.restore();
}

function drawPhotoGrid(doc, state, y, title, imagePaths) {
  const x = 48;
  const width = 500;
  const gap = 10;
  const boxWidth = 245;
  const boxHeight = 150;

  y = drawSectionTitle(doc, state, title, x, y, width);

  if (!imagePaths.length) {
    y = ensureSpace(doc, state, y, 34);

    doc.save();
    doc.font("Helvetica").fontSize(10);
    doc.text("Foto tidak tersedia", x + 8, y + 5, {
      width: width - 16,
      align: "left",
    });
    doc.restore();

    return y + 28;
  }

  for (let i = 0; i < imagePaths.length; i++) {
    const isLeft = i % 2 === 0;

    if (isLeft) {
      y = ensureSpace(doc, state, y, boxHeight + 12);
    }

    const boxX = isLeft ? x : x + boxWidth + gap;

    drawImageBox(
      doc,
      `${title.replace("VI. ", "").replace("VII. ", "").replace("VIII. ", "").replace("IX. ", "")} ${i + 1}`,
      imagePaths[i],
      boxX,
      y,
      boxWidth,
      boxHeight
    );

    if (!isLeft || i === imagePaths.length - 1) {
      y += boxHeight + 12;
    }
  }

  return y;
}

async function getTableColumns(tableName) {
  try {
    const rows = await sequelize.query(`SHOW COLUMNS FROM ${tableName}`, {
      type: sequelize.QueryTypes.SELECT,
    });

    return rows.map((row) => row.Field);
  } catch (error) {
    console.error(`Gagal membaca struktur tabel ${tableName}:`, error.message);
    return [];
  }
}

async function getOsintJoinConfig() {
  const referenceColumns = await getTableColumns("osint_reference");
  const dataColumns = await getTableColumns("osint_data");

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

  return {
    osintDataJoin:
      osintReferenceFk && hasOsintDataTable
        ? `LEFT JOIN osint_data od ON od.${osintDataPk} = osr.${osintReferenceFk}`
        : "",
    osintDataSelect: `
        ${hasOsintSource ? "od.osint_source AS osint_source," : "NULL AS osint_source,"}
        ${hasOsintContent ? "od.osint_content AS osint_content" : "NULL AS osint_content"}
    `,
  };
}

function getYaTidak(value) {
  if (value === true || value === 1 || value === "1" || value === "true" || value === "TRUE") {
    return "Ya";
  }

  return "Tidak";
}

function getZonaRawanText(d) {
  if (!d || !d.resiko_id) return "Tidak masuk zona rawan";
  return `Masuk zona rawan (${safe(d.tingkat_resiko)})`;
}

router.get("/download/:id", async (req, res) => {
  try {
    const { id } = req.params;

    let hasilRecalculate = null;

    try {
      hasilRecalculate = await recalculateHumintById(id);
    } catch (recalculateError) {
      console.error("Recalculate sebelum download PDF gagal:", recalculateError.message);
    }

    const osintJoinConfig = await getOsintJoinConfig();

    const rows = await sequelize.query(
      `
      SELECT
        l.*,
        l.last_updated_by AS laporan_last_updated_by,

        jb.nama_jenis,
        nb.nama_bencana,
        dk.nama_kecamatan,
        dl.nama_kelurahan,

        i.jenis_korban,
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
        vs.last_updated_by AS verifikasi_last_updated_by,

        a.skor_kredibilitas,
        a.prioritas,
        a.prioritas_sistem,
        a.prioritas_manual,
        a.is_prioritas_manual,
        a.alasan_prioritas_manual,
        a.status_laporan,
        a.last_updated_by AS analisis_last_updated_by,

        tr.resiko_id,
        tr.tingkat_resiko,

        osr.osint_area_text,
        osr.verified_at,
        ${osintJoinConfig.osintDataSelect},

        mf.exif_latitude,
        mf.exif_longitude,
        mf.browser_latitude,
        mf.browser_longitude,
        mf.selisih_jarak,
        mf.is_valid_location,
        mf.gps_source

      FROM laporan l
      LEFT JOIN jenis_bencana jb ON jb.jenis_id = l.id_jenis
      LEFT JOIN nama_bencana nb ON nb.bencana_id = l.id_bencana
      LEFT JOIN data_kecamatan dk ON dk.kecamatan_id = l.id_kecamatan
      LEFT JOIN data_kelurahan dl ON dl.kelurahan_id = l.id_kelurahan
      LEFT JOIN identifikasi i ON i.id_laporan = l.laporan_id
      LEFT JOIN verifikasi_staff vs ON vs.laporan_id = l.laporan_id
      LEFT JOIN analisis_sistem a ON a.id_laporan = l.laporan_id
      LEFT JOIN tingkat_resiko tr
        ON tr.jenis_id = l.id_jenis
       AND tr.kelurahan_id = l.id_kelurahan
      LEFT JOIN osint_reference osr
        ON osr.laporan_id = l.laporan_id
      ${osintJoinConfig.osintDataJoin}
      LEFT JOIN metadata_foto mf ON mf.laporan_id = l.laporan_id
      WHERE l.laporan_id = :id
      ORDER BY osr.last_update_date DESC, osr.creation_date DESC
      LIMIT 1
      `,
      {
        replacements: { id },
        type: sequelize.QueryTypes.SELECT,
      }
    );

    if (!rows.length) {
      return res.status(404).json({
        message: "Data laporan tidak ditemukan",
      });
    }

    const d = rows[0];

    const korbanRows = await sequelize.query(
      `
      SELECT
        jenis_korban,
        jenis_kelamin,
        kelompok_umur,
        jumlah
      FROM detail_korban
      WHERE laporan_id = :laporanId
      ORDER BY jenis_korban ASC, jenis_kelamin ASC, kelompok_umur ASC
      `,
      {
        replacements: { laporanId: d.laporan_id },
        type: sequelize.QueryTypes.SELECT,
      }
    );

    const totalKorban = sumTotalKorban(korbanRows);

    const zonaRawanText = getZonaRawanText(d);
    const isPrioritasManual =
      d.is_prioritas_manual === true ||
      d.is_prioritas_manual === 1 ||
      d.is_prioritas_manual === "1" ||
      d.is_prioritas_manual === "true" ||
      d.is_prioritas_manual === "TRUE";
    const prioritasSistem = d.prioritas_sistem || d.prioritas || "-";
    const prioritasFinal = d.prioritas || prioritasSistem;
    const alasanKredibilitas = hasilRecalculate?.alasan_kredibilitas || "-";
    const alasanPrioritas =
      hasilRecalculate?.alasan_prioritas_sistem ||
      hasilRecalculate?.alasan_prioritas ||
      "-";
    const alasanOverrideManual = isPrioritasManual
      ? d.alasan_prioritas_manual || "-"
      : "-";

    const nomorSurat = makeNomorSurat(d);

    const doc = new PDFDocument({
      size: "A4",
      margin: 0,
      bufferPages: true,
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=laporan_${d.laporan_id}.pdf`
    );

    doc.pipe(res);

    const state = {
      pageNumber: 1,
    };

    let y = drawTopHeader(doc, d, nomorSurat);

    const x = 48;
    const width = 500;
    const labelWidth = 170;
    const valueWidth = width - labelWidth;

    y = drawSectionTitle(doc, state, "I. DOKUMENTASI AWAL PELAPOR (DARI MASYARAKAT)", x, y, width);
    y = drawInfoRow(doc, state, "Nama Pelapor", d.nama_pelapor, x, y, labelWidth, valueWidth);
    y = drawInfoRow(doc, state, "No HP", d.no_hp, x, y, labelWidth, valueWidth);
    y = drawInfoRow(doc, state, "Alamat Pelapor", d.alamat_pelapor, x, y, labelWidth, valueWidth);
    y = drawInfoRow(doc, state, "Waktu Laporan Masuk", formatTanggalJam(d.waktu_laporan), x, y, labelWidth, valueWidth);

    y += 12;

    y = drawSectionTitle(doc, state, "II. DETAIL KEJADIAN & LOKASI", x, y, width);
    y = drawInfoRow(doc, state, "Jenis Laporan", d.jenis_laporan, x, y, labelWidth, valueWidth);
    y = drawInfoRow(
      doc,
      state,
      "Jenis Bencana",
      `${safe(d.nama_jenis)}${d.nama_bencana ? ` (${d.nama_bencana})` : ""}`,
      x,
      y,
      labelWidth,
      valueWidth
    );
    y = drawInfoRow(doc, state, "Waktu Kejadian", formatTanggalJam(d.waktu_kejadian), x, y, labelWidth, valueWidth);
    y = drawInfoRow(
      doc,
      state,
      "Jenis Lokasi",
      `${safe(d.jenis_lokasi)}${
        d.nama_kelurahan || d.nama_kecamatan
          ? ` / ${safe(d.nama_kelurahan)}, ${safe(d.nama_kecamatan)}`
          : ""
      }`,
      x,
      y,
      labelWidth,
      valueWidth
    );
    y = drawInfoRow(doc, state, "Titik Koordinat", `${safe(d.latitude)}, ${safe(d.longitude)}`, x, y, labelWidth, valueWidth);
    y = drawInfoRow(doc, state, "Alamat Kejadian", d.alamat_lengkap_kejadian, x, y, labelWidth, valueWidth);
    y = drawInfoRow(doc, state, "Kronologi (Pelapor)", d.kronologi, x, y, labelWidth, valueWidth);

    y += 12;

    y = drawSectionTitle(doc, state, "III. IDENTIFIKASI AWAL MASYARAKAT", x, y, width);
    y = drawInfoRow(doc, state, "Jumlah Korban Identifikasi", d.jumlah_korban_identifikasi, x, y, labelWidth, valueWidth);
    y = drawInfoRow(doc, state, "Kerusakan Identifikasi", d.kerusakan_identifikasi, x, y, labelWidth, valueWidth);
    y = drawInfoRow(doc, state, "Terdampak Identifikasi", d.terdampak_identifikasi, x, y, labelWidth, valueWidth);
    y = drawInfoRow(doc, state, "Penyebab Identifikasi", d.penyebab_identifikasi, x, y, labelWidth, valueWidth);

    y += 12;

    y = drawSectionTitle(doc, state, "IV. HASIL VERIFIKASI & ASESMEN TIM REAKSI CEPAT (TRC)", x, y, width);
    y = drawInfoRow(doc, state, "Kerusakan Verifikasi", d.kerusakan_verifikasi, x, y, labelWidth, valueWidth);
    y = drawInfoRow(doc, state, "Terdampak Verifikasi", d.terdampak_verifikasi, x, y, labelWidth, valueWidth);
    y = drawInfoRow(doc, state, "Penyebab Verifikasi", d.penyebab_verifikasi, x, y, labelWidth, valueWidth);

    y += 8;

    y = drawSectionTitle(doc, state, "DETAIL KORBAN", x, y, width);
    y = drawKorbanTable(doc, state, korbanRows, x, y, width);

    y += 12;

    y = drawInfoRow(doc, state, "Prakiraan Kerugian", formatRupiah(d.prakiraan_kerugian), x, y, labelWidth, valueWidth);
    y = drawInfoRow(doc, state, "Tindak Lanjut TRC", d.tindak_lanjut, x, y, labelWidth, valueWidth);
    y = drawInfoRow(doc, state, "Rekomendasi Tindak Lanjut TRC", d.rekomendasi_tindak_lanjut, x, y, labelWidth, valueWidth);

    y += 12;

    y = drawSectionTitle(doc, state, "V. ADMINISTRASI & STATUS", x, y, width);
    y = drawInfoRow(doc, state, "Petugas TRC", d.petugas_trc, x, y, labelWidth, valueWidth);
    y = drawInfoRow(doc, state, "Staff Puskodal", getStaffPuskodalName(d), x, y, labelWidth, valueWidth);
    y = drawInfoRow(doc, state, "Status Akhir", getStatusText(d.status_laporan), x, y, labelWidth, valueWidth);
    y = drawInfoRow(doc, state, "Prioritas Final", prioritasFinal, x, y, labelWidth, valueWidth);
    y = drawInfoRow(doc, state, "Prioritas Sistem", prioritasSistem, x, y, labelWidth, valueWidth);
    y = drawInfoRow(doc, state, "Override Prioritas Manual", getYaTidak(isPrioritasManual), x, y, labelWidth, valueWidth);
    y = drawInfoRow(doc, state, "Prioritas Manual", isPrioritasManual ? d.prioritas_manual : "-", x, y, labelWidth, valueWidth);
    y = drawInfoRow(doc, state, "Alasan Prioritas Manual", alasanOverrideManual, x, y, labelWidth, valueWidth);
    y = drawInfoRow(doc, state, "Skor Kredibilitas", d.skor_kredibilitas, x, y, labelWidth, valueWidth);

    y += 12;

    y = drawSectionTitle(doc, state, "VI. DATA PENDUKUNG SISTEM", x, y, width);
    y = drawInfoRow(doc, state, "Jenis Korban Identifikasi", d.jenis_korban, x, y, labelWidth, valueWidth);
    y = drawInfoRow(doc, state, "Kredibilitas Sistem", d.skor_kredibilitas, x, y, labelWidth, valueWidth);
    y = drawInfoRow(doc, state, "Prioritas Sistem", prioritasSistem, x, y, labelWidth, valueWidth);
    y = drawInfoRow(doc, state, "Prioritas Final", prioritasFinal, x, y, labelWidth, valueWidth);
    y = drawInfoRow(doc, state, "Status Zona Rawan", zonaRawanText, x, y, labelWidth, valueWidth);
    y = drawInfoRow(doc, state, "Tingkat Risiko", d.resiko_id ? d.tingkat_resiko : "TIDAK_RAWAN", x, y, labelWidth, valueWidth);
    y = drawInfoRow(doc, state, "Area OSINT", d.osint_area_text, x, y, labelWidth, valueWidth);
    y = drawInfoRow(doc, state, "Waktu Verifikasi OSINT", formatTanggalJam(d.verified_at), x, y, labelWidth, valueWidth);
    y = drawInfoRow(doc, state, "Sumber OSINT", d.osint_source, x, y, labelWidth, valueWidth);
    y = drawInfoRow(doc, state, "Isi Konten OSINT", d.osint_content, x, y, labelWidth, valueWidth);
    y = drawInfoRow(doc, state, "EXIF Latitude", d.exif_latitude, x, y, labelWidth, valueWidth);
    y = drawInfoRow(doc, state, "EXIF Longitude", d.exif_longitude, x, y, labelWidth, valueWidth);
    y = drawInfoRow(doc, state, "Browser GPS Latitude", d.browser_latitude, x, y, labelWidth, valueWidth);
    y = drawInfoRow(doc, state, "Browser GPS Longitude", d.browser_longitude, x, y, labelWidth, valueWidth);
    y = drawInfoRow(doc, state, "Sumber GPS", getGpsSourceText(d.gps_source), x, y, labelWidth, valueWidth);
    y = drawInfoRow(doc, state, "Selisih Jarak Foto", d.selisih_jarak != null ? `${d.selisih_jarak} meter` : "-", x, y, labelWidth, valueWidth);
    y = drawInfoRow(doc, state, "Validasi Lokasi Foto", getValidasiLokasiText(d.is_valid_location), x, y, labelWidth, valueWidth);

    y += 12;

    y = drawSectionTitle(doc, state, "VII. HASIL ANALISIS SISTEM BERBASIS ATURAN", x, y, width);
    y = drawInfoRow(doc, state, "Kredibilitas", d.skor_kredibilitas, x, y, labelWidth, valueWidth);
    y = drawInfoRow(doc, state, "Alasan Kredibilitas", alasanKredibilitas, x, y, labelWidth, valueWidth);
    y = drawInfoRow(doc, state, "Prioritas Sistem", prioritasSistem, x, y, labelWidth, valueWidth);
    y = drawInfoRow(doc, state, "Prioritas Final", prioritasFinal, x, y, labelWidth, valueWidth);
    y = drawInfoRow(doc, state, "Alasan Prioritas", alasanPrioritas, x, y, labelWidth, valueWidth);
    y = drawInfoRow(doc, state, "Override Manual", getYaTidak(isPrioritasManual), x, y, labelWidth, valueWidth);
    y = drawInfoRow(doc, state, "Alasan Override Manual", alasanOverrideManual, x, y, labelWidth, valueWidth);
    y = drawInfoRow(doc, state, "Total Korban Terhitung", `${totalKorban} orang`, x, y, labelWidth, valueWidth);

    y += 14;

    const fotoKejadianPaths = resolveMultipleImagePaths(d.foto_kejadian);
    const fotoKerusakanPaths = resolveMultipleImagePaths(d.foto_kerusakan);

    y = drawPhotoGrid(doc, state, y, "VIII. FOTO KEJADIAN", fotoKejadianPaths);
    y += 6;
    y = drawPhotoGrid(doc, state, y, "IX. FOTO KERUSAKAN", fotoKerusakanPaths);

    doc.end();
  } catch (error) {
    console.error("Gagal generate PDF:", error);
    return res.status(500).json({
      message: "Gagal generate PDF",
      error: error.message,
    });
  }
});

module.exports = router;