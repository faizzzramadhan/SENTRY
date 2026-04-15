"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import Navbar from "../components/navbar";
import LocationSearch from "../components/LocationSearch";
import styles from "./kirim-laporan.module.css";

// Import MapPicker secara dynamic
const MapPicker = dynamic(() => import("../components/MapPicker"), { 
  ssr: false,
  loading: () => <div className={styles.mapLoading} />
});

export default function KirimLaporanPage() {
  const router = useRouter();
  const [tab, setTab] = useState("non-assessment");
  
  // State Lokasi
  const [position, setPosition] = useState<[number, number]>([-7.9819, 112.6265]);
  const [lat, setLat] = useState<number>(-7.9819);
  const [lng, setLng] = useState<number>(112.6265);
  const [fileName, setFileName] = useState("");

  const handleLocationSelect = (item: any) => {
    const lt = parseFloat(item.lat);
    const ln = parseFloat(item.lon);
    setPosition([lt, ln]);
    setLat(lt);
    setLng(ln);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setFileName(file.name);
  };

  const handleTabChange = (type: string) => {
    if (type === "assessment") {
      router.push("/kirim-laporan-assessment");
    } else {
      setTab("non-assessment");
    }
  };

  return (
    <div className={styles.mainWrapper}>
      <Navbar />

      <main className={styles.mainContent}>
        <div className={styles.container}>
          
          <section className={styles.pageHeader}>
            <h1>Kirim Laporan</h1>
            <p>Laporkan kejadian bencana di Kota Malang. Tim kami siap memverifikasi laporan Anda segera.</p>
          </section>

          <div className={styles.contentGrid}>
            {/* AREA FORM (KIRI) */}
            <div className={styles.formArea}>
              <div className={styles.formCard}>
                <div className={styles.tabSwitcher}>
                  <button 
                    className={tab === "non-assessment" ? styles.activeTab : ""} 
                    onClick={() => handleTabChange("non-assessment")}
                  >
                    Non - Assessment
                  </button>
                  <button 
                    className={tab === "assessment" ? styles.activeTab : ""} 
                    onClick={() => handleTabChange("assessment")}
                  >
                    Assessment
                  </button>
                </div>

                <form className={styles.form} onSubmit={(e) => e.preventDefault()}>
                  <div className={styles.formRow}>
                    <div className={styles.inputGroup}>
                      <label>Nama Pelapor <span>*</span></label>
                      <input type="text" placeholder="Masukkan Nama Anda" />
                    </div>
                    <div className={styles.inputGroup}>
                      <label>Nomor Telepon <span>*</span></label>
                      <input type="text" placeholder="Contoh : 08738232093" />
                    </div>
                  </div>

                  <div className={styles.formRow}>
                    <div className={styles.inputGroup}>
                      <label>Jenis Bencana <span>*</span></label>
                      <select defaultValue="">
                        <option value="" disabled>Pilih Jenis Bencana</option>
                        <option value="banjir">Banjir</option>
                        <option value="longsor">Tanah Longsor</option>
                        <option value="kebakaran">Kebakaran</option>
                      </select>
                    </div>
                    <div className={styles.inputGroup}>
                      <label>Waktu Kejadian <span>*</span></label>
                      <input type="datetime-local" />
                    </div>
                  </div>

                  <div className={styles.inputGroup}>
                    <label>Kronologi Kejadian <span>*</span></label>
                    <textarea placeholder="Masukkan kronologi singkat kejadian..." rows={4}></textarea>
                  </div>

                  {/* MAPS INTEGRATION */}
                  <div className={styles.mapSection}>
                    <label className={styles.labelMaps}>Lokasi GPS <span>*</span></label>
                    <div className={styles.searchBoxMaps}>
                      <LocationSearch onSelect={handleLocationSelect} />
                    </div>
                    <div className={styles.mapFrame}>
                      <MapPicker position={position} />
                    </div>
                    <div className={styles.coordsDisplay}>
                      <div className={styles.coordItem}><strong>LAT:</strong> {lat.toFixed(6)}</div>
                      <div className={styles.coordItem}><strong>LNG:</strong> {lng.toFixed(6)}</div>
                    </div>
                  </div>

                  <div className={styles.inputGroup}>
                    <label>Alamat Lengkap <span>*</span></label>
                    <input type="text" placeholder="Masukkan alamat lengkap kejadian bencana" />
                  </div>

                  <div className={styles.inputGroup}>
                    <label>Foto Kejadian <span>*</span></label>
                    <label className={styles.uploadBox}>
                      <span className={styles.uploadIcon}>📸</span>
                      <p>{fileName ? fileName : "Ambil Foto atau Unggah Foto"}</p>
                      <input 
                        type="file" 
                        accept="image/*" 
                        className={styles.fileInputHidden} 
                        onChange={handleFileChange} 
                      />
                    </label>
                  </div>

                  <button type="submit" className={styles.btnSubmit}>Kirim Laporan</button>
                </form>
              </div>
            </div>

            {/* AREA TATA CARA (KANAN) */}
            <aside className={styles.sidebarArea}>
              <div className={styles.tutorialCard}>
                <h3 className={styles.tutorialTitle}>Tata Cara Mengirim Laporan</h3>
                
                {/* PENJELASAN JENIS LAPORAN */}
                <div className={styles.typeBoxContainer}>
                  <div className={`${styles.typeCard} ${styles.nonAssessCard}`}>
                    <div className={styles.typeHeader}>
                       <span className={styles.typeDot}></span>
                       <strong>Non-Assessment</strong>
                    </div>
                    <p>Laporan identifikasi awal. Digunakan jika informasi detail (data korban/kerusakan) belum diketahui secara pasti.</p>
                  </div>

                  <div className={`${styles.typeCard} ${styles.assessCard}`}>
                    <div className={styles.typeHeader}>
                       <span className={styles.typeDot}></span>
                       <strong>Assessment</strong>
                    </div>
                    <p>Laporan lengkap komprehensif. Wajib menyertakan data korban, dan tingkat kerusakan.</p>
                  </div>
                </div>

                <div className={styles.stepsContainer}>
                  <div className={styles.step}>
                    <div className={`${styles.iconCircle} ${styles.orangeBg}`}>👤</div>
                    <div className={styles.stepContent}>
                      <h4>Identitas Pelapor</h4>
                      <p>Nama dan nomor HP aktif untuk koordinasi petugas.</p>
                    </div>
                  </div>

                  <div className={styles.step}>
                    <div className={`${styles.iconCircle} ${styles.yellowBg}`}>!</div>
                    <div className={styles.stepContent}>
                      <h4>Detail & Kronologi</h4>
                      <p>Tulis kronologi kejadian secara singkat dan jelas.</p>
                    </div>
                  </div>

                  <div className={styles.step}>
                    <div className={`${styles.iconCircle} ${styles.blueBg}`}>📸</div>
                    <div className={styles.stepContent}>
                      <h4>Dokumentasi Foto</h4>
                      <p>Ambil foto langsung atau unggah dari galeri.</p>
                    </div>
                  </div>
                </div>

                <div className={styles.infoBox}>
                  <div className={styles.infoIcon}>i</div>
                  <p>Laporan yang tidak valid dapat menyulitkan proses penanganan oleh tim BPBD.</p>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </main>

      <footer className={styles.footer}>SENTRY © 2026. All rights reserved.</footer>
    </div>
  );
}