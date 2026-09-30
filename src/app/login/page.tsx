"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Logo from "@/components/logo";
import LoginBackground from "@/components/login-background";

export default function HalamanLogin() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [kataSandi, setKataSandi] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, kataSandi }),
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Gagal login.");
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <main style={{ minHeight: "100vh", display: "flex" }}>
      {/* Panel kiri ~20% lebar layar, warna merah brand — permintaan pengguna.
          Alamat kantor IDStar ditampilkan di kiri bawah, 2 baris, putih supaya
          kontras dengan panel merah (permintaan pengguna). */}
      <aside style={{
        width: "20%", minWidth: 160, background: "var(--color-primary)",
        display: "flex", flexDirection: "column", justifyContent: "space-between",
        alignItems: "flex-start", padding: 24, flexShrink: 0,
      }}>
        <Logo height={26} variant="white" />
        <div style={{ color: "rgba(255,255,255,0.85)", fontSize: 11, lineHeight: 1.5 }}>
          <div>The Bellagio Mansion, Jl. Mega Kuningan Timur II No. Kav. E6-1, Ground floor, RT.5/RW.2</div>
          <div>Kuningan, Kuningan Tim., Kecamatan Setiabudi, Kota Jakarta Selatan, DKI Jakarta 12950</div>
        </div>
      </aside>

      <div style={{ position: "relative", flex: 1, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
        <LoginBackground />
        <div className="card" style={{ width: 360, position: "relative", zIndex: 1 }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, marginBottom: 20 }}>
          <Logo height={44} variant="color" />
          <div style={{ textAlign: "center" }}>
            <h1 style={{ fontSize: 18 }}>🧾 Invora</h1>
            <p className="subtitle" style={{ marginBottom: 0 }}>IDStar Group &middot; Tahap Pengembangan</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div className="field">
            <label>Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="field">
            <label>Kata sandi</label>
            <input type="password" value={kataSandi} onChange={(e) => setKataSandi(e.target.value)} required />
          </div>
          {error && <div className="alert alert-danger">{error}</div>}
          <button type="submit" disabled={loading} className="btn btn-primary" style={{ justifyContent: "center", padding: 11 }}>
            {loading ? "Memproses..." : "Masuk"}
          </button>
        </form>
        </div>
      </div>
    </main>
  );
}
