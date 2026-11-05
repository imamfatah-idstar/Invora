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
    if (!res.ok) { const d = await res.json().catch(() => ({})); setError(d.error ?? "Failed to add account."); return; }
    setNama(""); setEmail(""); setKataSandi(""); setRole("petugas");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="toolbar">
      <div className="field"><label>Full Name</label><input value={nama} onChange={(e) => setNama(e.target.value)} required /></div>
      <div className="field" style={{ minWidth: 240 }}>
        <label>Email Address</label>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@idstar.group" pattern=".+@idstar\.group" title="Email must use @idstar.group domain" required />
      </div>
      <div className="field">
        <label>Role</label>
        <select value={role} onChange={(e) => setRole(e.target.value)}>
          <option value="petugas">Data Entry</option>
          <option value="checker">Checker</option>
          <option value="admin">Administrator</option>
        </select>
      </div>
      <div className="field"><label>Initial Password</label><input type="text" value={kataSandi} onChange={(e) => setKataSandi(e.target.value)} placeholder="min. 8 characters" required /></div>
      <button type="submit" disabled={loading} className="btn btn-primary">{loading ? "Saving..." : "Register Account"}</button>
      {error && <div className="alert alert-danger" style={{ margin: 0 }}>{error}</div>}
    </form>
  );
}
