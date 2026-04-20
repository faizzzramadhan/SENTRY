const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { Op } = require("sequelize");

const models = require("../models");
const User = models.user;

const auth = require("../middlewares/auth");
const requireRole = require("../middlewares/requireRole");
const SECRET_KEY = process.env.JWT_SECRET || "sentry";

function normalizeRole(value) {
  return String(value || "").trim().toLowerCase();
}

function isAdmin(user) {
  return normalizeRole(user?.usr_role) === "admin";
}

function canAccessUser(user, usrId) {
  return isAdmin(user) || Number(user?.usr_id) === Number(usrId);
}

// LOGIN
router.post("/auth", async (req, res) => {
  try {
    const { usr_email, usr_password } = req.body;

    if (!usr_email || !usr_password) {
      return res.status(400).json({
        logged: false,
        message: "email dan password wajib diisi",
      });
    }

    const result = await User.findOne({ where: { usr_email } });
    if (!result) {
      return res.status(401).json({
        logged: false,
        message: "Email atau password salah",
      });
    }

    const ok = await bcrypt.compare(usr_password, result.usr_password);
    if (!ok) {
      return res.status(401).json({
        logged: false,
        message: "Email atau password salah",
      });
    }

    const payload = {
      usr_id: result.usr_id,
      usr_nama_lengkap: result.usr_nama_lengkap,
      usr_email: result.usr_email,
      usr_role: result.usr_role,
    };

    const token = jwt.sign(payload, SECRET_KEY, { expiresIn: "7d" });

    return res.json({
      logged: true,
      user: payload,
      token,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

// GET LIST STAFF ONLY
router.get("/staff", auth, requireRole("admin"), async (req, res) => {
  try {
    const { search = "", sort = "newest" } = req.query;

    const where = {
      usr_role: "staff",
    };

    if (search) {
      where[Op.or] = [
        { usr_nama_lengkap: { [Op.like]: `%${search}%` } },
        { usr_email: { [Op.like]: `%${search}%` } },
        { usr_no_hp: { [Op.like]: `%${search}%` } },
        { last_updated_by: { [Op.like]: `%${search}%` } },
      ];
    }

    const order =
      sort === "oldest"
        ? [["last_update_date", "ASC"]]
        : [["last_update_date", "DESC"]];

    const users = await User.findAll({
      where,
      attributes: { exclude: ["usr_password"] },
      order,
    });

    return res.json({
      count: users.length,
      users,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

// GET ALL USER
router.get("/", auth, requireRole("admin"), async (req, res) => {
  try {
    const { role } = req.query;
    const where = {};

    if (role) {
      where.usr_role = normalizeRole(role);
    }

    const users = await User.findAll({
      where,
      attributes: { exclude: ["usr_password"] },
      order: [["usr_id", "DESC"]],
    });

    return res.json({
      count: users.length,
      users,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

// GET USER BY ID
router.get("/:usr_id", auth, async (req, res) => {
  try {
    const { usr_id } = req.params;

    if (!canAccessUser(req.user, usr_id)) {
      return res.status(403).json({ message: "Akses ditolak" });
    }

    const user = await User.findOne({
      where: { usr_id },
      attributes: { exclude: ["usr_password"] },
    });

    if (!user) {
      return res.status(404).json({ message: "User tidak ditemukan" });
    }

    return res.json({ user });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

// CREATE USER
router.post("/", auth, requireRole("admin"), async (req, res) => {
  try {
    const {
      usr_nama_lengkap,
      usr_email,
      usr_no_hp,
      usr_password,
      usr_role = "staff",
    } = req.body;

    if (!usr_nama_lengkap || !usr_email || !usr_no_hp || !usr_password) {
      return res.status(400).json({
        message: "usr_nama_lengkap, usr_email, usr_no_hp, usr_password wajib diisi",
      });
    }

    const normalizedRole = normalizeRole(usr_role);
    if (!["staff", "admin"].includes(normalizedRole)) {
      return res.status(400).json({ message: "Role harus staff atau admin" });
    }

    const exists = await User.findOne({ where: { usr_email } });
    if (exists) {
      return res.status(409).json({ message: "Email sudah terdaftar" });
    }

    const actor = req.user?.usr_nama_lengkap || "system";
    const hashed = await bcrypt.hash(usr_password, 10);

    const created = await User.create({
      usr_nama_lengkap,
      usr_email,
      usr_no_hp,
      usr_password: hashed,
      usr_role: normalizedRole,
      created_by: actor,
      last_updated_by: actor,
      creation_date: new Date(),
      last_update_date: new Date(),
    });

    return res.status(201).json({
      message: "Data berhasil ditambahkan",
      user: {
        usr_id: created.usr_id,
        usr_nama_lengkap: created.usr_nama_lengkap,
        usr_email: created.usr_email,
        usr_no_hp: created.usr_no_hp,
        usr_role: created.usr_role,
        created_by: created.created_by,
        creation_date: created.creation_date,
        last_updated_by: created.last_updated_by,
        last_update_date: created.last_update_date,
      },
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

// UPDATE USER
router.put("/:usr_id", auth, async (req, res) => {
  try {
    const { usr_id } = req.params;
    const { usr_nama_lengkap, usr_email, usr_no_hp, usr_password, usr_role } = req.body;

    if (!canAccessUser(req.user, usr_id)) {
      return res.status(403).json({ message: "Akses ditolak" });
    }

    const existing = await User.findOne({ where: { usr_id } });
    if (!existing) {
      return res.status(404).json({ message: "User tidak ditemukan" });
    }

    const actor = req.user?.usr_nama_lengkap || "system";
    const nextEmail = usr_email ?? existing.usr_email;

    const emailUsed = await User.findOne({
      where: {
        usr_email: nextEmail,
        usr_id: { [Op.ne]: usr_id },
      },
    });

    if (emailUsed) {
      return res.status(409).json({ message: "Email sudah terdaftar" });
    }

    const data = {
      usr_nama_lengkap: usr_nama_lengkap ?? existing.usr_nama_lengkap,
      usr_email: nextEmail,
      usr_no_hp: usr_no_hp ?? existing.usr_no_hp,
      last_updated_by: actor,
      last_update_date: new Date(),
    };

    if (isAdmin(req.user)) {
      const nextRole = usr_role ? normalizeRole(usr_role) : existing.usr_role;
      if (!["staff", "admin"].includes(nextRole)) {
        return res.status(400).json({ message: "Role harus staff atau admin" });
      }
      data.usr_role = nextRole;
    }

    if (usr_password && usr_password.trim() !== "") {
      data.usr_password = await bcrypt.hash(usr_password, 10);
    }

    await User.update(data, { where: { usr_id } });

    const updated = await User.findOne({
      where: { usr_id },
      attributes: { exclude: ["usr_password"] },
    });

    return res.json({
      message: "Data berhasil diupdate",
      user: updated,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

// DELETE USER
router.delete("/:usr_id", auth, requireRole("admin"), async (req, res) => {
  try {
    const { usr_id } = req.params;

    if (Number(req.user?.usr_id) === Number(usr_id)) {
      return res.status(400).json({ message: "Tidak bisa menghapus akun sendiri" });
    }

    const deleted = await User.destroy({ where: { usr_id } });
    if (!deleted) {
      return res.status(404).json({ message: "User tidak ditemukan" });
    }

    return res.json({ message: "Data berhasil dihapus" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

module.exports = router;