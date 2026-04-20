"use client";

import { useEffect, useMemo, useState } from "react";
import styles from "./profile.module.css";

type UserData = {
  usr_id: number;
  usr_email: string;
  usr_nama_lengkap: string;
  usr_no_hp: string;
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

export default function ProfilePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const [usr, setUsr] = useState<UserData | null>(null);

  const [usr_email, setEmail] = useState("");
  const [usr_password, setPassword] = useState("");
  const [usr_nama_lengkap, setNama] = useState("");
  const [usr_no_hp, setNoHp] = useState("");

  const token = useMemo(
    () => (typeof window !== "undefined" ? localStorage.getItem("token") : null),
    []
  );

  useEffect(() => {
    const run = async () => {
      setErrorMsg("");

      if (!token) {
        window.location.href = "/login";
        return;
      }

      const payload = decodeJwtPayload(token);
      const usr_id = payload?.usr_id;

      if (!usr_id) {
        localStorage.removeItem("token");
        window.location.href = "/login";
        return;
      }

      try {
        setLoading(true);

        const res = await fetch(`http://localhost:5555/user/${usr_id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const data = await res.json();

        if (!res.ok) {
          setErrorMsg(data?.message || "Gagal mengambil data user");
          return;
        }

        const userData: UserData = data.user;

        setUsr(userData);
        setEmail(userData.usr_email || "");
        setNama(userData.usr_nama_lengkap || "");
        setNoHp(userData.usr_no_hp || "");
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

    if (!token || !usr) return;

    try {
      setSaving(true);

      const body: any = {
        usr_email,
        usr_nama_lengkap,
        usr_no_hp,
      };

      if (usr_password.trim() !== "") {
        body.usr_password = usr_password;
      }

      const res = await fetch(`http://localhost:5555/user/${usr.usr_id}`, {
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

      setPassword("");
      alert("Profil berhasil disimpan");
    } catch (err: any) {
      setErrorMsg(err?.message || "Terjadi error saat menyimpan");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>PROFILE USER</h1>

      <div className={styles.cardWrap}>
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
                  value={usr_email}
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
                  value={usr_password}
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
                  value={usr_nama_lengkap}
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
                  value={usr_no_hp}
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