"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

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
      <h3 style={{ marginTop: 0 }}>Import User  from CSV</h3>
      <p className="subtitle" style={{ fontSize: 13 }}>
        Upload a CSV file with columns <code>nama</code> (required), <code>po</code> (optional, PO number), and <code>kontak</code> (optional, email/phone).
        New entries are added; existing records are updated.
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
          Selesai — {hasil.totalDiproses} baris diproses: <b>{hasil.userXlBaru}</b> User baru,{" "}
          <b>{hasil.kontakDiperbarui}</b> kontak diperbarui, {hasil.tidakBerubah} tidak berubah.
        </div>
      )}
    </div>
  );
}
