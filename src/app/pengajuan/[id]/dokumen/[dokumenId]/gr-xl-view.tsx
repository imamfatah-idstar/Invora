"use client";

import { useState } from "react";
import Link from "next/link";
import TombolCetak from "./tombol-cetak";
import {
  formatGrDate,
  formatGrNominal,
  formatGrQty,
  formatPeriodeBulan,
} from "@/lib/xl-document-helpers";

type LineItemData = {
  namaPersonel: string;
  nomorLine?: string | null;
  deskripsiLine?: string | null;
  hasilHitung: string | number;
  hariKerjaDapatDitagihkan: number;
  hariKerjaAcuanBulan: number;
};

type Props = {
  pengajuanId: number;
  dokumenId: number;
  dokumenVersi: number;
  nomorPo: string;
  namaProyek: string;
  periode: string;
  klien: string;
  nomorGrSlip?: string | null;
  nilaiGrDisetujui?: string | number | null;
  rincian: LineItemData[];
  dibuatPada: string;
  defaultSowDocument?: string;
};

export default function GrXlView({
  pengajuanId,
  dokumenId,
  dokumenVersi,
  nomorPo,
  namaProyek,
  periode,
  klien,
  nomorGrSlip,
  nilaiGrDisetujui,
  rincian,
  dibuatPada,
  defaultSowDocument = "7a1a6279-d98e-4b17-ad0e-221bca5a4749.xlsx",
}: Props) {
  const { periodeFormatted } = formatPeriodeBulan(periode);

  // Compute clean MMYYYY for IDs (e.g. 102026)
  const [thnStr, blnStr] = (periode || "").split("-");
  const mmyyyy = blnStr && thnStr ? `${blnStr}${thnStr}` : "102026";
  const reqIdSuffix = String(8000 + pengajuanId);

  // Default initial values according to Good_Receipt.pdf
  const [requestId, setRequestId] = useState(
    `ICPGA/Finance_Business_Partner_&_Budgeting/${mmyyyy}/${reqIdSuffix}`
  );
  const [requestTitle, setRequestTitle] = useState(
    `Good_Receipt_Request_${nomorPo}_${periodeFormatted.replace(/\s+/g, " ")}`
  );
  const [vendorName, setVendorName] = useState(
    "PT. IDSTAR CIPTA TEKNOLOGI (0000123218)"
  );
  const [bastRequestId, setBastRequestId] = useState(
    `BAST/Enterprise_Connectivity_Management/${mmyyyy}/8595`
  );
  const [cacRequestId, setCacRequestId] = useState(
    `CAC/Enterprise_Connectivity_Management/${mmyyyy}/8598`
  );
  const [sowDocument, setSowDocument] = useState(defaultSowDocument);

  // Approval card defaults
  const [createdByName, setCreatedByName] = useState("Nitia Refa Cahyaningrum,");
  const [createdByRole, setCreatedByRole] = useState("Finance");
  const [createdByDate, setCreatedByDate] = useState("30 Oct 2026");

  const [approver1Name, setApprover1Name] = useState("xlrpa-getapprove@xl.co.id,");
  const [approver1Role, setApprover1Role] = useState("system integration");
  const [approver1Date, setApprover1Date] = useState("30 Oct 2026");

  const [approver2Name, setApprover2Name] = useState("vads.dnabila@xlsmart.co.id");
  const [approver2Date, setApprover2Date] = useState("02 Nov 2026");

  // Items (GR Number Item #1 .. #N)
  const initialItems: string[] = (() => {
    if (rincian && rincian.length > 0) {
      return rincian.map((r, idx) => {
        const slip = nomorGrSlip || "2000565039";
        const lineStr = String(r.nomorLine || idx + 1).padStart(5, "0");
        const year = thnStr || "2026";
        const nominal = formatGrNominal(r.hasilHitung);
        const qtyRatio =
          r.hariKerjaAcuanBulan > 0
            ? (r.hariKerjaDapatDitagihkan / r.hariKerjaAcuanBulan) * 5.8
            : 5.0;
        const qty = formatGrQty(qtyRatio);
        return `${slip}-${lineStr}-${year} ; ${nominal} ; ${qty}`;
      });
    }
    // Authentic sample lines from Good_Receipt.pdf
    return [
      "2000565039-00001-2026 ; 171.631.000 ; 5,818",
      "2000565054-00002-2026 ; 1.014.000 ; 0,039",
      "2000565055-00003-2026 ; 104.399.300 ; 4,778",
      "2000565056-00004-2026 ; 46.607.880 ; 2,949",
      "",
    ];
  })();

  const [items, setItems] = useState<string[]>(initialItems);
  const [showConfig, setShowConfig] = useState(false);

  function handleItemChange(idx: number, val: string) {
    const next = [...items];
    next[idx] = val;
    setItems(next);
  }

  function addItem() {
    setItems([...items, ""]);
  }

  function removeItem(idx: number) {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== idx));
  }

  // Construct PDF URL with query params
  const pdfParams = new URLSearchParams({
    requestId,
    requestTitle,
    vendorName,
    bastRequestId,
    cacRequestId,
    sowDocument,
    createdByName,
    createdByRole,
    createdByDate,
    approver1Name,
    approver1Role,
    approver1Date,
    approver2Name,
    approver2Date,
    items: JSON.stringify(items),
  });
  const pdfUrl = `/api/pengajuan/${pengajuanId}/dokumen/${dokumenId}/pdf?${pdfParams.toString()}`;

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
            {showConfig ? "Hide Settings" : "⚙️ Edit GR Info"}
          </button>
          <a
            href={pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary"
          >
            ⬇ Download GR PDF
          </a>
          <a
            href="https://www.getapprove.xlsmart.co.id/auth/login?nexturl=%252Fapproval-document%2523id%253Dcc5582a1-9e20-4926-865d-9e7d9c65b73c"
            target="_blank"
            rel="noopener noreferrer"
            className="btn"
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
            <span>🚀 Get Approve XL</span>
            <span style={{ fontSize: 12 }}>↗</span>
          </a>
          <TombolCetak />
        </div>
      </div>

      {/* Collapsible Edit Form */}
      {showConfig && (
        <div
          className="no-print"
          style={{
            margin: "0 auto 24px auto",
            maxWidth: 820,
            background: "#ffffff",
            padding: 20,
            borderRadius: 8,
            boxShadow: "0 2px 10px rgba(0,0,0,0.08)",
            border: "1px solid #e5e7eb",
          }}
        >
          <h4 style={{ margin: "0 0 14px 0", color: "#111827" }}>
            ⚙️ Edit Good Receipt Document (BAU Approval) Info
          </h4>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: 12,
            }}
          >
            <div>
              <label style={{ fontSize: 12, fontWeight: 600 }}>Request ID</label>
              <input
                type="text"
                value={requestId}
                onChange={(e) => setRequestId(e.target.value)}
                style={{ width: "100%", padding: "6px 8px", fontSize: 12 }}
              />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600 }}>Request Title</label>
              <input
                type="text"
                value={requestTitle}
                onChange={(e) => setRequestTitle(e.target.value)}
                style={{ width: "100%", padding: "6px 8px", fontSize: 12 }}
              />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600 }}>Vendor Name</label>
              <input
                type="text"
                value={vendorName}
                onChange={(e) => setVendorName(e.target.value)}
                style={{ width: "100%", padding: "6px 8px", fontSize: 12 }}
              />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600 }}>BAST Request ID</label>
              <input
                type="text"
                value={bastRequestId}
                onChange={(e) => setBastRequestId(e.target.value)}
                style={{ width: "100%", padding: "6px 8px", fontSize: 12 }}
              />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600 }}>CAC Request ID</label>
              <input
                type="text"
                value={cacRequestId}
                onChange={(e) => setCacRequestId(e.target.value)}
                style={{ width: "100%", padding: "6px 8px", fontSize: 12 }}
              />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600 }}>SOW Document File</label>
              <input
                type="text"
                value={sowDocument}
                onChange={(e) => setSowDocument(e.target.value)}
                style={{ width: "100%", padding: "6px 8px", fontSize: 12 }}
              />
            </div>

            <div style={{ gridColumn: "1 / -1", borderTop: "1px dashed #ccc", paddingTop: 10, marginTop: 4 }}>
              <b>Signatures & Approvers (Page 2)</b>
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600 }}>Created By - Name</label>
              <input
                type="text"
                value={createdByName}
                onChange={(e) => setCreatedByName(e.target.value)}
                style={{ width: "100%", padding: "6px 8px", fontSize: 12 }}
              />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600 }}>Created By - Role/Dept</label>
              <input
                type="text"
                value={createdByRole}
                onChange={(e) => setCreatedByRole(e.target.value)}
                style={{ width: "100%", padding: "6px 8px", fontSize: 12 }}
              />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600 }}>Created By - Date</label>
              <input
                type="text"
                value={createdByDate}
                onChange={(e) => setCreatedByDate(e.target.value)}
                style={{ width: "100%", padding: "6px 8px", fontSize: 12 }}
              />
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 600 }}>Approver 1 (RPA) - Email</label>
              <input
                type="text"
                value={approver1Name}
                onChange={(e) => setApprover1Name(e.target.value)}
                style={{ width: "100%", padding: "6px 8px", fontSize: 12 }}
              />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600 }}>Approver 1 - Role</label>
              <input
                type="text"
                value={approver1Role}
                onChange={(e) => setApprover1Role(e.target.value)}
                style={{ width: "100%", padding: "6px 8px", fontSize: 12 }}
              />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600 }}>Approver 1 - Date</label>
              <input
                type="text"
                value={approver1Date}
                onChange={(e) => setApprover1Date(e.target.value)}
                style={{ width: "100%", padding: "6px 8px", fontSize: 12 }}
              />
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 600 }}>Approver 2 - Email</label>
              <input
                type="text"
                value={approver2Name}
                onChange={(e) => setApprover2Name(e.target.value)}
                style={{ width: "100%", padding: "6px 8px", fontSize: 12 }}
              />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600 }}>Approver 2 - Date</label>
              <input
                type="text"
                value={approver2Date}
                onChange={(e) => setApprover2Date(e.target.value)}
                style={{ width: "100%", padding: "6px 8px", fontSize: 12 }}
              />
            </div>

            {/* Line Items List */}
            <div style={{ gridColumn: "1 / -1", borderTop: "1px dashed #ccc", paddingTop: 10, marginTop: 4 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <b>GR Number Items (Page 1)</b>
                <button type="button" className="btn btn-sm" onClick={addItem}>
                  + Add Item
                </button>
              </div>
              {items.map((it, idx) => (
                <div key={idx} style={{ display: "flex", gap: 8, marginBottom: 6, alignItems: "center" }}>
                  <span style={{ fontSize: 12, width: 140, fontWeight: 600 }}>GR Number Item #{idx + 1}</span>
                  <input
                    type="text"
                    value={it}
                    onChange={(e) => handleItemChange(idx, e.target.value)}
                    style={{ flex: 1, padding: "5px 8px", fontSize: 12 }}
                    placeholder="e.g. 2000565039-00001-2026 ; 171.631.000 ; 5,818"
                  />
                  {items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeItem(idx)}
                      style={{ background: "#fee2e2", border: "1px solid #f87171", color: "#b91c1c", borderRadius: 4, padding: "2px 8px", cursor: "pointer" }}
                    >
                      &times;
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* PAGE 1: BAU Approval Form (Matching Good_Receipt.pdf Page 1) */}
      {/* ============================================================== */}
      <div
        className="doc-sheet"
        style={{
          width: "210mm",
          minHeight: "297mm",
          margin: "0 auto 20mm auto",
          padding: "10mm 10mm 15mm 10mm",
          background: "#ffffff",
          boxShadow: "0 4px 14px rgba(0,0,0,0.12)",
          boxSizing: "border-box",
          fontFamily: "'Times New Roman', Times, serif",
          fontSize: "10pt",
          color: "#000000",
          position: "relative",
        }}
      >
        {/* Header Table */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "116.5pt 1fr",
            border: "0.75pt solid #000000",
            height: "51.7pt",
            alignItems: "center",
            boxSizing: "border-box",
          }}
        >
          {/* Left Cell: Logo */}
          <div
            style={{
              height: "100%",
              borderRight: "0.75pt solid #000000",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "4px",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/xl-gr-logo.jpeg"
              alt="XL Logo"
              style={{ maxHeight: "38pt", maxWidth: "67.5pt", objectFit: "contain" }}
            />
          </div>
          {/* Right Cell: Title */}
          <div
            style={{
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: "bold",
              fontSize: "16pt",
              letterSpacing: "0.2px",
            }}
          >
            BAU Approval
          </div>
        </div>

        {/* Key-Value Form Fields */}
        <div style={{ marginTop: "16pt", lineHeight: "21pt" }}>
          <div style={{ display: "grid", gridTemplateColumns: "209.4pt 24pt 1fr", alignItems: "baseline" }}>
            <div>Request Title</div>
            <div>:</div>
            <div>{requestTitle || ""}</div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "209.4pt 24pt 1fr", alignItems: "baseline" }}>
            <div>Vendor Name</div>
            <div>:</div>
            <div>{vendorName}</div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "209.4pt 24pt 1fr", alignItems: "baseline" }}>
            <div>BAST Request ID</div>
            <div>:</div>
            <div>{bastRequestId}</div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "209.4pt 24pt 1fr", alignItems: "baseline" }}>
            <div>CAC Request ID</div>
            <div>:</div>
            <div>{cacRequestId}</div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "209.4pt 24pt 1fr", alignItems: "baseline" }}>
            <div>SOW Document</div>
            <div>:</div>
            <div>{sowDocument}</div>
          </div>

          {/* Dynamic GR Number Items */}
          {items.map((it, idx) => (
            <div
              key={idx}
              style={{ display: "grid", gridTemplateColumns: "209.4pt 24pt 1fr", alignItems: "baseline" }}
            >
              <div>GR Number Item #{idx + 1}</div>
              <div>:</div>
              <div>{it}</div>
            </div>
          ))}
        </div>

        {/* Footer Page 1 */}
        <div
          style={{
            position: "absolute",
            bottom: "10mm",
            left: "10mm",
            right: "10mm",
            display: "flex",
            justifyContent: "space-between",
            fontFamily: "Helvetica, Arial, sans-serif",
            fontSize: "6pt",
            color: "#000000",
          }}
        >
          <div style={{ paddingLeft: "160pt" }}>Request ID: {requestId}</div>
          <div style={{ paddingRight: "40pt" }}>Page 1 of 2</div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* PAGE 2: APPROVAL PAGES (Matching Good_Receipt.pdf Page 2) */}
      {/* ============================================================== */}
      <div
        className="doc-sheet"
        style={{
          width: "210mm",
          minHeight: "297mm",
          margin: "0 auto",
          padding: "15mm 15mm 15mm 15mm",
          background: "#ffffff",
          boxShadow: "0 4px 14px rgba(0,0,0,0.12)",
          boxSizing: "border-box",
          fontFamily: "'Times New Roman', Times, serif",
          fontSize: "12pt",
          color: "#000000",
          position: "relative",
        }}
      >
        {/* Top Header Box */}
        <div
          style={{
            border: "0.75pt solid #000000",
            margin: "0 auto",
            width: "511.3pt",
            boxSizing: "border-box",
            textAlign: "center",
          }}
        >
          {/* Row 1: APPROVAL PAGES */}
          <div
            style={{
              padding: "4pt 0",
              borderBottom: "0.75pt solid #000000",
              fontSize: "12pt",
            }}
          >
            APPROVAL PAGES
          </div>
          {/* Row 2: Document Type */}
          <div
            style={{
              padding: "6pt 0",
              borderBottom: "0.75pt solid #000000",
              fontSize: "12pt",
            }}
          >
            Document Type : IT CAPEX PO GR Approval
          </div>
          {/* Row 3: Document Title */}
          <div
            style={{
              padding: "16pt 10pt",
              borderBottom: "0.75pt solid #000000",
              fontSize: "12pt",
            }}
          >
            Document Title : {requestTitle}
          </div>
          {/* Row 4: Request Id */}
          <div
            style={{
              padding: "16pt 10pt",
              fontSize: "12pt",
            }}
          >
            Request Id : {requestId}
          </div>
        </div>

        {/* Approval Cards Container */}
        <div
          style={{
            margin: "1pt auto 0 auto",
            width: "454.4pt",
            display: "grid",
            gridTemplateColumns: "151.4pt 151.6pt 151.4pt",
            border: "0.75pt solid #000000",
            boxSizing: "border-box",
            height: "189pt",
          }}
        >
          {/* Card 1: Created By (Nitia Refa / Finance) */}
          <div
            style={{
              borderRight: "0.75pt solid #000000",
              display: "flex",
              flexDirection: "column",
              height: "100%",
            }}
          >
            <div
              style={{
                height: "14.5pt",
                borderBottom: "0.75pt solid #000000",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "12pt",
              }}
            >
              Created By
            </div>
            <div
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "8pt 4pt 6pt 4pt",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/gr-sign-created.png"
                alt="Signature Created By"
                style={{ height: "60pt", maxWidth: "75pt", objectFit: "contain" }}
              />
              <div style={{ textAlign: "center", fontSize: "12pt", lineHeight: "1.25" }}>
                <div>{createdByName}</div>
                <div>{createdByRole}</div>
              </div>
            </div>
            <div
              style={{
                height: "16.2pt",
                borderTop: "0.75pt solid #000000",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "12pt",
              }}
            >
              {createdByDate}
            </div>
          </div>

          {/* Card 2: Approved By (RPA System Integration) */}
          <div
            style={{
              borderRight: "0.75pt solid #000000",
              display: "flex",
              flexDirection: "column",
              height: "100%",
            }}
          >
            <div
              style={{
                height: "14.5pt",
                borderBottom: "0.75pt solid #000000",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "12pt",
              }}
            >
              Approved By
            </div>
            <div
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "8pt 4pt 6pt 4pt",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/gr-sign-rpa.jpeg"
                alt="Stamp System Integration"
                style={{ height: "58pt", maxWidth: "80pt", objectFit: "contain" }}
              />
              <div style={{ textAlign: "center", fontSize: "12pt", lineHeight: "1.25" }}>
                <div>{approver1Name}</div>
                <div>{approver1Role}</div>
              </div>
            </div>
            <div
              style={{
                height: "16.2pt",
                borderTop: "0.75pt solid #000000",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "12pt",
              }}
            >
              {approver1Date}
            </div>
          </div>

          {/* Card 3: Approved By (Client PIC / Vads) */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              height: "100%",
            }}
          >
            <div
              style={{
                height: "14.5pt",
                borderBottom: "0.75pt solid #000000",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "12pt",
              }}
            >
              Approved By
            </div>
            <div
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "8pt 4pt 6pt 4pt",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/gr-sign-approved.png"
                alt="Signature Approved By"
                style={{ height: "60pt", maxWidth: "34pt", objectFit: "contain" }}
              />
              <div style={{ textAlign: "center", fontSize: "12pt", lineHeight: "1.25" }}>
                <div>{approver2Name}</div>
              </div>
            </div>
            <div
              style={{
                height: "16.2pt",
                borderTop: "0.75pt solid #000000",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "12pt",
              }}
            >
              {approver2Date}
            </div>
          </div>
        </div>

        {/* Footer Page 2 */}
        <div
          style={{
            position: "absolute",
            bottom: "10mm",
            left: "10mm",
            right: "10mm",
            display: "flex",
            justifyContent: "space-between",
            fontFamily: "Helvetica, Arial, sans-serif",
            fontSize: "6pt",
            color: "#000000",
          }}
        >
          <div style={{ paddingLeft: "160pt" }}>Request ID: {requestId}</div>
          <div style={{ paddingRight: "40pt" }}>Page 2 of 2</div>
        </div>
      </div>
    </div>
  );
}
