"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Logo from "@/components/logo";
import LoginBackground from "@/components/login-background";

export default function ForgotPasswordClient() {
  const searchParams = useSearchParams();
  const initialEmail = searchParams.get("email") || "";

  const [email, setEmail] = useState(initialEmail);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [result, setResult] = useState<{
    email: string;
    nama?: string;
    message: string;
    resetUrl?: string;
    devPreviewUrl?: string;
    smtpSent?: boolean;
  } | null>(null);

  useEffect(() => {
    if (initialEmail) {
      setEmail(initialEmail);
    }
  }, [initialEmail]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/minta-reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Failed to send password reset email.");
        setLoading(false);
        return;
      }

      setResult({
        email: data.email || email.trim(),
        nama: data.nama,
        message: data.message,
        resetUrl: data.resetUrl || data.devPreviewUrl,
        devPreviewUrl: data.devPreviewUrl,
        smtpSent: data.smtpSent,
      });
    } catch {
      setError("Network error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function handleCopyLink() {
    if (!result?.resetUrl) return;
    navigator.clipboard.writeText(result.resetUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  function buildMailtoHref() {
    if (!result) return "#";
    const subject = "Reset Your INVORA IDStar Account Password";
    const body = [
      `Hello ${result.nama || result.email},`,
      "",
      `We received a request to reset the password for your INVORA account (${result.email}).`,
      "Please click or open the link below to set a new password:",
      "",
      result.resetUrl || "",
      "",
      "This link is valid for 60 minutes.",
      "",
      "Best regards,",
      "INVORA — PT IDStar Cipta Teknologi",
    ].join("\n");
    return `mailto:${encodeURIComponent(result.email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
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

      {/* Main Forgot Password Area */}
      <div className="login-main">
        <LoginBackground />

        <div className="card login-card">
          {/* Header */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, marginBottom: 20 }}>
            <Logo height={44} variant="color" />
            <div style={{ textAlign: "center" }}>
              <h1 style={{ fontSize: 20, fontWeight: 800, margin: 0, color: "#111827" }}>
                FORGOT PASSWORD
              </h1>
              <p className="subtitle" style={{ marginBottom: 0, fontSize: 13, fontWeight: 500 }}>
                Enter your registered email to receive a password reset link
              </p>
            </div>
          </div>

          {!result ? (
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div className="field">
                <label style={{ fontSize: 13, fontWeight: 600 }}>Email Address</label>
                <input
                  type="email"
                  placeholder="name@idstar.group"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                />
                <span style={{ fontSize: 11.5, color: "#64748b", marginTop: 4, display: "block" }}>
                  We will send a secure 60-minute password reset link to this email address.
                </span>
              </div>

              {error && (
                <div className="alert alert-danger" style={{ fontSize: 13, margin: 0 }}>
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary"
                style={{ justifyContent: "center", padding: 11, fontSize: 14, fontWeight: 700 }}
              >
                {loading ? "Sending Reset Link..." : "Send Password Reset Link"}
              </button>

              <div style={{ textAlign: "center", marginTop: 6 }}>
                <Link
                  href="/"
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: "#475569",
                    textDecoration: "none",
                  }}
                >
                  &larr; Back to Sign In
                </Link>
              </div>
            </form>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div
                style={{
                  padding: "14px 16px",
                  borderRadius: 10,
                  background: "#ecfdf5",
                  border: "1px solid #a7f3d0",
                  color: "#065f46",
                  fontSize: 13,
                  lineHeight: 1.5,
                }}
              >
                <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>
                  ✓ Reset Link Generated for {result.email}
                </div>
                <div>
                  {result.smtpSent
                    ? `An email containing your password reset link has been sent to ${result.email}. Please check your Inbox or Spam folder.`
                    : `Your password reset token has been created for ${result.email}. You can send the email via your mail client or open the reset link below:`}
                </div>
              </div>

              {result.resetUrl && (
                <div
                  style={{
                    padding: "12px 14px",
                    borderRadius: 8,
                    background: "#f8fafc",
                    border: "1px solid #e2e8f0",
                    display: "flex",
                    flexDirection: "column",
                    gap: 10,
                  }}
                >
                  <div style={{ fontSize: 11.5, fontWeight: 700, color: "#475569" }}>
                    Password Reset Actions:
                  </div>

                  <a
                    href={result.resetUrl}
                    className="btn btn-primary"
                    style={{
                      justifyContent: "center",
                      textDecoration: "none",
                      padding: "10px 14px",
                      fontSize: 13.5,
                      fontWeight: 700,
                      textAlign: "center",
                    }}
                  >
                    🔑 Open Reset Password Page &rarr;
                  </a>

                  <div style={{ display: "flex", gap: 8 }}>
                    <a
                      href={buildMailtoHref()}
                      className="btn"
                      style={{
                        flex: 1,
                        justifyContent: "center",
                        textDecoration: "none",
                        fontSize: 12.5,
                        fontWeight: 600,
                        padding: "8px 10px",
                        textAlign: "center",
                      }}
                    >
                      ✉️ Open in Email App
                    </a>
                    <button
                      type="button"
                      onClick={handleCopyLink}
                      className="btn"
                      style={{
                        flex: 1,
                        justifyContent: "center",
                        fontSize: 12.5,
                        fontWeight: 600,
                        padding: "8px 10px",
                      }}
                    >
                      {copied ? "✓ Link Copied" : "📋 Copy Reset Link"}
                    </button>
                  </div>
                </div>
              )}

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginTop: 4,
                  fontSize: 12.5,
                }}
              >
                <button
                  type="button"
                  onClick={() => setResult(null)}
                  style={{
                    background: "none",
                    border: "none",
                    padding: 0,
                    color: "var(--color-primary, #ea242a)",
                    fontWeight: 600,
                    cursor: "pointer",
                    textDecoration: "underline",
                  }}
                >
                  Use another email
                </button>
                <Link
                  href="/"
                  style={{
                    fontWeight: 600,
                    color: "#475569",
                    textDecoration: "none",
                  }}
                >
                  &larr; Back to Sign In
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
