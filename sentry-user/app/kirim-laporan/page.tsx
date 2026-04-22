"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import Navbar from "../components/navbar";
import LocationSearch from "../components/LocationSearch";
import styles from "./kirim-laporan.module.css";

const MapPicker = dynamic(() => import("../components/MapPicker"), { 
  ssr: false,
  loading: () => <div className={styles.mapLoading} />
});

export default function KirimLaporanPage() {
  const router = useRouter();
  const [isAssessment, setIsAssessment] = useState(false);
  
  // --- STATE (Hanya dideklarasikan satu kali) ---
  const [fileNameKejadian, setFileNameKejadian] = useState("");
  const [filesKerusakan, setFilesKerusakan] = useState<File[]>([]);
  const [position, setPosition] = useState<[number, number]>([-7.9819, 112.6265]);
  const [lat, setLat] = useState<number>(-7.9819);
  const [lng, setLng] = useState<number>(112.6265);

  const [jenisKorban, setJenisKorban] = useState("luka");
  const [korban, setKorban] = useState({
    anakL: 0, dewasaL: 0, lansiaL: 0,
    anakP: 0, dewasaP: 0, lansiaP: 0
  });

  const totalKorban =
    korban.anakL + korban.dewasaL + korban.lansiaL +
    korban.anakP + korban.dewasaP + korban.lansiaP;

  // --- FUNGSI HANDLER ---

  const handleGetCurrentLocation = () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          setPosition([latitude, longitude]);
          setLat(latitude);
          setLng(longitude);
        },
        (err) => {
          alert("Gagal mengambil lokasi: " + err.message);
        }
      );
    } else {
      alert("Geolocation tidak didukung oleh browser Anda");
    }
  };

  const handleLocationSelect = (item: any) => {
    const lt = parseFloat(item.lat);
    const ln = parseFloat(item.lon);
    setPosition([lt, ln]);
    setLat(lt);
    setLng(ln);
  };

  const validateFile = (file: File) => {
    const validTypes = ["image/png", "image/jpeg", "image/jpg"];
    return validTypes.includes(file.type);
  };

  const handleFileKejadian = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!validateFile(file)) {
        alert("Format file salah! Hanya bisa .png, .jpg, atau .jpeg");
        e.target.value = ""; 
        return;
      }
      setFileNameKejadian(file.name);
    }
  };

  const handleFileKerusakan = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      
      const allValid = selectedFiles.every(validateFile);
      if (!allValid) {
        alert("Salah satu file formatnya salah! Gunakan .png, .jpg, atau .jpeg");
        e.target.value = "";
        return;
      }

      if (selectedFiles.length > 3) {
        alert("Maksimal unggah 3 foto kerusakan");
        return;
      }
      setFilesKerusakan(selectedFiles);
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
            <div className={styles.formArea}>
              <div className={styles.formCard}>
                <div className={styles.tabSwitcher}>
                  <button 
                    type="button" 
                    className={!isAssessment ? styles.activeTab : ""} 
                    onClick={() => setIsAssessment(false)}
                  >
                    Non - Assessment
                  </button>
                  <button 
                    type="button" 
                    className={isAssessment ? styles.activeTab : ""} 
                    onClick={() => setIsAssessment(true)}
                  >
                    Assessment
                  </button>
                </div>

                <form className={styles.form} onSubmit={(e) => e.preventDefault()}>
                  <h3>Informasi Kejadian</h3>

                  <div className={styles.formRow}>
                    <div className={styles.inputGroup}>
                      <label>Nama Pelapor *</label>
                      <input type="text" placeholder="Masukkan Nama Anda" />
                    </div>
                    <div className={styles.inputGroup}>
                      <label>Nomor Telepon *</label>
                      <input type="text" placeholder="Nomor telepon" />
                    </div>
                  </div>

                  <div className={styles.formRow}>
                    <div className={styles.inputGroup}>
                      <label>Jenis Bencana *</label>
                      <select defaultValue="">
                        <option value="" disabled>Pilih Jenis Bencana</option>
                        <option>Banjir</option>
                        <option>Longsor</option>
                        <option>Kebakaran</option>
                      </select>
                    </div>
                    <div className={styles.inputGroup}>
                      <label>Waktu Kejadian *</label>
                      <input type="datetime-local" />
                    </div>
                  </div>

                  {/* KECAMATAN & KELURAHAN (DROPDOWN) */}
                  <div className={styles.formRow}>
                    <div className={styles.inputGroup}>
                      <label>Kecamatan *</label>
                      <select defaultValue="">
                        <option value="" disabled>Pilih Kecamatan</option>
                        <option>Blimbing</option>
                        <option>Kedungkandang</option>
                        <option>Klojen</option>
                        <option>Lowokwaru</option>
                        <option>Sukun</option>
                      </select>
                    </div>
                    <div className={styles.inputGroup}>
                      <label>Kelurahan *</label>
                      <select defaultValue="">
                        <option value="" disabled>Pilih Kelurahan</option>
                        {/* Contoh Kelurahan Kota Malang */}
                        <option>Arjosari</option>
                        <option>Balearjosari</option>
                        <option>Jatimulyo</option>
                        <option>Tulusrejo</option>
                      </select>
                    </div>
                  </div>

                  <div className={styles.inputGroup}>
                    <label>Kronologi Kejadian *</label>
                    <textarea placeholder="Masukkan kronologi secara lengkap" />
                  </div>

                  {/* UPLOAD FOTO (BERDAMPINGAN DENGAN UKURAN KONSISTEN) */}
                  <div className={styles.formRow}>
                    <div className={styles.inputGroup}>
                      <label>Foto Kejadian *</label>
                      <label className={styles.uploadBox}>
                        <span className={styles.uploadIcon}>📸</span>
                        <p className={styles.uploadText}>{fileNameKejadian || "Ambil Foto atau Unggah Foto Kejadian"}</p>
                        <input 
                          type="file" 
                          className={styles.fileInputHidden} 
                          onChange={(e) => setFileNameKejadian(e.target.files?.[0]?.name || "")} 
                        />
                      </label>
                    </div>

                    {isAssessment && (
                      <div className={styles.inputGroup}>
                        <label>Foto Kerusakan (Maks 3) *</label>
                        <label className={styles.uploadBox}>
                          <span className={styles.uploadIcon}>🏘️</span>
                          <div className={styles.fileListInfo}>
                            {filesKerusakan.length > 0 
                              ? filesKerusakan.map((f, i) => <small key={i} className={styles.uploadText}>{f.name}</small>)
                              : <p className={styles.uploadText}>Pilih hingga 3 foto</p>
                            }
                          </div>
                          <input 
                            type="file" 
                            multiple 
                            className={styles.fileInputHidden} 
                            onChange={handleFileKerusakan} 
                          />
                        </label>
                      </div>
                    )}
                  </div>

                  <div className={styles.mapSection}>
                    <label style={{fontWeight: 'bold', marginBottom: '8px', display: 'block'}}>Pilih Titik Lokasi *</label>
                    <LocationSearch onSelect={handleLocationSelect} />
                    <div className={styles.mapFrame}>
                      <MapPicker position={position} />
                    </div>
                    {/* KOORDINAT PIN */}
                    <div className={styles.latLngDisplay}>
                       <div><strong>Latitude:</strong> {lat}</div>
                       <div><strong>Longitude:</strong> {lng}</div>
                    </div>
                  </div>

                  <div className={styles.inputGroup}>
                    <label>Alamat Lengkap *</label>
                    <input placeholder="Masukkan alamat lengkap (Nama Jalan, No. Rumah, dsb)" />
                  </div>

                  {/* BAGIAN ASSESSMENT (TETAP LENGKAP) */}
                  {isAssessment && (
                    <>
                      <h3>Data Assessment</h3>
                      <div className={styles.inputGroup}>
                        <label>Pilih jenis korban</label>
                        <select value={jenisKorban} onChange={(e) => setJenisKorban(e.target.value)}>
                          <option value="luka">Luka/Sakit</option>
                          <option value="meninggal">Meninggal</option>
                          <option value="mengungsi">Mengungsi</option>
                          <option value="hilang">Hilang</option>
                        </select>
                      </div>

                      <div className={styles.korbanTable}>
                        <div className={styles.korbanHead}>
                          <div>Gender</div><div>Anak (0–17)</div><div>Dewasa (18–59)</div><div>Lansia (60+)</div>
                        </div>
                        <div className={styles.korbanRow}>
                          <div>Laki-laki</div>
                          <input type="number" value={korban.anakL} onChange={(e) => setKorban({ ...korban, anakL: +e.target.value || 0 })} />
                          <input type="number" value={korban.dewasaL} onChange={(e) => setKorban({ ...korban, dewasaL: +e.target.value || 0 })} />
                          <input type="number" value={korban.lansiaL} onChange={(e) => setKorban({ ...korban, lansiaL: +e.target.value || 0 })} />
                        </div>
                        <div className={styles.korbanRow}>
                          <div>Perempuan</div>
                          <input type="number" value={korban.anakP} onChange={(e) => setKorban({ ...korban, anakP: +e.target.value || 0 })} />
                          <input type="number" value={korban.dewasaP} onChange={(e) => setKorban({ ...korban, dewasaP: +e.target.value || 0 })} />
                          <input type="number" value={korban.lansiaP} onChange={(e) => setKorban({ ...korban, lansiaP: +e.target.value || 0 })} />
                        </div>
                        <div className={styles.totalText}>
                          Total {jenisKorban}: <strong>{totalKorban} Orang</strong>
                        </div>
                      </div>

                      {/* TAMPILAN RINGKASAN DAMPAK */}
                      <div className={styles.summaryContainer}>
                        <h4>Ringkasan Dampak Korban:</h4>
                        <div className={styles.summaryGrid}>
                          <div className={`${styles.summaryCard} ${jenisKorban === 'meninggal' ? styles.activeSummary : ''}`}>
                            <span>🔴</span><p>Meninggal</p><strong>{jenisKorban === "meninggal" ? totalKorban : 0}</strong>
                          </div>
                          <div className={`${styles.summaryCard} ${jenisKorban === 'luka' ? styles.activeSummary : ''}`}>
                            <span>🔵</span><p>Luka/Sakit</p><strong>{jenisKorban === "luka" ? totalKorban : 0}</strong>
                          </div>
                          <div className={`${styles.summaryCard} ${jenisKorban === 'mengungsi' ? styles.activeSummary : ''}`}>
                            <span>🟢</span><p>Mengungsi</p><strong>{jenisKorban === "mengungsi" ? totalKorban : 0}</strong>
                          </div>
                          <div className={`${styles.summaryCard} ${jenisKorban === 'hilang' ? styles.activeSummary : ''}`}>
                            <span>🟡</span><p>Hilang</p><strong>{jenisKorban === "hilang" ? totalKorban : 0}</strong>
                          </div>
                        </div>
                        <p className={styles.totalBadge}>Total Keseluruhan Korban: {totalKorban} Orang</p>
                      </div>

                      <div className={styles.formRow}>
                        <div className={styles.inputGroup}>
                          <label>Kerusakan *</label>
                          <textarea placeholder="Sebutkan kerusakan bangunan atau fasilitas umum" />
                        </div>
                        <div className={styles.inputGroup}>
                          <label>Penyebab *</label>
                          <textarea placeholder="Contoh: Hujan lebat disertai angin kencang" />
                        </div>
                      </div>

                      <div className={styles.inputGroup}>
                        <label>Terdampak *</label>
                        <textarea placeholder="Contoh: 10 KK / 40 Jiwa terdampak di wilayah RT 01" />
                      </div>
                    </>
                  )}

                  <button type="submit" className={styles.btnSubmit}>Kirim Laporan</button>
                </form>
              </div>
            </div>

            {/* SIDEBAR TATA CARA */}
            <aside className={styles.sidebarArea}>
              <div className={styles.tutorialCard}>
                <h3 className={styles.tutorialTitle}>Tata Cara Mengirim Laporan</h3>
                <div className={styles.typeBoxContainer}>
                  <div className={`${styles.typeCard} ${styles.nonAssessCard}`}>
                    <div className={styles.typeHeader}><span className={styles.typeDot}></span><strong>Non-Assessment</strong></div>
                    <p>Laporan identifikasi awal. Digunakan jika informasi detail belum diketahui secara pasti.</p>
                  </div>
                  <div className={`${styles.typeCard} ${styles.assessCard}`}>
                    <div className={styles.typeHeader}><span className={styles.typeDot}></span><strong>Assessment</strong></div>
                    <p>Laporan lengkap komprehensif. Wajib menyertakan data korban, dan tingkat kerusakan.</p>
                  </div>
                </div>

                <div className={styles.stepsContainer}>
                  <div className={styles.step}>
                    <div className={`${styles.iconCircle} ${styles.orangeBg}`}>👤</div>
                    <div className={styles.stepContent}><h4>Identitas Pelapor</h4><p>Nama dan nomor HP aktif.</p></div>
                  </div>
                  <div className={styles.step}>
                    <div className={`${styles.iconCircle} ${styles.yellowBg}`}>!</div>
                    <div className={styles.stepContent}><h4>Detail & Kronologi</h4><p>Tulis kronologi singkat dan jelas.</p></div>
                  </div>
                  <div className={styles.step}>
                    <div className={`${styles.iconCircle} ${styles.blueBg}`}>📸</div>
                    <div className={styles.stepContent}><h4>Dokumentasi Foto</h4><p>Ambil bukti visual kejadian atau kerusakan.</p></div>
                  </div>
                </div>

                <div className={styles.infoBox}>
                  <div className={styles.infoIcon}>i</div>
                  <p>Laporan tidak valid dapat menyulitkan penanganan BPBD.</p>
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