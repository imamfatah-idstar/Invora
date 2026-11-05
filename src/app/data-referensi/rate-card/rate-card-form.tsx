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
    return <div className="alert alert-danger">No Personnel found. Please add Personnel first before creating a Rate Card.</div>;
  }

  return (
    <form onSubmit={handleSubmit} className="toolbar">
      <div className="field">
        <label>Personnel</label>
        <ComboSelect
          value={personelId}
          onChange={(v) => setPersonelId(Number(v))}
          opsi={daftarPersonel.map((p) => ({ value: p.id, label: p.nama }))}
        />
      </div>
      <div className="field" style={{ minWidth: 200 }}><label>Monthly Rate (Rp)</label><input placeholder="e.g. 10000000.00" value={nilaiRate} onChange={(e) => setNilaiRate(e.target.value)} required /></div>
      <div className="field"><label>Valid From</label><input type="date" value={berlakuDari} onChange={(e) => setBerlakuDari(e.target.value)} required /></div>
      <div className="field"><label>Valid Until (Optional)</label><input type="date" value={berlakuSampai} onChange={(e) => setBerlakuSampai(e.target.value)} /></div>
      <button type="submit" disabled={loading} className="btn btn-primary">{loading ? "Saving..." : "Add Rate Card"}</button>
      {error && <div className="alert alert-danger" style={{ margin: 0 }}>{error}</div>}
    </form>
  );
}
