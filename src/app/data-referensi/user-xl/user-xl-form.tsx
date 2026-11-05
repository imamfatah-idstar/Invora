"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function FormTambahUserXl() {
  const router = useRouter();
  const [nama, setNama] = useState("");
  const [kontak, setKontak] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null); setLoading(true);
    const res = await fetch("/api/user-xl", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nama, kontak }),
    });
    setLoading(false);
    if (!res.ok) { const d = await res.json().catch(() => ({})); setError(d.error ?? "Failed to add Client PIC."); return; }
    setNama(""); setKontak(""); router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="toolbar">
      <div className="field"><label>Client PIC / Approver Name</label><input value={nama} onChange={(e) => setNama(e.target.value)} required /></div>
      <div className="field"><label>Contact (optional)</label><input value={kontak} onChange={(e) => setKontak(e.target.value)} /></div>
      <button type="submit" disabled={loading} className="btn btn-primary">{loading ? "Saving..." : "Add Client PIC"}</button>
      {error && <div className="alert alert-danger" style={{ margin: 0 }}>{error}</div>}
    </form>
  );
}
