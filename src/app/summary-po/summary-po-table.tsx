"use client";
import { useMemo, useState } from "react";

type BarisSummary = {
  id: number;
  nomorPo: string;
  namaProyek: string;
  nilaiItem: string;
  nilaiGr: string;
  saldo: string;
};

type KolomSort = "nomorPo" | "namaProyek" | "nilaiItem" | "nilaiGr" | "saldo";
type ArahSort = "asc" | "desc";

const KOLOM_ANGKA: KolomSort[] = ["nilaiItem", "nilaiGr", "saldo"];

function formatRupiah(nilai: string) {
  return "Rp" + Number(nilai).toLocaleString("id-ID", { minimumFractionDigits: 2 });
}

export default function TabelSummaryPo({
  daftar, tahunDipilih, totalNilaiPo, totalGr, totalSaldo,
}: {
  daftar: BarisSummary[];
  tahunDipilih: number;
  totalNilaiPo: string;
  totalGr: string;
  totalSaldo: string;
}) {
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
      const hasil = angka
        ? Number(a[kolom]) - Number(b[kolom])
        : String(a[kolom]).localeCompare(String(b[kolom]), "id");
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
    <div className="table-wrap" style={{ marginTop: 16 }}>
      <table>
        <thead>
          <tr>
            <Th label="Nomor PO" k="nomorPo" />
            <Th label="Nama Proyek" k="namaProyek" />
            <Th label="Nilai PO" k="nilaiItem" />
            <Th label="Nilai Sudah di-GR" k="nilaiGr" />
            <Th label="Saldo PO" k="saldo" />
          </tr>
        </thead>
        <tbody>
          {daftarUrut.map((p) => (
            <tr key={p.id}>
              <td>{p.nomorPo}</td>
              <td>{p.namaProyek}</td>
              <td>{formatRupiah(p.nilaiItem)}</td>
              <td>{formatRupiah(p.nilaiGr)}</td>
              <td style={{ color: Number(p.saldo) < 0 ? "var(--color-danger)" : undefined }}>
                {formatRupiah(p.saldo)}
              </td>
            </tr>
          ))}
          {daftarUrut.length === 0 && (
            <tr><td colSpan={5} className="table-empty">Belum ada PO untuk tahun {tahunDipilih}.</td></tr>
          )}
        </tbody>
        {daftarUrut.length > 0 && (
          <tfoot>
            <tr>
              <td colSpan={2}><b>Total tahun {tahunDipilih}</b></td>
              <td><b>{formatRupiah(totalNilaiPo)}</b></td>
              <td><b>{formatRupiah(totalGr)}</b></td>
              <td><b>{formatRupiah(totalSaldo)}</b></td>
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}
