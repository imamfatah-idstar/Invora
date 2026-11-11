"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import TombolCetak from "./tombol-cetak";
import CheckerApprovalBar from "./checker-approval-bar";
import {
  formatTanggalDokumen,
  formatPeriodeBulan,
  formatRupiahKoma,
} from "@/lib/xl-document-helpers";

type LampiranData = {
  id: number;
  namaFile: string;
  url: string;
};

type Props = {
  pengajuanId: number;
  dokumenId: number;
  dokumenVersi: number;
  nomorPo: string;
  namaProyek: string;
  periode: string;
  poValue: string | number;
  grValue: string | number;
  defaultUserXlNama: string;
  defaultUserXlJabatan?: string;
  defaultFinanceNama?: string;
  defaultFinanceJabatan?: string;
  defaultTermsPayment?: string;
  defaultContractStatus?: string;
  defaultLocationSap?: string;
  defaultProjectLocation?: string;
  dibuatPada: string;
  approvalData?: {
    status: string;
    disetujuiPada?: string | null;
    namaChecker?: string | null;
    catatanChecker?: string | null;
    userRole: string;
    userNama: string;
  };
  lampiranBalance?: LampiranData | null;
};

export default function CacXlView({
  pengajuanId,
  dokumenId,
  dokumenVersi,
  nomorPo,
  namaProyek,
  periode,
  poValue,
  grValue,
  defaultUserXlNama,
  defaultUserXlJabatan = "GM Integration Service & Ai Orchestration",
  defaultFinanceNama = "Dewi Ani Mulyakarti",
  defaultFinanceJabatan = "Finance Manager",
  defaultTermsPayment = "9 Months",
  defaultContractStatus = "Amend Signed",
  defaultLocationSap = "0010",
  defaultProjectLocation = "Headquarter",
  dibuatPada,
  approvalData,
  lampiranBalance = null,
}: Props) {
  const router = useRouter();
  const tglDefault = formatTanggalDokumen();
  const { workCompletedDate } = formatPeriodeBulan(periode);

  const [dateOfCreation, setDateOfCreation] = useState(tglDefault);
  const [userXlNama, setUserXlNama] = useState(defaultUserXlNama || "Ratna Tri Wulandari");
  const [userXlJabatan, setUserXlJabatan] = useState(defaultUserXlJabatan);
  const [financeNama, setFinanceNama] = useState(defaultFinanceNama);
  const [financeJabatan, setFinanceJabatan] = useState(defaultFinanceJabatan);
  const [termsPayment, setTermsPayment] = useState(defaultTermsPayment);
  const [contractStatus, setContractStatus] = useState(defaultContractStatus);
  const [projectLocation, setProjectLocation] = useState(defaultProjectLocation);
  const [locationSap, setLocationSap] = useState(defaultLocationSap);
  const [workCompleted, setWorkCompleted] = useState(workCompletedDate);
  const [showConfig, setShowConfig] = useState(false);

  // Lampiran state & upload modal
  const [lampiran, setLampiran] = useState<LampiranData | null>(lampiranBalance);
  const [bukaModalUpload, setBukaModalUpload] = useState(false);
  const [fileUpload, setFileUpload] = useState<File | null>(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  function handlePilihFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    setFileUpload(f);
    setUploadError(null);
    if (f && f.type.startsWith("image/")) {
      setPreviewUrl(URL.createObjectURL(f));
    } else {
      setPreviewUrl(null);
    }
  }

  async function handleUploadLampiran(e: React.FormEvent) {
    e.preventDefault();
    if (!fileUpload) {
      setUploadError("Pilih file gambar/lampiran terlebih dahulu.");
      return;
    }
    setUploadLoading(true);
    setUploadError(null);

    const fd = new FormData();
    fd.append("label", "Lampiran Balance PO");
    fd.append("file", fileUpload);

    try {
      const res = await fetch(`/api/pengajuan/${pengajuanId}/lampiran`, {
        method: "POST",
        body: fd,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setUploadError(data.error ?? "Gagal mengunggah lampiran.");
        setUploadLoading(false);
        return;
      }
      setLampiran({
        id: data.id,
        namaFile: data.namaFile,
        url: `/api/pengajuan/${pengajuanId}/lampiran/${data.id}`,
      });
      setBukaModalUpload(false);
      setFileUpload(null);
      setPreviewUrl(null);
      setUploadLoading(false);
      router.refresh();
    } catch {
      setUploadError("Terjadi kesalahan jaringan saat mengunggah.");
      setUploadLoading(false);
    }
  }

  async function handleHapusLampiran() {
    if (!lampiran) return;
    if (!confirm(`Hapus lampiran "${lampiran.namaFile}"?`)) return;
    try {
      const res = await fetch(`/api/pengajuan/${pengajuanId}/lampiran/${lampiran.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setLampiran(null);
        router.refresh();
      } else {
        alert("Gagal menghapus lampiran.");
      }
    } catch {
      alert("Kesalahan jaringan.");
    }
  }

  const downloadPdfUrl = `/api/pengajuan/${pengajuanId}/dokumen/${dokumenId}/pdf?tgl=${encodeURIComponent(dateOfCreation)}&termsPayment=${encodeURIComponent(termsPayment)}&contractStatus=${encodeURIComponent(contractStatus)}&projectLocation=${encodeURIComponent(projectLocation)}&locationSap=${encodeURIComponent(locationSap)}&workCompleted=${encodeURIComponent(workCompleted)}&pihak1Nama=${encodeURIComponent(userXlNama)}&pihak1Jabatan=${encodeURIComponent(userXlJabatan)}&pihak2Nama=${encodeURIComponent(financeNama)}&pihak2Jabatan=${encodeURIComponent(financeJabatan)}`;

  return (
    <div className="doc-page">
      {/* Top Toolbar */}
      <div className="doc-toolbar no-print">
        <Link href={`/pengajuan/${pengajuanId}`} className="back-link">
          &larr; Submission Details
        </Link>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <button
            type="button"
            className="btn"
            onClick={() => setShowConfig(!showConfig)}
          >
            {showConfig ? "Hide Settings" : "⚙️ Edit Certificate Info"}
          </button>
          <button
            type="button"
            className="btn"
            style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
            onClick={() => setBukaModalUpload(true)}
          >
            <span>📎</span>
            <span>{lampiran ? "Edit Lampiran CAC" : "Unggah Lampiran CAC"}</span>
          </button>
          <TombolCetak />
          <a
            href={downloadPdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-secondary"
            style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
          >
            <span>📥 Download PDF</span>
          </a>
          <a
            href="https://www.getapprove.xlsmart.co.id/auth/login?nexturl=%252Fapproval-document%2523id%253Dcc5582a1-9e20-4926-865d-9e7d9c65b73c"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              backgroundColor: "#002d72",
              borderColor: "#002d72",
              color: "#ffffff",
              fontWeight: 600,
              textDecoration: "none",
            }}
            title="Redirect to official XL Get Approve Portal"
          >
            <span>🚀 Redirect to official XL Get Approve Portal</span>
            <span style={{ fontSize: 12 }}>↗</span>
          </a>
        </div>
      </div>

      {/* Configuration Card */}
      {showConfig && (
        <div className="card no-print" style={{ marginBottom: 20, background: "#fafbfc" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>
              ⚙️ XLSMART CAC Certificate Settings
            </h3>
            <span style={{ fontSize: 12, color: "var(--color-text-muted)" }}>
              Changes sync directly to the certificate below and downloaded PDF
            </span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
            <div className="field">
              <label>Date of Creation</label>
              <input
                type="text"
                value={dateOfCreation}
                onChange={(e) => setDateOfCreation(e.target.value)}
                placeholder="e.g. 28 Oct 2026"
              />
            </div>
            <div className="field">
              <label>Terms Payment</label>
              <input
                type="text"
                value={termsPayment}
                onChange={(e) => setTermsPayment(e.target.value)}
                placeholder="e.g. 9 Months"
              />
            </div>
            <div className="field">
              <label>Work Completed Date</label>
              <input
                type="text"
                value={workCompleted}
                onChange={(e) => setWorkCompleted(e.target.value)}
                placeholder="e.g. 30 Sept 2026"
              />
            </div>
            <div className="field">
              <label>Contract Status</label>
              <input
                type="text"
                value={contractStatus}
                onChange={(e) => setContractStatus(e.target.value)}
                placeholder="e.g. Amend Signed"
              />
            </div>
            <div className="field">
              <label>Project Location</label>
              <input
                type="text"
                value={projectLocation}
                onChange={(e) => setProjectLocation(e.target.value)}
                placeholder="e.g. Headquarter"
              />
            </div>
            <div className="field">
              <label>Functional Location in SAP</label>
              <input
                type="text"
                value={locationSap}
                onChange={(e) => setLocationSap(e.target.value)}
                placeholder="e.g. 0010"
              />
            </div>
            <div className="field">
              <label>IDStar Signatory Name</label>
              <input
                type="text"
                value={financeNama}
                onChange={(e) => setFinanceNama(e.target.value)}
                placeholder="e.g. Dewi Ani Mulyakarti"
              />
            </div>
            <div className="field">
              <label>IDStar Signatory Title</label>
              <input
                type="text"
                value={financeJabatan}
                onChange={(e) => setFinanceJabatan(e.target.value)}
                placeholder="e.g. Finance Manager"
              />
            </div>
            <div className="field">
              <label>XL Signatory Name</label>
              <input
                type="text"
                value={userXlNama}
                onChange={(e) => setUserXlNama(e.target.value)}
                placeholder="e.g. Ratna Tri Wulandari"
              />
            </div>
            <div className="field">
              <label>XL Signatory Title</label>
              <input
                type="text"
                value={userXlJabatan}
                onChange={(e) => setUserXlJabatan(e.target.value)}
                placeholder="e.g. GM Integration Service & Ai Orchestration"
              />
            </div>
          </div>
        </div>
      )}

      {/* Checker Approval Bar */}
      {approvalData && (
        <CheckerApprovalBar
          pengajuanId={pengajuanId}
          dokumenId={dokumenId}
          jenis="CAC"
          statusAwal={approvalData.status}
          disetujuiPadaAwal={approvalData.disetujuiPada}
          namaCheckerAwal={approvalData.namaChecker}
          catatanCheckerAwal={approvalData.catatanChecker}
          userRole={approvalData.userRole}
          userNama={approvalData.userNama}
        />
      )}

      {/* ========================================================================= */}
      {/* HALAMAN 1: CAC CERTIFICATE (Mengikuti contoh_cac.pdf Page 1)               */}
      {/* ========================================================================= */}
      <div
        className="doc-sheet"
        style={{
          padding: "45px 55px",
          background: "#ffffff",
          fontFamily: "Arial, Helvetica, sans-serif",
          color: "#000000",
          boxShadow: "0 4px 14px rgba(0,0,0,0.08)",
          borderRadius: 4,
          maxWidth: 820,
          margin: "0 auto 35px auto",
          minHeight: 1040,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          boxSizing: "border-box",
        }}
      >
        <div>
          {/* Top-Right XL Logo */}
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
            <img
              src="/xlsmart-logo.png"
              alt="XLSMART"
              style={{ height: 38, width: "auto", display: "block" }}
            />
          </div>

          {/* Title */}
          <div style={{ textAlign: "center", marginBottom: 24 }}>
            <h2 style={{ fontSize: 16.5, fontWeight: "bold", margin: 0, letterSpacing: 0.5 }}>
              COMMERCIAL ACCEPTANCE CERTIFICATE
            </h2>
          </div>

          {/* Key-Value Info Grid matching contoh_cac.pdf */}
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11.5, marginBottom: 22, lineHeight: 1.55 }}>
            <tbody>
              <tr>
                <td style={{ width: 220, padding: "2px 0" }}>Date of Creation</td>
                <td style={{ padding: "2px 0" }}>: {dateOfCreation}</td>
              </tr>
              <tr>
                <td style={{ padding: "2px 0" }}>Supplier Name</td>
                <td style={{ padding: "2px 0" }}>: PT. IDStar Cipta Teknologi</td>
              </tr>
              <tr>
                <td style={{ padding: "2px 0" }}>Status of Acceptance</td>
                <td style={{ padding: "2px 0" }}>: 100 %</td>
              </tr>
              <tr>
                <td style={{ padding: "2px 0" }}>Project Name</td>
                <td style={{ padding: "2px 0" }}>: {namaProyek}</td>
              </tr>
              <tr>
                <td style={{ padding: "2px 0" }}>Contract Status</td>
                <td style={{ padding: "2px 0" }}>: {contractStatus}</td>
              </tr>
              <tr>
                <td style={{ padding: "2px 0" }}>Terms Payment</td>
                <td style={{ padding: "2px 0" }}>: {termsPayment}</td>
              </tr>
              <tr>
                <td style={{ padding: "2px 0" }}>Purchase Order</td>
                <td style={{ padding: "2px 0" }}>: {nomorPo}</td>
              </tr>
              <tr>
                <td style={{ padding: "2px 0" }}>Project Location</td>
                <td style={{ padding: "2px 0" }}>: {projectLocation}</td>
              </tr>
              <tr>
                <td style={{ padding: "2px 0" }}>Functional Location in SAP</td>
                <td style={{ padding: "2px 0" }}>: {locationSap}</td>
              </tr>
              <tr>
                <td style={{ padding: "2px 0" }}>Work Completed</td>
                <td style={{ padding: "2px 0" }}>: {workCompleted}</td>
              </tr>
              <tr>
                <td style={{ padding: "2px 0" }}>PO Value</td>
                <td style={{ padding: "2px 0" }}>: {formatRupiahKoma(poValue)}</td>
              </tr>
              <tr>
                <td style={{ padding: "2px 0" }}>GR Value</td>
                <td style={{ padding: "2px 0" }}>: {formatRupiahKoma(grValue)}</td>
              </tr>
              <tr>
                <td style={{ padding: "2px 0" }}>Type of Project</td>
                <td style={{ padding: "2px 0" }}>: Services</td>
              </tr>
              <tr>
                <td style={{ padding: "2px 0" }}>Delivery Date (for Material)</td>
                <td style={{ padding: "2px 0" }}>:</td>
              </tr>
              <tr>
                <td style={{ padding: "2px 0" }}>Receipt Date (for Material)</td>
                <td style={{ padding: "2px 0" }}>:</td>
              </tr>
            </tbody>
          </table>

          {/* Certification Text */}
          <div style={{ fontSize: 11.5, lineHeight: 1.5, marginBottom: 28 }}>
            <div style={{ fontWeight: "bold", textDecoration: "underline", marginBottom: 4 }}>
              Certification:
            </div>
            <p style={{ margin: "0 0 10px 0" }}>
              This is to certify that PT XLSMART Telecom Sejahtera Tbk has accepted the Product or Services as identified in Purchase Order referenced above.
            </p>
            <p style={{ margin: 0 }}>
              With the approval by both party, The Supplier entitle to issue invoice starting from the date of vendor approved date and PT XLSMART Telecom Sejahtera Tbk will release payment as stated in the Value of GR.
            </p>
          </div>

          {/* Dual Signatures matching contoh_cac.pdf */}
          <div style={{ marginTop: 36, fontSize: 11.5 }}>
            {/* Supplier Signatory */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 28 }}>
              <div>
                <div style={{ fontWeight: "bold" }}>{financeNama}</div>
                <div>{financeJabatan}</div>
              </div>
              <div style={{ textAlign: "right", position: "relative" }}>
                {/* IDStar Stamp */}
                <img
                  src="/idstar-stamp.png"
                  alt="IDStar Stamp"
                  style={{ height: 38, position: "absolute", right: 60, bottom: 20 }}
                />
                <div style={{ letterSpacing: "1px", marginBottom: 4 }}>
                  _______________________________
                </div>
                <div>Date: {dateOfCreation}</div>
              </div>
            </div>

            {/* Client Signatory */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
              <div>
                <div style={{ fontWeight: "bold" }}>{userXlNama}</div>
                <div>{userXlJabatan}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ letterSpacing: "1px", marginBottom: 4 }}>
                  _______________________________
                </div>
                <div>Date:</div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Halaman 1 */}
        <div style={{ marginTop: 40, fontSize: 9.5, color: "#333333", lineHeight: 1.4 }}>
          <div>Confidential and Proprietary to PT XLSMART Telecom Sejahtera Tbk</div>
          <div>This script can be used as supporting document for invoice submission to XL</div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* HALAMAN 2: LAMPIRAN CAC (Mengikuti contoh_cac.pdf Page 2)                  */}
      {/* ========================================================================= */}
      <div
        className="doc-sheet doc-sheet-page2"
        style={{
          padding: "45px 55px",
          background: "#ffffff",
          fontFamily: "Arial, Helvetica, sans-serif",
          color: "#000000",
          boxShadow: "0 4px 14px rgba(0,0,0,0.08)",
          borderRadius: 4,
          maxWidth: 820,
          margin: "0 auto",
          minHeight: 1040,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          boxSizing: "border-box",
          pageBreakBefore: "always",
          breakBefore: "page",
        }}
      >
        <div>
          {/* Top-Right XL Logo */}
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
            <img
              src="/xlsmart-logo.png"
              alt="XLSMART"
              style={{ height: 38, width: "auto", display: "block" }}
            />
          </div>

          {/* Title */}
          <div style={{ textAlign: "center", marginBottom: 24 }}>
            <h2 style={{ fontSize: 16.5, fontWeight: "bold", margin: 0, letterSpacing: 0.5 }}>
              COMMERCIAL ACCEPTANCE CERTIFICATE
            </h2>
          </div>

          {/* Lampiran Header */}
          <div style={{ fontSize: 13, fontWeight: "bold", margin: "14px 0 18px 0" }}>
            Lampiran:
          </div>

          {/* Konten Lampiran: Gambar atau Placeholder Kosong */}
          {lampiran ? (
            <div style={{ margin: "10px 0" }}>
              <div style={{ textAlign: "center", background: "#ffffff", padding: "10px 0" }}>
                <img
                  src={lampiran.url}
                  alt={lampiran.namaFile}
                  style={{
                    maxWidth: "100%",
                    height: "auto",
                    maxHeight: 650,
                    objectFit: "contain",
                    display: "block",
                    margin: "0 auto",
                    border: "1px solid #e2e8f0",
                  }}
                />
              </div>
              <div
                className="no-print"
                style={{
                  display: "flex",
                  gap: 10,
                  justifyContent: "center",
                  marginTop: 14,
                  alignItems: "center",
                }}
              >
                <span style={{ fontSize: 12, color: "var(--muted)" }}>
                  File: <b>{lampiran.namaFile}</b>
                </span>
                <button
                  type="button"
                  onClick={() => setBukaModalUpload(true)}
                  className="btn btn-sm"
                >
                  ✏️ Ganti Gambar Lampiran
                </button>
                <button
                  type="button"
                  onClick={handleHapusLampiran}
                  className="btn btn-sm btn-danger"
                >
                  🗑️ Hapus Lampiran
                </button>
              </div>
            </div>
          ) : (
            <div style={{ margin: "20px 0" }}>
              <div
                className="no-print"
                style={{
                  border: "2px dashed #cbd5e1",
                  borderRadius: 8,
                  padding: "48px 24px",
                  textAlign: "center",
                  background: "#f8fafc",
                  color: "#64748b",
                }}
              >
                <div style={{ fontSize: 36, marginBottom: 8 }}>📎</div>
                <div style={{ fontWeight: 700, fontSize: 15, color: "#1e293b", marginBottom: 6 }}>
                  Lampiran Masih Kosong
                </div>
                <p style={{ fontSize: 12.5, maxWidth: 460, margin: "0 auto 16px auto", lineHeight: 1.5 }}>
                  Di awal lampiran dikosongkan. Anda dapat mengunggah potongan gambar spreadsheet PO tracking
                  (contoh: <code>lampiran_cac.jpeg</code>) untuk otomatis ditampilkan pada Halaman 2 ini.
                </p>
                <button
                  type="button"
                  onClick={() => setBukaModalUpload(true)}
                  className="btn btn-primary"
                  style={{ fontSize: 13, padding: "8px 18px" }}
                >
                  📤 Unggah Lampiran CAC
                </button>
              </div>
              {/* Tempat kosong bersih saat dicetak bila belum ada lampiran */}
              <div className="only-print" style={{ minHeight: 350 }} />
            </div>
          )}
        </div>

        {/* Footer Halaman 2 */}
        <div style={{ marginTop: 40, fontSize: 9.5, color: "#333333", lineHeight: 1.4 }}>
          <div>Confidential and Proprietary to PT XLSMART Telecom Sejahtera Tbk</div>
          <div>This script can be used as supporting document for invoice submission to XL</div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL UPLOAD / EDIT LAMPIRAN CAC                                          */}
      {/* ========================================================================= */}
      {bukaModalUpload && (
        <div
          className="modal-backdrop"
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.55)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: 16,
          }}
        >
          <div
            className="card"
            style={{
              maxWidth: 500,
              width: "100%",
              background: "#ffffff",
              borderRadius: 8,
              padding: 24,
              boxShadow: "0 10px 25px rgba(0,0,0,0.2)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>
                {lampiran ? "✏️ Edit / Ganti Lampiran CAC" : "📤 Unggah Lampiran CAC"}
              </h3>
              <button
                type="button"
                onClick={() => { setBukaModalUpload(false); setFileUpload(null); setPreviewUrl(null); }}
                style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#64748b" }}
              >
                &times;
              </button>
            </div>

            <p style={{ fontSize: 13, color: "#475569", marginTop: 0, marginBottom: 16, lineHeight: 1.5 }}>
              Unggah file gambar screenshot PO Balance / tracking (format: <b>.jpeg, .jpg, .png</b>, atau .pdf).
              File ini akan otomatis tampil di <b>Halaman 2: Lampiran</b> pada dokumen CAC dan terintegrasi di PDF.
            </p>

            <form onSubmit={handleUploadLampiran}>
              <div className="field" style={{ marginBottom: 14 }}>
                <label style={{ display: "block", marginBottom: 6, fontWeight: 600, fontSize: 12 }}>
                  Pilih File Lampiran
                </label>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/jpg,application/pdf"
                  onChange={handlePilihFile}
                  required
                  style={{ width: "100%" }}
                />
              </div>

              {previewUrl && (
                <div style={{ marginBottom: 14, textAlign: "center", background: "#f8fafc", padding: 10, borderRadius: 6, border: "1px solid #e2e8f0" }}>
                  <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 6 }}>Pratinjau Gambar:</div>
                  <img
                    src={previewUrl}
                    alt="Preview"
                    style={{ maxWidth: "100%", maxHeight: 180, objectFit: "contain", borderRadius: 4 }}
                  />
                </div>
              )}

              {uploadError && (
                <div className="alert alert-danger" style={{ marginBottom: 14, fontSize: 12 }}>
                  {uploadError}
                </div>
              )}

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 18 }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  disabled={uploadLoading}
                  onClick={() => { setBukaModalUpload(false); setFileUpload(null); setPreviewUrl(null); }}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={uploadLoading}
                >
                  {uploadLoading ? "Mengunggah..." : "Simpan Lampiran"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Print Specific CSS Helper */}
      <style jsx global>{`
        @media print {
          .doc-sheet-page2 {
            page-break-before: always !important;
            break-before: page !important;
            margin-top: 0 !important;
            box-shadow: none !important;
          }
          .only-print {
            display: block !important;
          }
        }
        @media screen {
          .only-print {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
