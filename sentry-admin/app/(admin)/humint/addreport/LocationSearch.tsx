'use client'

import { useState, useEffect } from 'react'
import styles from './addreport.module.css'

export default function LocationSearch({ onSelect }: any) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<any[]>([])

  useEffect(() => {
    if (query.length < 3) return

    const delay = setTimeout(() => {
      fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`)
        .then(res => res.json())
        .then(data => setResults(data))
    }, 400)

    return () => clearTimeout(delay)
  }, [query])

  return (
    <div className={styles.searchBox}>
      <input
        placeholder="Cari alamat..."
        value={query}
        onChange={(e)=>setQuery(e.target.value)}
      />

      {results.length > 0 && (
        <div className={styles.dropdown}>
          {results.map((item,i)=>(
            <div key={i} className={styles.item} onClick={()=>onSelect(item)}>
              {item.display_name}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}