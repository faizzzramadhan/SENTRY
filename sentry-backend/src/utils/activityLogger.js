const db = require("../models");

function normalizeText(value) {
  if (value === undefined || value === null) return null;
  const text = String(value).trim();
  return text.length ? text : null;
}

function normalizeInteger(value) {
  if (value === undefined || value === null || value === "") return null;
  const number = Number(value);
  if (!Number.isInteger(number)) return null;
  return number;
}

function normalizeRole(value) {
  const role = normalizeText(value)?.toLowerCase();
  if (role === "admin") return "admin";
  if (role === "staff") return "staff";
  return null;
}

function toPlainObject(value) {
  if (!value) return {};
  if (typeof value.get === "function") return value.get({ plain: true });
  if (typeof value.toJSON === "function") return value.toJSON();
  return value;
}

function decodeJwtPayload(token) {
  try {
    const tokenText = normalizeText(token);
    if (!tokenText) return null;

    const cleanToken = tokenText.toLowerCase().startsWith("bearer ")
      ? tokenText.slice(7).trim()
      : tokenText;

    const parts = cleanToken.split(".");
    if (parts.length < 2) return null;

    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const payload = JSON.parse(Buffer.from(base64, "base64").toString("utf8"));

    return payload && typeof payload === "object" ? payload : null;
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
  const userActor = getActorFromObject(req?.user || req?.auth || req?.decoded || null);
  if (userActor.usr_id && userActor.nama_user && userActor.role) return userActor;

  const tokenActor = getActorFromAuthorization(req);
  if (tokenActor.usr_id && tokenActor.nama_user && tokenActor.role) return tokenActor;

  const headers = req?.headers || {};
  const headerActor = getActorFromObject({
    usr_id: headers["x-usr-id"] || headers["x-user-id"],
    usr_nama_lengkap:
      headers["x-nama-user"] ||
      headers["x-user-name"] ||
      headers["x-usr-nama-lengkap"] ||
      headers["x-user-full-name"],
    usr_role: headers["x-user-role"] || headers["x-role"] || headers["x-usr-role"],
  });

  if (headerActor.usr_id && headerActor.nama_user && headerActor.role) {
    return headerActor;
  }

  const body = req?.body || {};
  const query = req?.query || {};

  const fallbackUsrId =
    normalizeInteger(body.actor_usr_id) ||
    normalizeInteger(body.logged_in_usr_id) ||
    normalizeInteger(body.usr_id) ||
    normalizeInteger(body.user_id) ||
    normalizeInteger(body.id_user) ||
    normalizeInteger(query.actor_usr_id) ||
    normalizeInteger(query.logged_in_usr_id) ||
    normalizeInteger(query.usr_id) ||
    normalizeInteger(query.user_id) ||
    normalizeInteger(query.id_user);

  const fallbackNamaUser =
    normalizeText(body.actor_nama_user) ||
    normalizeText(body.logged_in_nama_user) ||
    normalizeText(body.usr_nama_lengkap) ||
    normalizeText(body.nama_lengkap) ||
    normalizeText(body.nama_user) ||
    normalizeText(body.name) ||
    normalizeText(body.username) ||
    normalizeText(body.staff_puskodal) ||
    normalizeText(body.last_updated_by) ||
    normalizeText(body.created_by) ||
    normalizeText(query.actor_nama_user) ||
    normalizeText(query.logged_in_nama_user) ||
    normalizeText(query.usr_nama_lengkap) ||
    normalizeText(query.nama_lengkap) ||
    normalizeText(query.nama_user) ||
    normalizeText(query.name) ||
    normalizeText(query.username) ||
    normalizeText(query.staff_puskodal) ||
    normalizeText(query.last_updated_by) ||
    normalizeText(query.created_by);

  const fallbackRole =
    normalizeRole(body.actor_role) ||
    normalizeRole(body.logged_in_role) ||
    normalizeRole(body.usr_role) ||
    normalizeRole(body.role) ||
    normalizeRole(body.user_role) ||
    normalizeRole(query.actor_role) ||
    normalizeRole(query.logged_in_role) ||
    normalizeRole(query.usr_role) ||
    normalizeRole(query.role) ||
    normalizeRole(query.user_role) ||
    "staff";

  return {
    usr_id: fallbackUsrId || 0,
    nama_user: fallbackNamaUser || "System",
    role: fallbackRole,
  };
}

function isStaffOrAdmin(actor) {
  return actor && actor.usr_id > 0 && ["admin", "staff"].includes(actor.role);
}

function getRequestPath(req) {
  const originalUrl = req?.originalUrl || req?.url || "";
  return originalUrl.split("?")[0] || "/";
}

function getRequestQueryText(req) {
  const query = req?.query || {};
  const keys = Object.keys(query).filter((key) => !["token", "access_token", "authorization"].includes(key));

  if (!keys.length) return "";

  const safeQuery = keys
    .map((key) => `${key}=${query[key]}`)
    .join("&");

  return safeQuery ? `?${safeQuery}` : "";
}

function getMethodLabel(method) {
  const value = String(method || "GET").toUpperCase();

  if (value === "GET") return "Melihat";
  if (value === "POST") return "Menambahkan/Menjalankan";
  if (value === "PUT") return "Memperbarui";
  if (value === "PATCH") return "Memperbarui";
  if (value === "DELETE") return "Menghapus";

  return value;
}

function getRouteLabel(path) {
  const cleanPath = String(path || "").toLowerCase();

  if (cleanPath === "/log-aktivitas") return "log aktivitas";
  if (cleanPath.includes("/log-aktivitas/catat-download-csv")) {
    return "log aktivitas dalam format CSV";
  }

  if (cleanPath.includes("/user")) return "data staff/user";

  if (cleanPath.includes("/osint/data/sync")) return "sinkronisasi data OSINT";
  if (cleanPath.includes("/osint/reference/sync")) return "sinkronisasi korelasi OSINT-HUMINT";
  if (cleanPath.includes("/osint/x-crawler/run")) return "crawler data X";
  if (cleanPath.includes("/osint/bmkg/run")) return "crawler data BMKG";
  if (cleanPath.includes("/osint/data")) return "data OSINT";
  if (cleanPath.includes("/osint/reference")) return "referensi OSINT-HUMINT";
  if (cleanPath.includes("/osint")) return "menu OSINT";

  if (cleanPath.includes("/humint")) return "data HUMINT";
  if (cleanPath.includes("/laporan")) return "laporan HUMINT";
  if (cleanPath.includes("/identifikasi")) return "identifikasi laporan";
  if (cleanPath.includes("/verifikasi")) return "verifikasi laporan";
  if (cleanPath.includes("/analisis")) return "analisis sistem";
  if (cleanPath.includes("/dss")) return "DSS scoring";

  if (cleanPath.includes("/data-kecamatan")) return "data kecamatan";
  if (cleanPath.includes("/data_kelurahan") || cleanPath.includes("/data-kelurahan")) return "data kelurahan";
  if (cleanPath.includes("/data_keyword") || cleanPath.includes("/data-keyword")) return "data keyword";
  if (cleanPath.includes("/jenis_bencana") || cleanPath.includes("/jenis-bencana")) return "jenis bencana";
  if (cleanPath.includes("/nama_bencana") || cleanPath.includes("/nama-bencana")) return "nama bencana";

  if (cleanPath.includes("/tiktok")) return "data TikTok";
  if (cleanPath.includes("/upload")) return "file upload";
  if (cleanPath.includes("/profile")) return "profile user";

  return `endpoint ${path}`;
}

function buildActivityName(req, res) {
  const method = String(req?.method || "GET").toUpperCase();
  const path = getRequestPath(req);
  const queryText = getRequestQueryText(req);
  const statusCode = Number(res?.statusCode || 0);

  const label = getRouteLabel(path);
  const methodLabel = getMethodLabel(method);

  const params = req?.params || {};
  const body = req?.body || {};

  const id =
    params.id ||
    params.osintId ||
    params.laporanId ||
    params.userId ||
    body.id ||
    body.osint_id ||
    body.laporan_id ||
    body.usr_id ||
    null;

  let activity = `${methodLabel} ${label}`;

  if (id) {
    activity += ` ID ${id}`;
  }

  if (method === "DELETE" && Array.isArray(body.ids)) {
    activity += ` (${body.ids.length} data terpilih)`;
  }

  if (path.includes("/sync")) {
    activity = `${methodLabel} ${label}`;
  }

  if (path.includes("/run")) {
    activity = `${methodLabel} ${label}`;
  }

  if (path.includes("/verify")) {
    activity = `Memverifikasi ${label}${id ? ` ID ${id}` : ""}`;
  }

  if (path.includes("/recalculate-score")) {
    activity = `Menghitung ulang score ${label}${id ? ` ID ${id}` : ""}`;
  }

  if (statusCode >= 400) {
    activity = `Gagal ${activity.charAt(0).toLowerCase()}${activity.slice(1)}`;
  }

  activity += ` [${method} ${path}${queryText}]`;

  if (statusCode) {
    activity += ` status ${statusCode}`;
  }

  return activity;
}

function shouldSkipAutoLog(req) {
  const method = String(req?.method || "").toUpperCase();
  const path = getRequestPath(req).toLowerCase();

  if (method === "OPTIONS") return true;

  if (path.startsWith("/uploads")) return true;
  if (path.startsWith("/static")) return true;
  if (path.startsWith("/public")) return true;
  if (path.includes("/favicon")) return true;

  /**
   * Endpoint ini memang dibuat khusus untuk mencatat download CSV.
   * Kalau auto-log juga mencatat endpoint ini, hasilnya bisa dobel.
   */
  if (path === "/log-aktivitas/catat-download-csv") return true;

  return false;
}

/**
 * Simpan log aktivitas ke database.
 *
 * Urutan resolusi actor:
 * options.actor → req.user → JWT token → header → body/query fallback
 */
async function createLogAktivitas({
  req = null,
  actor = null,
  namaAktivitas,
  transaction = null,
}) {
  try {
    if (!namaAktivitas) return null;

    const directActor = getActorFromObject(actor);
    const requestActor = req ? getActorFromReq(req) : {};

    const finalActor = {
      usr_id: directActor.usr_id || requestActor.usr_id || 0,
      nama_user: directActor.nama_user || requestActor.nama_user || "System",
      role: directActor.role || requestActor.role || "staff",
    };

    if (
      (!finalActor.usr_id || finalActor.usr_id <= 0) &&
      finalActor.nama_user &&
      finalActor.nama_user !== "System"
    ) {
      try {
        const userFound = await db.user.findOne({
          where: { usr_nama_lengkap: finalActor.nama_user },
          attributes: ["usr_id", "usr_nama_lengkap", "usr_role"],
        });

        if (userFound) {
          finalActor.usr_id = userFound.usr_id;
          finalActor.role = finalActor.role || userFound.usr_role || "staff";
        }
      } catch (lookupErr) {
        console.warn("Lookup user untuk log gagal:", lookupErr.message);
      }
    }

    if (!finalActor.usr_id || finalActor.usr_id <= 0) {
      console.warn("[activityLogger] Log dilewati, usr_id tidak ditemukan:", namaAktivitas);
      return null;
    }

    return await db.log_aktivitas.create(
      {
        usr_id: finalActor.usr_id,
        nama_user: finalActor.nama_user,
        role: finalActor.role,
        nama_aktivitas: namaAktivitas,
        waktu_aktivitas: new Date(),
      },
      transaction ? { transaction } : undefined
    );
  } catch (error) {
    console.error("[activityLogger] Gagal menyimpan log aktivitas:", error.message);
    return null;
  }
}

/**
 * Middleware otomatis untuk mencatat semua aktivitas staff/admin.
 *
 * Pasang middleware ini di index.js/app.js sebelum route utama:
 *
 * const { autoLogAktivitas } = require("./src/utils/activityLogger");
 * app.use(autoLogAktivitas({ logGet: true }));
 */
function autoLogAktivitas(options = {}) {
  const {
    logGet = true,
    logSuccess = true,
    logFailed = true,
  } = options;

  return function activityLoggerMiddleware(req, res, next) {
    if (shouldSkipAutoLog(req)) {
      return next();
    }

    const method = String(req.method || "GET").toUpperCase();

    if (!logGet && method === "GET") {
      return next();
    }

    res.on("finish", async () => {
      try {
        const statusCode = Number(res.statusCode || 0);

        if (statusCode < 400 && !logSuccess) return;
        if (statusCode >= 400 && !logFailed) return;

        const actor = getActorFromReq(req);

        if (!isStaffOrAdmin(actor)) {
          return;
        }

        const namaAktivitas = buildActivityName(req, res);

        await createLogAktivitas({
          req,
          actor,
          namaAktivitas,
        });
      } catch (error) {
        console.error("[activityLogger] Auto log gagal:", error.message);
      }
    });

    return next();
  };
}

module.exports = {
  createLogAktivitas,
  getActorFromReq,
  getActorFromObject,
  autoLogAktivitas,
};