import styles from './humint.module.css'
import Link from 'next/link'

const data = [
  { name: "Arif Samsudin", jenis: "Longsor", status: "pending" },
  { name: "Gusti Restu", jenis: "Banjir", status: "done" },
  { name: "Arif Samsudin", jenis: "Pohon Tumbang", status: "expired" },
]

export default function HumintPage() {
  return (
    <div className={styles.container}>

      {/* TOP RIGHT */}
      <div className={styles.topRight}>
        Halo, Admin
      </div>

      {/* TITLE */}
      <h1 className={styles.title}>DASHBOARD HUMINT</h1>

      {/* ACTION BAR */}
      <div className={styles.actionBar}>
        <div className={styles.search}>
          <input placeholder="Cari berdasarkan ..." />
        </div>

        <div className={styles.buttons}>
          <button>⬇ Download</button>
          <button>⚙ Filter</button>
          <button>⇅ Sort</button>
         <Link href="/humint/addreport">
        <button className={styles.add}>＋ Tambah Laporan</button>
      </Link>
        </div>
      </div>

      {/* TABLE */}
      <div className={styles.tableWrapper}>
        <table>
          <thead>
            <tr>
              <th>No</th>
              <th>Nama Pelapor</th>
              <th>Jenis Bencana</th>
              <th>Lokasi</th>
              <th>Prioritas</th>
              <th>Status</th>
              <th>Aksi</th>
            </tr>
          </thead>

          <tbody>
            {Array.from({ length: 20 }).map((_, i) => (
              <tr key={i}>
                <td>{i + 1}</td>
                <td>Arif Samsudin</td>
                <td>Longsor</td>
                <td>-7.952345, 112.615432</td>
                <td>
                  {i % 2 === 0 ? "Prioritas Tinggi" : "Prioritas Normal"}
                </td>

                <td>
                  <span className={
                    i < 5
                      ? styles.pending
                      : i < 10
                      ? styles.process
                      : i < 13
                      ? styles.expired
                      : styles.done
                  }>
                    {i < 5
                      ? "Menunggu Verifikasi"
                      : i < 10
                      ? "Ditangani"
                      : i < 13
                      ? "Kedaluwarsa"
                      : "Selesai"}
                  </span>
                </td>
                
                <td className={styles.action}>
                  <Link href="/humint/detail">
                    <span className={styles.icon}>👁</span>
                  </Link>

                  <Link href="/humint/edit">
                    <span className={styles.icon}>✏️</span>
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* PAGINATION */}
      <div className={styles.pagination}>
        <button>{"<"}</button>
        <span className={styles.active}>1</span>
        <span>2</span>
        <span>3</span>
        <span>...</span>
        <button>{">"}</button>
      </div>

    </div>
  )
}