"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

const LABEL_ROLE: Record<string, string> = { admin: "Administrator", petugas: "Data Entry", checker: "Checker" };

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
    if (!res.ok) { const d = await res.json().catch(() => ({})); setError(d.error ?? "Failed to save."); return; }
    router.refresh();
  }

  if (kuncSendiri) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span className="topbar-role-badge">{LABEL_ROLE[role] ?? role}</span>
        <span className={`badge ${aktif ? "badge-siap_diajukan" : "badge-draft"}`}>{aktif ? "Active" : "Inactive"}</span>
        <span className="subtitle" style={{ margin: 0 }}>(your current account — edit via another admin)</span>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
      <select value={role} disabled={loading} onChange={(e) => ubah({ role: e.target.value })}>
        <option value="petugas">Data Entry</option>
        <option value="checker">Checker</option>
        <option value="admin">Administrator</option>
      </select>
      <span className={`badge ${aktif ? "badge-siap_diajukan" : "badge-draft"}`}>{aktif ? "Active" : "Inactive"}</span>
      <button
        type="button"
        disabled={loading}
        className="btn-text"
        onClick={() => ubah({ aktif: !aktif })}
      >
        {aktif ? "Deactivate" : "Activate"}
      </button>
      {error && <span className="alert alert-danger" style={{ margin: 0, padding: "2px 8px" }}>{error}</span>}
    </div>
  );
}
