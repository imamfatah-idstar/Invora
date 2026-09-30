"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

type Hasil = { totalDiproses: number; userXlBaru: number; kontakDiperbarui: number; tidakBerubah: number };

export default function FormImporUserXl() {
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
    const res = await fetch("/api/user-xl/impor", { method: "POST", body: formData });
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
      <h3 style={{ marginTop: 0 }}>Impor User XL dari File</h3>
      <p className="subtitle" style={{ fontSize: 13 }}>
        Unggah file CSV dengan kolom <code>nama</code> (wajib) dan <code>kontak</code> (opsional, boleh juga
        diberi nama email/telepon/no hp) — supaya tidak perlu isi satu-satu manual. Nama baru ditambahkan;
        nama yang sudah ada kontaknya diperbarui kalau berbeda.
      </p>
      <form onSubmit={handleSubmit} className="toolbar">
        <div className="field">
          <label>File CSV</label>
          <input type="file" accept=".csv" onChange={(e) => setFile(e.target.files?.[0] ?? null)} required />
        </div>
        <button type="submit" disabled={loading} className="btn btn-primary">{loading ? "Mengimpor..." : "Impor"}</button>
        {error && <div className="alert alert-danger" style={{ margin: 0 }}>{error}</div>}
      </form>
      {hasil && (
        <div className="alert alert-success" style={{ marginTop: 12 }}>
          Selesai — {hasil.totalDiproses} baris diproses: <b>{hasil.userXlBaru}</b> User XL baru,{" "}
          <b>{hasil.kontakDiperbarui}</b> kontak diperbarui, {hasil.tidakBerubah} tidak berubah.
        </div>
      )}
    </div>
  );
}
