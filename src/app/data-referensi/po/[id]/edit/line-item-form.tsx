"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

type BarisLine = { id: number; nomorLine: number; shortText: string; qty: number; hargaSatuan: string };

function formatRupiah(nilai: string) {
  return "Rp" + Number(nilai).toLocaleString("id-ID", { minimumFractionDigits: 2 });
}

export default function FormPoLineItem({ poId, daftarAwal }: { poId: number; daftarAwal: BarisLine[] }) {
  const router = useRouter();
  const [nomorLine, setNomorLine] = useState(String(daftarAwal.length + 1));
  const [shortText, setShortText] = useState("");
  const [qty, setQty] = useState("");
  const [hargaSatuan, setHargaSatuan] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function tambah(e: React.FormEvent) {
    e.preventDefault();
    setError(null); setLoading(true);
    const res = await fetch(`/api/po/${poId}/line-item`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nomorLine: Number(nomorLine), shortText, qty: Number(qty), hargaSatuan }),
    });
    setLoading(false);
    if (!res.ok) { const d = await res.json().catch(() => ({})); setError(d.error ?? "Gagal menambah."); return; }
    setShortText(""); setQty(""); setHargaSatuan("");
    setNomorLine(String(daftarAwal.length + 2));
    router.refresh();
  }

  async function hapus(id: number) {
    if (!window.confirm("Hapus PO line item ini?")) return;
    const res = await fetch(`/api/po/${poId}/line-item/${id}`, { method: "DELETE" });
    if (!res.ok) { const d = await res.json().catch(() => ({})); alert(d.error ?? "Gagal menghapus."); return; }
    router.refresh();
  }

  return (
    <div className="card" style={{ minWidth: 420 }}>
      <p className="subtitle" style={{ margin: "0 0 10px" }}>
        PO Line Item — baris per role/jenis layanan di PO ini. Dipakai untuk isi form GR Request otomatis (kolom PO Line, Short Text, Qty, Price PO).
      </p>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Line</th><th>Short Text</th><th>Qty</th><th>Price PO</th><th>PO Value</th><th></th></tr></thead>
          <tbody>
            {daftarAwal.map((l) => (
              <tr key={l.id}>
                <td>{l.nomorLine}</td>
                <td>{l.shortText}</td>
                <td>{l.qty}</td>
                <td>{formatRupiah(l.hargaSatuan)}</td>
                <td>{formatRupiah(String(Number(l.hargaSatuan) * l.qty))}</td>
                <td><button type="button" className="btn-danger-text" onClick={() => hapus(l.id)}>Hapus</button></td>
              </tr>
            ))}
            {daftarAwal.length === 0 && <tr><td colSpan={6} className="table-empty">Belum ada line item.</td></tr>}
          </tbody>
        </table>
      </div>
      <form onSubmit={tambah} className="toolbar" style={{ marginTop: 10 }}>
        <div className="field" style={{ maxWidth: 80 }}><label>Line</label><input type="number" min={1} value={nomorLine} onChange={(e) => setNomorLine(e.target.value)} required /></div>
        <div className="field" style={{ minWidth: 200 }}><label>Short Text</label><input value={shortText} onChange={(e) => setShortText(e.target.value)} placeholder="cth: SVC | FrontEnd / Web FullStack" required /></div>
        <div className="field" style={{ maxWidth: 100 }}><label>Qty</label><input type="number" min={1} value={qty} onChange={(e) => setQty(e.target.value)} required /></div>
        <div className="field" style={{ maxWidth: 160 }}><label>Price PO</label><input value={hargaSatuan} onChange={(e) => setHargaSatuan(e.target.value)} placeholder="cth 29500000" required /></div>
        <button type="submit" disabled={loading} className="btn btn-primary">{loading ? "Menyimpan..." : "Tambah Line"}</button>
      </form>
      {error && <div className="alert alert-danger" style={{ marginTop: 8 }}>{error}</div>}
    </div>
  );
}
