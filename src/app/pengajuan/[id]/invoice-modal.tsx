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
        title="Cetak atau kirim Invoice Resmi PDF"
      >
        <span>📄 Cetak &amp; Kirim Invoice</span>
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
                  Invoice Resmi &mdash; PT IDStar Cipta Teknologi
                </h3>
                <p style={{ margin: "4px 0 0", fontSize: 12, color: "#64748b" }}>
                  No: <b style={{ color: "#0f172a" }}>{nomorInvoice}</b> &middot; PO:{" "}
                  <b style={{ color: "#0f172a" }}>{nomorPo}</b> &middot; Klien: {klien}
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
                📑 Format &amp; Unduh PDF
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
                <span>✉️ Kirim ke Email Personal</span>
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
                      1. Pilih Format Tata Letak (Layout Preset):
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
                            📑 Format Standar Rinci (Per-Talenta &amp; Prorata)
                          </div>
                          <div style={{ fontSize: 11.5, color: "#64748b", marginTop: 2 }}>
                            Menampilkan tabel rincian per masing-masing personel: nama talenta, nomor line PO, rasio hari kerja, dan rate bulanan lengkap. Cocok untuk kontrak Time &amp; Material.
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
                            📦 Format Ringkas / Konsolidasi (Lump Sum Proyek)
                          </div>
                          <div style={{ fontSize: 11.5, color: "#64748b", marginTop: 2 }}>
                            Menggabungkan seluruh talenta menjadi 1 baris paket jasa layanan per proyek tanpa rincian nama individu. Cocok untuk Finance/Procurement klien yang mensyaratkan invoice ringkas.
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
                            🌐 Format Bilingual (ID / EN Dwibahasa)
                          </div>
                          <div style={{ fontSize: 11.5, color: "#64748b", marginTop: 2 }}>
                            Judul, kolom rincian, dan klausul instruksi pembayaran disajikan dalam Bahasa Indonesia dan Bahasa Inggris. Standar baku untuk klien multinasional / regional.
                          </div>
                        </div>
                      </label>
                    </div>
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#1e293b", marginBottom: 8 }}>
                      2. Rekening Pembayaran Resmi di Dokumen:
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
                        BCA &amp; Mandiri (Semua)
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
                        }}
                      >
                        Khusus Bank Mandiri
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
                      Alamat Email Personal / Tujuan:
                    </label>
                    <input
                      type="email"
                      value={emailTujuan}
                      onChange={(e) => setEmailTujuan(e.target.value)}
                      placeholder="contoh: nama@gmail.com atau user@idstar.group"
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
                      <span style={{ color: "#64748b", alignSelf: "center" }}>Pintasan:</span>
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
                        👤 Email Saya ({userEmail})
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
                      Nama Penerima (Opsional):
                    </label>
                    <input
                      type="text"
                      value={namaPenerima}
                      onChange={(e) => setNamaPenerima(e.target.value)}
                      placeholder="Nama PIC atau Penerima"
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
                      Subjek Surel:
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
                        Isi Pesan Surat Pengantar &amp; Tautan Unduh PDF:
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
                        {salinSukses ? "✓ Tersalin ke Clipboard!" : "📋 Salin Teks"}
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
                      💡 Pesan sudah mencakup tautan langsung untuk mengunduh Invoice PDF resmi dengan format yang Anda pilih.
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
                Tutup
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
                    title="Catat riwayat pengiriman manual ini ke audit log sistem"
                  >
                    💾 {sedangKirim ? "Mencatat..." : "Catat ke Log"}
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
                    {salinSukses ? "✓ Tersalin" : "📋 Salin Pesan"}
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
                    title="Buka aplikasi email lokal (Outlook, Gmail, Thunderbird) dengan pesan terisi otomatis"
                  >
                    ✉️ Buka di Email Client (Mailto)
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
