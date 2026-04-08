"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Navbar from "../components/navbar";
import styles from "./weather.module.css";

type WeatherPayload = {
  city: string;
  current: { temp: number; desc: string; icon: string; humidity: number; windKmh: number };
  daily: { label: string; dateIso: string; min: number; max: number; icon: string; desc: string }[];
};

function titleCaseId(s: string) {
  return s
    .split(" ")
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}

export default function PrakiraanCuacaPage() {
  const [data, setData] = useState<WeatherPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const scrollerRef = useRef<HTMLDivElement | null>(null);

  const todayLabel = useMemo(() => {
    const now = new Date();
    const date = new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "long", year: "numeric" }).format(now);
    return `Hari ini, ${date}`;
  }, []);

  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);
        setErr("");
        const res = await fetch("/api/weather", { cache: "no-store" });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.message || "Gagal ambil data cuaca");
        setData(json);
      } catch (e: any) {
        setErr(e?.message || "Terjadi error");
      } finally {
        setLoading(false);
      }
    };
    run();
  }, []);

  const scrollRight = () => {
    scrollerRef.current?.scrollBy({ left: 320, behavior: "smooth" });
  };

  return (
    <div className={styles.page}>
      <Navbar />

      <main className={styles.main}>
        <h1 className={styles.title}>Prakiraan Cuaca</h1>

        <div className={styles.subTitle}>
          <span className={styles.pin}>📍</span>
          <span className={styles.city}>{data?.city || "Kota Malang"}</span>
        </div>

        <div className={styles.dateLine}>{todayLabel}</div>

        <section className={styles.panel}>
          {loading ? (
            <div className={styles.state}>Memuat data cuaca...</div>
          ) : err ? (
            <div className={styles.stateError}>{err}</div>
          ) : data ? (
            <>
              {/* summary */}
              <div className={styles.summary}>
                <div className={styles.summaryLeft}>
                  <img
                    className={styles.bigIcon}
                    src={`https://openweathermap.org/img/wn/${data.current.icon}@4x.png`}
                    alt={data.current.desc}
                  />
                  <div>
                    <div className={styles.desc}>{titleCaseId(data.current.desc)}</div>
                    <div className={styles.temp}>{data.current.temp}°C</div>
                    <div className={styles.small}>Kelembapan: {data.current.humidity}%</div>
                  </div>
                </div>

                <div className={styles.summaryRight}>
                  <div className={styles.infoBox}>
                    <div className={styles.infoRow}>
                      <span className={styles.infoIcon}>💧</span>
                      <span>Kelembapan: {data.current.humidity}%</span>
                    </div>
                    <div className={styles.infoRow}>
                      <span className={styles.infoIcon}>🧭</span>
                      <span>Angin: {data.current.windKmh} km/jam</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* daily cards */}
              <div className={styles.dailyWrap}>
                <div className={styles.dailyScroller} ref={scrollerRef}>
                  {data.daily.map((d) => (
                    <div key={d.dateIso} className={styles.dayCard}>
                      <div className={styles.dayLabel}>{d.label}</div>
                      <img
                        className={styles.dayIcon}
                        src={`https://openweathermap.org/img/wn/${d.icon}@2x.png`}
                        alt={d.desc}
                      />
                      <div className={styles.dayTemp}>
                        {d.max}°/{d.min}°
                      </div>
                      <div className={styles.dayTemp2}>
                        {d.max}°/{d.min}°
                      </div>
                    </div>
                  ))}
                </div>

                <button className={styles.arrowBtn} type="button" onClick={scrollRight} aria-label="Scroll">
                  ›
                </button>
              </div>
            </>
          ) : null}
        </section>
      </main>

      <footer className={styles.footer}>SENTRY © 2026. All rights reserved.</footer>
    </div>
  );
}