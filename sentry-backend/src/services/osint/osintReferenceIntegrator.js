"use strict";

const { Op } = require("sequelize");
const models = require("../../models");

const Laporan = models.laporan;
const OsintData = models.osint_data;
const OsintReference = models.osint_reference;
const DataKeyword = models.data_keyword;
const DataKecamatan = models.data_kecamatan;
const DataKelurahan = models.data_kelurahan;
const NamaBencana = models.nama_bencana;
const JenisBencana = models.jenis_bencana;

const OSINT_REFERENCE_MAX_DATA_AGE_DAYS = Number(
  process.env.OSINT_REFERENCE_MAX_DATA_AGE_DAYS || 30
);

const OSINT_REFERENCE_MAX_TIME_DIFF_HOURS = Number(
  process.env.OSINT_REFERENCE_MAX_TIME_DIFF_HOURS || 72
);

const OSINT_REFERENCE_MATCHED_TIME_HOURS = Number(
  process.env.OSINT_REFERENCE_MATCHED_TIME_HOURS || 24
);

const OSINT_REFERENCE_RADIUS_KM = Number(
  process.env.OSINT_REFERENCE_RADIUS_KM || 5
);

const OSINT_REFERENCE_MAX_PER_LAPORAN = Number(
  process.env.OSINT_REFERENCE_MAX_PER_LAPORAN || 5
);

const OSINT_REFERENCE_SAVE_REVIEW = String(
  process.env.OSINT_REFERENCE_SAVE_REVIEW || "true"
).toLowerCase() !== "false";

const KEYWORD_TOKEN_MATCH_RATIO = Number(
  process.env.OSINT_REFERENCE_KEYWORD_TOKEN_MATCH_RATIO || 0.75
);

const KEYWORD_MIN_TOKEN_MATCH = Number(
  process.env.OSINT_REFERENCE_KEYWORD_MIN_TOKEN_MATCH || 3
);

const KEYWORD_MIN_TOKEN_LENGTH = Number(
  process.env.OSINT_REFERENCE_KEYWORD_MIN_TOKEN_LENGTH || 3
);

const GENERIC_LOCATION_TOKENS = new Set([
  "kota",
  "kabupaten",
  "malang",
  "jawa",
  "timur",
  "jatim",
  "provinsi",
  "kecamatan",
  "kelurahan",
  "desa",
  "jalan",
  "jl",
  "rt",
  "rw",
]);

function normalizeText(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/www\.\S+/g, " ")
    .replace(/[@#]/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function safeDate(value) {
  if (!value) return null;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return date;
}

function safeNumber(value) {
  if (value === null || value === undefined || value === "") return null;

  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
}

function toRawJsonString(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") return value;

  try {
    return JSON.stringify(value);
  } catch {
    return JSON.stringify({
      error: "REFERENCE_RAW_JSON_STRINGIFY_FAILED",
      value: String(value),
    });
  }
}

function getField(row, names, fallback = null) {
  for (const name of names) {
    if (row && row[name] !== undefined && row[name] !== null && row[name] !== "") {
      return row[name];
    }
  }

  return fallback;
}

function uniqueArray(values) {
  return [...new Set(values.filter(Boolean))];
}

function getTextTokens(value) {
  return uniqueArray(
    normalizeText(value)
      .split(" ")
      .map((token) => token.trim())
      .filter((token) => token.length >= KEYWORD_MIN_TOKEN_LENGTH)
  );
}

function buildWordSet(text) {
  return new Set(getTextTokens(text));
}

function getKeywordValue(row) {
  return (
    row?.keyword ||
    row?.data_keyword ||
    row?.nama_keyword ||
    row?.keyword_name ||
    row?.name ||
    ""
  );
}

function getKeywordTerms(keywordRows = []) {
  const seen = new Set();
  const result = [];

  for (const row of keywordRows) {
    const value = String(getKeywordValue(row) || "").trim();
    const key = normalizeText(value);

    if (!value || !key || seen.has(key)) continue;

    seen.add(key);
    result.push(value);
  }

  return result;
}

function isKeywordMatched(sourceText, keyword) {
  const normalizedSource = normalizeText(sourceText);
  const normalizedKeyword = normalizeText(keyword);

  if (!normalizedSource || !normalizedKeyword) return false;

  if (normalizedSource.includes(normalizedKeyword)) {
    return true;
  }

  const keywordTokens = getTextTokens(keyword);
  if (!keywordTokens.length) return false;

  const sourceWordSet = buildWordSet(sourceText);

  if (keywordTokens.length === 1) {
    return sourceWordSet.has(keywordTokens[0]);
  }

  const matchedTokenCount = keywordTokens.filter((token) =>
    sourceWordSet.has(token)
  ).length;

  if (keywordTokens.length === 2) {
    return matchedTokenCount === 2;
  }

  const requiredByRatio = Math.ceil(keywordTokens.length * KEYWORD_TOKEN_MATCH_RATIO);

  const requiredTokenCount = Math.max(
    Math.min(KEYWORD_MIN_TOKEN_MATCH, keywordTokens.length),
    requiredByRatio
  );

  return matchedTokenCount >= requiredTokenCount;
}

function findMatchedKeywords(sourceText, keywordRows = []) {
  const terms = getKeywordTerms(keywordRows);
  const normalizedSource = normalizeText(sourceText);

  if (!terms.length || !normalizedSource) return [];

  return terms.filter((term) => isKeywordMatched(sourceText, term));
}

function getKeywordStatus(matchedKeywords = []) {
  if (!matchedKeywords.length) return "NONE";
  return "MATCHED";
}

function getMinutesDifference(first, second) {
  const a = safeDate(first);
  const b = safeDate(second);

  if (!a || !b) return null;

  return Math.round(Math.abs(a.getTime() - b.getTime()) / (60 * 1000));
}

function getTimeMatchStatus(laporanTime, osintTime) {
  const minutes = getMinutesDifference(laporanTime, osintTime);

  if (minutes === null) return "UNKNOWN";

  const hours = minutes / 60;

  const a = safeDate(laporanTime);
  const b = safeDate(osintTime);

  const sameDay =
    a &&
    b &&
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  if (sameDay) return "SAME_DAY";
  if (hours <= 24) return "WITHIN_24_HOURS";
  if (hours <= OSINT_REFERENCE_MAX_TIME_DIFF_HOURS) return "WITHIN_72_HOURS";

  return "OUT_OF_RANGE";
}

function toRadians(value) {
  return (Number(value) * Math.PI) / 180;
}

function calculateDistanceKm(lat1, lon1, lat2, lon2) {
  const aLat = safeNumber(lat1);
  const aLon = safeNumber(lon1);
  const bLat = safeNumber(lat2);
  const bLon = safeNumber(lon2);

  if (aLat === null || aLon === null || bLat === null || bLon === null) {
    return null;
  }

  const earthRadiusKm = 6371;
  const dLat = toRadians(bLat - aLat);
  const dLon = toRadians(bLon - aLon);

  const x =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(aLat)) *
      Math.cos(toRadians(bLat)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));

  return Number((earthRadiusKm * c).toFixed(3));
}

function getSpecificAreaTokens(areaText) {
  return getTextTokens(areaText).filter(
    (token) => !GENERIC_LOCATION_TOKENS.has(token)
  );
}

function hasTokenOverlap(firstText, secondText) {
  const first = getSpecificAreaTokens(firstText);
  const second = getSpecificAreaTokens(secondText);

  if (!first.length || !second.length) return false;

  const secondSet = new Set(second);

  return first.some((token) => secondSet.has(token));
}

function isSameCity(firstText, secondText) {
  const first = normalizeText(firstText);
  const second = normalizeText(secondText);

  return first.includes("malang") && second.includes("malang");
}

function getLocationMatchStatus({
  laporanAreaText,
  osintAreaText,
  laporanLat,
  laporanLon,
  osintLat,
  osintLon,
}) {
  const distanceKm = calculateDistanceKm(laporanLat, laporanLon, osintLat, osintLon);

  if (distanceKm !== null && distanceKm <= OSINT_REFERENCE_RADIUS_KM) {
    return {
      status: "COORDINATE_RADIUS",
      distance_km: distanceKm,
    };
  }

  const laporanArea = normalizeText(laporanAreaText);
  const osintArea = normalizeText(osintAreaText);

  if (!laporanArea || !osintArea) {
    return {
      status: "NONE",
      distance_km: distanceKm,
    };
  }

  if (hasTokenOverlap(laporanAreaText, osintAreaText)) {
    return {
      status: "TEXT_MATCH",
      distance_km: distanceKm,
    };
  }

  if (isSameCity(laporanAreaText, osintAreaText)) {
    return {
      status: "SAME_CITY",
      distance_km: distanceKm,
    };
  }

  return {
    status: "NONE",
    distance_km: distanceKm,
  };
}

function isRejectedLaporan(row) {
  const text = normalizeText(
    [
      row.verifikasi,
      row.identifikasi,
      row.analisis_sistem,
      row.status_laporan,
      row.status,
    ].join(" ")
  );

  return text.includes("ditolak") || text.includes("rejected");
}

function isRejectedOsint(row) {
  return (
    row.osint_verification_status === "DITOLAK" ||
    row.osint_analysis_status === "REJECTED" ||
    row.osint_match_status === "REJECTED"
  );
}

function buildLaporanAreaText(row, areaMaps = {}) {
  const kecamatanName =
    areaMaps.kecamatanById.get(String(row.id_kecamatan)) ||
    row.kecamatan ||
    row.nama_kecamatan ||
    null;

  const kelurahanName =
    areaMaps.kelurahanById.get(String(row.id_kelurahan)) ||
    row.kelurahan ||
    row.nama_kelurahan ||
    null;

  return [
    row.alamat_lengkap_kejadian,
    row.jenis_lokasi,
    kelurahanName,
    kecamatanName,
    "Kota Malang",
  ]
    .filter(Boolean)
    .join(", ");
}

function buildLaporanEventText(row, masterMaps = {}) {
  const namaBencana =
    masterMaps.namaBencanaById.get(String(row.id_bencana)) ||
    row.nama_bencana ||
    row.jenis_bencana ||
    null;

  const jenisBencana =
    masterMaps.jenisBencanaById.get(String(row.id_jenis)) ||
    row.jenis_laporan ||
    row.jenis_bencana ||
    null;

  return [
    namaBencana,
    jenisBencana,
    row.jenis_laporan,
    row.kronologi,
    row.alamat_lengkap_kejadian,
    row.jenis_lokasi,
  ]
    .filter(Boolean)
    .join(" ");
}

function buildOsintText(row) {
  return [
    row.osint_event_type,
    row.osint_content,
    row.osint_area_text,
    row.osint_hashtags,
    row.osint_weather_desc,
    row.osint_warning_event,
    row.osint_warning_headline,
    row.osint_warning_description,
    row.osint_bmkg_source_type,
  ]
    .filter(Boolean)
    .join(" ");
}

function getEventMatchStatus(laporanText, osintText, matchedKeywords) {
  if (!matchedKeywords.length) return "NONE";

  const laporanNormalized = normalizeText(laporanText);
  const osintNormalized = normalizeText(osintText);

  const sameKeywordAppearsOnBoth = matchedKeywords.some((keyword) => {
    const normalizedKeyword = normalizeText(keyword);
    return (
      laporanNormalized.includes(normalizedKeyword) &&
      osintNormalized.includes(normalizedKeyword)
    );
  });

  if (sameKeywordAppearsOnBoth) return "SAME_EVENT";

  if (
    laporanNormalized.includes("banjir") &&
    osintNormalized.includes("banjir")
  ) {
    return "SAME_EVENT";
  }

  if (
    laporanNormalized.includes("longsor") &&
    osintNormalized.includes("longsor")
  ) {
    return "SAME_EVENT";
  }

  if (
    laporanNormalized.includes("angin") &&
    osintNormalized.includes("angin")
  ) {
    return "SAME_EVENT";
  }

  if (
    laporanNormalized.includes("gempa") &&
    osintNormalized.includes("gempa")
  ) {
    return "SAME_EVENT";
  }

  return "RELATED_EVENT";
}

function isStrongTimeStatus(status) {
  return status === "SAME_DAY" || status === "WITHIN_24_HOURS";
}

function isReviewTimeStatus(status) {
  return (
    status === "SAME_DAY" ||
    status === "WITHIN_24_HOURS" ||
    status === "WITHIN_72_HOURS" ||
    status === "UNKNOWN"
  );
}

function isStrongLocationStatus(status) {
  return (
    status === "COORDINATE_RADIUS" ||
    status === "TEXT_MATCH" ||
    status === "SAME_KELURAHAN" ||
    status === "SAME_KECAMATAN"
  );
}

function shouldSaveReference(referenceStatus) {
  if (referenceStatus === "MATCHED") return true;
  if (referenceStatus === "REVIEW" && OSINT_REFERENCE_SAVE_REVIEW) return true;

  return false;
}

function resolveReferenceStatus({
  keywordMatchStatus,
  eventMatchStatus,
  locationMatchStatus,
  timeMatchStatus,
}) {
  if (keywordMatchStatus === "NONE") return "REJECTED";
  if (eventMatchStatus === "NONE") return "REJECTED";

  const hasStrongLocation = isStrongLocationStatus(locationMatchStatus);
  const hasStrongTime = isStrongTimeStatus(timeMatchStatus);

  if (hasStrongLocation && hasStrongTime) {
    return "MATCHED";
  }

  const hasAnyLocation = locationMatchStatus !== "NONE";
  const hasReviewTime = isReviewTimeStatus(timeMatchStatus);

  if (hasAnyLocation || hasReviewTime || eventMatchStatus !== "NONE") {
    return "REVIEW";
  }

  return "REJECTED";
}

function buildReferenceReason({
  matchedKeywords,
  eventMatchStatus,
  locationMatchStatus,
  timeMatchStatus,
  timeDiffMinutes,
  distanceKm,
}) {
  const reasons = [];

  if (matchedKeywords.length) {
    reasons.push(`Keyword cocok: ${matchedKeywords.join(", ")}.`);
  }

  if (eventMatchStatus !== "NONE") {
    reasons.push(`Jenis kejadian: ${eventMatchStatus}.`);
  }

  if (locationMatchStatus !== "NONE") {
    reasons.push(`Lokasi cocok: ${locationMatchStatus}.`);
  }

  if (distanceKm !== null && distanceKm !== undefined) {
    reasons.push(`Jarak koordinat: ${distanceKm} km.`);
  }

  if (timeMatchStatus !== "UNKNOWN") {
    reasons.push(`Waktu cocok: ${timeMatchStatus}.`);
  }

  if (timeDiffMinutes !== null && timeDiffMinutes !== undefined) {
    reasons.push(`Selisih waktu: ${timeDiffMinutes} menit.`);
  }

  return reasons.join(" ");
}

function getRank(reference) {
  const statusRank = {
    MATCHED: 3,
    REVIEW: 2,
    REJECTED: 1,
  };

  const locationRank = {
    COORDINATE_RADIUS: 5,
    SAME_KELURAHAN: 5,
    SAME_KECAMATAN: 4,
    TEXT_MATCH: 3,
    SAME_CITY: 2,
    NONE: 0,
  };

  const timeRank = {
    SAME_DAY: 4,
    WITHIN_24_HOURS: 3,
    WITHIN_72_HOURS: 2,
    UNKNOWN: 1,
    OUT_OF_RANGE: 0,
    NONE: 0,
  };

  return {
    status: statusRank[reference.reference_status] || 0,
    location: locationRank[reference.location_match_status] || 0,
    time: timeRank[reference.time_match_status] || 0,
    keyword: String(reference.matched_keywords || "")
      .split(",")
      .filter(Boolean).length,
    timeDiff: reference.time_diff_minutes ?? 999999,
    distance: reference.distance_km ?? 999999,
  };
}

function sortReferences(first, second) {
  const a = getRank(first);
  const b = getRank(second);

  if (b.status !== a.status) return b.status - a.status;
  if (b.location !== a.location) return b.location - a.location;
  if (b.time !== a.time) return b.time - a.time;
  if (b.keyword !== a.keyword) return b.keyword - a.keyword;
  if (a.timeDiff !== b.timeDiff) return a.timeDiff - b.timeDiff;

  return a.distance - b.distance;
}

async function loadMasterMaps() {
  const kecamatanById = new Map();
  const kelurahanById = new Map();
  const namaBencanaById = new Map();
  const jenisBencanaById = new Map();

  if (DataKecamatan) {
    const rows = await DataKecamatan.findAll({ raw: true });
    for (const row of rows) {
      const id = getField(row, ["id_kecamatan", "kecamatan_id", "data_kecamatan_id"]);
      const name = getField(row, ["nama_kecamatan", "kecamatan", "name"]);

      if (id && name) kecamatanById.set(String(id), String(name));
    }
  }

  if (DataKelurahan) {
    const rows = await DataKelurahan.findAll({ raw: true });
    for (const row of rows) {
      const id = getField(row, ["id_kelurahan", "kelurahan_id", "data_kelurahan_id"]);
      const name = getField(row, ["nama_kelurahan", "kelurahan", "name"]);

      if (id && name) kelurahanById.set(String(id), String(name));
    }
  }

  if (NamaBencana) {
    const rows = await NamaBencana.findAll({ raw: true });
    for (const row of rows) {
      const id = getField(row, ["id_bencana", "nama_bencana_id", "bencana_id"]);
      const name = getField(row, ["nama_bencana", "bencana", "name"]);

      if (id && name) namaBencanaById.set(String(id), String(name));
    }
  }

  if (JenisBencana) {
    const rows = await JenisBencana.findAll({ raw: true });
    for (const row of rows) {
      const id = getField(row, ["id_jenis", "jenis_bencana_id", "jenis_id"]);
      const name = getField(row, ["jenis_bencana", "nama_jenis", "jenis", "name"]);

      if (id && name) jenisBencanaById.set(String(id), String(name));
    }
  }

  return {
    kecamatanById,
    kelurahanById,
    namaBencanaById,
    jenisBencanaById,
  };
}

function buildReferencePayload(laporan, osint, keywordRows, masterMaps) {
  const laporanEventTime = laporan.waktu_kejadian || laporan.waktu_laporan || null;
  const osintEventTime =
    osint.osint_event_time ||
    osint.osint_post_time ||
    osint.creation_date ||
    null;

  const laporanAreaText = buildLaporanAreaText(laporan, masterMaps);
  const osintAreaText = osint.osint_area_text || null;

  const laporanEventText = buildLaporanEventText(laporan, masterMaps);
  const osintText = buildOsintText(osint);

  const combinedText = [laporanEventText, laporanAreaText, osintText, osintAreaText]
    .filter(Boolean)
    .join(" ");

  const matchedKeywords = findMatchedKeywords(combinedText, keywordRows);
  const keywordMatchStatus = getKeywordStatus(matchedKeywords);

  const eventMatchStatus = getEventMatchStatus(
    laporanEventText,
    osintText,
    matchedKeywords
  );

  const location = getLocationMatchStatus({
    laporanAreaText,
    osintAreaText,
    laporanLat: laporan.latitude,
    laporanLon: laporan.longitude,
    osintLat: osint.osint_latitude,
    osintLon: osint.osint_longitude,
  });

  const timeMatchStatus = getTimeMatchStatus(laporanEventTime, osintEventTime);
  const timeDiffMinutes = getMinutesDifference(laporanEventTime, osintEventTime);

  const referenceStatus = resolveReferenceStatus({
    keywordMatchStatus,
    eventMatchStatus,
    locationMatchStatus: location.status,
    timeMatchStatus,
  });

  const referenceReason = buildReferenceReason({
    matchedKeywords,
    eventMatchStatus,
    locationMatchStatus: location.status,
    timeMatchStatus,
    timeDiffMinutes,
    distanceKm: location.distance_km,
  });

  return {
    laporan_id: laporan.laporan_id,
    osint_id: osint.osint_id,

    reference_source: "AUTO",
    reference_status: referenceStatus,
    reference_method: "KEYWORD_LOCATION_TIME_RULE",

    matched_keywords: matchedKeywords.join(", "),

    keyword_match_status: keywordMatchStatus,
    event_match_status: eventMatchStatus,
    location_match_status: location.status,
    time_match_status: timeMatchStatus,

    laporan_event_time: laporanEventTime,
    osint_event_time: osintEventTime,
    time_diff_minutes: timeDiffMinutes,

    laporan_latitude: laporan.latitude || null,
    laporan_longitude: laporan.longitude || null,
    osint_latitude: osint.osint_latitude || null,
    osint_longitude: osint.osint_longitude || null,
    distance_km: location.distance_km,

    laporan_area_text: laporanAreaText || null,
    osint_area_text: osintAreaText || null,

    reference_reason: referenceReason,

    reference_raw_json: toRawJsonString({
      rule: "KEYWORD_LOCATION_TIME_RULE",
      matched_keywords: matchedKeywords,
      laporan: {
        laporan_id: laporan.laporan_id,
        id_bencana: laporan.id_bencana,
        id_jenis: laporan.id_jenis,
        id_kecamatan: laporan.id_kecamatan,
        id_kelurahan: laporan.id_kelurahan,
        kronologi: laporan.kronologi,
        waktu_kejadian: laporan.waktu_kejadian,
        waktu_laporan: laporan.waktu_laporan,
        area_text: laporanAreaText,
      },
      osint: {
        osint_id: osint.osint_id,
        osint_source: osint.osint_source,
        osint_event_type: osint.osint_event_type,
        osint_area_text: osint.osint_area_text,
        osint_content: osint.osint_content,
        osint_event_time: osint.osint_event_time,
        osint_post_time: osint.osint_post_time,
      },
      evaluation: {
        keyword_match_status: keywordMatchStatus,
        event_match_status: eventMatchStatus,
        location_match_status: location.status,
        time_match_status: timeMatchStatus,
        time_diff_minutes: timeDiffMinutes,
        distance_km: location.distance_km,
        reference_status: referenceStatus,
      },
    }),

    last_updated_by: "system",
    last_update_date: new Date(),
  };
}

async function upsertOsintReference(payload) {
  const existing = await OsintReference.findOne({
    where: {
      laporan_id: payload.laporan_id,
      osint_id: payload.osint_id,
    },
  });

  if (existing) {
    const plain = existing.get({ plain: true });

    if (plain.reference_status === "REJECTED" && plain.verified_by) {
      return "skipped_manual_rejected";
    }

    await existing.update({
      ...payload,
      last_update_date: new Date(),
    });

    return "updated";
  }

  await OsintReference.create({
    ...payload,
    created_by: "system",
    creation_date: new Date(),
    last_updated_by: "system",
    last_update_date: new Date(),
  });

  return "created";
}

async function getKeywordRows() {
  if (!DataKeyword) return [];

  return DataKeyword.findAll({
    raw: true,
  });
}

async function syncOsintReferences({ includeRecords = false } = {}) {
  if (!Laporan || !OsintData || !OsintReference) {
    return {
      ok: false,
      message: "Model laporan, osint_data, atau osint_reference belum terdaftar.",
    };
  }

  const keywordRows = await getKeywordRows();
  const keywordTerms = getKeywordTerms(keywordRows);

  if (!keywordTerms.length) {
    return {
      ok: false,
      message:
        "Tabel data_keyword kosong. Sinkronisasi osint_reference dibatalkan.",
      keyword_count: 0,
      finished_at: new Date().toISOString(),
    };
  }

  const masterMaps = await loadMasterMaps();

  const cutoff = new Date(
    Date.now() - OSINT_REFERENCE_MAX_DATA_AGE_DAYS * 24 * 60 * 60 * 1000
  );

  const laporanRows = await Laporan.findAll({
    where: {
      [Op.or]: [
        {
          waktu_kejadian: {
            [Op.gte]: cutoff,
          },
        },
        {
          waktu_laporan: {
            [Op.gte]: cutoff,
          },
        },
        {
          creation_date: {
            [Op.gte]: cutoff,
          },
        },
      ],
    },
    raw: true,
  });

  const osintRows = await OsintData.findAll({
    where: {
      [Op.or]: [
        {
          osint_event_time: {
            [Op.gte]: cutoff,
          },
        },
        {
          osint_post_time: {
            [Op.gte]: cutoff,
          },
        },
        {
          creation_date: {
            [Op.gte]: cutoff,
          },
        },
      ],
      osint_verification_status: {
        [Op.ne]: "DITOLAK",
      },
      osint_analysis_status: {
        [Op.ne]: "REJECTED",
      },
    },
    raw: true,
  });

  let inspectedCount = 0;
  let candidateCount = 0;
  let createdCount = 0;
  let updatedCount = 0;
  let skippedCount = 0;
  let rejectedCount = 0;

  const records = [];

  for (const laporan of laporanRows) {
    if (isRejectedLaporan(laporan)) {
      skippedCount += 1;
      continue;
    }

    const candidates = [];

    for (const osint of osintRows) {
      inspectedCount += 1;

      if (isRejectedOsint(osint)) {
        rejectedCount += 1;
        continue;
      }

      const payload = buildReferencePayload(
        laporan,
        osint,
        keywordRows,
        masterMaps
      );

      if (!shouldSaveReference(payload.reference_status)) {
        rejectedCount += 1;
        continue;
      }

      candidates.push(payload);
    }

    candidates.sort(sortReferences);

    const selectedCandidates = candidates.slice(0, OSINT_REFERENCE_MAX_PER_LAPORAN);

    candidateCount += selectedCandidates.length;

    for (const payload of selectedCandidates) {
      const status = await upsertOsintReference(payload);

      if (status === "created") createdCount += 1;
      else if (status === "updated") updatedCount += 1;
      else skippedCount += 1;

      if (includeRecords) {
        records.push({
          laporan_id: payload.laporan_id,
          osint_id: payload.osint_id,
          reference_status: payload.reference_status,
          keyword_match_status: payload.keyword_match_status,
          event_match_status: payload.event_match_status,
          location_match_status: payload.location_match_status,
          time_match_status: payload.time_match_status,
          matched_keywords: payload.matched_keywords,
          reference_reason: payload.reference_reason,
          saved: status === "created" || status === "updated",
          status,
        });
      }
    }
  }

  const result = {
    ok: true,
    max_data_age_days: OSINT_REFERENCE_MAX_DATA_AGE_DAYS,
    keyword_source: "data_keyword",
    keyword_count: keywordTerms.length,
    save_review: OSINT_REFERENCE_SAVE_REVIEW,
    max_per_laporan: OSINT_REFERENCE_MAX_PER_LAPORAN,
    inspected_pair_count: inspectedCount,
    candidate_count: candidateCount,
    created_count: createdCount,
    updated_count: updatedCount,
    skipped_count: skippedCount,
    rejected_count: rejectedCount,
    finished_at: new Date().toISOString(),
  };

  if (includeRecords) {
    result.records = records;
  }

  return result;
}

async function getReferencesForOsintIds(osintIds = []) {
  const ids = osintIds.map((id) => Number(id)).filter(Boolean);

  if (!ids.length) return {};

  const refs = await OsintReference.findAll({
    where: {
      osint_id: {
        [Op.in]: ids,
      },
      reference_status: {
        [Op.in]: ["MATCHED", "REVIEW"],
      },
    },
    raw: true,
    order: [
      ["reference_status", "ASC"],
      ["last_update_date", "DESC"],
    ],
  });

  const laporanIds = refs.map((item) => item.laporan_id).filter(Boolean);

  const laporanRows = laporanIds.length
    ? await Laporan.findAll({
        where: {
          laporan_id: {
            [Op.in]: laporanIds,
          },
        },
        raw: true,
      })
    : [];

  const laporanMap = laporanRows.reduce((acc, item) => {
    acc[item.laporan_id] = item;
    return acc;
  }, {});

  const result = {};

  for (const ref of refs) {
    if (!result[ref.osint_id]) {
      result[ref.osint_id] = [];
    }

    result[ref.osint_id].push({
      ...ref,
      laporan: laporanMap[ref.laporan_id] || null,
    });
  }

  return result;
}

async function getReferencesForLaporan(laporanId) {
  const refs = await OsintReference.findAll({
    where: {
      laporan_id: laporanId,
      reference_status: {
        [Op.in]: ["MATCHED", "REVIEW"],
      },
    },
    raw: true,
    order: [
      ["reference_status", "ASC"],
      ["last_update_date", "DESC"],
    ],
  });

  const osintIds = refs.map((item) => item.osint_id).filter(Boolean);

  const osintRows = osintIds.length
    ? await OsintData.findAll({
        where: {
          osint_id: {
            [Op.in]: osintIds,
          },
        },
        raw: true,
      })
    : [];

  const osintMap = osintRows.reduce((acc, item) => {
    acc[item.osint_id] = item;
    return acc;
  }, {});

  return refs.map((ref) => ({
    ...ref,
    osint_data: osintMap[ref.osint_id] || null,
  }));
}

module.exports = {
  syncOsintReferences,
  getReferencesForOsintIds,
  getReferencesForLaporan,
};