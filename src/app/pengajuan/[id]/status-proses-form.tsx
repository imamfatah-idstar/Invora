"use client";
import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Decimal from "decimal.js";
import { evaluasiSelisihGr, hitungTotalInvoice } from "@/lib/deficiency-gr";

const LABEL: Record<string, string> = {
  tanggalCacApproved: "Tanggal CAC Approved (Get Approve)",
  tanggalRequestGr: "Tanggal Request GR (submit di Get Approve)",
  tanggalGrDisetujui: "Tanggal GR Approved",
  tanggalSubmitInvoice: "Tanggal Submit Invoice (COUPA)",
  tanggalApproveInvoice: "Tanggal Approve Invoice (COUPA)",
};

const URUTAN = ["tanggalCacApproved", "tanggalRequestGr", "tanggalGrDisetujui", "tanggalSubmitInvoice", "tanggalApproveInvoice"] as const;

export default function FormStatusProses({
  pengajuanId,
  totalPengajuan,
  nilaiAwal,
  nomorInvoiceAwal,
  nomorGrSlipAwal,
  nilaiGrDisetujuiAwal,
  nomorFakturPajakAwal,
  tanggalFakturPajakAwal,
  tarifPpnAwal,
  grRequestSudahDicek,
  isKlienXl = true,
  bastAda = true,
}: {
  pengajuanId: number;
  totalPengajuan: number;
  nilaiAwal: Record<(typeof URUTAN)[number], string | null>;
  nomorInvoiceAwal: string | null;
  nomorGrSlipAwal?: string | null;
  nilaiGrDisetujuiAwal?: string | null;
  nomorFakturPajakAwal?: string | null;
  tanggalFakturPajakAwal?: string | null;
  tarifPpnAwal?: string | null;
  grRequestSudahDicek: boolean;
  isKlienXl?: boolean;
  bastAda?: boolean;
}) {
  const router = useRouter();
  const [nilai, setNilai] = useState(nilaiAwal);
  const [nomorInvoice, setNomorInvoice] = useState(nomorInvoiceAwal ?? "");
  const [nomorGrSlip, setNomorGrSlip] = useState(nomorGrSlipAwal ?? "");
  const [nilaiGrDisetujui, setNilaiGrDisetujui] = useState(nilaiGrDisetujuiAwal ?? "");
  const [nomorFakturPajak, setNomorFakturPajak] = useState(nomorFakturPajakAwal ?? "");
  const [tanggalFakturPajak, setTanggalFakturPajak] = useState(tanggalFakturPajakAwal ?? "");
  const [tarifPpn, setTarifPpn] = useState(tarifPpnAwal ?? "11.00");

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sukses, setSukses] = useState(false);

  const terkunciNomorInvoice = isKlienXl && !grRequestSudahDicek && !nomorInvoiceAwal;

  // Live Deficiency GR calculation
  const statusDeficiency = useMemo(() => {
    return evaluasiSelisihGr(totalPengajuan, nilaiGrDisetujui);
  }, [totalPengajuan, nilaiGrDisetujui]);

  // Live Invoice calculation
  const rincianInvoice = useMemo(() => {
    const dasar = nilaiGrDisetujui ? Number(nilaiGrDisetujui) : totalPengajuan;
    return hitungTotalInvoice(dasar, tarifPpn);
  }, [nilaiGrDisetujui, totalPengajuan, tarifPpn]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSukses(false);
    setLoading(true);

    const res = await fetch(`/api/pengajuan/${pengajuanId}/status-proses`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...nilai,
        nomorInvoice,
        nomorGrSlip,
        nilaiGrDisetujui,
        nomorFakturPajak,
        tanggalFakturPajak,
        tarifPpn,
      }),
    });
    setLoading(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? "Gagal menyimpan.");
      return;
    }
    setSukses(true);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 12 }}>
      {!bastAda && (
        <div className="alert alert-warning" style={{ margin: 0, padding: "8px 12px", fontSize: 13 }}>
          ⚠️ <b>Peringatan BAST:</b> Dokumen BAST belum dibuat untuk pengajuan ini. Pastikan BAST sudah disiapkan sebelum submit invoice ke klien.
        </div>
      )}

      {/* Bagian 1: Realisasi GR & Deficiency GR (MVP 4) */}
      <div style={{ background: "var(--color-bg-alt, #f8fafc)", padding: "14px 16px", borderRadius: 8, border: "1px solid var(--color-border, #e2e8f0)" }}>
        <h4 style={{ margin: "0 0 10px 0", fontSize: 14, color: "var(--color-primary, #0f172a)" }}>
          1. Realisasi GR Aktual &amp; Deficiency GR (Selisih)
        </h4>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
          <div className="field">
            <label>Nomor GR Slip Resmi</label>
            <input
              type="text"
              placeholder="cth. GR-2026-09-00123 / PO-SLIP-45"
              value={nomorGrSlip}
              onChange={(e) => setNomorGrSlip(e.target.value)}
            />
            <p className="subtitle" style={{ margin: "4px 0 0", fontSize: 11.5 }}>
              Nomor dokumen Goods Receipt resmi dari portal klien / COUPA.
            </p>
          </div>
          <div className="field">
            <label>Nilai GR Disetujui Klien (sebelum PPN)</label>
            <input
              type="number"
              step="any"
              placeholder={`cth. ${totalPengajuan.toFixed(2)}`}
              value={nilaiGrDisetujui}
              onChange={(e) => setNilaiGrDisetujui(e.target.value)}
            />
            <p className="subtitle" style={{ margin: "4px 0 0", fontSize: 11.5 }}>
              Total diajukan: <b>Rp{Number(totalPengajuan).toLocaleString("id-ID", { minimumFractionDigits: 2 })}</b>
            </p>
          </div>
        </div>

        {/* Live Deficiency Badge */}
        {statusDeficiency.kategori !== "belum_dicatat" && (
          <div
            style={{
              marginTop: 12,
              padding: "10px 14px",
              borderRadius: 6,
              fontSize: 13,
              background:
                statusDeficiency.kategori === "impas"
                  ? "rgba(34, 197, 94, 0.1)"
                  : statusDeficiency.kategori === "kekurangan_gr"
                  ? "rgba(234, 179, 8, 0.1)"
                  : "rgba(59, 130, 246, 0.1)",
              border: `1px solid ${
                statusDeficiency.kategori === "impas"
                  ? "rgba(34, 197, 94, 0.3)"
                  : statusDeficiency.kategori === "kekurangan_gr"
                  ? "rgba(234, 179, 8, 0.3)"
                  : "rgba(59, 130, 246, 0.3)"
              }`,
              color:
                statusDeficiency.kategori === "impas"
                  ? "#15803d"
                  : statusDeficiency.kategori === "kekurangan_gr"
                  ? "#b45309"
                  : "#1d4ed8",
            }}
          >
            <b>Deficiency GR ({statusDeficiency.kategori === "impas" ? "Impas" : statusDeficiency.kategori === "kekurangan_gr" ? "Kekurangan GR" : "Kelebihan GR"}):</b> {statusDeficiency.keterangan}
            {statusDeficiency.selisih && (
              <div style={{ marginTop: 4, fontWeight: "bold" }}>
                Selisih: {Number(statusDeficiency.selisih) >= 0 ? "+" : ""}Rp{Number(statusDeficiency.selisih).toLocaleString("id-ID", { minimumFractionDigits: 2 })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bagian 2: Invoice & Faktur Pajak Resmi */}
      <div style={{ background: "var(--color-bg-alt, #f8fafc)", padding: "14px 16px", borderRadius: 8, border: "1px solid var(--color-border, #e2e8f0)" }}>
        <h4 style={{ margin: "0 0 10px 0", fontSize: 14, color: "var(--color-primary, #0f172a)" }}>
          2. Penerbitan Invoice Resmi &amp; Faktur Pajak
        </h4>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
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
                ? "Input manual — satu urutan bersama semua customer."
                : (grRequestSudahDicek || nomorInvoiceAwal
                  ? "Input manual — satu urutan bersama semua customer."
                  : "Terkunci — GR Request belum diverifikasi Checker.")}
            </p>
          </div>
          <div className="field">
            <label>Nomor Faktur Pajak</label>
            <input
              type="text"
              placeholder="cth. 010.002-26.12345678"
              value={nomorFakturPajak}
              onChange={(e) => setNomorFakturPajak(e.target.value)}
            />
            <p className="subtitle" style={{ margin: "4px 0 0", fontSize: 11.5 }}>
              Nomor seri Faktur Pajak elektronik (e-Faktur DJP).
            </p>
          </div>
          <div className="field">
            <label>Tanggal Faktur Pajak</label>
            <input
              type="date"
              value={tanggalFakturPajak}
              onChange={(e) => setTanggalFakturPajak(e.target.value)}
            />
          </div>
          <div className="field">
            <label>Tarif PPN</label>
            <select value={tarifPpn} onChange={(e) => setTarifPpn(e.target.value)}>
              <option value="11.00">11% (Standar PPh/PPN UU HPP)</option>
              <option value="12.00">12% (Ketentuan Penyesuaian PPN)</option>
              <option value="0.00">0% (Bebas PPN / Non-PKP)</option>
            </select>
          </div>
        </div>

        {/* Live Rincian Nilai Invoice */}
        <div style={{ marginTop: 12, padding: "10px 14px", background: "#fff", border: "1px dashed var(--color-border, #cbd5e1)", borderRadius: 6, fontSize: 13 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
            <span style={{ color: "var(--color-text-muted)" }}>Dasar Pengenaan Pajak (DPP / GR Disetujui):</span>
            <b>Rp{Number(rincianInvoice.dasarPengenaanPajak).toLocaleString("id-ID", { minimumFractionDigits: 2 })}</b>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
            <span style={{ color: "var(--color-text-muted)" }}>PPN ({tarifPpn}%):</span>
            <b>Rp{Number(rincianInvoice.nilaiPpn).toLocaleString("id-ID", { minimumFractionDigits: 2 })}</b>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 4, borderTop: "1px solid #e2e8f0", fontSize: 14 }}>
            <span style={{ fontWeight: 600 }}>Total Tagihan Invoice (termasuk PPN):</span>
            <span style={{ fontWeight: 700, color: "var(--color-primary, #0f172a)" }}>
              Rp{Number(rincianInvoice.totalDenganPpn).toLocaleString("id-ID", { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div style={{ marginTop: 6, fontSize: 11.5, color: "var(--color-text-muted)" }}>
            * Sesuai ketentuan BRD, nilai invoice sebelum PPN terkunci sama persis dengan nilai GR disetujui.
          </div>
        </div>
      </div>

      {/* Bagian 3: Urutan Tanggal Status Proses */}
      <div>
        <h4 style={{ margin: "0 0 10px 0", fontSize: 14, color: "var(--color-primary, #0f172a)" }}>
          3. Tanggal-Tanggal Siklus Proses (CAC &rarr; GR &rarr; Invoice)
        </h4>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
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
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 8 }}>
        <button type="submit" disabled={loading} className="btn btn-primary">
          {loading ? "Menyimpan Data..." : "Simpan Status & Data Realisasi"}
        </button>
        {sukses && <span style={{ color: "var(--color-success)", fontSize: 13, fontWeight: "bold" }}>✓ Data GR &amp; Invoice Berhasil Disimpan</span>}
      </div>
      {error && <div className="alert alert-danger" style={{ margin: 0 }}>{error}</div>}
    </form>
  );
}

