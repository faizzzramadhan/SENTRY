const express = require("express");
const router = express.Router();
const { Op } = require("sequelize");

const models = require("../../models");
const auth = require("../../middlewares/auth");
const requireRole = require("../../middlewares/requireRole");

const DataKecamatan = models.data_kecamatan;

function parseNullableDecimal(value, fieldName) {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;

  const parsed = Number(value);
  if (Number.isNaN(parsed)) {
    throw new Error(`${fieldName} harus berupa angka`);
  }

  return parsed;
}

function parseNullableGeojson(value) {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;

  if (typeof value === "string") return value;

  return JSON.stringify(value);
}

// GET ALL
router.get("/", auth, requireRole("staff"), async (req, res) => {
  try {
    const { search = "", sort = "newest" } = req.query;

    const where = search
      ? {
          [Op.or]: [
            { nama_kecamatan: { [Op.like]: `%${search}%` } },
            { created_by: { [Op.like]: `%${search}%` } },
            { last_updated_by: { [Op.like]: `%${search}%` } },
          ],
        }
      : {};

    const order =
      sort === "oldest"
        ? [["last_update_date", "ASC"]]
        : [["last_update_date", "DESC"]];

    const rows = await DataKecamatan.findAll({ where, order });

    return res.json({
      count: rows.length,
      data_kecamatan: rows,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

// GET BY ID
router.get("/:kecamatan_id", auth, requireRole("staff"), async (req, res) => {
  try {
    const row = await DataKecamatan.findOne({
      where: { kecamatan_id: req.params.kecamatan_id },
    });

    if (!row) {
      return res.status(404).json({ message: "Data kecamatan tidak ditemukan" });
    }

    return res.json({ data_kecamatan: row });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

// CREATE
router.post("/", auth, requireRole("staff"), async (req, res) => {
  try {
    const {
      nama_kecamatan,
      geojson,
      latitude_center,
      longitude_center,
    } = req.body;

    if (!nama_kecamatan) {
      return res.status(400).json({ message: "nama_kecamatan wajib diisi" });
    }

    const exists = await DataKecamatan.findOne({ where: { nama_kecamatan } });
    if (exists) {
      return res.status(409).json({ message: "Nama kecamatan sudah terdaftar" });
    }

    const actor = req.user?.usr_nama_lengkap || "system";

    const created = await DataKecamatan.create({
      nama_kecamatan,
      geojson: parseNullableGeojson(geojson),
      latitude_center: parseNullableDecimal(latitude_center, "latitude_center"),
      longitude_center: parseNullableDecimal(longitude_center, "longitude_center"),
      created_by: actor,
      creation_date: new Date(),
      last_updated_by: actor,
      last_update_date: new Date(),
    });

    return res.status(201).json({
      message: "Data kecamatan berhasil ditambahkan",
      data_kecamatan: created,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

// UPDATE
router.put("/:kecamatan_id", auth, requireRole("staff"), async (req, res) => {
  try {
    const existing = await DataKecamatan.findOne({
      where: { kecamatan_id: req.params.kecamatan_id },
    });

    if (!existing) {
      return res.status(404).json({ message: "Data kecamatan tidak ditemukan" });
    }

    const actor = req.user?.usr_nama_lengkap || "system";
    const nama_kecamatan = req.body.nama_kecamatan ?? existing.nama_kecamatan;

    const duplicate = await DataKecamatan.findOne({
      where: {
        nama_kecamatan,
        kecamatan_id: { [Op.ne]: req.params.kecamatan_id },
      },
    });

    if (duplicate) {
      return res.status(409).json({ message: "Nama kecamatan sudah terdaftar" });
    }

    await DataKecamatan.update(
      {
        nama_kecamatan,
        geojson:
          req.body.geojson !== undefined
            ? parseNullableGeojson(req.body.geojson)
            : existing.geojson,
        latitude_center:
          req.body.latitude_center !== undefined
            ? parseNullableDecimal(req.body.latitude_center, "latitude_center")
            : existing.latitude_center,
        longitude_center:
          req.body.longitude_center !== undefined
            ? parseNullableDecimal(req.body.longitude_center, "longitude_center")
            : existing.longitude_center,
        last_updated_by: actor,
        last_update_date: new Date(),
      },
      { where: { kecamatan_id: req.params.kecamatan_id } }
    );

    const updated = await DataKecamatan.findOne({
      where: { kecamatan_id: req.params.kecamatan_id },
    });

    return res.json({
      message: "Data kecamatan berhasil diupdate",
      data_kecamatan: updated,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

// DELETE
router.delete("/:kecamatan_id", auth, requireRole("staff"), async (req, res) => {
  try {
    const deleted = await DataKecamatan.destroy({
      where: { kecamatan_id: req.params.kecamatan_id },
    });

    if (!deleted) {
      return res.status(404).json({ message: "Data kecamatan tidak ditemukan" });
    }

    return res.json({ message: "Data kecamatan berhasil dihapus" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

module.exports = router;