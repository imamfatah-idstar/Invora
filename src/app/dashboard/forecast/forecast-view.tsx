"use client";

import { useState, useMemo } from "react";
import { formatRupiah } from "@/lib/aging";
import {
  CashInForecastItem,
  ForecastConfidence,
  ForecastTimeframe,
  hitungForecastItem,
  rekapForecastSummary,
} from "@/lib/cash-in-forecast";

interface RawForecastItem {
  id: number;
  periode: string;
  status: string;
  nomorInvoice?: string | null;
  tanggalSubmitInvoice?: string | null;
  tanggalApproveInvoice?: string | null;
  nilaiGrDisetujui?: string | null;
  totalHitungDetail?: number;
  tarifPpn?: string | null;
  nomorFakturPajak?: string | null;
  tanggalFakturPajak?: string | null;
  nomorPo: string;
  namaProyek: string;
  klien?: string | null;
  namaUserXl?: string | null;
  terbayar?: number;
}

interface ForecastViewProps {
  rawItems: RawForecastItem[];
}

export default function ForecastView({ rawItems }: ForecastViewProps) {
  // Scenario Controls
  const [topHari, setTopHari] = useState<number>(30);
  const [bufferHari, setBufferHari] = useState<number>(0);

  // Filters
  const [cari, setCari] = useState<string>("");
  const [filterKlien, setFilterKlien] = useState<string>("semua");
  const [filterConfidence, setFilterConfidence] = useState<string>("semua");
  const [filterTimeframe, setFilterTimeframe] = useState<string>("semua");
  const [hanyaBelumLunas, setHanyaBelumLunas] = useState<boolean>(true);

  // Hitung ulang items berdasarkan skenario TOP & Buffer
  const calculatedItems = useMemo(() => {
    return rawItems.map((raw) => hitungForecastItem(raw, topHari, bufferHari));
  }, [rawItems, topHari, bufferHari]);

  // Agregasi Ringkasan Finansial
  const summary = useMemo(() => {
    return rekapForecastSummary(calculatedItems);
  }, [calculatedItems]);

  // Daftar Klien Unik untuk Filter
  const daftarKlien = useMemo(() => {
    const setKlien = new Set(rawItems.map((r) => r.klien || "XL Axiata (Default)"));
    return Array.from(setKlien).sort();
  }, [rawItems]);

  // Filter Data Tabel
  const filteredItems = useMemo(() => {
    return calculatedItems.filter((item) => {
      if (hanyaBelumLunas && item.sisaKasMasuk <= 0) return false;
      if (filterKlien !== "semua" && item.klien !== filterKlien) return false;
      if (filterConfidence !== "semua" && item.confidence !== filterConfidence) return false;
      if (filterTimeframe !== "semua" && item.timeframe !== filterTimeframe) return false;

      if (cari.trim() !== "") {
        const query = cari.toLowerCase();
        const matchInvoice = item.nomorRef.toLowerCase().includes(query);
        const matchPo = item.nomorPo.toLowerCase().includes(query);
        const matchProyek = item.namaProyek.toLowerCase().includes(query);
        const matchKlien = item.klien.toLowerCase().includes(query);
        if (!matchInvoice && !matchPo && !matchProyek && !matchKlien) return false;
      }

      return true;
    });
  }, [calculatedItems, hanyaBelumLunas, filterKlien, filterConfidence, filterTimeframe, cari]);

  // Handler Download CSV
  const downloadCsv = () => {
    const headers = [
      "No",
      "Nomor Referensi/Invoice",
      "Nomor PO",
      "Klien",
      "Nama Proyek",
      "Periode",
      "DPP (Rp)",
      "PPN (Rp)",
      "Estimasi PPh 23 (Rp)",
      "Net Kas Masuk (Rp)",
      "Terbayar (Rp)",
      "Sisa Kas Masuk (Rp)",
      "Tanggal Acuan",
      "TOP (Hari)",
      "Buffer Delay (Hari)",
      "Estimasi Tanggal Cair",
      "Hari Menuju Cair",
      "Tingkat Kepastian",
      "Status Pengajuan",
    ];

    const rows = filteredItems.map((item, idx) => [
      idx + 1,
      `"${item.nomorRef}"`,
      `"${item.nomorPo}"`,
      `"${item.klien}"`,
      `"${item.namaProyek.replace(/"/g, '""')}"`,
      `"${item.periode}"`,
      item.dpp,
      item.ppn,
      item.estimasiPph23,
      item.netEstimasiKasMasuk,
      item.terbayar,
      item.sisaKasMasuk,
      item.tanggalAcuan,
      item.topHari,
      item.bufferHari,
      item.tanggalEstimasiCair,
      item.hariMenujuCair,
      item.confidence.toUpperCase(),
      `"${item.statusPengajuan}"`,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `CashIn_Forecast_TOP${topHari}_Buffer${bufferHari}_${new Date().toISOString().split("T")[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* 1. Header Toolbar & Skenario What-If */}
      <div
        className="card"
        style={{
          padding: "20px 24px",
          background: "linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)",
          border: "1px solid #e2e8f0",
          boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
        }}
      >
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 16 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 24 }}>📈</span>
              <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: "#0f172a" }}>
                Simulasi Skenario Arus Kas Masuk (What-If Analysis)
              </h2>
            </div>
            <p style={{ margin: "4px 0 0", fontSize: 13, color: "#64748b" }}>
              Ubah asumsi Term of Payment (TOP) atau tambahkan buffer keterlambatan bayar bank untuk melihat proyeksi likuiditas.
            </p>
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 16 }}>
            {/* Pilihan TOP */}
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: "#334155" }}>Term of Payment (TOP):</span>
              <div style={{ display: "flex", background: "#f1f5f9", padding: 3, borderRadius: 8, border: "1px solid #cbd5e1" }}>
                {[30, 45, 60].map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTopHari(t)}
                    style={{
                      padding: "6px 12px",
                      fontSize: 12.5,
                      fontWeight: topHari === t ? 700 : 500,
                      color: topHari === t ? "#ffffff" : "#475569",
                      background: topHari === t ? "#0284c7" : "transparent",
                      border: "none",
                      borderRadius: 6,
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                    }}
                  >
                    {t} Hari
                  </button>
                ))}
              </div>
            </div>

            {/* Pilihan Buffer Delay */}
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: "#334155" }}>Skenario Keterlambatan:</span>
              <select
                value={bufferHari}
                onChange={(e) => setBufferHari(Number(e.target.value))}
                style={{
                  padding: "7px 12px",
                  fontSize: 13,
                  fontWeight: 600,
                  borderRadius: 8,
                  border: "1px solid #cbd5e1",
                  background: "#ffffff",
                  color: bufferHari > 0 ? "#b45309" : "#0f172a",
                  cursor: "pointer",
                }}
              >
                <option value={0}>⚡ Tepat Waktu (+0 Hari)</option>
                <option value={7}>⚠️ Keterlambatan Ringan (+7 Hari)</option>
                <option value={14}>🚨 Stress Test Klien (+14 Hari)</option>
                <option value={30}>🛑 Keterlambatan Berat (+30 Hari)</option>
              </select>
            </div>

            <button
              type="button"
              onClick={downloadCsv}
              className="btn btn-primary"
              style={{ padding: "8px 16px", fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}
            >
              <span>📥</span>
              <span>Ekspor CSV Forecast</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Kartu Metrik KPI Finansial */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
          gap: 16,
        }}
      >
        {/* Card 1: Total Net Cash Inflow */}
        <div
          className="card"
          style={{
            padding: "18px 20px",
            borderLeft: "4px solid #0284c7",
            background: "#ffffff",
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 600, color: "#64748b", textTransform: "uppercase" }}>
            Total Proyeksi Net Kas Masuk
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, color: "#0f172a", marginTop: 4 }}>
            {formatRupiah(summary.totalNetKasMasuk)}
          </div>
          <div style={{ fontSize: 11.5, color: "#64748b", marginTop: 4 }}>
            {summary.totalItemCount} invoice & draf (net setelah PPh 23 2%)
          </div>
        </div>

        {/* Card 2: 7 Hari Ke Depan */}
        <div
          className="card"
          style={{
            padding: "18px 20px",
            borderLeft: "4px solid #16a34a",
            background: "#ffffff",
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 600, color: "#16a34a", textTransform: "uppercase" }}>
            Cair 7 Hari Ke Depan
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, color: "#15803d", marginTop: 4 }}>
            {formatRupiah(summary.totalImmediateInflow)}
          </div>
          <div style={{ fontSize: 11.5, color: "#64748b", marginTop: 4 }}>
            {summary.countImmediate} invoice segera cair minggu ini
          </div>
        </div>

        {/* Card 3: Bulan Berjalan */}
        <div
          className="card"
          style={{
            padding: "18px 20px",
            borderLeft: "4px solid #2563eb",
            background: "#ffffff",
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 600, color: "#2563eb", textTransform: "uppercase" }}>
            Proyeksi Bulan Berjalan
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, color: "#1d4ed8", marginTop: 4 }}>
            {formatRupiah(summary.totalBulanIni)}
          </div>
          <div style={{ fontSize: 11.5, color: "#64748b", marginTop: 4 }}>
            Estimasi aliran kas masuk bulan ini
          </div>
        </div>

        {/* Card 4: Bulan Depan */}
        <div
          className="card"
          style={{
            padding: "18px 20px",
            borderLeft: "4px solid #8b5cf6",
            background: "#ffffff",
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 600, color: "#8b5cf6", textTransform: "uppercase" }}>
            Proyeksi Bulan Depan
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, color: "#6d28d9", marginTop: 4 }}>
            {formatRupiah(summary.totalBulanDepan)}
          </div>
          <div style={{ fontSize: 11.5, color: "#64748b", marginTop: 4 }}>
            Pipeline kas masuk periode berikutnya
          </div>
        </div>

        {/* Card 5: Overdue / Tertunda */}
        <div
          className="card"
          style={{
            padding: "18px 20px",
            borderLeft: "4px solid #dc2626",
            background: "#ffffff",
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 600, color: "#dc2626", textTransform: "uppercase" }}>
            Overdue / Terlambat
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, color: "#b91c1c", marginTop: 4 }}>
            {formatRupiah(summary.totalOverdue)}
          </div>
          <div style={{ fontSize: 11.5, color: "#b91c1c", marginTop: 4, fontWeight: 600 }}>
            {summary.countOverdue} invoice perlu ditagih segera
          </div>
        </div>
      </div>

      {/* 3. Visual Breakdown: Tingkat Kepastian & Kontributor Klien */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: 16 }}>
        {/* Distribusi Tingkat Kepastian (Confidence) */}
        <div className="card" style={{ padding: 20 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, margin: "0 0 14px", color: "#1e293b" }}>
            🎯 Distribusi Tingkat Kepastian Pembayaran (Confidence)
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {/* Tinggi */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, marginBottom: 4 }}>
                <span style={{ fontWeight: 600, color: "#15803d" }}>🟢 Tinggi (&gt;90% - Faktur &amp; Invoice Resmi)</span>
                <span style={{ fontWeight: 700 }}>
                  {formatRupiah(summary.confidenceBreakdown.tinggi.nominal)} ({summary.confidenceBreakdown.tinggi.persentase}%)
                </span>
              </div>
              <div style={{ height: 8, background: "#f1f5f9", borderRadius: 4, overflow: "hidden" }}>
                <div
                  style={{
                    height: "100%",
                    width: `${summary.confidenceBreakdown.tinggi.persentase}%`,
                    background: "#22c55e",
                  }}
                />
              </div>
            </div>

            {/* Sedang */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, marginBottom: 4 }}>
                <span style={{ fontWeight: 600, color: "#d97706" }}>🟡 Sedang (~75% - GR Disetujui Klien)</span>
                <span style={{ fontWeight: 700 }}>
                  {formatRupiah(summary.confidenceBreakdown.sedang.nominal)} ({summary.confidenceBreakdown.sedang.persentase}%)
                </span>
              </div>
              <div style={{ height: 8, background: "#f1f5f9", borderRadius: 4, overflow: "hidden" }}>
                <div
                  style={{
                    height: "100%",
                    width: `${summary.confidenceBreakdown.sedang.persentase}%`,
                    background: "#f59e0b",
                  }}
                />
              </div>
            </div>

            {/* Proyeksi */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, marginBottom: 4 }}>
                <span style={{ fontWeight: 600, color: "#64748b" }}>⚪ Proyeksi (~50% - Draf / Proses BAST)</span>
                <span style={{ fontWeight: 700 }}>
                  {formatRupiah(summary.confidenceBreakdown.proyeksi.nominal)} ({summary.confidenceBreakdown.proyeksi.persentase}%)
                </span>
              </div>
              <div style={{ height: 8, background: "#f1f5f9", borderRadius: 4, overflow: "hidden" }}>
                <div
                  style={{
                    height: "100%",
                    width: `${summary.confidenceBreakdown.proyeksi.persentase}%`,
                    background: "#94a3b8",
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Kontributor Klien Terbesar */}
        <div className="card" style={{ padding: 20 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, margin: "0 0 14px", color: "#1e293b" }}>
            🏢 Kontributor Proyeksi Aliran Kas per Klien
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {summary.klienBreakdown.slice(0, 4).map((kb) => {
              const pct = summary.totalNetKasMasuk > 0 ? Math.round((kb.nominal / summary.totalNetKasMasuk) * 100) : 0;
              return (
                <div key={kb.klien} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ flex: 1, minWidth: 0, paddingRight: 12 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#1e293b", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
                      {kb.klien}
                    </div>
                    <div style={{ fontSize: 11.5, color: "#64748b" }}>{kb.count} invoice / pengajuan</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>{formatRupiah(kb.nominal)}</div>
                    <div style={{ fontSize: 11, color: "#64748b" }}>{pct}% dari total</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 4. Filter Toolbar */}
      <div
        className="card"
        style={{
          padding: "16px 20px",
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10, flex: 1 }}>
          {/* Input Search */}
          <input
            type="text"
            placeholder="Cari Invoice, PO, Proyek, Klien..."
            value={cari}
            onChange={(e) => setCari(e.target.value)}
            style={{
              padding: "7px 12px",
              borderRadius: 8,
              border: "1px solid #cbd5e1",
              fontSize: 13,
              minWidth: 220,
            }}
          />

          {/* Filter Klien */}
          <select
            value={filterKlien}
            onChange={(e) => setFilterKlien(e.target.value)}
            style={{
              padding: "7px 12px",
              borderRadius: 8,
              border: "1px solid #cbd5e1",
              fontSize: 13,
              background: "#ffffff",
            }}
          >
            <option value="semua">🏢 Semua Klien</option>
            {daftarKlien.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>

          {/* Filter Confidence */}
          <select
            value={filterConfidence}
            onChange={(e) => setFilterConfidence(e.target.value)}
            style={{
              padding: "7px 12px",
              borderRadius: 8,
              border: "1px solid #cbd5e1",
              fontSize: 13,
              background: "#ffffff",
            }}
          >
            <option value="semua">🎯 Semua Tingkat Kepastian</option>
            <option value="tinggi">🟢 Tinggi (Invoice Terbit)</option>
            <option value="sedang">🟡 Sedang (GR Disetujui)</option>
            <option value="proyeksi">⚪ Proyeksi (Draf)</option>
          </select>

          {/* Filter Timeframe */}
          <select
            value={filterTimeframe}
            onChange={(e) => setFilterTimeframe(e.target.value)}
            style={{
              padding: "7px 12px",
              borderRadius: 8,
              border: "1px solid #cbd5e1",
              fontSize: 13,
              background: "#ffffff",
            }}
          >
            <option value="semua">📅 Semua Jadwal</option>
            <option value="overdue">🚨 Overdue / Menunggak</option>
            <option value="minggu_1">⚡ 7 Hari Ke Depan</option>
            <option value="minggu_2">📆 8 - 14 Hari</option>
            <option value="bulan_ini">🗓️ Bulan Ini</option>
            <option value="bulan_depan">🗓️ Bulan Depan</option>
          </select>
        </div>

        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, cursor: "pointer", userSelect: "none" }}>
          <input
            type="checkbox"
            checked={hanyaBelumLunas}
            onChange={(e) => setHanyaBelumLunas(e.target.checked)}
          />
          <span style={{ fontWeight: 600, color: "#334155" }}>Hanya invoice belum lunas</span>
        </label>
      </div>

      {/* 5. Tabel Proyeksi Cash-in */}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h3 style={{ fontSize: 14, fontWeight: 700, margin: 0, color: "#0f172a" }}>
              Jadwal Proyeksi Pencairan Kas ({filteredItems.length} Data)
            </h3>
            <p style={{ margin: "2px 0 0", fontSize: 12, color: "#64748b" }}>
              Perhitungan tanggal cair otomatis memperhitungkan hari libur bank (Sabtu/Minggu digeser ke hari kerja terdekat).
            </p>
          </div>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0", textAlign: "left", color: "#475569" }}>
                <th style={{ padding: "12px 16px", fontWeight: 600 }}>Invoice / No Ref</th>
                <th style={{ padding: "12px 16px", fontWeight: 600 }}>Klien &amp; Proyek</th>
                <th style={{ padding: "12px 16px", fontWeight: 600 }}>Periode</th>
                <th style={{ padding: "12px 16px", fontWeight: 600, textAlign: "right" }}>DPP Tagihan</th>
                <th style={{ padding: "12px 16px", fontWeight: 600, textAlign: "right" }}>Pot. PPh 23 (2%)</th>
                <th style={{ padding: "12px 16px", fontWeight: 600, textAlign: "right" }}>Net Kas Masuk</th>
                <th style={{ padding: "12px 16px", fontWeight: 600 }}>Estimasi Tgl Cair</th>
                <th style={{ padding: "12px 16px", fontWeight: 600 }}>Jadwal / Status</th>
                <th style={{ padding: "12px 16px", fontWeight: 600 }}>Tingkat Kepastian</th>
                <th style={{ padding: "12px 16px", fontWeight: 600, textAlign: "center" }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={10} style={{ padding: 36, textAlign: "center", color: "#64748b" }}>
                    Tidak ada data proyeksi cash-in yang cocok dengan filter yang dipilih.
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => {
                  let badgeTimeframe = null;
                  if (item.sisaKasMasuk <= 0) {
                    badgeTimeframe = (
                      <span style={{ padding: "3px 8px", borderRadius: 4, fontSize: 11, fontWeight: 700, background: "#dcfce7", color: "#166534" }}>
                        ✓ Lunas
                      </span>
                    );
                  } else if (item.hariMenujuCair < 0) {
                    badgeTimeframe = (
                      <span style={{ padding: "3px 8px", borderRadius: 4, fontSize: 11, fontWeight: 700, background: "#fee2e2", color: "#991b1b" }}>
                        Lewat {Math.abs(item.hariMenujuCair)} hari
                      </span>
                    );
                  } else if (item.hariMenujuCair <= 7) {
                    badgeTimeframe = (
                      <span style={{ padding: "3px 8px", borderRadius: 4, fontSize: 11, fontWeight: 700, background: "#dcfce7", color: "#15803d" }}>
                        ⚡ {item.hariMenujuCair} hari lagi
                      </span>
                    );
                  } else if (item.hariMenujuCair <= 14) {
                    badgeTimeframe = (
                      <span style={{ padding: "3px 8px", borderRadius: 4, fontSize: 11, fontWeight: 700, background: "#dbeafe", color: "#1e40af" }}>
                        {item.hariMenujuCair} hari lagi
                      </span>
                    );
                  } else {
                    badgeTimeframe = (
                      <span style={{ padding: "3px 8px", borderRadius: 4, fontSize: 11, fontWeight: 600, background: "#f1f5f9", color: "#475569" }}>
                        {item.hariMenujuCair} hari lagi
                      </span>
                    );
                  }

                  let badgeConfidence = null;
                  if (item.confidence === "tinggi") {
                    badgeConfidence = (
                      <span
                        title={item.keteranganConfidence}
                        style={{ padding: "3px 8px", borderRadius: 4, fontSize: 11, fontWeight: 700, background: "rgba(34, 197, 94, 0.15)", color: "#15803d" }}
                      >
                        🟢 Tinggi (95%)
                      </span>
                    );
                  } else if (item.confidence === "sedang") {
                    badgeConfidence = (
                      <span
                        title={item.keteranganConfidence}
                        style={{ padding: "3px 8px", borderRadius: 4, fontSize: 11, fontWeight: 700, background: "rgba(245, 158, 11, 0.15)", color: "#b45309" }}
                      >
                        🟡 Sedang (75%)
                      </span>
                    );
                  } else {
                    badgeConfidence = (
                      <span
                        title={item.keteranganConfidence}
                        style={{ padding: "3px 8px", borderRadius: 4, fontSize: 11, fontWeight: 700, background: "rgba(148, 163, 184, 0.2)", color: "#475569" }}
                      >
                        ⚪ Proyeksi (50%)
                      </span>
                    );
                  }

                  return (
                    <tr key={item.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                      <td style={{ padding: "12px 16px", fontWeight: 700, color: "#0f172a" }}>
                        {item.nomorRef}
                        {item.nomorFakturPajak && (
                          <div style={{ fontSize: 11, color: "#64748b", fontWeight: 400 }}>
                            FP: {item.nomorFakturPajak}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <div style={{ fontWeight: 600, color: "#1e293b" }}>{item.klien}</div>
                        <div style={{ fontSize: 11.5, color: "#64748b" }}>{item.namaProyek}</div>
                      </td>
                      <td style={{ padding: "12px 16px", color: "#475569" }}>{item.periode}</td>
                      <td style={{ padding: "12px 16px", textAlign: "right", color: "#334155" }}>
                        {formatRupiah(item.dpp)}
                      </td>
                      <td style={{ padding: "12px 16px", textAlign: "right", color: "#dc2626" }}>
                        - {formatRupiah(item.estimasiPph23)}
                      </td>
                      <td style={{ padding: "12px 16px", textAlign: "right", fontWeight: 700, color: "#0f172a" }}>
                        {formatRupiah(item.sisaKasMasuk)}
                      </td>
                      <td style={{ padding: "12px 16px", fontWeight: 600, color: "#0369a1" }}>
                        {item.tanggalEstimasiCair}
                      </td>
                      <td style={{ padding: "12px 16px" }}>{badgeTimeframe}</td>
                      <td style={{ padding: "12px 16px" }}>{badgeConfidence}</td>
                      <td style={{ padding: "12px 16px", textAlign: "center" }}>
                        <a
                          href={`/pengajuan/${item.id}`}
                          className="btn"
                          style={{ padding: "4px 10px", fontSize: 12, background: "#f8fafc", border: "1px solid #cbd5e1" }}
                        >
                          Lihat
                        </a>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
