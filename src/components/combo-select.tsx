"use client";
import { useEffect, useMemo, useRef, useState } from "react";

// Dropdown pilih-satu dengan kolom pencarian di atas daftar opsi — pengganti
// <select> native untuk daftar panjang (mis. nama Personel) yang susah dicari
// lewat scroll manual di dropdown native.
export type OpsiCombo = { value: number | string; label: string };

export default function ComboSelect({
  value,
  onChange,
  opsi,
  placeholderCari = "Cari nama...",
  kosongLabel,
  disabled,
}: {
  value: number | string;
  onChange: (nilai: string) => void;
  opsi: OpsiCombo[];
  placeholderCari?: string;
  kosongLabel?: string; // kalau diisi, tampil sebagai opsi paling atas (mis. "- belum dipilih -")
  disabled?: boolean;
}) {
  const [buka, setBuka] = useState(false);
  const [cari, setCari] = useState("");
  const kontainerRef = useRef<HTMLDivElement>(null);
  const inputCariRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function klikDiLuar(e: MouseEvent) {
      if (kontainerRef.current && !kontainerRef.current.contains(e.target as Node)) {
        setBuka(false);
        setCari("");
      }
    }
    function tombolEsc(e: KeyboardEvent) {
      if (e.key === "Escape") { setBuka(false); setCari(""); }
    }
    document.addEventListener("mousedown", klikDiLuar);
    document.addEventListener("keydown", tombolEsc);
    return () => {
      document.removeEventListener("mousedown", klikDiLuar);
      document.removeEventListener("keydown", tombolEsc);
    };
  }, []);

  useEffect(() => {
    if (buka) inputCariRef.current?.focus();
  }, [buka]);

  const opsiTersaring = useMemo(() => {
    const q = cari.trim().toLowerCase();
    if (!q) return opsi;
    return opsi.filter((o) => o.label.toLowerCase().includes(q));
  }, [opsi, cari]);

  const terpilih = opsi.find((o) => String(o.value) === String(value));

  function pilih(nilai: string) {
    onChange(nilai);
    setBuka(false);
    setCari("");
  }

  return (
    <div className="combo-select" ref={kontainerRef}>
      <button
        type="button"
        className="combo-select-trigger"
        disabled={disabled}
        onClick={() => setBuka((b) => !b)}
      >
        <span className={terpilih ? "" : "combo-select-placeholder"}>
          {terpilih ? terpilih.label : (kosongLabel ?? "- pilih -")}
        </span>
        <span className="combo-select-caret">▾</span>
      </button>
      {buka && (
        <div className="combo-select-panel">
          <input
            ref={inputCariRef}
            type="text"
            className="combo-select-search"
            placeholder={placeholderCari}
            value={cari}
            onChange={(e) => setCari(e.target.value)}
          />
          <ul className="combo-select-list">
            {kosongLabel !== undefined && (
              <li>
                <button
                  type="button"
                  className={`combo-select-option ${value === "" ? "combo-select-option-aktif" : ""}`}
                  onClick={() => pilih("")}
                >
                  <span className="combo-select-check">{value === "" ? "✓" : ""}</span>
                  {kosongLabel}
                </button>
              </li>
            )}
            {opsiTersaring.map((o) => (
              <li key={o.value}>
                <button
                  type="button"
                  className={`combo-select-option ${String(o.value) === String(value) ? "combo-select-option-aktif" : ""}`}
                  onClick={() => pilih(String(o.value))}
                >
                  <span className="combo-select-check">{String(o.value) === String(value) ? "✓" : ""}</span>
                  {o.label}
                </button>
              </li>
            ))}
            {opsiTersaring.length === 0 && (
              <li className="combo-select-empty">Tidak ada nama yang cocok.</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
