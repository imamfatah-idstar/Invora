"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

const LABEL_ROLE: Record<string, string> = { admin: "Admin", petugas: "Input Data", checker: "Checker" };

export default function BarisAksiAkun({
  id, role, aktif, kuncSendiri,
}: { id: number; role: string; aktif: boolean; kuncSendiri: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function ubah(payload: Record<string, unknown>) {
    setError(null); setLoading(true);
    const res = await fetch(`/api/akun/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setLoading(false);
    if (!res.ok) { const d = await res.json().catch(() => ({})); setError(d.error ?? "Gagal menyimpan."); return; }
    router.refresh();
  }

  if (kuncSendiri) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span className="topbar-role-badge">{LABEL_ROLE[role] ?? role}</span>
        <span className={`badge ${aktif ? "badge-siap_diajukan" : "badge-draft"}`}>{aktif ? "Aktif" : "Nonaktif"}</span>
        <span className="subtitle" style={{ margin: 0 }}>(akun Anda sendiri — ubah lewat akun admin lain)</span>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
      <select value={role} disabled={loading} onChange={(e) => ubah({ role: e.target.value })}>
        <option value="petugas">Input Data</option>
        <option value="checker">Checker</option>
        <option value="admin">Admin</option>
      </select>
      <span className={`badge ${aktif ? "badge-siap_diajukan" : "badge-draft"}`}>{aktif ? "Aktif" : "Nonaktif"}</span>
      <button
        type="button"
        disabled={loading}
        className="btn-text"
        onClick={() => ubah({ aktif: !aktif })}
      >
        {aktif ? "Nonaktifkan" : "Aktifkan"}
      </button>
      {error && <span className="alert alert-danger" style={{ margin: 0, padding: "2px 8px" }}>{error}</span>}
    </div>
  );
}
