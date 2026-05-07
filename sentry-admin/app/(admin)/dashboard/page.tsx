"use client";

import styles from "./dashboard.module.css";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5555";

type TrendItem = {
  name: string;
  baru: number;
  ditangani: number;
};

type DashboardRow = {
  no: number;
  laporan_id: number;
  jenis: string;
  lokasi: string;
  waktu: string;
  status: string;
  prioritas: string;
};

type SumberDataItem = {
  label: string;
  value: number;
};

type DashboardData = {
  kpi: {
    laporan_bulan_ini: number;
    laporan_dalam_penanganan: number;
    laporan_butuh_verifikasi: number;
  };
  trend: TrendItem[];
  sumber_data: SumberDataItem[];
  table: DashboardRow[];
};

const defaultDashboardData: DashboardData = {
  kpi: {
    laporan_bulan_ini: 0,
    laporan_dalam_penanganan: 0,
    laporan_butuh_verifikasi: 0,
  },
  trend: [
    { name: "Minggu 1", baru: 0, ditangani: 0 },
    { name: "Minggu 2", baru: 0, ditangani: 0 },
    { name: "Minggu 3", baru: 0, ditangani: 0 },
    { name: "Minggu 4", baru: 0, ditangani: 0 },
  ],
  sumber_data: [
    { label: "HUMINT", value: 0 },
  ],
  table: [],
};

function decodeJwtPayload(token: string): any | null {
  try {
    const payload = token.split(".")[1];
    const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function formatText(value: string) {
  if (!value) return "-";

  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export default function DashboardPage() {
  const router = useRouter();

  const [userName, setUserName] = useState("Admin");
  const [dashboardData, setDashboardData] =
    useState<DashboardData>(defaultDashboardData);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  const sumberData = useMemo(() => {
    return Array.isArray(dashboardData.sumber_data) &&
      dashboardData.sumber_data.length > 0
      ? dashboardData.sumber_data
      : defaultDashboardData.sumber_data;
  }, [dashboardData.sumber_data]);

  const maxSumber = useMemo(() => {
    return Math.max(1, ...sumberData.map((item) => item.value));
  }, [sumberData]);

  useEffect(() => {
    const token = localStorage.getItem("token");

    if (!token) {
      window.location.href = "/login";
      return;
    }

    const payload = decodeJwtPayload(token);

    const name =
      payload?.usr_nama_lengkap ||
      payload?.nama_lengkap ||
      payload?.name ||
      payload?.usr_email ||
      payload?.email ||
      "Admin";

    setUserName(name);

    async function fetchDashboard() {
      try {
        setLoading(true);
        setErrorMsg("");

        const response = await fetch(`${API_BASE_URL}/humint/dashboard`, {
          method: "GET",
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result?.message || "Gagal mengambil data dashboard");
        }

        setDashboardData({
          kpi: {
            laporan_bulan_ini:
              Number(result?.data?.kpi?.laporan_bulan_ini) || 0,
            laporan_dalam_penanganan:
              Number(result?.data?.kpi?.laporan_dalam_penanganan) || 0,
            laporan_butuh_verifikasi:
              Number(result?.data?.kpi?.laporan_butuh_verifikasi) || 0,
          },
          trend:
            Array.isArray(result?.data?.trend) && result.data.trend.length > 0
              ? result.data.trend
              : defaultDashboardData.trend,
          sumber_data:
            Array.isArray(result?.data?.sumber_data) &&
            result.data.sumber_data.length > 0
              ? result.data.sumber_data.map((item: SumberDataItem) => ({
                  label: item.label || "-",
                  value: Number(item.value) || 0,
                }))
              : defaultDashboardData.sumber_data,
          table: Array.isArray(result?.data?.table) ? result.data.table : [],
        });
      } catch (error: any) {
        console.error(error);
        setErrorMsg(error?.message || "Gagal mengambil data dashboard");
        setDashboardData(defaultDashboardData);
      } finally {
        setLoading(false);
      }
    }

    fetchDashboard();
  }, []);

  const handleOpenDetail = (laporanId: number) => {
    router.push(`/humint/detail/${laporanId}`);
  };

  return (
    <div className={styles.page}>
      <div className={styles.topRow}>
        <div />
        <div className={styles.hello}>Halo, {userName}</div>
      </div>

      {errorMsg && <div className={styles.errorBox}>{errorMsg}</div>}

      <div className={styles.kpiRow}>
        <div className={styles.kpiCard}>
          <div className={styles.kpiTitle}>LAPORAN BULAN INI</div>
          <div className={styles.kpiValue}>
            {loading ? "..." : dashboardData.kpi.laporan_bulan_ini}
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiTitle}>LAPORAN DALAM PENANGANAN</div>
          <div className={styles.kpiValue}>
            {loading ? "..." : dashboardData.kpi.laporan_dalam_penanganan}
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiTitle}>LAPORAN BUTUH VERIFIKASI</div>
          <div className={styles.kpiValue}>
            {loading ? "..." : dashboardData.kpi.laporan_butuh_verifikasi}
          </div>
        </div>
      </div>

      <div className={styles.midRow}>
        <div className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <div className={styles.panelTitle}>Tren Laporan</div>
              <div className={styles.legend}>
                <span className={styles.dotBaru} />
                Laporan baru
                <span className={styles.dotT} />
                Ditangani
              </div>
            </div>

            <select className={styles.select} defaultValue="Bulanan">
              <option value="Bulanan">Bulanan</option>
            </select>
          </div>

          <div className={styles.chartWrap}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={dashboardData.trend}
                margin={{ top: 10, right: 16, left: -14, bottom: 0 }}
              >
                <CartesianGrid
                  stroke="rgba(255,255,255,0.12)"
                  strokeDasharray="3 3"
                />
                <XAxis
                  dataKey="name"
                  tick={{
                    fill: "rgba(255,255,255,0.78)",
                    fontSize: 12,
                  }}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{
                    fill: "rgba(255,255,255,0.78)",
                    fontSize: 12,
                  }}
                />
                <Tooltip
                  contentStyle={{
                    background: "#1f1f2e",
                    border: "1px solid rgba(255,255,255,0.18)",
                    borderRadius: "10px",
                    color: "#ffffff",
                  }}
                  labelStyle={{
                    color: "#ffffff",
                    fontWeight: 700,
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="baru"
                  name="Laporan Baru"
                  stroke="#c59b2d"
                  strokeWidth={3}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="ditangani"
                  name="Ditangani"
                  stroke="#8a47ff"
                  strokeWidth={3}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className={styles.panel}>
          <div className={styles.panelHeader}>
            <div className={styles.panelTitle}>Sumber Data</div>
          </div>

          <div className={styles.sumberList}>
            {sumberData.map((item) => {
              const width =
                maxSumber > 0 ? Math.round((item.value / maxSumber) * 100) : 0;

              return (
                <div key={item.label} className={styles.sumberRow}>
                  <div className={styles.sumberLabel}>{item.label}</div>

                  <div className={styles.barTrack}>
                    <div
                      className={styles.barFill}
                      style={{ width: `${width}%` }}
                    />
                  </div>

                  <div className={styles.sumberValue}>{item.value}</div>
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
            {loading ? (
              <tr>
                <td colSpan={6}>Memuat data dashboard...</td>
              </tr>
            ) : dashboardData.table.length === 0 ? (
              <tr>
                <td colSpan={6}>Belum ada laporan.</td>
              </tr>
            ) : (
              dashboardData.table.map((item) => (
                <tr
                  key={item.laporan_id}
                  className={styles.clickableRow}
                  onClick={() => handleOpenDetail(item.laporan_id)}
                  tabIndex={0}
                  role="button"
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      handleOpenDetail(item.laporan_id);
                    }
                  }}
                  title="Klik untuk melihat detail laporan"
                >
                  <td>{item.no}</td>
                  <td>{item.jenis}</td>
                  <td>{item.lokasi}</td>
                  <td>{item.waktu}</td>
                  <td>{formatText(item.status)}</td>
                  <td>{formatText(item.prioritas)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}