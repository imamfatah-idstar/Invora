"use client";
import { useMemo, useState } from "react";
import TombolHapus from "./hapus-button";
import HapusTerpilih from "@/components/hapus-terpilih";

type BarisPersonel = {
  id: number;
  nik: string | null;
  nama: string;
  posisi: string | null;
  tipe: string | null;
  penempatan: string | null;
  nomorSpk: string | null;
  status: string;
};
type KolomSort = "nik" | "nama" | "posisi" | "tipe" | "penempatan" | "nomorSpk" | "status";
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
      const hasil = String(a[kolom] ?? "").localeCompare(String(b[kolom] ?? ""), "id", { numeric: true });
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
              <Th label="NIK" k="nik" />
              <Th label="Name" k="nama" />
              <Th label="Position" k="posisi" />
              <Th label="Type" k="tipe" />
              <Th label="Placement" k="penempatan" />
              <Th label="SPK Number" k="nomorSpk" />
              <Th label="Status" k="status" />
              <th></th>
            </tr>
          </thead>
          <tbody>
            {daftarUrut.map((p) => (
              <tr key={p.id}>
                <td><input type="checkbox" checked={terpilih.has(p.id)} onChange={() => toggle(p.id)} /></td>
                <td style={{ fontFamily: "monospace", fontSize: 12.5 }}>{p.nik || "-"}</td>
                <td style={{ fontWeight: 500 }}>{p.nama}</td>
                <td>{p.posisi || "-"}</td>
                <td>{p.tipe ? <span className="badge badge-draft">{p.tipe}</span> : "-"}</td>
                <td>{p.penempatan || "-"}</td>
                <td style={{ fontSize: 12.5 }}>{p.nomorSpk || "-"}</td>
                <td><span className={`badge ${p.status === "aktif" ? "badge-siap_diajukan" : "badge-draft"}`}>{p.status === "aktif" ? "Active" : "Inactive"}</span></td>
                <td style={{ display: "flex", gap: 8 }}>
                  <a href={`/data-referensi/personel/${p.id}/edit`} className="btn-text">Edit</a>
                  <TombolHapus url={`/api/personel/${p.id}`} konfirmasi={`Delete personnel "${p.nama}"?`} />
                </td>
              </tr>
            ))}
            {daftarUrut.length === 0 && (
              <tr><td colSpan={9} className="table-empty">No records found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
