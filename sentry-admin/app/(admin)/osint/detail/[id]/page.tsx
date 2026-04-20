"use client";

import styles from "./detail.module.css";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";

const DetailOsintMap = dynamic(() => import("./DetailOsintMap"), { ssr: false });

function decodeJwtPayload(token: string): any | null {
  try {
    const payload = token.split(".")[1];
    const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(json);
  } catch {
    return null;
  }
}

type OsintDetail = {
  id: number;
  accountName: string;
  accountHandle: string;
  postedAt: string;
  imageUrl: string;
  captionTitle: string;
  captionBody: string;
  likes: number;
  comments: number;
  shares: number;
  verified: boolean;
  priority: "RENDAH" | "SEDANG" | "TINGGI";
  keywords: string[];
  similarPostCount: number;
  locationName: string;
  locationDetail: string;
  latitude: number;
  longitude: number;
  radiusKm: number;
  humintCode: string;
  humintMatch: boolean;
  postDateValid: boolean;
  engagementValid: boolean;
  bmkgStatus: string;
  bmkgWeather: string;
  bmkgTemp: string;
  bmkgHumidity: string;
  sourceUrl: string;
};

const mockDetails: OsintDetail[] = [
  {
    id: 1,
    accountName: "jack_sipemberani",
    accountHandle: "@jack_sipemberani",
    postedAt: "12 Februari 2026 12:30:12",
    imageUrl:
      "https://images.unsplash.com/photo-1547683905-f686c993aae5?auto=format&fit=crop&w=1200&q=80",
    captionTitle: "#banjir #lowokwaru #hujan deras",
    captionBody:
      "daerah lowokwaru mengalami hujan deras dari jam 10.00 dan sekarang terjadi banjir di jalan raya.",
    likes: 888,
    comments: 10,
    shares: 29,
    verified: false,
    priority: "TINGGI",
    keywords: ["banjir", "lowokwaru", "hujan", "hujan deras"],
    similarPostCount: 6,
    locationName: "Lowokwaru, kota Malang",
    locationDetail:
      "Jl. Soekarno Hatta No.15, Mojolangu, Kecamatan Lowokwaru, Kota Malang",
    latitude: -7.95283,
    longitude: 112.61543,
    radiusKm: 2.4,
    humintCode: "#20053009",
    humintMatch: true,
    postDateValid: true,
    engagementValid: true,
    bmkgStatus: "Tidak ada indikasi gempa pada data OSINT ini",
    bmkgWeather: "Hujan Ringan",
    bmkgTemp: "20-24 °C",
    bmkgHumidity: "87-98%",
    sourceUrl: "https://x.com",
  },
];

function BackIcon() {
  return (
    <svg viewBox="0 0 24 24" className={styles.backIcon} aria-hidden="true">
      <path
        d="M15 5l-7 7 7 7"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M9 12h11"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function HeartIcon() {
  return (
    <svg viewBox="0 0 24 24" className={styles.inlineIcon} aria-hidden="true">
      <path
        d="M12 20s-7-4.35-7-10a4 4 0 0 1 7-2.4A4 4 0 0 1 19 10c0 5.65-7 10-7 10Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CommentIcon() {
  return (
    <svg viewBox="0 0 24 24" className={styles.inlineIcon} aria-hidden="true">
      <path
        d="M20 11.5A7.5 7.5 0 0 1 12.5 19H8l-4 3v-5A7.5 7.5 0 1 1 20 11.5Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ShareIcon() {
  return (
    <svg viewBox="0 0 24 24" className={styles.inlineIcon} aria-hidden="true">
      <circle cx="18" cy="5" r="2.4" fill="none" stroke="currentColor" strokeWidth="2" />
      <circle cx="6" cy="12" r="2.4" fill="none" stroke="currentColor" strokeWidth="2" />
      <circle cx="18" cy="19" r="2.4" fill="none" stroke="currentColor" strokeWidth="2" />
      <path
        d="M8.3 11l7.2-4.2M8.3 13l7.2 4.2"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function LocationPinIcon() {
  return (
    <svg viewBox="0 0 24 24" className={styles.sectionIcon} aria-hidden="true">
      <path
        d="M12 21s-6-5.33-6-11a6 6 0 1 1 12 0c0 5.67-6 11-6 11Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      />
      <circle cx="12" cy="10" r="2.2" fill="none" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" className={styles.checkIcon} aria-hidden="true">
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2" />
      <path
        d="M8 12.5l2.6 2.6L16.5 9"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
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
  const [detail, setDetail] = useState<OsintDetail | null>(null);

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

    setUserName(
      payload?.usr_nama_lengkap ||
        payload?.usr_email ||
        "User"
    );
  }, [token]);

  useEffect(() => {
    const id = Number(params?.id);
    const found = mockDetails.find((item) => item.id === id) || mockDetails[0];
    setDetail(found);
  }, [params]);

  if (!detail) {
    return <div className={styles.loadingState}>Memuat detail OSINT...</div>;
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
                {detail.verified ? "Terverifikasi" : "Belum Diverifikasi"}
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

            <Link href={detail.sourceUrl} target="_blank" className={styles.sourceLink}>
              Lihat Postingan Asli →
            </Link>
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
                    <span key={item}>
                      ‘{item}’
                      {index < detail.keywords.length - 1 ? ", " : ""}
                    </span>
                  ))}
                </div>

                <div className={styles.similarPost}>
                  jumlah postingan mirip : <strong>{detail.similarPostCount}</strong>
                </div>

                <div className={styles.locationBlock}>
                  <LocationPinIcon />
                  <div>
                    <div className={styles.locationText}>
                      Lokasi: <strong>{detail.locationName}</strong>
                    </div>
                    <div className={styles.locationSubtext}>
                      berdasarkan keyword dan data HUMINT
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
                    <CheckIcon />
                    <span>Tanggal postingan Tidak Kadaluarsa</span>
                  </div>

                  <div className={styles.checkItem}>
                    <CheckIcon />
                    <span>Engagement Threesold sesuai</span>
                  </div>
                </div>

                <button type="button" className={styles.relatedButton}>
                  postingan lain yang terkait →
                </button>
              </div>
            </div>
          </section>

          <div className={styles.verifyWrap}>
            <button type="button" className={styles.verifyButton}>
              Verifikasi Data
            </button>
          </div>
        </div>

        <div className={styles.rightColumn}>
          <section className={styles.card}>
            <h2 className={styles.cardTitle}>INFORMASI LOKASI</h2>

            <div className={styles.coordText}>Latitude: {detail.latitude}</div>
            <div className={styles.coordText}>Longitude: {detail.longitude}</div>

            <div className={styles.mapWrap}>
              <DetailOsintMap
                latitude={detail.latitude}
                longitude={detail.longitude}
                popupLabel={`${detail.latitude}, ${detail.longitude}`}
              />
            </div>

            <div className={styles.detectedTitle}>
              Alamat Terdeteksi (berdasarkan koordinat dan postingan)
            </div>
            <div className={styles.detectedAddress}>{detail.locationDetail}</div>

            <div className={styles.rangeRow}>
              <CheckIcon />
              <div>
                <div className={styles.rangeTitle}>Berada dalam jangkauan</div>
                <div className={styles.rangeSubtext}>
                  Jarak ke pusat koordinat: <strong>{detail.radiusKm}km</strong>
                </div>
              </div>
            </div>
          </section>

          <section className={styles.card}>
            <h2 className={styles.cardTitle}>VALIDASI BMKG</h2>

            <div className={styles.bmkgStatusRow}>
              <CrossIcon />
              <span>{detail.bmkgStatus}</span>
            </div>

            <div className={styles.bmkgMetaRow}>
              <span>{detail.bmkgWeather}</span>
              <span>{detail.bmkgTemp}</span>
              <span>{detail.bmkgHumidity}</span>
              <button type="button" className={styles.detailButton}>
                Detail →
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}