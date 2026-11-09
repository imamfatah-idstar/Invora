"use client";

import { useState } from "react";

export default function ModalGantiPassword() {
  const [buka, setBuka] = useState(false);
  const [kataSandiLama, setKataSandiLama] = useState("");
  const [kataSandiBaru, setKataSandiBaru] = useState("");
  const [konfirmasiKataSandi, setKonfirmasiKataSandi] = useState("");
  const [lihatPassword, setLihatPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sukses, setSukses] = useState<string | null>(null);

  function resetForm() {
    setKataSandiLama("");
    setKataSandiBaru("");
    setKonfirmasiKataSandi("");
    setError(null);
    setSukses(null);
  }

  function handleBuka() {
    resetForm();
    setBuka(true);
  }

  function handleTutup() {
    if (loading) return;
    setBuka(false);
    resetForm();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSukses(null);

    if (kataSandiBaru.length < 8) {
      setError("Kata sandi baru minimal 8 karakter.");
      return;
    }

    if (kataSandiBaru !== konfirmasiKataSandi) {
      setError("Konfirmasi kata sandi tidak cocok.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/ganti-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kataSandiLama,
          kataSandiBaru,
          konfirmasiKataSandi,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Gagal mengubah kata sandi.");
        setLoading(false);
        return;
      }

      setSukses("Kata sandi berhasil diperbarui!");
      setLoading(false);
      setTimeout(() => {
        handleTutup();
      }, 1800);
    } catch {
      setError("Terjadi kesalahan jaringan.");
      setLoading(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={handleBuka}
        className="btn"
        title="Ubah Kata Sandi Akun"
        style={{
          padding: "5px 10px",
          fontSize: 12.5,
          background: "rgba(255,255,255,0.12)",
          borderColor: "rgba(255,255,255,0.25)",
          color: "white",
          display: "inline-flex",
          alignItems: "center",
          gap: 5,
          cursor: "pointer",
          fontWeight: 600,
        }}
      >
        <span>🔒</span>
        <span>Ganti Password</span>
      </button>

      {buka && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(15, 23, 42, 0.65)",
            backdropFilter: "blur(3px)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
          onClick={handleTutup}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: 14,
              width: "100%",
              maxWidth: 420,
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.1)",
              border: "1px solid #e2e8f0",
              overflow: "hidden",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "16px 20px",
                borderBottom: "1px solid #f1f5f9",
                background: "#f8fafc",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 18 }}>🔐</span>
                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#1e293b" }}>
                  Ubah Kata Sandi Akun
                </h3>
              </div>
              <button
                type="button"
                onClick={handleTutup}
                disabled={loading}
                style={{
                  background: "transparent",
                  border: "none",
                  fontSize: 20,
                  cursor: "pointer",
                  color: "#94a3b8",
                  padding: 0,
                  lineHeight: 1,
                }}
              >
                &times;
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmit} style={{ padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
              {error && (
                <div className="alert alert-danger" style={{ margin: 0, fontSize: 12.5, padding: "8px 12px" }}>
                  {error}
                </div>
              )}

              {sukses && (
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
                  ✓ {sukses}
                </div>
              )}

              <div className="field">
                <label style={{ fontSize: 12.5, fontWeight: 600, color: "#334155" }}>
                  Kata Sandi Lama / Saat Ini
                </label>
                <input
                  type={lihatPassword ? "text" : "password"}
                  value={kataSandiLama}
                  onChange={(e) => setKataSandiLama(e.target.value)}
                  placeholder="Masukkan kata sandi lama"
                  required
                  style={{ fontSize: 13, padding: "8px 10px" }}
                />
              </div>

              <div className="field">
                <label style={{ fontSize: 12.5, fontWeight: 600, color: "#334155" }}>
                  Kata Sandi Baru
                </label>
                <input
                  type={lihatPassword ? "text" : "password"}
                  value={kataSandiBaru}
                  onChange={(e) => setKataSandiBaru(e.target.value)}
                  placeholder="Minimal 8 karakter"
                  required
                  minLength={8}
                  style={{ fontSize: 13, padding: "8px 10px" }}
                />
              </div>

              <div className="field">
                <label style={{ fontSize: 12.5, fontWeight: 600, color: "#334155" }}>
                  Konfirmasi Kata Sandi Baru
                </label>
                <input
                  type={lihatPassword ? "text" : "password"}
                  value={konfirmasiKataSandi}
                  onChange={(e) => setKonfirmasiKataSandi(e.target.value)}
                  placeholder="Ulangi kata sandi baru"
                  required
                  minLength={8}
                  style={{ fontSize: 13, padding: "8px 10px" }}
                />
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: -4 }}>
                <input
                  type="checkbox"
                  id="intipPassword"
                  checked={lihatPassword}
                  onChange={(e) => setLihatPassword(e.target.checked)}
                  style={{ cursor: "pointer" }}
                />
                <label htmlFor="intipPassword" style={{ fontSize: 12, color: "#64748b", cursor: "pointer", userSelect: "none" }}>
                  Tampilkan karakter kata sandi
                </label>
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: 10,
                  marginTop: 6,
                  paddingTop: 14,
                  borderTop: "1px solid #f1f5f9",
                }}
              >
                <button
                  type="button"
                  onClick={handleTutup}
                  disabled={loading}
                  className="btn"
                  style={{ fontSize: 13, padding: "8px 14px" }}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="btn btn-primary"
                  style={{ fontSize: 13, padding: "8px 16px", fontWeight: 700 }}
                >
                  {loading ? "Menyimpan..." : "Simpan Password Baru"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

