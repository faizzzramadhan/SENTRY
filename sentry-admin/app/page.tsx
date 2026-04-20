"use client";

import Image from "next/image";
import styles from "../app/login/login.module.css";
import { useState } from "react";

function decodeJwtPayload(token: string): any | null {
  try {
    const payload = token.split(".")[1];
    const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export default function LoginPage() {
  const [usr_email, setEmail] = useState("");
  const [usr_password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const redirectByRole = (role?: string) => {
    if (role === "admin") {
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

      const res = await fetch("http://localhost:5555/user/auth", {
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

      if (!res.ok || !data.logged) {
        setErrorMsg(data?.message || "Login gagal");
        return;
      }

      localStorage.setItem("token", data.token);

      const tokenPayload = decodeJwtPayload(data.token);
      const role = data?.user?.usr_role || tokenPayload?.usr_role || "staff";

      redirectByRole(role);
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