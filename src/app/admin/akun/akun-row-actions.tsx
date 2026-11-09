"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

const DAFTAR_ROLE = [
  { id: "petugas", label: "Data Entry" },
  { id: "checker", label: "Checker" },
  { id: "admin", label: "Admin" },
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
  const [sukses, setSukses] = useState<string | null>(null);

  // State untuk Reset Password oleh Admin
  const [bukaModalReset, setBukaModalReset] = useState(false);
  const [passwordBaru, setPasswordBaru] = useState("");
  const [loadingReset, setLoadingReset] = useState(false);
  const [errorReset, setErrorReset] = useState<string | null>(null);

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

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    if (passwordBaru.length < 8) {
      setErrorReset("Password baru minimal 8 karakter.");
      return;
    }

    setErrorReset(null);
    setLoadingReset(true);
    const res = await fetch(`/api/akun/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kataSandi: passwordBaru }),
    });
    setLoadingReset(false);

    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setErrorReset(d.error ?? "Gagal mereset kata sandi.");
      return;
    }

    setBukaModalReset(false);
    setPasswordBaru("");
    setSukses("Password berhasil direset!");
    setTimeout(() => setSukses(null), 3000);
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
          (akun Anda saat ini &middot; ganti sandi via Topbar)
        </span>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
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

        {/* Tombol Reset Password oleh Admin */}
        <button
          type="button"
          onClick={() => {
            setErrorReset(null);
            setPasswordBaru("");
            setBukaModalReset(true);
          }}
          disabled={loading}
          style={{
            background: "#f1f5f9",
            border: "1px solid #cbd5e1",
            borderRadius: 5,
            padding: "3px 9px",
            fontSize: 11.5,
            color: "#334155",
            fontWeight: 600,
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
          }}
          title="Reset Password Akun Pengguna Ini"
        >
          <span>🔑</span>
          <span>Reset Sandi</span>
        </button>
      </div>

      {sukses && (
        <span style={{ fontSize: 11.5, color: "#166534", fontWeight: 600 }}>
          ✓ {sukses}
        </span>
      )}

      {error && (
        <span className="alert alert-danger" style={{ margin: 0, padding: "2px 8px", fontSize: 11 }}>
          {error}
        </span>
      )}

      {/* Modal Dialog Reset Password Admin */}
      {bukaModalReset && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(15, 23, 42, 0.6)",
            backdropFilter: "blur(2px)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
          onClick={() => setBukaModalReset(false)}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: 12,
              width: "100%",
              maxWidth: 380,
              boxShadow: "0 20px 25px -5px rgba(0,0,0,0.15)",
              border: "1px solid #e2e8f0",
              overflow: "hidden",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "14px 18px",
                borderBottom: "1px solid #f1f5f9",
                background: "#f8fafc",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 700, fontSize: 14 }}>
                <span>🔑</span>
                <span>Reset Password Pengguna</span>
              </div>
              <button
                type="button"
                onClick={() => setBukaModalReset(false)}
                style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer", color: "#94a3b8" }}
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleResetPassword} style={{ padding: 18, display: "flex", flexDirection: "column", gap: 12 }}>
              {errorReset && (
                <div className="alert alert-danger" style={{ margin: 0, fontSize: 12, padding: "6px 10px" }}>
                  {errorReset}
                </div>
              )}

              <div className="field">
                <label style={{ fontSize: 12, fontWeight: 600, color: "#334155" }}>
                  Password Baru (min. 8 karakter)
                </label>
                <input
                  type="text"
                  value={passwordBaru}
                  onChange={(e) => setPasswordBaru(e.target.value)}
                  placeholder="e.g. IdstarBaru2026!"
                  required
                  minLength={8}
                  style={{ fontSize: 13, padding: "7px 10px" }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 4 }}>
                <button
                  type="button"
                  onClick={() => setBukaModalReset(false)}
                  disabled={loadingReset}
                  className="btn"
                  style={{ fontSize: 12.5, padding: "6px 12px" }}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={loadingReset}
                  className="btn btn-primary"
                  style={{ fontSize: 12.5, padding: "6px 14px", fontWeight: 700 }}
                >
                  {loadingReset ? "Menyimpan..." : "Reset Password"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
