"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function FormDokumenAsli({ poId, namaFileAwal }: { poId: number; namaFileAwal: string | null }) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!file) { setError("Pilih file dulu."); return; }
    setLoading(true);
    const formData = new FormData();
    formData.set("file", file);
    const res = await fetch(`/api/po/${poId}/dokumen-asli`, { method: "POST", body: formData });
    setLoading(false);
    if (!res.ok) { const d = await res.json().catch(() => ({})); setError(d.error ?? "Gagal mengunggah."); return; }
    setFile(null);
    (e.target as HTMLFormElement).reset();
    router.refresh();
  }

  async function handleHapus() {
    if (!window.confirm("Hapus dokumen PO asli ini?")) return;
    setLoading(true);
    const res = await fetch(`/api/po/${poId}/dokumen-asli`, { method: "DELETE" });
    setLoading(false);
    if (!res.ok) { const d = await res.json().catch(() => ({})); setError(d.error ?? "Gagal menghapus."); return; }
    router.refresh();
  }

  return (
    <div className="card" style={{ maxWidth: 360 }}>
      <h3 style={{ marginTop: 0 }}>Dokumen PO Asli</h3>
      <p className="subtitle" style={{ fontSize: 12 }}>
        Scan/copy PO asli terbitan XL. Diunggah sekali, otomatis dipakai ulang sebagai halaman
        terakhir di setiap CAC/BAST PDF gabungan untuk PO ini.
      </p>
      {namaFileAwal ? (
        <p style={{ display: "flex", alignItems: "center", gap: 8 }}>
          ✓ <span>{namaFileAwal}</span>
          <button type="button" className="btn-text" disabled={loading} onClick={handleHapus}>Hapus</button>
        </p>
      ) : (
        <p className="subtitle" style={{ fontSize: 12 }}>Belum ada dokumen PO asli diunggah.</p>
      )}
      <form onSubmit={handleUpload} className="toolbar" style={{ marginTop: 8 }}>
        <div className="field">
          <label>{namaFileAwal ? "Ganti file (PDF/PNG/JPG)" : "Unggah file (PDF/PNG/JPG)"}</label>
          <input type="file" accept=".pdf,.png,.jpg,.jpeg" onChange={(e) => setFile(e.target.files?.[0] ?? null)} required />
        </div>
        <button type="submit" disabled={loading} className="btn btn-primary">{loading ? "Mengunggah..." : "Unggah"}</button>
        {error && <div className="alert alert-danger" style={{ margin: 0 }}>{error}</div>}
      </form>
    </div>
  );
}
