"use client";
import { useMemo, useState } from "react";
import TombolHapus from "./hapus-button";
import HapusTerpilih from "@/components/hapus-terpilih";

type BarisPersonel = { id: number; nama: string; status: string; penempatan: string | null };
type KolomSort = "nama" | "status";
type ArahSort = "asc" | "desc";

export default function TabelPersonel({ daftar }: { daftar: BarisPersonel[] }) {
  const [kolom, setKolom] = useState<KolomSort>("nama");
  const [arah, setArah] = useState<ArahSort>("asc");
  const [terpilih, setTerpilih] = useState<Set<number>>(new Set());

  function urutkanDari(k: KolomSort) {
    if (k === kolom) setArah((a) => (a === "asc" ? "desc" : "asc"));
    else { setKolom(k); setArah("asc"); }
  }

  const daftarUrut = useMemo(() => {
    const salinan = [...daftar];
    salinan.sort((a, b) => {
      const hasil = String(a[kolom] ?? "").localeCompare(String(b[kolom] ?? ""), "id");
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
          <HapusTerpilih jumlah={terpilih.size} urlUntuk={() => [...terpilih].map((id) => `/api/personel/${id}`)} />
        </div>
      )}
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th style={{ width: 28 }}>
                <input type="checkbox" checked={terpilih.size === daftarUrut.length && daftarUrut.length > 0} onChange={toggleSemua} />
              </th>
              <Th label="Nama" k="nama" />
              <Th label="Status" k="status" />
              <th></th>
            </tr>
          </thead>
          <tbody>
            {daftarUrut.map((p) => (
              <tr key={p.id}>
                <td><input type="checkbox" checked={terpilih.has(p.id)} onChange={() => toggle(p.id)} /></td>
                <td>{p.nama}</td>
                <td><span className={`badge ${p.status === "aktif" ? "badge-siap_diajukan" : "badge-draft"}`}>{p.status}</span></td>
                <td style={{ display: "flex", gap: 8 }}>
                  <a href={`/data-referensi/personel/${p.id}/edit`} className="btn-text">Edit</a>
                  <TombolHapus url={`/api/personel/${p.id}`} konfirmasi={`Hapus personel "${p.nama}"?`} />
                </td>
              </tr>
            ))}
            {daftarUrut.length === 0 && (
              <tr><td colSpan={4} className="table-empty">Belum ada data.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
