"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function FormEditPersonel({
  id,
  nikAwal = "",
  namaAwal,
  posisiAwal = "",
  tipeAwal = "",
  penempatanAwal = "",
  nomorSpkAwal = "",
  statusAwal,
}: {
  id: number;
  nikAwal?: string;
  namaAwal: string;
  posisiAwal?: string;
  tipeAwal?: string;
  penempatanAwal?: string;
  nomorSpkAwal?: string;
  statusAwal: string;
}) {
  const router = useRouter();
  const [nik, setNik] = useState(nikAwal);
  const [nama, setNama] = useState(namaAwal);
  const [posisi, setPosisi] = useState(posisiAwal);
  const [tipe, setTipe] = useState(tipeAwal);
  const [penempatan, setPenempatan] = useState(penempatanAwal);
  const [nomorSpk, setNomorSpk] = useState(nomorSpkAwal);
  const [status, setStatus] = useState(statusAwal);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await fetch(`/api/personel/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nik, nama, posisi, tipe, penempatan, nomorSpk, status }),
    });
    setLoading(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? "Gagal menyimpan.");
      return;
    }
    router.push("/data-referensi/personel");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="card" style={{ maxWidth: 440, display: "flex", flexDirection: "column", gap: 14 }}>
      <div className="field">
        <label>NIK</label>
        <input value={nik} onChange={(e) => setNik(e.target.value)} placeholder="Contoh: 00001" />
      </div>
      <div className="field">
        <label>Nama</label>
        <input value={nama} onChange={(e) => setNama(e.target.value)} required />
      </div>
      <div className="field">
        <label>Position / Role</label>
        <input value={posisi} onChange={(e) => setPosisi(e.target.value)} placeholder="Contoh: Java Developer" />
      </div>
      <div className="field">
        <label>Type</label>
        <input value={tipe} onChange={(e) => setTipe(e.target.value)} placeholder="Contoh: PS_IDSTAR" />
      </div>
      <div className="field">
        <label>Placement</label>
        <input value={penempatan} onChange={(e) => setPenempatan(e.target.value)} placeholder="Contoh: Bank Digital BCA - Plaza Mutiara" />
      </div>
      <div className="field">
        <label>SPK Number</label>
        <input value={nomorSpk} onChange={(e) => setNomorSpk(e.target.value)} placeholder="Contoh: 887/SPK 3 - IDS/XII/2025" />
      </div>
      <div className="field">
        <label>Status</label>
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="aktif">aktif</option>
          <option value="nonaktif">nonaktif</option>
        </select>
      </div>
      {error && <div className="alert alert-danger">{error}</div>}
      <button type="submit" disabled={loading} className="btn btn-primary">{loading ? "Menyimpan..." : "Simpan"}</button>
    </form>
  );
}
