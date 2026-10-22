"use client";

import { useState, useMemo } from "react";
import {
  InvoiceOutstandingItem,
  AgingSummary,
  formatRupiah,
  tambahHari,
  selisihHari,
  AgingBucket,
} from "@/lib/aging";
import Decimal from "decimal.js";

type RawItem = {
  id: number;
  nomorInvoice: string;
  nomorFakturPajak?: string | null;
  tanggalFakturPajak?: string | null;
  nomorPo: string;
  namaProyek: string;
  klien?: string | null;
  periode: string;
  namaUserXl?: string | null;
  tanggalSubmitInvoice?: string | null;
  tanggalApproveInvoice?: string | null;
  nilaiGrDisetujui?: string | null;
  totalHitungDetail?: number;
  tarifPpn?: string | null;
  terbayar?: number;
};

export default function OutstandingView({
  initialData,
  tanggalHariIni,
}: {
  initialData: RawItem[];
  tanggalHariIni: string;
}) {
  const [topHari, setTopHari] = useState<number>(30);
  const [filterKlien, setFilterKlien] = useState<string>("semua");
  const [filterBucket, setFilterBucket] = useState<string>("semua");
  const [filterStatus, setFilterStatus] = useState<string>("outstanding"); // "outstanding" | "all"
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [sortBy, setSortBy] = useState<"terlambat" | "nominal" | "terbaru" | "nomor">("terlambat");

  // Dapatkan daftar klien unik
  const daftarKlien = useMemo(() => {
    const s = new Set<string>();
    initialData.forEach((d) => {
      s.add(d.klien || "XL Axiata");
    });
    return Array.from(s).sort();
  }, [initialData]);

  // Hitung ulang items berdasarkan TOP yang dipilih secara interaktif
  const processedItems = useMemo<InvoiceOutstandingItem[]>(() => {
    return initialData.map((raw) => {
      let tanggalAcuan = raw.tanggalSubmitInvoice || raw.tanggalApproveInvoice || raw.tanggalFakturPajak;
      if (!tanggalAcuan) {
        const [tahun, bulan] = raw.periode.split("-").map(Number);
        const blnDepan = bulan === 12 ? 1 : bulan + 1;
        const thnDepan = bulan === 12 ? tahun + 1 : tahun;
        tanggalAcuan = `${thnDepan}-${String(blnDepan).padStart(2, "0")}-01`;
      }

      const tanggalJatuhTempo = tambahHari(tanggalAcuan, topHari);
      const umurHari = Math.max(0, selisihHari(tanggalAcuan, tanggalHariIni));
      const hariTerlambat = selisihHari(tanggalJatuhTempo, tanggalHariIni);

      const dpp = raw.nilaiGrDisetujui
        ? new Decimal(raw.nilaiGrDisetujui).toNumber()
        : (raw.totalHitungDetail || 0);

      const tarifPpn = raw.tarifPpn ? new Decimal(raw.tarifPpn).toNumber() : 11;
      const ppn = new Decimal(dpp).times(tarifPpn).dividedBy(100).toDecimalPlaces(2).toNumber();
      const totalInvoice = new Decimal(dpp).plus(ppn).toNumber();
      const terbayar = raw.terbayar || 0;
      const sisaPiutang = Math.max(0, new Decimal(totalInvoice).minus(terbayar).toNumber());

      let bucket: AgingBucket = "0-30";
      if (umurHari <= 30) {
        bucket = "0-30";
      } else if (umurHari <= 60) {
        bucket = "31-60";
      } else if (umurHari <= 90) {
        bucket = "61-90";
      } else {
        bucket = ">90";
      }

      let statusAging: InvoiceOutstandingItem["statusAging"] = "Lancar";
      if (sisaPiutang <= 0) {
        statusAging = "Lunas";
      } else if (hariTerlambat <= 0) {
        statusAging = "Lancar";
      } else if (hariTerlambat <= 30) {
        statusAging = "Overdue Ringan";
      } else if (hariTerlambat <= 60) {
        statusAging = "Overdue Sedang";
      } else {
        statusAging = "Overdue Kritis";
      }

      return {
        id: raw.id,
        nomorInvoice: raw.nomorInvoice,
        nomorFakturPajak: raw.nomorFakturPajak || null,
        tanggalFakturPajak: raw.tanggalFakturPajak || null,
        nomorPo: raw.nomorPo,
        namaProyek: raw.namaProyek,
        klien: raw.klien || "XL Axiata",
        periode: raw.periode,
        namaUserXl: raw.namaUserXl || "-",
        tanggalSubmitInvoice: raw.tanggalSubmitInvoice || null,
        tanggalApproveInvoice: raw.tanggalApproveInvoice || null,
        tanggalAcuan,
        dpp,
        tarifPpn,
        ppn,
        totalInvoice,
        terbayar,
        sisaPiutang,
        statusBayar: sisaPiutang <= 0 ? "paid" : "unpaid",
        tanggalJatuhTempo,
        topHari,
        umurHari,
        hariTerlambat,
        bucket,
        statusAging,
      };
    });
  }, [initialData, topHari, tanggalHariIni]);

  // Hitung summary KPI
  const summary = useMemo<AgingSummary>(() => {
    let totalPiutang = new Decimal(0);
    let totalOverdue = new Decimal(0);
    let overdueCount = 0;
    let dueSoonCount = 0;
    let dueSoonNominal = new Decimal(0);
    let totalUmur = 0;

    const buckets = {
      "0-30": { count: 0, nominal: new Decimal(0) },
      "31-60": { count: 0, nominal: new Decimal(0) },
      "61-90": { count: 0, nominal: new Decimal(0) },
      ">90": { count: 0, nominal: new Decimal(0) },
    };

    const targetList = processedItems.filter((i) => i.statusBayar !== "paid");

    for (const item of targetList) {
      totalPiutang = totalPiutang.plus(item.sisaPiutang);
      totalUmur += item.umurHari;

      buckets[item.bucket].count += 1;
      buckets[item.bucket].nominal = buckets[item.bucket].nominal.plus(item.sisaPiutang);

      if (item.hariTerlambat > 0) {
        overdueCount += 1;
        totalOverdue = totalOverdue.plus(item.sisaPiutang);
      } else if (item.hariTerlambat >= -7) {
        dueSoonCount += 1;
        dueSoonNominal = dueSoonNominal.plus(item.sisaPiutang);
      }
    }

    const totalPiutangNum = totalPiutang.toNumber();
    const rataRataUmur = targetList.length > 0 ? Math.round(totalUmur / targetList.length) : 0;

    return {
      totalInvoiceCount: targetList.length,
      totalPiutang: totalPiutangNum,
      totalOverdue: totalOverdue.toNumber(),
      overdueCount,
      dueSoonCount,
      dueSoonNominal: dueSoonNominal.toNumber(),
      rataRataUmur,
      buckets: {
        "0-30": {
          count: buckets["0-30"].count,
          nominal: buckets["0-30"].nominal.toNumber(),
          percentage: totalPiutangNum > 0 ? Math.round((buckets["0-30"].nominal.toNumber() / totalPiutangNum) * 100) : 0,
        },
        "31-60": {
          count: buckets["31-60"].count,
          nominal: buckets["31-60"].nominal.toNumber(),
          percentage: totalPiutangNum > 0 ? Math.round((buckets["31-60"].nominal.toNumber() / totalPiutangNum) * 100) : 0,
        },
        "61-90": {
          count: buckets["61-90"].count,
          nominal: buckets["61-90"].nominal.toNumber(),
          percentage: totalPiutangNum > 0 ? Math.round((buckets["61-90"].nominal.toNumber() / totalPiutangNum) * 100) : 0,
        },
        ">90": {
          count: buckets[">90"].count,
          nominal: buckets[">90"].nominal.toNumber(),
          percentage: totalPiutangNum > 0 ? Math.round((buckets[">90"].nominal.toNumber() / totalPiutangNum) * 100) : 0,
        },
      },
    };
  }, [processedItems]);

  // Filter & Search
  const filteredItems = useMemo(() => {
    let list = processedItems;

    if (filterStatus === "outstanding") {
      list = list.filter((i) => i.statusBayar !== "paid");
    } else if (filterStatus === "paid") {
      list = list.filter((i) => i.statusBayar === "paid");
    }

    if (filterKlien !== "semua") {
      list = list.filter((i) => i.klien === filterKlien);
    }

    if (filterBucket !== "semua") {
      list = list.filter((i) => i.bucket === filterBucket);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (i) =>
          i.nomorInvoice.toLowerCase().includes(q) ||
          i.nomorPo.toLowerCase().includes(q) ||
          i.klien.toLowerCase().includes(q) ||
          i.namaProyek.toLowerCase().includes(q) ||
          (i.nomorFakturPajak && i.nomorFakturPajak.toLowerCase().includes(q))
      );
    }

    // Sort
    return list.sort((a, b) => {
      if (sortBy === "terlambat") {
        return b.hariTerlambat - a.hariTerlambat;
      }
      if (sortBy === "nominal") {
        return b.sisaPiutang - a.sisaPiutang;
      }
      if (sortBy === "terbaru") {
        return b.tanggalAcuan.localeCompare(a.tanggalAcuan);
      }
      return a.nomorInvoice.localeCompare(b.nomorInvoice);
    });
  }, [processedItems, filterStatus, filterKlien, filterBucket, searchQuery, sortBy]);

  // Export CSV
  function unduhCsv() {
    const headers = [
      "No Invoice",
      "No Faktur Pajak",
      "Klien",
      "No PO",
      "Nama Proyek",
      "Periode",
      "Tanggal Submit",
      "Jatuh Tempo (TOP)",
      "Umur (Hari)",
      "Keterlambatan (Hari)",
      "Kategori Aging",
      "DPP (Rp)",
      "PPN (Rp)",
      "Total Tagihan (Rp)",
      "Sisa Piutang (Rp)",
    ];

    const rows = filteredItems.map((item) => [
      `"${item.nomorInvoice}"`,
      `"${item.nomorFakturPajak || "-"}"`,
      `"${item.klien}"`,
      `"${item.nomorPo}"`,
      `"${item.namaProyek}"`,
      `"${item.periode}"`,
      `"${item.tanggalAcuan}"`,
      `"${item.tanggalJatuhTempo}"`,
      item.umurHari,
      item.hariTerlambat,
      `"${item.statusAging}"`,
      item.dpp,
      item.ppn,
      item.totalInvoice,
      item.sisaPiutang,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Aging_Outstanding_INVORA_${tanggalHariIni}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24, marginTop: 16 }}>
      {/* 1. Baris KPI Summary Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: 16,
        }}
      >
        {/* Card 1: Total Piutang */}
        <div
          className="card"
          style={{
            padding: "20px 24px",
            borderLeft: "5px solid #2563eb",
            display: "flex",
            flexDirection: "column",
            gap: 6,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-muted)" }}>
              TOTAL PIUTANG OUTSTANDING
            </span>
            <span style={{ fontSize: 18 }}>💼</span>
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: "#1e3a8a" }}>
            {formatRupiah(summary.totalPiutang)}
          </div>
          <div style={{ fontSize: 12.5, color: "var(--color-text-muted)" }}>
            <b>{summary.totalInvoiceCount}</b> invoice belum lunas
          </div>
        </div>

        {/* Card 2: Sudah Lewat Jatuh Tempo (Overdue) */}
        <div
          className="card"
          style={{
            padding: "20px 24px",
            borderLeft: "5px solid #dc2626",
            display: "flex",
            flexDirection: "column",
            gap: 6,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-muted)" }}>
              TOTAL OVERDUE (LEWAT JATUH TEMPO)
            </span>
            <span style={{ fontSize: 18 }}>⚠️</span>
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: "#991b1b" }}>
            {formatRupiah(summary.totalOverdue)}
          </div>
          <div style={{ fontSize: 12.5, color: "#b91c1c" }}>
            <b>{summary.overdueCount}</b> invoice perlu penagihan intensif
          </div>
        </div>

        {/* Card 3: Akan Jatuh Tempo dalam 7 Hari */}
        <div
          className="card"
          style={{
            padding: "20px 24px",
            borderLeft: "5px solid #f59e0b",
            display: "flex",
            flexDirection: "column",
            gap: 6,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-muted)" }}>
              JATUH TEMPO SEGERA (H-7)
            </span>
            <span style={{ fontSize: 18 }}>⏳</span>
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: "#92400e" }}>
            {formatRupiah(summary.dueSoonNominal)}
          </div>
          <div style={{ fontSize: 12.5, color: "var(--color-text-muted)" }}>
            <b>{summary.dueSoonCount}</b> invoice jatuh tempo minggu ini
          </div>
        </div>

        {/* Card 4: Rata-Rata Umur Piutang (DSO) */}
        <div
          className="card"
          style={{
            padding: "20px 24px",
            borderLeft: "5px solid #10b981",
            display: "flex",
            flexDirection: "column",
            gap: 6,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-muted)" }}>
              RATA-RATA UMUR PIUTANG (DSO)
            </span>
            <span style={{ fontSize: 18 }}>⏱️</span>
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: "#065f46" }}>
            {summary.rataRataUmur} <span style={{ fontSize: 15, fontWeight: 500 }}>Hari</span>
          </div>
          <div style={{ fontSize: 12.5, color: "var(--color-text-muted)" }}>
            Term of Payment (TOP): <b>{topHari} Hari</b>
          </div>
        </div>
      </div>

      {/* 2. Kartu Visual Aging Schedule Distribution */}
      <div className="card" style={{ padding: "22px 24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>
              Distribusi Umur Piutang (Aging Schedule Breakdown)
            </h3>
            <p className="subtitle" style={{ margin: "4px 0 0", fontSize: 13 }}>
              Klasifikasi tagihan berdasarkan usia sejak tanggal pengajuan invoice resmi ke klien.
            </p>
          </div>
          {/* Pengatur Term of Payment */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-muted)" }}>
              Term of Payment:
            </label>
            <select
              value={topHari}
              onChange={(e) => setTopHari(Number(e.target.value))}
              style={{
                padding: "6px 12px",
                borderRadius: 6,
                border: "1px solid var(--color-border)",
                fontSize: 13,
                fontWeight: 600,
                background: "var(--color-surface)",
              }}
            >
              <option value={30}>TOP 30 Hari (Default)</option>
              <option value={45}>TOP 45 Hari</option>
              <option value={60}>TOP 60 Hari</option>
              <option value={90}>TOP 90 Hari</option>
            </select>
          </div>
        </div>

        {/* Progress Bar Gabungan */}
        <div
          style={{
            height: 18,
            borderRadius: 8,
            overflow: "hidden",
            display: "flex",
            background: "#e2e8f0",
            marginBottom: 20,
          }}
        >
          <div
            title={`0-30 Hari: ${summary.buckets["0-30"].percentage}%`}
            style={{ width: `${summary.buckets["0-30"].percentage}%`, background: "#10b981", transition: "all 0.3s" }}
          />
          <div
            title={`31-60 Hari: ${summary.buckets["31-60"].percentage}%`}
            style={{ width: `${summary.buckets["31-60"].percentage}%`, background: "#eab308", transition: "all 0.3s" }}
          />
          <div
            title={`61-90 Hari: ${summary.buckets["61-90"].percentage}%`}
            style={{ width: `${summary.buckets["61-90"].percentage}%`, background: "#f97316", transition: "all 0.3s" }}
          />
          <div
            title={`>90 Hari: ${summary.buckets[">90"].percentage}%`}
            style={{ width: `${summary.buckets[">90"].percentage}%`, background: "#ef4444", transition: "all 0.3s" }}
          />
        </div>

        {/* 4 Kotak Bucket Aging */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 14 }}>
          {/* Bucket 1: 0-30 Hari */}
          <div
            onClick={() => setFilterBucket(filterBucket === "0-30" ? "semua" : "0-30")}
            style={{
              padding: "14px 16px",
              borderRadius: 8,
              border: filterBucket === "0-30" ? "2px solid #10b981" : "1px solid var(--color-border)",
              background: filterBucket === "0-30" ? "#ecfdf5" : "var(--color-bg)",
              cursor: "pointer",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#065f46" }}>0 – 30 HARI</span>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  padding: "2px 6px",
                  borderRadius: 4,
                  background: "#d1fae5",
                  color: "#065f46",
                }}
              >
                {summary.buckets["0-30"].count} Inv
              </span>
            </div>
            <div style={{ fontSize: 16, fontWeight: 800, color: "#111827" }}>
              {formatRupiah(summary.buckets["0-30"].nominal)}
            </div>
            <div style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 2 }}>
              {summary.buckets["0-30"].percentage}% dari total &middot; Lancar
            </div>
          </div>

          {/* Bucket 2: 31-60 Hari */}
          <div
            onClick={() => setFilterBucket(filterBucket === "31-60" ? "semua" : "31-60")}
            style={{
              padding: "14px 16px",
              borderRadius: 8,
              border: filterBucket === "31-60" ? "2px solid #eab308" : "1px solid var(--color-border)",
              background: filterBucket === "31-60" ? "#fefce8" : "var(--color-bg)",
              cursor: "pointer",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#854d0e" }}>31 – 60 HARI</span>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  padding: "2px 6px",
                  borderRadius: 4,
                  background: "#fef08a",
                  color: "#854d0e",
                }}
              >
                {summary.buckets["31-60"].count} Inv
              </span>
            </div>
            <div style={{ fontSize: 16, fontWeight: 800, color: "#111827" }}>
              {formatRupiah(summary.buckets["31-60"].nominal)}
            </div>
            <div style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 2 }}>
              {summary.buckets["31-60"].percentage}% dari total &middot; Overdue Ringan
            </div>
          </div>

          {/* Bucket 3: 61-90 Hari */}
          <div
            onClick={() => setFilterBucket(filterBucket === "61-90" ? "semua" : "61-90")}
            style={{
              padding: "14px 16px",
              borderRadius: 8,
              border: filterBucket === "61-90" ? "2px solid #f97316" : "1px solid var(--color-border)",
              background: filterBucket === "61-90" ? "#fff7ed" : "var(--color-bg)",
              cursor: "pointer",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#9a3412" }}>61 – 90 HARI</span>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  padding: "2px 6px",
                  borderRadius: 4,
                  background: "#ffedd5",
                  color: "#9a3412",
                }}
              >
                {summary.buckets["61-90"].count} Inv
              </span>
            </div>
            <div style={{ fontSize: 16, fontWeight: 800, color: "#111827" }}>
              {formatRupiah(summary.buckets["61-90"].nominal)}
            </div>
            <div style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 2 }}>
              {summary.buckets["61-90"].percentage}% dari total &middot; Overdue Sedang
            </div>
          </div>

          {/* Bucket 4: >90 Hari */}
          <div
            onClick={() => setFilterBucket(filterBucket === ">90" ? "semua" : ">90")}
            style={{
              padding: "14px 16px",
              borderRadius: 8,
              border: filterBucket === ">90" ? "2px solid #ef4444" : "1px solid var(--color-border)",
              background: filterBucket === ">90" ? "#fef2f2" : "var(--color-bg)",
              cursor: "pointer",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#991b1b" }}>&gt; 90 HARI</span>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  padding: "2px 6px",
                  borderRadius: 4,
                  background: "#fee2e2",
                  color: "#991b1b",
                }}
              >
                {summary.buckets[">90"].count} Inv
              </span>
            </div>
            <div style={{ fontSize: 16, fontWeight: 800, color: "#111827" }}>
              {formatRupiah(summary.buckets[">90"].nominal)}
            </div>
            <div style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 2 }}>
              {summary.buckets[">90"].percentage}% dari total &middot; Kritis / High Risk
            </div>
          </div>
        </div>
      </div>

      {/* 3. Toolbar Filter & Pencarian */}
      <div
        className="card"
        style={{
          padding: 16,
          display: "flex",
          flexWrap: "wrap",
          gap: 12,
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", flex: "1 1 500px" }}>
          {/* Search Box */}
          <input
            type="text"
            placeholder="Cari No. Invoice, PO, Klien, Proyek..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              padding: "7px 12px",
              borderRadius: 6,
              border: "1px solid var(--color-border)",
              fontSize: 13,
              minWidth: 260,
              flex: "1 1 auto",
            }}
          />

          {/* Filter Klien */}
          <select
            value={filterKlien}
            onChange={(e) => setFilterKlien(e.target.value)}
            style={{
              padding: "7px 10px",
              borderRadius: 6,
              border: "1px solid var(--color-border)",
              fontSize: 13,
              background: "var(--color-surface)",
            }}
          >
            <option value="semua">Semua Klien</option>
            {daftarKlien.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>

          {/* Filter Bucket */}
          <select
            value={filterBucket}
            onChange={(e) => setFilterBucket(e.target.value)}
            style={{
              padding: "7px 10px",
              borderRadius: 6,
              border: "1px solid var(--color-border)",
              fontSize: 13,
              background: "var(--color-surface)",
            }}
          >
            <option value="semua">Semua Umur Piutang</option>
            <option value="0-30">0 – 30 Hari (Lancar)</option>
            <option value="31-60">31 – 60 Hari (Overdue Ringan)</option>
            <option value="61-90">61 – 90 Hari (Overdue Sedang)</option>
            <option value=">90">&gt; 90 Hari (Overdue Kritis)</option>
          </select>

          {/* Filter Status Pembayaran */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            style={{
              padding: "7px 10px",
              borderRadius: 6,
              border: "1px solid var(--color-border)",
              fontSize: 13,
              background: "var(--color-surface)",
            }}
          >
            <option value="outstanding">Status: Belum Lunas (Outstanding)</option>
            <option value="paid">Status: Sudah Lunas (Paid)</option>
            <option value="all">Status: Semua Tagihan</option>
          </select>

          {/* Urutkan */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            style={{
              padding: "7px 10px",
              borderRadius: 6,
              border: "1px solid var(--color-border)",
              fontSize: 13,
              background: "var(--color-surface)",
            }}
          >
            <option value="terlambat">Urutkan: Keterlambatan Tertinggi</option>
            <option value="nominal">Urutkan: Nominal Terbesar</option>
            <option value="terbaru">Urutkan: Tanggal Terbaru</option>
            <option value="nomor">Urutkan: Nomor Invoice</option>
          </select>
        </div>

        {/* Action Button: Download CSV */}
        <button
          type="button"
          onClick={unduhCsv}
          className="btn"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            fontSize: 13,
            fontWeight: 600,
            padding: "8px 16px",
          }}
        >
          <span>📥</span>
          <span>Ekspor CSV</span>
        </button>
      </div>

      {/* 4. Tabel Daftar Outstanding Invoice */}
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>No. Invoice &amp; Faktur</th>
              <th>Klien &amp; No. PO</th>
              <th>Proyek &amp; Periode</th>
              <th style={{ textAlign: "right" }}>Total (+PPN)</th>
              <th style={{ textAlign: "right" }}>Terbayar</th>
              <th style={{ textAlign: "right" }}>Sisa Piutang</th>
              <th>Jatuh Tempo</th>
              <th style={{ textAlign: "center" }}>Status Bayar</th>
              <th style={{ textAlign: "center" }}>Status Aging</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {filteredItems.length === 0 ? (
              <tr>
                <td colSpan={10} style={{ textAlign: "center", padding: "32px 16px", color: "var(--color-text-muted)" }}>
                  Tidak ada invoice yang sesuai dengan kriteria filter.
                </td>
              </tr>
            ) : (
              filteredItems.map((item) => {
                const isOverdue = item.hariTerlambat > 0;
                const isDueSoon = item.hariTerlambat <= 0 && item.hariTerlambat >= -7;

                let badgeColor = "#065f46";
                let badgeBg = "#d1fae5";

                if (item.bucket === "31-60") {
                  badgeColor = "#854d0e";
                  badgeBg = "#fef08a";
                } else if (item.bucket === "61-90") {
                  badgeColor = "#9a3412";
                  badgeBg = "#ffedd5";
                } else if (item.bucket === ">90") {
                  badgeColor = "#991b1b";
                  badgeBg = "#fee2e2";
                }

                return (
                  <tr
                    key={item.id}
                    style={{
                      background: isOverdue ? "rgba(239, 68, 68, 0.04)" : undefined,
                    }}
                  >
                    <td>
                      <div style={{ fontWeight: 700, color: "#111827" }}>{item.nomorInvoice}</div>
                      {item.nomorFakturPajak ? (
                        <div style={{ fontSize: 11.5, color: "var(--color-text-muted)" }}>
                          Faktur: {item.nomorFakturPajak}
                        </div>
                      ) : (
                        <div style={{ fontSize: 11.5, color: "#9ca3af" }}>Faktur belum diisi</div>
                      )}
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{item.klien}</div>
                      <div style={{ fontSize: 12, color: "var(--color-text-muted)" }}>PO: {item.nomorPo}</div>
                    </td>
                    <td>
                      <div style={{ maxWidth: 220, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {item.namaProyek}
                      </div>
                      <div style={{ fontSize: 11.5, color: "var(--color-text-muted)" }}>
                        Periode: <b>{item.periode}</b>
                      </div>
                    </td>
                    <td style={{ textAlign: "right", fontFamily: "var(--font-mono, monospace)" }}>
                      {formatRupiah(item.totalInvoice)}
                    </td>
                    <td style={{ textAlign: "right", fontFamily: "var(--font-mono, monospace)", color: "#059669" }}>
                      {formatRupiah(item.terbayar)}
                    </td>
                    <td style={{ textAlign: "right", fontWeight: 700, fontFamily: "var(--font-mono, monospace)", color: item.sisaPiutang > 0 ? "#dc2626" : "#059669" }}>
                      {formatRupiah(item.sisaPiutang)}
                    </td>
                    <td>
                      <div style={{ fontSize: 12.5, fontWeight: 600 }}>{item.tanggalJatuhTempo}</div>
                      {isOverdue ? (
                        <div style={{ fontSize: 11.5, fontWeight: 700, color: "#dc2626" }}>
                          Lewat {item.hariTerlambat} hari
                        </div>
                      ) : isDueSoon ? (
                        <div style={{ fontSize: 11.5, fontWeight: 700, color: "#d97706" }}>
                          Sisa {Math.abs(item.hariTerlambat)} hari lagi
                        </div>
                      ) : (
                        <div style={{ fontSize: 11.5, color: "var(--color-text-muted)" }}>
                          Sisa {Math.abs(item.hariTerlambat)} hari
                        </div>
                      )}
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <span
                        style={{
                          display: "inline-block",
                          padding: "3px 8px",
                          borderRadius: 6,
                          fontSize: 11,
                          fontWeight: 700,
                          background:
                            item.statusBayar === "paid"
                              ? "#d1fae5"
                              : item.statusBayar === "partial"
                              ? "#fef08a"
                              : "#fee2e2",
                          color:
                            item.statusBayar === "paid"
                              ? "#065f46"
                              : item.statusBayar === "partial"
                              ? "#854d0e"
                              : "#991b1b",
                        }}
                      >
                        {item.statusBayar === "paid"
                          ? "Lunas ✓"
                          : item.statusBayar === "partial"
                          ? "Sebagian"
                          : "Belum Bayar"}
                      </span>
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <span
                        style={{
                          display: "inline-block",
                          padding: "4px 8px",
                          borderRadius: 6,
                          fontSize: 11.5,
                          fontWeight: 700,
                          background: badgeBg,
                          color: badgeColor,
                        }}
                      >
                        {item.statusAging}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                        <a
                          href={`/pengajuan/${item.id}`}
                          className="btn"
                          style={{
                            fontSize: 12,
                            padding: "4px 8px",
                            fontWeight: 600,
                            whiteSpace: "nowrap",
                          }}
                        >
                          Detail &rarr;
                        </a>
                        {item.statusBayar !== "paid" && (
                          <a
                            href={`/pengajuan/${item.id}`}
                            className="btn"
                            title="Buka form & buat pengingat jatuh tempo ke klien"
                            style={{
                              fontSize: 11.5,
                              padding: "4px 8px",
                              fontWeight: 600,
                              whiteSpace: "nowrap",
                              background: isOverdue ? "#fee2e2" : isDueSoon ? "#fef3c7" : "#f1f5f9",
                              color: isOverdue ? "#991b1b" : isDueSoon ? "#92400e" : "#334155",
                              border: `1px solid ${isOverdue ? "#fca5a5" : isDueSoon ? "#fde68a" : "#cbd5e1"}`,
                            }}
                          >
                            ✉️ Ingatkan
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
