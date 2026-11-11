"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import ComboSelect from "@/components/combo-select";

type Opsi = { id: number; label: string };
type OpsiLine = { id: number; poId: number; label: string };

export default function FormTambahPemetaan({
  daftarPersonel,
  daftarPo,
  daftarLine,
  daftarUserXl = [],
}: {
  daftarPersonel: Opsi[];
  daftarPo: Opsi[];
  daftarLine: OpsiLine[];
  daftarUserXl?: Opsi[];
}) {
  const router = useRouter();
  const [personelId, setPersonelId] = useState(daftarPersonel[0]?.id ?? "");
  const [poId, setPoId] = useState(daftarPo[0]?.id ?? "");
  const [poLineItemId, setPoLineItemId] = useState<string>("");
  const [userXlId, setUserXlId] = useState<string | number>("");
  const [berlakuDari, setBerlakuDari] = useState("");
  const [berlakuSampai, setBerlakuSampai] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const lineUntukPo = daftarLine.filter((l) => l.poId === Number(poId));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await fetch("/api/pemetaan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        personelId,
        poId,
        poLineItemId: poLineItemId || null,
        userXlId: userXlId ? Number(userXlId) : null,
        berlakuDari,
        berlakuSampai,
      }),
    });
    setLoading(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? "Failed to add mapping.");
      return;
    }
    setBerlakuDari("");
    setBerlakuSampai("");
    setPoLineItemId("");
    setUserXlId("");
    router.refresh();
  }

  if (daftarPersonel.length === 0 || daftarPo.length === 0) {
    return <div className="alert alert-danger">At least 1 Personnel and 1 PO are required before creating a mapping.</div>;
  }

  return (
    <form onSubmit={handleSubmit} className="toolbar" style={{ flexWrap: "wrap", alignItems: "flex-end" }}>
      <div className="field">
        <label>Personnel</label>
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
          placeholderCari="Search PO number..."
        />
      </div>
      <div className="field">
        <label>PO Line (optional)</label>
        <select value={poLineItemId} onChange={(e) => setPoLineItemId(e.target.value)}>
          <option value="">- not selected -</option>
          {lineUntukPo.map((l) => <option key={l.id} value={l.id}>{l.label}</option>)}
        </select>
      </div>
      <div className="field" style={{ minWidth: 200 }}>
        <label>Client Approver / User XL (optional)</label>
        <ComboSelect
          value={userXlId}
          onChange={(v) => setUserXlId(v)}
          opsi={daftarUserXl.map((u) => ({ value: u.id, label: u.label }))}
          kosongLabel="- Not selected -"
          placeholderCari="Search User XL..."
        />
      </div>
      <div className="field"><label>Effective from</label><input type="date" value={berlakuDari} onChange={(e) => setBerlakuDari(e.target.value)} required /></div>
      <div className="field"><label>Effective until (optional)</label><input type="date" value={berlakuSampai} onChange={(e) => setBerlakuSampai(e.target.value)} /></div>
      <button type="submit" disabled={loading} className="btn btn-primary">{loading ? "Saving..." : "Add Mapping"}</button>
      {error && <div className="alert alert-danger" style={{ margin: 0 }}>{error}</div>}
    </form>
  );
}
