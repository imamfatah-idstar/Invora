"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Logo from "@/components/logo";
import LoginBackground from "@/components/login-background";

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

  return (
    <main className="login-shell">
      {/* Panel kiri / atas brand IDStar */}
      <aside className="login-aside">
        <div className="login-aside-brand">
          <Logo height={28} variant="white" />
          <div className="login-aside-title">
            Sistem Otomasi Invoicing &amp; Request GR Customer XL Smart
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
              <h1 style={{ fontSize: 20, fontWeight: 800, margin: 0, color: "#111827" }}>🧾 Masuk ke Invora</h1>
              <p className="subtitle" style={{ marginBottom: 0, fontSize: 13 }}>IDStar Financial &amp; Invoicing Platform</p>
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
    </main>
  );
}
