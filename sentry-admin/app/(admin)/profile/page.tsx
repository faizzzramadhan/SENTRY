"use client";

import { useEffect, useMemo, useState } from "react";
import styles from "./profile.module.css";

type AdminData = {
  adm_id: number;
  adm_email: string;
  adm_nama_lengkap: string;
  adm_no_hp: string;
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

export default function ProfilePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const [adm, setAdm] = useState<AdminData | null>(null);

  // form state
  const [adm_email, setEmail] = useState("");
  const [adm_password, setPassword] = useState(""); // opsional
  const [adm_nama_lengkap, setNama] = useState("");
  const [adm_no_hp, setNoHp] = useState("");

  const token = useMemo(() => (typeof window !== "undefined" ? localStorage.getItem("token") : null), []);

  useEffect(() => {
    const run = async () => {
      setErrorMsg("");
      if (!token) {
        window.location.href = "/login";
        return;
      }

      const payload = decodeJwtPayload(token);
      const adm_id = payload?.adm_id || payload?.ADM_ID; // antisipasi kalau payload lama

      if (!adm_id) {
        localStorage.removeItem("token");
        window.location.href = "/login";
        return;
      }

      try {
        setLoading(true);

        const res = await fetch(`http://localhost:5555/admin/${adm_id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const data = await res.json();

        if (!res.ok) {
          setErrorMsg(data?.message || "Gagal mengambil data admin");
          return;
        }

        const adminData: AdminData = data.admin;

        setAdm(adminData);
        setEmail(adminData.adm_email || "");
        setNama(adminData.adm_nama_lengkap || "");
        setNoHp(adminData.adm_no_hp || "");
      } catch (err: any) {
        setErrorMsg(err?.message || "Terjadi error");
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [token]);

  const onSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!token || !adm) return;

    try {
      setSaving(true);

      // password hanya dikirim kalau diisi
      const body: any = {
        adm_email,
        adm_nama_lengkap,
        adm_no_hp,
      };
      if (adm_password.trim() !== "") body.adm_password = adm_password;

      const res = await fetch(`http://localhost:5555/admin/${adm.adm_id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data?.message || "Gagal menyimpan perubahan");
        return;
      }

      // refresh view state
      setPassword("");
      // opsional: tampilkan notifikasi sederhana
      alert("Profil berhasil disimpan");
    } catch (err: any) {
      setErrorMsg(err?.message || "Terjadi error saat menyimpan");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>PROFILE ADMIN</h1>

      <div className={styles.cardWrap}>
        {/* blob pink kanan bawah */}
        <div className={styles.blobPink} />

        {loading ? (
          <div className={styles.loading}>Memuat data...</div>
        ) : (
          <form className={styles.card} onSubmit={onSave}>
            <div className={styles.grid}>
              <div className={styles.field}>
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
              </div>

              <div className={styles.field}>
                <label className={styles.label}>
                  Password<span className={styles.req}>*</span>
                </label>
                <input
                  className={styles.input}
                  type="password"
                  placeholder="percaya padaku ini aman..."
                  value={adm_password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <div className={styles.hint}>
                  Kosongkan jika tidak ingin mengganti password.
                </div>
              </div>

              <div className={styles.field}>
                <label className={styles.label}>
                  Nama Lengkap<span className={styles.req}>*</span>
                </label>
                <input
                  className={styles.input}
                  type="text"
                  placeholder="isi nama lengkap anda disini..."
                  value={adm_nama_lengkap}
                  onChange={(e) => setNama(e.target.value)}
                  required
                />
              </div>

              <div className={styles.field}>
                <label className={styles.label}>
                  No Telp<span className={styles.req}>*</span>
                </label>
                <input
                  className={styles.input}
                  type="text"
                  placeholder="isi nomor telepon anda disini..."
                  value={adm_no_hp}
                  onChange={(e) => setNoHp(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className={styles.statusBlock}>
              <div className={styles.statusLabel}>Status Akun</div>
              <div className={styles.statusValue}>AKTIF</div>
            </div>

            {errorMsg ? <div className={styles.error}>{errorMsg}</div> : null}

            <button className={styles.btn} type="submit" disabled={saving}>
              {saving ? "Menyimpan..." : "Simpan"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}