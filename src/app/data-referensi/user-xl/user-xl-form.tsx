"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import ComboSelect from "@/components/combo-select";

type OpsiPo = { id: number; label: string };

export default function FormTambahUserXl({ daftarPo = [] }: { daftarPo?: OpsiPo[] }) {
  const router = useRouter();
  const [nama, setNama] = useState("");
  const [poId, setPoId] = useState<string | number>("");
  const [kontak, setKontak] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await fetch("/api/user-xl", {
      method: "POST",
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
      setError(d.error ?? "Failed to add User XL.");
      return;
    }
    setNama("");
    setKontak("");
    setPoId("");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="toolbar" style={{ flexWrap: "wrap", alignItems: "flex-end" }}>
      <div className="field">
        <label>User XL / Approver Name</label>
        <input
          value={nama}
          onChange={(e) => setNama(e.target.value)}
          placeholder="e.g. Budi Santoso"
          required
        />
      </div>
      <div className="field" style={{ minWidth: 260 }}>
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
        <label>Contact (optional)</label>
        <input
          value={kontak}
          onChange={(e) => setKontak(e.target.value)}
          placeholder="Email or phone"
        />
      </div>
      <button type="submit" disabled={loading} className="btn btn-primary">
        {loading ? "Saving..." : "Add User XL"}
      </button>
      {error && <div className="alert alert-danger" style={{ margin: 0 }}>{error}</div>}
    </form>
  );
}
