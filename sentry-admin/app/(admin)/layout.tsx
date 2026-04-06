"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Sidebar from "../components/sidebar";
import styles from "./adminLayout.module.css";
import { useIdleLogout } from "../hooks/useIdleLogout";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  const [ready, setReady] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // ✅ atur batas idle di sini (contoh 15 menit)
  const IDLE_TIMEOUT_MS = 15 * 60 * 1000;

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("lastActivity");
    router.replace("/login");
  };

  // ✅ aktifkan auto logout saat idle
  useIdleLogout({ timeoutMs: IDLE_TIMEOUT_MS, onLogout: logout });

  // protect admin routes
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.replace("/login");
      return;
    }
    setReady(true);
  }, [router, pathname]);

  // auto close on small screens, auto open on large screens
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 980px)");
    const apply = () => setSidebarOpen(!mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  if (!ready) return null;

  return (
    <div className={styles.shell}>
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <button
        className={styles.sidebarToggle}
        type="button"
        onClick={() => setSidebarOpen((v) => !v)}
        aria-label="Toggle sidebar"
      >
        <span />
        <span />
        <span />
      </button>

      <div className={styles.main}>{children}</div>
    </div>
  );
}