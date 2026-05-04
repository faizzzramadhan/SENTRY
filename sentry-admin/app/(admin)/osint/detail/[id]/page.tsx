"use client";

import styles from "./detail.module.css";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";

const DetailOsintMap = dynamic(() => import("./DetailOsintMap"), { ssr: false });

const API_BASE_URL =
  (process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5555").replace(/\/$/, "");

const DEFAULT_LATITUDE = -7.96662;
const DEFAULT_LONGITUDE = 112.632632;

function decodeJwtPayload(token: string): any | null {
  try {
    const payload = token.split(".")[1];
    const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(json);
  } catch {
    return null;
  }
}

type PriorityLevel = "RENDAH" | "SEDANG" | "TINGGI" | "KRITIS";

type OsintApiData = {
  osint_id: number;
  osint_source: "X" | "BMKG" | "X_BMKG";
  osint_account_name?: string | null;
  osint_account_username?: string | null;
  osint_content?: string | null;
  osint_event_type?: string | null;
  osint_area_text?: string | null;
  osint_latitude?: string | number | null;
  osint_longitude?: string | number | null;
  osint_post_time?: string | null;
  osint_event_time?: string | null;
  osint_link_url?: string | null;
  osint_media_url?: string | null;
  osint_hashtags?: string | null;
  osint_like_count?: number | null;
  osint_reply_count?: number | null;
  osint_share_count?: number | null;
  osint_view_count?: number | null;
  osint_magnitude?: string | number | null;
  osint_depth?: number | null;
  osint_tsunami_potential?: string | null;
  osint_bmkg_source_type?: string | null;
  osint_bmkg_shakemap_url?: string | null;
  osint_adm4_code?: string | null;
  osint_weather_desc?: string | null;
  osint_temperature_c?: string | number | null;
  osint_humidity_percent?: number | null;
  osint_wind_speed_kmh?: string | number | null;
  osint_warning_event?: string | null;
  osint_warning_headline?: string | null;
  osint_warning_description?: string | null;
  osint_warning_effective?: string | null;
  osint_warning_expires?: string | null;
  osint_warning_web_url?: string | null;
  osint_match_score?: string | number | null;
  osint_match_reason?: string | null;
  osint_match_status?: string | null;
  osint_analysis_status?: string | null;
  osint_verification_status?: string | null;
  osint_priority_level?: PriorityLevel | null;
  osint_raw_json?: string | null;
};

type OsintScore = {
  keyword_score?: number;
  keyword_level?: string | null;
  keyword_reason?: string | null;
  location_score?: number;
  location_level?: string | null;
  location_reason?: string | null;
  time_score?: number;
  time_level?: string | null;
  time_reason?: string | null;
  engagement_score?: number;
  engagement_level?: string | null;
  engagement_reason?: string | null;
  total_score?: number;
  max_score?: number;
  score_percentage?: string | number;
  score_level?: string | null;
  score_status?: string | null;
  scoring_detail?: string | null;
};

type OsintDetailResponse = {
  osint_data: OsintApiData;
  osint_score: OsintScore | null;
};

type DetailView = {
  id: number;
  source: string;
  accountHandle: string;
  postedAt: string;
  imageUrl: string;
  captionTitle: string;
  captionBody: string;
  likes: number;
  comments: number;
  shares: number;
  verified: boolean;
  verificationLabel: string;
  priority: PriorityLevel;
  keywords: string[];
  scoreLabel: string;
  scoreStatus: string;
  keywordReason: string;
  locationReason: string;
  timeReason: string;
  engagementReason: string;
  locationName: string;
  locationDetail: string;
  latitude: number;
  longitude: number;
  hasCoordinate: boolean;
  humintCode: string;
  postDateValid: boolean;
  engagementValid: boolean;
  bmkgStatus: string;
  bmkgWeather: string;
  bmkgTemp: string;
  bmkgHumidity: string;
  sourceUrl: string;
  matchStatus: string;
  matchScore: string;
  matchReason: string;
};

function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
}

async function fetchJson<T>(
  url: string,
  token: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  const contentType = response.headers.get("content-type") || "";

  if (!contentType.includes("application/json")) {
    const text = await response.text();
    throw new Error(`Response bukan JSON. Status ${response.status}. ${text.slice(0, 120)}`);
  }

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.message || data?.error || "Request gagal");
  }

  return data;
}

function formatDateIndo(value?: string | null) {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  const formatter = new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  return formatter.format(date).replace(/\./g, ":");
}

function parseNumber(value: unknown, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseRawJson(value?: string | null): any {
  if (!value) return null;

  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function parseScoringDetail(value?: string | null): any {
  if (!value) return null;

  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function getKeywords(score: OsintScore | null, data: OsintApiData) {
  const scoringDetail = parseScoringDetail(score?.scoring_detail);
  const fromScore = scoringDetail?.keyword?.matched_keywords;

  if (Array.isArray(fromScore) && fromScore.length > 0) {
    return fromScore.map((item) => String(item));
  }

  const hashtags = String(data.osint_hashtags || "")
    .split(/[,\s#]+/)
    .map((item) => item.trim())
    .filter(Boolean);

  if (hashtags.length > 0) return hashtags;

  return [data.osint_event_type || data.osint_weather_desc || data.osint_warning_event || "OSINT"];
}

function getImageUrl(data: OsintApiData) {
  if (data.osint_media_url) return data.osint_media_url;

  return "https://images.unsplash.com/photo-1547683905-f686c993aae5?auto=format&fit=crop&w=1200&q=80";
}

function buildBmkgStatus(data: OsintApiData) {
  if (data.osint_source === "X") {
    return "Data X standalone, belum memiliki pasangan validasi BMKG.";
  }

  if (data.osint_source === "X_BMKG") {
    return `Terkorelasi dengan BMKG. Status: ${data.osint_match_status || "-"}`;
  }

  return "Data resmi BMKG dan terverifikasi otomatis.";
}

function mapDetail(data: OsintApiData, score: OsintScore | null): DetailView {
  const rawJson = parseRawJson(data.osint_raw_json);
  const latitude = parseNumber(data.osint_latitude, DEFAULT_LATITUDE);
  const longitude = parseNumber(data.osint_longitude, DEFAULT_LONGITUDE);
  const hasCoordinate = Boolean(data.osint_latitude && data.osint_longitude);

  const sourceUrl =
    data.osint_link_url ||
    data.osint_warning_web_url ||
    data.osint_bmkg_shakemap_url ||
    "#";

  const postedTime =
    data.osint_post_time ||
    data.osint_event_time ||
    data.osint_warning_effective ||
    null;

  const scoreLabel = score
    ? `${score.total_score ?? 0}/${score.max_score ?? 100} (${score.score_level || "-"})`
    : "-";

  const verificationLabel =
    data.osint_verification_status === "TERVERIFIKASI_MANUAL"
      ? "Terverifikasi Manual"
      : data.osint_verification_status === "TERVERIFIKASI_OTOMATIS"
      ? "Terverifikasi Otomatis"
      : data.osint_verification_status === "DITOLAK"
      ? "Ditolak"
      : "Belum Diverifikasi";

  const accountHandle =
    data.osint_account_username ||
    data.osint_account_name ||
    data.osint_source ||
    "-";

  const captionTitle =
    data.osint_hashtags ||
    data.osint_event_type ||
    data.osint_warning_event ||
    data.osint_weather_desc ||
    data.osint_bmkg_source_type ||
    "Data OSINT";

  const captionBody =
    data.osint_content ||
    data.osint_warning_description ||
    data.osint_warning_headline ||
    rawJson?.original?.text ||
    rawJson?.original?.full_text ||
    "-";

  return {
    id: data.osint_id,
    source: data.osint_source,
    accountHandle,
    postedAt: formatDateIndo(postedTime),
    imageUrl: getImageUrl(data),
    captionTitle,
    captionBody,
    likes: Number(data.osint_like_count || 0),
    comments: Number(data.osint_reply_count || 0),
    shares: Number(data.osint_share_count || 0),
    verified: ["TERVERIFIKASI_OTOMATIS", "TERVERIFIKASI_MANUAL"].includes(
      String(data.osint_verification_status || "")
    ),
    verificationLabel,
    priority: data.osint_priority_level || "SEDANG",
    keywords: getKeywords(score, data),
    scoreLabel,
    scoreStatus: score?.score_status || "-",
    keywordReason: score?.keyword_reason || "-",
    locationReason: score?.location_reason || "-",
    timeReason: score?.time_reason || "-",
    engagementReason: score?.engagement_reason || "-",
    locationName: data.osint_area_text || "Lokasi belum tersedia",
    locationDetail:
      data.osint_area_text ||
      data.osint_adm4_code ||
      rawJson?.source_id ||
      "Alamat detail belum tersedia.",
    latitude,
    longitude,
    hasCoordinate,
    humintCode: "Tidak Ada",
    postDateValid: Number(score?.time_score || 0) >= 10,
    engagementValid: Number(score?.engagement_score || 0) >= 10,
    bmkgStatus: buildBmkgStatus(data),
    bmkgWeather: data.osint_weather_desc || data.osint_bmkg_source_type || "-",
    bmkgTemp:
      data.osint_temperature_c !== null && data.osint_temperature_c !== undefined
        ? `${data.osint_temperature_c} °C`
        : "-",
    bmkgHumidity:
      data.osint_humidity_percent !== null && data.osint_humidity_percent !== undefined
        ? `${data.osint_humidity_percent}%`
        : "-",
    sourceUrl,
    matchStatus: data.osint_match_status || "NONE",
    matchScore:
      data.osint_match_score !== null && data.osint_match_score !== undefined
        ? String(data.osint_match_score)
        : "0",
    matchReason: data.osint_match_reason || "-",
  };
}

function BackIcon() {
  return (
    <svg viewBox="0 0 24 24" className={styles.backIcon} aria-hidden="true">
      <path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9 12h11" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

function HeartIcon() {
  return (
    <svg viewBox="0 0 24 24" className={styles.inlineIcon} aria-hidden="true">
      <path d="M12 20s-7-4.35-7-10a4 4 0 0 1 7-2.4A4 4 0 0 1 19 10c0 5.65-7 10-7 10Z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}

function CommentIcon() {
  return (
    <svg viewBox="0 0 24 24" className={styles.inlineIcon} aria-hidden="true">
      <path d="M20 11.5A7.5 7.5 0 0 1 12.5 19H8l-4 3v-5A7.5 7.5 0 1 1 20 11.5Z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}

function ShareIcon() {
  return (
    <svg viewBox="0 0 24 24" className={styles.inlineIcon} aria-hidden="true">
      <circle cx="18" cy="5" r="2.4" fill="none" stroke="currentColor" strokeWidth="2" />
      <circle cx="6" cy="12" r="2.4" fill="none" stroke="currentColor" strokeWidth="2" />
      <circle cx="18" cy="19" r="2.4" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M8.3 11l7.2-4.2M8.3 13l7.2 4.2" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function LocationPinIcon() {
  return (
    <svg viewBox="0 0 24 24" className={styles.sectionIcon} aria-hidden="true">
      <path d="M12 21s-6-5.33-6-11a6 6 0 1 1 12 0c0 5.67-6 11-6 11Z" fill="none" stroke="currentColor" strokeWidth="2" />
      <circle cx="12" cy="10" r="2.2" fill="none" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" className={styles.checkIcon} aria-hidden="true">
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M8 12.5l2.6 2.6L16.5 9" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CrossIcon() {
  return (
    <svg viewBox="0 0 24 24" className={styles.crossIcon} aria-hidden="true">
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M9 9l6 6M15 9l-6 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export default function DetailOsintPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();

  const [userName, setUserName] = useState("User");
  const [detail, setDetail] = useState<DetailView | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [verifying, setVerifying] = useState(false);

  const token = useMemo(
    () => (typeof window !== "undefined" ? localStorage.getItem("token") : null),
    []
  );

  useEffect(() => {
    const payload = token ? decodeJwtPayload(token) : null;

    if (!token) {
      window.location.href = "/login";
      return;
    }

    if (payload?.usr_role === "admin") {
      window.location.href = "/manage-staff";
      return;
    }

    setUserName(payload?.usr_nama_lengkap || payload?.usr_email || "User");
  }, [token]);

  const fetchDetail = useCallback(async () => {
    if (!token) return;

    const id = Number(params?.id);
    if (!Number.isInteger(id) || id <= 0) {
      setErrorMessage("ID OSINT tidak valid.");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setErrorMessage("");

      const data = await fetchJson<OsintDetailResponse>(
        `${API_BASE_URL}/osint/data/${id}`,
        token
      );

      setDetail(mapDetail(data.osint_data, data.osint_score));
    } catch (error: any) {
      setErrorMessage(error?.message || "Gagal mengambil detail OSINT");
      setDetail(null);
    } finally {
      setLoading(false);
    }
  }, [params?.id, token]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  async function handleVerify() {
    if (!token || !detail) return;

    try {
      setVerifying(true);

      await fetchJson(`${API_BASE_URL}/osint/data/${detail.id}/verify`, token, {
        method: "PUT",
        body: JSON.stringify({
          verification_status: "TERVERIFIKASI_MANUAL",
          osint_priority_level: detail.priority,
        }),
      });

      await fetchDetail();
    } catch (error: any) {
      alert(error?.message || "Gagal verifikasi data OSINT");
    } finally {
      setVerifying(false);
    }
  }

  if (loading) {
    return <div className={styles.loadingState}>Memuat detail OSINT...</div>;
  }

  if (errorMessage || !detail) {
    return <div className={styles.loadingState}>{errorMessage || "Data OSINT tidak ditemukan."}</div>;
  }

  return (
    <div className={styles.page}>
      <div className={styles.topRow}>
        <div className={styles.titleWrap}>
          <button
            type="button"
            className={styles.backButton}
            onClick={() => router.push("/osint")}
            aria-label="Kembali"
          >
            <BackIcon />
          </button>
          <h3 className={styles.pageTitle}>DETAIL OSINT</h3>
        </div>

        <div className={styles.hello}>Halo, {userName}</div>
      </div>

      <div className={styles.contentGrid}>
        <div className={styles.leftColumn}>
          <section className={styles.card}>
            <div className={styles.cardHeader}>
              <h2 className={styles.cardTitle}>DETAIL POSTINGAN</h2>
              <span className={`${styles.statusBadge} ${styles.statusPending}`}>
                {detail.verificationLabel}
              </span>
            </div>

            <div className={styles.accountRow}>
              <div className={styles.accountHandle}>{detail.accountHandle}</div>
              <div className={styles.postedAt}>{detail.postedAt}</div>
            </div>

            <div className={styles.postContent}>
              <div className={styles.postImageWrap}>
                <img src={detail.imageUrl} alt="Postingan OSINT" className={styles.postImage} />
              </div>

              <div className={styles.postTextWrap}>
                <div className={styles.postHash}>{detail.captionTitle}</div>
                <p className={styles.postBody}>{detail.captionBody}</p>

                <div className={styles.metricRow}>
                  <span className={styles.metricItem}>
                    <HeartIcon />
                    {detail.likes}
                  </span>
                  <span className={styles.metricItem}>
                    <CommentIcon />
                    {detail.comments}
                  </span>
                  <span className={styles.metricItem}>
                    <ShareIcon />
                    {detail.shares}
                  </span>
                </div>
              </div>
            </div>

            {detail.sourceUrl !== "#" && (
              <Link href={detail.sourceUrl} target="_blank" className={styles.sourceLink}>
                Lihat Sumber Asli →
              </Link>
            )}
          </section>

          <section className={styles.card}>
            <div className={styles.cardHeader}>
              <h2 className={styles.cardTitle}>HASIL ANALISIS OSINT</h2>
              <span className={`${styles.statusBadge} ${styles.statusPriority}`}>
                PRIORITAS {detail.priority}
              </span>
            </div>

            <div className={styles.analysisGrid}>
              <div>
                <div className={styles.analysisLabel}>Keyword sesuai dengan Filter</div>
                <div className={styles.keywordLine}>
                  {detail.keywords.map((item, index) => (
                    <span key={`${item}-${index}`}>
                      ‘{item}’
                      {index < detail.keywords.length - 1 ? ", " : ""}
                    </span>
                  ))}
                </div>

                <div className={styles.similarPost}>
                  Score OSINT: <strong>{detail.scoreLabel}</strong>
                </div>

                <div className={styles.similarPost}>
                  Status Score: <strong>{detail.scoreStatus}</strong>
                </div>

                <div className={styles.locationBlock}>
                  <LocationPinIcon />
                  <div>
                    <div className={styles.locationText}>
                      Lokasi: <strong>{detail.locationName}</strong>
                    </div>
                    <div className={styles.locationSubtext}>
                      {detail.locationReason}
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <div className={styles.humintRow}>
                  <span>Data HUMINT</span>
                  <span className={styles.humintCode}>{detail.humintCode}</span>
                </div>

                <div className={styles.checkList}>
                  <div className={styles.checkItem}>
                    {detail.postDateValid ? <CheckIcon /> : <CrossIcon />}
                    <span>{detail.timeReason}</span>
                  </div>

                  <div className={styles.checkItem}>
                    {detail.engagementValid ? <CheckIcon /> : <CrossIcon />}
                    <span>{detail.engagementReason}</span>
                  </div>

                  <div className={styles.checkItem}>
                    {detail.keywords.length > 0 ? <CheckIcon /> : <CrossIcon />}
                    <span>{detail.keywordReason}</span>
                  </div>
                </div>

                <button type="button" className={styles.relatedButton}>
                  Match Status: {detail.matchStatus} ({detail.matchScore})
                </button>
              </div>
            </div>
          </section>

          <div className={styles.verifyWrap}>
            <button
              type="button"
              className={styles.verifyButton}
              onClick={handleVerify}
              disabled={verifying || detail.verified}
            >
              {detail.verified ? "Sudah Terverifikasi" : verifying ? "Memverifikasi..." : "Verifikasi Data"}
            </button>
          </div>
        </div>

        <div className={styles.rightColumn}>
          <section className={styles.card}>
            <h2 className={styles.cardTitle}>INFORMASI LOKASI</h2>

            <div className={styles.coordText}>
              Latitude: {detail.hasCoordinate ? detail.latitude : "Tidak tersedia"}
            </div>
            <div className={styles.coordText}>
              Longitude: {detail.hasCoordinate ? detail.longitude : "Tidak tersedia"}
            </div>

            <div className={styles.mapWrap}>
              <DetailOsintMap
                latitude={detail.latitude}
                longitude={detail.longitude}
                popupLabel={detail.locationName}
              />
            </div>

            <div className={styles.detectedTitle}>
              Alamat Terdeteksi
            </div>
            <div className={styles.detectedAddress}>{detail.locationDetail}</div>

            <div className={styles.rangeRow}>
              {detail.hasCoordinate ? <CheckIcon /> : <CrossIcon />}
              <div>
                <div className={styles.rangeTitle}>
                  {detail.hasCoordinate ? "Koordinat tersedia" : "Koordinat belum tersedia"}
                </div>
                <div className={styles.rangeSubtext}>
                  Source: <strong>{detail.source}</strong>
                </div>
              </div>
            </div>
          </section>

          <section className={styles.card}>
            <h2 className={styles.cardTitle}>VALIDASI BMKG</h2>

            <div className={styles.bmkgStatusRow}>
              {detail.source === "X" ? <CrossIcon /> : <CheckIcon />}
              <span>{detail.bmkgStatus}</span>
            </div>

            <div className={styles.bmkgMetaRow}>
              <span>{detail.bmkgWeather}</span>
              <span>{detail.bmkgTemp}</span>
              <span>{detail.bmkgHumidity}</span>
            </div>

            <div className={styles.bmkgStatusRow}>
              <span>{detail.matchReason}</span>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}