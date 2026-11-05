"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function FormTambahKalender() {
  const router = useRouter();
  const [tanggal, setTanggal] = useState("");
  const [tipe, setTipe] = useState("libur_nasional");
  const [keterangan, setKeterangan] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null); setLoading(true);
    const res = await fetch("/api/kalender", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tanggal, tipe, keterangan }),
    });
    setLoading(false);
    if (!res.ok) { const d = await res.json().catch(() => ({})); setError(d.error ?? "Gagal menambah."); return; }
    setTanggal(""); setKeterangan("");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="toolbar">
      <div className="field"><label>Date</label><input type="date" value={tanggal} onChange={(e) => setTanggal(e.target.value)} required /></div>
      <div className="field">
        <label>Type</label>
        <select value={tipe} onChange={(e) => setTipe(e.target.value)}>
          <option value="libur_nasional">National Holiday</option>
          <option value="cuti_bersama">Collective Leave</option>
          <option value="kerja">Working Day (Override)</option>
        </select>
      </div>
      <div className="field" style={{ minWidth: 220 }}><label>Description</label><input placeholder="e.g. Independence Day" value={keterangan} onChange={(e) => setKeterangan(e.target.value)} /></div>
      <button type="submit" disabled={loading} className="btn btn-primary">{loading ? "Saving..." : "Add Entry"}</button>
      {error && <div className="alert alert-danger" style={{ margin: 0 }}>{error}</div>}
    </form>
  );
}
