"use client";

import styles from "./dashboard.module.css";

import { useEffect, useState } from "react";

// decode payload JWT (tanpa library)
function decodeJwtPayload(token: string): any | null {
  try {
    const payload = token.split(".")[1];
    const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(json);
  } catch {
    return null;
  }
}

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const trendData = [
  { name: "Minggu 1", baru: 10, ditangani: 7 },
  { name: "Minggu 2", baru: 15, ditangani: 14 },
  { name: "Minggu 3", baru: 11, ditangani: 9 },
  { name: "Minggu 4", baru: 20, ditangani: 14 },
];

const sumberData = [
  { label: "Instagram", value: 12 },
  { label: "X", value: 8 },
  { label: "BMKG", value: 20 },
  { label: "HUMINT", value: 24 },
];

const tableRows = [
  { no: 1, jenis: "Banjir", lokasi: "-7.952345, 112.615432", waktu: "2025-01-12 14:30", status: "Ditangani", prioritas: "Prioritas Tinggi" },
  { no: 2, jenis: "Longsor", lokasi: "-7.952345, 112.615432", waktu: "2025-01-12 14:30", status: "Menunggu Verifikasi", prioritas: "Prioritas Normal" },
  { no: 3, jenis: "Longsor", lokasi: "-7.952345, 112.615432", waktu: "2025-01-12 14:30", status: "Menunggu Verifikasi", prioritas: "Prioritas Normal" },
  { no: 4, jenis: "Longsor", lokasi: "-7.952345, 112.615432", waktu: "2025-01-12 14:30", status: "Menunggu Verifikasi", prioritas: "Prioritas Normal" },
  { no: 5, jenis: "Longsor", lokasi: "-7.952345, 112.615432", waktu: "2025-01-12 14:30", status: "Kedaluwarsa", prioritas: "Prioritas Normal" },
  { no: 6, jenis: "Longsor", lokasi: "-7.952345, 112.615432", waktu: "2025-01-12 14:30", status: "Kedaluwarsa", prioritas: "Prioritas Normal" },
  { no: 7, jenis: "Longsor", lokasi: "-7.952345, 112.615432", waktu: "2025-01-12 14:30", status: "Kedaluwarsa", prioritas: "Prioritas Tinggi" },
  { no: 8, jenis: "Longsor", lokasi: "-7.952345, 112.615432", waktu: "2025-01-12 14:30", status: "Selesai", prioritas: "Prioritas Tinggi" },
  { no: 9, jenis: "Longsor", lokasi: "-7.952345, 112.615432", waktu: "2025-01-12 14:30", status: "Selesai", prioritas: "Prioritas Tinggi" },
  { no: 10, jenis: "Longsor", lokasi: "-7.952345, 112.615432", waktu: "2025-01-12 14:30", status: "Selesai", prioritas: "Prioritas Tinggi" },
];

export default function DashboardPage() {
  const maxSumber = Math.max(...sumberData.map((s) => s.value));
  const [adminName, setAdminName] = useState("Admin");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    const payload = decodeJwtPayload(token);

    // sesuaikan kalau payload kamu pernah pakai format lama (ADM_NAMA_LENGKAP)
    const name =
      payload?.adm_nama_lengkap ||
      payload?.ADM_NAMA_LENGKAP ||
      payload?.adm_email ||
      "Admin";

    setAdminName(name);
  }, []);
  

  return (
    <div className={styles.page}>
      <div className={styles.topRow}>
        <div />
        <div className={styles.hello}>Halo, {adminName}</div>
      </div>

      <div className={styles.kpiRow}>
        <div className={styles.kpiCard}>
          <div className={styles.kpiTitle}>LAPORAN BULAN INI</div>
          <div className={styles.kpiValue}>20</div>
        </div>
        <div className={styles.kpiCard}>
          <div className={styles.kpiTitle}>LAPORAN DALAM PENANGANGAN</div>
          <div className={styles.kpiValue}>10</div>
        </div>
        <div className={styles.kpiCard}>
          <div className={styles.kpiTitle}>LAPORAN BUTUH VERIFIKASI</div>
          <div className={styles.kpiValue}>5</div>
        </div>
      </div>

      <div className={styles.midRow}>
        <div className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <div className={styles.panelTitle}>Tren Laporan</div>
              <div className={styles.legend}>
                <span className={styles.dotBaru} /> Laporan baru
                <span className={styles.dotT} /> Ditangani
              </div>
            </div>

            <select className={styles.select}>
              <option>Bulanan</option>
              <option>Mingguan</option>
              <option>Harian</option>
            </select>
          </div>

          <div className={styles.chartWrap}>
            <ResponsiveContainer width="100%" height={230}>
              <LineChart data={trendData} margin={{ top: 10, right: 15, left: -10, bottom: 0 }}>
                <CartesianGrid stroke="rgba(255,255,255,0.12)" strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fill: "rgba(255,255,255,0.8)", fontSize: 12 }} />
                <YAxis tick={{ fill: "rgba(255,255,255,0.8)", fontSize: 12 }} />
                <Tooltip
                  contentStyle={{ background: "#1f1f1f", border: "1px solid rgba(255,255,255,0.12)" }}
                  labelStyle={{ color: "rgba(255,255,255,0.85)" }}
                />
                <Line type="monotone" dataKey="baru" stroke="#c59b2d" strokeWidth={3} dot={false} />
                <Line type="monotone" dataKey="ditangani" stroke="#8a47ff" strokeWidth={3} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className={styles.panel}>
          <div className={styles.panelHeader}>
            <div className={styles.panelTitle}>Sumber Data</div>
          </div>

          <div className={styles.sumberList}>
            {sumberData.map((s) => {
              const width = Math.round((s.value / maxSumber) * 100);
              return (
                <div key={s.label} className={styles.sumberRow}>
                  <div className={styles.sumberLabel}>{s.label}</div>
                  <div className={styles.barTrack}>
                    <div className={styles.barFill} style={{ width: `${width}%` }} />
                  </div>
                  <div className={styles.sumberValue}>{s.value}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <h2 className={styles.sectionTitle}>Laporan Masyarakat Terbaru</h2>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>No</th>
              <th>Jenis Bencana</th>
              <th>Lokasi</th>
              <th>Waktu Kejadian</th>
              <th>Status Laporan</th>
              <th>Prioritas Penanganan</th>
            </tr>
          </thead>
          <tbody>
            {tableRows.map((r) => (
              <tr key={r.no}>
                <td>{r.no}</td>
                <td>{r.jenis}</td>
                <td>{r.lokasi}</td>
                <td>{r.waktu}</td>
                <td>{r.status}</td>
                <td>{r.prioritas}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}