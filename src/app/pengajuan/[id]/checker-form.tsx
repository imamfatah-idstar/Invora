"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function FormChecker({ pengajuanId }: { pengajuanId: number }) {
  const router = useRouter();
  const [catatan, setCatatan] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function kirim(hasil: "siap_diajukan" | "perlu_revisi") {
    if (hasil === "perlu_revisi" && !catatan.trim()) {
      setError("Isi catatan alasan revisi terlebih dahulu.");
      return;
    }
    setLoading(true); setError(null);
    const res = await fetch(`/api/pengajuan/${pengajuanId}/checker`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hasil, catatan }),
    });
    setLoading(false);
    if (!res.ok) { const d = await res.json().catch(() => ({})); setError(d.error ?? "Gagal mengirim hasil pemeriksaan."); return; }
    router.refresh();
  }

  return (
    <div className="card" style={{ maxWidth: 480 }}>
      <h3 style={{ marginTop: 0 }}>Pemeriksaan Checker</h3>
      <div className="field">
        <label>Catatan (wajib kalau meminta revisi)</label>
        <textarea
          value={catatan}
          onChange={(e) => setCatatan(e.target.value)}
          style={{ minHeight: 70, resize: "vertical" }}
        />
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
        <button onClick={() => kirim("siap_diajukan")} disabled={loading} className="btn btn-primary">Setujui — Siap Diajukan</button>
        <button onClick={() => kirim("perlu_revisi")} disabled={loading} className="btn btn-danger">Minta Revisi</button>
      </div>
      {error && <div className="alert alert-danger" style={{ marginTop: 10 }}>{error}</div>}
    </div>
  );
}
