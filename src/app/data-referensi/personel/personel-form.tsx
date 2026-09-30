"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function FormTambahPersonel() {
  const router = useRouter();
  const [nama, setNama] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null); setLoading(true);
    const res = await fetch("/api/personel", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nama }),
    });
    setLoading(false);
    if (!res.ok) { const d = await res.json().catch(() => ({})); setError(d.error ?? "Gagal menambah personel."); return; }
    setNama(""); router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="toolbar">
      <div className="field" style={{ minWidth: 260 }}>
        <label>Nama personel baru</label>
        <input value={nama} onChange={(e) => setNama(e.target.value)} required />
      </div>
      <button type="submit" disabled={loading} className="btn btn-primary">{loading ? "Menyimpan..." : "Tambah"}</button>
      {error && <div className="alert alert-danger" style={{ margin: 0 }}>{error}</div>}
    </form>
  );
}
