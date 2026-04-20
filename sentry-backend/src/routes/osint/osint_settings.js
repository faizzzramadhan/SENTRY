const express = require("express");
const router = express.Router();
const { Op } = require("sequelize");

const models = require("../../models");
const auth = require("../../middlewares/auth");
const requireRole = require("../../middlewares/requireRole");

const OsintSettings = models.osint_settings;
const DataKelurahan = models.data_kelurahan;
const DataKeyword = models.data_keyword;

function toNonNegativeInt(value, fieldName) {
  const num = Number(value);
  if (!Number.isInteger(num) || num < 0) {
    throw new Error(`${fieldName} harus berupa angka bulat >= 0`);
  }
  return num;
}

router.get("/frontend", auth, requireRole("staff"), async (req, res) => {
  try {
    const [daftar_kelurahan, daftar_keyword, latestKpi] = await Promise.all([
      DataKelurahan.findAll({
        order: [["last_update_date", "DESC"], ["kelurahan_id", "DESC"]],
      }),
      DataKeyword.findAll({
        order: [["last_update_date", "DESC"], ["keyword_id", "DESC"]],
      }),
      OsintSettings.findOne({
        order: [["last_update_date", "DESC"], ["osint_settings_id", "DESC"]],
      }),
    ]);

    const nilai_kpi = latestKpi
      ? {
          osint_settings_id: latestKpi.osint_settings_id,
          set_jumlah_postingan: latestKpi.set_jumlah_postingan,
          set_jumlah_like: latestKpi.set_jumlah_like,
          set_jumlah_comment: latestKpi.set_jumlah_comment,
          set_jumlah_share: latestKpi.set_jumlah_share,
          last_updated_by: latestKpi.last_updated_by,
          last_update_date: latestKpi.last_update_date,
        }
      : {
          osint_settings_id: null,
          set_jumlah_postingan: 0,
          set_jumlah_like: 0,
          set_jumlah_comment: 0,
          set_jumlah_share: 0,
          last_updated_by: null,
          last_update_date: null,
        };

    return res.json({
      count_kelurahan: daftar_kelurahan.length,
      count_keyword: daftar_keyword.length,
      daftar_kelurahan,
      daftar_keyword,
      nilai_kpi,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

router.get("/", auth, requireRole("staff"), async (req, res) => {
  try {
    const { search = "", sort = "newest" } = req.query;

    const where = search
      ? {
          [Op.or]: [
            { created_by: { [Op.like]: `%${search}%` } },
            { last_updated_by: { [Op.like]: `%${search}%` } },
          ],
        }
      : {};

    const order =
      sort === "oldest"
        ? [["last_update_date", "ASC"]]
        : [["last_update_date", "DESC"]];

    const rows = await OsintSettings.findAll({ where, order });

    return res.json({
      count: rows.length,
      osint_settings: rows,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

router.get("/:osint_settings_id", auth, requireRole("staff"), async (req, res) => {
  try {
    const row = await OsintSettings.findOne({
      where: { osint_settings_id: req.params.osint_settings_id },
    });

    if (!row) {
      return res.status(404).json({ message: "OSINT settings tidak ditemukan" });
    }

    return res.json({ osint_settings: row });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

router.post("/", auth, requireRole("staff"), async (req, res) => {
  try {
    const {
      set_jumlah_postingan,
      set_jumlah_like,
      set_jumlah_comment,
      set_jumlah_share,
    } = req.body;

    if (
      set_jumlah_postingan === undefined ||
      set_jumlah_like === undefined ||
      set_jumlah_comment === undefined ||
      set_jumlah_share === undefined
    ) {
      return res.status(400).json({
        message:
          "set_jumlah_postingan, set_jumlah_like, set_jumlah_comment, set_jumlah_share wajib diisi",
      });
    }

    const actor = req.user?.usr_nama_lengkap || "system";

    const created = await OsintSettings.create({
      set_jumlah_postingan: toNonNegativeInt(set_jumlah_postingan, "set_jumlah_postingan"),
      set_jumlah_like: toNonNegativeInt(set_jumlah_like, "set_jumlah_like"),
      set_jumlah_comment: toNonNegativeInt(set_jumlah_comment, "set_jumlah_comment"),
      set_jumlah_share: toNonNegativeInt(set_jumlah_share, "set_jumlah_share"),
      created_by: actor,
      creation_date: new Date(),
      last_updated_by: actor,
      last_update_date: new Date(),
    });

    return res.status(201).json({
      message: "OSINT settings berhasil ditambahkan",
      osint_settings: created,
    });
  } catch (error) {
    if (error.message.includes("harus berupa angka")) {
      return res.status(400).json({ message: error.message });
    }
    return res.status(500).json({ message: error.message });
  }
});

router.put("/:osint_settings_id", auth, requireRole("staff"), async (req, res) => {
  try {
    const existing = await OsintSettings.findOne({
      where: { osint_settings_id: req.params.osint_settings_id },
    });

    if (!existing) {
      return res.status(404).json({ message: "OSINT settings tidak ditemukan" });
    }

    const actor = req.user?.usr_nama_lengkap || "system";

    await OsintSettings.update(
      {
        set_jumlah_postingan:
          req.body.set_jumlah_postingan !== undefined
            ? toNonNegativeInt(req.body.set_jumlah_postingan, "set_jumlah_postingan")
            : existing.set_jumlah_postingan,
        set_jumlah_like:
          req.body.set_jumlah_like !== undefined
            ? toNonNegativeInt(req.body.set_jumlah_like, "set_jumlah_like")
            : existing.set_jumlah_like,
        set_jumlah_comment:
          req.body.set_jumlah_comment !== undefined
            ? toNonNegativeInt(req.body.set_jumlah_comment, "set_jumlah_comment")
            : existing.set_jumlah_comment,
        set_jumlah_share:
          req.body.set_jumlah_share !== undefined
            ? toNonNegativeInt(req.body.set_jumlah_share, "set_jumlah_share")
            : existing.set_jumlah_share,
        last_updated_by: actor,
        last_update_date: new Date(),
      },
      { where: { osint_settings_id: req.params.osint_settings_id } }
    );

    const updated = await OsintSettings.findOne({
      where: { osint_settings_id: req.params.osint_settings_id },
    });

    return res.json({
      message: "OSINT settings berhasil diupdate",
      osint_settings: updated,
    });
  } catch (error) {
    if (error.message.includes("harus berupa angka")) {
      return res.status(400).json({ message: error.message });
    }
    return res.status(500).json({ message: error.message });
  }
});

router.delete("/:osint_settings_id", auth, requireRole("staff"), async (req, res) => {
  try {
    const deleted = await OsintSettings.destroy({
      where: { osint_settings_id: req.params.osint_settings_id },
    });

    if (!deleted) {
      return res.status(404).json({ message: "OSINT settings tidak ditemukan" });
    }

    return res.json({ message: "OSINT settings berhasil dihapus" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

module.exports = router;