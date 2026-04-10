"use client";

import styles from "./dashboard.module.css";
import { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

// Data dummy (Sama seperti sebelumnya)
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
  { no: 1, jenis: "Banjir", lokasi: "-7.9523, 112.6154", waktu: "12/02/26 14:30", status: "Ditangani", prioritas: "Tinggi" },
  { no: 2, jenis: "Longsor", lokasi: "-7.9819, 112.6265", waktu: "12/02/26 15:00", status: "Verifikasi", prioritas: "Normal" },
  { no: 3, jenis: "Gempa", lokasi: "-7.9424, 112.6131", waktu: "12/02/26 16:15", status: "Selesai", prioritas: "Tinggi" },
];

export default function DashboardPage() {
  const maxSumber = Math.max(...sumberData.map((s) => s.value));
  
  // Fungsi styling status
  const getStatusClass = (status: string) => {
    if (status.includes("Ditangani")) return styles.statusProcess;
    if (status.includes("Verifikasi")) return styles.statusWait;
    if (status.includes("Selesai")) return styles.statusSuccess;
    return styles.statusDefault;
  };

  return (
    <div className={styles.page}>
      {/* HEADER SECTION */}
      <div className={styles.topRow}>
        <div>
          <h1 className={styles.mainTitle}>SENTRY ANALYTICS</h1>
          <p className={styles.subTitle}>Monitoring Pusat Kebencanaan Kota Malang</p>
        </div>
        <div className={styles.hello}>Halo, Rifcha Sya'bani</div>
      </div>

      {/* KPI SECTION */}
      <div className={styles.kpiRow}>
        <div className={styles.kpiCard}>
          <span className={styles.kpiLabel}>LAPORAN BULAN INI</span>
          <div className={styles.kpiValue}>24</div>
        </div>
        <div className={styles.kpiCard}>
          <span className={styles.kpiLabel}>DALAM PENANGANAN</span>
          <div className={styles.kpiValue}>10</div>
        </div>
        <div className={styles.kpiCard}>
          <span className={styles.kpiLabel}>BUTUH VERIFIKASI</span>
          <div className={styles.kpiValue} style={{color: '#facc15'}}>05</div>
        </div>
      </div>

      {/* CHART SECTION */}
      <div className={styles.midRow}>
        <div className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <div className={styles.panelTitle}>Tren Insiden</div>
              <div className={styles.legend}>
                <span className={styles.dotBaru} /> Baru <span className={styles.dotT} /> Ditangani
              </div>
            </div>
            <select className={styles.select}>
              <option>Bulanan</option>
              <option>Mingguan</option>
            </select>
          </div>

          <div className={styles.chartWrap}>
            <ResponsiveContainer width="100%" height={230}>
              <LineChart data={trendData}>
                <CartesianGrid stroke="rgba(255,255,255,0.05)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: "#666", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#666", fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: "#1a1a1e", border: "1px solid #333", borderRadius: '8px' }}
                  itemStyle={{ fontSize: '12px' }}
                />
                <Line type="monotone" dataKey="baru" stroke="#3b82f6" strokeWidth={4} dot={false} />
                <Line type="monotone" dataKey="ditangani" stroke="#8b5cf6" strokeWidth={4} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className={styles.panel}>
          <div className={styles.panelHeader}>
            <div className={styles.panelTitle}>Inteligensi Sumber</div>
          </div>
          <div className={styles.sumberList}>
            {sumberData.map((s) => {
              const width = Math.round((s.value / maxSumber) * 100);
              return (
                <div key={s.label} className={styles.sumberRow}>
                  <div className={styles.sumberLabel}>{s.label}</div>
                  <div className={styles.barTrack}><div className={styles.barFill} style={{ width: `${width}%` }} /></div>
                  <div className={styles.sumberValue}>{s.value}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* TABLE SECTION */}
      <h2 className={styles.sectionTitle}>Aktivitas Laporan Terbaru</h2>
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>NO</th>
              <th>JENIS</th>
              <th>LOKASI</th>
              <th>WAKTU</th>
              <th>STATUS</th>
              <th>PRIORITAS</th>
            </tr>
          </thead>
          <tbody>
            {tableRows.map((r) => (
              <tr key={r.no}>
                <td>{r.no}</td>
                <td className={styles.bold}>{r.jenis}</td>
                <td className={styles.mono}>{r.lokasi}</td>
                <td>{r.waktu}</td>
                <td><span className={getStatusClass(r.status)}>{r.status}</span></td>
                <td><span className={r.prioritas === 'Tinggi' ? styles.priH : styles.priN}>{r.prioritas}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}