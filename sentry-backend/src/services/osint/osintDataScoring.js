"use strict";

const MAX_SCORE = 100;

function normalizeText(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
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

function rawJsonToText(value) {
  if (!value) return "";

  if (typeof value === "string") return value;

  try {
    return JSON.stringify(value);
  } catch {
    return "";
  }
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

function uniqueTerms(values) {
  const seen = new Set();
  const result = [];

  for (const item of values) {
    const value = String(item || "").trim();
    const key = normalizeText(value);

    if (!value || !key || seen.has(key)) continue;

    seen.add(key);
    result.push(value);
  }

  return result;
}

function getKeywordTerms(keywordRows = []) {
  return uniqueTerms(keywordRows.map((row) => getKeywordValue(row)));
}

function getKeywordTokens(keyword) {
  return normalizeText(keyword)
    .split(" ")
    .filter((token) => token.length >= 3);
}

function calculateKeywordScore(osintData, keywordRows = []) {
  const terms = getKeywordTerms(keywordRows);

  const content = normalizeText(
    [
      osintData.osint_event_type,
      osintData.osint_content,
      osintData.osint_area_text,
      osintData.osint_hashtags,
      osintData.osint_weather_desc,
      osintData.osint_warning_event,
      rawJsonToText(osintData.osint_raw_json),
    ].join(" ")
  );

  const matched = terms.filter((term) => content.includes(normalizeText(term)));

  if (matched.length >= 2) {
    return {
      score: 45,
      level: "Sangat Sesuai",
      reason: `Konten sangat sesuai dengan keyword dari data_keyword: ${matched.join(", ")}`,
      matched_keywords: matched,
    };
  }

  if (matched.length === 1) {
    return {
      score: 30,
      level: "Sesuai",
      reason: `Konten sesuai dengan keyword dari data_keyword: ${matched[0]}`,
      matched_keywords: matched,
    };
  }

  const partialMatched = terms.filter((term) => {
    const tokens = getKeywordTokens(term);
    if (!tokens.length) return false;

    return tokens.some((token) => content.includes(token));
  });

  if (partialMatched.length > 0) {
    return {
      score: 15,
      level: "Cukup",
      reason: `Konten cukup berkaitan dengan keyword dari data_keyword: ${partialMatched.join(", ")}`,
      matched_keywords: partialMatched,
    };
  }

  return {
    score: 0,
    level: "Tidak sesuai",
    reason: "Konten tidak cocok dengan keyword pada tabel data_keyword.",
    matched_keywords: [],
  };
}

function calculateLocationScore(osintData) {
  const area = String(osintData.osint_area_text || "").trim();
  const normalizedArea = normalizeText(area);
  const hasCoordinate = Boolean(osintData.osint_latitude && osintData.osint_longitude);
  const hasAdm4 = Boolean(osintData.osint_adm4_code);

  if (hasAdm4 || hasCoordinate) {
    return {
      score: 25,
      level: "Lokasi sama",
      reason: "Data memiliki ADM4 atau koordinat lokasi.",
    };
  }

  if (
    normalizedArea &&
    !["malang", "kota malang", "malang kota"].includes(normalizedArea)
  ) {
    return {
      score: 25,
      level: "Lokasi sama",
      reason: `Data memiliki area spesifik: ${area}.`,
    };
  }

  if (normalizedArea.includes("malang")) {
    return {
      score: 15,
      level: "Satu Kota",
      reason: "Data berada dalam konteks wilayah Malang.",
    };
  }

  return {
    score: 0,
    level: "Tidak ada",
    reason: "Lokasi tidak tersedia atau belum terdeteksi.",
  };
}

function getDayDifference(firstDate, secondDate) {
  const first = safeDate(firstDate);
  const second = safeDate(secondDate);

  if (!first || !second) return null;

  const firstDay = new Date(first.getFullYear(), first.getMonth(), first.getDate());
  const secondDay = new Date(second.getFullYear(), second.getMonth(), second.getDate());

  return Math.abs(firstDay.getTime() - secondDay.getTime()) / (24 * 60 * 60 * 1000);
}

function calculateTimeScore(osintData) {
  const postTime = safeDate(osintData.osint_post_time);
  const eventTime = safeDate(osintData.osint_event_time);

  let diffDays = null;

  if (postTime && eventTime) {
    diffDays = getDayDifference(postTime, eventTime);
  } else {
    const availableTime = postTime || eventTime;
    diffDays = availableTime ? getDayDifference(availableTime, new Date()) : null;
  }

  if (diffDays === null) {
    return {
      score: 0,
      level: "Tidak ada",
      reason: "Waktu posting atau waktu kejadian tidak tersedia.",
    };
  }

  if (diffDays === 0) {
    return {
      score: 15,
      level: "Hari sama",
      reason: "Waktu data berada pada hari yang sama.",
    };
  }

  if (diffDays <= 2) {
    return {
      score: 10,
      level: "Berbeda 1-2 hari",
      reason: `Selisih waktu ${Math.round(diffDays)} hari.`,
    };
  }

  return {
    score: 5,
    level: "> dari 2 hari",
    reason: "Selisih waktu lebih dari 2 hari.",
  };
}

function calculateEngagementScore(osintData) {
  const like = Number(osintData.osint_like_count || 0);
  const share = Number(osintData.osint_share_count || 0);
  const total = like + share;

  if (total >= 100) {
    return {
      score: 15,
      level: "Tinggi",
      reason: `Engagement tinggi dengan LIKE + SHARE = ${total}.`,
      engagement_total: total,
    };
  }

  if (total >= 30) {
    return {
      score: 10,
      level: "Sedang",
      reason: `Engagement sedang dengan LIKE + SHARE = ${total}.`,
      engagement_total: total,
    };
  }

  if (total > 0) {
    return {
      score: 5,
      level: "Rendah",
      reason: `Engagement rendah dengan LIKE + SHARE = ${total}.`,
      engagement_total: total,
    };
  }

  return {
    score: 0,
    level: "Tidak ada",
    reason: "Tidak ada engagement LIKE + SHARE.",
    engagement_total: total,
  };
}

function getScoreLevel(totalScore) {
  const score = Number(totalScore || 0);

  if (score >= 80) return "TINGGI";
  if (score >= 50) return "SEDANG";
  if (score > 0) return "RENDAH";

  return "TIDAK_VALID";
}

function getScoreStatus(totalScore) {
  const score = Number(totalScore || 0);

  if (score >= 80) return "VALID";
  if (score >= 50) return "NEED_REVIEW";
  if (score > 0) return "LOW_CONFIDENCE";

  return "REJECTED";
}

function calculateOsintScore(osintData, keywordRows = []) {
  const keyword = calculateKeywordScore(osintData, keywordRows);
  const location = calculateLocationScore(osintData);
  const time = calculateTimeScore(osintData);
  const engagement = calculateEngagementScore(osintData);

  const totalScore =
    Number(keyword.score || 0) +
    Number(location.score || 0) +
    Number(time.score || 0) +
    Number(engagement.score || 0);

  return {
    keyword_score: keyword.score,
    keyword_level: keyword.level,
    keyword_reason: keyword.reason,

    location_score: location.score,
    location_level: location.level,
    location_reason: location.reason,

    time_score: time.score,
    time_level: time.level,
    time_reason: time.reason,

    engagement_score: engagement.score,
    engagement_level: engagement.level,
    engagement_reason: engagement.reason,

    total_score: totalScore,
    max_score: MAX_SCORE,
    score_percentage: Number(((totalScore / MAX_SCORE) * 100).toFixed(2)),
    score_level: getScoreLevel(totalScore),
    score_status: getScoreStatus(totalScore),

    scoring_method: "OSINT_MAPPING_SCORE_DATA_KEYWORD",
    scoring_version: "v3",
    scoring_detail: JSON.stringify({
      keyword,
      location,
      time,
      engagement,
      formula:
        "total_score = keyword_score + location_score + time_score + engagement_score",
      max_score: MAX_SCORE,
      keyword_source: "data_keyword",
      mapping: {
        keyword_max_score: 45,
        location_max_score: 25,
        time_max_score: 15,
        engagement_max_score: 15,
      },
    }),
  };
}

module.exports = {
  calculateOsintScore,
  normalizeText,
  getKeywordTerms,
  getKeywordValue,
};