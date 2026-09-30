"use client";
import { useMemo, useState } from "react";
import TombolHapus from "./hapus-button";

type BarisRateCard = {
  id: number;
  namaPersonel: string;
  nilaiRate: string;
  berlakuDari: string;
  berlakuSampai: string | null;
};

type KolomSort = "namaPersonel" | "nilaiRate" | "berlakuDari" | "berlakuSampai";
type ArahSort = "asc" | "desc";

function formatRupiah(nilai: string) {
  return "Rp" + Number(nilai).toLocaleString("id-ID", { minimumFractionDigits: 2 });
}

export default function TabelRateCard({ daftar }: { daftar: BarisRateCard[] }) {
  const [kolom, setKolom] = useState<KolomSort>("namaPersonel");
  const [arah, setArah] = useState<ArahSort>("asc");

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
        // "masih berlaku" (null) dianggap paling besar/paling akhir supaya konsisten
        // dengan urutan tanggal.
        const av = a.berlakuSampai ?? "9999-99-99";
        const bv = b.berlakuSampai ?? "9999-99-99";
        hasil = av.localeCompare(bv);
      } else {
        hasil = String(a[kolom]).localeCompare(String(b[kolom]), "id");
      }
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
            <Th label="Personel" k="namaPersonel" />
            <Th label="Rate" k="nilaiRate" />
            <Th label="Berlaku Dari" k="berlakuDari" />
            <Th label="Berlaku Sampai" k="berlakuSampai" />
            <th></th>
          </tr>
        </thead>
        <tbody>
          {daftarUrut.map((r) => (
            <tr key={r.id}>
              <td>{r.namaPersonel}</td>
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
            <tr><td colSpan={5} className="table-empty">Belum ada data.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
