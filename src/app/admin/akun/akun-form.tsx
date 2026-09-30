"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function FormTambahAkun() {
  const router = useRouter();
  const [nama, setNama] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("petugas");
  const [kataSandi, setKataSandi] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null); setLoading(true);
    const res = await fetch("/api/akun", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nama, email, role, kataSandi }),
    });
    setLoading(false);
    if (!res.ok) { const d = await res.json().catch(() => ({})); setError(d.error ?? "Gagal menambah akun."); return; }
    setNama(""); setEmail(""); setKataSandi(""); setRole("petugas");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="toolbar">
      <div className="field"><label>Nama</label><input value={nama} onChange={(e) => setNama(e.target.value)} required /></div>
      <div className="field" style={{ minWidth: 240 }}>
        <label>Email</label>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nama@idstar.group" pattern=".+@idstar\.group" title="Email harus memakai domain @idstar.group" required />
      </div>
      <div className="field">
        <label>Peran</label>
        <select value={role} onChange={(e) => setRole(e.target.value)}>
          <option value="petugas">Input Data</option>
          <option value="checker">Checker</option>
          <option value="admin">Admin</option>
        </select>
      </div>
      <div className="field"><label>Kata sandi awal</label><input type="text" value={kataSandi} onChange={(e) => setKataSandi(e.target.value)} placeholder="min. 8 karakter" required /></div>
      <button type="submit" disabled={loading} className="btn btn-primary">{loading ? "Menyimpan..." : "Daftarkan Akun"}</button>
      {error && <div className="alert alert-danger" style={{ margin: 0 }}>{error}</div>}
    </form>
  );
}
