"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import ComboSelect from "@/components/combo-select";

type OpsiPo = { id: number; label: string };

export default function FormEditUserXl({
  id,
  namaAwal,
  kontakAwal,
  poIdAwal,
  daftarPo = [],
}: {
  id: number;
  namaAwal: string;
  kontakAwal: string;
  poIdAwal?: number | null;
  daftarPo?: OpsiPo[];
}) {
  const router = useRouter();
  const [nama, setNama] = useState(namaAwal);
  const [poId, setPoId] = useState<string | number>(poIdAwal ?? "");
  const [kontak, setKontak] = useState(kontakAwal);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await fetch(`/api/user-xl/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nama,
        kontak: kontak.trim() || null,
        poId: poId ? Number(poId) : null,
      }),
    });
    setLoading(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? "Failed to save.");
      return;
    }
    router.push("/data-referensi/user-xl");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="card" style={{ maxWidth: 440, display: "flex", flexDirection: "column", gap: 14 }}>
      <div className="field">
        <label>Name (Nama)</label>
        <input value={nama} onChange={(e) => setNama(e.target.value)} required />
      </div>
      <div className="field">
        <label>PO (optional)</label>
        <ComboSelect
          value={poId}
          onChange={(v) => setPoId(v)}
          opsi={daftarPo.map((p) => ({ value: p.id, label: p.label }))}
          kosongLabel="- No PO / Global -"
          placeholderCari="Search PO..."
        />
      </div>
      <div className="field">
        <label>Contact (Kontak)</label>
        <input value={kontak} onChange={(e) => setKontak(e.target.value)} />
      </div>
      {error && <div className="alert alert-danger">{error}</div>}
      <div style={{ display: "flex", gap: 8 }}>
        <button type="submit" disabled={loading} className="btn btn-primary">
          {loading ? "Saving..." : "Save"}
        </button>
        <a href="/data-referensi/user-xl" className="btn btn-secondary">
          Cancel
        </a>
      </div>
    </form>
  );
}
