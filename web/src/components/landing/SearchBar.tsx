"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useAccessibilityStore } from "@/lib/store";

interface GeoResult {
  lat: number;
  lng: number;
  display_name: string;
  type: string;
}

export default function SearchBar() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GeoResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const {
    setClickedCoordinate,
    setSearchQuery,
    setLocationName,
  } = useAccessibilityStore();

  const search = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(
        `/api/geocode?q=${encodeURIComponent(q.trim())}`
      );
      if (res.ok) {
        const data: GeoResult[] = await res.json();
        setResults(data);
        setIsOpen(data.length > 0);
      }
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleInputChange = (value: string) => {
    setQuery(value);
    setSearchQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(value), 500);
  };

  const handleSelect = (result: GeoResult) => {
    setQuery(result.display_name.split(",")[0]);
    setLocationName(result.display_name.split(",")[0]);
    setClickedCoordinate([result.lng, result.lat]);
    setIsOpen(false);
    setResults([]);
  };

  // Close dropdown on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (inputRef.current && !inputRef.current.parentElement?.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="relative w-full max-w-md">
      <div className="glass-strong rounded-xl flex items-center px-4 py-3 gap-3">
        {/* Search icon */}
        <svg
          className="w-5 h-5 text-slate-400 shrink-0"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => handleInputChange(e.target.value)}
          placeholder="Search a location in Jabodetabek..."
          className="flex-1 bg-transparent outline-none text-slate-800 placeholder-slate-400 text-sm"
        />
        {loading && (
          <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        )}
      </div>

      {/* Dropdown */}
      {isOpen && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 glass-strong rounded-xl overflow-hidden z-50 shadow-lg">
          {results.map((r, i) => (
            <button
              key={i}
              onClick={() => handleSelect(r)}
              className="w-full text-left px-4 py-3 hover:bg-blue-50/50 transition-colors border-b border-slate-100 last:border-0"
            >
              <div className="text-sm font-medium text-slate-800 truncate">
                {r.display_name.split(",")[0]}
              </div>
              <div className="text-xs text-slate-500 truncate mt-0.5">
                {r.display_name}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
