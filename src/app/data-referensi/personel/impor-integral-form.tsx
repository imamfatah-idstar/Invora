"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

type Hasil = {
  totalBarisFile: number; totalDiproses: number;
  personelBaru: number; rateDiperbarui: number; penempatanDiperbarui: number;
  klienPoDiisi: number; pemetaanDibuat: number; tidakBerubah: number; dilewati: number;
  catatanDilewati: string[];
};

export default function FormImporIntegral() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasil, setHasil] = useState<Hasil | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null); setHasil(null);
    if (!file) { setError("Pilih file CSV dulu."); return; }
    setLoading(true);
    const formData = new FormData();
    formData.set("file", file);
    const res = await fetch("/api/data-referensi/personel/impor-integral", { method: "POST", body: formData });
    const d = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) { setError(d.error ?? "Gagal mengimpor."); return; }
    setHasil(d);
    setFile(null);
    (e.target as HTMLFormElement).reset();
    router.refresh();
  }

  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <h3 style={{ marginTop: 0 }}>Impor dari Data Integral</h3>
      <p className="subtitle" style={{ fontSize: 13 }}>
        Unduh sheet <b>&quot;Invoice Plan From INTEGRALS Data&quot;</b> (tab bulan berjalan) lewat
        File &rarr; Download &rarr; Comma Separated Values (.csv), lalu unggah di sini. Sekarang
        mencakup <b>semua klien</b> (bukan cuma XL) — tanggal mulai kerja (<code>spk_start_date</code>)
        dipakai sebagai tanggal berlaku rate card, penempatan &amp; nama klien ikut tercatat, dan
        personel otomatis dipetakan ke PO yang sudah ada lewat nomor PO. Personel baru ditambahkan;
        kalau rate berubah, rate lama ditutup dan rate baru dibuat (riwayat rate tetap tersimpan) —
        supaya tidak perlu input manual dan menghindari human error.
      </p>
      <form onSubmit={handleSubmit} className="toolbar">
        <div className="field">
          <label>File CSV dari sheet Integral</label>
          <input type="file" accept=".csv" onChange={(e) => setFile(e.target.files?.[0] ?? null)} required />
        </div>
        <button type="submit" disabled={loading} className="btn btn-primary">{loading ? "Mengimpor..." : "Impor"}</button>
        {error && <div className="alert alert-danger" style={{ margin: 0 }}>{error}</div>}
      </form>
      {hasil && (
        <div className="alert alert-success" style={{ marginTop: 12 }}>
          Selesai — {hasil.totalDiproses} personel diproses (dari {hasil.totalBarisFile} baris file):{" "}
          <b>{hasil.personelBaru}</b> personel baru, <b>{hasil.rateDiperbarui}</b> rate diperbarui,{" "}
          {hasil.penempatanDiperbarui} penempatan diperbarui, {hasil.klienPoDiisi} nama klien PO terisi,{" "}
          {hasil.pemetaanDibuat} pemetaan personel-PO baru, {hasil.tidakBerubah} tidak berubah,{" "}
          {hasil.dilewati} dilewati (rate tidak valid).
          {hasil.catatanDilewati.length > 0 && (
            <ul style={{ margin: "6px 0 0", paddingLeft: 18, fontSize: 12.5 }}>
              {hasil.catatanDilewati.map((c, i) => <li key={i}>{c}</li>)}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
