"use client";

import { useState } from "react";
import Link from "next/link";
import TombolCetak from "./tombol-cetak";
import { formatHariTanggalIndo, formatTanggalSelesaiIndo } from "@/lib/xl-document-helpers";

type RincianItem = {
  namaPersonel: string;
  nilaiRateDipakai: string | null;
  hasilHitung: string;
  hariKerjaDapatDitagihkan: number | null;
  hariKerjaAcuanBulan: number | null;
  nomorLine?: number | null;
  deskripsiLine?: string | null;
};

type Props = {
  pengajuanId: number;
  dokumenId: number;
  dokumenVersi: number;
  nomorPo: string;
  namaProyek: string;
  klien: string;
  periode: string;
  keteranganTahap: string | null;
  defaultPihakPertama: string;
  defaultPihakKedua: string;
  rincian: RincianItem[];
  total: number;
  dibuatPada: string;
};

export default function BastNonXlView({
  pengajuanId,
  dokumenId,
  dokumenVersi,
  nomorPo,
  namaProyek,
  klien,
  periode,
  keteranganTahap,
  defaultPihakPertama,
  defaultPihakKedua,
  rincian,
  total,
  dibuatPada,
}: Props) {
  const isCimb = klien?.toUpperCase().includes("CIMB") || klien?.toUpperCase().includes("NIAGA");

  // Defaults matching BAST_NonXL.pdf reference
  const defaultP1Nama = isCimb ? "Budi Oktaviyan Suryanto" : (defaultPihakPertama || "Budi Oktaviyan Suryanto");
  const defaultP1Jabatan = isCimb
    ? "Application Development Head - Digital Onboarding & Experience"
    : "Application Development Head - Digital Onboarding & Experience";
  const defaultP1Perusahaan = isCimb
    ? "PT. Bank CIMB Niaga Tbk"
    : (klien.startsWith("PT") ? klien : `PT. ${klien}`);

  const defaultP2Nama = "Indah Ananti Affandi";
  const defaultP2Jabatan = "Professional Services General Manager";

  // Pre-calculate project description and milestone completion text
  const defaultNamaKodeProyek = namaProyek
    ? `${namaProyek}`
    : `8116003125 - Rate Bodyshop - Perpanjangan lanjutan untuk project Octo Connect untuk Project Zolos`;

  const defaultPekerjaanTahap = keteranganTahap
    ? `Tahap ${keteranganTahap}`
    : "Tahap III (5%)";

  const defaultTanggalSelesai = formatTanggalSelesaiIndo(periode) !== "-"
    ? formatTanggalSelesaiIndo(periode)
    : "30-September-2026";

  const defaultTanggalDokumen = formatHariTanggalIndo();
  const defaultTanggalTtd = "3 Nov 2026";

  // State management for live custom edits
  const [pihak1Nama, setPihak1Nama] = useState(defaultP1Nama);
  const [pihak1Jabatan, setPihak1Jabatan] = useState(defaultP1Jabatan);
  const [pihak1Perusahaan, setPihak1Perusahaan] = useState(defaultP1Perusahaan);

  const [pihak2Nama, setPihak2Nama] = useState(defaultP2Nama);
  const [pihak2Jabatan, setPihak2Jabatan] = useState(defaultP2Jabatan);

  const [namaKodeProyek, setNamaKodeProyek] = useState(defaultNamaKodeProyek);
  const [pekerjaanTahap, setPekerjaanTahap] = useState(defaultPekerjaanTahap);
  const [tanggalSelesai, setTanggalSelesai] = useState(defaultTanggalSelesai);
  const [tanggalDokumen, setTanggalDokumen] = useState(defaultTanggalDokumen);
  const [tanggalTtdPihak1, setTanggalTtdPihak1] = useState(defaultTanggalTtd);

  const [showConfig, setShowConfig] = useState(false);

  // Sync to PDF download query params
  const queryPdf = new URLSearchParams({
    pihak1Nama,
    pihak1Jabatan,
    pihak1Perusahaan,
    pihak2Nama,
    pihak2Jabatan,
    namaKodeProyek,
    pekerjaanTahap,
    tanggalSelesai,
    tgl: tanggalDokumen,
    tanggalTtd: tanggalTtdPihak1,
  }).toString();

  const urlPdf = `/api/pengajuan/${pengajuanId}/dokumen/${dokumenId}/pdf?${queryPdf}`;

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
          <a href={urlPdf} target="_blank" className="btn btn-primary">
            ⬇ Download BAST Non-XL PDF
          </a>
        </div>
      </div>

      {/* Configuration Card (Collapsible) */}
      {showConfig && (
        <div className="card no-print" style={{ marginBottom: 20, background: "#fafbfc" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>
              ⚙️ Non-XL BAST Signatories &amp; Details Settings (BAST_NonXL.pdf)
            </h3>
            <span style={{ fontSize: 12, color: "var(--color-text-muted)" }}>
              Changes sync instantly to preview and generated PDF
            </span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
            <div className="field">
              <label>Pihak Pertama — Nama</label>
              <input
                type="text"
                value={pihak1Nama}
                onChange={(e) => setPihak1Nama(e.target.value)}
                placeholder="e.g. Budi Oktaviyan Suryanto"
              />
            </div>
            <div className="field">
              <label>Pihak Pertama — Jabatan</label>
              <input
                type="text"
                value={pihak1Jabatan}
                onChange={(e) => setPihak1Jabatan(e.target.value)}
                placeholder="e.g. Application Development Head..."
              />
            </div>
            <div className="field">
              <label>Pihak Pertama — Perusahaan</label>
              <input
                type="text"
                value={pihak1Perusahaan}
                onChange={(e) => setPihak1Perusahaan(e.target.value)}
                placeholder="e.g. PT. Bank CIMB Niaga Tbk"
              />
            </div>

            <div className="field">
              <label>Pihak Kedua — Nama (IDStar)</label>
              <input
                type="text"
                value={pihak2Nama}
                onChange={(e) => setPihak2Nama(e.target.value)}
                placeholder="e.g. Indah Ananti Affandi"
              />
            </div>
            <div className="field">
              <label>Pihak Kedua — Jabatan (IDStar)</label>
              <input
                type="text"
                value={pihak2Jabatan}
                onChange={(e) => setPihak2Jabatan(e.target.value)}
                placeholder="e.g. Professional Services General Manager"
              />
            </div>

            <div className="field">
              <label>Keterangan Pekerjaan / Tahap (Poin 2)</label>
              <input
                type="text"
                value={pekerjaanTahap}
                onChange={(e) => setPekerjaanTahap(e.target.value)}
                placeholder="e.g. Tahap III (5%)"
              />
            </div>
            <div className="field">
              <label>Tanggal Selesai (Poin 2)</label>
              <input
                type="text"
                value={tanggalSelesai}
                onChange={(e) => setTanggalSelesai(e.target.value)}
                placeholder="e.g. 30-September-2026"
              />
            </div>
            <div className="field">
              <label>Tanggal Dokumen (Pembuka)</label>
              <input
                type="text"
                value={tanggalDokumen}
                onChange={(e) => setTanggalDokumen(e.target.value)}
                placeholder="e.g. Kamis 22 Oktober 2026"
              />
            </div>
            <div className="field">
              <label>Tanggal Tanda Tangan Pihak Pertama</label>
              <input
                type="text"
                value={tanggalTtdPihak1}
                onChange={(e) => setTanggalTtdPihak1(e.target.value)}
                placeholder="e.g. 3 Nov 2026"
              />
            </div>
            <div className="field" style={{ gridColumn: "1 / -1" }}>
              <label>Nama / Kode Proyek (Tabel Poin 1)</label>
              <input
                type="text"
                value={namaKodeProyek}
                onChange={(e) => setNamaKodeProyek(e.target.value)}
                placeholder="e.g. 8116003125 - Rate Bodyshop - Perpanjangan lanjutan..."
              />
            </div>
          </div>
        </div>
      )}

      {/* Official Physical BAST Sheet (Exact Replica of BAST_NonXL.pdf) */}
      <div
        className="doc-sheet"
        style={{
          maxWidth: 794,
          minHeight: 1123,
          padding: "46px 56px",
          background: "#ffffff",
          fontFamily: "Arial, Helvetica, sans-serif",
          fontSize: 13,
          color: "#111827",
          lineHeight: 1.45,
          boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
          margin: "0 auto",
          position: "relative",
        }}
      >
        {/* Header: Logos */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 28,
          }}
        >
          <div>
            {isCimb ? (
              <img
                src="/cimb-niaga-logo.png"
                alt="CIMB Niaga"
                style={{ height: 32, width: "auto", display: "block" }}
              />
            ) : (
              <div
                style={{
                  fontSize: 18,
                  fontWeight: 800,
                  color: "#111827",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                }}
              >
                {pihak1Perusahaan}
              </div>
            )}
          </div>
          <div>
            <img
              src="/idstar-logo-color.png"
              alt="IDstar service with quality"
              style={{ height: 44, width: "auto", display: "block" }}
            />
          </div>
        </div>

        {/* Title */}
        <div style={{ textAlign: "center", margin: "24px 0 24px" }}>
          <h1
            style={{
              fontSize: 16,
              fontWeight: 800,
              margin: 0,
              textDecoration: "underline",
              textUnderlineOffset: 3,
              letterSpacing: "0.5px",
              color: "#111827",
            }}
          >
            BERITA ACARA SERAH TERIMA
          </h1>
          <div
            style={{
              fontSize: 13.5,
              fontWeight: 700,
              margin: "6px 0 0",
              textDecoration: "underline",
              textUnderlineOffset: 3,
              color: "#111827",
            }}
          >
            {nomorPo}
          </div>
        </div>

        {/* Preamble */}
        <p style={{ margin: "0 0 16px", fontSize: 13, lineHeight: 1.5 }}>
          Pada hari ini, {tanggalDokumen} yang bertanda tangan dibawah ini :
        </p>

        {/* Pihak Pertama */}
        <div style={{ margin: "0 0 16px", fontSize: 13 }}>
          <table style={{ borderCollapse: "collapse", width: "100%", fontSize: 13 }}>
            <tbody>
              <tr>
                <td style={{ width: 85, paddingBottom: 3 }}>Nama</td>
                <td style={{ width: 15, paddingBottom: 3 }}>:</td>
                <td style={{ fontWeight: 600, paddingBottom: 3 }}>{pihak1Nama}</td>
              </tr>
              <tr>
                <td style={{ width: 85, verticalAlign: "top" }}>Jabatan</td>
                <td style={{ width: 15, verticalAlign: "top" }}>:</td>
                <td>{pihak1Jabatan}</td>
              </tr>
            </tbody>
          </table>
          <p style={{ margin: "10px 0 0", lineHeight: 1.5 }}>
            Dalam hal ini bertindak untuk dan atas nama {pihak1Perusahaan}, dan<br />
            untuk selanjutnya disebut sebagai pihak <b>PERTAMA</b>
          </p>
        </div>

        {/* Pihak Kedua */}
        <div style={{ margin: "0 0 20px", fontSize: 13 }}>
          <table style={{ borderCollapse: "collapse", width: "100%", fontSize: 13 }}>
            <tbody>
              <tr>
                <td style={{ width: 85, paddingBottom: 3 }}>Nama</td>
                <td style={{ width: 15, paddingBottom: 3 }}>:</td>
                <td style={{ fontWeight: 600, paddingBottom: 3 }}>{pihak2Nama}</td>
              </tr>
              <tr>
                <td style={{ width: 85, verticalAlign: "top" }}>Jabatan</td>
                <td style={{ width: 15, verticalAlign: "top" }}>:</td>
                <td>{pihak2Jabatan}</td>
              </tr>
            </tbody>
          </table>
          <p style={{ margin: "10px 0 0", lineHeight: 1.5 }}>
            Dalam hal ini bertindak untuk dan atas nama PT. IDstar Cipta Teknologi, dan untuk<br />
            selanjutnya disebut sebagai pihak <b>KEDUA</b>
          </p>
        </div>

        {/* Point 1: Documents & PO Table */}
        <div style={{ margin: "0 0 14px", fontSize: 13 }}>
          <p style={{ margin: "0 0 8px" }}>1. Berdasarkan dokumen-dokumen berikut :</p>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: 12.5,
              border: "1px solid #111827",
            }}
          >
            <thead>
              <tr style={{ backgroundColor: "#ffffff" }}>
                <th
                  style={{
                    border: "1px solid #111827",
                    padding: "6px 8px",
                    width: 45,
                    textAlign: "center",
                    fontWeight: 700,
                  }}
                >
                  No
                </th>
                <th
                  style={{
                    border: "1px solid #111827",
                    padding: "6px 12px",
                    width: 190,
                    textAlign: "left",
                    fontWeight: 700,
                  }}
                >
                  No PO
                </th>
                <th
                  style={{
                    border: "1px solid #111827",
                    padding: "6px 12px",
                    textAlign: "left",
                    fontWeight: 700,
                  }}
                >
                  Nama / Kode Proyek
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td
                  style={{
                    border: "1px solid #111827",
                    padding: "8px",
                    textAlign: "center",
                    verticalAlign: "top",
                  }}
                >
                  1
                </td>
                <td
                  style={{
                    border: "1px solid #111827",
                    padding: "8px 12px",
                    verticalAlign: "top",
                    fontWeight: 600,
                  }}
                >
                  {nomorPo}
                </td>
                <td
                  style={{
                    border: "1px solid #111827",
                    padding: "8px 12px",
                    verticalAlign: "top",
                    lineHeight: 1.45,
                  }}
                >
                  {namaKodeProyek}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Point 2: Completion of work */}
        <div style={{ margin: "0 0 12px", fontSize: 13, lineHeight: 1.5 }}>
          2. Pihak Pertama telah menyelesaikan pekerjaan {pekerjaanTahap} sampai tanggal<br />
          &nbsp;&nbsp;&nbsp;&nbsp;<u>{tanggalSelesai}</u> sudah selesai dilakukan.
        </div>

        {/* Point 3: Completeness & payment term */}
        <div style={{ margin: "0 0 20px", fontSize: 13, lineHeight: 1.5 }}>
          3. Dokumen BAST ini merupakan dokumen kelengkapan dan syarat pembayaran<br />
          &nbsp;&nbsp;&nbsp;&nbsp;untuk pihak KEDUA.
        </div>

        {/* Closing paragraph */}
        <p style={{ margin: "0 0 34px", fontSize: 13, lineHeight: 1.5 }}>
          Demikian Berita Acara ini dibuat dan ditandatangani oleh para pihak untuk dipergunakan sebagaimana mestinya.
        </p>

        {/* Signatures: 2 Columns */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 40,
            textAlign: "center",
            fontSize: 13,
            marginTop: 10,
          }}
        >
          {/* Pihak Pertama (Klien) */}
          <div>
            <div>Pihak Pertama</div>
            <div style={{ fontWeight: 600, marginTop: 2 }}>{pihak1Perusahaan}</div>
            <div
              style={{
                height: 80,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                position: "relative",
              }}
            >
              <span
                style={{
                  fontStyle: "italic",
                  fontSize: 12,
                  color: "#4b5563",
                  transform: "rotate(-4deg)",
                  letterSpacing: "0.5px",
                }}
              >
                {tanggalTtdPihak1}
              </span>
            </div>
            <div style={{ fontWeight: 700, textDecoration: "none" }}>{pihak1Nama}</div>
            <div
              style={{
                fontSize: 11.5,
                color: "#374151",
                marginTop: 2,
                lineHeight: 1.35,
                maxWidth: 240,
                marginLeft: "auto",
                marginRight: "auto",
              }}
            >
              {pihak1Jabatan}
            </div>
          </div>

          {/* Pihak Kedua (IDStar) */}
          <div>
            <div>Pihak Kedua</div>
            <div style={{ fontWeight: 600, marginTop: 2 }}>PT. IDstar Cipta Teknologi</div>
            <div
              style={{
                height: 80,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <img
                src="/ttd-indah.png"
                alt="Signature Indah Ananti"
                style={{ height: 50, width: "auto", display: "block" }}
              />
            </div>
            <div style={{ fontWeight: 700, textDecoration: "none" }}>{pihak2Nama}</div>
            <div
              style={{
                fontSize: 11.5,
                color: "#374151",
                marginTop: 2,
                lineHeight: 1.35,
                maxWidth: 240,
                marginLeft: "auto",
                marginRight: "auto",
              }}
            >
              {pihak2Jabatan}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
