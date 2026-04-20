module.exports = (...allowedRoles) => {
  return (req, res, next) => {
    const role = req.user?.usr_role;

    if (!role) {
      return res.status(403).json({ message: "Role tidak ditemukan" });
    }

    if (!allowedRoles.includes(role)) {
      return res.status(403).json({
        message: `Akses ditolak. Role yang diizinkan: ${allowedRoles.join(", ")}`,
      });
    }

    return next();
  };
};