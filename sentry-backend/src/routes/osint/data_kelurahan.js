const express = require("express");
const router = express.Router();
const { Op } = require("sequelize");

const models = require("../../models");
const auth = require("../../middlewares/auth");
const requireRole = require("../../middlewares/requireRole");

const DataKelurahan = models.data_kelurahan;
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

async function validateKecamatan(id_kecamatan) {
  if (id_kecamatan === undefined) return;
  if (id_kecamatan === null || id_kecamatan === "") return;

  const kecamatan = await DataKecamatan.findOne({
    where: { kecamatan_id: id_kecamatan },
  });

  if (!kecamatan) {
    throw new Error("id_kecamatan tidak ditemukan di data_kecamatan");
  }
}

// GET ALL
router.get("/", auth, requireRole("staff"), async (req, res) => {
  try {
    const { search = "", sort = "newest" } = req.query;

    const where = search
      ? {
          [Op.or]: [
            { nama_kelurahan: { [Op.like]: `%${search}%` } },
            { created_by: { [Op.like]: `%${search}%` } },
            { last_updated_by: { [Op.like]: `%${search}%` } },
          ],
        }
      : {};

    const order =
      sort === "oldest"
        ? [["last_update_date", "ASC"]]
        : [["last_update_date", "DESC"]];

    const rows = await DataKelurahan.findAll({
      where,
      order,
      include: [
        {
          model: DataKecamatan,
          as: "kecamatan",
          attributes: ["kecamatan_id", "nama_kecamatan"],
          required: false,
        },
      ],
    });

    return res.json({
      count: rows.length,
      data_kelurahan: rows,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

// GET BY ID
router.get("/:kelurahan_id", auth, requireRole("staff"), async (req, res) => {
  try {
    const row = await DataKelurahan.findOne({
      where: { kelurahan_id: req.params.kelurahan_id },
      include: [
        {
          model: DataKecamatan,
          as: "kecamatan",
          attributes: ["kecamatan_id", "nama_kecamatan"],
          required: false,
        },
      ],
    });

    if (!row) {
      return res.status(404).json({ message: "Data kelurahan tidak ditemukan" });
    }

    return res.json({ data_kelurahan: row });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

// CREATE
router.post("/", auth, requireRole("staff"), async (req, res) => {
  try {
    const {
      id_kecamatan,
      nama_kelurahan,
      geojson,
      latitude_center,
      longitude_center,
    } = req.body;

    if (!nama_kelurahan) {
      return res.status(400).json({ message: "nama_kelurahan wajib diisi" });
    }

    const exists = await DataKelurahan.findOne({ where: { nama_kelurahan } });
    if (exists) {
      return res.status(409).json({ message: "Nama kelurahan sudah terdaftar" });
    }

    await validateKecamatan(id_kecamatan);

    const actor = req.user?.usr_nama_lengkap || "system";

    const created = await DataKelurahan.create({
      id_kecamatan: id_kecamatan ?? null,
      nama_kelurahan,
      geojson: parseNullableGeojson(geojson),
      latitude_center: parseNullableDecimal(latitude_center, "latitude_center"),
      longitude_center: parseNullableDecimal(longitude_center, "longitude_center"),
      created_by: actor,
      creation_date: new Date(),
      last_updated_by: actor,
      last_update_date: new Date(),
    });

    const result = await DataKelurahan.findOne({
      where: { kelurahan_id: created.kelurahan_id },
      include: [
        {
          model: DataKecamatan,
          as: "kecamatan",
          attributes: ["kecamatan_id", "nama_kecamatan"],
          required: false,
        },
      ],
    });

    return res.status(201).json({
      message: "Data kelurahan berhasil ditambahkan",
      data_kelurahan: result,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

// UPDATE
router.put("/:kelurahan_id", auth, requireRole("staff"), async (req, res) => {
  try {
    const existing = await DataKelurahan.findOne({
      where: { kelurahan_id: req.params.kelurahan_id },
    });

    if (!existing) {
      return res.status(404).json({ message: "Data kelurahan tidak ditemukan" });
    }

    const actor = req.user?.usr_nama_lengkap || "system";
    const nama_kelurahan = req.body.nama_kelurahan ?? existing.nama_kelurahan;
    const nextIdKecamatan =
      req.body.id_kecamatan !== undefined
        ? req.body.id_kecamatan
        : existing.id_kecamatan;

    const duplicate = await DataKelurahan.findOne({
      where: {
        nama_kelurahan,
        kelurahan_id: { [Op.ne]: req.params.kelurahan_id },
      },
    });

    if (duplicate) {
      return res.status(409).json({ message: "Nama kelurahan sudah terdaftar" });
    }

    await validateKecamatan(nextIdKecamatan);

    await DataKelurahan.update(
      {
        id_kecamatan: nextIdKecamatan ?? null,
        nama_kelurahan,
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
      { where: { kelurahan_id: req.params.kelurahan_id } }
    );

    const updated = await DataKelurahan.findOne({
      where: { kelurahan_id: req.params.kelurahan_id },
      include: [
        {
          model: DataKecamatan,
          as: "kecamatan",
          attributes: ["kecamatan_id", "nama_kecamatan"],
          required: false,
        },
      ],
    });

    return res.json({
      message: "Data kelurahan berhasil diupdate",
      data_kelurahan: updated,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

// DELETE
router.delete("/:kelurahan_id", auth, requireRole("staff"), async (req, res) => {
  try {
    const deleted = await DataKelurahan.destroy({
      where: { kelurahan_id: req.params.kelurahan_id },
    });

    if (!deleted) {
      return res.status(404).json({ message: "Data kelurahan tidak ditemukan" });
    }

    return res.json({ message: "Data kelurahan berhasil dihapus" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

module.exports = router;