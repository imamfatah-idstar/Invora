"use client";

import { useState } from "react";
import Logo from "@/components/logo";

type UserProps = {
  id?: number;
  nama?: string;
  email?: string;
  role?: string;
} | null;

interface MvpPortalClientProps {
  user: UserProps;
  dbStatus?: "connected" | "paused" | "error";
  dbErrorMsg?: string;
}

export default function MvpPortalClient({ user, dbStatus = "connected", dbErrorMsg }: MvpPortalClientProps) {
  const [activeTab, setActiveTab] = useState<"all" | "mvp1" | "mvp2" | "mvp2b" | "mvp3">("all");
  
  // State untuk Simulator Prorata & Cross PO
  const [simRate, setSimRate] = useState<number>(15000000);
  const [simHariKerja, setSimHariKerja] = useState<number>(14);
  const [simHariBulan, setSimHariBulan] = useState<number>(21);
  const [simSaldoPoUtama, setSimSaldoPoUtama] = useState<number>(7500000);
  const [quickLoginLoading, setQuickLoginLoading] = useState<string | null>(null);
  const [loginFeedback, setLoginFeedback] = useState<string | null>(null);

  // Perhitungan simulasi
  const prorataTagihan = Math.round((simHariKerja / Math.max(simHariBulan, 1)) * simRate);
  const alokasiPoUtama = Math.min(prorataTagihan, simSaldoPoUtama);
  const sisaCrossPo = Math.max(0, prorataTagihan - simSaldoPoUtama);
  const sisaSaldoPoUtama = Math.max(0, simSaldoPoUtama - alokasiPoUtama);

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(val);
  };

  async function handleQuickLogin(email: string, kataSandi: string = "contoh123") {
    setQuickLoginLoading(email);
    setLoginFeedback(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, kataSandi }),
      });
      if (res.ok) {
        setLoginFeedback(`Berhasil login sebagai ${email}. Mengalihkan...`);
        window.location.href = "/dashboard";
      } else {
        const data = await res.json().catch(() => ({}));
        setLoginFeedback(data.error ?? "Gagal login. Pastikan database aktif.");
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Terjadi kesalahan";
      setLoginFeedback("Koneksi gagal: " + msg);
    } finally {
      setQuickLoginLoading(null);
    }
  }

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "var(--color-bg)", display: "flex", flexDirection: "column" }}>
      {/* Top Banner / Navigation */}
      <header style={{
        background: "linear-gradient(90deg, #b31d22 0%, #ea242a 60%, #c41e24 100%)",
        color: "#ffffff",
        padding: "14px 24px",
        boxShadow: "0 2px 10px rgba(0,0,0,0.12)",
        position: "sticky",
        top: 0,
        zIndex: 50,
      }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <Logo variant="white" height={28} />
            <div style={{ borderLeft: "1px solid rgba(255,255,255,0.3)", paddingLeft: 12 }}>
              <span style={{ fontWeight: 800, fontSize: 18, letterSpacing: "-0.01em", display: "flex", alignItems: "center", gap: 8 }}>
                🧾 Invora
                <span style={{
                  fontSize: 11,
                  background: "rgba(255,255,255,0.22)",
                  padding: "2px 8px",
                  borderRadius: 999,
                  fontWeight: 600,
                  letterSpacing: "0.04em",
                  textTransform: "uppercase"
                }}>
                  MVP 1–3 Ready
                </span>
              </span>
              <p style={{ margin: 0, fontSize: 11.5, opacity: 0.9 }}>Sistem Otomasi Invoicing & Request GR XL Smart</p>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {user ? (
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 13, background: "rgba(255,255,255,0.15)", padding: "4px 12px", borderRadius: 20 }}>
                  👤 <b>{user.nama}</b> ({user.role})
                </span>
                <a href="/dashboard" className="btn" style={{ background: "#ffffff", color: "var(--color-primary)", fontWeight: 700, padding: "7px 14px" }}>
                  Buka Dashboard &rarr;
                </a>
              </div>
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 12, opacity: 0.9 }}>Uji Coba:</span>
                <button
                  onClick={() => handleQuickLogin("petugas@contoh.local")}
                  disabled={quickLoginLoading !== null}
                  style={{
                    background: "rgba(255,255,255,0.18)",
                    border: "1px solid rgba(255,255,255,0.35)",
                    color: "white",
                    padding: "4px 10px",
                    borderRadius: 6,
                    fontSize: 12,
                    cursor: "pointer",
                    fontWeight: 600,
                  }}
                >
                  {quickLoginLoading === "petugas@contoh.local" ? "Masuk..." : "Petugas"}
                </button>
                <button
                  onClick={() => handleQuickLogin("checker@contoh.local")}
                  disabled={quickLoginLoading !== null}
                  style={{
                    background: "rgba(255,255,255,0.18)",
                    border: "1px solid rgba(255,255,255,0.35)",
                    color: "white",
                    padding: "4px 10px",
                    borderRadius: 6,
                    fontSize: 12,
                    cursor: "pointer",
                    fontWeight: 600,
                  }}
                >
                  {quickLoginLoading === "checker@contoh.local" ? "Masuk..." : "Checker"}
                </button>
                <a
                  href="/login"
                  className="btn"
                  style={{
                    background: "#ffffff",
                    color: "var(--color-primary)",
                    fontWeight: 700,
                    padding: "6px 14px",
                    fontSize: 13,
                  }}
                >
                  Login Manual
                </a>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main style={{ maxWidth: 1200, margin: "0 auto", padding: "28px 20px 60px", width: "100%", flex: 1 }}>
        {loginFeedback && (
          <div className="alert alert-info" style={{ marginBottom: 20 }}>
            {loginFeedback}
          </div>
        )}

        {dbStatus === "paused" && (
          <div className="alert alert-warning" style={{ marginBottom: 20, display: "flex", alignItems: "flex-start", gap: 12 }}>
            <span style={{ fontSize: 20 }}>⚠️</span>
            <div>
              <b>Catatan Database Supabase:</b> Proyek Supabase sedang tertidur (auto-pause) atau offline ({dbErrorMsg}).
              <div style={{ fontSize: 12.5, marginTop: 4 }}>
                Aplikasi tetap dapat dijelajahi, simulator perhitungan berjalan normal. Untuk menyimpan pengajuan baru atau data referensi, aktifkan kembali (Resume/Restore) proyek di Supabase Dashboard.
              </div>
            </div>
          </div>
        )}

        {/* Hero Section */}
        <section style={{
          background: "linear-gradient(135deg, #ffffff 0%, #fdf8f8 100%)",
          borderRadius: 14,
          border: "1px solid var(--color-border)",
          boxShadow: "0 4px 20px rgba(0,0,0,0.04)",
          padding: "36px 32px",
          marginBottom: 32,
          position: "relative",
          overflow: "hidden",
        }}>
          <div style={{
            position: "absolute",
            top: -40,
            right: -40,
            width: 220,
            height: 220,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(234,36,42,0.08) 0%, rgba(234,36,42,0) 70%)",
            pointerEvents: "none",
          }} />

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 24 }}>
            <div style={{ maxWidth: 740 }}>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "var(--color-primary-light)", padding: "4px 12px", borderRadius: 20, marginBottom: 14 }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--color-primary)" }}></span>
                <span style={{ fontSize: 12.5, fontWeight: 700, color: "var(--color-primary)" }}>
                  Tahap MVP 1 — 3 Selesai Dibangun
                </span>
              </div>
              <h1 style={{ fontSize: 30, fontWeight: 800, color: "#111827", lineHeight: 1.25, marginBottom: 12 }}>
                Sistem Otomasi Invoicing XL Smart & Alur Request GR
              </h1>
              <p style={{ fontSize: 15, color: "var(--color-text-muted)", lineHeight: 1.6, marginBottom: 24 }}>
                Platform internal IDStar Group yang menggantikan proses manual invoicing ke Customer XL. Mengintegrasikan perhitungan prorata berbasis kalender & timesheet, mekanisme alokasi <b>Cross PO</b>, verifikasi <b>Dual-Gate Approval</b> (Petugas &amp; Checker), pembuatan <b>CAC/BAST PDF 3 Halaman</b>, hingga generator &amp; penggabungan paket <b>Request GR</b>.
              </p>

              <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
                <a href="/pengajuan" className="btn btn-primary" style={{ padding: "10px 20px", fontSize: 14, fontWeight: 700 }}>
                  📋 Lihat Daftar Pengajuan
                </a>
                <a href="/pengajuan/baru" className="btn" style={{ padding: "10px 18px", fontSize: 14, fontWeight: 600, background: "#ffffff" }}>
                  ➕ Buat Pengajuan Baru
                </a>
                <a href="/summary-po" className="btn" style={{ padding: "10px 18px", fontSize: 14, fontWeight: 600, background: "#ffffff" }}>
                  📊 Summary PO & Saldo
                </a>
                <a href="/dashboard" className="btn" style={{ padding: "10px 18px", fontSize: 14, fontWeight: 600, background: "#ffffff" }}>
                  ⚙️ Menu Operasional Lengkap
                </a>
              </div>
            </div>

            {/* Quick Stats Panel */}
            <div style={{
              background: "#ffffff",
              borderRadius: 12,
              border: "1px solid var(--color-border)",
              padding: "20px 22px",
              minWidth: 280,
              boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
              display: "flex",
              flexDirection: "column",
              gap: 14,
            }}>
              <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--color-text-muted)" }}>
                Status Kesiapan Sistem
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid var(--color-border)", paddingBottom: 10 }}>
                <span style={{ fontSize: 13, fontWeight: 600 }}>MVP 1: Prorata & Dual Approval</span>
                <span className="badge badge-siap_diajukan">100% Selesai</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid var(--color-border)", paddingBottom: 10 }}>
                <span style={{ fontSize: 13, fontWeight: 600 }}>MVP 2: Cross PO Allocation</span>
                <span className="badge badge-siap_diajukan">100% Selesai</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid var(--color-border)", paddingBottom: 10 }}>
                <span style={{ fontSize: 13, fontWeight: 600 }}>MVP 2b: Summary PO & Fondasi</span>
                <span className="badge badge-siap_diajukan">100% Selesai</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: 13, fontWeight: 600 }}>MVP 3: Paket Request GR</span>
                <span className="badge badge-menunggu_checker">Hampir Selesai</span>
              </div>
            </div>
          </div>
        </section>

        {/* Phase Filter Tabs */}
        <div style={{ display: "flex", gap: 8, marginBottom: 24, borderBottom: "1px solid var(--color-border)", paddingBottom: 12, overflowX: "auto" }}>
          <button
            onClick={() => setActiveTab("all")}
            className="btn"
            style={{
              background: activeTab === "all" ? "var(--color-primary)" : "#ffffff",
              color: activeTab === "all" ? "#ffffff" : "var(--color-text)",
              borderColor: activeTab === "all" ? "var(--color-primary)" : "var(--color-border)",
              fontWeight: 600,
            }}
          >
            🌟 Semua Modul (MVP 1–3)
          </button>
          <button
            onClick={() => setActiveTab("mvp1")}
            className="btn"
            style={{
              background: activeTab === "mvp1" ? "var(--color-primary)" : "#ffffff",
              color: activeTab === "mvp1" ? "#ffffff" : "var(--color-text)",
              borderColor: activeTab === "mvp1" ? "var(--color-primary)" : "var(--color-border)",
              fontWeight: 600,
            }}
          >
            🟢 MVP 1: Prorata &amp; Approval
          </button>
          <button
            onClick={() => setActiveTab("mvp2")}
            className="btn"
            style={{
              background: activeTab === "mvp2" ? "var(--color-primary)" : "#ffffff",
              color: activeTab === "mvp2" ? "#ffffff" : "var(--color-text)",
              borderColor: activeTab === "mvp2" ? "var(--color-primary)" : "var(--color-border)",
              fontWeight: 600,
            }}
          >
            🔵 MVP 2: Cross PO
          </button>
          <button
            onClick={() => setActiveTab("mvp2b")}
            className="btn"
            style={{
              background: activeTab === "mvp2b" ? "var(--color-primary)" : "#ffffff",
              color: activeTab === "mvp2b" ? "#ffffff" : "var(--color-text)",
              borderColor: activeTab === "mvp2b" ? "var(--color-primary)" : "var(--color-border)",
              fontWeight: 600,
            }}
          >
            🟣 MVP 2b: Multi-Klien &amp; Summary
          </button>
          <button
            onClick={() => setActiveTab("mvp3")}
            className="btn"
            style={{
              background: activeTab === "mvp3" ? "var(--color-primary)" : "#ffffff",
              color: activeTab === "mvp3" ? "#ffffff" : "var(--color-text)",
              borderColor: activeTab === "mvp3" ? "var(--color-primary)" : "var(--color-border)",
              fontWeight: 600,
            }}
          >
            🟠 MVP 3: Request GR
          </button>
        </div>

        {/* Visual Workflow Map */}
        <section style={{ marginBottom: 36 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 6 }}>
            Alur Proses Bisnis End-to-End (MVP 1 s/d MVP 3)
          </h2>
          <p className="subtitle">
            Setiap pengajuan melalui 6 gerbang validasi otomatis sebelum siap dimasukkan nomor invoice dan dikirim ke Customer XL.
          </p>

          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: 14,
            marginTop: 16,
          }}>
            {/* Step 1 */}
            <div className="card" style={{
              padding: 16,
              borderTop: "4px solid #1a7f4e",
              background: activeTab === "all" || activeTab === "mvp1" || activeTab === "mvp2b" ? "#ffffff" : "rgba(255,255,255,0.6)",
            }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#1a7f4e", textTransform: "uppercase" }}>Tahap 1 &bull; MVP 1/2b</div>
              <h3 style={{ fontSize: 14, margin: "6px 0 4px" }}>Timesheet &amp; Prorata</h3>
              <p style={{ fontSize: 12, color: "var(--color-text-muted)", margin: 0, lineHeight: 1.4 }}>
                Hitung hari kerja aktual vs kalender kerja resmi. Hitung prorata rate card per personel otomatis.
              </p>
            </div>

            {/* Step 2 */}
            <div className="card" style={{
              padding: 16,
              borderTop: "4px solid #2563eb",
              background: activeTab === "all" || activeTab === "mvp2" ? "#ffffff" : "rgba(255,255,255,0.6)",
            }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#2563eb", textTransform: "uppercase" }}>Tahap 2 &bull; MVP 2</div>
              <h3 style={{ fontSize: 14, margin: "6px 0 4px" }}>Alokasi Cross PO</h3>
              <p style={{ fontSize: 12, color: "var(--color-text-muted)", margin: 0, lineHeight: 1.4 }}>
                Jika nilai tagihan melebihi saldo PO utama, kelebihan tagihan otomatis dialokasikan ke PO lanjutan berantai.
              </p>
            </div>

            {/* Step 3 */}
            <div className="card" style={{
              padding: 16,
              borderTop: "4px solid #9333ea",
              background: activeTab === "all" || activeTab === "mvp1" ? "#ffffff" : "rgba(255,255,255,0.6)",
            }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#9333ea", textTransform: "uppercase" }}>Tahap 3 &bull; MVP 1</div>
              <h3 style={{ fontSize: 14, margin: "6px 0 4px" }}>Dual-Gate Approval</h3>
              <p style={{ fontSize: 12, color: "var(--color-text-muted)", margin: 0, lineHeight: 1.4 }}>
                Konfirmasi Petugas &rarr; Review Checker. Wajib akun berbeda (ditegakkan di level server).
              </p>
            </div>

            {/* Step 4 */}
            <div className="card" style={{
              padding: 16,
              borderTop: "4px solid #ea242a",
              background: activeTab === "all" || activeTab === "mvp1" ? "#ffffff" : "rgba(255,255,255,0.6)",
            }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#ea242a", textTransform: "uppercase" }}>Tahap 4 &bull; MVP 1</div>
              <h3 style={{ fontSize: 14, margin: "6px 0 4px" }}>Dokumen CAC/BAST</h3>
              <p style={{ fontSize: 12, color: "var(--color-text-muted)", margin: 0, lineHeight: 1.4 }}>
                Generate PDF 3 halaman resmi format XL (Cover, Narasi, Rincian Personel) siap cetak dan tanda tangan.
              </p>
            </div>

            {/* Step 5 */}
            <div className="card" style={{
              padding: 16,
              borderTop: "4px solid #f2a30f",
              background: activeTab === "all" || activeTab === "mvp3" ? "#ffffff" : "rgba(255,255,255,0.6)",
            }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#f2a30f", textTransform: "uppercase" }}>Tahap 5 &bull; MVP 3</div>
              <h3 style={{ fontSize: 14, margin: "6px 0 4px" }}>Paket Request GR</h3>
              <p style={{ fontSize: 12, color: "var(--color-text-muted)", margin: 0, lineHeight: 1.4 }}>
                Generate sheet Vendor &rarr; XL mengisi COVER/SOW &rarr; Upload balikan &rarr; Penggabungan Excel otomatis.
              </p>
            </div>

            {/* Step 6 */}
            <div className="card" style={{
              padding: 16,
              borderTop: "4px solid #0d9488",
              background: activeTab === "all" || activeTab === "mvp3" ? "#ffffff" : "rgba(255,255,255,0.6)",
            }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#0d9488", textTransform: "uppercase" }}>Tahap 6 &bull; MVP 3</div>
              <h3 style={{ fontSize: 14, margin: "6px 0 4px" }}>Kunci Invoice Gate</h3>
              <p style={{ fontSize: 12, color: "var(--color-text-muted)", margin: 0, lineHeight: 1.4 }}>
                Checker wajib cek paket GR sebelum input Nomor Invoice dibuka. Mencegah invoice keluar tanpa paket GR sah.
              </p>
            </div>
          </div>
        </section>

        {/* Interactive Simulator: Prorata & Cross PO */}
        <section style={{
          background: "#ffffff",
          borderRadius: 14,
          border: "1px solid var(--color-border)",
          padding: "24px 28px",
          marginBottom: 36,
          boxShadow: "0 2px 10px rgba(0,0,0,0.03)",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, marginBottom: 16 }}>
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
                🧮 Simulator Interaktif: Hitung Prorata &amp; Cross PO
                <span className="badge badge-siap_diajukan">Fitur Inti MVP 1 &amp; 2</span>
              </h2>
              <p className="subtitle" style={{ margin: "4px 0 0" }}>
                Uji coba logika perhitungan matematika presisi yang diterapkan langsung di form pengajuan.
              </p>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 24, marginTop: 16 }}>
            {/* Input Slider / Fields */}
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div className="field">
                <label>Tarif Rate Card Bulanan (Rp)</label>
                <input
                  type="number"
                  step="500000"
                  value={simRate}
                  onChange={(e) => setSimRate(Number(e.target.value))}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div className="field">
                  <label>Hari Kerja Aktual ({simHariKerja} hari)</label>
                  <input
                    type="range"
                    min="1"
                    max={simHariBulan}
                    value={simHariKerja}
                    onChange={(e) => setSimHariKerja(Number(e.target.value))}
                  />
                </div>
                <div className="field">
                  <label>Hari Kerja Kalender ({simHariBulan} hari)</label>
                  <input
                    type="range"
                    min="18"
                    max="23"
                    value={simHariBulan}
                    onChange={(e) => setSimHariBulan(Number(e.target.value))}
                  />
                </div>
              </div>

              <div className="field">
                <label>Saldo Tersedia di PO Utama (sebelum PPN)</label>
                <input
                  type="number"
                  step="500000"
                  value={simSaldoPoUtama}
                  onChange={(e) => setSimSaldoPoUtama(Number(e.target.value))}
                />
              </div>
            </div>

            {/* Live Calculation Output Card */}
            <div style={{
              background: "var(--color-bg)",
              borderRadius: 10,
              padding: 20,
              border: "1px solid var(--color-border)",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              gap: 12,
            }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--color-text-muted)", textTransform: "uppercase" }}>
                  Hasil Analisis Pembagian Tagihan
                </div>

                <div style={{ marginTop: 12, display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <span style={{ fontSize: 13, color: "var(--color-text-muted)" }}>Total Tagihan Prorata:</span>
                  <span style={{ fontSize: 18, fontWeight: 800, color: "var(--color-text)" }}>
                    {formatRupiah(prorataTagihan)}
                  </span>
                </div>
                <div style={{ fontSize: 11, color: "var(--color-text-muted)", textAlign: "right" }}>
                  Formula: ({simHariKerja} / {simHariBulan}) &times; {formatRupiah(simRate)}
                </div>

                <div style={{ height: 1, background: "var(--color-border)", margin: "14px 0" }} />

                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                    <span>Dibebankan ke PO Utama:</span>
                    <b style={{ color: "var(--color-success)" }}>{formatRupiah(alokasiPoUtama)}</b>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                    <span>Sisa Saldo PO Utama:</span>
                    <span>{formatRupiah(sisaSaldoPoUtama)}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, background: sisaCrossPo > 0 ? "var(--color-warning-bg)" : "transparent", padding: sisaCrossPo > 0 ? "4px 8px" : "0", borderRadius: 6 }}>
                    <span style={{ fontWeight: sisaCrossPo > 0 ? 700 : 400, color: sisaCrossPo > 0 ? "var(--color-warning)" : "inherit" }}>
                      {sisaCrossPo > 0 ? "⚠️ Wajib Cross PO Lanjutan:" : "Cross PO:"}
                    </span>
                    <b style={{ color: sisaCrossPo > 0 ? "var(--color-warning)" : "var(--color-text-muted)" }}>
                      {sisaCrossPo > 0 ? formatRupiah(sisaCrossPo) : "Tidak dibutuhkan (Rp 0)"}
                    </b>
                  </div>
                </div>
              </div>

              {sisaCrossPo > 0 ? (
                <div style={{ fontSize: 12, color: "var(--color-warning)", background: "rgba(242,163,15,0.1)", padding: "8px 10px", borderRadius: 6 }}>
                  💡 <b>MVP 2 Cross PO Aktif:</b> Petugas akan memilih PO penerus dari dropdown untuk menampung sisa {formatRupiah(sisaCrossPo)}.
                </div>
              ) : (
                <div style={{ fontSize: 12, color: "var(--color-success)", background: "rgba(26,127,78,0.1)", padding: "8px 10px", borderRadius: 6 }}>
                  ✅ Saldo PO Utama mencukupi seluruh nilai prorata tagihan.
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Feature Cards Grid (Grouped by MVP Phase) */}
        <section style={{ marginBottom: 36 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 6 }}>
            Katalog Modul &amp; Fitur Aplikasi
          </h2>
          <p className="subtitle">
            Akses langsung ke seluruh halaman dan endpoint fungsional yang sudah dibangun.
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(270px, 1fr))", gap: 16 }}>
            {/* Card 1: Pengajuan */}
            {(activeTab === "all" || activeTab === "mvp1") && (
              <div className="card" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <span className="badge badge-diajukan">MVP 1 &bull; Invoicing</span>
                    <span style={{ fontSize: 11, color: "var(--color-text-muted)" }}>Petugas &amp; Checker</span>
                  </div>
                  <h3 style={{ fontSize: 16, marginBottom: 6 }}>Daftar Pengajuan Invoicing</h3>
                  <p style={{ fontSize: 13, color: "var(--color-text-muted)", lineHeight: 1.5 }}>
                    Melihat seluruh status pengajuan (Draft, Menunggu Checker, Perlu Revisi, Siap Diajukan). Dilengkapi filter role &amp; peringatan perhatian checker.
                  </p>
                </div>
                <div style={{ marginTop: 16, display: "flex", gap: 8 }}>
                  <a href="/pengajuan" className="btn btn-primary" style={{ flex: 1, justifyContent: "center" }}>
                    Buka Pengajuan &rarr;
                  </a>
                  <a href="/pengajuan/baru" className="btn" style={{ padding: "8px 12px" }} title="Buat Baru">
                    + Baru
                  </a>
                </div>
              </div>
            )}

            {/* Card 2: CAC/BAST Cetak PDF */}
            {(activeTab === "all" || activeTab === "mvp1") && (
              <div className="card" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <span className="badge badge-diajukan">MVP 1 &bull; Dokumen</span>
                    <span style={{ fontSize: 11, color: "var(--color-text-muted)" }}>PDF Engine</span>
                  </div>
                  <h3 style={{ fontSize: 16, marginBottom: 6 }}>CAC &amp; BAST PDF 3 Halaman</h3>
                  <p style={{ fontSize: 13, color: "var(--color-text-muted)", lineHeight: 1.5 }}>
                    Format resmi dokumen penagihan XL Smart: Halaman 1 (Cover Lembar Persetujuan), Halaman 2 (Narasi Deskripsi Pekerjaan), Halaman 3 (Rincian Personel &amp; Prorata).
                  </p>
                </div>
                <div style={{ marginTop: 16 }}>
                  <a href="/pengajuan" className="btn" style={{ width: "100%", justifyContent: "center" }}>
                    Generate via Detail Pengajuan &rarr;
                  </a>
                </div>
              </div>
            )}

            {/* Card 3: Summary PO */}
            {(activeTab === "all" || activeTab === "mvp2b") && (
              <div className="card" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <span className="badge badge-siap_diajukan">MVP 2b &bull; Finansial</span>
                    <span style={{ fontSize: 11, color: "var(--color-text-muted)" }}>Dashboard</span>
                  </div>
                  <h3 style={{ fontSize: 16, marginBottom: 6 }}>Summary PO &amp; Sisa Saldo</h3>
                  <p style={{ fontSize: 13, color: "var(--color-text-muted)", lineHeight: 1.5 }}>
                    Ringkasan total nilai PO, nilai GR yang sudah terealisasi, dan sisa saldo sebelum PPN. Dilengkapi filter tahun dan deteksi otomatis klien XL vs Non-XL.
                  </p>
                </div>
                <div style={{ marginTop: 16 }}>
                  <a href="/summary-po" className="btn btn-primary" style={{ width: "100%", justifyContent: "center" }}>
                    Buka Summary PO &rarr;
                  </a>
                </div>
              </div>
            )}

            {/* Card 4: Analisa Durasi */}
            {(activeTab === "all" || activeTab === "mvp2b") && (
              <div className="card" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <span className="badge badge-siap_diajukan">MVP 2b &bull; Metrik</span>
                    <span style={{ fontSize: 11, color: "var(--color-text-muted)" }}>SLA Tracking</span>
                  </div>
                  <h3 style={{ fontSize: 16, marginBottom: 6 }}>Analisa Durasi Siklus Invoicing</h3>
                  <p style={{ fontSize: 13, color: "var(--color-text-muted)", lineHeight: 1.5 }}>
                    Menghitung rata-rata hari proses dari penyerahan CAC sampai invoice disetujui, dikelompokkan per User XL (PIC Approval) untuk monitoring SLA pembayaran.
                  </p>
                </div>
                <div style={{ marginTop: 16 }}>
                  <a href="/dashboard/analisa-durasi" className="btn" style={{ width: "100%", justifyContent: "center" }}>
                    Lihat Analisa Durasi &rarr;
                  </a>
                </div>
              </div>
            )}

            {/* Card 5: Paket Request GR */}
            {(activeTab === "all" || activeTab === "mvp3") && (
              <div className="card" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <span className="badge badge-menunggu_checker">MVP 3 &bull; Integrasi XL</span>
                    <span style={{ fontSize: 11, color: "var(--color-text-muted)" }}>Excel Engine</span>
                  </div>
                  <h3 style={{ fontSize: 16, marginBottom: 6 }}>Paket Request GR (Excel Sync)</h3>
                  <p style={{ fontSize: 13, color: "var(--color-text-muted)", lineHeight: 1.5 }}>
                    Otomasi generate sheet Vendor, alur bolak-balik isi COVER/SOW oleh XL, penggabungan otomatis file balikan, dan verifikasi wajib Checker sebelum kunci invoice dibuka.
                  </p>
                </div>
                <div style={{ marginTop: 16 }}>
                  <a href="/pengajuan" className="btn" style={{ width: "100%", justifyContent: "center" }}>
                    Kelola di Detail Pengajuan &rarr;
                  </a>
                </div>
              </div>
            )}

            {/* Card 6: Data Referensi */}
            {(activeTab === "all" || activeTab === "mvp2b") && (
              <div className="card" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <span className="badge badge-draft">MVP 2b &bull; Master Data</span>
                    <span style={{ fontSize: 11, color: "var(--color-text-muted)" }}>Petugas Data</span>
                  </div>
                  <h3 style={{ fontSize: 16, marginBottom: 6 }}>Master Data &amp; Multi-Klien</h3>
                  <p style={{ fontSize: 13, color: "var(--color-text-muted)", lineHeight: 1.5 }}>
                    Pengelolaan Personel, Penempatan, Rate Card, PO, User XL, Pemetaan Personel-PO, dan Kalender Kerja. Dilengkapi fitur Impor Massal Integral.
                  </p>
                </div>
                <div style={{ marginTop: 16, display: "flex", gap: 6, flexWrap: "wrap" }}>
                  <a href="/data-referensi/personel" className="btn" style={{ flex: 1, fontSize: 12, justifyContent: "center" }}>Personel</a>
                  <a href="/data-referensi/po" className="btn" style={{ flex: 1, fontSize: 12, justifyContent: "center" }}>PO</a>
                  <a href="/data-referensi/rate-card" className="btn" style={{ flex: 1, fontSize: 12, justifyContent: "center" }}>Rate Card</a>
                </div>
              </div>
            )}

            {/* Card 7: Kelola Data & Rekon Invoice */}
            {(activeTab === "all" || activeTab === "mvp2b") && (
              <div className="card" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <span className="badge badge-draft">MVP 2b &bull; Operasional</span>
                    <span style={{ fontSize: 11, color: "var(--color-text-muted)" }}>Admin &amp; Petugas</span>
                  </div>
                  <h3 style={{ fontSize: 16, marginBottom: 6 }}>Kelola Data &amp; Download Rekon</h3>
                  <p style={{ fontSize: 13, color: "var(--color-text-muted)", lineHeight: 1.5 }}>
                    Download file Rekon Invoice format XLSX untuk sinkronisasi akuntansi. Fasilitas reset data uji massal atau penghapusan terpilih (checkbox).
                  </p>
                </div>
                <div style={{ marginTop: 16, display: "flex", gap: 8 }}>
                  <a href="/api/rekon-invoice" className="btn" style={{ flex: 1, justifyContent: "center", fontSize: 12 }}>
                    ⬇ Unduh Rekon (.xlsx)
                  </a>
                  <a href="/kelola-data" className="btn" style={{ flex: 1, justifyContent: "center", fontSize: 12 }}>
                    Kelola Data &rarr;
                  </a>
                </div>
              </div>
            )}

            {/* Card 8: Akun & Hak Akses */}
            {(activeTab === "all" || activeTab === "mvp1") && (
              <div className="card" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <span className="badge badge-draft">MVP 1 &bull; Keamanan</span>
                    <span style={{ fontSize: 11, color: "var(--color-text-muted)" }}>Administrator</span>
                  </div>
                  <h3 style={{ fontSize: 16, marginBottom: 6 }}>Manajemen Akun &amp; 3 Peran</h3>
                  <p style={{ fontSize: 13, color: "var(--color-text-muted)", lineHeight: 1.5 }}>
                    Manajemen pengguna sistem: Administrator, Petugas Input Data, dan Checker. Dilengkapi audit log pencatatan jejak transaksi di database.
                  </p>
                </div>
                <div style={{ marginTop: 16 }}>
                  <a href="/admin/akun" className="btn" style={{ width: "100%", justifyContent: "center" }}>
                    Buka Akun &amp; Akses &rarr;
                  </a>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Demo Roles & Test Credentials Section */}
        <section style={{
          background: "linear-gradient(135deg, #1c2733 0%, #0f172a 100%)",
          color: "#ffffff",
          borderRadius: 14,
          padding: "28px 30px",
          marginBottom: 36,
          boxShadow: "0 4px 14px rgba(0,0,0,0.15)",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16, marginBottom: 20 }}>
            <div>
              <h2 style={{ fontSize: 19, fontWeight: 700, margin: "0 0 6px 0", color: "#ffffff" }}>
                🔑 Akun Uji Coba Multi-Role (Untuk Validasi Dual-Gate)
              </h2>
              <p style={{ margin: 0, fontSize: 13.5, color: "#94a3b8" }}>
                Karena MVP 1 mewajibkan Petugas dan Checker adalah dua orang berbeda, gunakan tombol instan di bawah untuk berpindah peran saat menguji alur.
              </p>
            </div>
            <a
              href="/login"
              style={{
                color: "#f2a30f",
                fontSize: 13,
                fontWeight: 600,
                textDecoration: "underline",
              }}
            >
              Buka Halaman Login Formal &rarr;
            </a>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16 }}>
            {/* Role 1 */}
            <div style={{ background: "rgba(255,255,255,0.06)", borderRadius: 10, padding: 18, border: "1px solid rgba(255,255,255,0.1)" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: "#ffffff" }}>👨‍💼 Petugas Input Data</span>
                <span style={{ fontSize: 11, background: "rgba(234,36,42,0.25)", color: "#ff8589", padding: "2px 8px", borderRadius: 4, fontWeight: 600 }}>
                  Role: petugas
                </span>
              </div>
              <div style={{ fontSize: 12, color: "#94a3b8", lineHeight: 1.4, marginBottom: 12 }}>
                Membuat pengajuan, input prorata, alokasi Cross PO, konfirmasi draf, dan generate template GR Request.
              </div>
              <div style={{ fontSize: 12, color: "#cbd5e1", marginBottom: 14 }}>
                Email: <code style={{ color: "#f2a30f" }}>petugas@contoh.local</code><br />
                Sandi: <code style={{ color: "#f2a30f" }}>contoh123</code>
              </div>
              <button
                onClick={() => handleQuickLogin("petugas@contoh.local")}
                disabled={quickLoginLoading !== null}
                className="btn btn-primary"
                style={{ width: "100%", justifyContent: "center", fontSize: 13 }}
              >
                {quickLoginLoading === "petugas@contoh.local" ? "Masuk..." : "Masuk Sebagai Petugas"}
              </button>
            </div>

            {/* Role 2 */}
            <div style={{ background: "rgba(255,255,255,0.06)", borderRadius: 10, padding: 18, border: "1px solid rgba(255,255,255,0.1)" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: "#ffffff" }}>🕵️ Checker (Pemeriksa)</span>
                <span style={{ fontSize: 11, background: "rgba(37,99,235,0.25)", color: "#93c5fd", padding: "2px 8px", borderRadius: 4, fontWeight: 600 }}>
                  Role: checker
                </span>
              </div>
              <div style={{ fontSize: 12, color: "#94a3b8", lineHeight: 1.4, marginBottom: 12 }}>
                Memeriksa pengajuan (harus orang berbeda dari pembuat), setujui/tolak, dan memvalidasi paket Request GR.
              </div>
              <div style={{ fontSize: 12, color: "#cbd5e1", marginBottom: 14 }}>
                Email: <code style={{ color: "#f2a30f" }}>checker@contoh.local</code><br />
                Sandi: <code style={{ color: "#f2a30f" }}>contoh123</code>
              </div>
              <button
                onClick={() => handleQuickLogin("checker@contoh.local")}
                disabled={quickLoginLoading !== null}
                className="btn"
                style={{ width: "100%", justifyContent: "center", fontSize: 13, background: "#2563eb", color: "#ffffff", borderColor: "#2563eb" }}
              >
                {quickLoginLoading === "checker@contoh.local" ? "Masuk..." : "Masuk Sebagai Checker"}
              </button>
            </div>

            {/* Role 3 */}
            <div style={{ background: "rgba(255,255,255,0.06)", borderRadius: 10, padding: 18, border: "1px solid rgba(255,255,255,0.1)" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: "#ffffff" }}>🛡️ Administrator</span>
                <span style={{ fontSize: 11, background: "rgba(147,51,234,0.25)", color: "#d8b4fe", padding: "2px 8px", borderRadius: 4, fontWeight: 600 }}>
                  Role: admin
                </span>
              </div>
              <div style={{ fontSize: 12, color: "#94a3b8", lineHeight: 1.4, marginBottom: 12 }}>
                Mengelola akun &amp; hak akses, mengatur hari libur di kalender kerja, dan pembersihan data uji.
              </div>
              <div style={{ fontSize: 12, color: "#cbd5e1", marginBottom: 14 }}>
                Email: <code style={{ color: "#f2a30f" }}>admin@contoh.local</code><br />
                Sandi: <code style={{ color: "#f2a30f" }}>contoh123</code>
              </div>
              <button
                onClick={() => handleQuickLogin("admin@contoh.local")}
                disabled={quickLoginLoading !== null}
                className="btn"
                style={{ width: "100%", justifyContent: "center", fontSize: 13, background: "#ffffff", color: "#0f172a" }}
              >
                {quickLoginLoading === "admin@contoh.local" ? "Masuk..." : "Masuk Sebagai Admin"}
              </button>
            </div>
          </div>
        </section>

        {/* Technical Roadmap Matrix (Direct from summary-mvp-1-3.md) */}
        <section style={{
          background: "#ffffff",
          borderRadius: 14,
          border: "1px solid var(--color-border)",
          padding: "24px 28px",
        }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>
            Matriks Status Implementasi MVP 1–3
          </h2>
          <p className="subtitle" style={{ marginBottom: 16 }}>
            Sumber dokumentasi resmi: <code>summary-mvp-1-3.md</code> &middot; IDStar Financial &amp; Invoicing Team
          </p>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th style={{ width: "15%" }}>Tahap</th>
                  <th style={{ width: "50%" }}>Cakupan Fungsionalitas</th>
                  <th style={{ width: "15%" }}>Status</th>
                  <th style={{ width: "20%" }}>Keterangan / Sisa</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><b>MVP 1</b></td>
                  <td>
                    Hitung prorata hari &rarr; konfirmasi Petugas &rarr; Review Checker (beda orang) &rarr; Dokumen CAC/BAST PDF 3 halaman resmi; login 3 role, jejak audit log.
                  </td>
                  <td><span className="badge badge-siap_diajukan">Selesai</span></td>
                  <td style={{ fontSize: 12.5, color: "var(--color-text-muted)" }}>Seluruh alur dan PDF engine telah teruji.</td>
                </tr>
                <tr>
                  <td><b>MVP 2</b></td>
                  <td>
                    Cross PO: kelebihan nilai tagihan dilanjutkan otomatis ke PO berikutnya (dipilih manual oleh Petugas, berantai &gt;2 PO); tracking persetujuan User XL.
                  </td>
                  <td><span className="badge badge-siap_diajukan">Selesai</span></td>
                  <td style={{ fontSize: 12.5, color: "var(--color-text-muted)" }}>Dukungan form tagihan tahap (milestone).</td>
                </tr>
                <tr>
                  <td><b>MVP 2b</b></td>
                  <td>
                    Summary PO (nilai PO, GR, saldo per tahun), timesheet dasar hari kerja, Akun &amp; Akses, impor massal Integral multi-klien, Kelola Data, Rekon Invoice Excel.
                  </td>
                  <td><span className="badge badge-siap_diajukan">Selesai</span></td>
                  <td style={{ fontSize: 12.5, color: "var(--color-text-muted)" }}>Fitur multi-klien &amp; rekon invoice telah aktif.</td>
                </tr>
                <tr>
                  <td><b>MVP 3</b></td>
                  <td>
                    Paket Request GR: generate sheet Vendor, alur bolak-balik XL isi SOW/COVER, unggah balikan &amp; gabung otomatis; Gatekeeper Checker wajib cek sebelum input No Invoice.
                  </td>
                  <td><span className="badge badge-menunggu_checker">Hampir Selesai</span></td>
                  <td style={{ fontSize: 12.5, color: "var(--color-text-muted)" }}>Penghubung tanggalSubmitCac ke alur GR Request.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}
