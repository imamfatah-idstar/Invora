"use client";

import { useState } from "react";
import Link from "next/link";
import Logo from "@/components/logo";
import TombolCetak from "./tombol-cetak";

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

function formatRupiah(nilai: string | number) {
  return "Rp" + Number(nilai).toLocaleString("id-ID", { minimumFractionDigits: 2 });
}

function tanggalIndonesiaHariIni() {
  const bulanIndo = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember"
  ];
  const d = new Date();
  return `${d.getDate()} ${bulanIndo[d.getMonth()]} ${d.getFullYear()}`;
}

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
  const [pihak1Nama, setPihak1Nama] = useState(defaultPihakPertama || "Bpk/Ibu PIC Klien");
  const [pihak1Jabatan, setPihak1Jabatan] = useState("Project Manager / PIC");
  const [pihak2Nama, setPihak2Nama] = useState(defaultPihakKedua || "Aris Munandar");
  const [pihak2Jabatan, setPihak2Jabatan] = useState("Account Director");
  const [tanggalDokumen, setTanggalDokumen] = useState(tanggalIndonesiaHariIni());
  const [showConfig, setShowConfig] = useState(true);

  const namaKlienResmi = klien || "KLIEN MITRA";
  const namaPerusahaanIdstar = "PT IDstar Cipta Teknologi";
  const teksPekerjaan = keteranganTahap
    ? `tahap ${keteranganTahap}`
    : `periode layanan ${periode}`;

  // URL unduh PDF dengan parameter yang disesuaikan
  const queryPdf = new URLSearchParams({
    pihak1Nama,
    pihak1Jabatan,
    pihak2Nama,
    pihak2Jabatan,
    tgl: tanggalDokumen,
  }).toString();

  const urlPdf = `/api/pengajuan/${pengajuanId}/dokumen/${dokumenId}/pdf?${queryPdf}`;

  return (
    <div className="doc-page">
      {/* Toolbar Atas */}
      <div className="doc-toolbar no-print">
        <Link href={`/pengajuan/${pengajuanId}`} className="back-link">
          &larr; Detail Pengajuan
        </Link>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <button
            type="button"
            className="btn"
            onClick={() => setShowConfig(!showConfig)}
          >
            {showConfig ? "Sembunyikan Form Pihak" : "⚙️ Edit Pihak & Tanggal"}
          </button>
          <TombolCetak />
          <a href={urlPdf} target="_blank" className="btn btn-primary">
            ⬇ Unduh PDF BAST Non-XL
          </a>
        </div>
      </div>

      {/* Form Input Data Pihak Pertama & Kedua (Manual tiap generate sesuai Bagian 40-41) */}
      {showConfig && (
        <div className="card no-print" style={{ marginBottom: 20, background: "#fafbfc" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>
              ⚙️ Pengaturan Pihak Penandatangan BAST Non-XL
            </h3>
            <span style={{ fontSize: 12, color: "var(--color-text-muted)" }}>
              Data ini langsung tersinkron ke dokumen di bawah &amp; PDF unduhan
            </span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
            <div className="field">
              <label>Pihak Pertama — Nama ({namaKlienResmi})</label>
              <input
                type="text"
                value={pihak1Nama}
                onChange={(e) => setPihak1Nama(e.target.value)}
                placeholder="Nama PIC Klien"
              />
            </div>
            <div className="field">
              <label>Pihak Pertama — Jabatan</label>
              <input
                type="text"
                value={pihak1Jabatan}
                onChange={(e) => setPihak1Jabatan(e.target.value)}
                placeholder="Jabatan di Klien"
              />
            </div>
            <div className="field">
              <label>Pihak Kedua — Nama (IDStar)</label>
              <input
                type="text"
                value={pihak2Nama}
                onChange={(e) => setPihak2Nama(e.target.value)}
                placeholder="Nama Pejabat IDStar"
              />
            </div>
            <div className="field">
              <label>Pihak Kedua — Jabatan</label>
              <input
                type="text"
                value={pihak2Jabatan}
                onChange={(e) => setPihak2Jabatan(e.target.value)}
                placeholder="Jabatan di IDStar"
              />
            </div>
            <div className="field" style={{ gridColumn: "1 / -1" }}>
              <label>Tanggal Dokumen BAST</label>
              <input
                type="text"
                value={tanggalDokumen}
                onChange={(e) => setTanggalDokumen(e.target.value)}
                placeholder="Contoh: 21 Oktober 2026"
              />
            </div>
          </div>
        </div>
      )}

      {/* Lembar Dokumen Fisik BAST Non-XL (Format Resmi 1 Halaman) */}
      <div className="doc-sheet" style={{ padding: "40px 48px", background: "#ffffff" }}>
        <div className="doc-watermark">DRAFT</div>

        {/* Header Dokumen: Logo Klien & IDStar */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderBottom: "2px solid #111827",
            paddingBottom: 16,
            marginBottom: 24,
          }}
        >
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: "#111827", textTransform: "uppercase" }}>
              {namaKlienResmi}
            </div>
            <div style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 2 }}>
              Customer / Mitra Perusahaan
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <Logo variant="color" height={34} />
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--color-primary)", marginTop: 2 }}>
              PT IDSTAR CIPTA TEKNOLOGI
            </div>
          </div>
        </div>

        {/* Judul & Nomor Dokumen */}
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <h1 style={{ fontSize: 18, fontWeight: 800, margin: 0, textDecoration: "underline", letterSpacing: "0.03em" }}>
            BERITA ACARA SERAH TERIMA PEKERJAAN
          </h1>
          <div style={{ fontSize: 13, marginTop: 4, fontWeight: 600, color: "#374151" }}>
            Nomor: BAST/{nomorPo}/{periode}/{dokumenId}
          </div>
          <div style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 2 }}>
            Purchase Order (PO): <b>{nomorPo}</b> &middot; Proyek: <b>{namaProyek}</b>
          </div>
        </div>

        {/* Paragraf Pembuka */}
        <p style={{ fontSize: 13, lineHeight: 1.6, textAlign: "justify", marginBottom: 16 }}>
          Pada hari ini, tanggal <b>{tanggalDokumen}</b>, yang bertanda tangan di bawah ini:
        </p>

        {/* Identitas 2 Pihak */}
        <table style={{ width: "100%", fontSize: 13, marginBottom: 18, borderCollapse: "collapse" }}>
          <tbody>
            <tr>
              <td style={{ width: "25px", verticalAlign: "top", fontWeight: 700 }}>1.</td>
              <td style={{ width: "140px", verticalAlign: "top", color: "var(--color-text-muted)" }}>Nama</td>
              <td style={{ width: "15px", verticalAlign: "top" }}>:</td>
              <td style={{ verticalAlign: "top", fontWeight: 700 }}>{pihak1Nama}</td>
            </tr>
            <tr>
              <td></td>
              <td style={{ color: "var(--color-text-muted)" }}>Jabatan</td>
              <td>:</td>
              <td>{pihak1Jabatan}</td>
            </tr>
            <tr>
              <td></td>
              <td style={{ color: "var(--color-text-muted)" }}>Perusahaan</td>
              <td>:</td>
              <td><b>{namaKlienResmi}</b> (selanjutnya disebut sebagai <b>&quot;PIHAK PERTAMA&quot;</b>)</td>
            </tr>
            <tr><td colSpan={4} style={{ height: 10 }}></td></tr>
            <tr>
              <td style={{ verticalAlign: "top", fontWeight: 700 }}>2.</td>
              <td style={{ verticalAlign: "top", color: "var(--color-text-muted)" }}>Nama</td>
              <td style={{ verticalAlign: "top" }}>:</td>
              <td style={{ verticalAlign: "top", fontWeight: 700 }}>{pihak2Nama}</td>
            </tr>
            <tr>
              <td></td>
              <td style={{ color: "var(--color-text-muted)" }}>Jabatan</td>
              <td>:</td>
              <td>{pihak2Jabatan}</td>
            </tr>
            <tr>
              <td></td>
              <td style={{ color: "var(--color-text-muted)" }}>Perusahaan</td>
              <td>:</td>
              <td><b>{namaPerusahaanIdstar}</b> (selanjutnya disebut sebagai <b>&quot;PIHAK KEDUA&quot;</b>)</td>
            </tr>
          </tbody>
        </table>

        {/* Klausul Kesepakatan Serah Terima */}
        <p style={{ fontSize: 13, lineHeight: 1.6, textAlign: "justify", marginBottom: 16 }}>
          PIHAK PERTAMA dan PIHAK KEDUA secara bersama-sama menerangkan bahwa PIHAK KEDUA telah menyelesaikan pekerjaan
          penyediaan jasa keahlian / konsultan untuk proyek <b>{namaProyek}</b> pada <b>{teksPekerjaan}</b> sesuai dengan
          ketentuan Purchase Order No. <b>{nomorPo}</b>, dengan rincian serah terima sebagai berikut:
        </p>

        {/* Tabel Penugasan & Nilai */}
        <table className="doc-tabel" style={{ marginBottom: 18, fontSize: 12.5 }}>
          <thead>
            <tr>
              <th style={{ width: 40, textAlign: "center" }}>No</th>
              <th>Nama Personel</th>
              <th>Posisi / PO Line</th>
              <th style={{ textAlign: "center" }}>Hari / Acuan</th>
              <th style={{ textAlign: "right" }}>Nilai Serah Terima</th>
            </tr>
          </thead>
          <tbody>
            {rincian.map((r, i) => (
              <tr key={i}>
                <td style={{ textAlign: "center" }}>{i + 1}</td>
                <td style={{ fontWeight: 600 }}>{r.namaPersonel}</td>
                <td>
                  {r.nomorLine ? `Line ${r.nomorLine} ${r.deskripsiLine ? `(${r.deskripsiLine})` : ""}` : (namaProyek || "-")}
                </td>
                <td style={{ textAlign: "center" }}>
                  {r.hariKerjaAcuanBulan === 0 ? "-" : `${r.hariKerjaDapatDitagihkan} / ${r.hariKerjaAcuanBulan}`}
                </td>
                <td style={{ textAlign: "right", fontWeight: 600 }}>{formatRupiah(r.hasilHitung)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={4} style={{ textAlign: "right", fontWeight: 700 }}>
                Total Nilai Pekerjaan (Sebelum PPN)
              </td>
              <td style={{ textAlign: "right", fontWeight: 800, color: "var(--color-primary-dark)" }}>
                {formatRupiah(total)}
              </td>
            </tr>
          </tfoot>
        </table>

        {/* Pernyataan Penutup */}
        <p style={{ fontSize: 13, lineHeight: 1.6, textAlign: "justify", marginBottom: 32 }}>
          Pekerjaan tersebut telah diserahterimakan oleh PIHAK KEDUA dan diterima dengan baik serta lengkap oleh PIHAK PERTAMA.
          Berita Acara Serah Terima ini dibuat dalam rangkap yang cukup dan memiliki kekuatan hukum yang sah sebagai kelengkapan
          dokumen penagihan dan dasar pembayaran bagi PIHAK KEDUA.
        </p>

        {/* Kolom Tanda Tangan 2 Pihak */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32, textAlign: "center", fontSize: 13 }}>
          <div>
            <p style={{ margin: "0 0 4px", color: "var(--color-text-muted)" }}>PIHAK PERTAMA,</p>
            <p style={{ margin: "0 0 60px", fontWeight: 700 }}>{namaKlienResmi}</p>
            <p style={{ margin: 0, fontWeight: 700, textDecoration: "underline" }}>{pihak1Nama}</p>
            <p style={{ margin: "2px 0 0", color: "var(--color-text-muted)", fontSize: 12 }}>{pihak1Jabatan}</p>
          </div>
          <div>
            <p style={{ margin: "0 0 4px", color: "var(--color-text-muted)" }}>PIHAK KEDUA,</p>
            <p style={{ margin: "0 0 60px", fontWeight: 700 }}>{namaPerusahaanIdstar}</p>
            <p style={{ margin: 0, fontWeight: 700, textDecoration: "underline" }}>{pihak2Nama}</p>
            <p style={{ margin: "2px 0 0", color: "var(--color-text-muted)", fontSize: 12 }}>{pihak2Jabatan}</p>
          </div>
        </div>

        <p className="doc-footnote" style={{ marginTop: 40, fontSize: 11, textAlign: "center" }}>
          Dokumen resmi INVORA &middot; IDStar Group &middot; Dibuat pada: {dibuatPada} &middot; Dokumen ID #{dokumenId} (Versi {dokumenVersi})
        </p>
      </div>
    </div>
  );
}
