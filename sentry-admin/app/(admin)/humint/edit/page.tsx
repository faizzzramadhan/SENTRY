'use client'

import React, { useState } from 'react';
import styles from './edit.module.css';
import Link from 'next/link';
import dynamic from 'next/dynamic';

const MapView = dynamic(() => import('../../../components/MapView'), { 
  ssr: false,
  loading: () => <div style={{ height: '250px', background: '#0d0d0d', borderRadius: '12px' }} /> 
});

export default function EditLaporan() {
  // --- STATE DATA AKTIF (BISA DIEDIT) ---
  const [status, setStatus] = useState("Menunggu Verifikasi");
  const [petugasTRC, setPetugasTRC] = useState("Regu TRC-01 Alpha");
  const [kerusakan, setKerusakan] = useState("15 Rumah terendam air dan lumpur");
  const [terdampak, setTerdampak] = useState("45 Jiwa / 15 Kartu Keluarga");
  const [penyebab, setPenyebab] = useState("Curah hujan ekstrem & drainase tersumbat");
  const [tindakLanjut, setTindakLanjut] = useState("Tim TRC sudah berada di lokasi melakukan evakuasi.");
  
  const [korban, setKorban] = useState({ 
    anakL: 2, anakP: 1, dewasaL: 4, dewasaP: 3, lansiaL: 1, lansiaP: 1 
  });
  
  const totalKorban = Object.values(korban).reduce((a, b) => a + b, 0);

  return (
    <div className={styles.container}>
      {/* HEADER */}
      <header className={styles.header}>
        <h1>UPDATE ASSESSMENT <span className={styles.reportId}>[LAP-0021]</span></h1>
        <div className={styles.actions}>
          <Link href="/humint/detail"><button className={styles.btnBack}>Batal</button></Link>
          <button className={styles.btnSave}>Simpan Perubahan</button>
        </div>
      </header>

      <main className={styles.mainGrid}>
        
        {/* KOLOM 1: PELAPOR & KORBAN */}
        <div className={styles.column}>
          <div className={styles.card}>
            <div className={styles.cardTitle}>👤 Informasi Pelapor (View Only)</div>
            <span className={styles.viewLabel}>Nama / Telepon</span>
            <div className={styles.viewValue}>Arif Samsudin (081234567890)</div>
            <span className={styles.viewLabel}>Alamat Pelapor</span>
            <div className={styles.viewValue}>Jl. MT Haryono No. 10, Dinoyo, Malang</div>
          </div>

          <div className={styles.card}>
            <div className={styles.cardTitle}>⚙️ Status & Petugas (Aktif)</div>
            <div className={styles.inputGroup}>
              <label>Ubah Status Laporan</label>
              <select value={status} onChange={(e) => setStatus(e.target.value)}>
                <option>Menunggu Verifikasi</option>
                <option>Terverifikasi</option>
                <option>Selesai</option>
              </select>
            </div>
            <div className={styles.inputGroup}>
              <label>Input Petugas TRC</label>
              <input type="text" value={petugasTRC} onChange={(e) => setPetugasTRC(e.target.value)} />
            </div>
          </div>

          <div className={styles.card}>
            <div className={styles.cardTitle}>👥 Data Korban (Aktif)</div>
            <div className={styles.korbanTable}>
              <div className={styles.korbanHead}><div>Gender</div><div>Anak</div><div>Dewasa</div><div>Lansia</div></div>
              <div className={styles.korbanRow}>
                <div style={{fontSize:'11px', color:'#888'}}>L-Laki</div>
                <input type="number" value={korban.anakL} onChange={(e)=>setKorban({...korban, anakL:+e.target.value})}/>
                <input type="number" value={korban.dewasaL} onChange={(e)=>setKorban({...korban, dewasaL:+e.target.value})}/>
                <input type="number" value={korban.lansiaL} onChange={(e)=>setKorban({...korban, lansiaL:+e.target.value})}/>
              </div>
              <div className={styles.korbanRow}>
                <div style={{fontSize:'11px', color:'#888'}}>Peremp</div>
                <input type="number" value={korban.anakP} onChange={(e)=>setKorban({...korban, anakP:+e.target.value})}/>
                <input type="number" value={korban.dewasaP} onChange={(e)=>setKorban({...korban, dewasaP:+e.target.value})}/>
                <input type="number" value={korban.lansiaP} onChange={(e)=>setKorban({...korban, lansiaP:+e.target.value})}/>
              </div>
              <div className={styles.totalText}>Total: <strong>{totalKorban} Orang</strong></div>
            </div>
          </div>
        </div>

        {/* KOLOM 2: KEJADIAN & ASSESSMENT */}
        <div className={styles.column}>
          <div className={styles.card}>
            <div className={styles.cardTitle}>🚨 Detail Kejadian (View Only)</div>
            <span className={styles.viewLabel}>Banjir - Malang</span>
            <div className={styles.viewValue}>Waktu: 12 Feb 2026 - 14:00</div>
            <span className={styles.viewLabel}>Kronologi Awal Masyarakat</span>
            <div className={styles.viewValue}>Hujan deras sejak dini hari menyebabkan luapan air setinggi 1,5 meter...</div>
          </div>

          <div className={styles.card}>
            <div className={styles.cardTitle}>📊 Assessment Dampak (Aktif)</div>
            <div className={styles.inputGroup}>
              <label>Rincian Kerusakan</label>
              <textarea value={kerusakan} onChange={(e) => setKerusakan(e.target.value)} rows={2} />
            </div>
            <div className={styles.inputGroup}>
              <label>Warga/Objek Terdampak</label>
              <input type="text" value={terdampak} onChange={(e) => setTerdampak(e.target.value)} />
            </div>
            <div className={styles.inputGroup}>
              <label>Faktor Penyebab</label>
              <input type="text" value={penyebab} onChange={(e) => setPenyebab(e.target.value)} />
            </div>
            <div className={styles.inputGroup}>
              <label>Tindak Lanjut (Real Action)</label>
              <textarea value={tindakLanjut} onChange={(e) => setTindakLanjut(e.target.value)} rows={3} />
            </div>
          </div>
        </div>

        {/* KOLOM 3: LOKASI & OSINT */}
        <div className={styles.column}>
          <div className={styles.card} style={{opacity: 0.8}}>
            <div className={styles.cardTitle}>📍 Peta & Foto (Read Only)</div>
            <div className={styles.mapContainer} style={{filter: 'grayscale(50%)'}}><MapView /></div>
            <div className={styles.imgFrame} style={{marginTop: '15px'}}>
              <img src="https://images.unsplash.com/photo-1605727216801-e27ce1d0cc28" alt="Flood" />
            </div>
            <table className={styles.exifTable}>
              <tbody>
                <tr><td>Latitude</td><td>-7.942432</td></tr>
                <tr><td>Validasi</td><td className={styles.statusSuccess}>Cocok GPS</td></tr>
              </tbody>
            </table>
          </div>

          <div className={styles.card} style={{opacity: 0.85}}>
            <div className={styles.cardTitle}>🌐 Data Pendukung (OSINT)</div>
            <div className={styles.osintTable}>
              <div className={styles.osintRow}>
                <div className={styles.osintLabel}>Sumber</div>
                <div className={styles.osintValue}>X (Twitter)</div>
              </div>
              <div className={styles.osintRow}>
                <div className={styles.osintLabel}>Waktu Unggah</div>
                <div className={styles.osintValue}>12 Feb 2026 – 13:32</div>
              </div>
              <div className={styles.osintRow}>
                <div className={styles.osintLabel}>Isi Konten</div>
                <div className={styles.osintValue}>"Banjir Soehat makin tinggi guys, hati-hati yang lewat sini!"</div>
              </div>
              <div className={styles.osintRow} style={{ borderBottom: 'none' }}>
                <div className={styles.osintLabel}>Status Sync</div>
                <div className={styles.osintValue} style={{ color: '#22c55e' }}>✓ Terverifikasi</div>
              </div>
            </div>
          </div>
        </div>

      </main>
    </div>
  );
}