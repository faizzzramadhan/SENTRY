'use client'

import { useEffect, useState } from 'react'
import styles from './addreport.module.css'

type LocationSearchProps = {
  value?: string
  onSelect: (item: any) => void
}

const MALANG_VIEWBOX = '112.56,-7.86,112.72,-8.06'

export default function LocationSearch({ value = '', onSelect }: LocationSearchProps) {
  const [query, setQuery] = useState(value)
  const [results, setResults] = useState<any[]>([])

  useEffect(() => {
    setQuery(value || '')
  }, [value])

  useEffect(() => {
    const cleanQuery = query.trim()

    if (cleanQuery.length < 3 || cleanQuery === value) {
      setResults([])
      return
    }

    const delay = window.setTimeout(() => {
      const searchQuery = /malang/i.test(cleanQuery)
        ? cleanQuery
        : `${cleanQuery}, Kota Malang, Jawa Timur`

      const params = new URLSearchParams({
        format: 'json',
        q: searchQuery,
        addressdetails: '1',
        limit: '10',
        countrycodes: 'id',
        viewbox: MALANG_VIEWBOX,
        bounded: '1',
        dedupe: '1',
        namedetails: '1',
      })

      fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`)
        .then((res) => res.json())
        .then((data) => {
          const malangOnly = Array.isArray(data)
            ? data.filter((item) => isInMalangCity(item))
            : []

          setResults(malangOnly)
        })
        .catch(() => setResults([]))
    }, 400)

    return () => window.clearTimeout(delay)
  }, [query, value])

  const isInMalangCity = (item: any) => {
    const addr = item.address || {}
    const displayName = String(item.display_name || '').toLowerCase()

    return (
      String(addr.city || '').toLowerCase().includes('malang') ||
      String(addr.town || '').toLowerCase().includes('malang') ||
      String(addr.municipality || '').toLowerCase().includes('malang') ||
      displayName.includes('kota malang') ||
      displayName.includes('malang city')
    )
  }

  const getFullAddress = (item: any) => {
    return item.display_name || formatAddress(item)
  }

  const handleSelect = (item: any) => {
    const fullAddress = getFullAddress(item)
    setQuery(fullAddress)
    setResults([])
    onSelect({
      ...item,
      display_name: fullAddress,
    })
  }

  const formatAddress = (item: any) => {
    const addr = item.address || {}
    const roadWithNumber = addr.house_number
      ? `${addr.road || addr.pedestrian || addr.footway || 'Alamat'} No. ${addr.house_number}`
      : addr.road || addr.pedestrian || addr.footway

    return [
      roadWithNumber,
      addr.neighbourhood,
      addr.suburb || addr.village,
      addr.city || addr.town || 'Kota Malang',
    ]
      .filter(Boolean)
      .join(', ')
  }

  return (
    <div className={styles.searchBox}>
      <input
        placeholder="Cari alamat lengkap di Kota Malang, contoh: Jl Kembang Sepatu No 15"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      {results.length > 0 && (
        <div className={styles.dropdown}>
          {results.map((item, i) => (
            <div
              key={`${item.place_id || i}`}
              className={styles.item}
              onClick={() => handleSelect(item)}
            >
              <div>{formatAddress(item) || item.display_name}</div>
              <small>{item.display_name}</small>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
