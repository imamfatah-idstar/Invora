"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Logo from "@/components/logo";
import LoginBackground from "@/components/login-background";
import { getCleanDisplayName, Role } from "@/lib/user-roles";

interface RoleCardInfo {
  id: Role;
  title: string;
  badge: string;
  icon: string;
  description: string;
  features: string[];
  color: string;
  bgLight: string;
  borderColor: string;
}

const ROLE_INFO: Record<Role, RoleCardInfo> = {
  admin: {
    id: "admin",
    title: "Administrator",
    badge: "Full Admin Access",
    icon: "🛡️",
    description: "Akses penuh manajemen izin akun pengguna, master data referensi, dan kalender kerja.",
    features: ["Kelola akun pengguna & izin", "Master kalender kerja perusahaan", "Audit log aktivitas sistem"],
    color: "#6366f1",
    bgLight: "#eef2ff",
    borderColor: "#c7d2fe",
  },
  checker: {
    id: "checker",
    title: "Checker",
    badge: "Verification & Approval",
    icon: "🔍",
    description: "Evaluasi, validasi kesesuaian dokumen pengajuan, dan persetujuan pengajuan invoice resmi.",
    features: ["Review detail pengajuan invoice", "Validasi kesesuaian GR & nilai tagihan", "Persetujuan / penolakan berdokumen"],
    color: "#0284c7",
    bgLight: "#f0f9ff",
    borderColor: "#bae6fd",
  },
  petugas: {
    id: "petugas",
    title: "Data Entry (Petugas)",
    badge: "Operational Entry",
    icon: "📝",
    description: "Pembuatan draf pengajuan, perhitungan prorata talent, pencatatan konfirmasi, dan input operasional.",
    features: ["Buat draf & ajukan pengajuan invoice", "Kelola rate card, talent, & PO", "Konfirmasi GR slip & pembayaran klien"],
    color: "#059669",
    bgLight: "#ecfdf5",
    borderColor: "#a7f3d0",
  },
};

export default function PilihRoleClient({
  nama,
  email,
  currentRole,
  roles,
}: {
  nama: string;
  email: string;
  currentRole: string;
  roles: Role[];
}) {
  const router = useRouter();
  const [selectedRole, setSelectedRole] = useState<Role>((roles.includes(currentRole as Role) ? currentRole : roles[0]) as Role);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cleanName = getCleanDisplayName(email, nama);

  async function handleConfirmRole(roleToActivate: Role) {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/select-role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: roleToActivate }),
      });

      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.error ?? "Gagal mengaktifkan role pilihan.");
        setLoading(false);
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Terjadi kesalahan jaringan.");
      setLoading(false);
    }
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  return (
    <main className="login-shell" style={{ display: "flex", minHeight: "100vh", position: "relative" }}>
      <LoginBackground />

      <div style={{
        position: "relative",
        zIndex: 1,
        width: "100%",
        maxWidth: 780,
        margin: "auto",
        padding: "40px 20px",
      }}>
        <div style={{
          background: "#ffffff",
          borderRadius: 16,
          boxShadow: "0 10px 25px -5px rgba(0,0,0,0.08), 0 8px 10px -6px rgba(0,0,0,0.04)",
          border: "1px solid var(--color-border, #e2e8f0)",
          padding: "36px 32px",
        }}>
          {/* Header */}
          <div style={{ textAlign: "center", marginBottom: 28 }}>
            <div style={{ display: "inline-flex", justifyContent: "center", marginBottom: 12 }}>
              <Logo height={44} variant="color" />
            </div>
            <h1 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 6px", color: "#111827" }}>
              Pilih Role untuk Masuk
            </h1>
            <p style={{ fontSize: 13.5, color: "#64748b", margin: 0 }}>
              Halo, <b style={{ color: "#1e293b" }}>{cleanName}</b> ({email}). Akun Anda memiliki lebih dari satu hak akses. Silakan pilih peran yang ingin digunakan:
            </p>
          </div>

          {error && (
            <div className="alert alert-danger" style={{ marginBottom: 20, fontSize: 13, textAlign: "center" }}>
              {error}
            </div>
          )}

          {/* Cards Role Grid */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
            gap: 16,
            marginBottom: 28,
          }}>
            {roles.map((rId) => {
              const info = ROLE_INFO[rId];
              if (!info) return null;
              const isSelected = selectedRole === rId;

              return (
                <div
                  key={rId}
                  onClick={() => setSelectedRole(rId)}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    padding: 20,
                    borderRadius: 12,
                    border: `2px solid ${isSelected ? info.color : "#e2e8f0"}`,
                    background: isSelected ? info.bgLight : "#ffffff",
                    cursor: "pointer",
                    transition: "all 0.18s ease",
                    boxShadow: isSelected ? `0 4px 14px ${info.color}25` : "0 1px 3px rgba(0,0,0,0.02)",
                    transform: isSelected ? "translateY(-2px)" : "none",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                    <span style={{ fontSize: 28 }}>{info.icon}</span>
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        padding: "2px 7px",
                        borderRadius: 4,
                        background: isSelected ? "#ffffff" : info.bgLight,
                        color: info.color,
                        border: `1px solid ${info.borderColor}`,
                        textTransform: "uppercase",
                        letterSpacing: "0.03em",
                      }}
                    >
                      {info.badge}
                    </span>
                  </div>

                  <div style={{ fontSize: 16, fontWeight: 700, color: "#1e293b", marginBottom: 4 }}>
                    {info.title}
                  </div>

                  <p style={{ fontSize: 12, color: "#64748b", margin: "0 0 14px", lineHeight: 1.5, flex: 1 }}>
                    {info.description}
                  </p>

                  <ul style={{ margin: "0 0 16px", paddingLeft: 16, fontSize: 11, color: "#475569", lineHeight: 1.6 }}>
                    {info.features.map((f, i) => (
                      <li key={i}>{f}</li>
                    ))}
                  </ul>

                  <button
                    type="button"
                    disabled={loading}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleConfirmRole(rId);
                    }}
                    style={{
                      width: "100%",
                      padding: "9px 12px",
                      borderRadius: 7,
                      border: "none",
                      background: isSelected ? info.color : "#f1f5f9",
                      color: isSelected ? "#ffffff" : "#475569",
                      fontSize: 13,
                      fontWeight: 700,
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                    }}
                  >
                    {loading && isSelected ? "Memproses..." : isSelected ? "Masuk sebagai " + info.title : "Pilih Peran Ini"}
                  </button>
                </div>
              );
            })}
          </div>

          {/* Action Footer */}
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            paddingTop: 16,
            borderTop: "1px solid #f1f5f9",
          }}>
            <button
              type="button"
              onClick={handleLogout}
              className="btn-text"
              style={{ color: "#64748b", fontSize: 13, cursor: "pointer" }}
            >
              ← Ganti Akun Lain
            </button>

            <button
              type="button"
              disabled={loading}
              onClick={() => handleConfirmRole(selectedRole)}
              className="btn btn-primary"
              style={{ padding: "10px 24px", fontSize: 14, fontWeight: 700 }}
            >
              {loading ? "Menyiapkan Sesi..." : "Lanjutkan ke Dashboard →"}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}

