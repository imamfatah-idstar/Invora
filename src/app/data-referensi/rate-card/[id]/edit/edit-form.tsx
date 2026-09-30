"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function FormEditRateCard({ id, namaPersonel, nilaiRateAwal, berlakuDariAwal, berlakuSampaiAwal }: {
  id: number; namaPersonel: string; nilaiRateAwal: string; berlakuDariAwal: string; berlakuSampaiAwal: string;
}) {
  const router = useRouter();
  const [nilaiRate, setNilaiRate] = useState(nilaiRateAwal);
  const [berlakuDari, setBerlakuDari] = useState(berlakuDariAwal);
  const [berlakuSampai, setBerlakuSampai] = useState(berlakuSampaiAwal);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null); setLoading(true);
    const res = await fetch(`/api/rate-card/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nilaiRate, berlakuDari, berlakuSampai }),
    });
    setLoading(false);
    if (!res.ok) { const d = await res.json().catch(() => ({})); setError(d.error ?? "Gagal menyimpan."); return; }
    router.push("/data-referensi/rate-card");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="card" style={{ maxWidth: 360, display: "flex", flexDirection: "column", gap: 14 }}>
      <p className="subtitle" style={{ margin: 0 }}>Personel: <b>{namaPersonel}</b> (tidak bisa diubah — hapus &amp; buat baru kalau salah)</p>
      <div className="field"><label>Nilai rate</label><input value={nilaiRate} onChange={(e) => setNilaiRate(e.target.value)} required /></div>
      <div className="field"><label>Berlaku dari</label><input type="date" value={berlakuDari} onChange={(e) => setBerlakuDari(e.target.value)} required /></div>
      <div className="field"><label>Berlaku sampai</label><input type="date" value={berlakuSampai} onChange={(e) => setBerlakuSampai(e.target.value)} /></div>
      {error && <div className="alert alert-danger">{error}</div>}
      <button type="submit" disabled={loading} className="btn btn-primary">{loading ? "Menyimpan..." : "Simpan"}</button>
    </form>
  );
}
