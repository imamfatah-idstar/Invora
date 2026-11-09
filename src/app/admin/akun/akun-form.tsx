"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

const DAFTAR_ROLE = [
  { id: "petugas", label: "Data Entry", desc: "Buat & konfirmasi pengajuan, kelola referensi" },
  { id: "checker", label: "Checker", desc: "Review, setujui, atau tolak pengajuan invoice" },
  { id: "admin", label: "Administrator", desc: "Kelola akun pengguna, izin, & kalender kerja" },
];

export default function FormTambahAkun() {
  const router = useRouter();
  const [nama, setNama] = useState("");
  const [email, setEmail] = useState("");
  const [roles, setRoles] = useState<string[]>(["petugas"]);
  const [aktif, setAktif] = useState(true);
  const [kataSandi, setKataSandi] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function toggleRole(roleId: string) {
    setRoles((prev) => {
      if (prev.includes(roleId)) {
        if (prev.length === 1) return prev; // Minimal satu role
        return prev.filter((r) => r !== roleId);
      } else {
        return [...prev, roleId];
      }
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (roles.length === 0) {
      setError("Pilih minimal satu peran (role).");
      return;
    }
    setLoading(true);
    const res = await fetch("/api/akun", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nama, email, roles, aktif, kataSandi }),
    });
    setLoading(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? "Failed to add account.");
      return;
    }
    setNama("");
    setEmail("");
    setKataSandi("");
    setRoles(["petugas"]);
    setAktif(true);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} style={{
      background: "#ffffff",
      border: "1px solid var(--color-border, #e2e8f0)",
      borderRadius: 10,
      padding: 18,
      marginBottom: 20,
      boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
    }}>
      <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12, color: "#1e293b" }}>
        Register New Account
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14, marginBottom: 14 }}>
        <div className="field">
          <label style={{ fontSize: 12.5, fontWeight: 600 }}>Full Name</label>
          <input
            value={nama}
            onChange={(e) => setNama(e.target.value)}
            placeholder="e.g. John Doe"
            required
          />
        </div>

        <div className="field">
          <label style={{ fontSize: 12.5, fontWeight: 600 }}>Email Address (@idstar.group)</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@idstar.group"
            pattern=".+@idstar\.group"
            title="Email must use @idstar.group domain"
            required
          />
        </div>

        <div className="field">
          <label style={{ fontSize: 12.5, fontWeight: 600 }}>Initial Password</label>
          <input
            type="text"
            value={kataSandi}
            onChange={(e) => setKataSandi(e.target.value)}
            placeholder="min. 8 characters"
            required
          />
        </div>
      </div>

      {/* Checklist Box Role */}
      <div style={{ marginBottom: 14 }}>
        <label style={{ fontSize: 12.5, fontWeight: 600, display: "block", marginBottom: 6 }}>
          Role Permissions (Multiple Selection Allowed):
        </label>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {DAFTAR_ROLE.map((r) => {
            const isChecked = roles.includes(r.id);
            return (
              <label
                key={r.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "8px 12px",
                  borderRadius: 6,
                  border: `1.5px solid ${isChecked ? "var(--color-primary, #ea242a)" : "#cbd5e1"}`,
                  background: isChecked ? "rgba(234, 36, 42, 0.04)" : "#f8fafc",
                  cursor: "pointer",
                  userSelect: "none",
                  transition: "all 0.15s ease",
                  fontSize: 13,
                  fontWeight: isChecked ? 600 : 500,
                  color: isChecked ? "#1e293b" : "#64748b",
                }}
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => toggleRole(r.id)}
                  style={{ accentColor: "var(--color-primary, #ea242a)", cursor: "pointer", width: 16, height: 16 }}
                />
                <span>{r.label}</span>
              </label>
            );
          })}
        </div>
      </div>

      {/* Checklist Box Status */}
      <div style={{ marginBottom: 16, display: "flex", alignItems: "center", gap: 14 }}>
        <label style={{ fontSize: 12.5, fontWeight: 600, margin: 0 }}>
          Account Status:
        </label>
        <label
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "6px 12px",
            borderRadius: 6,
            border: `1.5px solid ${aktif ? "#22c55e" : "#94a3b8"}`,
            background: aktif ? "rgba(34, 197, 94, 0.08)" : "#f1f5f9",
            cursor: "pointer",
            fontSize: 13,
            fontWeight: 600,
            color: aktif ? "#166534" : "#475569",
          }}
        >
          <input
            type="checkbox"
            checked={aktif}
            onChange={(e) => setAktif(e.target.checked)}
            style={{ accentColor: "#22c55e", cursor: "pointer", width: 16, height: 16 }}
          />
          <span>{aktif ? "✓ Active (Dapat Login)" : "✕ Inactive (Diblokir)"}</span>
        </label>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <button
          type="submit"
          disabled={loading}
          className="btn btn-primary"
          style={{ padding: "8px 18px", fontWeight: 700 }}
        >
          {loading ? "Registering..." : "+ Register Account"}
        </button>
        {error && <span className="alert alert-danger" style={{ margin: 0, padding: "6px 12px", fontSize: 12.5 }}>{error}</span>}
      </div>
    </form>
  );
}
