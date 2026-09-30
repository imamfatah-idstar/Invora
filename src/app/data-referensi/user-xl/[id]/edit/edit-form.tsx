"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function FormEditUserXl({ id, namaAwal, kontakAwal }: { id: number; namaAwal: string; kontakAwal: string }) {
  const router = useRouter();
  const [nama, setNama] = useState(namaAwal);
  const [kontak, setKontak] = useState(kontakAwal);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null); setLoading(true);
    const res = await fetch(`/api/user-xl/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nama, kontak }),
    });
    setLoading(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? "Gagal menyimpan.");
      return;
    }
    router.push("/data-referensi/user-xl");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="card" style={{ maxWidth: 360, display: "flex", flexDirection: "column", gap: 14 }}>
      <div className="field"><label>Nama</label><input value={nama} onChange={(e) => setNama(e.target.value)} required /></div>
      <div className="field"><label>Kontak</label><input value={kontak} onChange={(e) => setKontak(e.target.value)} /></div>
      {error && <div className="alert alert-danger">{error}</div>}
      <button type="submit" disabled={loading} className="btn btn-primary">{loading ? "Menyimpan..." : "Simpan"}</button>
    </form>
  );
}
