"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function FormTambahPo() {
  const router = useRouter();
  const tahunSekarang = new Date().getFullYear();
  const [nomorPo, setNomorPo] = useState("");
  const [namaProyek, setNamaProyek] = useState("");
  const [tahun, setTahun] = useState(String(tahunSekarang));
  const [nilaiItem, setNilaiItem] = useState("");
  const [klien, setKlien] = useState("");
  const [jenisTagihan, setJenisTagihan] = useState("bulanan");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null); setLoading(true);
    const res = await fetch("/api/po", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nomorPo, namaProyek, tahun: Number(tahun), nilaiItem, klien, jenisTagihan }),
    });
    setLoading(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? "Failed to add PO.");
      return;
    }
    setNomorPo(""); setNamaProyek(""); setTahun(String(tahunSekarang)); setNilaiItem(""); setKlien(""); setJenisTagihan("bulanan");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="toolbar">
      <div className="field"><label>PO Number</label><input value={nomorPo} onChange={(e) => setNomorPo(e.target.value)} required /></div>
      <div className="field" style={{ minWidth: 220 }}><label>Project Name (as in PO)</label><input value={namaProyek} onChange={(e) => setNamaProyek(e.target.value)} required /></div>
      <div className="field" style={{ width: 100 }}><label>Year</label><input type="number" value={tahun} onChange={(e) => setTahun(e.target.value)} required /></div>
      <div className="field"><label>PO Item Value</label><input placeholder="e.g. 100000000.00" value={nilaiItem} onChange={(e) => setNilaiItem(e.target.value)} required /></div>
      <div className="field" style={{ minWidth: 220 }}><label>Client (Official name, optional)</label><input value={klien} onChange={(e) => setKlien(e.target.value)} placeholder="e.g. PT Bank CIMB Niaga Tbk" /></div>
      <div className="field">
        <label>Billing Type</label>
        <select value={jenisTagihan} onChange={(e) => setJenisTagihan(e.target.value)}>
          <option value="bulanan">Monthly (Prorated)</option>
          <option value="tahap">Milestone / Stage (Manual)</option>
        </select>
      </div>
      <button type="submit" disabled={loading} className="btn btn-primary">{loading ? "Saving..." : "Add PO"}</button>
      {error && <div className="alert alert-danger" style={{ margin: 0 }}>{error}</div>}
    </form>
  );
}
