"use client";

import { useState, useEffect } from "react";
import { extractEmailFromKontak } from "@/lib/reminder";

interface InvoiceModalProps {
  pengajuanId: number;
  nomorInvoice: string;
  nomorFakturPajak?: string | null;
  nomorPo: string;
  klien: string;
  namaProyek: string;
  namaPic?: string | null;
  kontakPic?: string | null;
  userEmail?: string;
  periode: string;
  tanggalInvoice: string;
  tanggalJatuhTempo: string;
  totalTagihan: number;
  dpp: number;
  tarifPpn: number;
}

export default function InvoiceModal({
  pengajuanId,
  nomorInvoice,
  nomorFakturPajak,
  nomorPo,
  klien,
  namaProyek,
  namaPic,
  kontakPic,
  userEmail = "imam.fatah2@idstar.group",
  periode,
  tanggalInvoice,
  tanggalJatuhTempo,
  totalTagihan,
  dpp,
  tarifPpn,
}: InvoiceModalProps) {
  const [buka, setBuka] = useState(false);
  const [tabAktif, setTabAktif] = useState<"cetak" | "email">("cetak");
  const [format, setFormat] = useState<"detail" | "ringkas" | "bilingual">("detail");
  const [bank, setBank] = useState<"all" | "bca" | "mandiri">("all");

  // State untuk Kirim Email Personal
  const emailPicDefault = extractEmailFromKontak(kontakPic);
  const [emailTujuan, setEmailTujuan] = useState<string>(userEmail || "imam.fatah2@idstar.group");
  const [namaPenerima, setNamaPenerima] = useState<string>(namaPic || "");
  const [subjekEmail, setSubjekEmail] = useState<string>(
    `[Invoice Resmi] ${nomorInvoice} - ${namaProyek} - PT IDStar Cipta Teknologi`
  );
  const [pesanEmail, setPesanEmail] = useState<string>("");
  const [salinSukses, setSalinSukses] = useState(false);
  const [sedangKirim, setSedangKirim] = useState(false);
  const [statusPesan, setStatusPesan] = useState<{ tipe: "sukses" | "error"; text: string } | null>(null);

  const formatRp = (val: number) => "Rp " + Math.round(val).toLocaleString("id-ID");

  const buildUrl = (download: boolean) => {
    return `/api/pengajuan/${pengajuanId}/invoice/pdf?format=${format}&bank=${bank}${download ? "&download=true" : ""}`;
  };

  // Generate draf email pengantar invoice
  const generateDrafEmail = (tujuanNama: string, formatPilihan: string, bankPilihan: string) => {
    const greeting = tujuanNama ? `Bapak/Ibu ${tujuanNama}` : "Bapak/Ibu";
    const origin = typeof window !== "undefined" ? window.location.origin : "https://invora-iota.vercel.app";
    const downloadPdfUrl = `${origin}/api/pengajuan/${pengajuanId}/invoice/pdf?format=${formatPilihan}&bank=${bankPilihan}&download=true`;

    let infoBank = `1. Bank Central Asia (BCA)
   Cabang        : KCU Mega Kuningan Jakarta
   Nomor Rekening: 541-098-7711
   Atas Nama     : PT IDSTAR CIPTA TEKNOLOGI

2. Bank Mandiri
   Cabang        : KC Jakarta Bellagio Mansion
   Nomor Rekening: 124-00-1122334-9
   Atas Nama     : PT IDSTAR CIPTA TEKNOLOGI`;

    if (bankPilihan === "bca") {
      infoBank = `Bank Central Asia (BCA)
Nomor Rekening: 541-098-7711
Kantor Cabang : KCU Mega Kuningan Jakarta
Atas Nama     : PT IDSTAR CIPTA TEKNOLOGI`;
    } else if (bankPilihan === "mandiri") {
      infoBank = `Bank Mandiri
Nomor Rekening: 124-00-1122334-9
Kantor Cabang : KC Jakarta Bellagio Mansion
Atas Nama     : PT IDSTAR CIPTA TEKNOLOGI`;
    }

    const fpText = nomorFakturPajak ? `\n• Nomor Faktur Pajak: ${nomorFakturPajak}` : "";

    return `Kepada Yth. ${greeting},
${klien}

Dengan hormat,

Bersama surel ini, kami dari Tim Finance & Invoicing PT IDStar Cipta Teknologi menyampaikan berkas penagihan Invoice Resmi atas penyelesaian pekerjaan layanan profesional IT untuk proyek "${namaProyek}".

Berikut adalah rincian penagihan invoice:
============================================================
RINCIAN DOKUMEN INVOICE
============================================================
• Nomor Invoice      : ${nomorInvoice}${fpText}
• Nomor PO           : ${nomorPo}
• Nama Proyek        : ${namaProyek}
• Periode Layanan    : ${periode}
• Tanggal Terbit     : ${tanggalInvoice}
• Tanggal Jatuh Tempo: ${tanggalJatuhTempo}
------------------------------------------------------------
• Dasar Pengenaan (DPP): ${formatRp(dpp)}
• PPN (${tarifPpn}%)             : ${formatRp((dpp * tarifPpn) / 100)}
• TOTAL TAGIHAN      : ${formatRp(totalTagihan)}
============================================================

Tautan Unduh Dokumen Invoice Resmi (PDF):
👉 ${downloadPdfUrl}

Pembayaran dapat ditransfer ke rekening resmi kami:
${infoBank}

* Catatan: Mohon cantumkan Nomor Invoice pada berita transfer dan kirimkan bukti transfer pembayaran ke finance@idstar.group.

Apabila Bapak/Ibu membutuhkan informasi atau dokumen pendukung tambahan (Timesheet/BAST/Faktur Pajak), kami siap membantu dengan senang hati.

Atas kerja sama yang baik dan kemitraan yang berkelanjutan, kami ucapkan terima kasih.

Hormat kami,
Finance & Invoicing Department
PT IDStar Cipta Teknologi
The Bellagio Mansion, Ground Floor, Mega Kuningan
Jakarta Selatan, DKI Jakarta 12950
Email : finance@idstar.group | invoicing@idstar.group
Telepon: +62 21 576-0888
Website: https://idstar.co.id`;
  };

  // Sinkronisasi pesan draf saat modal dibuka atau parameter berubah
  useEffect(() => {
    setPesanEmail(generateDrafEmail(namaPenerima, format, bank));
    setSubjekEmail(`[Invoice Resmi] ${nomorInvoice} - ${namaProyek} - PT IDStar Cipta Teknologi`);
  }, [buka, namaPenerima, format, bank, dpp, totalTagihan, nomorInvoice]);

  // Handler Pratinjau
  const handlePratinjau = () => {
    window.open(buildUrl(false), "_blank");
  };

  // Handler Unduh File
  const handleUnduh = () => {
    const link = document.createElement("a");
    link.href = buildUrl(true);
    link.download = `Invoice-${nomorInvoice.replace(/[^a-zA-Z0-9_-]/g, "_")}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Handler Salin Pesan
  const handleSalin = () => {
    navigator.clipboard.writeText(pesanEmail);
    setSalinSukses(true);
    setTimeout(() => setSalinSukses(false), 2500);
  };

  // Handler Buka Mailto
  const handleBukaMailto = async () => {
    if (!emailTujuan.trim()) {
      alert("Silakan masukkan email tujuan terlebih dahulu.");
      return;
    }
    const mailtoUrl = `mailto:${encodeURIComponent(emailTujuan.trim())}?subject=${encodeURIComponent(
      subjekEmail
    )}&body=${encodeURIComponent(pesanEmail)}`;
    window.open(mailtoUrl, "_blank");

    // Otomatis catat ke log riwayat
    await handleCatatLog("mailto");
  };

  // Handler Catat ke Audit Log Sistem
  const handleCatatLog = async (metode = "manual") => {
    if (!emailTujuan.trim()) return;
    setSedangKirim(true);
    setStatusPesan(null);
    try {
      const res = await fetch(`/api/pengajuan/${pengajuanId}/invoice/kirim-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          emailPenerima: emailTujuan.trim(),
          namaPicPenerima: namaPenerima.trim() || null,
          subjek: subjekEmail.trim(),
          pesanTeks: pesanEmail,
          metode,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal mencatat log");
      setStatusPesan({
        tipe: "sukses",
        text: `Log pengiriman invoice ke "${emailTujuan.trim()}" berhasil disimpan ke sistem!`,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Terjadi kesalahan";
      setStatusPesan({ tipe: "error", text: msg });
    } finally {
      setSedangKirim(false);
    }
  };

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
        title="Print or email Official PDF Invoice"
      >
        <span>📄 Print &amp; Send Invoice</span>
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
              maxWidth: 620,
              maxHeight: "92vh",
              display: "flex",
              flexDirection: "column",
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
                  Official Invoice &mdash; PT IDStar Cipta Teknologi
                </h3>
                <p style={{ margin: "4px 0 0", fontSize: 12, color: "#64748b" }}>
                  Invoice No: <b style={{ color: "#0f172a" }}>{nomorInvoice}</b> &middot; PO:{" "}
                  <b style={{ color: "#0f172a" }}>{nomorPo}</b> &middot; Client: {klien}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setBuka(false)}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: 20,
                  cursor: "pointer",
                  color: "#94a3b8",
                  padding: 4,
                  lineHeight: 1,
                }}
              >
                &times;
              </button>
            </div>

            {/* Tab Navigation */}
            <div
              style={{
                display: "flex",
                borderBottom: "1px solid #e2e8f0",
                backgroundColor: "#ffffff",
                padding: "0 16px",
              }}
            >
              <button
                type="button"
                onClick={() => setTabAktif("cetak")}
                style={{
                  padding: "10px 16px",
                  fontSize: 13,
                  fontWeight: 600,
                  border: "none",
                  borderBottom: `2px solid ${tabAktif === "cetak" ? "#ea242a" : "transparent"}`,
                  color: tabAktif === "cetak" ? "#ea242a" : "#64748b",
                  backgroundColor: "transparent",
                  cursor: "pointer",
                }}
              >
                📑 PDF Layout &amp; Download
              </button>
              <button
                type="button"
                onClick={() => setTabAktif("email")}
                style={{
                  padding: "10px 16px",
                  fontSize: 13,
                  fontWeight: 600,
                  border: "none",
                  borderBottom: `2px solid ${tabAktif === "email" ? "#ea242a" : "transparent"}`,
                  color: tabAktif === "email" ? "#ea242a" : "#64748b",
                  backgroundColor: "transparent",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <span>✉️ Send via Personal Email</span>
                <span
                  style={{
                    backgroundColor: "#ecfdf5",
                    color: "#059669",
                    fontSize: 10,
                    padding: "2px 6px",
                    borderRadius: 4,
                    border: "1px solid #a7f3d0",
                  }}
                >
                  Manual
                </span>
              </button>
            </div>

            {/* Modal Body (Scrollable) */}
            <div
              style={{
                padding: "18px 20px",
                overflowY: "auto",
                display: "flex",
                flexDirection: "column",
                gap: 16,
              }}
            >
              {statusPesan && (
                <div
                  style={{
                    padding: "10px 14px",
                    borderRadius: 6,
                    fontSize: 12.5,
                    backgroundColor: statusPesan.tipe === "sukses" ? "#f0fdf4" : "#fef2f2",
                    color: statusPesan.tipe === "sukses" ? "#166534" : "#991b1b",
                    border: `1px solid ${statusPesan.tipe === "sukses" ? "#bbf7d0" : "#fecaca"}`,
                  }}
                >
                  {statusPesan.text}
                </div>
              )}

              {/* TAB 1: FORMAT & UNDUH PDF */}
              {tabAktif === "cetak" && (
                <>
                  <div>
                    <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#1e293b", marginBottom: 8 }}>
                      1. Select Layout Preset:
                    </label>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
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
                            📑 Detailed Itemized Format (Per-Resource &amp; Prorata)
                          </div>
                          <div style={{ fontSize: 11.5, color: "#64748b", marginTop: 2 }}>
                            Detailed breakdown per personnel: talent name, PO line number, billable working days ratio, and monthly rate. Ideal for Time &amp; Material contracts.
                          </div>
                        </div>
                      </label>

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
                            📦 Consolidated / Summary Format (Project Lump Sum)
                          </div>
                          <div style={{ fontSize: 11.5, color: "#64748b", marginTop: 2 }}>
                            Combines resources into a single service package line item per project without listing individual names. Suitable for lump sum / milestone billings.
                          </div>
                        </div>
                      </label>

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
                            🌐 Bilingual Corporate Format (ID / EN Dual Language)
                          </div>
                          <div style={{ fontSize: 11.5, color: "#64748b", marginTop: 2 }}>
                            Headers, breakdown columns, and payment instruction clauses presented in both Indonesian and English. Standard for regional &amp; multinational clients.
                          </div>
                        </div>
                      </label>
                    </div>
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#1e293b", marginBottom: 8 }}>
                      2. Official Bank Payment Account on Document:
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
                        }}
                      >
                        BCA &amp; Mandiri (Both)
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
                        }}
                      >
                        BCA Only
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
                        }}
                      >
                        Mandiri Only
                      </button>
                    </div>
                  </div>

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
                </>
              )}

              {/* TAB 2: KIRIM KE EMAIL PERSONAL */}
              {tabAktif === "email" && (
                <>
                  <div>
                    <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, color: "#1e293b", marginBottom: 6 }}>
                      Recipient Email Address:
                    </label>
                    <input
                      type="email"
                      value={emailTujuan}
                      onChange={(e) => setEmailTujuan(e.target.value)}
                      placeholder="e.g. name@gmail.com or user@idstar.group"
                      style={{
                        width: "100%",
                        padding: "8px 12px",
                        fontSize: 13,
                        borderRadius: 6,
                        border: "1px solid #cbd5e1",
                      }}
                    />

                    {/* Quick Email Selector Chips */}
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6, fontSize: 11 }}>
                      <span style={{ color: "#64748b", alignSelf: "center" }}>Shortcuts:</span>
                      <button
                        type="button"
                        onClick={() => setEmailTujuan(userEmail)}
                        style={{
                          background: "#eff6ff",
                          border: "1px solid #bfdbfe",
                          color: "#1d4ed8",
                          padding: "2px 8px",
                          borderRadius: 4,
                          cursor: "pointer",
                        }}
                      >
                        👤 My Email ({userEmail})
                      </button>
                      <button
                        type="button"
                        onClick={() => setEmailTujuan("finance@idstar.group")}
                        style={{
                          background: "#f1f5f9",
                          border: "1px solid #cbd5e1",
                          color: "#334155",
                          padding: "2px 8px",
                          borderRadius: 4,
                          cursor: "pointer",
                        }}
                      >
                        🏢 finance@idstar.group
                      </button>
                      {emailPicDefault && (
                        <button
                          type="button"
                          onClick={() => setEmailTujuan(emailPicDefault)}
                          style={{
                            background: "#f0fdf4",
                            border: "1px solid #bbf7d0",
                            color: "#15803d",
                            padding: "2px 8px",
                            borderRadius: 4,
                            cursor: "pointer",
                          }}
                        >
                          👥 PIC: {emailPicDefault}
                        </button>
                      )}
                    </div>
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, color: "#1e293b", marginBottom: 6 }}>
                      Recipient Name (Optional):
                    </label>
                    <input
                      type="text"
                      value={namaPenerima}
                      onChange={(e) => setNamaPenerima(e.target.value)}
                      placeholder="PIC or Recipient Name"
                      style={{
                        width: "100%",
                        padding: "8px 12px",
                        fontSize: 13,
                        borderRadius: 6,
                        border: "1px solid #cbd5e1",
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, color: "#1e293b", marginBottom: 6 }}>
                      Email Subject:
                    </label>
                    <input
                      type="text"
                      value={subjekEmail}
                      onChange={(e) => setSubjekEmail(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "8px 12px",
                        fontSize: 13,
                        borderRadius: 6,
                        border: "1px solid #cbd5e1",
                      }}
                    />
                  </div>

                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                      <label style={{ fontSize: 12.5, fontWeight: 600, color: "#1e293b" }}>
                        Cover Letter Body &amp; Direct PDF Download Link:
                      </label>
                      <button
                        type="button"
                        onClick={handleSalin}
                        style={{
                          background: "none",
                          border: "none",
                          color: salinSukses ? "#16a34a" : "#2563eb",
                          fontSize: 11.5,
                          cursor: "pointer",
                          fontWeight: 600,
                        }}
                      >
                        {salinSukses ? "✓ Copied to Clipboard!" : "📋 Copy Text"}
                      </button>
                    </div>
                    <textarea
                      rows={9}
                      value={pesanEmail}
                      onChange={(e) => setPesanEmail(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "10px 12px",
                        fontSize: 11.5,
                        fontFamily: "monospace",
                        lineHeight: 1.5,
                        borderRadius: 6,
                        border: "1px solid #cbd5e1",
                        resize: "vertical",
                        backgroundColor: "#f8fafc",
                      }}
                    />
                    <div style={{ fontSize: 11, color: "#64748b", marginTop: 4 }}>
                      💡 This message includes a direct URL for recipient to download the official PDF Invoice in your selected preset.
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Modal Footer */}
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
                Close
              </button>

              {tabAktif === "cetak" ? (
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
                    title="Open preview in new browser tab"
                  >
                    👁️ Preview in New Tab
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
                    title="Download PDF directly to Downloads folder"
                  >
                    ⬇️ Download PDF
                  </button>
                </div>
              ) : (
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    type="button"
                    onClick={() => handleCatatLog("manual")}
                    disabled={sedangKirim}
                    className="btn btn-secondary"
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      padding: "8px 12px",
                    }}
                    title="Record this delivery to system audit log"
                  >
                    💾 {sedangKirim ? "Logging..." : "Save Delivery Log"}
                  </button>
                  <button
                    type="button"
                    onClick={handleSalin}
                    className="btn btn-secondary"
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      padding: "8px 12px",
                      color: salinSukses ? "#16a34a" : undefined,
                    }}
                  >
                    {salinSukses ? "✓ Copied" : "📋 Copy Email Text"}
                  </button>
                  <button
                    type="button"
                    onClick={handleBukaMailto}
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
                    title="Launch native email client (Outlook, Thunderbird, Mail) with pre-filled content"
                  >
                    ✉️ Open in Email Client (Mailto)
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
