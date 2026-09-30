"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function TombolBuatDokumen({ pengajuanId, jenis }: { pengajuanId: number; jenis: "CAC" | "BAST" }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function buat() {
    setLoading(true); setError(null);
    const res = await fetch(`/api/pengajuan/${pengajuanId}/dokumen`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jenis }),
    });
    setLoading(false);
    if (!res.ok) { const d = await res.json().catch(() => ({})); setError(d.error ?? "Gagal membuat dokumen."); return; }
    const data = await res.json();
    router.push(`/pengajuan/${pengajuanId}/dokumen/${data.id}`);
    router.refresh();
  }

  return (
    <div style={{ display: "inline-block" }}>
      <button onClick={buat} disabled={loading} className="btn">
        {loading ? "Membuat..." : `Buat ${jenis}`}
      </button>
      {error && <div className="alert alert-danger" style={{ marginTop: 8 }}>{error}</div>}
    </div>
  );
}
