// src/routes/admin.js
const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const models = require("../models");
const Admin = models.admin;

const auth = require("../middlewares/auth");
const SECRET_KEY = process.env.JWT_SECRET || "sentry";

// LOGIN (email + password)
router.post("/auth", async (req, res) => {
  try {
    const { adm_email, adm_password } = req.body;
    if (!adm_email || !adm_password) {
      return res.status(400).json({ logged: false, message: "email dan password wajib diisi" });
    }

    const result = await Admin.findOne({ where: { adm_email } });
    if (!result) {
      return res.status(401).json({ logged: false, message: "Email atau password salah" });
    }

    const ok = await bcrypt.compare(adm_password, result.adm_password);
    if (!ok) {
      return res.status(401).json({ logged: false, message: "Email atau password salah" });
    }

    const payload = {
      adm_id: result.adm_id,
      adm_nama_lengkap: result.adm_nama_lengkap,
      adm_email: result.adm_email,
    };

    const token = jwt.sign(payload, SECRET_KEY, { expiresIn: "7d" });

    return res.json({ logged: true, admin: payload, token });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

// GET ALL ADMIN (protected)
router.get("/", auth, async (req, res) => {
  try {
    const admins = await Admin.findAll({
      attributes: { exclude: ["adm_password"] },
      order: [["adm_id", "DESC"]],
    });

    return res.json({
      count: admins.length,
      admin: admins,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

// GET ADMIN BY ID (protected)
router.get("/:adm_id", auth, async (req, res) => {
  try {
    const { adm_id } = req.params;

    const admin = await Admin.findOne({
      where: { adm_id },
      attributes: { exclude: ["adm_password"] },
    });

    if (!admin) return res.status(404).json({ message: "Admin tidak ditemukan" });
    return res.json({ admin });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

// CREATE ADMIN (protected)
router.post("/", auth, async (req, res) => {
  try {
    const { adm_nama_lengkap, adm_email, adm_no_hp, adm_password } = req.body;

    if (!adm_nama_lengkap || !adm_email || !adm_no_hp || !adm_password) {
      return res.status(400).json({
        message: "adm_nama_lengkap, adm_email, adm_no_hp, adm_password wajib diisi",
      });
    }

    const exists = await Admin.findOne({ where: { adm_email } });
    if (exists) return res.status(409).json({ message: "Email sudah terdaftar" });

    const actor = req.user?.adm_email || "system";

    const hashed = await bcrypt.hash(adm_password, 10);

    await Admin.create({
        adm_nama_lengkap,
        adm_email,
        adm_no_hp,
        adm_password: hashed,
        created_by: actor,
        last_updated_by: actor,
        creation_date: new Date(),
        last_update_date: new Date(),
    });

    return res.status(201).json({ message: "Admin berhasil ditambahkan" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

// UPDATE ADMIN (protected)
router.put("/:adm_id", auth, async (req, res) => {
  try {
    const { adm_id } = req.params;
    const { adm_nama_lengkap, adm_email, adm_no_hp, adm_password } = req.body;

    const existing = await Admin.findOne({ where: { adm_id } });
    if (!existing) return res.status(404).json({ message: "Admin tidak ditemukan" });

    const actor = req.user?.adm_email || "system";

    const data = {
      adm_nama_lengkap: adm_nama_lengkap ?? existing.adm_nama_lengkap,
      adm_email: adm_email ?? existing.adm_email,
      adm_no_hp: adm_no_hp ?? existing.adm_no_hp,
      last_updated_by: actor,
      last_update_date: new Date(),
    };

    if (adm_password && adm_password.trim() !== "") {
        data.adm_password = await bcrypt.hash(adm_password, 10);
    }

    await Admin.update(data, { where: { adm_id } });
    return res.json({ message: "Admin berhasil diupdate" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

// DELETE ADMIN (protected)
router.delete("/:adm_id", auth, async (req, res) => {
  try {
    const { adm_id } = req.params;

    const deleted = await Admin.destroy({ where: { adm_id } });
    if (!deleted) return res.status(404).json({ message: "Admin tidak ditemukan" });

    return res.json({ message: "Admin berhasil dihapus" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

module.exports = router;