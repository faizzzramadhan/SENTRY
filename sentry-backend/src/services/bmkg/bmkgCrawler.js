const crypto = require("crypto");
const { Op } = require("sequelize");
const { XMLParser } = require("fast-xml-parser");
const models = require("../../models");

const OsintDataBmkg = models.osint_data_bmkg;
const OsintDataX = models.osint_data_x;

const BMKG_BASE_URL =
  process.env.BMKG_BASE_URL || "https://data.bmkg.go.id/DataMKG/TEWS";

const BMKG_SHAKEMAP_BASE_URL =
  process.env.BMKG_SHAKEMAP_BASE_URL || "https://static.bmkg.go.id";

const BMKG_WEATHER_API_BASE =
  process.env.BMKG_WEATHER_API_BASE ||
  "https://api.bmkg.go.id/publik/prakiraan-cuaca";

const BMKG_NOWCAST_RSS_URL =
  process.env.BMKG_NOWCAST_RSS_URL ||
  "https://www.bmkg.go.id/alerts/nowcast/id";

const BMKG_MAX_DATA_AGE_DAYS = Number(process.env.BMKG_MAX_DATA_AGE_DAYS || 30);
const OSINT_X_RETENTION_DAYS = Number(process.env.OSINT_X_RETENTION_DAYS || 30);

const BMKG_SAVE_ONLY_RELEVANT_WEATHER =
  String(process.env.BMKG_SAVE_ONLY_RELEVANT_WEATHER || "true").toLowerCase() !==
  "false";

const BMKG_GEMPA_ENDPOINTS = [
  {
    source_type: "GEMPA_TERBARU",
    endpoint: "autogempa.json",
    url: `${BMKG_BASE_URL}/autogempa.json`,
  },
  {
    source_type: "GEMPA_M5_PLUS",
    endpoint: "gempaterkini.json",
    url: `${BMKG_BASE_URL}/gempaterkini.json`,
  },
  {
    source_type: "GEMPA_DIRASAKAN",
    endpoint: "gempadirasakan.json",
    url: `${BMKG_BASE_URL}/gempadirasakan.json`,
  },
];

const KOTA_MALANG_ADM4_TARGETS = [
  // Kecamatan Blimbing
  { adm4: "35.73.01.1001", kelurahan: "Balearjosari", kecamatan: "Blimbing" },
  { adm4: "35.73.01.1002", kelurahan: "Arjosari", kecamatan: "Blimbing" },
  { adm4: "35.73.01.1003", kelurahan: "Polowijen", kecamatan: "Blimbing" },
  { adm4: "35.73.01.1004", kelurahan: "Purwodadi", kecamatan: "Blimbing" },
  { adm4: "35.73.01.1005", kelurahan: "Blimbing", kecamatan: "Blimbing" },
  { adm4: "35.73.01.1006", kelurahan: "Pandanwangi", kecamatan: "Blimbing" },
  { adm4: "35.73.01.1007", kelurahan: "Purwantoro", kecamatan: "Blimbing" },
  { adm4: "35.73.01.1008", kelurahan: "Bunulrejo", kecamatan: "Blimbing" },
  { adm4: "35.73.01.1009", kelurahan: "Kesatrian", kecamatan: "Blimbing" },
  { adm4: "35.73.01.1010", kelurahan: "Polehan", kecamatan: "Blimbing" },
  { adm4: "35.73.01.1011", kelurahan: "Jodipan", kecamatan: "Blimbing" },

  // Kecamatan Klojen
  { adm4: "35.73.02.1001", kelurahan: "Klojen", kecamatan: "Klojen" },
  { adm4: "35.73.02.1002", kelurahan: "Rampal Celaket", kecamatan: "Klojen" },
  { adm4: "35.73.02.1003", kelurahan: "Samaan", kecamatan: "Klojen" },
  { adm4: "35.73.02.1004", kelurahan: "Kidul Dalem", kecamatan: "Klojen" },
  { adm4: "35.73.02.1005", kelurahan: "Sukoharjo", kecamatan: "Klojen" },
  { adm4: "35.73.02.1006", kelurahan: "Kasin", kecamatan: "Klojen" },
  { adm4: "35.73.02.1007", kelurahan: "Kauman", kecamatan: "Klojen" },
  { adm4: "35.73.02.1008", kelurahan: "Oro Oro Dowo", kecamatan: "Klojen" },
  { adm4: "35.73.02.1009", kelurahan: "Bareng", kecamatan: "Klojen" },
  { adm4: "35.73.02.1010", kelurahan: "Gading Kasri", kecamatan: "Klojen" },
  { adm4: "35.73.02.1011", kelurahan: "Penanggungan", kecamatan: "Klojen" },

  // Kecamatan Kedungkandang
  { adm4: "35.73.03.1001", kelurahan: "Kotalama", kecamatan: "Kedungkandang" },
  { adm4: "35.73.03.1002", kelurahan: "Mergosono", kecamatan: "Kedungkandang" },
  { adm4: "35.73.03.1003", kelurahan: "Bumiayu", kecamatan: "Kedungkandang" },
  { adm4: "35.73.03.1004", kelurahan: "Wonokoyo", kecamatan: "Kedungkandang" },
  { adm4: "35.73.03.1005", kelurahan: "Buring", kecamatan: "Kedungkandang" },
  { adm4: "35.73.03.1006", kelurahan: "Kedungkandang", kecamatan: "Kedungkandang" },
  { adm4: "35.73.03.1007", kelurahan: "Lesanpuro", kecamatan: "Kedungkandang" },
  { adm4: "35.73.03.1008", kelurahan: "Sawojajar", kecamatan: "Kedungkandang" },
  { adm4: "35.73.03.1009", kelurahan: "Madyopuro", kecamatan: "Kedungkandang" },
  { adm4: "35.73.03.1010", kelurahan: "Cemorokandang", kecamatan: "Kedungkandang" },
  { adm4: "35.73.03.1011", kelurahan: "Arjowinangun", kecamatan: "Kedungkandang" },
  { adm4: "35.73.03.1012", kelurahan: "Tlogowaru", kecamatan: "Kedungkandang" },

  // Kecamatan Sukun
  { adm4: "35.73.04.1001", kelurahan: "Ciptomulyo", kecamatan: "Sukun" },
  { adm4: "35.73.04.1002", kelurahan: "Gadang", kecamatan: "Sukun" },
  { adm4: "35.73.04.1003", kelurahan: "Kebonsari", kecamatan: "Sukun" },
  { adm4: "35.73.04.1004", kelurahan: "Bandungrejosari", kecamatan: "Sukun" },
  { adm4: "35.73.04.1005", kelurahan: "Sukun", kecamatan: "Sukun" },
  { adm4: "35.73.04.1006", kelurahan: "Tanjungrejo", kecamatan: "Sukun" },
  { adm4: "35.73.04.1007", kelurahan: "Pisang Candi", kecamatan: "Sukun" },
  { adm4: "35.73.04.1008", kelurahan: "Bandulan", kecamatan: "Sukun" },
  { adm4: "35.73.04.1009", kelurahan: "Karang Besuki", kecamatan: "Sukun" },
  { adm4: "35.73.04.1010", kelurahan: "Mulyorejo", kecamatan: "Sukun" },
  { adm4: "35.73.04.1011", kelurahan: "Bakalan Krajan", kecamatan: "Sukun" },

  // Kecamatan Lowokwaru
  { adm4: "35.73.05.1001", kelurahan: "Tunggulwulung", kecamatan: "Lowokwaru" },
  { adm4: "35.73.05.1002", kelurahan: "Merjosari", kecamatan: "Lowokwaru" },
  { adm4: "35.73.05.1003", kelurahan: "Tlogomas", kecamatan: "Lowokwaru" },
  { adm4: "35.73.05.1004", kelurahan: "Dinoyo", kecamatan: "Lowokwaru" },
  { adm4: "35.73.05.1005", kelurahan: "Sumbersari", kecamatan: "Lowokwaru" },
  { adm4: "35.73.05.1006", kelurahan: "Ketawanggede", kecamatan: "Lowokwaru" },
  { adm4: "35.73.05.1007", kelurahan: "Jatimulyo", kecamatan: "Lowokwaru" },
  { adm4: "35.73.05.1008", kelurahan: "Tunjungsekar", kecamatan: "Lowokwaru" },
  { adm4: "35.73.05.1009", kelurahan: "Mojolangu", kecamatan: "Lowokwaru" },
  { adm4: "35.73.05.1010", kelurahan: "Tulusrejo", kecamatan: "Lowokwaru" },
  { adm4: "35.73.05.1011", kelurahan: "Lowokwaru", kecamatan: "Lowokwaru" },
  { adm4: "35.73.05.1012", kelurahan: "Tasikmadu", kecamatan: "Lowokwaru" },
].map((item) => ({
  ...item,
  name: `${item.kelurahan}, ${item.kecamatan}, Kota Malang`,
}));

const KOTA_MALANG_ADM4_SET = new Set(
  KOTA_MALANG_ADM4_TARGETS.map((item) => item.adm4)
);

const WEATHER_HAZARD_KEYWORDS = [
  "hujan",
  "hujan sedang",
  "hujan lebat",
  "hujan sangat lebat",
  "petir",
  "badai",
  "angin kencang",
  "cuaca ekstrem",
  "banjir",
  "genangan",
];

function normalizeText(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function containsNormalizedTerm(text, term) {
  const source = normalizeText(text);
  const keyword = normalizeText(term);

  if (!source || !keyword) return false;

  return source.includes(keyword);
}

function safeNumber(value, fallback = null) {
  const parsed = Number(String(value || "").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function safeDate(value) {
  if (!value) return null;

  const raw = String(value).trim();

  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(raw)) {
    const date = new Date(raw.replace(" ", "T") + "Z");
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
}

function toArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function buildHash(parts) {
  return crypto
    .createHash("sha256")
    .update(parts.map((part) => String(part ?? "")).join("|"))
    .digest("hex");
}

function parseCoordinates(coordinates) {
  if (!coordinates) {
    return { latitude: null, longitude: null };
  }

  const parts = String(coordinates)
    .split(",")
    .map((item) => item.trim());

  if (parts.length < 2) {
    return { latitude: null, longitude: null };
  }

  return {
    latitude: safeNumber(parts[0]),
    longitude: safeNumber(parts[1]),
  };
}

function parseKedalamanKm(kedalaman) {
  const match = String(kedalaman || "").match(/\d+/);
  return match ? Number(match[0]) : null;
}

function parseMagnitude(magnitude) {
  return safeNumber(magnitude);
}

function isTsunamiPotential(potensi) {
  const text = normalizeText(potensi);

  if (!text) return false;
  if (text.includes("tidak berpotensi")) return false;
  if (text.includes("berpotensi tsunami")) return true;
  if (text.includes("potensi tsunami")) return true;

  return false;
}

function buildShakemapUrl(shakemap) {
  if (!shakemap) return null;
  return `${BMKG_SHAKEMAP_BASE_URL}/${shakemap}`;
}

function getGempaList(responseJson) {
  const gempa = responseJson?.Infogempa?.gempa;

  if (!gempa) return [];
  return Array.isArray(gempa) ? gempa : [gempa];
}

function isWithinMaxAgeOrFuture(dateValue, maxDays) {
  const date = safeDate(dateValue);
  if (!date) return false;

  const maxPastMs = Number(maxDays) * 24 * 60 * 60 * 1000;
  return date.getTime() >= Date.now() - maxPastMs;
}

function isNotExpired(dateValue) {
  const date = safeDate(dateValue);
  if (!date) return true;
  return date.getTime() >= Date.now();
}

function buildTargetTerms() {
  const baseTerms = [
    "Kota Malang",
    "Malang Kota",
    "Pemkot Malang",
    "Blimbing",
    "Klojen",
    "Kedungkandang",
    "Sukun",
    "Lowokwaru",
    ...KOTA_MALANG_ADM4_TARGETS.map((item) => item.kecamatan),
    ...KOTA_MALANG_ADM4_TARGETS.map((item) => item.kelurahan),
  ];

  const seen = new Set();
  const result = [];

  for (const term of baseTerms) {
    const value = String(term || "").trim();
    const key = normalizeText(value);

    if (!value || !key || seen.has(key)) continue;

    seen.add(key);
    result.push(value);
  }

  return result;
}

function matchKotaMalangByText(texts = [], targetTerms = []) {
  const sourceText = texts.filter(Boolean).join(" ");

  const matchedTerm = targetTerms.find((term) =>
    containsNormalizedTerm(sourceText, term)
  );

  return {
    matched: Boolean(matchedTerm),
    matchedArea: matchedTerm || null,
    matchedByText: Boolean(matchedTerm),
  };
}

function determineGempaPriority({ magnitude, tsunamiPotential, isMatchedArea, dirasakan }) {
  const feltText = normalizeText(dirasakan);

  if (tsunamiPotential) return "KRITIS";
  if (magnitude !== null && magnitude >= 6.5) return "KRITIS";
  if (magnitude !== null && magnitude >= 5.5 && isMatchedArea) return "TINGGI";
  if (feltText && isMatchedArea) return "TINGGI";
  if (magnitude !== null && magnitude >= 5.0) return "SEDANG";

  return "RENDAH";
}

function determineWeatherPriority(weatherDesc) {
  const text = normalizeText(weatherDesc);

  if (
    text.includes("sangat lebat") ||
    text.includes("ekstrem") ||
    text.includes("badai") ||
    text.includes("banjir")
  ) {
    return "KRITIS";
  }

  if (
    text.includes("lebat") ||
    text.includes("petir") ||
    text.includes("angin kencang")
  ) {
    return "TINGGI";
  }

  if (text.includes("hujan")) {
    return "SEDANG";
  }

  return "RENDAH";
}

function determineWarningPriority(info) {
  const text = normalizeText(
    [
      info?.event,
      info?.headline,
      info?.description,
      info?.severity,
      info?.urgency,
    ].join(" ")
  );

  if (
    text.includes("extreme") ||
    text.includes("ekstrem") ||
    text.includes("severe") ||
    text.includes("banjir")
  ) {
    return "KRITIS";
  }

  if (
    text.includes("hujan lebat") ||
    text.includes("petir") ||
    text.includes("angin kencang")
  ) {
    return "TINGGI";
  }

  return "SEDANG";
}

function isRelevantWeather(weatherDesc) {
  if (!BMKG_SAVE_ONLY_RELEVANT_WEATHER) return true;

  const text = normalizeText(weatherDesc);

  return WEATHER_HAZARD_KEYWORDS.some((keyword) =>
    text.includes(normalizeText(keyword))
  );
}

function mapGempaToDbPayload({ gempa, sourceType, endpoint, url, targetTerms }) {
  const eventDate = gempa.DateTime ? new Date(gempa.DateTime) : null;
  const { latitude, longitude } = parseCoordinates(gempa.Coordinates);

  const areaMatch = matchKotaMalangByText(
    [
      gempa.Wilayah,
      gempa.Dirasakan,
      gempa.Potensi,
      gempa.Lintang,
      gempa.Bujur,
    ],
    targetTerms
  );

  const magnitude = parseMagnitude(gempa.Magnitude);
  const kedalamanKm = parseKedalamanKm(gempa.Kedalaman);
  const tsunamiPotential = isTsunamiPotential(gempa.Potensi);

  const passedAgeFilter = isWithinMaxAgeOrFuture(eventDate, BMKG_MAX_DATA_AGE_DAYS);
  const passedAreaFilter = areaMatch.matched;

  const priorityLevel = determineGempaPriority({
    magnitude,
    tsunamiPotential,
    isMatchedArea: areaMatch.matched,
    dirasakan: gempa.Dirasakan,
  });

  return {
    source_type: sourceType,
    source_endpoint: endpoint,
    external_event_hash: buildHash([
      sourceType,
      gempa.DateTime,
      gempa.Coordinates,
      gempa.Magnitude,
      gempa.Kedalaman,
      gempa.Wilayah,
      gempa.Dirasakan,
      gempa.Potensi,
    ]),

    tanggal: gempa.Tanggal || null,
    jam: gempa.Jam || null,
    event_datetime_utc: eventDate,

    coordinates_raw: gempa.Coordinates || null,
    latitude,
    longitude,

    magnitude,
    kedalaman_km: kedalamanKm,

    wilayah_episenter: gempa.Wilayah || null,
    wilayah_administratif: areaMatch.matchedArea,
    potensi_tsunami: gempa.Potensi || null,
    is_tsunami_potential: tsunamiPotential,
    dirasakan: gempa.Dirasakan || null,

    shakemap_url: buildShakemapUrl(gempa.Shakemap),

    verification_status: "TERVERIFIKASI_OTOMATIS",
    priority_level: priorityLevel,

    raw_response: {
      source_url: url,
      source_endpoint: endpoint,
      matched_area: areaMatch.matchedArea,
      matched_by_text: areaMatch.matchedByText,
      matched_by_adm4: false,
      original: gempa,
    },

    crawled_at: new Date(),
    updated_at: new Date(),

    _passed_age_filter: passedAgeFilter,
    _passed_area_filter: passedAreaFilter,
    _passed_weather_filter: true,
    _matched_area: areaMatch.matchedArea,
    _skip_reason: !passedAgeFilter
      ? `Data gempa lebih dari ${BMKG_MAX_DATA_AGE_DAYS} hari atau tanggal tidak valid`
      : !passedAreaFilter
      ? "Data gempa tidak menyebut wilayah Kota Malang"
      : null,
  };
}

function getWeatherAdm4Targets() {
  return KOTA_MALANG_ADM4_TARGETS;
}

function flattenForecastItems(cuaca) {
  if (!Array.isArray(cuaca)) return [];

  return cuaca
    .flat(Infinity)
    .filter((item) => item && typeof item === "object")
    .filter((item) => item.local_datetime || item.utc_datetime || item.weather_desc);
}

function getForecastLocationName(rowJson, fallbackName) {
  const lokasi = rowJson?.lokasi || rowJson?.location || {};

  return {
    name:
      [
        lokasi?.desa,
        lokasi?.kelurahan,
        lokasi?.kecamatan,
        lokasi?.kotkab,
        lokasi?.provinsi,
      ]
        .filter(Boolean)
        .join(", ") || fallbackName,
    latitude: safeNumber(lokasi?.lat ?? lokasi?.latitude),
    longitude: safeNumber(lokasi?.lon ?? lokasi?.longitude),
    raw: lokasi,
  };
}

function mapForecastToDbPayload({
  forecast,
  adm4Target,
  rowJson,
  sourceUrl,
}) {
  const location = getForecastLocationName(rowJson, adm4Target.name);
  const eventDate = safeDate(forecast.utc_datetime || forecast.local_datetime);
  const latitude = location.latitude;
  const longitude = location.longitude;
  const weatherDesc = forecast.weather_desc || forecast.weather_desc_en || null;

  const passedAgeFilter = isWithinMaxAgeOrFuture(eventDate, BMKG_MAX_DATA_AGE_DAYS);
  const passedAreaFilter = KOTA_MALANG_ADM4_SET.has(adm4Target.adm4);
  const passedWeatherFilter = isRelevantWeather(weatherDesc);

  return {
    source_type: "PRAKIRAAN_CUACA",
    source_endpoint: `prakiraan-cuaca?adm4=${adm4Target.adm4}`,
    external_event_hash: buildHash([
      "PRAKIRAAN_CUACA",
      adm4Target.adm4,
      forecast.utc_datetime,
      forecast.local_datetime,
      weatherDesc,
      forecast.t,
      forecast.hu,
      forecast.ws,
      forecast.wd,
    ]),

    tanggal: forecast.local_datetime
      ? String(forecast.local_datetime).slice(0, 10)
      : null,
    jam: forecast.local_datetime
      ? String(forecast.local_datetime).slice(11, 19)
      : null,
    event_datetime_utc: eventDate,

    adm4_code: adm4Target.adm4,
    wilayah_administratif: location.name || adm4Target.name,
    wilayah_episenter: location.name || adm4Target.name,

    coordinates_raw:
      latitude !== null && longitude !== null ? `${latitude},${longitude}` : null,
    latitude,
    longitude,

    magnitude: null,
    kedalaman_km: null,
    potensi_tsunami: null,
    is_tsunami_potential: false,
    dirasakan: null,
    shakemap_url: null,

    weather_desc: weatherDesc,
    temperature_c: safeNumber(forecast.t),
    humidity_percent: safeNumber(forecast.hu),
    wind_speed_kmh: safeNumber(forecast.ws),
    wind_direction: forecast.wd || null,
    cloud_cover_percent: safeNumber(forecast.tcc),
    visibility_text: forecast.vs_text || null,

    warning_event: null,
    warning_headline: null,
    warning_description: null,
    warning_effective: null,
    warning_expires: null,
    warning_web_url: null,

    verification_status: "TERVERIFIKASI_OTOMATIS",
    priority_level: determineWeatherPriority(weatherDesc),

    raw_response: {
      source_url: sourceUrl,
      source_endpoint: `prakiraan-cuaca?adm4=${adm4Target.adm4}`,
      adm4: adm4Target.adm4,
      adm4_target: adm4Target,
      location: location.raw,
      matched_area: adm4Target.name,
      matched_by_adm4: true,
      matched_by_text: false,
      original: forecast,
    },

    crawled_at: new Date(),
    updated_at: new Date(),

    _passed_age_filter: passedAgeFilter,
    _passed_area_filter: passedAreaFilter,
    _passed_weather_filter: passedWeatherFilter,
    _matched_area: adm4Target.name,
    _skip_reason: !passedAgeFilter
      ? `Data prakiraan lebih dari ${BMKG_MAX_DATA_AGE_DAYS} hari atau tanggal tidak valid`
      : !passedAreaFilter
      ? "ADM4 bukan wilayah Kota Malang"
      : !passedWeatherFilter
      ? "Cuaca tidak termasuk kategori relevan bencana/cuaca berisiko"
      : null,
  };
}

function getCapAreaDescriptions(info) {
  const areas = toArray(info?.area || info?.["cap:area"]);

  return areas
    .map((area) => area?.areaDesc || area?.["cap:areaDesc"])
    .filter(Boolean);
}

function mapWarningToDbPayload({ rssItem, capInfo, capUrl, targetTerms }) {
  const areas = getCapAreaDescriptions(capInfo);
  const areaText = areas.join(", ");

  const eventDate = safeDate(capInfo?.effective || capInfo?.["cap:effective"] || rssItem?.pubDate);
  const expiresDate = safeDate(capInfo?.expires || capInfo?.["cap:expires"]);

  const event = capInfo?.event || capInfo?.["cap:event"];
  const headline = capInfo?.headline || capInfo?.["cap:headline"];
  const description = capInfo?.description || capInfo?.["cap:description"];
  const webUrl = capInfo?.web || capInfo?.["cap:web"] || rssItem?.link;

  const areaMatch = matchKotaMalangByText(
    [
      rssItem?.title,
      rssItem?.description,
      event,
      headline,
      description,
      areaText,
    ],
    targetTerms
  );

  const warningText = [event, headline, description, areaText].join(" ");

  const passedAgeFilter = isWithinMaxAgeOrFuture(eventDate, BMKG_MAX_DATA_AGE_DAYS);
  const passedAreaFilter = areaMatch.matched;
  const passedWarningFilter = WEATHER_HAZARD_KEYWORDS.some((keyword) =>
    containsNormalizedTerm(warningText, keyword)
  );

  return {
    source_type: "PERINGATAN_DINI_CUACA",
    source_endpoint: "alerts/nowcast/id",
    external_event_hash: buildHash([
      "PERINGATAN_DINI_CUACA",
      capUrl,
      event,
      eventDate,
      expiresDate,
      headline,
      areaText,
    ]),

    tanggal: eventDate ? eventDate.toISOString().slice(0, 10) : null,
    jam: eventDate ? eventDate.toISOString().slice(11, 19) : null,
    event_datetime_utc: eventDate,

    adm4_code: null,
    wilayah_administratif: areaMatch.matchedArea || areaText || "Kota Malang",
    wilayah_episenter: areaMatch.matchedArea || areaText || "Kota Malang",

    coordinates_raw: null,
    latitude: null,
    longitude: null,

    magnitude: null,
    kedalaman_km: null,
    potensi_tsunami: null,
    is_tsunami_potential: false,
    dirasakan: null,
    shakemap_url: null,

    weather_desc: event || null,
    temperature_c: null,
    humidity_percent: null,
    wind_speed_kmh: null,
    wind_direction: null,
    cloud_cover_percent: null,
    visibility_text: null,

    warning_event: event || null,
    warning_headline: headline || rssItem?.title || null,
    warning_description: description || rssItem?.description || null,
    warning_effective: eventDate,
    warning_expires: expiresDate,
    warning_web_url: webUrl || null,

    verification_status: "TERVERIFIKASI_OTOMATIS",
    priority_level: determineWarningPriority(capInfo),

    raw_response: {
      source_url: capUrl,
      source_endpoint: "alerts/nowcast/id",
      matched_area: areaMatch.matchedArea,
      matched_by_text: areaMatch.matchedByText,
      matched_by_adm4: false,
      rss_item: rssItem,
      cap_info: capInfo,
      area_descriptions: areas,
    },

    crawled_at: new Date(),
    updated_at: new Date(),

    _passed_age_filter: passedAgeFilter && isNotExpired(expiresDate),
    _passed_area_filter: passedAreaFilter,
    _passed_weather_filter: passedWarningFilter,
    _matched_area: areaMatch.matchedArea,
    _skip_reason: !passedAgeFilter
      ? `Peringatan lebih dari ${BMKG_MAX_DATA_AGE_DAYS} hari atau tanggal tidak valid`
      : !isNotExpired(expiresDate)
      ? "Peringatan dini cuaca sudah kedaluwarsa"
      : !passedAreaFilter
      ? "Peringatan dini tidak menyebut wilayah Kota Malang"
      : !passedWarningFilter
      ? "Peringatan tidak mengandung hujan/cuaca ekstrem/banjir"
      : null,
  };
}

async function fetchJson(url) {
  if (typeof fetch !== "function") {
    throw new Error("Global fetch tidak tersedia. Gunakan Node.js versi 18 ke atas.");
  }

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json",
      "User-Agent": "SENTRY-BMKG-Crawler/1.0",
    },
  });

  if (!response.ok) {
    throw new Error(`Gagal mengambil data BMKG JSON. HTTP ${response.status}`);
  }

  return response.json();
}

async function fetchText(url) {
  if (typeof fetch !== "function") {
    throw new Error("Global fetch tidak tersedia. Gunakan Node.js versi 18 ke atas.");
  }

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/xml,text/xml,text/plain,*/*",
      "User-Agent": "SENTRY-BMKG-Crawler/1.0",
    },
  });

  if (!response.ok) {
    throw new Error(`Gagal mengambil data BMKG XML. HTTP ${response.status}`);
  }

  return response.text();
}

async function cleanupExpiredOsintXData() {
  if (!OsintDataX) return 0;

  const cutoff = new Date(
    Date.now() - OSINT_X_RETENTION_DAYS * 24 * 60 * 60 * 1000
  );

  return OsintDataX.destroy({
    where: {
      [Op.or]: [
        { osint_post_time: { [Op.lt]: cutoff } },
        {
          [Op.and]: [
            { osint_post_time: { [Op.is]: null } },
            { osint_creation_date: { [Op.lt]: cutoff } },
          ],
        },
      ],
    },
  });
}

async function saveBmkgPayload(payload) {
  const existing = await OsintDataBmkg.findOne({
    where: {
      external_event_hash: payload.external_event_hash,
    },
  });

  const cleanPayload = { ...payload };

  delete cleanPayload._passed_age_filter;
  delete cleanPayload._passed_area_filter;
  delete cleanPayload._passed_weather_filter;
  delete cleanPayload._matched_area;
  delete cleanPayload._skip_reason;

  if (existing) {
    await existing.update(cleanPayload);
    return "updated";
  }

  await OsintDataBmkg.create({
    ...cleanPayload,
    created_at: new Date(),
  });

  return "created";
}

async function crawlGempa({ targetTerms, includeRecords, stats, previewRecords, errors }) {
  for (const item of BMKG_GEMPA_ENDPOINTS) {
    try {
      console.log("[bmkg-crawler] fetch gempa:", item.url);

      const responseJson = await fetchJson(item.url);
      const gempaList = getGempaList(responseJson);

      stats.fetched_count += gempaList.length;
      stats.gempa_fetched_count += gempaList.length;

      for (const gempa of gempaList) {
        stats.inspected_count += 1;

        const payload = mapGempaToDbPayload({
          gempa,
          sourceType: item.source_type,
          endpoint: item.endpoint,
          url: item.url,
          targetTerms,
        });

        const shouldSave =
          payload._passed_age_filter && payload._passed_area_filter;

        if (!payload._passed_age_filter) stats.skipped_old_count += 1;
        else if (!payload._passed_area_filter) stats.skipped_area_count += 1;

        if (payload._passed_area_filter) stats.matched_area_count += 1;

        if (includeRecords) {
          previewRecords.push({
            source_type: payload.source_type,
            datetime: payload.event_datetime_utc,
            area: payload.wilayah_episenter,
            magnitude: payload.magnitude,
            kedalaman_km: payload.kedalaman_km,
            matched_area: payload._matched_area,
            passed_age_filter: payload._passed_age_filter,
            passed_area_filter: payload._passed_area_filter,
            saved_to_db: shouldSave,
            skip_reason: payload._skip_reason,
          });
        }

        if (!shouldSave) continue;

        const saveStatus = await saveBmkgPayload(payload);
        if (saveStatus === "created") stats.saved_count += 1;
        if (saveStatus === "updated") stats.updated_count += 1;
      }
    } catch (error) {
      stats.failed_count += 1;
      errors.push({ endpoint: item.endpoint, message: error.message });
      console.error("[bmkg-crawler] gempa error:", item.endpoint, error.message);
    }
  }
}

async function crawlPrakiraanCuaca({ includeRecords, stats, previewRecords, errors }) {
  const targets = getWeatherAdm4Targets();

  for (const adm4Target of targets) {
    const url = `${BMKG_WEATHER_API_BASE}?adm4=${encodeURIComponent(adm4Target.adm4)}`;

    try {
      console.log("[bmkg-crawler] fetch prakiraan:", url);

      const responseJson = await fetchJson(url);
      const dataRows = Array.isArray(responseJson?.data)
        ? responseJson.data
        : [responseJson];

      const forecastRows = [];

      for (const row of dataRows) {
        const items = flattenForecastItems(row?.cuaca || responseJson?.cuaca);

        for (const item of items) {
          forecastRows.push({
            forecast: item,
            rowJson: row,
          });
        }
      }

      stats.fetched_count += forecastRows.length;
      stats.weather_fetched_count += forecastRows.length;

      for (const item of forecastRows) {
        stats.inspected_count += 1;

        const payload = mapForecastToDbPayload({
          forecast: item.forecast,
          adm4Target,
          rowJson: item.rowJson,
          sourceUrl: url,
        });

        const shouldSave =
          payload._passed_age_filter &&
          payload._passed_area_filter &&
          payload._passed_weather_filter;

        if (!payload._passed_age_filter) stats.skipped_old_count += 1;
        else if (!payload._passed_area_filter) stats.skipped_area_count += 1;
        else if (!payload._passed_weather_filter) stats.skipped_weather_count += 1;

        if (payload._passed_area_filter) stats.matched_area_count += 1;

        if (includeRecords) {
          previewRecords.push({
            source_type: payload.source_type,
            adm4_code: payload.adm4_code,
            datetime: payload.event_datetime_utc,
            area: payload.wilayah_administratif,
            weather_desc: payload.weather_desc,
            temperature_c: payload.temperature_c,
            humidity_percent: payload.humidity_percent,
            wind_speed_kmh: payload.wind_speed_kmh,
            wind_direction: payload.wind_direction,
            passed_age_filter: payload._passed_age_filter,
            passed_area_filter: payload._passed_area_filter,
            passed_weather_filter: payload._passed_weather_filter,
            saved_to_db: shouldSave,
            skip_reason: payload._skip_reason,
          });
        }

        if (!shouldSave) continue;

        const saveStatus = await saveBmkgPayload(payload);
        if (saveStatus === "created") stats.saved_count += 1;
        if (saveStatus === "updated") stats.updated_count += 1;
      }
    } catch (error) {
      stats.failed_count += 1;
      errors.push({ endpoint: url, message: error.message });
      console.error("[bmkg-crawler] prakiraan error:", adm4Target.adm4, error.message);
    }
  }
}

async function crawlPeringatanDini({ targetTerms, includeRecords, stats, previewRecords, errors }) {
  try {
    console.log("[bmkg-crawler] fetch nowcast rss:", BMKG_NOWCAST_RSS_URL);

    const xml = await fetchText(BMKG_NOWCAST_RSS_URL);
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: "",
      textNodeName: "text",
    });

    const parsed = parser.parse(xml);
    const channel = parsed?.rss?.channel || parsed?.channel || {};
    const rssItems = toArray(channel?.item);

    stats.warning_fetched_count += rssItems.length;
    stats.fetched_count += rssItems.length;

    for (const rssItem of rssItems) {
      const link = rssItem?.link;
      if (!link) continue;

      try {
        const capXml = await fetchText(link);
        const capParsed = parser.parse(capXml);
        const alert = capParsed?.alert || capParsed?.["cap:alert"] || {};
        const infos = toArray(alert?.info || alert?.["cap:info"]);

        for (const info of infos) {
          stats.inspected_count += 1;

          const payload = mapWarningToDbPayload({
            rssItem,
            capInfo: info,
            capUrl: link,
            targetTerms,
          });

          const shouldSave =
            payload._passed_age_filter &&
            payload._passed_area_filter &&
            payload._passed_weather_filter;

          if (!payload._passed_age_filter) stats.skipped_old_count += 1;
          else if (!payload._passed_area_filter) stats.skipped_area_count += 1;
          else if (!payload._passed_weather_filter) stats.skipped_weather_count += 1;

          if (payload._passed_area_filter) stats.matched_area_count += 1;

          if (includeRecords) {
            previewRecords.push({
              source_type: payload.source_type,
              datetime: payload.event_datetime_utc,
              area: payload.wilayah_administratif,
              warning_event: payload.warning_event,
              warning_headline: payload.warning_headline,
              warning_expires: payload.warning_expires,
              passed_age_filter: payload._passed_age_filter,
              passed_area_filter: payload._passed_area_filter,
              passed_weather_filter: payload._passed_weather_filter,
              saved_to_db: shouldSave,
              skip_reason: payload._skip_reason,
            });
          }

          if (!shouldSave) continue;

          const saveStatus = await saveBmkgPayload(payload);
          if (saveStatus === "created") stats.saved_count += 1;
          if (saveStatus === "updated") stats.updated_count += 1;
        }
      } catch (error) {
        stats.failed_count += 1;
        errors.push({ endpoint: link, message: error.message });
        console.error("[bmkg-crawler] cap detail error:", link, error.message);
      }
    }
  } catch (error) {
    stats.failed_count += 1;
    errors.push({ endpoint: BMKG_NOWCAST_RSS_URL, message: error.message });
    console.error("[bmkg-crawler] nowcast rss error:", error.message);
  }
}

async function runBmkgCrawler({ manual = false, includeRecords = false } = {}) {
  if (!OsintDataBmkg) {
    return {
      ok: false,
      mode: manual ? "manual" : "scheduler",
      message: "Model osint_data_bmkg belum terdaftar di src/models.",
      finished_at: new Date().toISOString(),
    };
  }

  const targetTerms = buildTargetTerms();
  const cleanupDeletedXCount = await cleanupExpiredOsintXData();

  const stats = {
    fetched_count: 0,
    gempa_fetched_count: 0,
    weather_fetched_count: 0,
    warning_fetched_count: 0,
    inspected_count: 0,
    saved_count: 0,
    updated_count: 0,
    matched_area_count: 0,
    skipped_old_count: 0,
    skipped_area_count: 0,
    skipped_weather_count: 0,
    failed_count: 0,
  };

  const previewRecords = [];
  const errors = [];

  await crawlGempa({
    targetTerms,
    includeRecords,
    stats,
    previewRecords,
    errors,
  });

  await crawlPrakiraanCuaca({
    includeRecords,
    stats,
    previewRecords,
    errors,
  });

  await crawlPeringatanDini({
    targetTerms,
    includeRecords,
    stats,
    previewRecords,
    errors,
  });

  const result = {
    ok: stats.saved_count > 0 || stats.updated_count > 0 || stats.inspected_count > 0,
    mode: manual ? "manual" : "scheduler",
    target_area: "Kota Malang",
    area_filter_mode: "ADM4_KOTA_MALANG_FOR_WEATHER_TEXT_FOR_GEMPA_WARNING",
    weather_adm4_count: KOTA_MALANG_ADM4_TARGETS.length,
    max_data_age_days: BMKG_MAX_DATA_AGE_DAYS,
    save_only_relevant_weather: BMKG_SAVE_ONLY_RELEVANT_WEATHER,
    cleanup_deleted_x_count: cleanupDeletedXCount,
    target_term_count: targetTerms.length,
    ...stats,
    errors,
    finished_at: new Date().toISOString(),
  };

  if (includeRecords) {
    result.records = previewRecords;
  }

  return result;
}

module.exports = {
  runBmkgCrawler,
  cleanupExpiredOsintXData,
};