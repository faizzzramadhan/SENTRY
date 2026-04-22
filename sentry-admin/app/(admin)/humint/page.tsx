"use client";

import React from 'react';
import styles from './humint.module.css';
import Link from 'next/link';

export default function HumintPage() {
  // Loop 10 data
  const dummyData = Array.from({ length: 10 }).map((_, i) => ({
    id: i + 1,
    name: "Arif Samsudin",
    jenis: i % 2 === 0 ? "Longsor" : "Banjir",
    lokasi: "-7.952345, 112.615432",
    prioritas: "Tinggi",
    status: i % 2 === 0 ? "pending" : "done"
  }));

  return (
    <div className={styles.container}>
      
      {/* HEADER */}
      <div className={styles.headerTop}>
        <h1 className={styles.title}>DASHBOARD HUMINT</h1>
        <div className={styles.hello}>Halo, Admin</div>
      </div>

      {/* ACTION BAR */}
      <div className={styles.actionBar}>
        <div className={styles.search}>
          <input type="text" placeholder="Cari berdasarkan ..." />
        </div>
        <div className={styles.buttons}>
          <button>Download</button>
          <button>Filter</button>
          <button>Sort</button>
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
              {/* Judul menggunakan Title Case (Bukan kapital semua) */}
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
            {dummyData.map((item) => (
              <tr key={item.id}>
                <td>{item.id}</td>
                <td>{item.name}</td>
                <td>{item.jenis}</td>
                <td>{item.lokasi}</td>
                <td>{item.prioritas}</td>
                <td>
                  <span className={`${styles.statusSpan} ${styles[item.status]}`}>
                    {item.status === "pending" ? "Menunggu Verifikasi" : "Selesai"}
                  </span>
                </td>
                <td>
                  <div className={styles.actionCell}>
                    {/* Mengarah ke halaman statis tanpa ID backend */}
                    <Link href="/humint/detail">
                      <button className={styles.simpleIcon} title="Lihat">👁</button>
                    </Link>
                    <Link href="/humint/edit">
                      <button className={styles.simpleIcon} title="Edit">✏️</button>
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* PAGINATION */}
      <div className={styles.paginationWrap}>
        <div className={styles.pagination}>
          <button className={styles.pageArrow}>{"<"}</button>
          <div className={styles.pageNumbers}>
            <button className={`${styles.pageNumber} ${styles.pageNumberActive}`}>1</button>
            <button className={styles.pageNumber}>2</button>
            <button className={styles.pageNumber}>3</button>
          </div>
          <button className={styles.pageArrow}>{">"}</button>
        </div>
      </div>

    </div>
  );
}