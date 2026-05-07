"use strict";

const { Op } = require("sequelize");
const models = require("../../models");
const {
  calculateOsintScore,
  normalizeText,
  getKeywordTerms,
} = require("./osintDataScoring");

const OsintData = models.osint_data;
const OsintDataScore = models.osint_data_score;
const OsintDataX = models.osint_data_x;
const OsintDataBmkg = models.osint_data_bmkg;
const DataKeyword = models.data_keyword;

const OSINT_MAX_DATA_AGE_DAYS = Number(process.env.OSINT_MAX_DATA_AGE_DAYS || 30);

const OSINT_KEYWORD_TOKEN_MATCH_RATIO = Number(
  process.env.OSINT_KEYWORD_TOKEN_MATCH_RATIO || 0.75
);

const OSINT_KEYWORD_MIN_TOKEN_MATCH = Number(
  process.env.OSINT_KEYWORD_MIN_TOKEN_MATCH || 3
);

const OSINT_KEYWORD_MIN_TOKEN_LENGTH = Number(
  process.env.OSINT_KEYWORD_MIN_TOKEN_LENGTH || 3
);

const OSINT_CORRELATION_MAX_HOURS = Number(
  process.env.OSINT_CORRELATION_MAX_HOURS || 24
);

const OSINT_CORRELATION_MIN_SCORE = Number(
  process.env.OSINT_CORRELATION_MIN_SCORE || 75
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

function safeDate(value) {
  if (!value) return null;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return null;

  return date;
}

function safeJson(value) {
  if (!value) return null;
  if (typeof value === "object") return value;

  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function toRawJsonString(value) {
  if (value === null || value === undefined) return null;

  if (typeof value === "string") return value;

  try {
    return JSON.stringify(value);
  } catch {
    return JSON.stringify({
      error: "RAW_JSON_STRINGIFY_FAILED",
      value: String(value),
    });
  }
}

function isWithinLastDays(value, days = OSINT_MAX_DATA_AGE_DAYS) {
  const date = safeDate(value);

  if (!date) return false;

  const cutoff = Date.now() - Number(days) * 24 * 60 * 60 * 1000;

  return date.getTime() >= cutoff;
}

function getXText(row) {
  const raw = safeJson(row.osint_raw_json);
  const worker = raw?.worker_record || raw?.original || raw || {};

  return (
    worker.full_text ||
    worker.text ||
    worker.content ||
    worker.description ||
    row.osint_content ||
    ""
  );
}

function uniqueArray(values) {
  return [...new Set(values.filter(Boolean))];
}

function getTextTokens(value) {
  return uniqueArray(
    normalizeText(value)
      .split(" ")
      .map((token) => token.trim())
      .filter((token) => token.length >= OSINT_KEYWORD_MIN_TOKEN_LENGTH)
  );
}

function buildWordSet(text) {
  return new Set(getTextTokens(text));
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

  const requiredByRatio = Math.ceil(
    keywordTokens.length * OSINT_KEYWORD_TOKEN_MATCH_RATIO
  );

  const requiredTokenCount = Math.max(
    Math.min(OSINT_KEYWORD_MIN_TOKEN_MATCH, keywordTokens.length),
    requiredByRatio
  );

  return matchedTokenCount >= requiredTokenCount;
}

function findMatchedKeywords(text, keywordRows = []) {
  const source = normalizeText(text);
  const terms = getKeywordTerms(keywordRows);

  if (!source || !terms.length) return [];

  return terms.filter((term) => isKeywordMatched(text, term));
}

function findMatchedKeyword(text, keywordRows = []) {
  const matchedKeywords = findMatchedKeywords(text, keywordRows);

  if (!matchedKeywords.length) return null;

  const sortedTerms = [...matchedKeywords].sort((a, b) => {
    return normalizeText(b).length - normalizeText(a).length;
  });

  return sortedTerms[0] || null;
}

function normalizeEventTypeFromKeyword(keyword) {
  const value = normalizeText(keyword)
    .toUpperCase()
    .replace(/\s+/g, "_")
    .replace(/[^A-Z0-9_]/g, "");

  return value || "BENCANA";
}

function detectEventType(text, keywordRows = []) {
  const matchedKeyword = findMatchedKeyword(text, keywordRows);

  if (!matchedKeyword) return "BENCANA";

  return normalizeEventTypeFromKeyword(matchedKeyword);
}

function getPriority(priority) {
  const value = String(priority || "").toUpperCase();

  if (value === "KRITIS") return "KRITIS";
  if (value === "TINGGI") return "TINGGI";
  if (value === "SEDANG") return "SEDANG";

  return "RENDAH";
}

function getHigherPriority(first, second) {
  const rank = {
    RENDAH: 1,
    SEDANG: 2,
    TINGGI: 3,
    KRITIS: 4,
  };

  const a = String(first || "RENDAH").toUpperCase();
  const b = String(second || "RENDAH").toUpperCase();

  return rank[b] > rank[a] ? b : a;
}

function buildBmkgContent(row) {
  const sourceType = row.source_type;

  if (String(sourceType || "").startsWith("GEMPA")) {
    return [
      "Data BMKG Gempa",
      row.magnitude ? `Magnitudo ${row.magnitude}` : null,
      row.kedalaman_km ? `Kedalaman ${row.kedalaman_km} km` : null,
      row.wilayah_episenter ? `Wilayah ${row.wilayah_episenter}` : null,
      row.potensi_tsunami ? `Potensi tsunami: ${row.potensi_tsunami}` : null,
      row.dirasakan ? `Dirasakan: ${row.dirasakan}` : null,
    ]
      .filter(Boolean)
      .join(". ");
  }

  if (sourceType === "PRAKIRAAN_CUACA") {
    return [
      "Data BMKG Prakiraan Cuaca",
      row.weather_desc ? `Cuaca ${row.weather_desc}` : null,
      row.wilayah_administratif ? `Wilayah ${row.wilayah_administratif}` : null,
      row.temperature_c ? `Suhu ${row.temperature_c} C` : null,
      row.humidity_percent ? `Kelembapan ${row.humidity_percent}%` : null,
      row.wind_speed_kmh ? `Kecepatan angin ${row.wind_speed_kmh} km/jam` : null,
    ]
      .filter(Boolean)
      .join(". ");
  }

  if (sourceType === "PERINGATAN_DINI_CUACA") {
    return [
      "Data BMKG Peringatan Dini Cuaca",
      row.warning_event,
      row.warning_headline,
      row.warning_description,
      row.wilayah_administratif ? `Wilayah ${row.wilayah_administratif}` : null,
    ]
      .filter(Boolean)
      .join(". ");
  }

  return [
    "Data BMKG",
    sourceType,
    row.wilayah_administratif || row.wilayah_episenter,
    row.weather_desc,
    row.warning_headline,
  ]
    .filter(Boolean)
    .join(". ");
}

function buildXSourceText(row, text) {
  return [text, row.osint_hashtags, row.osint_location_text]
    .filter(Boolean)
    .join(" ");
}

function buildBmkgSourceText(row, content) {
  return [
    row.source_type,
    content,
    row.weather_desc,
    row.warning_event,
    row.warning_headline,
    row.warning_description,
    row.wilayah_administratif,
    row.wilayah_episenter,
    row.dirasakan,
    row.potensi_tsunami,
  ]
    .filter(Boolean)
    .join(" ");
}

function buildInvalidReason({
  sourceName,
  withinDate,
  keywordMatched,
  warningExpired = false,
}) {
  const reasons = [];

  if (!withinDate) reasons.push("out of date");
  if (warningExpired) reasons.push("expired");
  if (!keywordMatched) reasons.push("tidak cocok dengan data_keyword");

  if (!reasons.length) return `Data ${sourceName} tidak lolos filter.`;

  return `Data ${sourceName} tidak lolos filter: ${reasons.join(", ")}.`;
}

function getSpecificAreaTokens(areaText) {
  return getTextTokens(areaText).filter(
    (token) => !GENERIC_LOCATION_TOKENS.has(token)
  );
}

function hasSpecificAreaMatch(xAreaText, bmkgAreaText) {
  const xArea = normalizeText(xAreaText);
  const bmkgArea = normalizeText(bmkgAreaText);

  if (!xArea || !bmkgArea) return false;

  const xTokens = getSpecificAreaTokens(xArea);
  const bmkgTokens = getSpecificAreaTokens(bmkgArea);

  if (!xTokens.length || !bmkgTokens.length) return false;

  const xSet = new Set(xTokens);
  const bmkgSet = new Set(bmkgTokens);

  const overlap = [...xSet].filter((token) => bmkgSet.has(token));

  if (overlap.length > 0) return true;

  const xSpecific = xTokens.join(" ");
  const bmkgSpecific = bmkgTokens.join(" ");

  if (xSpecific && bmkgSpecific) {
    return xSpecific.includes(bmkgSpecific) || bmkgSpecific.includes(xSpecific);
  }

  return false;
}

function calculateHoursDifference(first, second) {
  const a = safeDate(first);
  const b = safeDate(second);

  if (!a || !b) return null;

  return Math.abs(a.getTime() - b.getTime()) / (60 * 60 * 1000);
}

function calculateCorrelation(xPayload, bmkgPayload) {
  let score = 0;
  const reasons = [];

  if (
    xPayload.osint_event_type &&
    bmkgPayload.osint_event_type &&
    xPayload.osint_event_type === bmkgPayload.osint_event_type
  ) {
    score += 30;
    reasons.push("Jenis bencana sama berdasarkan keyword dari data_keyword.");
  }

  const diffHours = calculateHoursDifference(
    xPayload.osint_post_time,
    bmkgPayload.osint_event_time
  );

  if (diffHours !== null) {
    if (diffHours <= 3) {
      score += 30;
      reasons.push("Waktu X dan BMKG sangat dekat.");
    } else if (diffHours <= 12) {
      score += 20;
      reasons.push("Waktu X dan BMKG cukup dekat.");
    } else if (diffHours <= OSINT_CORRELATION_MAX_HOURS) {
      score += 10;
      reasons.push("Waktu X dan BMKG masih relevan.");
    }
  }

  if (hasSpecificAreaMatch(xPayload.osint_area_text, bmkgPayload.osint_area_text)) {
    score += 25;
    reasons.push("Area spesifik X dan BMKG cocok.");
  }

  if (bmkgPayload.osint_verification_status === "TERVERIFIKASI_OTOMATIS") {
    score += 15;
    reasons.push("Sumber BMKG terverifikasi otomatis.");
  }

  let status = "REJECTED";

  if (score >= 75) status = "MATCHED";
  else if (score >= 50) status = "REVIEW";

  return {
    score: Math.min(score, 100),
    status,
    reason: reasons.join(" "),
    diff_hours: diffHours,
  };
}

function isCorrelationCandidate(xPayload, bmkgPayload) {
  if (!xPayload || !bmkgPayload) return false;

  if (!xPayload.osint_post_time || !bmkgPayload.osint_event_time) {
    return false;
  }

  if (
    !xPayload.osint_event_type ||
    !bmkgPayload.osint_event_type ||
    xPayload.osint_event_type !== bmkgPayload.osint_event_type
  ) {
    return false;
  }

  const diffHours = calculateHoursDifference(
    xPayload.osint_post_time,
    bmkgPayload.osint_event_time
  );

  if (diffHours === null || diffHours > OSINT_CORRELATION_MAX_HOURS) {
    return false;
  }

  if (!hasSpecificAreaMatch(xPayload.osint_area_text, bmkgPayload.osint_area_text)) {
    return false;
  }

  return true;
}

function findBestBmkgCorrelationForX(xPayload, bmkgPayloads = []) {
  let best = null;

  for (const bmkgPayload of bmkgPayloads) {
    if (!isCorrelationCandidate(xPayload, bmkgPayload)) {
      continue;
    }

    const correlation = calculateCorrelation(xPayload, bmkgPayload);

    if (correlation.score < OSINT_CORRELATION_MIN_SCORE) {
      continue;
    }

    if (!best) {
      best = {
        bmkgPayload,
        correlation,
      };
      continue;
    }

    const currentScore = Number(correlation.score || 0);
    const bestScore = Number(best.correlation.score || 0);

    const currentDiff = Number(correlation.diff_hours ?? 999999);
    const bestDiff = Number(best.correlation.diff_hours ?? 999999);

    if (
      currentScore > bestScore ||
      (currentScore === bestScore && currentDiff < bestDiff)
    ) {
      best = {
        bmkgPayload,
        correlation,
      };
    }
  }

  return best;
}

async function deleteOsintDataRows(rows = []) {
  const ids = rows.map((row) => row.osint_id).filter(Boolean);

  if (!ids.length) return 0;

  await OsintDataScore.destroy({
    where: {
      osint_id: {
        [Op.in]: ids,
      },
    },
  });

  const deleted = await OsintData.destroy({
    where: {
      osint_id: {
        [Op.in]: ids,
      },
    },
  });

  return deleted;
}

async function cleanupNonBestCorrelationsForX(osintDataxId, keepExternalKey = null) {
  if (!osintDataxId) return 0;

  const where = {
    osint_source: "X_BMKG",
    osint_datax_id: osintDataxId,
  };

  if (keepExternalKey) {
    where.osint_external_key = {
      [Op.ne]: keepExternalKey,
    };
  }

  const rows = await OsintData.findAll({
    where,
    attributes: ["osint_id"],
    raw: true,
  });

  return deleteOsintDataRows(rows);
}

async function cleanupDuplicateCorrelationRows() {
  const rows = await OsintData.findAll({
    where: {
      osint_source: "X_BMKG",
      osint_datax_id: {
        [Op.ne]: null,
      },
    },
    attributes: [
      "osint_id",
      "osint_external_key",
      "osint_datax_id",
      "osint_match_score",
      "last_update_date",
    ],
    raw: true,
  });

  const grouped = new Map();

  for (const row of rows) {
    const key = String(row.osint_datax_id);

    if (!grouped.has(key)) {
      grouped.set(key, []);
    }

    grouped.get(key).push(row);
  }

  const rowsToDelete = [];

  for (const groupRows of grouped.values()) {
    if (groupRows.length <= 1) continue;

    const sorted = [...groupRows].sort((a, b) => {
      const scoreA = Number(a.osint_match_score || 0);
      const scoreB = Number(b.osint_match_score || 0);

      if (scoreB !== scoreA) return scoreB - scoreA;

      const dateA = safeDate(a.last_update_date)?.getTime() || 0;
      const dateB = safeDate(b.last_update_date)?.getTime() || 0;

      return dateB - dateA;
    });

    rowsToDelete.push(...sorted.slice(1));
  }

  return deleteOsintDataRows(rowsToDelete);
}

function mapXToOsintData(row, keywordRows = []) {
  const text = getXText(row);
  const sourceText = buildXSourceText(row, text);
  const matchedKeywords = findMatchedKeywords(sourceText, keywordRows);
  const matchedKeyword = matchedKeywords[0] || null;

  const payload = {
    osint_external_key: `X:${row.osint_datax_id}`,
    osint_source: "X",
    osint_datax_id: row.osint_datax_id,
    osint_bmkg_id: null,

    osint_x_post_id: row.osint_x_post_id || null,

    osint_event_type: detectEventType(sourceText, keywordRows),
    osint_area_text: row.osint_location_text || null,

    osint_account_name: row.osint_account_name || null,
    osint_account_username: row.osint_account_username || null,
    osint_content: text || null,

    osint_latitude: row.osint_latitude || null,
    osint_longitude: row.osint_longitude || null,

    osint_post_time: row.osint_post_time || null,
    osint_event_time: null,

    osint_link_url: row.osint_link_url || null,
    osint_media_url: row.osint_media_url || null,
    osint_hashtags: row.osint_hashtags || null,

    osint_like_count: Number(row.osint_like_count || 0),
    osint_share_count: Number(row.osint_share_count || 0),
    osint_reply_count: Number(row.osint_comment_count || 0),
    osint_view_count: Number(row.osint_view_count || 0),
    osint_favourite_count:
      row.osint_favourite_count === null || row.osint_favourite_count === undefined
        ? null
        : Number(row.osint_favourite_count || 0),

    osint_match_score: 0,
    osint_match_method: null,
    osint_match_reason: null,
    osint_match_status: "NONE",

    osint_analysis_status: "RAW",
    osint_verification_status: "BELUM_DIVERIFIKASI",
    osint_priority_level: "SEDANG",

    osint_raw_json: toRawJsonString({
      source: "osint_data_x",
      source_id: row.osint_datax_id,
      keyword_source: "data_keyword",
      keyword_match_mode: "flexible_token",
      matched_keyword: matchedKeyword,
      matched_keywords: matchedKeywords,
      original: safeJson(row.osint_raw_json) || row,
    }),

    created_by: "system",
    last_updated_by: "system",
    last_update_date: new Date(),
  };

  const withinDate = isWithinLastDays(row.osint_post_time || row.osint_creation_date);
  const keywordMatched = matchedKeywords.length > 0;

  const isValid = withinDate && keywordMatched;

  return {
    payload,
    is_valid: isValid,
    skip_reason: !isValid
      ? buildInvalidReason({
          sourceName: "X",
          withinDate,
          keywordMatched,
        })
      : null,
  };
}

function mapBmkgToOsintData(row, keywordRows = []) {
  const content = buildBmkgContent(row);
  const eventTime =
    row.event_datetime_utc ||
    row.warning_effective ||
    row.crawled_at ||
    row.created_at ||
    null;

  const sourceText = buildBmkgSourceText(row, content);
  const matchedKeywords = findMatchedKeywords(sourceText, keywordRows);
  const matchedKeyword = matchedKeywords[0] || null;

  const payload = {
    osint_external_key: `BMKG:${row.osint_bmkg_id}`,
    osint_source: "BMKG",
    osint_datax_id: null,
    osint_bmkg_id: row.osint_bmkg_id,

    osint_x_post_id: null,

    osint_event_type: detectEventType(sourceText, keywordRows),
    osint_area_text: row.wilayah_administratif || row.wilayah_episenter || null,

    osint_account_name: "BMKG",
    osint_account_username: "BMKG",
    osint_content: content || null,

    osint_latitude: row.latitude || null,
    osint_longitude: row.longitude || null,

    osint_post_time: null,
    osint_event_time: eventTime,

    osint_link_url: row.warning_web_url || null,
    osint_media_url: null,
    osint_hashtags: null,

    osint_like_count: 0,
    osint_share_count: 0,
    osint_reply_count: 0,
    osint_view_count: 0,
    osint_favourite_count: null,

    osint_magnitude: row.magnitude || null,
    osint_depth: row.kedalaman_km || null,
    osint_tsunami_potential: row.potensi_tsunami || null,
    osint_bmkg_source_type: row.source_type || null,
    osint_bmkg_shakemap_url: row.shakemap_url || null,

    osint_adm4_code: row.adm4_code || null,
    osint_weather_desc: row.weather_desc || null,
    osint_temperature_c: row.temperature_c || null,
    osint_humidity_percent: row.humidity_percent || null,
    osint_wind_speed_kmh: row.wind_speed_kmh || null,
    osint_wind_direction: row.wind_direction || null,
    osint_cloud_cover_percent: row.cloud_cover_percent || null,
    osint_visibility_text: row.visibility_text || null,

    osint_warning_event: row.warning_event || null,
    osint_warning_headline: row.warning_headline || null,
    osint_warning_description: row.warning_description || null,
    osint_warning_effective: row.warning_effective || null,
    osint_warning_expires: row.warning_expires || null,
    osint_warning_web_url: row.warning_web_url || null,

    osint_match_score: 0,
    osint_match_method: null,
    osint_match_reason: null,
    osint_match_status: "NONE",

    osint_analysis_status: "PROCESSED",
    osint_verification_status: "TERVERIFIKASI_OTOMATIS",
    osint_priority_level: getPriority(row.priority_level),

    osint_raw_json: toRawJsonString({
      source: "osint_data_bmkg",
      source_id: row.osint_bmkg_id,
      keyword_source: "data_keyword",
      keyword_match_mode: "flexible_token",
      matched_keyword: matchedKeyword,
      matched_keywords: matchedKeywords,
      original: row.raw_response || row,
    }),

    created_by: "system",
    last_updated_by: "system",
    last_update_date: new Date(),
  };

  const warningExpired =
    row.warning_expires && safeDate(row.warning_expires)?.getTime() < Date.now();

  const withinDate = isWithinLastDays(eventTime || row.created_at);
  const keywordMatched = matchedKeywords.length > 0;

  const isValid = withinDate && !warningExpired && keywordMatched;

  return {
    payload,
    is_valid: isValid,
    skip_reason: !isValid
      ? buildInvalidReason({
          sourceName: "BMKG",
          withinDate,
          keywordMatched,
          warningExpired,
        })
      : null,
  };
}

function mapCorrelationToOsintData(xPayload, bmkgPayload, correlation) {
  return {
    osint_external_key: `X_BMKG:${xPayload.osint_datax_id}:${bmkgPayload.osint_bmkg_id}`,
    osint_source: "X_BMKG",
    osint_datax_id: xPayload.osint_datax_id,
    osint_bmkg_id: bmkgPayload.osint_bmkg_id,

    osint_x_post_id: xPayload.osint_x_post_id,

    osint_event_type: bmkgPayload.osint_event_type || xPayload.osint_event_type,
    osint_area_text: xPayload.osint_area_text || bmkgPayload.osint_area_text,

    osint_account_name: xPayload.osint_account_name,
    osint_account_username: xPayload.osint_account_username,
    osint_content: xPayload.osint_content,

    osint_latitude: xPayload.osint_latitude || bmkgPayload.osint_latitude,
    osint_longitude: xPayload.osint_longitude || bmkgPayload.osint_longitude,

    osint_post_time: xPayload.osint_post_time,
    osint_event_time: bmkgPayload.osint_event_time,

    osint_link_url: xPayload.osint_link_url,
    osint_media_url: xPayload.osint_media_url,
    osint_hashtags: xPayload.osint_hashtags,

    osint_like_count: xPayload.osint_like_count,
    osint_share_count: xPayload.osint_share_count,
    osint_reply_count: xPayload.osint_reply_count,
    osint_view_count: xPayload.osint_view_count,
    osint_favourite_count: xPayload.osint_favourite_count,

    osint_magnitude: bmkgPayload.osint_magnitude,
    osint_depth: bmkgPayload.osint_depth,
    osint_tsunami_potential: bmkgPayload.osint_tsunami_potential,
    osint_bmkg_source_type: bmkgPayload.osint_bmkg_source_type,
    osint_bmkg_shakemap_url: bmkgPayload.osint_bmkg_shakemap_url,

    osint_adm4_code: bmkgPayload.osint_adm4_code,
    osint_weather_desc: bmkgPayload.osint_weather_desc,
    osint_temperature_c: bmkgPayload.osint_temperature_c,
    osint_humidity_percent: bmkgPayload.osint_humidity_percent,
    osint_wind_speed_kmh: bmkgPayload.osint_wind_speed_kmh,
    osint_wind_direction: bmkgPayload.osint_wind_direction,
    osint_cloud_cover_percent: bmkgPayload.osint_cloud_cover_percent,
    osint_visibility_text: bmkgPayload.osint_visibility_text,

    osint_warning_event: bmkgPayload.osint_warning_event,
    osint_warning_headline: bmkgPayload.osint_warning_headline,
    osint_warning_description: bmkgPayload.osint_warning_description,
    osint_warning_effective: bmkgPayload.osint_warning_effective,
    osint_warning_expires: bmkgPayload.osint_warning_expires,
    osint_warning_web_url: bmkgPayload.osint_warning_web_url,

    osint_match_score: correlation.score,
    osint_match_method: "BEST_MATCH_TIME_EVENT_LOCATION_SOURCE",
    osint_match_reason: correlation.reason,
    osint_match_status: correlation.status,

    osint_analysis_status:
      correlation.status === "MATCHED" ? "MATCHED" : "REVIEW",
    osint_verification_status:
      correlation.status === "MATCHED"
        ? "TERVERIFIKASI_OTOMATIS"
        : "BELUM_DIVERIFIKASI",
    osint_priority_level: getHigherPriority(
      xPayload.osint_priority_level,
      bmkgPayload.osint_priority_level
    ),

    osint_raw_json: toRawJsonString({
      source: "X_BMKG",
      correlation_rule: "BEST_MATCH_ONLY_ONE_BMKG_PER_X",
      x: safeJson(xPayload.osint_raw_json) || xPayload.osint_raw_json,
      bmkg: safeJson(bmkgPayload.osint_raw_json) || bmkgPayload.osint_raw_json,
      correlation,
    }),

    created_by: "system",
    last_updated_by: "system",
    last_update_date: new Date(),
  };
}

async function upsertOsintScore(osintRecord, keywordRows = []) {
  const plain = osintRecord.get ? osintRecord.get({ plain: true }) : osintRecord;
  const score = calculateOsintScore(plain, keywordRows);

  const existingScore = await OsintDataScore.findOne({
    where: {
      osint_id: plain.osint_id,
    },
  });

  const payload = {
    osint_id: plain.osint_id,
    ...score,
    last_updated_by: "system",
    last_update_date: new Date(),
  };

  if (existingScore) {
    await existingScore.update(payload);
    return "updated";
  }

  await OsintDataScore.create({
    ...payload,
    created_by: "system",
    creation_date: new Date(),
  });

  return "created";
}

async function upsertOsintData(payload, keywordRows = []) {
  const existing = await OsintData.findOne({
    where: {
      osint_external_key: payload.osint_external_key,
    },
  });

  let record;

  if (existing) {
    await existing.update({
      ...payload,
      last_update_date: new Date(),
    });

    record = await OsintData.findOne({
      where: {
        osint_id: existing.osint_id,
      },
    });

    await upsertOsintScore(record, keywordRows);
    return "updated";
  }

  record = await OsintData.create({
    ...payload,
    creation_date: new Date(),
    last_update_date: new Date(),
  });

  await upsertOsintScore(record, keywordRows);
  return "created";
}

async function getKeywordRows() {
  if (!DataKeyword) return [];

  return DataKeyword.findAll({
    raw: true,
  });
}

async function syncOsintData({
  includeRecords = false,
  enableCorrelation = true,
} = {}) {
  if (!OsintData || !OsintDataScore || !OsintDataX || !OsintDataBmkg) {
    return {
      ok: false,
      message:
        "Model osint_data, osint_data_score, osint_data_x, atau osint_data_bmkg belum terdaftar.",
    };
  }

  const keywordRows = await getKeywordRows();
  const keywordTerms = getKeywordTerms(keywordRows);

  if (!keywordTerms.length) {
    return {
      ok: false,
      message:
        "Tabel data_keyword kosong atau tidak memiliki kolom keyword yang terbaca. Sync osint_data dibatalkan agar tidak memasukkan data tanpa filter keyword.",
      keyword_count: 0,
      finished_at: new Date().toISOString(),
    };
  }

  const cutoff = new Date(
    Date.now() - OSINT_MAX_DATA_AGE_DAYS * 24 * 60 * 60 * 1000
  );

  const xRows = await OsintDataX.findAll({
    where: {
      [Op.or]: [
        {
          osint_post_time: {
            [Op.gte]: cutoff,
          },
        },
        {
          [Op.and]: [
            {
              osint_post_time: {
                [Op.is]: null,
              },
            },
            {
              osint_creation_date: {
                [Op.gte]: cutoff,
              },
            },
          ],
        },
      ],
    },
    raw: true,
  });

  const bmkgRows = await OsintDataBmkg.findAll({
    where: {
      [Op.or]: [
        {
          event_datetime_utc: {
            [Op.gte]: cutoff,
          },
        },
        {
          warning_effective: {
            [Op.gte]: cutoff,
          },
        },
        {
          created_at: {
            [Op.gte]: cutoff,
          },
        },
      ],
    },
    raw: true,
  });

  let xCreated = 0;
  let xUpdated = 0;
  let xSkipped = 0;

  let bmkgCreated = 0;
  let bmkgUpdated = 0;
  let bmkgSkipped = 0;

  let correlationCreated = 0;
  let correlationUpdated = 0;
  let correlationSkipped = 0;
  let correlationCleanupDeleted = 0;

  const records = [];
  const xPayloads = [];
  const bmkgPayloads = [];

  for (const row of xRows) {
    const mapped = mapXToOsintData(row, keywordRows);

    if (!mapped.is_valid) {
      xSkipped += 1;

      if (includeRecords) {
        records.push({
          source: "X",
          source_id: row.osint_datax_id,
          saved: false,
          reason: mapped.skip_reason,
        });
      }

      continue;
    }

    const status = await upsertOsintData(mapped.payload, keywordRows);

    if (status === "created") xCreated += 1;
    if (status === "updated") xUpdated += 1;

    xPayloads.push(mapped.payload);

    if (includeRecords) {
      records.push({
        source: "X",
        source_id: row.osint_datax_id,
        external_key: mapped.payload.osint_external_key,
        saved: true,
        status,
      });
    }
  }

  for (const row of bmkgRows) {
    const mapped = mapBmkgToOsintData(row, keywordRows);

    if (!mapped.is_valid) {
      bmkgSkipped += 1;

      if (includeRecords) {
        records.push({
          source: "BMKG",
          source_id: row.osint_bmkg_id,
          saved: false,
          reason: mapped.skip_reason,
        });
      }

      continue;
    }

    const status = await upsertOsintData(mapped.payload, keywordRows);

    if (status === "created") bmkgCreated += 1;
    if (status === "updated") bmkgUpdated += 1;

    bmkgPayloads.push(mapped.payload);

    if (includeRecords) {
      records.push({
        source: "BMKG",
        source_id: row.osint_bmkg_id,
        external_key: mapped.payload.osint_external_key,
        saved: true,
        status,
      });
    }
  }

  if (enableCorrelation) {
    for (const xPayload of xPayloads) {
      const bestMatch = findBestBmkgCorrelationForX(xPayload, bmkgPayloads);

      if (!bestMatch) {
        correlationSkipped += 1;
        correlationCleanupDeleted += await cleanupNonBestCorrelationsForX(
          xPayload.osint_datax_id,
          null
        );
        continue;
      }

      const correlationPayload = mapCorrelationToOsintData(
        xPayload,
        bestMatch.bmkgPayload,
        bestMatch.correlation
      );

      const status = await upsertOsintData(correlationPayload, keywordRows);

      if (status === "created") correlationCreated += 1;
      if (status === "updated") correlationUpdated += 1;

      correlationCleanupDeleted += await cleanupNonBestCorrelationsForX(
        xPayload.osint_datax_id,
        correlationPayload.osint_external_key
      );

      if (includeRecords) {
        records.push({
          source: "X_BMKG",
          external_key: correlationPayload.osint_external_key,
          match_score: bestMatch.correlation.score,
          match_status: bestMatch.correlation.status,
          saved: true,
          status,
          rule: "BEST_MATCH_ONLY_ONE_BMKG_PER_X",
        });
      }
    }

    correlationCleanupDeleted += await cleanupDuplicateCorrelationRows();
  } else {
    correlationCleanupDeleted += await cleanupDuplicateCorrelationRows();
  }

  const result = {
    ok: true,
    max_data_age_days: OSINT_MAX_DATA_AGE_DAYS,
    keyword_source: "data_keyword",
    keyword_match_mode: "flexible_token",
    keyword_token_match_ratio: OSINT_KEYWORD_TOKEN_MATCH_RATIO,
    keyword_min_token_match: OSINT_KEYWORD_MIN_TOKEN_MATCH,
    correlation_rule: "BEST_MATCH_ONLY_ONE_BMKG_PER_X",
    correlation_max_hours: OSINT_CORRELATION_MAX_HOURS,
    correlation_min_score: OSINT_CORRELATION_MIN_SCORE,
    keyword_count: keywordTerms.length,
    x: {
      inspected_count: xRows.length,
      created_count: xCreated,
      updated_count: xUpdated,
      skipped_count: xSkipped,
    },
    bmkg: {
      inspected_count: bmkgRows.length,
      created_count: bmkgCreated,
      updated_count: bmkgUpdated,
      skipped_count: bmkgSkipped,
    },
    correlation: {
      enabled: enableCorrelation,
      created_count: correlationCreated,
      updated_count: correlationUpdated,
      skipped_count: correlationSkipped,
      cleanup_deleted_count: correlationCleanupDeleted,
    },
    finished_at: new Date().toISOString(),
  };

  if (includeRecords) {
    result.records = records;
  }

  return result;
}

async function recalculateOsintScore(osintId) {
  const keywordRows = await getKeywordRows();
  const keywordTerms = getKeywordTerms(keywordRows);

  if (!keywordTerms.length) {
    return {
      ok: false,
      message:
        "Tabel data_keyword kosong atau tidak memiliki kolom keyword yang terbaca. Recalculate score dibatalkan.",
      keyword_count: 0,
    };
  }

  const row = await OsintData.findOne({
    where: {
      osint_id: osintId,
    },
  });

  if (!row) return null;

  await upsertOsintScore(row, keywordRows);

  const score = await OsintDataScore.findOne({
    where: {
      osint_id: osintId,
    },
  });

  return {
    ok: true,
    keyword_source: "data_keyword",
    keyword_match_mode: "flexible_token",
    keyword_count: keywordTerms.length,
    osint_data: row,
    osint_score: score,
  };
}

module.exports = {
  syncOsintData,
  recalculateOsintScore,
};