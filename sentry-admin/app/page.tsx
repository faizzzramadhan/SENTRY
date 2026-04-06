"use client";

import Image from "next/image";
import styles from "../app/login/login.module.css";
import { useState } from "react";

export default function LoginPage() {
  const [adm_email, setEmail] = useState("");
  const [adm_password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    // Kalau kamu belum mau integrasi backend sekarang,
    // kamu bisa hapus seluruh bagian fetch di bawah ini.
    try {
      setLoading(true);
      const res = await fetch("http://localhost:5555/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adm_email, adm_password }),
      });

      const data = await res.json();

      if (!res.ok || !data.logged) {
        setErrorMsg(data?.message || "Login gagal");
        return;
      }

      // simpan token (opsi sederhana)
      localStorage.setItem("token", data.token);

      // redirect (ubah sesuai route dashboard kamu)
      window.location.href = "/dashboard";
    } catch (err: any) {
      setErrorMsg(err?.message || "Terjadi error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className={styles.bg}>
      {/* blobs */}
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
            value={adm_email}
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
            value={adm_password}
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