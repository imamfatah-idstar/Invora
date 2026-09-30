"use client";
import { useMemo, useState } from "react";
import TombolHapus from "./hapus-button";
import { apakahKlienXl } from "@/lib/klien";
import HapusTerpilih from "@/components/hapus-terpilih";

type BarisPo = {
  id: number;
  nomorPo: string;
  namaProyek: string;
  tahun: number;
  nilaiItem: string;
  saldoSebelumPpn: string;
  nilaiGr: string;
  klien: string | null;
  jenisTagihan: string;
};

type KolomSort = "nomorPo" | "namaProyek" | "tahun" | "nilaiItem" | "saldoSebelumPpn" | "nilaiGr" | "klien";
type ArahSort = "asc" | "desc";

const KOLOM_ANGKA: KolomSort[] = ["tahun", "nilaiItem", "saldoSebelumPpn", "nilaiGr"];

function formatRupiah(nilai: string) {
  return "Rp" + Number(nilai).toLocaleString("id-ID", { minimumFractionDigits: 2 });
}

export default function TabelPo({ daftar }: { daftar: BarisPo[] }) {
  const [kolom, setKolom] = useState<KolomSort>("nomorPo");
  const [arah, setArah] = useState<ArahSort>("asc");
  const [terpilih, setTerpilih] = useState<Set<number>>(new Set());

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
          <HapusTerpilih jumlah={terpilih.size} urlUntuk={() => [...terpilih].map((id) => `/api/po/${id}`)} />
        </div>
      )}
      <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th style={{ width: 28 }}>
              <input type="checkbox" checked={terpilih.size === daftarUrut.length && daftarUrut.length > 0} onChange={toggleSemua} />
            </th>
            <Th label="Nomor PO" k="nomorPo" />
            <Th label="Proyek" k="namaProyek" />
            <Th label="Klien" k="klien" />
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
              <td><input type="checkbox" checked={terpilih.has(p.id)} onChange={() => toggle(p.id)} /></td>
              <td>{p.nomorPo}</td>
              <td>{p.namaProyek}</td>
              <td>
                {p.klien ?? <span style={{ color: "var(--color-muted, #999)" }}>-</span>}
                {p.klien && (
                  <span className={`badge ${apakahKlienXl(p.klien) ? "badge-siap_diajukan" : "badge-draft"}`} style={{ marginLeft: 6 }}>
                    {apakahKlienXl(p.klien) ? "XL" : "Non-XL"}
                  </span>
                )}
              </td>
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
            <tr><td colSpan={9} className="table-empty">Belum ada data.</td></tr>
          )}
        </tbody>
      </table>
      </div>
    </div>
  );
}
