const db = require('../models');

function normalizeText(value) {
  if (value === undefined || value === null) return null;
  const text = String(value).trim();
  return text.length ? text : null;
}

function normalizeInteger(value) {
  if (value === undefined || value === null || value === '') return null;
  const number = Number(value);
  if (!Number.isInteger(number)) return null;
  return number;
}

function normalizeRole(value) {
  const role = normalizeText(value)?.toLowerCase();
  if (role === 'admin') return 'admin';
  if (role === 'staff') return 'staff';
  return null;
}

function toPlainObject(value) {
  if (!value) return {};
  if (typeof value.get === 'function') return value.get({ plain: true });
  if (typeof value.toJSON === 'function') return value.toJSON();
  return value;
}

function decodeJwtPayload(token) {
  try {
    const tokenText = normalizeText(token);
    if (!tokenText) return null;

    const cleanToken = tokenText.toLowerCase().startsWith('bearer ')
      ? tokenText.slice(7).trim()
      : tokenText;

    const parts = cleanToken.split('.');
    if (parts.length < 2) return null;

    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(Buffer.from(base64, 'base64').toString('utf8'));

    return payload && typeof payload === 'object' ? payload : null;
  } catch {
    return null;
  }
}

function getActorFromAuthorization(req) {
  const headers = req?.headers || {};
  const query = req?.query || {};

  const token =
    headers.authorization ||
    query.token ||
    query.access_token ||
    query.authorization ||
    null;

  const payload = decodeJwtPayload(token);
  if (!payload) return {};

  return getActorFromObject(payload);
}

function getActorFromObject(actorInput) {
  const actor = toPlainObject(actorInput);

  const usrId =
    normalizeInteger(actor.usr_id) ||
    normalizeInteger(actor.id) ||
    normalizeInteger(actor.user_id);

  const namaUser =
    normalizeText(actor.usr_nama_lengkap) ||
    normalizeText(actor.nama_lengkap) ||
    normalizeText(actor.nama_user) ||
    normalizeText(actor.name) ||
    normalizeText(actor.username);

  const role = normalizeRole(actor.usr_role || actor.role || actor.user_role);

  return { usr_id: usrId, nama_user: namaUser, role };
}

function getActorFromReq(req) {
  // 1. Dari req.user (hasil middleware auth)
  const userActor = getActorFromObject(req?.user || req?.auth || req?.decoded || null);
  if (userActor.usr_id && userActor.nama_user && userActor.role) return userActor;

  // 2. Dari Authorization header / query token — decode JWT langsung
  const tokenActor = getActorFromAuthorization(req);
  if (tokenActor.usr_id && tokenActor.nama_user && tokenActor.role) return tokenActor;

  // 3. Dari custom headers
  const headers = req?.headers || {};
  const headerActor = getActorFromObject({
    usr_id: headers['x-usr-id'] || headers['x-user-id'],
    usr_nama_lengkap:
      headers['x-nama-user'] ||
      headers['x-user-name'] ||
      headers['x-usr-nama-lengkap'] ||
      headers['x-user-full-name'],
    usr_role: headers['x-user-role'] || headers['x-role'] || headers['x-usr-role'],
  });
  if (headerActor.usr_id && headerActor.nama_user && headerActor.role) return headerActor;

  // 4. Dari body / query string
  const body  = req?.body  || {};
  const query = req?.query || {};

  const fallbackUsrId =
    normalizeInteger(body.actor_usr_id)        ||
    normalizeInteger(body.logged_in_usr_id)    ||
    normalizeInteger(body.usr_id)              ||
    normalizeInteger(body.user_id)             ||
    normalizeInteger(body.id_user)             ||
    normalizeInteger(query.actor_usr_id)       ||
    normalizeInteger(query.logged_in_usr_id)   ||
    normalizeInteger(query.usr_id)             ||
    normalizeInteger(query.user_id)            ||
    normalizeInteger(query.id_user);

  const fallbackNamaUser =
    normalizeText(body.actor_nama_user)        ||
    normalizeText(body.logged_in_nama_user)    ||
    normalizeText(body.usr_nama_lengkap)       ||
    normalizeText(body.nama_lengkap)           ||
    normalizeText(body.nama_user)              ||
    normalizeText(body.name)                   ||
    normalizeText(body.username)               ||
    normalizeText(body.staff_puskodal)         ||
    normalizeText(body.last_updated_by)        ||
    normalizeText(body.created_by)             ||
    normalizeText(query.actor_nama_user)       ||
    normalizeText(query.logged_in_nama_user)   ||
    normalizeText(query.usr_nama_lengkap)      ||
    normalizeText(query.nama_lengkap)          ||
    normalizeText(query.nama_user)             ||
    normalizeText(query.name)                  ||
    normalizeText(query.username)              ||
    normalizeText(query.staff_puskodal)        ||
    normalizeText(query.last_updated_by)       ||
    normalizeText(query.created_by);

  const fallbackRole =
    normalizeRole(body.actor_role)             ||
    normalizeRole(body.logged_in_role)         ||
    normalizeRole(body.usr_role)               ||
    normalizeRole(body.role)                   ||
    normalizeRole(body.user_role)              ||
    normalizeRole(query.actor_role)            ||
    normalizeRole(query.logged_in_role)        ||
    normalizeRole(query.usr_role)              ||
    normalizeRole(query.role)                  ||
    normalizeRole(query.user_role)             ||
    'staff';

  return {
    usr_id: fallbackUsrId || 0,
    nama_user: fallbackNamaUser || 'System',
    role: fallbackRole,
  };
}

/**
 * Simpan log aktivitas ke database.
 *
 * Urutan resolusi actor:
 *   options.actor (langsung) → req.user → JWT token di header/query → body/query fallback
 *
 * Jika usr_id masih 0 setelah semua fallback, coba lookup DB berdasarkan nama_user.
 * Jika tetap tidak ditemukan, log dilewati agar tidak melanggar FK constraint.
 */
async function createLogAktivitas({ req = null, actor = null, namaAktivitas, transaction = null }) {
  try {
    if (!namaAktivitas) return null;

    const directActor  = getActorFromObject(actor);
    const requestActor = req ? getActorFromReq(req) : {};

    const finalActor = {
      usr_id:    directActor.usr_id    || requestActor.usr_id    || 0,
      nama_user: directActor.nama_user || requestActor.nama_user || 'System',
      role:      directActor.role      || requestActor.role      || 'staff',
    };

    // Last resort: cari usr_id dari DB berdasarkan nama_user
    if ((!finalActor.usr_id || finalActor.usr_id <= 0) &&
        finalActor.nama_user &&
        finalActor.nama_user !== 'System') {
      try {
        const userFound = await db.user.findOne({
          where: { usr_nama_lengkap: finalActor.nama_user },
          attributes: ['usr_id', 'usr_nama_lengkap', 'usr_role'],
        });
        if (userFound) {
          finalActor.usr_id = userFound.usr_id;
          finalActor.role   = finalActor.role || userFound.usr_role || 'staff';
        }
      } catch (lookupErr) {
        console.warn('Lookup user untuk log gagal:', lookupErr.message);
      }
    }

    if (!finalActor.usr_id || finalActor.usr_id <= 0) {
      console.warn('[activityLogger] Log dilewati, usr_id tidak ditemukan:', namaAktivitas);
      return null;
    }

    return await db.log_aktivitas.create(
      {
        usr_id:          finalActor.usr_id,
        nama_user:       finalActor.nama_user,
        role:            finalActor.role,
        nama_aktivitas:  namaAktivitas,
        waktu_aktivitas: new Date(),
      },
      transaction ? { transaction } : undefined
    );
  } catch (error) {
    console.error('[activityLogger] Gagal menyimpan log aktivitas:', error.message);
    return null;
  }
}

module.exports = {
  createLogAktivitas,
  getActorFromReq,
  getActorFromObject,
};
