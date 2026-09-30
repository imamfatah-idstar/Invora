"use client";
import { useMemo, useState } from "react";
import TombolHapus from "./hapus-button";

type BarisPersonel = { id: number; nama: string; status: string };
type KolomSort = "nama" | "status";
type ArahSort = "asc" | "desc";

export default function TabelPersonel({ daftar }: { daftar: BarisPersonel[] }) {
  const [kolom, setKolom] = useState<KolomSort>("nama");
  const [arah, setArah] = useState<ArahSort>("asc");

  function urutkanDari(k: KolomSort) {
    if (k === kolom) setArah((a) => (a === "asc" ? "desc" : "asc"));
    else { setKolom(k); setArah("asc"); }
  }

  const daftarUrut = useMemo(() => {
    const salinan = [...daftar];
    salinan.sort((a, b) => {
      const hasil = String(a[kolom]).localeCompare(String(b[kolom]), "id");
      return arah === "asc" ? hasil : -hasil;
    });
    return salinan;
  }, [daftar, kolom, arah]);

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
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <Th label="Nama" k="nama" />
            <Th label="Status" k="status" />
            <th></th>
          </tr>
        </thead>
        <tbody>
          {daftarUrut.map((p) => (
            <tr key={p.id}>
              <td>{p.nama}</td>
              <td><span className={`badge ${p.status === "aktif" ? "badge-siap_diajukan" : "badge-draft"}`}>{p.status}</span></td>
              <td style={{ display: "flex", gap: 8 }}>
                <a href={`/data-referensi/personel/${p.id}/edit`} className="btn-text">Edit</a>
                <TombolHapus url={`/api/personel/${p.id}`} konfirmasi={`Hapus personel "${p.nama}"?`} />
              </td>
            </tr>
          ))}
          {daftarUrut.length === 0 && (
            <tr><td colSpan={3} className="table-empty">Belum ada data.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
