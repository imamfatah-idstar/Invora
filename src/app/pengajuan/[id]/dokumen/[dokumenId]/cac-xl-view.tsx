"use client";

import { useState } from "react";
import Link from "next/link";
import TombolCetak from "./tombol-cetak";
import CheckerApprovalBar from "./checker-approval-bar";
import {
  formatTanggalDokumen,
  formatPeriodeBulan,
  formatRupiahKoma,
} from "@/lib/xl-document-helpers";

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
  defaultUserXlJabatan = "GM Integration & AI Orchestration",
  defaultFinanceNama = "Dewi Ani Mulyakarti",
  defaultFinanceJabatan = "Finance Manager",
  defaultTermsPayment = "9 Months",
  defaultContractStatus = "Amend Signed",
  defaultLocationSap = "0010",
  defaultProjectLocation = "Headquarter",
  dibuatPada,
  approvalData,
}: Props) {
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

  return (
    <div className="doc-page">
      {/* Top Toolbar */}
      <div className="doc-toolbar no-print">
        <Link href={`/pengajuan/${pengajuanId}`} className="back-link">
          &larr; Submission Details
        </Link>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <button
            type="button"
            className="btn"
            onClick={() => setShowConfig(!showConfig)}
          >
            {showConfig ? "Hide Settings" : "⚙️ Edit Certificate Info"}
          </button>
          <TombolCetak />
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
                placeholder="e.g. 4 Nov 2026"
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
                placeholder="e.g. 31 Aug 2025"
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
                placeholder="e.g. GM Integration & AI Orchestration"
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

      {/* Authentic XL CAC Sheet matching CAC_PO.pdf */}
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
          margin: "0 auto",
        }}
      >
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

        {/* Key-Value Info Grid matching CAC_PO.pdf */}
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

        {/* Dual Signatures matching CAC_PO.pdf */}
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

        {/* Footer */}
        <div style={{ marginTop: 60, fontSize: 9.5, color: "#333333", lineHeight: 1.4 }}>
          <div>Confidential and Proprietary to PT XL AXIATA Tbk.</div>
          <div>This slip can be used as supporting document for invoice submission to XL.</div>
        </div>
      </div>
    </div>
  );
}

