"use client";

import React, { useState, useEffect, useRef } from 'react';
import styles from './LocationSearch.module.css';

interface LocationSearchProps {
  onSelect: (item: any) => void;
}

export default function LocationSearch({ onSelect }: LocationSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const searchLocation = async (text: string) => {
    setQuery(text);
    if (text.length < 3) {
      setResults([]);
      return;
    }

    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${text}&limit=5`);
      const data = await res.json();
      setResults(data);
      setIsOpen(true);
    } catch (err) {
      console.error("Search error:", err);
    }
  };

  return (
    <div className={styles.searchWrapper} ref={wrapperRef}>
      <input
        type="text"
        className={styles.searchInput}
        placeholder="Cari lokasi kejadian (misal: Jl. Soekarno Hatta)..."
        value={query}
        onChange={(e) => searchLocation(e.target.value)}
        onFocus={() => query.length >= 3 && setIsOpen(true)}
      />
      {isOpen && results.length > 0 && (
        <ul className={styles.resultsList}>
          {results.map((item: any) => (
            <li
              key={item.place_id}
              className={styles.resultItem}
              onClick={() => {
                onSelect(item);
                setQuery(item.display_name);
                setIsOpen(false);
              }}
            >
              {item.display_name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}