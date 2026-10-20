"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

const LABEL: Record<string, string> = {
  tanggalCacApproved: "Tanggal CAC Approved (Get Approve)",
  tanggalRequestGr: "Tanggal Request GR (submit di Get Approve)",
  tanggalGrDisetujui: "Tanggal GR Approved",
  tanggalSubmitInvoice: "Tanggal Submit Invoice (COUPA)",
  tanggalApproveInvoice: "Tanggal Approve Invoice (COUPA)",
};

const URUTAN = ["tanggalCacApproved", "tanggalRequestGr", "tanggalGrDisetujui", "tanggalSubmitInvoice", "tanggalApproveInvoice"] as const;

export default function FormStatusProses({
  pengajuanId, nilaiAwal, nomorInvoiceAwal, grRequestSudahDicek, isKlienXl = true, bastAda = true,
}: {
  pengajuanId: number;
  nilaiAwal: Record<(typeof URUTAN)[number], string | null>;
  nomorInvoiceAwal: string | null;
  grRequestSudahDicek: boolean;
  isKlienXl?: boolean;
  bastAda?: boolean;
}) {
  const router = useRouter();
  const [nilai, setNilai] = useState(nilaiAwal);
  const [nomorInvoice, setNomorInvoice] = useState(nomorInvoiceAwal ?? "");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sukses, setSukses] = useState(false);

  const terkunciNomorInvoice = isKlienXl && !grRequestSudahDicek && !nomorInvoiceAwal;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null); setSukses(false); setLoading(true);
    const res = await fetch(`/api/pengajuan/${pengajuanId}/status-proses`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...nilai, nomorInvoice }),
    });
    setLoading(false);
    if (!res.ok) { const d = await res.json().catch(() => ({})); setError(d.error ?? "Gagal menyimpan."); return; }
    setSukses(true);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12, marginTop: 12 }}>
      {!bastAda && (
        <div className="alert alert-warning" style={{ gridColumn: "1 / -1", margin: 0, padding: "8px 12px", fontSize: 13 }}>
          ⚠️ <b>Peringatan BAST:</b> Dokumen BAST belum dibuat untuk pengajuan ini. Pastikan BAST sudah disiapkan sebelum submit invoice ke klien.
        </div>
      )}
      <div className="field">
        <label>Nomor Invoice</label>
        <input
          type="text"
          placeholder="cth 798/INV-IDS/IX/2026"
          value={nomorInvoice}
          onChange={(e) => setNomorInvoice(e.target.value)}
          disabled={terkunciNomorInvoice}
        />
        <p className="subtitle" style={{ margin: "4px 0 0", fontSize: 11.5 }}>
          {!isKlienXl
            ? "Input manual — nomor invoice satu urutan bersama semua customer, bukan digenerate aplikasi ini."
            : (grRequestSudahDicek || nomorInvoiceAwal
              ? "Input manual — nomor invoice satu urutan bersama semua customer, bukan digenerate aplikasi ini."
              : "Terkunci — GR Request pengajuan ini belum dikonfirmasi 'sudah dicek' oleh Checker (lihat kartu GR Request di bawah).")}
        </p>
      </div>
      {URUTAN.map((field) => (
        <div className="field" key={field}>
          <label>{LABEL[field]}</label>
          <input
            type="date"
            value={nilai[field] ?? ""}
            onChange={(e) => setNilai((n) => ({ ...n, [field]: e.target.value || null }))}
          />
        </div>
      ))}
      <div style={{ display: "flex", alignItems: "flex-end", gap: 10 }}>
        <button type="submit" disabled={loading} className="btn btn-primary">{loading ? "Menyimpan..." : "Simpan"}</button>
        {sukses && <span style={{ color: "var(--color-success)", fontSize: 13 }}>✓ Tersimpan</span>}
      </div>
      {error && <div className="alert alert-danger" style={{ gridColumn: "1 / -1", margin: 0 }}>{error}</div>}
    </form>
  );
}
