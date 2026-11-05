"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function TombolKonfirmasi({ pengajuanId }: { pengajuanId: number }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function konfirmasi() {
    if (!window.confirm("Confirm the calculation of this submission? Once confirmed, it will be submitted for Checker review.")) return;
    setLoading(true); setError(null);
    const res = await fetch(`/api/pengajuan/${pengajuanId}/konfirmasi`, { method: "POST" });
    setLoading(false);
    if (!res.ok) { const d = await res.json().catch(() => ({})); setError(d.error ?? "Failed to confirm."); return; }
    router.refresh();
  }

  return (
    <div>
      <button onClick={konfirmasi} disabled={loading} className="btn btn-primary">
        {loading ? "Processing..." : "Confirm & Submit to Checker"}
      </button>
      {error && <div className="alert alert-danger" style={{ marginTop: 10 }}>{error}</div>}
    </div>
  );
}
