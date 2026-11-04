"use client";

import { useState } from "react";

interface InvoiceModalProps {
  pengajuanId: number;
  nomorInvoice: string;
  nomorPo: string;
  klien: string;
  namaProyek: string;
  periode: string;
  totalTagihan: number;
  dpp: number;
  tarifPpn: number;
}

export default function InvoiceModal({
  pengajuanId,
  nomorInvoice,
  nomorPo,
  klien,
  namaProyek,
  periode,
  totalTagihan,
  dpp,
  tarifPpn,
}: InvoiceModalProps) {
  const [buka, setBuka] = useState(false);
  const [format, setFormat] = useState<"detail" | "ringkas" | "bilingual">("detail");
  const [bank, setBank] = useState<"all" | "bca" | "mandiri">("all");

  const buildUrl = (download: boolean) => {
    return `/api/pengajuan/${pengajuanId}/invoice/pdf?format=${format}&bank=${bank}${download ? "&download=true" : ""}`;
  };

  const handlePratinjau = () => {
    window.open(buildUrl(false), "_blank");
    setBuka(false);
  };

  const handleUnduh = () => {
    // Gunakan elemen <a> tersembunyi dengan atribut download untuk memastikan trigger unduh file
    const link = document.createElement("a");
    link.href = buildUrl(true);
    link.download = `Invoice-${nomorInvoice.replace(/[^a-zA-Z0-9_-]/g, "_")}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setBuka(false);
  };

  const formatRp = (val: number) => "Rp " + Math.round(val).toLocaleString("id-ID");

  return (
    <>
      <button
        type="button"
        onClick={() => setBuka(true)}
        className="btn btn-secondary"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          fontWeight: 600,
          padding: "8px 14px",
          borderRadius: 6,
          cursor: "pointer",
        }}
        title="Pilih format dan cetak Invoice Resmi PDF"
      >
        <span>📄 Cetak Invoice PDF</span>
        <span style={{ fontSize: 11, opacity: 0.7 }}>▾</span>
      </button>

      {buka && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(15, 23, 42, 0.65)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: 16,
            backdropFilter: "blur(4px)",
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setBuka(false);
          }}
        >
          <div
            style={{
              backgroundColor: "#ffffff",
              borderRadius: 12,
              width: "100%",
              maxWidth: 580,
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
              border: "1px solid var(--color-border, #e2e8f0)",
              overflow: "hidden",
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: "16px 20px",
                borderBottom: "1px solid #e2e8f0",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                backgroundColor: "#f8fafc",
              }}
            >
              <div>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#0f172a" }}>
                  Kustomisasi Format Invoice Resmi (PDF)
                </h3>
                <p style={{ margin: "4px 0 0", fontSize: 12.5, color: "#64748b" }}>
                  Invoice: <b style={{ color: "#0f172a" }}>{nomorInvoice}</b> &middot; PO:{" "}
                  <b style={{ color: "#0f172a" }}>{nomorPo}</b> &middot; Klien: {klien}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setBuka(false)}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: 18,
                  cursor: "pointer",
                  color: "#94a3b8",
                  padding: 4,
                  lineHeight: 1,
                }}
              >
                &times;
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: 18 }}>
              {/* Pilihan 1: Format Tata Letak */}
              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#1e293b", marginBottom: 8 }}>
                  1. Pilih Format Tata Letak (Layout Preset):
                </label>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {/* Option Detail */}
                  <label
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 12,
                      padding: "10px 14px",
                      borderRadius: 8,
                      border: `1.5px solid ${format === "detail" ? "#ea242a" : "#e2e8f0"}`,
                      backgroundColor: format === "detail" ? "#fff5f5" : "#ffffff",
                      cursor: "pointer",
                    }}
                  >
                    <input
                      type="radio"
                      name="formatInvoice"
                      value="detail"
                      checked={format === "detail"}
                      onChange={() => setFormat("detail")}
                      style={{ marginTop: 3, accentColor: "#ea242a" }}
                    />
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "#0f172a" }}>
                        📑 Format Standar Rinci (Per-Talenta & Prorata)
                      </div>
                      <div style={{ fontSize: 11.5, color: "#64748b", marginTop: 2 }}>
                        Menampilkan tabel rincian per masing-masing talenta, nomor line PO, rasio hari kerja ditagihkan, dan rate bulanan lengkap. Cocok untuk kontrak Time & Material / Staffing.
                      </div>
                    </div>
                  </label>

                  {/* Option Ringkas */}
                  <label
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 12,
                      padding: "10px 14px",
                      borderRadius: 8,
                      border: `1.5px solid ${format === "ringkas" ? "#ea242a" : "#e2e8f0"}`,
                      backgroundColor: format === "ringkas" ? "#fff5f5" : "#ffffff",
                      cursor: "pointer",
                    }}
                  >
                    <input
                      type="radio"
                      name="formatInvoice"
                      value="ringkas"
                      checked={format === "ringkas"}
                      onChange={() => setFormat("ringkas")}
                      style={{ marginTop: 3, accentColor: "#ea242a" }}
                    />
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "#0f172a" }}>
                        📦 Format Ringkas / Konsolidasi (Lump Sum Proyek)
                      </div>
                      <div style={{ fontSize: 11.5, color: "#64748b", marginTop: 2 }}>
                        Menggabungkan seluruh talenta menjadi 1 baris paket jasa layanan per proyek tanpa rincian nama individu di invoice muka. Cocok untuk bagian Procurement klien yang mensyaratkan invoice ringkas.
                      </div>
                    </div>
                  </label>

                  {/* Option Bilingual */}
                  <label
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 12,
                      padding: "10px 14px",
                      borderRadius: 8,
                      border: `1.5px solid ${format === "bilingual" ? "#ea242a" : "#e2e8f0"}`,
                      backgroundColor: format === "bilingual" ? "#fff5f5" : "#ffffff",
                      cursor: "pointer",
                    }}
                  >
                    <input
                      type="radio"
                      name="formatInvoice"
                      value="bilingual"
                      checked={format === "bilingual"}
                      onChange={() => setFormat("bilingual")}
                      style={{ marginTop: 3, accentColor: "#ea242a" }}
                    />
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "#0f172a" }}>
                        🌐 Format Bilingual (ID / EN Dwibahasa)
                      </div>
                      <div style={{ fontSize: 11.5, color: "#64748b", marginTop: 2 }}>
                        Judul, kolom rincian, dan klausul instruksi pembayaran disajikan dalam Bahasa Indonesia dan Bahasa Inggris. Standar resmi untuk klien multinasional / regional.
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Pilihan 2: Rekening Pembayaran */}
              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#1e293b", marginBottom: 8 }}>
                  2. Pilihan Rekening Pembayaran Resmi di Dokumen:
                </label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                  <button
                    type="button"
                    onClick={() => setBank("all")}
                    style={{
                      padding: "8px 10px",
                      fontSize: 12,
                      fontWeight: 600,
                      borderRadius: 6,
                      border: `1px solid ${bank === "all" ? "#ea242a" : "#cbd5e1"}`,
                      backgroundColor: bank === "all" ? "#fef2f2" : "#ffffff",
                      color: bank === "all" ? "#ea242a" : "#475569",
                      cursor: "pointer",
                      textAlign: "center",
                    }}
                  >
                    BCA & Mandiri (Semua)
                  </button>
                  <button
                    type="button"
                    onClick={() => setBank("bca")}
                    style={{
                      padding: "8px 10px",
                      fontSize: 12,
                      fontWeight: 600,
                      borderRadius: 6,
                      border: `1px solid ${bank === "bca" ? "#ea242a" : "#cbd5e1"}`,
                      backgroundColor: bank === "bca" ? "#fef2f2" : "#ffffff",
                      color: bank === "bca" ? "#ea242a" : "#475569",
                      cursor: "pointer",
                      textAlign: "center",
                    }}
                  >
                    Khusus Bank BCA
                  </button>
                  <button
                    type="button"
                    onClick={() => setBank("mandiri")}
                    style={{
                      padding: "8px 10px",
                      fontSize: 12,
                      fontWeight: 600,
                      borderRadius: 6,
                      border: `1px solid ${bank === "mandiri" ? "#ea242a" : "#cbd5e1"}`,
                      backgroundColor: bank === "mandiri" ? "#fef2f2" : "#ffffff",
                      color: bank === "mandiri" ? "#ea242a" : "#475569",
                      cursor: "pointer",
                      textAlign: "center",
                    }}
                  >
                    Khusus Bank Mandiri
                  </button>
                </div>
              </div>

              {/* Ringkasan Nilai Invoice */}
              <div
                style={{
                  backgroundColor: "#f1f5f9",
                  padding: "10px 14px",
                  borderRadius: 8,
                  fontSize: 12,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div>
                  <span style={{ color: "#64748b" }}>DPP: </span>
                  <b style={{ color: "#0f172a" }}>{formatRp(dpp)}</b> &middot;{" "}
                  <span style={{ color: "#64748b" }}>PPN ({tarifPpn}%): </span>
                  <b style={{ color: "#0f172a" }}>{formatRp((dpp * tarifPpn) / 100)}</b>
                </div>
                <div>
                  <span style={{ color: "#64748b" }}>Total: </span>
                  <b style={{ color: "#ea242a", fontSize: 13 }}>{formatRp(totalTagihan)}</b>
                </div>
              </div>
            </div>

            {/* Modal Footer / Action Buttons */}
            <div
              style={{
                padding: "14px 20px",
                borderTop: "1px solid #e2e8f0",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                backgroundColor: "#f8fafc",
              }}
            >
              <button
                type="button"
                onClick={() => setBuka(false)}
                className="btn"
                style={{ padding: "7px 14px", fontSize: 12 }}
              >
                Tutup
              </button>

              <div style={{ display: "flex", gap: 10 }}>
                <button
                  type="button"
                  onClick={handlePratinjau}
                  className="btn btn-secondary"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    fontSize: 12.5,
                    fontWeight: 600,
                    padding: "8px 14px",
                  }}
                  title="Buka pratinjau di tab baru untuk dicek atau dicetak via browser"
                >
                  👁️ Buka di Tab Baru
                </button>
                <button
                  type="button"
                  onClick={handleUnduh}
                  className="btn btn-primary"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    fontSize: 12.5,
                    fontWeight: 600,
                    padding: "8px 16px",
                    backgroundColor: "#ea242a",
                    borderColor: "#ea242a",
                    color: "#ffffff",
                  }}
                  title="Langsung unduh file PDF ke folder Downloads"
                >
                  ⬇️ Unduh Langsung PDF
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

