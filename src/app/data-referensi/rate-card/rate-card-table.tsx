"use client";
import { useMemo, useState } from "react";
import TombolHapus from "./hapus-button";
import HapusTerpilih from "@/components/hapus-terpilih";

type BarisRateCard = {
  id: number;
  namaPersonel: string;
  klien: string | null;
  noPo: string | null;
  nilaiRate: string;
  berlakuDari: string;
  berlakuSampai: string | null;
};

type KolomSort = "namaPersonel" | "klien" | "noPo" | "nilaiRate" | "berlakuDari" | "berlakuSampai";
type ArahSort = "asc" | "desc";

function formatRupiah(nilai: string) {
  return "Rp" + Number(nilai).toLocaleString("id-ID", { minimumFractionDigits: 2 });
}

export default function TabelRateCard({ daftar }: { daftar: BarisRateCard[] }) {
  const [kolom, setKolom] = useState<KolomSort>("namaPersonel");
  const [arah, setArah] = useState<ArahSort>("asc");
  const [terpilih, setTerpilih] = useState<Set<number>>(new Set());

  function urutkanDari(k: KolomSort) {
    if (k === kolom) setArah((a) => (a === "asc" ? "desc" : "asc"));
    else { setKolom(k); setArah("asc"); }
  }

  const daftarUrut = useMemo(() => {
    const salinan = [...daftar];
    salinan.sort((a, b) => {
      let hasil: number;
      if (kolom === "nilaiRate") {
        hasil = Number(a.nilaiRate) - Number(b.nilaiRate);
      } else if (kolom === "berlakuSampai") {
        const av = a.berlakuSampai ?? "9999-99-99";
        const bv = b.berlakuSampai ?? "9999-99-99";
        hasil = av.localeCompare(bv);
      } else {
        hasil = String(a[kolom] ?? "").localeCompare(String(b[kolom] ?? ""), "id");
      }
      return arah === "asc" ? hasil : -hasil;
    });
    return salinan;
  }, [daftar, kolom, arah]);

  function toggle(id: number) {
    setTerpilih((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  }
  function toggleSemua() {
    setTerpilih((s) => (s.size === daftarUrut.length && daftarUrut.length > 0 ? new Set() : new Set(daftarUrut.map((d) => d.id))));
  }

  function Th({ label, k }: { label: string; k: KolomSort }) {
    const aktif = kolom === k;
    return (
      <th className="th-sortable" onClick={() => urutkanDari(k)}>
        {label}
        <span className={`th-sort-caret ${aktif ? "aktif" : ""}`}>
          {aktif ? (arah === "asc" ? "▲" : "▼") : "↕"}
        </span>
      </th>
    );
  }

  return (
    <div>
      {terpilih.size > 0 && (
        <div style={{ margin: "8px 0" }}>
          <HapusTerpilih jumlah={terpilih.size} urlUntuk={() => [...terpilih].map((id) => `/api/rate-card/${id}`)} />
        </div>
      )}
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th style={{ width: 28 }}>
                <input type="checkbox" checked={terpilih.size === daftarUrut.length && daftarUrut.length > 0} onChange={toggleSemua} />
              </th>
              <Th label="Personel" k="namaPersonel" />
              <Th label="Klien" k="klien" />
              <Th label="No PO" k="noPo" />
              <Th label="Rate" k="nilaiRate" />
              <Th label="Berlaku Dari" k="berlakuDari" />
              <Th label="Berlaku Sampai" k="berlakuSampai" />
              <th></th>
            </tr>
          </thead>
          <tbody>
            {daftarUrut.map((r) => (
              <tr key={r.id}>
                <td><input type="checkbox" checked={terpilih.has(r.id)} onChange={() => toggle(r.id)} /></td>
                <td>{r.namaPersonel}</td>
                <td>{r.klien ?? <span style={{ color: "var(--color-muted, #999)" }}>-</span>}</td>
                <td>{r.noPo ?? <span style={{ color: "var(--color-muted, #999)" }}>-</span>}</td>
                <td>{formatRupiah(r.nilaiRate)}</td>
                <td>{r.berlakuDari}</td>
                <td>{r.berlakuSampai ?? "masih berlaku"}</td>
                <td style={{ display: "flex", gap: 8 }}>
                  <a href={`/data-referensi/rate-card/${r.id}/edit`} className="btn-text">Edit</a>
                  <TombolHapus url={`/api/rate-card/${r.id}`} konfirmasi={`Hapus rate card ini?`} />
                </td>
              </tr>
            ))}
            {daftarUrut.length === 0 && (
              <tr><td colSpan={8} className="table-empty">Belum ada data.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
