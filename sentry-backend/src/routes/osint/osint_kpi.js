const express = require("express");
const router = express.Router();
const { Op } = require("sequelize");

const models = require("../../models");
const auth = require("../../middlewares/auth");
const requireRole = require("../../middlewares/requireRole");

const OsintKpi = models.osint_kpi;
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
    const [daftar_keyword, latestKpi] = await Promise.all([
      DataKeyword.findAll({
        order: [["last_update_date", "DESC"], ["keyword_id", "DESC"]],
      }),
      OsintKpi.findOne({
        order: [["last_update_date", "DESC"], ["osint_kpi_id", "DESC"]],
      }),
    ]);

    const nilai_kpi = latestKpi
      ? {
          osint_kpi_id: latestKpi.osint_kpi_id,
          set_jumlah_postingan: latestKpi.set_jumlah_postingan,
          set_jumlah_like: latestKpi.set_jumlah_like,
          set_jumlah_comment: latestKpi.set_jumlah_comment,
          set_jumlah_share: latestKpi.set_jumlah_share,
          last_updated_by: latestKpi.last_updated_by,
          last_update_date: latestKpi.last_update_date,
        }
      : {
          osint_kpi_id: null,
          set_jumlah_postingan: 0,
          set_jumlah_like: 0,
          set_jumlah_comment: 0,
          set_jumlah_share: 0,
          last_updated_by: null,
          last_update_date: null,
        };

    return res.json({
      count_keyword: daftar_keyword.length,
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

    const rows = await OsintKpi.findAll({ where, order });

    return res.json({
      count: rows.length,
      osint_kpi: rows,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

router.get("/:osint_kpi_id", auth, requireRole("staff"), async (req, res) => {
  try {
    const row = await OsintKpi.findOne({
      where: { osint_kpi_id: req.params.osint_kpi_id },
    });

    if (!row) {
      return res.status(404).json({ message: "OSINT KPI tidak ditemukan" });
    }

    return res.json({ osint_kpi: row });
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

    const created = await OsintKpi.create({
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
      message: "OSINT KPI berhasil ditambahkan",
      osint_kpi: created,
    });
  } catch (error) {
    if (error.message.includes("harus berupa angka")) {
      return res.status(400).json({ message: error.message });
    }
    return res.status(500).json({ message: error.message });
  }
});

router.put("/:osint_kpi_id", auth, requireRole("staff"), async (req, res) => {
  try {
    const existing = await OsintKpi.findOne({
      where: { osint_kpi_id: req.params.osint_kpi_id },
    });

    if (!existing) {
      return res.status(404).json({ message: "OSINT KPI tidak ditemukan" });
    }

    const actor = req.user?.usr_nama_lengkap || "system";

    await OsintKpi.update(
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
      { where: { osint_kpi_id: req.params.osint_kpi_id } }
    );

    const updated = await OsintKpi.findOne({
      where: { osint_kpi_id: req.params.osint_kpi_id },
    });

    return res.json({
      message: "OSINT KPI berhasil diupdate",
      osint_kpi: updated,
    });
  } catch (error) {
    if (error.message.includes("harus berupa angka")) {
      return res.status(400).json({ message: error.message });
    }
    return res.status(500).json({ message: error.message });
  }
});

router.delete("/:osint_kpi_id", auth, requireRole("staff"), async (req, res) => {
  try {
    const deleted = await OsintKpi.destroy({
      where: { osint_kpi_id: req.params.osint_kpi_id },
    });

    if (!deleted) {
      return res.status(404).json({ message: "OSINT KPI tidak ditemukan" });
    }

    return res.json({ message: "OSINT KPI berhasil dihapus" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

module.exports = router;