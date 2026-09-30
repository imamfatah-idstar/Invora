"use client";
import { useMemo, useState } from "react";
import TombolHapus from "./hapus-button";

type BarisPo = {
  id: number;
  nomorPo: string;
  namaProyek: string;
  tahun: number;
  nilaiItem: string;
  saldoSebelumPpn: string;
  nilaiGr: string;
};

type KolomSort = "nomorPo" | "namaProyek" | "tahun" | "nilaiItem" | "saldoSebelumPpn" | "nilaiGr";
type ArahSort = "asc" | "desc";

const KOLOM_ANGKA: KolomSort[] = ["tahun", "nilaiItem", "saldoSebelumPpn", "nilaiGr"];

function formatRupiah(nilai: string) {
  return "Rp" + Number(nilai).toLocaleString("id-ID", { minimumFractionDigits: 2 });
}

export default function TabelPo({ daftar }: { daftar: BarisPo[] }) {
  const [kolom, setKolom] = useState<KolomSort>("nomorPo");
  const [arah, setArah] = useState<ArahSort>("asc");

  function urutkanDari(k: KolomSort) {
    if (k === kolom) setArah((a) => (a === "asc" ? "desc" : "asc"));
    else { setKolom(k); setArah("asc"); }
  }

  const daftarUrut = useMemo(() => {
    const salinan = [...daftar];
    const angka = KOLOM_ANGKA.includes(kolom);
    salinan.sort((a, b) => {
      let hasil: number;
      if (angka) {
        hasil = Number(a[kolom]) - Number(b[kolom]);
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
            <Th label="Nomor PO" k="nomorPo" />
            <Th label="Proyek" k="namaProyek" />
            <Th label="Tahun" k="tahun" />
            <Th label="Nilai Item" k="nilaiItem" />
            <Th label="Saldo Sebelum PPN" k="saldoSebelumPpn" />
            <Th label="Nilai GR" k="nilaiGr" />
            <th></th>
          </tr>
        </thead>
        <tbody>
          {daftarUrut.map((p) => (
            <tr key={p.id}>
              <td>{p.nomorPo}</td>
              <td>{p.namaProyek}</td>
              <td>{p.tahun}</td>
              <td>{formatRupiah(p.nilaiItem)}</td>
              <td>{formatRupiah(p.saldoSebelumPpn)}</td>
              <td>{formatRupiah(p.nilaiGr)}</td>
              <td style={{ display: "flex", gap: 8 }}>
                <a href={`/data-referensi/po/${p.id}/edit`} className="btn-text">Edit</a>
                <TombolHapus url={`/api/po/${p.id}`} konfirmasi={`Hapus PO "${p.nomorPo}"?`} />
              </td>
            </tr>
          ))}
          {daftarUrut.length === 0 && (
            <tr><td colSpan={7} className="table-empty">Belum ada data.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
