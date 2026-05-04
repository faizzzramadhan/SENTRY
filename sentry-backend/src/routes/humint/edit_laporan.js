const express = require("express");
const router = express.Router();

const db = require("../../models");
const { recalculateHumintById } = require("../../utils/recalculateHumint");

const {
  laporan,
  verifikasi_staff,
  analisis_sistem,
  detail_korban,
  sequelize,
} = db;

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

router.put("/edit/:id", async (req, res) => {
  const t = await sequelize.transaction();

  try {
    const { id } = req.params;
    const body = req.body;

    const now = new Date();

    // Staff Puskodal wajib diambil dari staff login, bukan dari petugas TRC.
    // Frontend mengirim staff_puskodal dan last_updated_by dari localStorage akun login.
    const actor =
      normalizeText(body.staff_puskodal) ||
      normalizeText(body.last_updated_by) ||
      normalizeText(body.created_by) ||
      "staff";

    const usrId = normalizeInteger(body.usr_id);

    const laporanAda = await laporan.findOne({
      where: { laporan_id: id },
      transaction: t,
    });

    if (!laporanAda) {
      await t.rollback();
      return res.status(404).json({
        message: "Laporan tidak ditemukan",
      });
    }

    const verifikasiPayload = {
      kerusakan_verifikasi: normalizeText(body.kerusakan_verifikasi),
      terdampak_verifikasi: normalizeText(body.terdampak_verifikasi),
      penyebab_verifikasi: normalizeText(body.penyebab_verifikasi),
      prakiraan_kerugian: normalizeDecimal(body.prakiraan_kerugian),
      rekomendasi_tindak_lanjut: normalizeText(body.rekomendasi_tindak_lanjut),
      tindak_lanjut: normalizeText(body.tindak_lanjut),
      petugas_trc: normalizeText(body.petugas_trc),
      usr_id: usrId,
      last_updated_by: actor,
      last_update_date: now,
    };

    const verifikasiAda = await verifikasi_staff.findOne({
      where: { laporan_id: id },
      transaction: t,
    });

    if (verifikasiAda) {
      await verifikasi_staff.update(verifikasiPayload, {
        where: { laporan_id: id },
        transaction: t,
      });
    } else {
      await verifikasi_staff.create(
        {
          laporan_id: id,
          ...verifikasiPayload,
          created_by: actor,
          creation_date: now,
        },
        { transaction: t }
      );
    }

    const analisisAda = await analisis_sistem.findOne({
      where: { id_laporan: id },
      transaction: t,
    });

    const analisisPayload = {
      skor_kredibilitas: normalizeText(body.skor_kredibilitas) || "RENDAH",
      prioritas: normalizeText(body.prioritas) || "PRIORITAS RENDAH",
      status_laporan: normalizeText(body.status_laporan) || "IDENTIFIKASI",
      last_updated_by: actor,
      last_update_date: now,
    };

    if (analisisAda) {
      await analisis_sistem.update(analisisPayload, {
        where: { id_laporan: id },
        transaction: t,
      });
    } else {
      await analisis_sistem.create(
        {
          id_laporan: id,
          ...analisisPayload,
          created_by: actor,
          creation_date: now,
        },
        { transaction: t }
      );
    }

    if (Array.isArray(body.detail_korban)) {
      await detail_korban.destroy({
        where: { laporan_id: id },
        transaction: t,
      });

      const korbanRows = body.detail_korban
        .filter((item) => Number(item.jumlah) > 0)
        .map((item) => ({
          laporan_id: id,
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

    await t.commit();

    let hasilRecalculate = null;

    try {
      hasilRecalculate = await recalculateHumintById(id);
    } catch (recalculateError) {
      console.error("Recalculate DSS setelah edit gagal:", recalculateError.message);
    }

    return res.json({
      message: "Laporan berhasil diperbarui",
      laporan_id: Number(id),
      staff_puskodal: actor,
      prakiraan_kerugian: verifikasiPayload.prakiraan_kerugian,
      dss: hasilRecalculate?.dss || null,
    });
  } catch (error) {
    await t.rollback();

    console.error("Gagal update laporan:", error);

    return res.status(500).json({
      message: "Gagal update laporan",
      error: error.message,
    });
  }
});

module.exports = router;
