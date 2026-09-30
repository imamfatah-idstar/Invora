"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

type Hasil = {
  totalBarisData: number; poBaru: number; poDiperbarui: number; dilewati: number;
  catatanGagal: string[];
};

export default function FormImporPo() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasil, setHasil] = useState<Hasil | null>(null);
  const [terbuka, setTerbuka] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null); setHasil(null);
    if (!file) { setError("Pilih file CSV/XLSX dulu."); return; }
    setLoading(true);
    const formData = new FormData();
    formData.set("file", file);
    const res = await fetch("/api/po/impor", { method: "POST", body: formData });
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
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h3 style={{ margin: 0 }}>Impor Daftar PO (CSV/Excel)</h3>
        <button type="button" className="btn-text" onClick={() => setTerbuka((v) => !v)}>
          {terbuka ? "Tutup" : "Unggah list PO"}
        </button>
      </div>
      {terbuka && (
        <>
          <p className="subtitle" style={{ fontSize: 13 }}>
            Untuk tambah banyak PO sekaligus tanpa input satu-satu — pilihan lain dari form manual di bawah.
            Kolom yang dibaca (nama kolom bebas, tidak harus persis): <b>Nomor PO</b>, <b>Nama Proyek</b>
            (wajib), <b>Nilai Item</b> (wajib), Tahun, Nilai GR, Tanggal PO (opsional). Nomor PO yang{" "}
            <b>belum ada</b> akan ditambah baru; yang <b>sudah ada</b> akan diperbarui nama proyek/tahun/nilai
            GR/tanggalnya — <b>saldo berjalan tidak ikut ditimpa</b>, tetap dirawat manual lewat halaman Edit PO.
          </p>
          <form onSubmit={handleSubmit} className="toolbar">
            <div className="field">
              <label>File CSV atau Excel (.xlsx)</label>
              <input type="file" accept=".csv,.xlsx" onChange={(e) => setFile(e.target.files?.[0] ?? null)} required />
            </div>
            <button type="submit" disabled={loading} className="btn btn-primary">{loading ? "Mengimpor..." : "Impor"}</button>
            {error && <div className="alert alert-danger" style={{ margin: 0 }}>{error}</div>}
          </form>
          {hasil && (
            <div className="alert alert-success" style={{ marginTop: 12 }}>
              Selesai — dari {hasil.totalBarisData} baris data: <b>{hasil.poBaru}</b> PO baru,{" "}
              <b>{hasil.poDiperbarui}</b> PO diperbarui, {hasil.dilewati} dilewati.
              {hasil.catatanGagal.length > 0 && (
                <ul style={{ margin: "6px 0 0", paddingLeft: 18, fontSize: 12.5 }}>
                  {hasil.catatanGagal.map((c, i) => <li key={i}>{c}</li>)}
                </ul>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
