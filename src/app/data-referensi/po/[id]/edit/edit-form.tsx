"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function FormEditPo({
  id, nomorPo, namaProyekAwal, saldoAwal, tahunAwal, nilaiGrAwal, tanggalPoAwal,
}: {
  id: number; nomorPo: string; namaProyekAwal: string; saldoAwal: string; tahunAwal: number; nilaiGrAwal: string; tanggalPoAwal: string | null;
}) {
  const router = useRouter();
  const [namaProyek, setNamaProyek] = useState(namaProyekAwal);
  const [saldo, setSaldo] = useState(saldoAwal);
  const [tahun, setTahun] = useState(String(tahunAwal));
  const [nilaiGr, setNilaiGr] = useState(nilaiGrAwal);
  const [tanggalPo, setTanggalPo] = useState(tanggalPoAwal ?? "");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null); setLoading(true);
    const res = await fetch(`/api/po/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ namaProyek, saldoSebelumPpn: saldo, tahun: Number(tahun), nilaiGr, tanggalPo: tanggalPo || null }),
    });
    setLoading(false);
    if (!res.ok) { const d = await res.json().catch(() => ({})); setError(d.error ?? "Gagal menyimpan."); return; }
    router.push("/data-referensi/po");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="card" style={{ maxWidth: 360, display: "flex", flexDirection: "column", gap: 14 }}>
      <p className="subtitle" style={{ margin: 0 }}>Nomor PO: <b>{nomorPo}</b> (tidak bisa diubah)</p>
      <div className="field"><label>Nama proyek</label><input value={namaProyek} onChange={(e) => setNamaProyek(e.target.value)} required /></div>
      <div className="field"><label>Tahun PO</label><input type="number" value={tahun} onChange={(e) => setTahun(e.target.value)} required /></div>
      <div className="field"><label>Saldo sebelum PPN</label><input value={saldo} onChange={(e) => setSaldo(e.target.value)} required /></div>
      <div className="field"><label>Tanggal PO (opsional)</label><input type="date" value={tanggalPo} onChange={(e) => setTanggalPo(e.target.value)} /></div>
      <div className="field">
        <label>Nilai sudah di-GR (kumulatif)</label>
        <input value={nilaiGr} onChange={(e) => setNilaiGr(e.target.value)} required />
        <p className="subtitle" style={{ margin: "4px 0 0", fontSize: 12 }}>Diisi manual setelah GR disetujui di Get Approve CAC/COUPA. Dipakai di halaman Summary PO (saldo = nilai item − nilai GR).</p>
      </div>
      {error && <div className="alert alert-danger">{error}</div>}
      <button type="submit" disabled={loading} className="btn btn-primary">{loading ? "Menyimpan..." : "Simpan"}</button>
    </form>
  );
}
