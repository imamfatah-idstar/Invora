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
    label: "Demo Multi-Role (Semua Peran)",
    email: "multi@contoh.local",
    color: "#8b5cf6",
    bgLight: "#f5f3ff",
    borderLight: "#ddd6fe",
  },
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

const OFFICIAL_RECAPTCHA_SITE_KEY =
  process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY ||
  "6Ldq9x8uAAAAANgGCK-NHNf8B72lCbJ8eke1o7x3";

declare global {
  interface Window {
    grecaptcha?: {
      ready: (cb: () => void) => void;
      render: (
        container: HTMLElement,
        parameters: {
          sitekey: string;
          theme?: "light" | "dark";
          size?: "normal" | "compact";
          callback?: (token: string) => void;
          "expired-callback"?: () => void;
          "error-callback"?: () => void;
        }
      ) => number;
      reset: (widgetId?: number) => void;
    };
    onInvoraRecaptchaLoad?: () => void;
  }
}

export default function LoginClient() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [kataSandi, setKataSandi] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Official Google reCAPTCHA v2 State
  const [recaptchaToken, setRecaptchaToken] = useState<string | null>(null);
  const [honeypot, setHoneypot] = useState("");
  const recaptchaContainerRef = useRef<HTMLDivElement | null>(null);
  const recaptchaWidgetIdRef = useRef<number | null>(null);

  // State Modal Lupa Password via Email
  const [bukaModalLupaPassword, setBukaModalLupaPassword] = useState(false);
  const [emailLupa, setEmailLupa] = useState("");
  const [lupaLoading, setLupaLoading] = useState(false);
  const [lupaError, setLupaError] = useState<string | null>(null);
  const [lupaSukses, setLupaSukses] = useState<{ message: string; devPreviewUrl?: string } | null>(null);
  const [notifSukses, setNotifSukses] = useState<string | null>(null);

  // Load & Render Official Google reCAPTCHA v2 (English: hl=en)
  useEffect(() => {
    function renderWidget() {
      if (
        !recaptchaContainerRef.current ||
        !window.grecaptcha ||
        typeof window.grecaptcha.render !== "function"
      ) {
        return;
      }
      if (recaptchaWidgetIdRef.current !== null) return;
      try {
        recaptchaContainerRef.current.innerHTML = "";
        recaptchaWidgetIdRef.current = window.grecaptcha.render(recaptchaContainerRef.current, {
          sitekey: OFFICIAL_RECAPTCHA_SITE_KEY,
          theme: "light",
          callback: (token: string) => {
            setRecaptchaToken(token);
            setError(null);
          },
          "expired-callback": () => {
            setRecaptchaToken(null);
          },
          "error-callback": () => {
            setRecaptchaToken(null);
          },
        });
      } catch {
        // Widget already rendered
      }
    }

    window.onInvoraRecaptchaLoad = () => {
      renderWidget();
    };

    if (window.grecaptcha && typeof window.grecaptcha.render === "function") {
      window.grecaptcha.ready(renderWidget);
    } else {
      const existingScript = document.getElementById("google-recaptcha-v2-script");
      if (!existingScript) {
        const script = document.createElement("script");
        script.id = "google-recaptcha-v2-script";
        script.src =
          "https://www.google.com/recaptcha/api.js?onload=onInvoraRecaptchaLoad&render=explicit&hl=en";
        script.async = true;
        script.defer = true;
        document.body.appendChild(script);
      }
    }

    return () => {
      recaptchaWidgetIdRef.current = null;
    };
  }, []);

  function resetRecaptcha() {
    setRecaptchaToken(null);
    if (window.grecaptcha && recaptchaWidgetIdRef.current !== null) {
      try {
        window.grecaptcha.reset(recaptchaWidgetIdRef.current);
      } catch {
        // ignore
      }
    }
  }

  // Tangkap pesan error / sukses dari URL callback
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const err = params.get("error");
      if (err) {
        setError(decodeURIComponent(err));
      }
      const resetSuccess = params.get("resetSuccess");
      if (resetSuccess) {
        setNotifSukses("Your password has been updated! Please sign in with your new password.");
      }
    }
  }, []);

  async function prosesLogin(loginEmail: string, loginPass: string) {
    setError(null);
    if (!recaptchaToken) {
      setError("Please complete the Google reCAPTCHA verification ('I'm not a robot') first.");
      return false;
    }

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: loginEmail,
        kataSandi: loginPass,
        recaptchaToken,
        honeypot,
      }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Failed to sign in.");
      if (data.resetRecaptcha) {
        resetRecaptcha();
      }
      return false;
    }

    const data = await res.json().catch(() => ({}));
    if (data.multipleRoles) {
      router.push("/pilih-role");
    } else {
      router.push("/dashboard");
    }
    router.refresh();
    return true;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await prosesLogin(email, kataSandi);
    setLoading(false);
  }

  async function handleMintaResetPassword(e: React.FormEvent) {
    e.preventDefault();
    setLupaError(null);
    setLupaSukses(null);
    setLupaLoading(true);

    try {
      const res = await fetch("/api/auth/minta-reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailLupa }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setLupaError(data.error ?? "Gagal mengirim tautan reset.");
        setLupaLoading(false);
        return;
      }

      setLupaSukses({
        message: data.message,
        devPreviewUrl: data.devPreviewUrl,
      });
      setLupaLoading(false);
    } catch {
      setLupaError("Terjadi kesalahan jaringan.");
      setLupaLoading(false);
    }
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
            {notifSukses && (
              <div
                style={{
                  padding: "10px 14px",
                  borderRadius: 6,
                  background: "#ecfdf5",
                  color: "#065f46",
                  border: "1px solid #a7f3d0",
                  fontSize: 13,
                  fontWeight: 600,
                  textAlign: "center",
                }}
              >
                ✓ {notifSukses}
              </div>
            )}

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
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <label style={{ fontSize: 13, fontWeight: 600 }}>Password</label>
                <a
                  href={
                    email.trim()
                      ? `/forgot-password?email=${encodeURIComponent(email.trim())}`
                      : "/forgot-password"
                  }
                  style={{
                    fontSize: 12,
                    color: "var(--color-primary, #ea242a)",
                    fontWeight: 600,
                    textDecoration: "underline",
                  }}
                >
                  Forgot Password?
                </a>
              </div>
              <input
                type="password"
                placeholder="••••••••"
                value={kataSandi}
                onChange={(e) => setKataSandi(e.target.value)}
                required
              />
            </div>

            {/* Hidden Honeypot Trap for Automated DDoS Bots */}
            <input
              type="text"
              name="website_url"
              value={honeypot}
              onChange={(e) => setHoneypot(e.target.value)}
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
              style={{ position: "absolute", left: "-9999px", width: 1, height: 1, opacity: 0 }}
            />

            {/* Official Google reCAPTCHA v2 Widget (English) */}
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                margin: "2px 0",
                minHeight: 78,
              }}
            >
              <div ref={recaptchaContainerRef} />
            </div>

            {error && <div className="alert alert-danger" style={{ fontSize: 13 }}>{error}</div>}

            <button
              type="submit"
              disabled={loading}
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
        </div>
      </div>

      {/* Modal Lupa Password via Email */}
      {bukaModalLupaPassword && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.6)",
            backdropFilter: "blur(4px)",
            zIndex: 100,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget && !lupaLoading) {
              setBukaModalLupaPassword(false);
            }
          }}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: 14,
              maxWidth: 440,
              width: "100%",
              padding: "24px 26px",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.25), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
              border: "1px solid #e2e8f0",
              animation: "demoFadeIn 0.2s ease-out",
            }}
          >
            {/* Header Modal */}
            <div style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 16 }}>
              <div
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 10,
                  background: "rgba(234, 36, 42, 0.1)",
                  color: "#ea242a",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </div>
              <div style={{ flex: 1 }}>
                <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: "#0f172a" }}>
                  Lupa Kata Sandi?
                </h3>
                <p style={{ margin: "4px 0 0", fontSize: 13, color: "#64748b", lineHeight: 1.45 }}>
                  Masukkan email akun terdaftar Anda. Sistem akan mengirimkan instruksi dan tautan aman untuk reset kata sandi.
                </p>
              </div>
            </div>

            {/* Konten Form / Sukses */}
            {lupaSukses ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 8 }}>
                <div
                  style={{
                    padding: "12px 14px",
                    borderRadius: 8,
                    background: "#ecfdf5",
                    border: "1px solid #a7f3d0",
                    color: "#065f46",
                    fontSize: 13,
                    lineHeight: 1.5,
                  }}
                >
                  <div style={{ fontWeight: 700, marginBottom: 4, display: "flex", alignItems: "center", gap: 6 }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    Tautan Reset Berhasil Dikirim!
                  </div>
                  <div>{lupaSukses.message}</div>
                </div>

                {lupaSukses.devPreviewUrl && (
                  <div
                    style={{
                      padding: "10px 12px",
                      borderRadius: 8,
                      background: "#f8fafc",
                      border: "1px dashed #cbd5e1",
                      fontSize: 12,
                      color: "#475569",
                    }}
                  >
                    <div style={{ fontWeight: 600, color: "#0f172a", marginBottom: 4 }}>
                      Mode Pratinjau (SMTP belum dikonfigurasi):
                    </div>
                    <a
                      href={lupaSukses.devPreviewUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: "inline-block",
                        marginTop: 4,
                        padding: "6px 12px",
                        background: "#ea242a",
                        color: "#fff",
                        borderRadius: 6,
                        textDecoration: "none",
                        fontWeight: 600,
                        fontSize: 12,
                      }}
                    >
                      Buka Tautan Reset Sekarang &rarr;
                    </a>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setBukaModalLupaPassword(false);
                    setLupaSukses(null);
                  }}
                  className="btn btn-secondary"
                  style={{ width: "100%", justifyContent: "center", padding: 10, marginTop: 6 }}
                >
                  Kembali ke Halaman Masuk
                </button>
              </div>
            ) : (
              <form onSubmit={handleMintaResetPassword} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {lupaError && (
                  <div
                    style={{
                      padding: "10px 12px",
                      borderRadius: 6,
                      background: "#fef2f2",
                      border: "1px solid #fecaca",
                      color: "#991b1b",
                      fontSize: 13,
                    }}
                  >
                    {lupaError}
                  </div>
                )}

                <div className="field">
                  <label style={{ fontSize: 13, fontWeight: 600, color: "#334155" }}>Email Akun</label>
                  <input
                    type="email"
                    placeholder="nama@idstar.group atau nama@contoh.local"
                    value={emailLupa}
                    onChange={(e) => setEmailLupa(e.target.value)}
                    required
                    disabled={lupaLoading}
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      borderRadius: 6,
                      border: "1px solid #cbd5e1",
                      fontSize: 13.5,
                    }}
                  />
                </div>

                <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8 }}>
                  <button
                    type="button"
                    disabled={lupaLoading}
                    onClick={() => setBukaModalLupaPassword(false)}
                    className="btn btn-secondary"
                    style={{ padding: "9px 16px", fontSize: 13 }}
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={lupaLoading}
                    className="btn btn-primary"
                    style={{ padding: "9px 18px", fontSize: 13, fontWeight: 700 }}
                  >
                    {lupaLoading ? "Mengirim..." : "Kirim Tautan Reset"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
