"use client";

import LoginBackground from "@/components/login-background";
import Logo from "@/components/logo";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";

type AkunDemo = {
  role: "admin" | "checker" | "petugas";
  judul: string;
  email: string;
  icon: string;
  badgeBg: string;
  badgeColor: string;
  deskripsi: string;
};

const DAFTAR_AKUN_DEMO: AkunDemo[] = [
  {
    role: "admin",
    judul: "Super Admin",
    email: "admin@contoh.local",
    icon: "🛡️",
    badgeBg: "rgba(147, 51, 234, 0.12)",
    badgeColor: "#9333ea",
    deskripsi: "Kelola akun & hak akses, kalender libur, reset data uji",
  },
  {
    role: "checker",
    judul: "Checker (Pemeriksa)",
    email: "checker@contoh.local",
    icon: "🕵️",
    badgeBg: "rgba(37, 99, 235, 0.12)",
    badgeColor: "#2563eb",
    deskripsi: "Review & setujui pengajuan, verifikasi paket Request GR",
  },
  {
    role: "petugas",
    judul: "Petugas Input Data",
    email: "petugas@contoh.local",
    icon: "👨‍💼",
    badgeBg: "rgba(234, 36, 42, 0.12)",
    badgeColor: "#ea242a",
    deskripsi: "Buat pengajuan, prorata, alokasi Cross PO, cetak CAC/BAST",
  },
];

export default function LoginClient() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [kataSandi, setKataSandi] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState<string | null>(null);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleDemoModal, setGoogleDemoModal] = useState(false);
  const [customGoogleEmail, setCustomGoogleEmail] = useState("ahmad.fauzi@idstar.group");

  // Tangkap pesan error dari URL callback (misal penolakan domain bukan @idstar.group)
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const err = params.get("error");
      if (err) {
        setError(decodeURIComponent(err));
      }
    }
  }, []);

  async function prosesLogin(loginEmail: string, loginPass: string) {
    setError(null);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: loginEmail, kataSandi: loginPass }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Gagal login.");
      return false;
    }

    router.push("/dashboard");
    router.refresh();
    return true;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await prosesLogin(email, kataSandi);
    setLoading(false);
  }

  async function handleDemoLogin(demoEmail: string) {
    setDemoLoading(demoEmail);
    setEmail(demoEmail);
    setKataSandi("contoh123");
    await prosesLogin(demoEmail, "contoh123");
    setDemoLoading(null);
  }

  async function handleGoogleDemoSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setGoogleLoading(true);

    const res = await fetch("/api/auth/google/demo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: customGoogleEmail }),
    });

    setGoogleLoading(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Gagal login dengan akun Google.");
      return;
    }

    setGoogleDemoModal(false);
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <main className="login-shell">
      {/* Panel kiri / atas brand IDStar */}
      <aside className="login-aside">
        <div className="login-aside-brand">
          <Logo height={28} variant="white" />
          <div className="login-aside-title">
            <b>INVORA</b> &middot; Invoice Operations &amp; Revenue Assurance
          </div>
        </div>
        <div className="login-aside-address">
          <div style={{ fontWeight: 600, color: "#ffffff", marginBottom: 4 }}>IDStar Head Office:</div>
          <div>The Bellagio Mansion, Ground floor</div>
          <div>Mega Kuningan Timur II, Setiabudi</div>
          <div>Jakarta Selatan, DKI Jakarta 12950</div>
        </div>
      </aside>

      {/* Area Form & Demo Login */}
      <div className="login-main">
        <LoginBackground />
        
        <div className="card login-card">
          {/* Header */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, marginBottom: 20 }}>
            <Logo height={44} variant="color" />
            <div style={{ textAlign: "center" }}>
              <h1 style={{ fontSize: 20, fontWeight: 800, margin: 0, color: "#111827" }}>INVORA</h1>
              <p className="subtitle" style={{ marginBottom: 0, fontSize: 13, fontWeight: 500 }}>
                Invoice Operations &amp; Revenue Assurance &middot; IDStar
              </p>
            </div>
          </div>

          {/* Form Login Manual */}
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div className="field">
              <label style={{ fontSize: 13, fontWeight: 600 }}>Email</label>
              <input
                type="email"
                placeholder="nama@perusahaan.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="field">
              <label style={{ fontSize: 13, fontWeight: 600 }}>Kata Sandi</label>
              <input
                type="password"
                placeholder="••••••••"
                value={kataSandi}
                onChange={(e) => setKataSandi(e.target.value)}
                required
              />
            </div>

            {error && <div className="alert alert-danger" style={{ fontSize: 13 }}>{error}</div>}

            <button
              type="submit"
              disabled={loading || Boolean(demoLoading)}
              className="btn btn-primary"
              style={{ justifyContent: "center", padding: 11, fontSize: 14, fontWeight: 700 }}
            >
              {loading ? "Memproses..." : "Masuk"}
            </button>

            {/* Tombol Masuk dengan Akun Google */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 4 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "6px 0 2px" }}>
                <div style={{ flex: 1, height: 1, background: "var(--color-border)" }} />
                <span style={{ fontSize: 11.5, fontWeight: 600, color: "var(--color-text-muted)" }}>
                  ATAU
                </span>
                <div style={{ flex: 1, height: 1, background: "var(--color-border)" }} />
              </div>

              <a
                href="/api/auth/google"
                className="google-login-btn"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 10,
                  padding: "10px 16px",
                  background: "#ffffff",
                  border: "1px solid #dadce0",
                  borderRadius: 8,
                  color: "#3c4043",
                  fontSize: 13.5,
                  fontWeight: 600,
                  textDecoration: "none",
                  transition: "all 0.15s ease",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                <span>Masuk dengan Google</span>
                <span style={{ fontSize: 11, background: "rgba(34, 197, 94, 0.12)", color: "#166534", padding: "2px 6px", borderRadius: 4, fontWeight: 700 }}>
                  @idstar.group
                </span>
              </a>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 11.5, color: "var(--color-text-muted)" }}>
                <span>🔒 Domain terkunci: <b>.idstar.group</b></span>
                <button
                  type="button"
                  onClick={() => setGoogleDemoModal(true)}
                  style={{ background: "none", border: "none", color: "var(--color-primary, #ea242a)", textDecoration: "underline", cursor: "pointer", fontSize: 11.5, padding: 0 }}
                >
                  ⚡ Coba Akun Google IDStar
                </button>
              </div>
            </div>
          </form>

          {/* Pemisah Demo */}
          <div style={{ display: "flex", alignItems: "center", margin: "22px 0 16px", gap: 12 }}>
            <div style={{ flex: 1, height: 1, background: "var(--color-border)" }} />
            <span style={{ fontSize: 12, fontWeight: 700, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              ⚡ Atau 1-Click Demo Login
            </span>
            <div style={{ flex: 1, height: 1, background: "var(--color-border)" }} />
          </div>

          {/* 3 Akun Demo */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {DAFTAR_AKUN_DEMO.map((item) => {
              const isItemLoading = demoLoading === item.email;
              return (
                <button
                  key={item.role}
                  type="button"
                  disabled={loading || Boolean(demoLoading)}
                  onClick={() => handleDemoLogin(item.email)}
                  className="login-demo-btn"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "10px 14px",
                    background: "#ffffff",
                    border: "1px solid var(--color-border)",
                    borderRadius: 10,
                    cursor: "pointer",
                    textAlign: "left",
                    transition: "all 0.15s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = item.badgeColor;
                    e.currentTarget.style.boxShadow = `0 2px 8px ${item.badgeBg}`;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "var(--color-border)";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1 }}>
                    <span style={{ fontSize: 20 }}>{item.icon}</span>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontWeight: 700, fontSize: 13, color: "#111827" }}>{item.judul}</span>
                        <span style={{
                          fontSize: 10,
                          fontWeight: 700,
                          background: item.badgeBg,
                          color: item.badgeColor,
                          padding: "2px 6px",
                          borderRadius: 4,
                          textTransform: "uppercase"
                        }}>
                          {item.role}
                        </span>
                      </div>
                      <div style={{ fontSize: 11, color: "var(--color-text-muted)", marginTop: 2 }}>
                        {item.deskripsi}
                      </div>
                    </div>
                  </div>
                  <div style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: item.badgeColor,
                    padding: "4px 8px",
                    borderRadius: 6,
                    background: item.badgeBg,
                    flexShrink: 0,
                    marginLeft: 10
                  }}>
                    {isItemLoading ? "Masuk..." : "Masuk →"}
                  </div>
                </button>
              );
            })}
          </div>

          <div style={{ textAlign: "center", marginTop: 16, fontSize: 11, color: "var(--color-text-muted)" }}>
            Kata sandi demo otomatis: <code>contoh123</code>
          </div>
        </div>
      </div>

      {/* Modal Simulasi Akun Google IDStar */}
      {googleDemoModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.65)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: 16,
          }}
        >
          <div
            className="card"
            style={{
              maxWidth: 440,
              width: "100%",
              background: "#ffffff",
              borderRadius: 14,
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.2)",
              padding: "24px 22px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <div style={{ fontSize: 24 }}>🛡️</div>
              <div>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#0f172a" }}>
                  Verifikasi Akun Google IDStar
                </h3>
                <div style={{ fontSize: 12, color: "var(--color-text-muted)" }}>
                  Domain Resmi: <b>@idstar.group</b>
                </div>
              </div>
            </div>

            <p style={{ fontSize: 13, color: "var(--color-text-muted)", lineHeight: 1.5, marginBottom: 16 }}>
              INVORA menerapkan aturan keamanan terpusat: <b>Hanya email berakhiran @idstar.group</b> yang diizinkan masuk ke sistem. Akun publik seperti @gmail.com akan otomatis ditolak.
            </p>

            <form onSubmit={handleGoogleDemoSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div className="field">
                <label style={{ fontSize: 12.5, fontWeight: 600 }}>Alamat Email Google</label>
                <input
                  type="email"
                  value={customGoogleEmail}
                  onChange={(e) => setCustomGoogleEmail(e.target.value)}
                  placeholder="nama@idstar.group"
                  required
                  style={{ width: "100%", padding: "9px 12px" }}
                />
              </div>

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", fontSize: 11.5 }}>
                <span style={{ color: "var(--color-text-muted)" }}>Pintasan Uji:</span>
                <button
                  type="button"
                  onClick={() => setCustomGoogleEmail("ahmad.fauzi@idstar.group")}
                  style={{ background: "#ecfdf5", border: "1px solid #a7f3d0", color: "#065f46", padding: "2px 8px", borderRadius: 4, cursor: "pointer", fontSize: 11 }}
                >
                  ✓ ahmad.fauzi@idstar.group (Lolos)
                </button>
                <button
                  type="button"
                  onClick={() => setCustomGoogleEmail("pengguna.luar@gmail.com")}
                  style={{ background: "#fef2f2", border: "1px solid #fecaca", color: "#991b1b", padding: "2px 8px", borderRadius: 4, cursor: "pointer", fontSize: 11 }}
                >
                  ✕ pengguna.luar@gmail.com (Uji Tolak)
                </button>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 14 }}>
                <button
                  type="button"
                  onClick={() => setGoogleDemoModal(false)}
                  className="btn"
                  style={{ padding: "8px 14px" }}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={googleLoading}
                  className="btn btn-primary"
                  style={{ padding: "8px 16px" }}
                >
                  {googleLoading ? "Memverifikasi..." : "Lanjutkan Masuk"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
