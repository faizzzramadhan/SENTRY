const express = require("express");
const router = express.Router();
const { Op } = require("sequelize");

const models = require("../models");
const auth = require("../middlewares/auth");
const requireRole = require("../middlewares/requireRole");

const NamaBencana = models.nama_bencana;
const JenisBencana = models.jenis_bencana;

async function validateJenis(jenis_id) {
  const row = await JenisBencana.findOne({ where: { jenis_id } });
  if (!row) {
    throw new Error("jenis_id tidak ditemukan di jenis_bencana");
  }
}

router.get("/", auth, requireRole("staff", "admin"), async (req, res) => {
  try {
    const { search = "", sort = "newest" } = req.query;

    const where = search
      ? {
          [Op.or]: [
            { nama_bencana: { [Op.like]: `%${search}%` } },
            { created_by: { [Op.like]: `%${search}%` } },
            { last_updated_by: { [Op.like]: `%${search}%` } },
          ],
        }
      : {};

    const order =
      sort === "oldest"
        ? [["last_update_date", "ASC"]]
        : [["last_update_date", "DESC"]];

    const rows = await NamaBencana.findAll({
      where,
      order,
      include: [
        {
          model: JenisBencana,
          as: "jenis_bencana",
          attributes: ["jenis_id", "nama_jenis", "icon_marker"],
          required: false,
        },
      ],
    });

    return res.json({
      count: rows.length,
      nama_bencana: rows,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

router.get("/:bencana_id", auth, requireRole("staff", "admin"), async (req, res) => {
  try {
    const row = await NamaBencana.findOne({
      where: { bencana_id: req.params.bencana_id },
      include: [
        {
          model: JenisBencana,
          as: "jenis_bencana",
          attributes: ["jenis_id", "nama_jenis", "icon_marker"],
          required: false,
        },
      ],
    });

    if (!row) {
      return res.status(404).json({ message: "Data nama_bencana tidak ditemukan" });
    }

    return res.json({ nama_bencana: row });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

router.post("/", auth, requireRole("staff", "admin"), async (req, res) => {
  try {
    const { jenis_id, nama_bencana } = req.body;

    if (!jenis_id) {
      return res.status(400).json({ message: "jenis_id wajib diisi" });
    }

    if (!nama_bencana) {
      return res.status(400).json({ message: "nama_bencana wajib diisi" });
    }

    await validateJenis(jenis_id);

    const exists = await NamaBencana.findOne({
      where: { jenis_id, nama_bencana },
    });

    if (exists) {
      return res.status(409).json({
        message: "Nama bencana pada jenis ini sudah terdaftar",
      });
    }

    const actor = req.user?.usr_nama_lengkap || "system";

    const created = await NamaBencana.create({
      jenis_id,
      nama_bencana,
      created_by: actor,
      creation_date: new Date(),
      last_updated_by: actor,
      last_update_date: new Date(),
    });

    const result = await NamaBencana.findOne({
      where: { bencana_id: created.bencana_id },
      include: [
        {
          model: JenisBencana,
          as: "jenis_bencana",
          attributes: ["jenis_id", "nama_jenis", "icon_marker"],
          required: false,
        },
      ],
    });

    return res.status(201).json({
      message: "Data nama_bencana berhasil ditambahkan",
      nama_bencana: result,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

router.put("/:bencana_id", auth, requireRole("staff", "admin"), async (req, res) => {
  try {
    const existing = await NamaBencana.findOne({
      where: { bencana_id: req.params.bencana_id },
    });

    if (!existing) {
      return res.status(404).json({ message: "Data nama_bencana tidak ditemukan" });
    }

    const actor = req.user?.usr_nama_lengkap || "system";
    const jenis_id = req.body.jenis_id ?? existing.jenis_id;
    const nama_bencana = req.body.nama_bencana ?? existing.nama_bencana;

    await validateJenis(jenis_id);

    const duplicate = await NamaBencana.findOne({
      where: {
        jenis_id,
        nama_bencana,
        bencana_id: { [Op.ne]: req.params.bencana_id },
      },
    });

    if (duplicate) {
      return res.status(409).json({
        message: "Nama bencana pada jenis ini sudah terdaftar",
      });
    }

    await NamaBencana.update(
      {
        jenis_id,
        nama_bencana,
        last_updated_by: actor,
        last_update_date: new Date(),
      },
      { where: { bencana_id: req.params.bencana_id } }
    );

    const updated = await NamaBencana.findOne({
      where: { bencana_id: req.params.bencana_id },
      include: [
        {
          model: JenisBencana,
          as: "jenis_bencana",
          attributes: ["jenis_id", "nama_jenis", "icon_marker"],
          required: false,
        },
      ],
    });

    return res.json({
      message: "Data nama_bencana berhasil diupdate",
      nama_bencana: updated,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

router.delete("/:bencana_id", auth, requireRole("staff", "admin"), async (req, res) => {
  try {
    const deleted = await NamaBencana.destroy({
      where: { bencana_id: req.params.bencana_id },
    });

    if (!deleted) {
      return res.status(404).json({ message: "Data nama_bencana tidak ditemukan" });
    }

    return res.json({ message: "Data nama_bencana berhasil dihapus" });
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
      return res.status(400).json({ message: "ids wajib berupa array bencana_id yang valid" });
    }

    const deletedCount = await NamaBencana.destroy({
      where: { bencana_id: { [Op.in]: normalizedIds } },
    });

    return res.json({
      message: `${deletedCount} data nama bencana berhasil dihapus`,
      deleted_count: deletedCount,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

module.exports = router;