const express = require("express");
const router = express.Router();
const { Op } = require("sequelize");

const models = require("../models");
const auth = require("../middlewares/auth");
const requireRole = require("../middlewares/requireRole");

const JenisBencana = models.jenis_bencana;

router.get("/", auth, requireRole("staff", "admin"), async (req, res) => {
  try {
    const { search = "", sort = "newest" } = req.query;

    const where = search
      ? {
          [Op.or]: [
            { nama_jenis: { [Op.like]: `%${search}%` } },
            { created_by: { [Op.like]: `%${search}%` } },
            { last_updated_by: { [Op.like]: `%${search}%` } },
          ],
        }
      : {};

    const order =
      sort === "oldest"
        ? [["last_update_date", "ASC"]]
        : [["last_update_date", "DESC"]];

    const rows = await JenisBencana.findAll({ where, order });

    return res.json({
      count: rows.length,
      jenis_bencana: rows,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

router.get("/:jenis_id", auth, requireRole("staff", "admin"), async (req, res) => {
  try {
    const row = await JenisBencana.findOne({
      where: { jenis_id: req.params.jenis_id },
    });

    if (!row) {
      return res.status(404).json({ message: "Data jenis_bencana tidak ditemukan" });
    }

    return res.json({ jenis_bencana: row });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

router.post("/", auth, requireRole("staff", "admin"), async (req, res) => {
  try {
    const { nama_jenis } = req.body || {};

    if (!nama_jenis) {
      return res.status(400).json({ message: "nama_jenis wajib diisi" });
    }

    const exists = await JenisBencana.findOne({ where: { nama_jenis } });
    if (exists) {
      return res.status(409).json({ message: "Nama jenis bencana sudah terdaftar" });
    }

    const actor = req.user?.usr_nama_lengkap || "system";

    const created = await JenisBencana.create({
      nama_jenis,
      created_by: actor,
      creation_date: new Date(),
      last_updated_by: actor,
      last_update_date: new Date(),
    });

    return res.status(201).json({
      message: "Data jenis_bencana berhasil ditambahkan",
      jenis_bencana: created,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

router.put("/:jenis_id", auth, requireRole("staff", "admin"), async (req, res) => {
  try {
    const existing = await JenisBencana.findOne({
      where: { jenis_id: req.params.jenis_id },
    });

    if (!existing) {
      return res.status(404).json({ message: "Data jenis_bencana tidak ditemukan" });
    }

    const actor = req.user?.usr_nama_lengkap || "system";
    const nama_jenis = req.body?.nama_jenis ?? existing.nama_jenis;

    const duplicate = await JenisBencana.findOne({
      where: {
        nama_jenis,
        jenis_id: { [Op.ne]: req.params.jenis_id },
      },
    });

    if (duplicate) {
      return res.status(409).json({ message: "Nama jenis bencana sudah terdaftar" });
    }

    await JenisBencana.update(
      {
        nama_jenis,
        last_updated_by: actor,
        last_update_date: new Date(),
      },
      { where: { jenis_id: req.params.jenis_id } }
    );

    const updated = await JenisBencana.findOne({
      where: { jenis_id: req.params.jenis_id },
    });

    return res.json({
      message: "Data jenis_bencana berhasil diupdate",
      jenis_bencana: updated,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

router.delete("/:jenis_id", auth, requireRole("staff", "admin"), async (req, res) => {
  try {
    const existing = await JenisBencana.findOne({
      where: { jenis_id: req.params.jenis_id },
    });

    if (!existing) {
      return res.status(404).json({ message: "Data jenis_bencana tidak ditemukan" });
    }

    await JenisBencana.destroy({
      where: { jenis_id: req.params.jenis_id },
    });

    return res.json({ message: "Data jenis_bencana berhasil dihapus" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

router.post("/bulk-delete", auth, requireRole("staff", "admin"), async (req, res) => {
  try {
    const ids = Array.isArray(req.body?.ids) ? req.body.ids : [];
    const normalizedIds = [...new Set(
      ids.map((id) => Number(id)).filter((id) => Number.isInteger(id) && id > 0)
    )];

    if (normalizedIds.length === 0) {
      return res.status(400).json({ message: "ids wajib berupa array jenis_id yang valid" });
    }

    const deletedCount = await JenisBencana.destroy({
      where: { jenis_id: { [Op.in]: normalizedIds } },
    });

    return res.json({
      message: `${deletedCount} data jenis bencana berhasil dihapus`,
      deleted_count: deletedCount,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

module.exports = router;