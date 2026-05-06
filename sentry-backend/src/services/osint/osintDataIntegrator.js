"use strict";

const { Op } = require("sequelize");
const models = require("../../models");
const {
  calculateOsintScore,
  normalizeText,
  getKeywordTerms,
  getKeywordValue,
} = require("./osintDataScoring");

const OsintData = models.osint_data;
const OsintDataScore = models.osint_data_score;
const OsintDataX = models.osint_data_x;
const OsintDataBmkg = models.osint_data_bmkg;
const DataKeyword = models.data_keyword;

const OSINT_MAX_DATA_AGE_DAYS = Number(process.env.OSINT_MAX_DATA_AGE_DAYS || 30);

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

function isDisasterRelated(text, keywordRows = []) {
  const source = normalizeText(text);
  const terms = getKeywordTerms(keywordRows);

  if (!terms.length) return false;

  return terms.some((term) => source.includes(normalizeText(term)));
}

function findMatchedKeyword(text, keywordRows = []) {
  const source = normalizeText(text);
  const terms = getKeywordTerms(keywordRows);

  if (!source || !terms.length) return null;

  const sortedTerms = [...terms].sort((a, b) => {
    return normalizeText(b).length - normalizeText(a).length;
  });

  return sortedTerms.find((term) => source.includes(normalizeText(term))) || null;
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

function mapXToOsintData(row, keywordRows = []) {
  const text = getXText(row);
  const sourceText = [text, row.osint_hashtags, row.osint_location_text]
    .filter(Boolean)
    .join(" ");

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
      matched_keyword: findMatchedKeyword(sourceText, keywordRows),
      original: safeJson(row.osint_raw_json) || row,
    }),

    created_by: "system",
    last_updated_by: "system",
    last_update_date: new Date(),
  };

  const isValid =
    isWithinLastDays(row.osint_post_time || row.osint_creation_date) &&
    isDisasterRelated(sourceText, keywordRows);

  return {
    payload,
    is_valid: isValid,
    skip_reason: !isValid
      ? "Data X tidak lolos filter: tidak cocok dengan data_keyword atau out of date."
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

  const sourceText = [
    row.source_type,
    content,
    row.weather_desc,
    row.warning_event,
    row.warning_headline,
    row.warning_description,
    row.wilayah_administratif,
    row.wilayah_episenter,
  ]
    .filter(Boolean)
    .join(" ");

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
      matched_keyword: findMatchedKeyword(sourceText, keywordRows),
      original: row.raw_response || row,
    }),

    created_by: "system",
    last_updated_by: "system",
    last_update_date: new Date(),
  };

  const warningExpired =
    row.warning_expires && safeDate(row.warning_expires)?.getTime() < Date.now();

  const isValid =
    isWithinLastDays(eventTime || row.created_at) &&
    !warningExpired &&
    isDisasterRelated(sourceText, keywordRows);

  return {
    payload,
    is_valid: isValid,
    skip_reason: !isValid
      ? "Data BMKG tidak lolos filter: tidak cocok dengan data_keyword, expired, atau out of date."
      : null,
  };
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
    } else if (diffHours <= 24) {
      score += 10;
      reasons.push("Waktu X dan BMKG masih relevan.");
    }
  }

  const xArea = normalizeText(xPayload.osint_area_text);
  const bmkgArea = normalizeText(bmkgPayload.osint_area_text);

  if (xArea && bmkgArea && (xArea.includes(bmkgArea) || bmkgArea.includes(xArea))) {
    score += 25;
    reasons.push("Area X dan BMKG cocok.");
  } else if (xArea || bmkgArea) {
    score += 10;
    reasons.push("Salah satu data memiliki informasi area.");
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
    osint_area_text: bmkgPayload.osint_area_text || xPayload.osint_area_text,

    osint_account_name: xPayload.osint_account_name,
    osint_account_username: xPayload.osint_account_username,
    osint_content: xPayload.osint_content,

    osint_latitude: bmkgPayload.osint_latitude || xPayload.osint_latitude,
    osint_longitude: bmkgPayload.osint_longitude || xPayload.osint_longitude,

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
    osint_match_method: "TIME_EVENT_LOCATION_SOURCE",
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
      for (const bmkgPayload of bmkgPayloads) {
        const correlation = calculateCorrelation(xPayload, bmkgPayload);

        if (!["MATCHED", "REVIEW"].includes(correlation.status)) {
          correlationSkipped += 1;
          continue;
        }

        const correlationPayload = mapCorrelationToOsintData(
          xPayload,
          bmkgPayload,
          correlation
        );

        const status = await upsertOsintData(correlationPayload, keywordRows);

        if (status === "created") correlationCreated += 1;
        if (status === "updated") correlationUpdated += 1;

        if (includeRecords) {
          records.push({
            source: "X_BMKG",
            external_key: correlationPayload.osint_external_key,
            match_score: correlation.score,
            match_status: correlation.status,
            saved: true,
            status,
          });
        }
      }
    }
  }

  const result = {
    ok: true,
    max_data_age_days: OSINT_MAX_DATA_AGE_DAYS,
    keyword_source: "data_keyword",
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
    keyword_count: keywordTerms.length,
    osint_data: row,
    osint_score: score,
  };
}

module.exports = {
  syncOsintData,
  recalculateOsintScore,
};