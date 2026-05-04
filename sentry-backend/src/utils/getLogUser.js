
 * @param {import("express").Request} req
 * @returns {{ usr_id: number, nama_user: string, role: "admin"|"staff" } | null}
 */
function getLogUser(req) {
  // Sesuaikan dengan nama property yang dipakai middleware auth kamu
  const u = req.user || req.currentUser;

  if (!u) return null;

  const usr_id    = u.usr_id    || null;
  const nama_user = u.usr_nama_lengkap || u.nama_lengkap || u.usr_email || "Unknown";
  const role      = u.usr_role  || null;

  if (!usr_id || !role) return null;

  // Pastikan role sesuai ENUM di DB
  const safeRole = ["admin", "staff"].includes(role) ? role : null;
  if (!safeRole) return null;

  return { usr_id, nama_user, role: safeRole };
}

module.exports = { getLogUser };
