"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Logo from "@/components/logo";
import LoginBackground from "@/components/login-background";

export default function ResetPasswordClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");

  const [verifikasiLoading, setVerifikasiLoading] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [emailUser, setEmailUser] = useState<string | null>(null);
  const [pesanTokenError, setPesanTokenError] = useState<string | null>(null);

  const [kataSandiBaru, setKataSandiBaru] = useState("");
  const [konfirmasiKataSandi, setKonfirmasiKataSandi] = useState("");
  const [lihatPassword, setLihatPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sukses, setSukses] = useState(false);

  // Verify token on page load
  useEffect(() => {
    if (!token) {
      setVerifikasiLoading(false);
      setPesanTokenError("Missing or invalid password reset token.");
      return;
    }

    async function cekToken() {
      try {
        const res = await fetch(`/api/auth/reset-password?token=${encodeURIComponent(token!)}`);
        const data = await res.json().catch(() => ({}));

        if (!res.ok || !data.valid) {
          setTokenValid(false);
          setPesanTokenError(data.error ?? "This password reset link is invalid or has expired.");
        } else {
          setTokenValid(true);
          setEmailUser(data.email);
        }
      } catch {
        setTokenValid(false);
        setPesanTokenError("Unable to verify reset token.");
      } finally {
        setVerifikasiLoading(false);
      }
    }

    cekToken();
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (kataSandiBaru.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }

    if (kataSandiBaru !== konfirmasiKataSandi) {
      setError("Password confirmation does not match.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          kataSandiBaru,
          konfirmasiKataSandi,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Failed to reset password.");
        setLoading(false);
        return;
      }

      setSukses(true);
      setLoading(false);
      setTimeout(() => {
        router.push("/?resetSuccess=true");
      }, 2200);
    } catch {
      setError("Network error occurred.");
      setLoading(false);
    }
  }

  return (
    <main className="login-shell">
      {/* Left Brand Panel */}
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

      {/* Main Reset Password Area */}
      <div className="login-main">
        <LoginBackground />

        <div className="card login-card">
          {/* Header */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, marginBottom: 20 }}>
            <Logo height={44} variant="color" />
            <div style={{ textAlign: "center" }}>
              <h1 style={{ fontSize: 20, fontWeight: 800, margin: 0, color: "#111827" }}>
                SET NEW PASSWORD
              </h1>
              <p className="subtitle" style={{ marginBottom: 0, fontSize: 13, fontWeight: 500 }}>
                {emailUser ? (
                  <>Account: <b style={{ color: "#1e293b" }}>{emailUser}</b></>
                ) : (
                  "Create a new password for your INVORA account"
                )}
              </p>
            </div>
          </div>

          {verifikasiLoading && (
            <div style={{ textAlign: "center", padding: "30px 0", color: "#64748b", fontSize: 13.5 }}>
              <div
                style={{
                  display: "inline-block",
                  width: 22,
                  height: 22,
                  border: "2px solid #ea242a",
                  borderTopColor: "transparent",
                  borderRadius: "50%",
                  animation: "spin 0.6s linear infinite",
                  marginBottom: 8,
                }}
              />
              <div>Verifying security token...</div>
            </div>
          )}

          {!verifikasiLoading && !tokenValid && (
            <div style={{ textAlign: "center", padding: "10px 0" }}>
              <div className="alert alert-danger" style={{ fontSize: 13, marginBottom: 16, textAlign: "left" }}>
                {pesanTokenError}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <a
                  href="/forgot-password"
                  className="btn btn-primary"
                  style={{ justifyContent: "center", textDecoration: "none", padding: 10, fontWeight: 700 }}
                >
                  Request New Reset Link &rarr;
                </a>
                <a
                  href="/"
                  style={{ fontSize: 13, fontWeight: 600, color: "#475569", textDecoration: "none" }}
                >
                  &larr; Back to Sign In
                </a>
              </div>
            </div>
          )}

          {!verifikasiLoading && tokenValid && (
            <>
              {sukses ? (
                <div style={{ textAlign: "center", padding: "16px 0" }}>
                  <div
                    style={{
                      padding: "14px 16px",
                      borderRadius: 10,
                      background: "#ecfdf5",
                      border: "1px solid #a7f3d0",
                      color: "#065f46",
                      marginBottom: 16,
                    }}
                  >
                    <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>
                      ✓ Password Successfully Updated!
                    </div>
                    <div style={{ fontSize: 13 }}>
                      Redirecting you to the Sign In page...
                    </div>
                  </div>
                  <a
                    href="/?resetSuccess=true"
                    className="btn btn-primary"
                    style={{ display: "inline-flex", textDecoration: "none", fontWeight: 700 }}
                  >
                    Sign In Now &rarr;
                  </a>
                </div>
              ) : (
                <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  {error && (
                    <div className="alert alert-danger" style={{ margin: 0, fontSize: 13 }}>
                      {error}
                    </div>
                  )}

                  <div className="field">
                    <label style={{ fontSize: 13, fontWeight: 600 }}>New Password</label>
                    <input
                      type={lihatPassword ? "text" : "password"}
                      value={kataSandiBaru}
                      onChange={(e) => setKataSandiBaru(e.target.value)}
                      placeholder="At least 8 characters"
                      required
                      minLength={8}
                    />
                  </div>

                  <div className="field">
                    <label style={{ fontSize: 13, fontWeight: 600 }}>Confirm New Password</label>
                    <input
                      type={lihatPassword ? "text" : "password"}
                      value={konfirmasiKataSandi}
                      onChange={(e) => setKonfirmasiKataSandi(e.target.value)}
                      placeholder="Re-enter new password"
                      required
                      minLength={8}
                    />
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <input
                      type="checkbox"
                      id="showPass"
                      checked={lihatPassword}
                      onChange={(e) => setLihatPassword(e.target.checked)}
                      style={{ cursor: "pointer" }}
                    />
                    <label htmlFor="showPass" style={{ fontSize: 12, color: "#64748b", cursor: "pointer", userSelect: "none" }}>
                      Show password characters
                    </label>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="btn btn-primary"
                    style={{ justifyContent: "center", padding: 11, fontSize: 14, fontWeight: 700, marginTop: 4 }}
                  >
                    {loading ? "Saving New Password..." : "Save New Password"}
                  </button>

                  <div style={{ textAlign: "center", marginTop: 6 }}>
                    <a href="/" style={{ fontSize: 13, fontWeight: 600, color: "#475569", textDecoration: "none" }}>
                      &larr; Back to Sign In
                    </a>
                  </div>
                </form>
              )}
            </>
          )}
        </div>
      </div>
    </main>
  );
}
