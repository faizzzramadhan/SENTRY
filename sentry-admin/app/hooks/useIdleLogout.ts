"use client";

import { useEffect, useRef } from "react";

type Options = {
  timeoutMs: number;        // contoh: 15 * 60 * 1000
  onLogout: () => void;
};

export function useIdleLogout({ timeoutMs, onLogout }: Options) {
  const timerRef = useRef<number | null>(null);
  const intervalRef = useRef<number | null>(null);
  const loggedOutRef = useRef(false);

  const safeLogout = () => {
    if (loggedOutRef.current) return;
    loggedOutRef.current = true;
    onLogout();
  };

  const setLastActivity = () => {
    localStorage.setItem("lastActivity", String(Date.now()));
  };

  const resetTimeout = () => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      safeLogout();
    }, timeoutMs);
  };

  const onActivity = () => {
    setLastActivity();
    resetTimeout();
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    // init lastActivity jika belum ada
    const last = Number(localStorage.getItem("lastActivity") || 0);
    if (!last) setLastActivity();

    resetTimeout();

    const events: (keyof WindowEventMap)[] = [
      "mousemove",
      "mousedown",
      "keydown",
      "scroll",
      "touchstart",
    ];

    events.forEach((evt) =>
      window.addEventListener(evt, onActivity, { passive: true })
    );

    // kalau ada aktivitas di tab lain, storage event akan terpanggil
    const onStorage = (e: StorageEvent) => {
      if (e.key === "lastActivity") resetTimeout();
      if (e.key === "token" && e.newValue === null) safeLogout();
    };
    window.addEventListener("storage", onStorage);

    // backup checker: kalau timer delay, tetap logout saat lewat timeout
    intervalRef.current = window.setInterval(() => {
      const lastTs = Number(localStorage.getItem("lastActivity") || 0);
      if (lastTs && Date.now() - lastTs > timeoutMs) {
        safeLogout();
      }
    }, 30_000); // cek tiap 30 detik

    return () => {
      events.forEach((evt) => window.removeEventListener(evt, onActivity));
      window.removeEventListener("storage", onStorage);

      if (timerRef.current) window.clearTimeout(timerRef.current);
      if (intervalRef.current) window.clearInterval(intervalRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeoutMs]);
}