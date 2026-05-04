const turf = require("@turf/turf");

function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function safeJsonParse(value) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function extractCoordinatesFromText(text) {
  const raw = String(text || "");
  const match = raw.match(/(-?\d{1,2}\.\d{4,}),\s*(-?\d{1,3}\.\d{4,})/);
  if (!match) {
    return { latitude: null, longitude: null };
  }

  return {
    latitude: Number(match[1]),
    longitude: Number(match[2]),
  };
}

function hashtagsToArray(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;

  return String(value)
    .split(/[,\s]+/)
    .map((v) => v.trim().replace(/^#/, ""))
    .filter(Boolean);
}

function matchMalangText({ caption, hashtags, kecamatanRows, kelurahanRows }) {
  const merged = normalizeText(
    [caption || "", hashtagsToArray(hashtags).map((t) => `#${t}`).join(" ")].join(" ")
  );

  if (!merged) {
    return { matched: false, locationText: null };
  }

  if (merged.includes("kota malang")) {
    return { matched: true, locationText: "kota malang" };
  }

  const kecamatan = kecamatanRows.find((row) =>
    merged.includes(normalizeText(row.nama_kecamatan))
  );
  if (kecamatan) {
    return { matched: true, locationText: kecamatan.nama_kecamatan };
  }

  const kelurahan = kelurahanRows.find((row) =>
    merged.includes(normalizeText(row.nama_kelurahan))
  );
  if (kelurahan) {
    return { matched: true, locationText: kelurahan.nama_kelurahan };
  }

  if (/\bmalang\b/.test(merged)) {
    return { matched: true, locationText: "malang" };
  }

  return { matched: false, locationText: null };
}

function pointInsideMalang({ latitude, longitude, kecamatanRows }) {
  if (
    latitude === null ||
    latitude === undefined ||
    longitude === null ||
    longitude === undefined ||
    Number.isNaN(Number(latitude)) ||
    Number.isNaN(Number(longitude))
  ) {
    return { matched: false, locationText: null };
  }

  const point = turf.point([Number(longitude), Number(latitude)]);

  for (const row of kecamatanRows) {
    const geo = safeJsonParse(row.geojson);
    if (!geo) continue;

    try {
      if (geo.type === "FeatureCollection" && Array.isArray(geo.features)) {
        for (const feature of geo.features) {
          if (feature?.geometry && turf.booleanPointInPolygon(point, feature)) {
            return {
              matched: true,
              locationText: row.nama_kecamatan,
            };
          }
        }
      }

      if (geo.type === "Feature" && geo.geometry && turf.booleanPointInPolygon(point, geo)) {
        return {
          matched: true,
          locationText: row.nama_kecamatan,
        };
      }

      if (
        (geo.type === "Polygon" || geo.type === "MultiPolygon") &&
        turf.booleanPointInPolygon(point, turf.feature(geo))
      ) {
        return {
          matched: true,
          locationText: row.nama_kecamatan,
        };
      }
    } catch {
      // skip invalid geojson
    }
  }

  return { matched: false, locationText: null };
}

function isMetricsAllowed(post) {
  return (
    Number(post.osint_like_count || 0) > 100 &&
    Number(post.osint_view_count || 0) > 1000 &&
    Number(post.osint_share_count || 0) > 100 &&
    Number(post.osint_favourite_count || 0) > 100 &&
    Number(post.osint_comment_count || 0) > 50
  );
}

function isMalangAllowed(post, masterData) {
  const coordsCheck = pointInsideMalang({
    latitude: post.osint_latitude,
    longitude: post.osint_longitude,
    kecamatanRows: masterData.kecamatanRows,
  });

  if (coordsCheck.matched) {
    return {
      allowed: true,
      locationText: coordsCheck.locationText,
      latitude: post.osint_latitude,
      longitude: post.osint_longitude,
      reason: "point_in_polygon",
    };
  }

  const textCheck = matchMalangText({
    caption: post.caption || "",
    hashtags: post.hashtags || [],
    kecamatanRows: masterData.kecamatanRows,
    kelurahanRows: masterData.kelurahanRows,
  });

  if (textCheck.matched) {
    return {
      allowed: true,
      locationText: textCheck.locationText,
      latitude: post.osint_latitude,
      longitude: post.osint_longitude,
      reason: "text_match",
    };
  }

  return {
    allowed: false,
    locationText: null,
    latitude: post.osint_latitude,
    longitude: post.osint_longitude,
    reason: "outside_malang",
  };
}

module.exports = {
  extractCoordinatesFromText,
  hashtagsToArray,
  isMetricsAllowed,
  isMalangAllowed,
};