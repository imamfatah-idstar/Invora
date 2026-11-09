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

  // Verifikasi token saat halaman dibuka
  useEffect(() => {
    if (!token) {
      setVerifikasiLoading(false);
      setPesanTokenError("Tautan reset tidak memiliki token yang valid.");
      return;
    }

    async function cekToken() {
      try {
        const res = await fetch(`/api/auth/reset-password?token=${encodeURIComponent(token!)}`);
        const data = await res.json().catch(() => ({}));

        if (!res.ok || !data.valid) {
          setTokenValid(false);
          setPesanTokenError(data.error ?? "Tautan reset kata sandi tidak valid atau telah kedaluwarsa.");
        } else {
          setTokenValid(true);
          setEmailUser(data.email);
        }
      } catch {
        setTokenValid(false);
        setPesanTokenError("Gagal memeriksa keabsahan tautan verifikasi.");
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
      setError("Kata sandi baru minimal 8 karakter.");
      return;
    }

    if (kataSandiBaru !== konfirmasiKataSandi) {
      setError("Konfirmasi kata sandi tidak cocok dengan kata sandi baru.");
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
        setError(data.error ?? "Gagal mengatur ulang kata sandi.");
        setLoading(false);
        return;
      }

      setSukses(true);
      setLoading(false);
      setTimeout(() => {
        router.push("/?resetSuccess=true");
      }, 2500);
    } catch {
      setError("Terjadi kesalahan jaringan.");
      setLoading(false);
    }
  }

  return (
    <main className="login-shell" style={{ display: "flex", minHeight: "100vh", position: "relative" }}>
      <LoginBackground />

      <div style={{
        position: "relative",
        zIndex: 1,
        width: "100%",
        maxWidth: 440,
        margin: "auto",
        padding: "30px 16px",
      }}>
        <div style={{
          background: "#ffffff",
          borderRadius: 16,
          boxShadow: "0 10px 25px -5px rgba(0,0,0,0.08), 0 8px 10px -6px rgba(0,0,0,0.04)",
          border: "1px solid var(--color-border, #e2e8f0)",
          padding: "32px 28px",
        }}>
          {/* Header */}
          <div style={{ textAlign: "center", marginBottom: 24 }}>
            <div style={{ display: "inline-flex", justifyContent: "center", marginBottom: 12 }}>
              <Logo height={44} variant="color" />
            </div>
            <h1 style={{ fontSize: 20, fontWeight: 800, margin: "0 0 6px", color: "#111827" }}>
              Atur Kata Sandi Baru
            </h1>
            <p style={{ fontSize: 13, color: "#64748b", margin: 0 }}>
              {emailUser ? (
                <>Untuk akun: <b style={{ color: "#1e293b" }}>{emailUser}</b></>
              ) : (
                "Masukkan kata sandi baru untuk akun INVORA Anda"
              )}
            </p>
          </div>

          {verifikasiLoading && (
            <div style={{ textAlign: "center", padding: "30px 0", color: "#64748b", fontSize: 13.5 }}>
              <div style={{
                display: "inline-block",
                width: 22,
                height: 22,
                border: "2px solid #ea242a",
                borderTopColor: "transparent",
                borderRadius: "50%",
                animation: "spin 0.6s linear infinite",
                marginBottom: 8,
              }} />
              <div>Memverifikasi tautan keamanan...</div>
            </div>
          )}

          {!verifikasiLoading && !tokenValid && (
            <div style={{ textAlign: "center", padding: "10px 0" }}>
              <div style={{ fontSize: 36, marginBottom: 10 }}>⚠️</div>
              <div className="alert alert-danger" style={{ fontSize: 13, marginBottom: 20, textAlign: "left" }}>
                {pesanTokenError}
              </div>
              <a href="/" className="btn btn-primary" style={{ display: "inline-flex", textDecoration: "none" }}>
                ← Kembali ke Halaman Masuk
              </a>
            </div>
          )}

          {!verifikasiLoading && tokenValid && (
            <>
              {sukses ? (
                <div style={{ textAlign: "center", padding: "20px 0" }}>
                  <div style={{ fontSize: 42, marginBottom: 12 }}>🎉</div>
                  <h3 style={{ fontSize: 17, fontWeight: 700, color: "#065f46", margin: "0 0 8px" }}>
                    Kata Sandi Berhasil Diperbarui!
                  </h3>
                  <p style={{ fontSize: 13, color: "#475569", marginBottom: 20 }}>
                    Mengalihkan Anda ke halaman masuk dalam beberapa detik...
                  </p>
                  <a href="/" className="btn btn-primary" style={{ display: "inline-flex", textDecoration: "none" }}>
                    Masuk Sekarang &rarr;
                  </a>
                </div>
              ) : (
                <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  {error && (
                    <div className="alert alert-danger" style={{ margin: 0, fontSize: 12.5, padding: "8px 12px" }}>
                      {error}
                    </div>
                  )}

                  <div className="field">
                    <label style={{ fontSize: 12.5, fontWeight: 600 }}>Kata Sandi Baru</label>
                    <input
                      type={lihatPassword ? "text" : "password"}
                      value={kataSandiBaru}
                      onChange={(e) => setKataSandiBaru(e.target.value)}
                      placeholder="Minimal 8 karakter"
                      required
                      minLength={8}
                    />
                  </div>

                  <div className="field">
                    <label style={{ fontSize: 12.5, fontWeight: 600 }}>Konfirmasi Kata Sandi Baru</label>
                    <input
                      type={lihatPassword ? "text" : "password"}
                      value={konfirmasiKataSandi}
                      onChange={(e) => setKonfirmasiKataSandi(e.target.value)}
                      placeholder="Ulangi kata sandi baru"
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
                      Tampilkan karakter kata sandi
                    </label>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="btn btn-primary"
                    style={{ padding: 11, fontSize: 14, fontWeight: 700, marginTop: 6 }}
                  >
                    {loading ? "Menyimpan Kata Sandi..." : "Simpan & Masuk ke Akun"}
                  </button>

                  <div style={{ textAlign: "center", marginTop: 8 }}>
                    <a href="/" style={{ fontSize: 12.5, color: "#64748b", textDecoration: "none" }}>
                      ← Batal, kembali ke halaman masuk
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

