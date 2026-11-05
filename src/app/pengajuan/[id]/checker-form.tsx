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
      setError("Please provide revision notes first.");
      return;
    }
    setLoading(true); setError(null);
    const res = await fetch(`/api/pengajuan/${pengajuanId}/checker`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hasil, catatan }),
    });
    setLoading(false);
    if (!res.ok) { const d = await res.json().catch(() => ({})); setError(d.error ?? "Failed to submit review decision."); return; }
    router.refresh();
  }

  return (
    <div className="card" style={{ maxWidth: 480 }}>
      <h3 style={{ marginTop: 0 }}>Checker Review</h3>
      <div className="field">
        <label>Notes (required when requesting revision)</label>
        <textarea
          value={catatan}
          onChange={(e) => setCatatan(e.target.value)}
          style={{ minHeight: 70, resize: "vertical" }}
        />
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
        <button onClick={() => kirim("siap_diajukan")} disabled={loading} className="btn btn-primary">Approve — Ready to Submit</button>
        <button onClick={() => kirim("perlu_revisi")} disabled={loading} className="btn btn-danger">Request Revision</button>
      </div>
      {error && <div className="alert alert-danger" style={{ marginTop: 10 }}>{error}</div>}
    </div>
  );
}
