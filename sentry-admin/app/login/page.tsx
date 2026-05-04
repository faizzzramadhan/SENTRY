"use client";

import Image from "next/image";
import styles from "../login/login.module.css";
import { useState } from "react";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5555";

type LoginUser = {
  usr_id: number;
  usr_nama_lengkap: string;
  usr_email: string;
  usr_role: "staff" | "admin";
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

function normalizeRole(value: unknown): "staff" | "admin" {
  const role = String(value || "").trim().toLowerCase();
  return role === "admin" ? "admin" : "staff";
}

function saveLoginSession(token: string, user: LoginUser) {
  // Hapus session lama dulu agar tidak ada sisa nama/role admin saat login sebagai staff.
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  localStorage.removeItem("usr_id");
  localStorage.removeItem("usr_nama_lengkap");
  localStorage.removeItem("usr_email");
  localStorage.removeItem("usr_role");
  localStorage.removeItem("role");

  localStorage.setItem("token", token);
  localStorage.setItem("user", JSON.stringify(user));
  localStorage.setItem("usr_id", String(user.usr_id));
  localStorage.setItem("usr_nama_lengkap", user.usr_nama_lengkap);
  localStorage.setItem("usr_email", user.usr_email);
  localStorage.setItem("usr_role", user.usr_role);
  localStorage.setItem("role", user.usr_role);
}

export default function LoginPage() {
  const [usr_email, setEmail] = useState("");
  const [usr_password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const redirectByRole = (role?: string) => {
    if (normalizeRole(role) === "admin") {
      window.location.href = "/manage-staff";
      return;
    }

    window.location.href = "/dashboard";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    try {
      setLoading(true);

      const res = await fetch(`${API_BASE_URL}/user/auth`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usr_email, usr_password }),
      });

      const text = await res.text();
      let data: any = null;

      try {
        data = JSON.parse(text);
      } catch {
        setErrorMsg("Response login bukan JSON. Cek route backend /user/auth.");
        return;
      }

      if (!res.ok || !data.logged || !data.token || !data.user) {
        setErrorMsg(data?.message || "Login gagal");
        return;
      }

      const tokenPayload = decodeJwtPayload(data.token);

      const loginUser: LoginUser = {
        usr_id: Number(data.user.usr_id || tokenPayload?.usr_id),
        usr_nama_lengkap:
          data.user.usr_nama_lengkap || tokenPayload?.usr_nama_lengkap || "User",
        usr_email: data.user.usr_email || tokenPayload?.usr_email || usr_email,
        usr_role: normalizeRole(data.user.usr_role || tokenPayload?.usr_role),
      };

      saveLoginSession(data.token, loginUser);
      redirectByRole(loginUser.usr_role);
    } catch (err: any) {
      setErrorMsg(err?.message || "Terjadi error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className={styles.bg}>
      <div className={styles.blobRed} />
      <div className={styles.blobYellow} />

      <section className={styles.card}>
        <div className={styles.logoWrap}>
          <Image
            src="/bpbd-logo.png"
            alt="Logo BPBD"
            width={110}
            height={110}
            priority
          />
        </div>

        <p className={styles.org}>BPBD Kota Malang</p>
        <h1 className={styles.title}>Sign In</h1>

        <form className={styles.form} onSubmit={handleSubmit}>
          <label className={styles.label}>
            Email<span className={styles.req}>*</span>
          </label>
          <input
            className={styles.input}
            type="email"
            placeholder="isi alamat email anda disini..."
            value={usr_email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <label className={styles.label}>
            Password<span className={styles.req}>*</span>
          </label>
          <input
            className={styles.input}
            type="password"
            placeholder="percaya padaku ini aman..."
            value={usr_password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          {errorMsg ? <p className={styles.error}>{errorMsg}</p> : null}

          <button className={styles.button} type="submit" disabled={loading}>
            {loading ? "Loading..." : "Sign In"}
          </button>
        </form>
      </section>
    </main>
  );
}
