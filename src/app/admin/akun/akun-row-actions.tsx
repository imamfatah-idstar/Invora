"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

const DAFTAR_ROLE = [
  { id: "petugas", label: "Data Entry", badgeClass: "badge-diproses" },
  { id: "checker", label: "Checker", badgeClass: "badge-selesai" },
  { id: "admin", label: "Admin", badgeClass: "badge-draft" },
];

export default function BarisAksiAkun({
  id,
  role,
  aktif,
  kuncSendiri,
}: {
  id: number;
  role: string;
  aktif: boolean;
  kuncSendiri: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Parse current roles
  const currentRoles = role
    .split(",")
    .map((r) => r.trim())
    .filter(Boolean);

  async function handleToggleRole(targetRole: string) {
    if (kuncSendiri) return;
    let nextRoles: string[];
    if (currentRoles.includes(targetRole)) {
      if (currentRoles.length === 1) {
        setError("Minimal satu peran harus aktif.");
        return;
      }
      nextRoles = currentRoles.filter((r) => r !== targetRole);
    } else {
      nextRoles = [...currentRoles, targetRole];
    }

    setError(null);
    setLoading(true);
    const res = await fetch(`/api/akun/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roles: nextRoles }),
    });
    setLoading(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? "Failed to save.");
      return;
    }
    router.refresh();
  }

  async function handleToggleStatus() {
    if (kuncSendiri) return;
    setError(null);
    setLoading(true);
    const res = await fetch(`/api/akun/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ aktif: !aktif }),
    });
    setLoading(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? "Failed to save.");
      return;
    }
    router.refresh();
  }

  if (kuncSendiri) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 6 }}>
          {currentRoles.map((r) => (
            <span key={r} className="topbar-role-badge">
              {r.toUpperCase()}
            </span>
          ))}
        </div>
        <span className={`badge ${aktif ? "badge-siap_diajukan" : "badge-draft"}`}>
          {aktif ? "Active" : "Inactive"}
        </span>
        <span className="subtitle" style={{ margin: 0, fontSize: 11.5 }}>
          (your active account &middot; cannot self-modify)
        </span>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        {/* Checklist Box Role */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          {DAFTAR_ROLE.map((r) => {
            const isChecked = currentRoles.includes(r.id);
            return (
              <label
                key={r.id}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                  padding: "3px 8px",
                  borderRadius: 5,
                  border: `1px solid ${isChecked ? "var(--color-primary, #ea242a)" : "#cbd5e1"}`,
                  background: isChecked ? "rgba(234, 36, 42, 0.05)" : "#ffffff",
                  fontSize: 12,
                  fontWeight: isChecked ? 600 : 500,
                  color: isChecked ? "#1e293b" : "#64748b",
                  cursor: loading ? "wait" : "pointer",
                  userSelect: "none",
                }}
              >
                <input
                  type="checkbox"
                  disabled={loading}
                  checked={isChecked}
                  onChange={() => handleToggleRole(r.id)}
                  style={{ accentColor: "var(--color-primary, #ea242a)", cursor: "pointer", width: 14, height: 14 }}
                />
                <span>{r.label}</span>
              </label>
            );
          })}
        </div>

        {/* Checklist Box Status */}
        <label
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "3px 8px",
            borderRadius: 5,
            border: `1px solid ${aktif ? "#22c55e" : "#cbd5e1"}`,
            background: aktif ? "rgba(34, 197, 94, 0.08)" : "#f8fafc",
            fontSize: 12,
            fontWeight: 600,
            color: aktif ? "#166534" : "#64748b",
            cursor: loading ? "wait" : "pointer",
            userSelect: "none",
          }}
        >
          <input
            type="checkbox"
            disabled={loading}
            checked={aktif}
            onChange={handleToggleStatus}
            style={{ accentColor: "#22c55e", cursor: "pointer", width: 14, height: 14 }}
          />
          <span>{aktif ? "Active" : "Inactive"}</span>
        </label>
      </div>

      {error && (
        <span className="alert alert-danger" style={{ margin: 0, padding: "2px 8px", fontSize: 11 }}>
          {error}
        </span>
      )}
    </div>
  );
}
