"use client";

import LoginBackground from "@/components/login-background";
import Logo from "@/components/logo";
import { useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";

type AkunDemo = {
  role: "admin" | "checker" | "petugas";
  label: string;
  email: string;
  color: string;
  bgLight: string;
  borderLight: string;
};

const DAFTAR_AKUN_DEMO: AkunDemo[] = [
  {
    role: "admin",
    label: "Admin",
    email: "admin@contoh.local",
    color: "#6366f1",
    bgLight: "#eef2ff",
    borderLight: "#c7d2fe",
  },
  {
    role: "checker",
    label: "Checker",
    email: "checker@contoh.local",
    color: "#0284c7",
    bgLight: "#f0f9ff",
    borderLight: "#bae6fd",
  },
  {
    role: "petugas",
    label: "Petugas",
    email: "petugas@contoh.local",
    color: "#059669",
    bgLight: "#ecfdf5",
    borderLight: "#a7f3d0",
  },
];

export default function LoginClient() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [kataSandi, setKataSandi] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState<string | null>(null);
  const [demoDropdownOpen, setDemoDropdownOpen] = useState(false);
  const demoDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (demoDropdownRef.current && !demoDropdownRef.current.contains(event.target as Node)) {
        setDemoDropdownOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setDemoDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

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
      setError(data.error ?? "Failed to sign in.");
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
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
    await prosesLogin(demoEmail, "contoh123");
    setDemoLoading(null);
  }

  return (
    <main className="login-shell">
      {/* Panel kiri / atas brand IDStar */}
      <aside className="login-aside">
        <div className="login-aside-brand">
          <Logo height={32} variant="white" />
        </div>

        <div className="login-aside-values">
          <div className="login-aside-value-item">
            <div className="login-aside-value-label">Vision</div>
            <div className="login-aside-value-desc">
              We aspire to see a digital-ready generation that innovates and leads smart businesses across asia.
            </div>
          </div>
          <div className="login-aside-value-item">
            <div className="login-aside-value-label">Mission</div>
            <div className="login-aside-value-desc">
              To Build, Accelerate, Support, and Empower every organization business transformation.
            </div>
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
              <label style={{ fontSize: 13, fontWeight: 600 }}>Email Address</label>
              <input
                type="email"
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="field">
              <label style={{ fontSize: 13, fontWeight: 600 }}>Password</label>
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
              {loading ? "Processing..." : "Sign In"}
            </button>

            {/* Tombol Masuk dengan Akun Google */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 4 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "6px 0 2px" }}>
                <div style={{ flex: 1, height: 1, background: "var(--color-border)" }} />
                <span style={{ fontSize: 11.5, fontWeight: 600, color: "var(--color-text-muted)" }}>
                  OR
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
                <span>Sign in with Google</span>
                <span style={{ fontSize: 11, background: "rgba(34, 197, 94, 0.12)", color: "#166534", padding: "2px 6px", borderRadius: 4, fontWeight: 700 }}>
                  @idstar.group
                </span>
              </a>
            </div>
          </form>

          {/* Pemisah Demo */}
          <div style={{ display: "flex", alignItems: "center", margin: "22px 0 14px", gap: 12 }}>
            <div style={{ flex: 1, height: 1, background: "var(--color-border, #e2e8f0)" }} />
            <span style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              DEMO SANDBOX ACCESS
            </span>
            <div style={{ flex: 1, height: 1, background: "var(--color-border, #e2e8f0)" }} />
          </div>

          {/* Select Demo Account Container */}
          <div ref={demoDropdownRef} style={{ position: "relative" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#475569" }}>
                Select Demo Account
              </label>
              <span style={{ fontSize: 11, color: "#94a3b8" }}>
                ⚡ 1-Click Instant Sign-In
              </span>
            </div>

            {/* Select Trigger Box */}
            <button
              type="button"
              disabled={loading || Boolean(demoLoading)}
              onClick={() => setDemoDropdownOpen((prev) => !prev)}
              aria-haspopup="listbox"
              aria-expanded={demoDropdownOpen}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "10px 14px",
                background: demoDropdownOpen ? "#f8fafc" : "#ffffff",
                border: `1.5px solid ${demoDropdownOpen ? "var(--color-primary, #ea242a)" : "#cbd5e1"}`,
                borderRadius: 8,
                fontSize: 13.5,
                fontWeight: 500,
                color: "#1e293b",
                cursor: "pointer",
                transition: "all 0.15s ease",
                boxShadow: demoDropdownOpen ? "0 0 0 3px rgba(234, 36, 42, 0.08)" : "0 1px 2px rgba(0,0,0,0.04)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0, overflow: "hidden" }}>
                {demoLoading ? (
                  <span
                    style={{
                      display: "inline-block",
                      width: 15,
                      height: 15,
                      border: "2px solid #ea242a",
                      borderTopColor: "transparent",
                      borderRadius: "50%",
                      animation: "spin 0.6s linear infinite",
                      flexShrink: 0,
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 6,
                      background: "#f1f5f9",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#64748b",
                      flexShrink: 0,
                    }}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                  </div>
                )}
                <span style={{ fontWeight: 600, color: demoLoading ? "var(--color-primary, #ea242a)" : "#334155", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {demoLoading
                    ? `Signing in as ${DAFTAR_AKUN_DEMO.find((d) => d.email === demoLoading)?.label || demoLoading}...`
                    : "Choose role (Admin, Checker, Petugas)..."}
                </span>
              </div>

              <svg
                width="16"
                height="16"
                viewBox="0 0 20 20"
                fill="currentColor"
                style={{
                  transform: demoDropdownOpen ? "rotate(0deg)" : "rotate(180deg)",
                  transition: "transform 0.2s ease",
                  color: "#64748b",
                  flexShrink: 0,
                  marginLeft: 8,
                }}
              >
                <path
                  fillRule="evenodd"
                  d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </button>

            {/* Dropdown Options List — Arahkan ke Atas (Dropup) */}
            {demoDropdownOpen && (
              <div
                style={{
                  position: "absolute",
                  bottom: "calc(100% + 6px)",
                  left: 0,
                  right: 0,
                  background: "#ffffff",
                  border: "1px solid #cbd5e1",
                  borderRadius: 10,
                  boxShadow: "0 -10px 25px -5px rgba(15, 23, 42, 0.12), 0 -4px 10px -2px rgba(15, 23, 42, 0.04)",
                  zIndex: 50,
                  display: "flex",
                  flexDirection: "column",
                  padding: "5px",
                  gap: "3px",
                  animation: "demoFadeIn 0.15s ease-out",
                }}
              >
                {DAFTAR_AKUN_DEMO.map((item) => {
                  const isItemLoading = demoLoading === item.email;
                  return (
                    <button
                      key={item.role}
                      type="button"
                      disabled={loading || Boolean(demoLoading)}
                      onClick={() => {
                        setDemoDropdownOpen(false);
                        handleDemoLogin(item.email);
                      }}
                      style={{
                        width: "100%",
                        padding: "8px 10px",
                        background: isItemLoading ? "#f1f5f9" : "transparent",
                        border: "1px solid transparent",
                        borderRadius: 6,
                        textAlign: "left",
                        cursor: "pointer",
                        transition: "all 0.12s ease",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 10,
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "#f8fafc";
                        e.currentTarget.style.borderColor = "#e2e8f0";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = isItemLoading ? "#f1f5f9" : "transparent";
                        e.currentTarget.style.borderColor = "transparent";
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 9, minWidth: 0 }}>
                        {/* Avatar Role Icon */}
                        <div
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: "50%",
                            background: item.bgLight,
                            border: `1px solid ${item.borderLight}`,
                            color: item.color,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                          }}
                        >
                          {item.role === "admin" && (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                            </svg>
                          )}
                          {item.role === "checker" && (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                              <polyline points="22 4 12 14.01 9 11.01" />
                            </svg>
                          )}
                          {item.role === "petugas" && (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                            </svg>
                          )}
                        </div>

                        <span style={{ fontSize: 13.5, fontWeight: 700, color: "#0f172a" }}>
                          {item.label}
                        </span>
                      </div>

                      {/* Right Action / Arrow */}
                      <div style={{ flexShrink: 0, display: "flex", alignItems: "center", color: "#94a3b8" }}>
                        {isItemLoading ? (
                          <span style={{ fontSize: 11, color: "var(--color-primary, #ea242a)", fontWeight: 600 }}>Signing in...</span>
                        ) : (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="9 18 15 12 9 6" />
                          </svg>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
