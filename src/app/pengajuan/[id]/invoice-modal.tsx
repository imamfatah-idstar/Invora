"use client";

import { useState, useEffect } from "react";
import { extractEmailFromKontak } from "@/lib/reminder";
import {
  generateIdstarEmailTemplate,
  formatPeriodeShort,
  formatInvoiceDateEnglish,
  formatDueDateShort,
  formatDueMonthYear,
  formatAmountNumber,
  determineDueStatus,
} from "@/lib/idstar-mail-template";

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
  const [format, setFormat] = useState<"detail" | "ringkas">("detail");
  const [bank, setBank] = useState<"all" | "bca" | "mandiri">("all");
  const [emailViewMode, setEmailViewMode] = useState<"preview" | "text">("preview");

  // State untuk Kirim Email
  const emailPicDefault = extractEmailFromKontak(kontakPic);
  const [emailTujuan, setEmailTujuan] = useState<string>(userEmail || "imam.fatah2@idstar.group");
  const [namaPenerima, setNamaPenerima] = useState<string>(namaPic || "");
  const [subjekEmail, setSubjekEmail] = useState<string>("");
  const [pesanEmail, setPesanEmail] = useState<string>("");
  const [salinSukses, setSalinSukses] = useState<string | null>(null);
  const [sedangKirim, setSedangKirim] = useState(false);
  const [statusPesan, setStatusPesan] = useState<{ tipe: "sukses" | "error"; text: string } | null>(null);

  const formatRp = (val: number) => "Rp " + Math.round(val).toLocaleString("id-ID");

  const buildUrl = (download: boolean) => {
    return `/api/pengajuan/${pengajuanId}/invoice/pdf?format=${format}&bank=${bank}${download ? "&download=true" : ""}`;
  };

  // Pre-calculate formatted values for email
  const dueMonthYear = formatDueMonthYear(tanggalJatuhTempo);
  const periodeShort = formatPeriodeShort(periode);
  const invoiceDateEnglish = formatInvoiceDateEnglish(tanggalInvoice);
  const dueDateShort = formatDueDateShort(tanggalJatuhTempo);
  const statusDue = determineDueStatus(tanggalJatuhTempo);
  const amountStr = formatAmountNumber(totalTagihan);

  // Generate IDStar standard email template
  const generatedEmail = generateIdstarEmailTemplate({
    klien,
    periode,
    nomorInvoice,
    tanggalInvoice,
    tanggalJatuhTempo,
    netAmount: totalTagihan,
    monthYear: dueMonthYear,
    dueStatus: statusDue,
    baseUrl: typeof window !== "undefined" ? window.location.origin : undefined,
  });

  // Sinkronisasi saat modal dibuka
  useEffect(() => {
    setSubjekEmail(generatedEmail.subject);
    setPesanEmail(generatedEmail.plainText);
  }, [buka, klien, nomorInvoice, totalTagihan, tanggalJatuhTempo]);

  // Handler Pratinjau PDF
  const handlePratinjau = () => {
    window.open(buildUrl(false), "_blank");
  };

  // Handler Unduh PDF
  const handleUnduh = () => {
    const link = document.createElement("a");
    link.href = buildUrl(true);
    link.download = `Invoice-${nomorInvoice.replace(/[^a-zA-Z0-9_-]/g, "_")}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Handler Salin Rich HTML Email (IDStar template formatting)
  const handleSalinHtml = async () => {
    try {
      const blobHtml = new Blob([generatedEmail.html], { type: "text/html" });
      const blobText = new Blob([pesanEmail || generatedEmail.plainText], { type: "text/plain" });
      await navigator.clipboard.write([
        new ClipboardItem({
          "text/html": blobHtml,
          "text/plain": blobText,
        }),
      ]);
      setSalinSukses("html");
      setTimeout(() => setSalinSukses(null), 2500);
    } catch {
      // Fallback: Copy plain text
      await navigator.clipboard.writeText(pesanEmail || generatedEmail.plainText);
      setSalinSukses("text");
      setTimeout(() => setSalinSukses(null), 2500);
    }
  };

  // Handler Salin Plain Text
  const handleSalinText = () => {
    navigator.clipboard.writeText(pesanEmail || generatedEmail.plainText);
    setSalinSukses("text");
    setTimeout(() => setSalinSukses(null), 2500);
  };

  // Handler Buka Mailto
  const handleBukaMailto = async () => {
    if (!emailTujuan.trim()) {
      alert("Please enter a valid recipient email address.");
      return;
    }
    const mailtoUrl = `mailto:${encodeURIComponent(emailTujuan.trim())}?subject=${encodeURIComponent(
      subjekEmail
    )}&body=${encodeURIComponent(pesanEmail || generatedEmail.plainText)}`;
    window.open(mailtoUrl, "_blank");

    // Otomatis catat ke audit log sistem
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
          pesanTeks: pesanEmail || generatedEmail.plainText,
          metode,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to log invoice dispatch.");
      setStatusPesan({
        tipe: "sukses",
        text: `Invoice delivery log to "${emailTujuan.trim()}" successfully recorded!`,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "An error occurred";
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
              maxWidth: 780,
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
                  <b style={{ color: "#0f172a" }}>{nomorPo}</b> &middot; Client: <b>{klien}</b>
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
                <span>✉️ Official Email Template (IDStar Standard)</span>
                <span
                  style={{
                    backgroundColor: "#fef2f2",
                    color: "#dc2626",
                    fontSize: 10,
                    fontWeight: 700,
                    padding: "2px 6px",
                    borderRadius: 4,
                    border: "1px solid #fecaca",
                  }}
                >
                  Template
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
                      1. Select Layout Preset (Single Language):
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

              {/* TAB 2: TEMPLATE EMAIL IDSTAR (IDstar-Group-Mail.png) */}
              {tabAktif === "email" && (
                <>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <div>
                      <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#1e293b", marginBottom: 4 }}>
                        Recipient Email:
                      </label>
                      <input
                        type="email"
                        value={emailTujuan}
                        onChange={(e) => setEmailTujuan(e.target.value)}
                        placeholder="e.g. client@company.com"
                        style={{
                          width: "100%",
                          padding: "7px 10px",
                          fontSize: 12.5,
                          borderRadius: 6,
                          border: "1px solid #cbd5e1",
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#1e293b", marginBottom: 4 }}>
                        Recipient PIC / Attention:
                      </label>
                      <input
                        type="text"
                        value={namaPenerima}
                        onChange={(e) => setNamaPenerima(e.target.value)}
                        placeholder="PIC Name (optional)"
                        style={{
                          width: "100%",
                          padding: "7px 10px",
                          fontSize: 12.5,
                          borderRadius: 6,
                          border: "1px solid #cbd5e1",
                        }}
                      />
                    </div>
                  </div>

                  {/* Quick Shortcuts */}
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", fontSize: 11, alignItems: "center" }}>
                    <span style={{ color: "#64748b" }}>Quick Fill:</span>
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

                  <div>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#1e293b", marginBottom: 4 }}>
                      Subject:
                    </label>
                    <input
                      type="text"
                      value={subjekEmail}
                      onChange={(e) => setSubjekEmail(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "7px 10px",
                        fontSize: 12.5,
                        borderRadius: 6,
                        border: "1px solid #cbd5e1",
                      }}
                    />
                  </div>

                  {/* View Mode Toggle */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ display: "flex", gap: 4, backgroundColor: "#f1f5f9", padding: 3, borderRadius: 6 }}>
                      <button
                        type="button"
                        onClick={() => setEmailViewMode("preview")}
                        style={{
                          border: "none",
                          padding: "4px 10px",
                          borderRadius: 4,
                          fontSize: 11.5,
                          fontWeight: 600,
                          cursor: "pointer",
                          backgroundColor: emailViewMode === "preview" ? "#ffffff" : "transparent",
                          color: emailViewMode === "preview" ? "#0f172a" : "#64748b",
                          boxShadow: emailViewMode === "preview" ? "0 1px 2px rgba(0,0,0,0.05)" : "none",
                        }}
                      >
                        👁️ Live Template Preview
                      </button>
                      <button
                        type="button"
                        onClick={() => setEmailViewMode("text")}
                        style={{
                          border: "none",
                          padding: "4px 10px",
                          borderRadius: 4,
                          fontSize: 11.5,
                          fontWeight: 600,
                          cursor: "pointer",
                          backgroundColor: emailViewMode === "text" ? "#ffffff" : "transparent",
                          color: emailViewMode === "text" ? "#0f172a" : "#64748b",
                          boxShadow: emailViewMode === "text" ? "0 1px 2px rgba(0,0,0,0.05)" : "none",
                        }}
                      >
                        📝 Raw Text Body
                      </button>
                    </div>

                    <div style={{ display: "flex", gap: 6 }}>
                      <button
                        type="button"
                        onClick={handleSalinHtml}
                        className="btn btn-secondary"
                        style={{
                          fontSize: 11,
                          padding: "4px 10px",
                          fontWeight: 600,
                          color: salinSukses === "html" ? "#16a34a" : "#dc2626",
                          borderColor: salinSukses === "html" ? "#86efac" : "#fca5a5",
                          backgroundColor: salinSukses === "html" ? "#f0fdf4" : "#fff5f5",
                        }}
                        title="Copy Rich HTML with tables, colors, and styling ready to paste directly into Gmail/Outlook"
                      >
                        {salinSukses === "html" ? "✓ Copied Rich HTML!" : "📋 Copy Rich HTML (Gmail/Outlook)"}
                      </button>
                      <button
                        type="button"
                        onClick={handleSalinText}
                        className="btn btn-secondary"
                        style={{
                          fontSize: 11,
                          padding: "4px 10px",
                          fontWeight: 600,
                          color: salinSukses === "text" ? "#16a34a" : "#2563eb",
                        }}
                      >
                        {salinSukses === "text" ? "✓ Copied Text!" : "📄 Copy Text"}
                      </button>
                    </div>
                  </div>

                  {/* Mode 1: Exact Live Visual Replica of IDstar-Group-Mail.png */}
                  {emailViewMode === "preview" ? (
                    <div
                      style={{
                        backgroundColor: "#f9fafb",
                        border: "1px solid #e5e7eb",
                        borderRadius: 8,
                        padding: 16,
                        maxHeight: 380,
                        overflowY: "auto",
                      }}
                    >
                      <div
                        style={{
                          backgroundColor: "#ffffff",
                          border: "1px solid #d1d5db",
                          borderRadius: 4,
                          maxWidth: 620,
                          margin: "0 auto",
                          overflow: "hidden",
                          fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
                          color: "#1f2937",
                        }}
                      >
                        {/* Header Logo */}
                        <div style={{ padding: "20px 20px 14px", textAlign: "center" }}>
                          <img
                            src="/idstar-logo-color.png"
                            alt="IDstar - service with quality"
                            style={{ height: 42, width: "auto", display: "inline-block" }}
                          />
                          <div style={{ marginTop: 14, borderBottom: "1px solid #e5e7eb" }}></div>
                        </div>

                        {/* Red Main Title */}
                        <div style={{ textAlign: "center", padding: "4px 20px 16px" }}>
                          <h2
                            style={{
                              margin: 0,
                              color: "#b91c1c",
                              fontFamily: "Georgia, 'Times New Roman', serif",
                              fontSize: 22,
                              fontWeight: 700,
                            }}
                          >
                            You have 1 invoice due
                          </h2>
                        </div>

                        {/* Content Card Box */}
                        <div
                          style={{
                            margin: "0 18px 18px",
                            border: "1px solid #d1d5db",
                            borderRadius: 4,
                            padding: "18px 20px",
                            backgroundColor: "#ffffff",
                          }}
                        >
                          <div style={{ fontSize: 13, fontWeight: 700, color: "#111827", marginBottom: 10 }}>
                            Dear {klien}
                          </div>
                          <div style={{ fontSize: 12.5, color: "#374151", marginBottom: 10 }}>
                            Thank you for choosing us for your business partner.
                          </div>
                          <div style={{ fontSize: 12.5, color: "#374151", marginBottom: 16, lineHeight: 1.5 }}>
                            We would like to confirm that you have <b>1</b> invoice due in <b>{dueMonthYear}</b> for a total of{" "}
                            <b>IDR {amountStr}</b>.
                          </div>

                          {/* Invoice Summary Table */}
                          <div style={{ overflowX: "auto" }}>
                            <table
                              style={{
                                width: "100%",
                                borderCollapse: "collapse",
                                fontSize: 10.5,
                                margin: "10px 0 16px",
                                color: "#111827",
                                border: "1px solid #6b7280",
                              }}
                            >
                              <thead>
                                <tr style={{ backgroundColor: "#e5e7eb" }}>
                                  <th style={{ border: "1px solid #6b7280", padding: "6px 4px", textAlign: "center", fontWeight: 700 }}>No</th>
                                  <th style={{ border: "1px solid #6b7280", padding: "6px 4px", textAlign: "center", fontWeight: 700 }}>Invoice Periode</th>
                                  <th style={{ border: "1px solid #6b7280", padding: "6px 4px", textAlign: "center", fontWeight: 700 }}>Invoice Due Status</th>
                                  <th style={{ border: "1px solid #6b7280", padding: "6px 4px", textAlign: "center", fontWeight: 700 }}>Invoice Number</th>
                                  <th style={{ border: "1px solid #6b7280", padding: "6px 4px", textAlign: "center", fontWeight: 700 }}>Invoice Date</th>
                                  <th style={{ border: "1px solid #6b7280", padding: "6px 4px", textAlign: "center", fontWeight: 700 }}>Net Amount<br />(IDR)</th>
                                  <th style={{ border: "1px solid #6b7280", padding: "6px 4px", textAlign: "center", fontWeight: 700 }}>Payment Due Date</th>
                                </tr>
                              </thead>
                              <tbody>
                                <tr>
                                  <td style={{ border: "1px solid #6b7280", padding: "8px 4px", textAlign: "center" }}>1</td>
                                  <td style={{ border: "1px solid #6b7280", padding: "8px 4px", textAlign: "center" }}>{periodeShort}</td>
                                  <td
                                    style={{
                                      border: "1px solid #6b7280",
                                      padding: "8px 4px",
                                      textAlign: "center",
                                      fontWeight: 600,
                                      color: statusDue === "Overdue" ? "#b91c1c" : "#111827",
                                    }}
                                  >
                                    {statusDue}
                                  </td>
                                  <td style={{ border: "1px solid #6b7280", padding: "8px 4px", textAlign: "center", fontWeight: 600 }}>{nomorInvoice}</td>
                                  <td style={{ border: "1px solid #6b7280", padding: "8px 4px", textAlign: "center" }}>{invoiceDateEnglish}</td>
                                  <td style={{ border: "1px solid #6b7280", padding: "8px 4px", textAlign: "right", fontWeight: 600, fontFamily: "monospace" }}>
                                    {amountStr}
                                  </td>
                                  <td style={{ border: "1px solid #6b7280", padding: "8px 4px", textAlign: "center" }}>{dueDateShort}</td>
                                </tr>
                              </tbody>
                            </table>
                          </div>

                          {/* Instructions */}
                          <div style={{ textAlign: "center", fontSize: 11.5, color: "#1f2937", lineHeight: 1.6 }}>
                            <div style={{ marginBottom: 4 }}>Please check to make sure everything looks all right.</div>
                            <div style={{ marginBottom: 4 }}>
                              If you have made a payment, please send proof of payment to{" "}
                              <a href="mailto:finance@idstar.group" style={{ color: "#2563eb", textDecoration: "underline" }}>
                                finance@idstar.group
                              </a>
                            </div>
                            <div style={{ marginBottom: 12 }}>
                              If you are not the right person to receive this reminder, please contact us at{" "}
                              <a href="mailto:finance@idstar.group" style={{ color: "#2563eb", textDecoration: "underline" }}>
                                finance@idstar.group
                              </a>
                            </div>
                            <div style={{ borderTop: "1px solid #e5e7eb", margin: "12px auto", width: "85%" }}></div>
                            <div style={{ fontStyle: "italic", fontSize: 10.5, color: "#4b5563" }}>
                              This is an automated email from IDStar
                            </div>
                          </div>
                        </div>

                        {/* Red Banner Footer */}
                        <div
                          style={{
                            backgroundColor: "#b91c1c",
                            color: "#ffffff",
                            textAlign: "center",
                            padding: "14px 18px",
                            fontSize: 11,
                            lineHeight: 1.45,
                          }}
                        >
                          <div style={{ fontWeight: 700, marginBottom: 2 }}>The Bellagio Mansion</div>
                          <div>Jl. Mega Kuningan Timur</div>
                          <div>Kota Jakarta Selatan</div>
                          <div style={{ marginTop: 4, fontSize: 10, opacity: 0.95 }}>&copy; PT IDStar Cipta Teknologi</div>
                        </div>
                      </div>

                      {/* Disclaimer */}
                      <div
                        style={{
                          maxWidth: 620,
                          margin: "10px auto 0",
                          fontSize: 9.5,
                          color: "#6b7280",
                          lineHeight: 1.4,
                          fontStyle: "italic",
                          padding: "0 6px",
                        }}
                      >
                        This email and any attachments are confidential and intended solely for the use of the individual or entity to whom they are addressed. If you have received this email in error, please notify the sender immediately and delete it from your system. Any unauthorized use, disclosure, or distribution of this email and its attachments is strictly prohibited.
                      </div>
                    </div>
                  ) : (
                    /* Mode 2: Raw Text Editor */
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
                  )}
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
                    onClick={handleSalinHtml}
                    className="btn btn-secondary"
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      padding: "8px 12px",
                      color: salinSukses === "html" ? "#16a34a" : "#dc2626",
                    }}
                  >
                    {salinSukses === "html" ? "✓ Copied Rich HTML" : "📋 Copy Rich HTML"}
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
