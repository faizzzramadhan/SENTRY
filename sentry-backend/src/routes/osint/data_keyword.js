const express = require("express");
const router = express.Router();
const { Op } = require("sequelize");

const models = require("../../models");
const auth = require("../../middlewares/auth");
const requireRole = require("../../middlewares/requireRole");

const DataKeyword = models.data_keyword;

// GET ALL
router.get("/", auth, requireRole("staff"), async (req, res) => {
  try {
    const { search = "", sort = "newest" } = req.query;

    const where = search
      ? {
          [Op.or]: [
            { keyword: { [Op.like]: `%${search}%` } },
            { created_by: { [Op.like]: `%${search}%` } },
            { last_updated_by: { [Op.like]: `%${search}%` } },
          ],
        }
      : {};

    const order =
      sort === "oldest"
        ? [["last_update_date", "ASC"]]
        : [["last_update_date", "DESC"]];

    const rows = await DataKeyword.findAll({ where, order });

    return res.json({
      count: rows.length,
      data_keyword: rows,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

// GET BY ID
router.get("/:keyword_id", auth, requireRole("staff"), async (req, res) => {
  try {
    const row = await DataKeyword.findOne({
      where: { keyword_id: req.params.keyword_id },
    });

    if (!row) {
      return res.status(404).json({ message: "Data keyword tidak ditemukan" });
    }

    return res.json({ data_keyword: row });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

// CREATE
router.post("/", auth, requireRole("staff"), async (req, res) => {
  try {
    const { keyword } = req.body;

    if (!keyword) {
      return res.status(400).json({ message: "keyword wajib diisi" });
    }

    const exists = await DataKeyword.findOne({ where: { keyword } });
    if (exists) {
      return res.status(409).json({ message: "Keyword sudah terdaftar" });
    }

    const actor = req.user?.usr_nama_lengkap || "system";

    const created = await DataKeyword.create({
      keyword,
      created_by: actor,
      creation_date: new Date(),
      last_updated_by: actor,
      last_update_date: new Date(),
    });

    return res.status(201).json({
      message: "Data keyword berhasil ditambahkan",
      data_keyword: created,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

// UPDATE
router.put("/:keyword_id", auth, requireRole("staff"), async (req, res) => {
  try {
    const existing = await DataKeyword.findOne({
      where: { keyword_id: req.params.keyword_id },
    });

    if (!existing) {
      return res.status(404).json({ message: "Data keyword tidak ditemukan" });
    }

    const actor = req.user?.usr_nama_lengkap || "system";
    const keyword = req.body.keyword ?? existing.keyword;

    const duplicate = await DataKeyword.findOne({
      where: {
        keyword,
        keyword_id: { [Op.ne]: req.params.keyword_id },
      },
    });

    if (duplicate) {
      return res.status(409).json({ message: "Keyword sudah terdaftar" });
    }

    await DataKeyword.update(
      {
        keyword,
        last_updated_by: actor,
        last_update_date: new Date(),
      },
      { where: { keyword_id: req.params.keyword_id } }
    );

    const updated = await DataKeyword.findOne({
      where: { keyword_id: req.params.keyword_id },
    });

    return res.json({
      message: "Data keyword berhasil diupdate",
      data_keyword: updated,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

// DELETE
router.delete("/:keyword_id", auth, requireRole("staff"), async (req, res) => {
  try {
    const deleted = await DataKeyword.destroy({
      where: { keyword_id: req.params.keyword_id },
    });

    if (!deleted) {
      return res.status(404).json({ message: "Data keyword tidak ditemukan" });
    }

    return res.json({ message: "Data keyword berhasil dihapus" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

module.exports = router;