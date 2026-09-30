"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import ComboSelect from "@/components/combo-select";

type OpsiPersonel = { id: number; nama: string };

export default function FormTambahRateCard({ daftarPersonel }: { daftarPersonel: OpsiPersonel[] }) {
  const router = useRouter();
  const [personelId, setPersonelId] = useState(daftarPersonel[0]?.id ?? "");
  const [nilaiRate, setNilaiRate] = useState("");
  const [berlakuDari, setBerlakuDari] = useState("");
  const [berlakuSampai, setBerlakuSampai] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null); setLoading(true);
    const res = await fetch("/api/rate-card", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ personelId, nilaiRate, berlakuDari, berlakuSampai }),
    });
    setLoading(false);
    if (!res.ok) { const d = await res.json().catch(() => ({})); setError(d.error ?? "Gagal menambah."); return; }
    setNilaiRate(""); setBerlakuDari(""); setBerlakuSampai("");
    router.refresh();
  }

  if (daftarPersonel.length === 0) {
    return <div className="alert alert-danger">Belum ada Personel. Tambahkan Personel dulu sebelum membuat Rate Card.</div>;
  }

  return (
    <form onSubmit={handleSubmit} className="toolbar">
      <div className="field">
        <label>Personel</label>
        <ComboSelect
          value={personelId}
          onChange={(v) => setPersonelId(Number(v))}
          opsi={daftarPersonel.map((p) => ({ value: p.id, label: p.nama }))}
        />
      </div>
      <div className="field" style={{ minWidth: 200 }}><label>Nilai rate bulanan</label><input placeholder="cth 10000000.00" value={nilaiRate} onChange={(e) => setNilaiRate(e.target.value)} required /></div>
      <div className="field"><label>Berlaku dari</label><input type="date" value={berlakuDari} onChange={(e) => setBerlakuDari(e.target.value)} required /></div>
      <div className="field"><label>Berlaku sampai (opsional)</label><input type="date" value={berlakuSampai} onChange={(e) => setBerlakuSampai(e.target.value)} /></div>
      <button type="submit" disabled={loading} className="btn btn-primary">{loading ? "Menyimpan..." : "Tambah"}</button>
      {error && <div className="alert alert-danger" style={{ margin: 0 }}>{error}</div>}
    </form>
  );
}
