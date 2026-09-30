"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import ComboSelect from "@/components/combo-select";

type Opsi = { id: number; label: string };
type OpsiLine = { id: number; poId: number; label: string };

export default function FormTambahPemetaan({
  daftarPersonel, daftarPo, daftarLine,
}: { daftarPersonel: Opsi[]; daftarPo: Opsi[]; daftarLine: OpsiLine[] }) {
  const router = useRouter();
  const [personelId, setPersonelId] = useState(daftarPersonel[0]?.id ?? "");
  const [poId, setPoId] = useState(daftarPo[0]?.id ?? "");
  const [poLineItemId, setPoLineItemId] = useState<string>("");
  const [berlakuDari, setBerlakuDari] = useState("");
  const [berlakuSampai, setBerlakuSampai] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const lineUntukPo = daftarLine.filter((l) => l.poId === Number(poId));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null); setLoading(true);
    const res = await fetch("/api/pemetaan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ personelId, poId, poLineItemId: poLineItemId || null, berlakuDari, berlakuSampai }),
    });
    setLoading(false);
    if (!res.ok) { const d = await res.json().catch(() => ({})); setError(d.error ?? "Gagal menambah."); return; }
    setBerlakuDari(""); setBerlakuSampai(""); setPoLineItemId("");
    router.refresh();
  }

  if (daftarPersonel.length === 0 || daftarPo.length === 0) {
    return <div className="alert alert-danger">Perlu minimal 1 Personel dan 1 PO sebelum membuat pemetaan.</div>;
  }

  return (
    <form onSubmit={handleSubmit} className="toolbar">
      <div className="field">
        <label>Personel</label>
        <ComboSelect
          value={personelId}
          onChange={(v) => setPersonelId(Number(v))}
          opsi={daftarPersonel.map((p) => ({ value: p.id, label: p.label }))}
        />
      </div>
      <div className="field">
        <label>PO</label>
        <ComboSelect
          value={poId}
          onChange={(v) => { setPoId(Number(v)); setPoLineItemId(""); }}
          opsi={daftarPo.map((p) => ({ value: p.id, label: p.label }))}
          placeholderCari="Cari nomor PO..."
        />
      </div>
      <div className="field">
        <label>PO Line (opsional)</label>
        <select value={poLineItemId} onChange={(e) => setPoLineItemId(e.target.value)}>
          <option value="">- belum dipilih -</option>
          {lineUntukPo.map((l) => <option key={l.id} value={l.id}>{l.label}</option>)}
        </select>
      </div>
      <div className="field"><label>Berlaku dari</label><input type="date" value={berlakuDari} onChange={(e) => setBerlakuDari(e.target.value)} required /></div>
      <div className="field"><label>Berlaku sampai (opsional)</label><input type="date" value={berlakuSampai} onChange={(e) => setBerlakuSampai(e.target.value)} /></div>
      <button type="submit" disabled={loading} className="btn btn-primary">{loading ? "Menyimpan..." : "Tambah"}</button>
      {error && <div className="alert alert-danger" style={{ margin: 0 }}>{error}</div>}
    </form>
  );
}
