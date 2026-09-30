"use client";
import { useMemo, useState } from "react";
import TombolHapus from "./hapus-button";
import HapusTerpilih from "@/components/hapus-terpilih";

type BarisPemetaan = {
  id: number;
  namaPersonel: string;
  nomorPo: string;
  poLineText: string | null;
  poLineNomor: number | null;
  berlakuDari: string;
  berlakuSampai: string | null;
};

type KolomSort = "namaPersonel" | "nomorPo" | "berlakuDari" | "berlakuSampai";
type ArahSort = "asc" | "desc";

export default function TabelPemetaan({ daftar }: { daftar: BarisPemetaan[] }) {
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
      if (kolom === "berlakuSampai") {
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
          <HapusTerpilih jumlah={terpilih.size} urlUntuk={() => [...terpilih].map((id) => `/api/pemetaan/${id}`)} />
        </div>
      )}
      <div className="table-wrap">
        <table>
          <thead><tr>
            <th style={{ width: 28 }}>
              <input type="checkbox" checked={terpilih.size === daftarUrut.length && daftarUrut.length > 0} onChange={toggleSemua} />
            </th>
            <Th label="Personel" k="namaPersonel" />
            <Th label="PO" k="nomorPo" />
            <th>PO Line</th>
            <Th label="Berlaku Dari" k="berlakuDari" />
            <Th label="Berlaku Sampai" k="berlakuSampai" />
            <th></th>
          </tr></thead>
          <tbody>
            {daftarUrut.map((m) => (
              <tr key={m.id}>
                <td><input type="checkbox" checked={terpilih.has(m.id)} onChange={() => toggle(m.id)} /></td>
                <td>{m.namaPersonel}</td>
                <td>{m.nomorPo}</td>
                <td>{m.poLineText ? `Line ${m.poLineNomor} — ${m.poLineText}` : "-"}</td>
                <td>{m.berlakuDari}</td>
                <td>{m.berlakuSampai ?? "masih berlaku"}</td>
                <td><TombolHapus url={`/api/pemetaan/${m.id}`} konfirmasi="Hapus pemetaan ini?" /></td>
              </tr>
            ))}
            {daftarUrut.length === 0 && <tr><td colSpan={7} className="table-empty">Belum ada data.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
