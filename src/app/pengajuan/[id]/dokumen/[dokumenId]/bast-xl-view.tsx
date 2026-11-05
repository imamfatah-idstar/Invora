"use client";

import { useState } from "react";
import Link from "next/link";
import TombolCetak from "./tombol-cetak";
import {
  formatTanggalLengkapIndo,
  formatTanggalDokumen,
  formatPeriodeBulan,
} from "@/lib/xl-document-helpers";

type Props = {
  pengajuanId: number;
  dokumenId: number;
  dokumenVersi: number;
  nomorPo: string;
  namaProyek: string;
  periode: string;
  keteranganTahap: string | null;
  defaultUserXlNama: string;
  defaultUserXlJabatan?: string;
  defaultFinanceNama?: string;
  defaultFinanceJabatan?: string;
  defaultPekerjaan?: string;
  dibuatPada: string;
};

export default function BastXlView({
  pengajuanId,
  dokumenId,
  dokumenVersi,
  nomorPo,
  namaProyek,
  periode,
  keteranganTahap,
  defaultUserXlNama,
  defaultUserXlJabatan = "GM Integration & AI Orchestration",
  defaultFinanceNama = "Dewi Ani Mulyakarti",
  defaultFinanceJabatan = "Finance Manager",
  defaultPekerjaan = "Jasa IT",
  dibuatPada,
}: Props) {
  const tanggalInfo = formatTanggalLengkapIndo();
  const tglDefault = formatTanggalDokumen();
  const { periodeFormatted } = formatPeriodeBulan(periode);

  const [userXlNama, setUserXlNama] = useState(defaultUserXlNama || "Ratna Tri Wulandari");
  const [userXlJabatan, setUserXlJabatan] = useState(defaultUserXlJabatan);
  const [financeNama, setFinanceNama] = useState(defaultFinanceNama);
  const [financeJabatan, setFinanceJabatan] = useState(defaultFinanceJabatan);
  const [pekerjaan, setPekerjaan] = useState(defaultPekerjaan || namaProyek || "Jasa IT");
  const [tanggalDokumen, setTanggalDokumen] = useState(tglDefault);
  const [showConfig, setShowConfig] = useState(false);

  const teksPeriodeFinal = keteranganTahap
    ? `${periodeFormatted} (${keteranganTahap})`
    : periodeFormatted;

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
            {showConfig ? "Hide Settings" : "⚙️ Edit Signatories & Info"}
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
            <span>🚀 Get Approve XL</span>
            <span style={{ fontSize: 12 }}>↗</span>
          </a>
        </div>
      </div>

      {/* Configuration Card */}
      {showConfig && (
        <div className="card no-print" style={{ marginBottom: 20, background: "#fafbfc" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>
              ⚙️ XLSMART BAST Signatories &amp; Details Settings
            </h3>
            <span style={{ fontSize: 12, color: "var(--color-text-muted)" }}>
              Changes sync directly to the document preview below and downloaded PDF
            </span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
            <div className="field">
              <label>XL Signatory Name (PIC 1)</label>
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
            <div className="field">
              <label>IDStar Signatory Name (PIC 2)</label>
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
              <label>Scope / Pekerjaan</label>
              <input
                type="text"
                value={pekerjaan}
                onChange={(e) => setPekerjaan(e.target.value)}
                placeholder="e.g. Jasa IT"
              />
            </div>
            <div className="field">
              <label>Date of Creation</label>
              <input
                type="text"
                value={tanggalDokumen}
                onChange={(e) => setTanggalDokumen(e.target.value)}
                placeholder="e.g. 4 Nov 2026"
              />
            </div>
          </div>
        </div>
      )}

      {/* Authentic XL BAST Sheet matching BAST_PO.pdf */}
      <div
        className="doc-sheet"
        style={{
          padding: "50px 60px",
          background: "#ffffff",
          fontFamily: "Arial, Helvetica, sans-serif",
          color: "#000000",
          boxShadow: "0 4px 14px rgba(0,0,0,0.08)",
          borderRadius: 4,
          maxWidth: 820,
          margin: "0 auto",
        }}
      >
        {/* Header XL */}
        <div style={{ textAlign: "left", marginBottom: 28 }}>
          <div style={{ fontWeight: "bold", fontSize: 13, marginBottom: 4 }}>
            PT XLSMART Telecom Sejahtera Tbk
          </div>
          <div style={{ fontSize: 11, lineHeight: 1.4, color: "#111" }}>
            XL Axiata Tower<br />
            Jl. HR Rasuna Said Blok X5 Kav.11-12<br />
            Kuningan Timur, Setiabudi, Jakarta Selatan<br />
            DKI Jakarta Raya 12950 Indonesia
          </div>
        </div>

        {/* Title */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <h2 style={{ fontSize: 18, fontWeight: "bold", margin: 0, letterSpacing: 0.5 }}>
            BERITA ACARA SERAH TERIMA
          </h2>
          <div style={{ fontSize: 12, fontWeight: 500, marginTop: 4 }}>
            Date of Creation : {tanggalDokumen}
          </div>
        </div>

        {/* Preamble Date */}
        <p style={{ fontSize: 11.5, lineHeight: 1.6, margin: "0 0 16px" }}>
          Pada hari ini {tanggalInfo.hari}, tanggal {tanggalInfo.tglTerbilang}, bulan {tanggalInfo.bulan}, tahun {tanggalInfo.tahunTerbilang},
          kami yang bertandatangan di bawah ini :
        </p>

        {/* Parties List */}
        <div style={{ marginLeft: 14, fontSize: 11.5, lineHeight: 1.5, marginBottom: 18 }}>
          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            <div style={{ width: 18, fontWeight: "bold" }}>1.</div>
            <div style={{ width: 175, fontWeight: "bold" }}>{userXlNama}</div>
            <div style={{ flex: 1 }}>
              : {userXlJabatan}<br />
              PT XL Smart Telecom Sejahtera Tbk<br />
              Jalan HR Rasuna Said X5 Kav. 11-12, Kuningan<br />
              Timur, Setiabudi, Jakarta Selatan, 12950
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <div style={{ width: 18, fontWeight: "bold" }}>2.</div>
            <div style={{ width: 175, fontWeight: "bold" }}>{financeNama}</div>
            <div style={{ flex: 1 }}>
              : {financeJabatan} PT ID Star Teknologi<br />
              Wisma Staco Lt 7, Jalan Casablanca Kav. 18 Menteng<br />
              Dalam Tebet, Jakarta Selatan 12870
            </div>
          </div>
        </div>

        {/* Examination clause */}
        <p style={{ fontSize: 11.5, lineHeight: 1.5, margin: "0 0 8px" }}>
          Telah melaksanakan pemeriksaan atas pelaksanaan dari :
        </p>

        <div style={{ marginLeft: 14, fontSize: 11.5, lineHeight: 1.6, marginBottom: 18 }}>
          <div style={{ display: "flex", gap: 8 }}>
            <span style={{ width: 120 }}>Pekerjaan</span>
            <span>: {pekerjaan}</span>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <span style={{ width: 120 }}>No. PO</span>
            <span>: {nomorPo}</span>
          </div>
        </div>

        {/* Declaration statement */}
        <p style={{ fontSize: 11.5, lineHeight: 1.5, margin: "0 0 8px" }}>
          Dengan ini menyatakan dengan sebenarnya bahwa selama pelaksanaan periode {teksPeriodeFinal}.
        </p>

        <div style={{ marginLeft: 14, fontSize: 11.5, lineHeight: 1.6, marginBottom: 18 }}>
          <div style={{ display: "flex", gap: 8, marginBottom: 6 }}>
            <span>-</span>
            <span>Supplier yang bersangkutan telah menyelesaikan pekerjaan sesuai dengan yang diisyaratkan</span>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <span>-</span>
            <span>Selama masa pelaksanaan tidak pernah melakukan kelalaian</span>
          </div>
        </div>

        <p style={{ fontSize: 11.5, lineHeight: 1.5, margin: "0 0 32px" }}>
          Demikian Berita Acara ini dibuat dengan sebenarnya dan dalam rangkap 2 (dua) untuk dapat digunakan sebagaimana mestinya.
        </p>

        {/* Signatures */}
        <div style={{ display: "flex", justifyContent: "space-between", margin: "40px 10px 0" }}>
          <div style={{ width: 230 }}>
            <div style={{ fontWeight: "bold", fontSize: 12, marginBottom: 12 }}>
              PT IDStar Teknologi
            </div>
            {/* Embedded Official IDStar Stamp */}
            <div style={{ height: 50, display: "flex", alignItems: "center", marginBottom: 6 }}>
              <img
                src="/idstar-stamp.png"
                alt="IDStar Stamp"
                style={{ height: 42, width: "auto", display: "block" }}
              />
            </div>
            <div style={{ fontWeight: "bold", fontSize: 11.5, borderBottom: "1px solid #000", paddingBottom: 2, display: "inline-block", minWidth: 160 }}>
              {financeNama}
            </div>
            <div style={{ fontSize: 11, marginTop: 4 }}>
              {financeJabatan}
            </div>
          </div>

          <div style={{ width: 230 }}>
            <div style={{ fontWeight: "bold", fontSize: 12, marginBottom: 68 }}>
              PT XLSMART Telecom Sejahtera Tbk
            </div>
            <div style={{ fontWeight: "bold", fontSize: 11.5, borderBottom: "1px solid #000", paddingBottom: 2, display: "inline-block", minWidth: 160 }}>
              {userXlNama}
            </div>
            <div style={{ fontSize: 11, marginTop: 4 }}>
              {userXlJabatan}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ marginTop: 60, fontSize: 9.5, color: "#333333" }}>
          Confidential and Proprietary to PT XLSMART Telecom Sejahtera Tbk
        </div>
      </div>
    </div>
  );
}

