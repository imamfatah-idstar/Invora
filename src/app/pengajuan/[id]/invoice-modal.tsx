"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
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
  tanggalFakturPajak?: string | null;
  namaFileFakturPajak?: string | null;
  pathFileFakturPajak?: string | null;
  nomorGrSlip?: string | null;
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
  tanggalFakturPajak,
  namaFileFakturPajak,
  pathFileFakturPajak,
  nomorGrSlip,
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
  const router = useRouter();
  const [buka, setBuka] = useState(false);
  const [tabAktif, setTabAktif] = useState<"edit" | "cetak" | "email">("edit");
  const [format, setFormat] = useState<"detail" | "ringkas">("detail");
  const [emailViewMode, setEmailViewMode] = useState<"preview" | "text">("preview");

  // State sinkron nilai invoice aktif
  const [curNomorInvoice, setCurNomorInvoice] = useState(nomorInvoice);
  const [curNomorFakturPajak, setCurNomorFakturPajak] = useState(nomorFakturPajak || "");
  const [curTanggalFakturPajak, setCurTanggalFakturPajak] = useState(tanggalFakturPajak || "");
  const [curNamaFileFakturPajak, setCurNamaFileFakturPajak] = useState(namaFileFakturPajak || "");
  const [curPathFileFakturPajak, setCurPathFileFakturPajak] = useState(pathFileFakturPajak || "");
  const [curNomorGrSlip, setCurNomorGrSlip] = useState(nomorGrSlip || "");
  const [curTanggalInvoice, setCurTanggalInvoice] = useState(tanggalInvoice);
  const [curTanggalJatuhTempo, setCurTanggalJatuhTempo] = useState(tanggalJatuhTempo);
  const [curTarifPpn, setCurTarifPpn] = useState(String(tarifPpn || 11));
  const [curDpp, setCurDpp] = useState(dpp);

  // State form edit
  const [editNomorInvoice, setEditNomorInvoice] = useState(nomorInvoice);
  const [editNomorFakturPajak, setEditNomorFakturPajak] = useState(nomorFakturPajak || "");
  const [editTanggalFakturPajak, setEditTanggalFakturPajak] = useState(tanggalFakturPajak || "");
  const [editNomorGrSlip, setEditNomorGrSlip] = useState(nomorGrSlip || "");
  const [editTanggalInvoice, setEditTanggalInvoice] = useState(tanggalInvoice);
  const [editTanggalJatuhTempo, setEditTanggalJatuhTempo] = useState(tanggalJatuhTempo);
  const [editTarifPpn, setEditTarifPpn] = useState(String(tarifPpn || 11));
  const [editDpp, setEditDpp] = useState(dpp);

  // State upload faktur pajak
  const [fileFakturPajak, setFileFakturPajak] = useState<File | null>(null);
  const [sedangUploadFp, setSedangUploadFp] = useState(false);
  const [errorUploadFp, setErrorUploadFp] = useState<string | null>(null);
  const [suksesUploadFp, setSuksesUploadFp] = useState<string | null>(null);

  const [sedangSimpanInvoice, setSedangSimpanInvoice] = useState(false);
  const [errorSimpanInvoice, setErrorSimpanInvoice] = useState<string | null>(null);
  const [suksesSimpanInvoice, setSuksesSimpanInvoice] = useState<string | null>(null);

  // Perhitungan dinamis
  const curPpn = Math.round((curDpp * Number(curTarifPpn || 0)) / 100);
  const curTotalTagihan = curDpp + curPpn;

  const editPpn = Math.round((Number(editDpp || 0) * Number(editTarifPpn || 0)) / 100);
  const editTotalTagihan = Number(editDpp || 0) + editPpn;

  // Sinkronisasi prop awal saat modal dibuka
  useEffect(() => {
    setCurNomorInvoice(nomorInvoice);
    setCurNomorFakturPajak(nomorFakturPajak || "");
    setCurTanggalFakturPajak(tanggalFakturPajak || "");
    setCurNamaFileFakturPajak(namaFileFakturPajak || "");
    setCurPathFileFakturPajak(pathFileFakturPajak || "");
    setCurNomorGrSlip(nomorGrSlip || "");
    setCurTanggalInvoice(tanggalInvoice);
    setCurTanggalJatuhTempo(tanggalJatuhTempo);
    setCurTarifPpn(String(tarifPpn || 11));
    setCurDpp(dpp);

    setEditNomorInvoice(nomorInvoice);
    setEditNomorFakturPajak(nomorFakturPajak || "");
    setEditTanggalFakturPajak(tanggalFakturPajak || "");
    setEditNomorGrSlip(nomorGrSlip || "");
    setEditTanggalInvoice(tanggalInvoice);
    setEditTanggalJatuhTempo(tanggalJatuhTempo);
    setEditTarifPpn(String(tarifPpn || 11));
    setEditDpp(dpp);
    setFileFakturPajak(null);
    setErrorUploadFp(null);
    setSuksesUploadFp(null);
  }, [buka, nomorInvoice, nomorFakturPajak, tanggalFakturPajak, namaFileFakturPajak, pathFileFakturPajak, nomorGrSlip, tanggalInvoice, tanggalJatuhTempo, dpp, tarifPpn]);

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
    return `/api/pengajuan/${pengajuanId}/invoice/pdf?format=${format}${download ? "&download=true" : ""}`;
  };

  // Pre-calculate formatted values for email
  const dueMonthYear = formatDueMonthYear(curTanggalJatuhTempo);
  const periodeShort = formatPeriodeShort(periode);
  const invoiceDateEnglish = formatInvoiceDateEnglish(curTanggalInvoice);
  const dueDateShort = formatDueDateShort(curTanggalJatuhTempo);
  const statusDue = determineDueStatus(curTanggalJatuhTempo);
  const amountStr = formatAmountNumber(curTotalTagihan);

  // Generate IDStar standard email template
  const generatedEmail = generateIdstarEmailTemplate({
    klien,
    periode,
    nomorInvoice: curNomorInvoice,
    tanggalInvoice: curTanggalInvoice,
    tanggalJatuhTempo: curTanggalJatuhTempo,
    netAmount: curTotalTagihan,
    monthYear: dueMonthYear,
    dueStatus: statusDue,
    baseUrl: typeof window !== "undefined" ? window.location.origin : undefined,
  });

  // Sinkronisasi template email
  useEffect(() => {
    setSubjekEmail(generatedEmail.subject);
    setPesanEmail(generatedEmail.plainText);
  }, [buka, klien, curNomorInvoice, curTotalTagihan, curTanggalJatuhTempo, curTanggalInvoice]);

  // Handler Upload Faktur Pajak
  async function handleUploadFakturPajak(e: React.FormEvent) {
    e.preventDefault();
    if (!fileFakturPajak) {
      setErrorUploadFp("Pilih file Faktur Pajak (PDF/JPG/PNG) terlebih dahulu.");
      return;
    }
    setSedangUploadFp(true);
    setErrorUploadFp(null);
    setSuksesUploadFp(null);

    const fd = new FormData();
    fd.append("file", fileFakturPajak);

    try {
      const res = await fetch(`/api/pengajuan/${pengajuanId}/faktur-pajak`, {
        method: "POST",
        body: fd,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Gagal mengunggah file Faktur Pajak");
      }
      setCurNamaFileFakturPajak(data.namaFile);
      setCurPathFileFakturPajak(data.pathFile);
      setSuksesUploadFp("✓ Berkas Faktur Pajak berhasil diunggah dan otomatis dimerge ke Invoice!");
      setFileFakturPajak(null);
      router.refresh();
    } catch (err: unknown) {
      setErrorUploadFp(err instanceof Error ? err.message : "Terjadi kesalahan upload");
    } finally {
      setSedangUploadFp(false);
    }
  }

  // Handler Hapus Faktur Pajak
  async function handleHapusFakturPajak() {
    if (!confirm("Hapus berkas Faktur Pajak yang tersimpan?")) return;
    setSedangUploadFp(true);
    setErrorUploadFp(null);
    setSuksesUploadFp(null);

    try {
      const res = await fetch(`/api/pengajuan/${pengajuanId}/faktur-pajak`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Gagal menghapus berkas Faktur Pajak");
      setCurNamaFileFakturPajak("");
      setCurPathFileFakturPajak("");
      setSuksesUploadFp("Berkas Faktur Pajak berhasil dihapus.");
      router.refresh();
    } catch (err: unknown) {
      setErrorUploadFp(err instanceof Error ? err.message : "Gagal menghapus");
    } finally {
      setSedangUploadFp(false);
    }
  }

  // Handler Simpan Perubahan Invoice
  async function handleSimpanInvoice(e: React.FormEvent) {
    e.preventDefault();
    setSedangSimpanInvoice(true);
    setErrorSimpanInvoice(null);
    setSuksesSimpanInvoice(null);

    try {
      const res = await fetch(`/api/pengajuan/${pengajuanId}/status-proses`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nomorInvoice: editNomorInvoice,
          tanggalInvoice: editTanggalInvoice,
          tanggalSubmitInvoice: editTanggalInvoice,
          nomorFakturPajak: editNomorFakturPajak,
          tanggalFakturPajak: editTanggalFakturPajak,
          nomorGrSlip: editNomorGrSlip,
          tarifPpn: editTarifPpn,
          nilaiGrDisetujui: editDpp,
          isEditInvoice: true,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Gagal menyimpan perubahan invoice");
      }

      setCurNomorInvoice(editNomorInvoice);
      setCurTanggalInvoice(editTanggalInvoice);
      setCurTanggalJatuhTempo(editTanggalJatuhTempo);
      setCurNomorFakturPajak(editNomorFakturPajak);
      setCurTanggalFakturPajak(editTanggalFakturPajak);
      setCurNomorGrSlip(editNomorGrSlip);
      setCurTarifPpn(editTarifPpn);
      setCurDpp(editDpp);

      setSuksesSimpanInvoice("✓ Perubahan data invoice berhasil disimpan!");
      router.refresh();
    } catch (err: unknown) {
      setErrorSimpanInvoice(err instanceof Error ? err.message : "Terjadi kesalahan saat menyimpan");
    } finally {
      setSedangSimpanInvoice(false);
    }
  }

  // Handler Pratinjau PDF
  const handlePratinjau = () => {
    window.open(buildUrl(false), "_blank");
  };

  // Handler Unduh PDF
  const handleUnduh = () => {
    const link = document.createElement("a");
    link.href = buildUrl(true);
    link.download = `Invoice-${curNomorInvoice.replace(/[^a-zA-Z0-9_-]/g, "_")}.pdf`;
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
      <div style={{ display: "inline-flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <button
          type="button"
          onClick={() => {
            setTabAktif("edit");
            setBuka(true);
          }}
          className="btn"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            fontWeight: 600,
            padding: "8px 14px",
            borderRadius: 6,
            cursor: "pointer",
            backgroundColor: "#ffffff",
            borderColor: "#cbd5e1",
            color: "#0f172a",
          }}
          title="Edit invoice number, date, tax invoice, and amount"
        >
          <span>✏️ Edit Invoice</span>
        </button>
        <button
          type="button"
          onClick={() => {
            setTabAktif("cetak");
            setBuka(true);
          }}
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
      </div>

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
                  Invoice No: <b style={{ color: "#0f172a" }}>{curNomorInvoice}</b> &middot; PO:{" "}
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
                gap: 4,
              }}
            >
              <button
                type="button"
                onClick={() => setTabAktif("edit")}
                style={{
                  padding: "10px 16px",
                  fontSize: 13,
                  fontWeight: 600,
                  border: "none",
                  borderBottom: `2px solid ${tabAktif === "edit" ? "#ea242a" : "transparent"}`,
                  color: tabAktif === "edit" ? "#ea242a" : "#64748b",
                  backgroundColor: "transparent",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <span>✏️ Edit Invoice Details</span>
              </button>
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
                <span>✉️ Official Email Template</span>
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

              {/* TAB 0: FORM EDIT INVOICE */}
              {tabAktif === "edit" && (
                <form onSubmit={handleSimpanInvoice} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  {suksesSimpanInvoice && (
                    <div
                      style={{
                        padding: "10px 14px",
                        borderRadius: 6,
                        fontSize: 13,
                        backgroundColor: "#f0fdf4",
                        color: "#166534",
                        border: "1px solid #bbf7d0",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <span>{suksesSimpanInvoice}</span>
                      <button
                        type="button"
                        onClick={() => setTabAktif("cetak")}
                        style={{
                          background: "none",
                          border: "none",
                          color: "#166534",
                          textDecoration: "underline",
                          fontWeight: 600,
                          cursor: "pointer",
                          fontSize: 12,
                        }}
                      >
                        Buka PDF Layout &rarr;
                      </button>
                    </div>
                  )}

                  {errorSimpanInvoice && (
                    <div
                      style={{
                        padding: "10px 14px",
                        borderRadius: 6,
                        fontSize: 13,
                        backgroundColor: "#fef2f2",
                        color: "#991b1b",
                        border: "1px solid #fecaca",
                      }}
                    >
                      {errorSimpanInvoice}
                    </div>
                  )}

                  <div>
                    <h4 style={{ margin: "0 0 6px 0", fontSize: 14, color: "#0f172a" }}>
                      1. Identitas &amp; Penomoran Invoice
                    </h4>
                    <p style={{ margin: "0 0 12px 0", fontSize: 12, color: "#64748b" }}>
                      Atur nomor invoice resmi, tanggal terbit, dan tanggal jatuh tempo pembayaran.
                    </p>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
                      <div className="field">
                        <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4 }}>
                          Nomor Invoice <span style={{ color: "#ea242a" }}>*</span>
                        </label>
                        <input
                          type="text"
                          value={editNomorInvoice}
                          onChange={(e) => setEditNomorInvoice(e.target.value)}
                          placeholder="e.g. 798/INV-IDS/IX/2026"
                          required
                          style={{ width: "100%", padding: "8px 10px", fontSize: 13, borderRadius: 6, border: "1px solid #cbd5e1" }}
                        />
                      </div>
                      <div className="field">
                        <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4 }}>
                          Tanggal Invoice
                        </label>
                        <input
                          type="date"
                          value={editTanggalInvoice}
                          onChange={(e) => setEditTanggalInvoice(e.target.value)}
                          style={{ width: "100%", padding: "8px 10px", fontSize: 13, borderRadius: 6, border: "1px solid #cbd5e1" }}
                        />
                      </div>
                      <div className="field">
                        <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4 }}>
                          Tanggal Jatuh Tempo (Due Date)
                        </label>
                        <input
                          type="date"
                          value={editTanggalJatuhTempo}
                          onChange={(e) => setEditTanggalJatuhTempo(e.target.value)}
                          style={{ width: "100%", padding: "8px 10px", fontSize: 13, borderRadius: 6, border: "1px solid #cbd5e1" }}
                        />
                      </div>
                    </div>
                  </div>

                  <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: 14 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                      <h4 style={{ margin: 0, fontSize: 14, color: "#0f172a" }}>
                        2. Upload Faktur Pajak Resmi (Wajib) &amp; Referensi GR
                      </h4>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 4, backgroundColor: curPathFileFakturPajak ? "#dcfce7" : "#fee2e2", color: curPathFileFakturPajak ? "#166534" : "#991b1b" }}>
                        {curPathFileFakturPajak ? "✓ Faktur Pajak Terunggah" : "⚠️ Wajib Upload"}
                      </span>
                    </div>
                    <p style={{ margin: "0 0 12px 0", fontSize: 12, color: "#64748b" }}>
                      Upload dokumen Faktur Pajak resmi (PDF atau gambar). Berkas ini akan <b>otomatis digabungkan (merge)</b> sebagai lampiran resmi di belakang lembar invoice.
                    </p>

                    {/* Area Unggah Berkas Faktur Pajak */}
                    <div
                      style={{
                        padding: "14px",
                        backgroundColor: curPathFileFakturPajak ? "#f0fdf4" : "#fff7ed",
                        border: `1.5px dashed ${curPathFileFakturPajak ? "#86efac" : "#fdba74"}`,
                        borderRadius: 8,
                        marginBottom: 14,
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: "#0f172a" }}>
                            📄 Berkas Faktur Pajak (e-Faktur DJP)
                          </div>
                          {curPathFileFakturPajak ? (
                            <div style={{ fontSize: 12, color: "#15803d", marginTop: 2, display: "flex", alignItems: "center", gap: 6 }}>
                              <span>✓ File aktif: <b>{curNamaFileFakturPajak || "Faktur_Pajak.pdf"}</b></span>
                              <span style={{ color: "#94a3b8" }}>&middot;</span>
                              <a
                                href={`/${curPathFileFakturPajak}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{ color: "#2563eb", textDecoration: "underline", fontWeight: 600 }}
                              >
                                Lihat File ↗
                              </a>
                            </div>
                          ) : (
                            <div style={{ fontSize: 12, color: "#c2410c", marginTop: 2 }}>
                              Belum ada berkas Faktur Pajak yang diunggah. Silakan pilih file di bawah ini.
                            </div>
                          )}
                        </div>

                        {curPathFileFakturPajak && (
                          <button
                            type="button"
                            onClick={handleHapusFakturPajak}
                            disabled={sedangUploadFp}
                            style={{
                              backgroundColor: "#fee2e2",
                              color: "#991b1b",
                              border: "1px solid #fecaca",
                              borderRadius: 4,
                              padding: "4px 10px",
                              fontSize: 12,
                              fontWeight: 600,
                              cursor: sedangUploadFp ? "not-allowed" : "pointer",
                            }}
                          >
                            Hapus File
                          </button>
                        )}
                      </div>

                      {/* Form / Input Upload File */}
                      <div style={{ marginTop: 12, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                        <input
                          type="file"
                          accept=".pdf,image/png,image/jpeg,image/jpg"
                          onChange={(e) => setFileFakturPajak(e.target.files?.[0] || null)}
                          style={{ fontSize: 12.5 }}
                        />
                        <button
                          type="button"
                          onClick={handleUploadFakturPajak}
                          disabled={!fileFakturPajak || sedangUploadFp}
                          style={{
                            backgroundColor: fileFakturPajak ? "#16a34a" : "#94a3b8",
                            color: "#ffffff",
                            border: "none",
                            borderRadius: 6,
                            padding: "6px 14px",
                            fontSize: 12.5,
                            fontWeight: 600,
                            cursor: !fileFakturPajak || sedangUploadFp ? "not-allowed" : "pointer",
                          }}
                        >
                          {sedangUploadFp ? "Mengunggah..." : "⬆️ Upload & Merge Faktur Pajak"}
                        </button>
                      </div>

                      {errorUploadFp && (
                        <div style={{ color: "#dc2626", fontSize: 12, marginTop: 8, fontWeight: 600 }}>
                          ❌ {errorUploadFp}
                        </div>
                      )}
                      {suksesUploadFp && (
                        <div style={{ color: "#16a34a", fontSize: 12, marginTop: 8, fontWeight: 600 }}>
                          {suksesUploadFp}
                        </div>
                      )}
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
                      <div className="field">
                        <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4 }}>
                          Nomor Faktur Pajak
                        </label>
                        <input
                          type="text"
                          value={editNomorFakturPajak}
                          onChange={(e) => setEditNomorFakturPajak(e.target.value)}
                          placeholder="e.g. 010.002-26.12345678"
                          style={{ width: "100%", padding: "8px 10px", fontSize: 13, borderRadius: 6, border: "1px solid #cbd5e1" }}
                        />
                      </div>
                      <div className="field">
                        <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4 }}>
                          Tanggal Faktur Pajak
                        </label>
                        <input
                          type="date"
                          value={editTanggalFakturPajak}
                          onChange={(e) => setEditTanggalFakturPajak(e.target.value)}
                          style={{ width: "100%", padding: "8px 10px", fontSize: 13, borderRadius: 6, border: "1px solid #cbd5e1" }}
                        />
                      </div>
                      <div className="field">
                        <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4 }}>
                          Nomor GR Slip / ES Slip
                        </label>
                        <input
                          type="text"
                          value={editNomorGrSlip}
                          onChange={(e) => setEditNomorGrSlip(e.target.value)}
                          placeholder="e.g. 2000565039"
                          style={{ width: "100%", padding: "8px 10px", fontSize: 13, borderRadius: 6, border: "1px solid #cbd5e1" }}
                        />
                      </div>
                    </div>
                  </div>

                  <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: 14 }}>
                    <h4 style={{ margin: "0 0 6px 0", fontSize: 14, color: "#0f172a" }}>
                      3. Nilai Tagihan (DPP &amp; PPN)
                    </h4>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
                      <div className="field">
                        <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4 }}>
                          Dasar Pengenaan Pajak (DPP / Nilai GR)
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={editDpp}
                          onChange={(e) => setEditDpp(Number(e.target.value))}
                          style={{ width: "100%", padding: "8px 10px", fontSize: 13, borderRadius: 6, border: "1px solid #cbd5e1" }}
                        />
                      </div>
                      <div className="field">
                        <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4 }}>
                          Tarif PPN
                        </label>
                        <select
                          value={editTarifPpn}
                          onChange={(e) => setEditTarifPpn(e.target.value)}
                          style={{ width: "100%", padding: "8px 10px", fontSize: 13, borderRadius: 6, border: "1px solid #cbd5e1" }}
                        >
                          <option value="11.00">11% (Standard UU HPP)</option>
                          <option value="12.00">12% (Penyesuaian PPN)</option>
                          <option value="0.00">0% (Bebas PPN / Non-PKP)</option>
                        </select>
                      </div>
                    </div>

                    {/* Live Calculation Preview Card */}
                    <div
                      style={{
                        marginTop: 14,
                        padding: "12px 16px",
                        backgroundColor: "#f8fafc",
                        border: "1px dashed #cbd5e1",
                        borderRadius: 8,
                        fontSize: 13,
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                        <span style={{ color: "#64748b" }}>DPP (Dasar Pengenaan Pajak):</span>
                        <b>{formatRp(Number(editDpp || 0))}</b>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                        <span style={{ color: "#64748b" }}>PPN ({editTarifPpn}%):</span>
                        <b>{formatRp(editPpn)}</b>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          paddingTop: 8,
                          borderTop: "1px solid #e2e8f0",
                          fontSize: 14,
                        }}
                      >
                        <span style={{ fontWeight: 700, color: "#0f172a" }}>Total Nilai Tagihan Invoice:</span>
                        <span style={{ fontWeight: 800, color: "#ea242a", fontSize: 15 }}>
                          {formatRp(editTotalTagihan)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 10 }}>
                    <button
                      type="button"
                      onClick={() => setBuka(false)}
                      className="btn"
                      disabled={sedangSimpanInvoice}
                    >
                      Tutup
                    </button>
                    <button
                      type="submit"
                      disabled={sedangSimpanInvoice}
                      style={{
                        backgroundColor: "#ea242a",
                        color: "#ffffff",
                        border: "none",
                        padding: "9px 18px",
                        borderRadius: 6,
                        fontWeight: 600,
                        fontSize: 13,
                        cursor: sedangSimpanInvoice ? "not-allowed" : "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      {sedangSimpanInvoice ? "Menyimpan Perubahan..." : "💾 Simpan Perubahan Invoice"}
                    </button>
                  </div>
                </form>
              )}

              {/* TAB 1: FORMAT & UNDUH PDF */}
              {tabAktif === "cetak" && (
                <>
                  <div>
                    <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#1e293b", marginBottom: 8 }}>
                      Select Layout Preset (Single Language):
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
                      <b style={{ color: "#0f172a" }}>{formatRp(curDpp)}</b> &middot;{" "}
                      <span style={{ color: "#64748b" }}>PPN ({curTarifPpn}%): </span>
                      <b style={{ color: "#0f172a" }}>{formatRp(curPpn)}</b>
                    </div>
                    <div>
                      <span style={{ color: "#64748b" }}>Total: </span>
                      <b style={{ color: "#ea242a", fontSize: 13 }}>{formatRp(curTotalTagihan)}</b>
                    </div>
                  </div>

                  {/* Status Merge Faktur Pajak */}
                  <div
                    style={{
                      padding: "10px 14px",
                      borderRadius: 8,
                      fontSize: 12.5,
                      backgroundColor: curPathFileFakturPajak ? "#f0fdf4" : "#fff7ed",
                      border: `1px solid ${curPathFileFakturPajak ? "#bbf7d0" : "#fed7aa"}`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 10,
                    }}
                  >
                    <div>
                      {curPathFileFakturPajak ? (
                        <span style={{ color: "#166534", fontWeight: 600 }}>
                          ✓ Faktur Pajak Terlampir: <b>{curNamaFileFakturPajak || "Faktur Pajak"}</b> akan otomatis dimerge sebagai halaman berikutnya pada PDF Invoice.
                        </span>
                      ) : (
                        <span style={{ color: "#c2410c", fontWeight: 600 }}>
                          ⚠️ Faktur Pajak belum diunggah. Silakan buka tab <b>Edit Invoice Details</b> untuk mengunggah Faktur Pajak.
                        </span>
                      )}
                    </div>
                    {!curPathFileFakturPajak && (
                      <button
                        type="button"
                        onClick={() => setTabAktif("edit")}
                        style={{
                          backgroundColor: "#ea242a",
                          color: "#ffffff",
                          border: "none",
                          padding: "4px 10px",
                          borderRadius: 4,
                          fontSize: 11.5,
                          fontWeight: 600,
                          cursor: "pointer",
                          whiteSpace: "nowrap",
                        }}
                      >
                        Upload Sekarang &rarr;
                      </button>
                    )}
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
