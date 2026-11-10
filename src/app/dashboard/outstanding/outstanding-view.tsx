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
      "Invoice No",
      "Tax Invoice No",
      "Client",
      "PO No",
      "Project Name",
      "Period",
      "Submit Date",
      "Due Date (TOP)",
      "Age (Days)",
      "Overdue (Days)",
      "Aging Category",
      "DPP (Rp)",
      "VAT (Rp)",
      "Total Amount (Rp)",
      "Outstanding Balance (Rp)",
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
              TOTAL OUTSTANDING RECEIVABLES
            </span>
            <span style={{ fontSize: 18 }}>💼</span>
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: "#1e3a8a" }}>
            {formatRupiah(summary.totalPiutang)}
          </div>
          <div style={{ fontSize: 12.5, color: "var(--color-text-muted)" }}>
            <b>{summary.totalInvoiceCount}</b> unpaid invoice(s)
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
              TOTAL OVERDUE (PAST DUE DATE)
            </span>
            <span style={{ fontSize: 18 }}>⚠️</span>
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: "#991b1b" }}>
            {formatRupiah(summary.totalOverdue)}
          </div>
          <div style={{ fontSize: 12.5, color: "#b91c1c" }}>
            <b>{summary.overdueCount}</b> invoice(s) require active follow-up
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
              DUE SOON (WITHIN 7 DAYS)
            </span>
            <span style={{ fontSize: 18 }}>⏳</span>
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: "#92400e" }}>
            {formatRupiah(summary.dueSoonNominal)}
          </div>
          <div style={{ fontSize: 12.5, color: "var(--color-text-muted)" }}>
            <b>{summary.dueSoonCount}</b> invoice(s) due this week
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
              AVERAGE RECEIVABLE AGE (DSO)
            </span>
            <span style={{ fontSize: 18 }}>⏱️</span>
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: "#065f46" }}>
            {summary.rataRataUmur} <span style={{ fontSize: 15, fontWeight: 500 }}>Days</span>
          </div>
          <div style={{ fontSize: 12.5, color: "var(--color-text-muted)" }}>
            Term of Payment (TOP): <b>{topHari} Days</b>
          </div>
        </div>
      </div>

      {/* 2. Kartu Visual Aging Schedule Distribution */}
      <div className="card" style={{ padding: "22px 24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>
              Aging Schedule Breakdown
            </h3>
            <p className="subtitle" style={{ margin: "4px 0 0", fontSize: 13 }}>
              Invoice classification by age since submission date to client.
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
              <option value={30}>TOP 30 Days (Default)</option>
              <option value={45}>TOP 45 Days</option>
              <option value={60}>TOP 60 Days</option>
              <option value={90}>TOP 90 Days</option>
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
            title={`0-30 Days: ${summary.buckets["0-30"].percentage}%`}
            style={{ width: `${summary.buckets["0-30"].percentage}%`, background: "#10b981", transition: "all 0.3s" }}
          />
          <div
            title={`31-60 Days: ${summary.buckets["31-60"].percentage}%`}
            style={{ width: `${summary.buckets["31-60"].percentage}%`, background: "#eab308", transition: "all 0.3s" }}
          />
          <div
            title={`61-90 Days: ${summary.buckets["61-90"].percentage}%`}
            style={{ width: `${summary.buckets["61-90"].percentage}%`, background: "#f97316", transition: "all 0.3s" }}
          />
          <div
            title={`>90 Days: ${summary.buckets[">90"].percentage}%`}
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
              <span style={{ fontSize: 13, fontWeight: 700, color: "#065f46" }}>0 – 30 DAYS</span>
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
              {summary.buckets["0-30"].percentage}% of total &middot; Current
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
              <span style={{ fontSize: 13, fontWeight: 700, color: "#854d0e" }}>31 – 60 DAYS</span>
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
              {summary.buckets["31-60"].percentage}% of total &middot; Minor Overdue
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
              <span style={{ fontSize: 13, fontWeight: 700, color: "#9a3412" }}>61 – 90 DAYS</span>
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
              {summary.buckets["61-90"].percentage}% of total &middot; Moderate Overdue
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
              <span style={{ fontSize: 13, fontWeight: 700, color: "#991b1b" }}>&gt; 90 DAYS</span>
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
              {summary.buckets[">90"].percentage}% of total &middot; Critical / High Risk
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
            placeholder="Search Invoice No., PO, Client, Project..."
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
            <option value="semua">All Clients</option>
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
            <option value="semua">All Aging Buckets</option>
            <option value="0-30">0 – 30 Days (Current)</option>
            <option value="31-60">31 – 60 Days (Minor Overdue)</option>
            <option value="61-90">61 – 90 Days (Moderate Overdue)</option>
            <option value=">90">&gt; 90 Days (Critical Overdue)</option>
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
            <option value="outstanding">Status: Unpaid (Outstanding)</option>
            <option value="paid">Status: Paid</option>
            <option value="all">Status: All Invoices</option>
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
            <option value="terlambat">Sort by: Highest Delay</option>
            <option value="nominal">Sort by: Highest Balance</option>
            <option value="terbaru">Sort by: Newest Date</option>
            <option value="nomor">Sort by: Invoice Number</option>
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
          <span>Export CSV</span>
        </button>
      </div>

      {/* 4. Tabel Daftar Outstanding Invoice */}
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Invoice &amp; Tax Inv.</th>
              <th>Client &amp; PO No.</th>
              <th>Project &amp; Period</th>
              <th style={{ textAlign: "right" }}>Total (+VAT)</th>
              <th style={{ textAlign: "right" }}>Paid</th>
              <th style={{ textAlign: "right" }}>Outstanding Balance</th>
              <th>Due Date</th>
              <th style={{ textAlign: "center" }}>Payment Status</th>
              <th style={{ textAlign: "center" }}>Aging Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredItems.length === 0 ? (
              <tr>
                <td colSpan={10} style={{ textAlign: "center", padding: "32px 16px", color: "var(--color-text-muted)" }}>
                  No invoices match the selected filter criteria.
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
                          Tax Inv: {item.nomorFakturPajak}
                        </div>
                      ) : (
                        <div style={{ fontSize: 11.5, color: "#9ca3af" }}>Tax Inv. not entered</div>
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
                        Period: <b>{item.periode}</b>
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
                          {item.hariTerlambat} days overdue
                        </div>
                      ) : isDueSoon ? (
                        <div style={{ fontSize: 11.5, fontWeight: 700, color: "#d97706" }}>
                          {Math.abs(item.hariTerlambat)} days remaining
                        </div>
                      ) : (
                        <div style={{ fontSize: 11.5, color: "var(--color-text-muted)" }}>
                          {Math.abs(item.hariTerlambat)} days
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
                          ? "Paid ✓"
                          : item.statusBayar === "partial"
                          ? "Partial"
                          : "Unpaid"}
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
                        {item.statusAging === "Lancar"
                          ? "Current"
                          : item.statusAging === "Overdue Ringan"
                          ? "Minor Overdue"
                          : item.statusAging === "Overdue Sedang"
                          ? "Moderate Overdue"
                          : item.statusAging === "Overdue Kritis"
                          ? "Critical Overdue"
                          : "Paid"}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                        <a
                          href={`/api/pengajuan/${item.id}/invoice/pdf`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn"
                          title="Print / Download Official PDF Invoice"
                          style={{
                            fontSize: 11.5,
                            padding: "4px 8px",
                            fontWeight: 600,
                            whiteSpace: "nowrap",
                            background: "#f8fafc",
                            color: "#334155",
                            border: "1px solid #cbd5e1",
                          }}
                        >
                          📄 PDF
                        </a>
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
                          Details &rarr;
                        </a>
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
