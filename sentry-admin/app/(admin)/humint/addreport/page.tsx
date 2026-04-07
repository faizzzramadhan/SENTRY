'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import styles from './addreport.module.css'
import LocationSearch from './LocationSearch'
import Link from 'next/link'

const MapPicker = dynamic(() => import('./MapPicker'), { ssr: false })

export default function Page() {

  const [position, setPosition] = useState<any>([-7.95, 112.61])

  // 
  const [lat, setLat] = useState<number>(0)
  const [lng, setLng] = useState<number>(0)

  const [photos, setPhotos] = useState<File[]>([])

  // DATA KORBAN
  const [jenisKorban, setJenisKorban] = useState('luka')

  const [korban, setKorban] = useState({
    anakL: 0, anakP: 0,
    dewasaL: 0, dewasaP: 0,
    lansiaL: 0, lansiaP: 0,
  })

  const totalKorban = Object.values(korban).reduce((a,b)=>a+b,0)

  const handleUpload = (e:any) => {
    const files = Array.from(e.target.files) as File[]
    if (files.length + photos.length > 3) {
      alert('Max 3 foto')
      return
    }
    setPhotos([...photos, ...files])
  }

  return (
    <div className={styles.container}>

      {/* HEADER */}
      <div className={styles.header}>
        <h1>TAMBAH LAPORAN</h1>

        <Link href="/humint">
          <button className={styles.back}>← Kembali</button>
        </Link>
      </div>

      <div className={styles.card}>

        <div className={styles.grid}>

          {/* LEFT */}
          <div>

            <div className={styles.field}>
              <label>Nama Pelapor</label>
              <input placeholder="Masukkan nama pelapor" />
            </div>

            <div className={styles.field}>
              <label>Nomor Telepon</label>
              <input placeholder="Masukkan nomor telepon" />
            </div>

            <div className={styles.field}>
              <label>Jenis Bencana</label>
              <select>
                <option>Pilih jenis bencana</option>
                <option>Banjir</option>
                <option>Longsor</option>
              </select>
            </div>

            <div className={styles.field}>
              <label>Waktu Kejadian</label>
              <input type="date" />
            </div>

            <div className={styles.field}>
              <label>Koordinat</label>
              <div className={styles.row}>
                <input value={lat} readOnly />
                <input value={lng} readOnly />
              </div>
            </div>

            {/* DATA KORBAN */}
            <div className={styles.korbanBox}>

              <div className={styles.korbanHeader}>
                <div>
                  <label>Data Korban</label>
                  <p>Pilih jenis korban</p>
                </div>

                <select onChange={(e)=>setJenisKorban(e.target.value)}>
                  <option value="luka">Luka/Sakit</option>
                  <option value="meninggal">Meninggal</option>
                  <option value="hilang">Hilang</option>
                </select>
              </div>

              <div className={styles.korbanHead}>
                <div></div>
                <div>Anak (0–17 th)</div>
                <div>Dewasa (18–59 th)</div>
                <div>Lansia (59+ th)</div>
              </div>

              <div className={styles.korbanRow}>
                <div>Laki-laki</div>
                <input type="number" onChange={(e)=>setKorban({...korban, anakL:+e.target.value})}/>
                <input type="number" onChange={(e)=>setKorban({...korban, dewasaL:+e.target.value})}/>
                <input type="number" onChange={(e)=>setKorban({...korban, lansiaL:+e.target.value})}/>
              </div>

              <div className={styles.korbanRow}>
                <div>Perempuan</div>
                <input type="number" onChange={(e)=>setKorban({...korban, anakP:+e.target.value})}/>
                <input type="number" onChange={(e)=>setKorban({...korban, dewasaP:+e.target.value})}/>
                <input type="number" onChange={(e)=>setKorban({...korban, lansiaP:+e.target.value})}/>
              </div>

              <p className={styles.total}>
                Total {jenisKorban}: {totalKorban} Orang
              </p>

            </div>

            <div className={styles.field}>
              <label>Kerugian</label>
              <input />
            </div>

            <div className={styles.field}>
              <label>Alamat Lengkap</label>
              <textarea />
            </div>

          </div>

          {/* RIGHT */}
          <div>

            <div className={styles.field}><label>Kerusakan</label><textarea /></div>
            <div className={styles.field}><label>Terdampak</label><textarea /></div>
            <div className={styles.field}><label>Penyebab</label><textarea /></div>
            <div className={styles.field}><label>Tindak Lanjut</label><textarea /></div>
            <div className={styles.field}><label>Kronologi</label><textarea /></div>

            {/* UPLOAD */}
            <div className={styles.uploadBox}>
              <div className={styles.uploadIcon}>⬆</div>
              <p>Upload Foto Kejadian</p>
              <span>Max 2MB</span>
              <input type="file" />
            </div>

            <div className={styles.uploadBox}>
              <div className={styles.uploadIcon}>⬆</div>
              <p>Upload Foto Kerusakan</p>
              <span>Max 2MB (max 3 file)</span>
              <input type="file" multiple onChange={handleUpload} />
            </div>

            <div className={styles.preview}>
              {photos.map((f,i)=>(
                <img key={i} src={URL.createObjectURL(f)} />
              ))}
            </div>

          </div>

        </div>

        {/* MAP */}
        <div className={styles.mapSection}>
          <label>Cari Lokasi Kejadian</label>

          <LocationSearch
            onSelect={(item:any)=>{
              const lat = parseFloat(item.lat)
              const lon = parseFloat(item.lon)
              setPosition([lat,lon])
              setLat(lat)
              setLng(lon)
            }}
          />

          <MapPicker position={position}/>
        </div>

       
        <div className={styles.bottomAction}>
          <button className={styles.save}>Simpan Laporan</button>
        </div>

      </div>

    </div>
  )
}