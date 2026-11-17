"use client";

import { useMemo, useState } from "react";
import { ArInvoiceRow } from "@/lib/ar-analytics";
import { formatRupiah } from "@/lib/aging";

export default function PlanVsActualView({ rows }: { rows: ArInvoiceRow[] }) {
  const [filterKlien, setFilterKlien] = useState<string>("all");
  const [filterTahun, setFilterTahun] = useState<string>("all");
  const [taxBasis, setTaxBasis] = useState<"total" | "dpp">("total");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const clients = useMemo(() => {
    const s = new Set<string>();
    rows.forEach((r) => s.add(r.klien));
    return Array.from(s).sort();
  }, [rows]);

  const years = useMemo(() => {
    const s = new Set<string>();
    rows.forEach((r) => {
      if (r.periode && r.periode.includes("-")) s.add(r.periode.split("-")[0]);
    });
    return Array.from(s).sort().reverse();
  }, [rows]);

  const filteredRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return rows.filter((r) => {
      if (filterKlien !== "all" && r.klien !== filterKlien) return false;
      if (filterTahun !== "all" && !r.periode.startsWith(filterTahun)) return false;
      if (q) {
        const hay = `${r.nomorInvoice} ${r.nomorPo} ${r.namaProyek} ${r.klien} ${r.periode}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [rows, filterKlien, filterTahun, searchQuery]);

  const kpi = useMemo(() => {
    let plan = 0;
    let actual = 0;
    let collected = 0;
    let invoicedCount = 0;

    for (const r of filteredRows) {
      plan += taxBasis === "total" ? r.planTotal : r.planDpp;
      actual += taxBasis === "total" ? r.actualInvoicedTotal : r.actualInvoicedDpp;
      collected += r.collected;
      if (r.hasOfficialInvoice) invoicedCount += 1;
    }

    const variance = actual - plan;
    const achievementPct = plan > 0 ? Math.round((actual / plan) * 1000) / 10 : 0;
    const collectionPct = actual > 0 ? Math.round((collected / actual) * 1000) / 10 : 0;

    return {
      plan,
      actual,
      collected,
      variance,
      achievementPct,
      collectionPct,
      totalCount: filteredRows.length,
      invoicedCount,
    };
  }, [filteredRows, taxBasis]);

  const byPeriod = useMemo(() => {
    const map = new Map<
      string,
      { periode: string; count: number; invoiced: number; plan: number; actual: number; collected: number }
    >();
    for (const r of filteredRows) {
      const entry = map.get(r.periode) || {
        periode: r.periode,
        count: 0,
        invoiced: 0,
        plan: 0,
        actual: 0,
        collected: 0,
      };
      entry.count += 1;
      if (r.hasOfficialInvoice) entry.invoiced += 1;
      entry.plan += taxBasis === "total" ? r.planTotal : r.planDpp;
      entry.actual += taxBasis === "total" ? r.actualInvoicedTotal : r.actualInvoicedDpp;
      entry.collected += r.collected;
      map.set(r.periode, entry);
    }
    return Array.from(map.values()).sort((a, b) => a.periode.localeCompare(b.periode));
  }, [filteredRows, taxBasis]);

  const byClient = useMemo(() => {
    const map = new Map<
      string,
      { klien: string; count: number; invoiced: number; plan: number; actual: number; collected: number }
    >();
    for (const r of filteredRows) {
      const entry = map.get(r.klien) || {
        klien: r.klien,
        count: 0,
        invoiced: 0,
        plan: 0,
        actual: 0,
        collected: 0,
      };
      entry.count += 1;
      if (r.hasOfficialInvoice) entry.invoiced += 1;
      entry.plan += taxBasis === "total" ? r.planTotal : r.planDpp;
      entry.actual += taxBasis === "total" ? r.actualInvoicedTotal : r.actualInvoicedDpp;
      entry.collected += r.collected;
      map.set(r.klien, entry);
    }
    return Array.from(map.values()).sort((a, b) => b.plan - a.plan);
  }, [filteredRows, taxBasis]);

  const maxPeriodVal = useMemo(() => {
    let m = 1;
    for (const p of byPeriod) {
      m = Math.max(m, p.plan, p.actual, p.collected);
    }
    return m;
  }, [byPeriod]);

  function exportCsv() {
    const header = [
      "Period",
      "Client",
      "PO Number",
      "Project",
      "Invoice Number",
      "Status",
      taxBasis === "total" ? "Plan (Incl. VAT)" : "Plan (DPP)",
      taxBasis === "total" ? "Actual Invoiced (Incl. VAT)" : "Actual Invoiced (DPP)",
      "Variance",
      "Achievement (%)",
      "Collected",
    ];
    const lines = [header.join(",")];
    for (const r of filteredRows) {
      const pVal = taxBasis === "total" ? r.planTotal : r.planDpp;
      const aVal = taxBasis === "total" ? r.actualInvoicedTotal : r.actualInvoicedDpp;
      const vVal = aVal - pVal;
      const pct = pVal > 0 ? ((aVal / pVal) * 100).toFixed(1) : "0.0";
      lines.push(
        [
          r.periode,
          `"${r.klien.replace(/"/g, '""')}"`,
          `"${r.nomorPo}"`,
          `"${r.namaProyek.replace(/"/g, '""')}"`,
          `"${r.nomorInvoice}"`,
          r.hasOfficialInvoice ? "Invoiced" : "Planned/Draft",
          Math.round(pVal),
          Math.round(aVal),
          Math.round(vVal),
          pct,
          Math.round(r.collected),
        ].join(",")
      );
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Invora_Plan_vs_Actual_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, marginTop: 20 }}>
      {/* Filter Controls */}
      <div className="card" style={{ padding: "14px 18px" }}>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
          <div className="field" style={{ minWidth: 160, margin: 0 }}>
            <label style={{ fontSize: 12, fontWeight: 600 }}>Client</label>
            <select value={filterKlien} onChange={(e) => setFilterKlien(e.target.value)}>
              <option value="all">All Clients</option>
              {clients.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div className="field" style={{ minWidth: 130, margin: 0 }}>
            <label style={{ fontSize: 12, fontWeight: 600 }}>Year</label>
            <select value={filterTahun} onChange={(e) => setFilterTahun(e.target.value)}>
              <option value="all">All Years</option>
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
          <div className="field" style={{ minWidth: 170, margin: 0 }}>
            <label style={{ fontSize: 12, fontWeight: 600 }}>Amount Basis</label>
            <select value={taxBasis} onChange={(e) => setTaxBasis(e.target.value as "total" | "dpp")}>
              <option value="total">Incl. VAT (Grand Total)</option>
              <option value="dpp">DPP (Before VAT)</option>
            </select>
          </div>
          <div className="field" style={{ flex: 1, minWidth: 200, margin: 0 }}>
            <label style={{ fontSize: 12, fontWeight: 600 }}>Search PO / Invoice / Project</label>
            <input
              type="text"
              placeholder="Search PO, invoice no, project..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button type="button" onClick={exportCsv} className="btn btn-primary" style={{ height: 38 }}>
            ⬇️ Export CSV
          </button>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 14 }}>
        <div className="card" style={{ padding: "16px 18px", borderLeft: "4px solid #3b82f6" }}>
          <div style={{ fontSize: 12, color: "var(--color-text-muted)", fontWeight: 600 }}>
            TOTAL INVOICE PLAN
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, color: "#0f172a", marginTop: 6 }}>
            {formatRupiah(kpi.plan)}
          </div>
          <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>
            {kpi.totalCount} submissions ({taxBasis === "total" ? "incl. VAT" : "before VAT"})
          </div>
        </div>

        <div className="card" style={{ padding: "16px 18px", borderLeft: "4px solid #10b981" }}>
          <div style={{ fontSize: 12, color: "var(--color-text-muted)", fontWeight: 600 }}>
            ACTUAL INVOICED
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, color: "#059669", marginTop: 6 }}>
            {formatRupiah(kpi.actual)}
          </div>
          <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>
            {kpi.invoicedCount} of {kpi.totalCount} submissions invoiced
          </div>
        </div>

        <div
          className="card"
          style={{
            padding: "16px 18px",
            borderLeft: `4px solid ${kpi.variance >= 0 ? "#16a34a" : "#ef4444"}`,
          }}
        >
          <div style={{ fontSize: 12, color: "var(--color-text-muted)", fontWeight: 600 }}>
            VARIANCE (ACTUAL - PLAN)
          </div>
          <div
            style={{
              fontSize: 22,
              fontWeight: 800,
              color: kpi.variance >= 0 ? "#16a34a" : "#dc2626",
              marginTop: 6,
            }}
          >
            {kpi.variance >= 0 ? "+" : ""}
            {formatRupiah(kpi.variance)}
          </div>
          <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>
            Achievement Rate: <b>{kpi.achievementPct}%</b>
          </div>
        </div>

        <div className="card" style={{ padding: "16px 18px", borderLeft: "4px solid #8b5cf6" }}>
          <div style={{ fontSize: 12, color: "var(--color-text-muted)", fontWeight: 600 }}>
            ACTUAL COLLECTED (PAID)
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, color: "#6d28d9", marginTop: 6 }}>
            {formatRupiah(kpi.collected)}
          </div>
          <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>
            Collection vs Invoiced: <b>{kpi.collectionPct}%</b>
          </div>
        </div>
      </div>

      {/* Visual Monthly Comparison Chart */}
      <div className="card" style={{ padding: "18px 20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, marginBottom: 14 }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>
              Monthly Plan vs Actual Invoiced vs Collected
            </h3>
            <p className="subtitle" style={{ margin: "2px 0 0", fontSize: 12.5 }}>
              Visual comparison across billing periods
            </p>
          </div>
          <div style={{ display: "flex", gap: 14, fontSize: 12, fontWeight: 600 }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 12, height: 12, borderRadius: 3, background: "#3b82f6", display: "inline-block" }} />
              Plan
            </span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 12, height: 12, borderRadius: 3, background: "#10b981", display: "inline-block" }} />
              Actual Invoiced
            </span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 12, height: 12, borderRadius: 3, background: "#8b5cf6", display: "inline-block" }} />
              Collected
            </span>
          </div>
        </div>

        {byPeriod.length === 0 ? (
          <p className="subtitle" style={{ margin: 0 }}>No submission data matches the selected filters.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {byPeriod.map((p) => {
              const wPlan = Math.max(2, (p.plan / maxPeriodVal) * 100);
              const wActual = Math.max(p.actual > 0 ? 2 : 0, (p.actual / maxPeriodVal) * 100);
              const wCol = Math.max(p.collected > 0 ? 2 : 0, (p.collected / maxPeriodVal) * 100);
              const pct = p.plan > 0 ? Math.round((p.actual / p.plan) * 1000) / 10 : 0;

              return (
                <div
                  key={p.periode}
                  style={{
                    padding: "10px 12px",
                    borderRadius: 8,
                    background: "#f8fafc",
                    border: "1px solid #e2e8f0",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6, fontSize: 13 }}>
                    <b>
                      {p.periode}{" "}
                      <span style={{ fontWeight: 500, color: "#64748b", fontSize: 12 }}>
                        ({p.invoiced}/{p.count} invoiced)
                      </span>
                    </b>
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 700,
                        color: pct >= 100 ? "#16a34a" : pct >= 50 ? "#d97706" : "#dc2626",
                      }}
                    >
                      Achievement: {pct}%
                    </span>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ width: 58, fontSize: 11, color: "#475569", fontWeight: 600 }}>Plan</span>
                      <div style={{ flex: 1, background: "#e2e8f0", borderRadius: 4, height: 10, overflow: "hidden" }}>
                        <div style={{ width: `${wPlan}%`, background: "#3b82f6", height: "100%", borderRadius: 4 }} />
                      </div>
                      <span style={{ width: 130, textAlign: "right", fontSize: 12, fontWeight: 600 }}>
                        {formatRupiah(p.plan)}
                      </span>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ width: 58, fontSize: 11, color: "#475569", fontWeight: 600 }}>Actual</span>
                      <div style={{ flex: 1, background: "#e2e8f0", borderRadius: 4, height: 10, overflow: "hidden" }}>
                        <div style={{ width: `${wActual}%`, background: "#10b981", height: "100%", borderRadius: 4 }} />
                      </div>
                      <span style={{ width: 130, textAlign: "right", fontSize: 12, fontWeight: 600, color: "#059669" }}>
                        {formatRupiah(p.actual)}
                      </span>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ width: 58, fontSize: 11, color: "#475569", fontWeight: 600 }}>Paid</span>
                      <div style={{ flex: 1, background: "#e2e8f0", borderRadius: 4, height: 10, overflow: "hidden" }}>
                        <div style={{ width: `${wCol}%`, background: "#8b5cf6", height: "100%", borderRadius: 4 }} />
                      </div>
                      <span style={{ width: 130, textAlign: "right", fontSize: 12, fontWeight: 600, color: "#6d28d9" }}>
                        {formatRupiah(p.collected)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Per-Client Summary */}
      <div className="card" style={{ padding: "18px 20px" }}>
        <h3 style={{ margin: "0 0 12px", fontSize: 16, fontWeight: 700 }}>Plan vs Actual by Client</h3>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Client</th>
                <th style={{ textAlign: "center" }}>Invoiced / Total</th>
                <th style={{ textAlign: "right" }}>Invoice Plan</th>
                <th style={{ textAlign: "right" }}>Actual Invoiced</th>
                <th style={{ textAlign: "right" }}>Variance</th>
                <th style={{ textAlign: "right" }}>Achievement</th>
                <th style={{ textAlign: "right" }}>Collected</th>
              </tr>
            </thead>
            <tbody>
              {byClient.map((c) => {
                const variance = c.actual - c.plan;
                const pct = c.plan > 0 ? Math.round((c.actual / c.plan) * 1000) / 10 : 0;
                return (
                  <tr key={c.klien}>
                    <td style={{ fontWeight: 600 }}>{c.klien}</td>
                    <td style={{ textAlign: "center" }}>
                      {c.invoiced} / {c.count}
                    </td>
                    <td style={{ textAlign: "right" }}>{formatRupiah(c.plan)}</td>
                    <td style={{ textAlign: "right", fontWeight: 600, color: "#059669" }}>
                      {formatRupiah(c.actual)}
                    </td>
                    <td
                      style={{
                        textAlign: "right",
                        fontWeight: 600,
                        color: variance >= 0 ? "#16a34a" : "#dc2626",
                      }}
                    >
                      {variance >= 0 ? "+" : ""}
                      {formatRupiah(variance)}
                    </td>
                    <td style={{ textAlign: "right", fontWeight: 700 }}>{pct}%</td>
                    <td style={{ textAlign: "right", color: "#6d28d9", fontWeight: 600 }}>
                      {formatRupiah(c.collected)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detailed Submissions Table */}
      <div className="card" style={{ padding: "18px 20px" }}>
        <h3 style={{ margin: "0 0 12px", fontSize: 16, fontWeight: 700 }}>
          Submission Breakdown ({filteredRows.length})
        </h3>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Period</th>
                <th>Client</th>
                <th>PO / Project</th>
                <th>Invoice No.</th>
                <th>Stage</th>
                <th style={{ textAlign: "right" }}>Plan</th>
                <th style={{ textAlign: "right" }}>Actual Invoiced</th>
                <th style={{ textAlign: "right" }}>Variance</th>
                <th style={{ textAlign: "right" }}>Collected</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((r) => {
                const pVal = taxBasis === "total" ? r.planTotal : r.planDpp;
                const aVal = taxBasis === "total" ? r.actualInvoicedTotal : r.actualInvoicedDpp;
                const variance = aVal - pVal;
                return (
                  <tr key={r.id}>
                    <td>{r.periode}</td>
                    <td>{r.klien}</td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{r.nomorPo}</div>
                      <div style={{ fontSize: 11.5, color: "#64748b" }}>{r.namaProyek}</div>
                    </td>
                    <td style={{ fontWeight: 600 }}>{r.nomorInvoice}</td>
                    <td>
                      <span className={`badge ${r.hasOfficialInvoice ? "badge-siap_diajukan" : "badge-draft"}`}>
                        {r.hasOfficialInvoice ? "Invoiced" : "Planned"}
                      </span>
                    </td>
                    <td style={{ textAlign: "right" }}>{formatRupiah(pVal)}</td>
                    <td style={{ textAlign: "right", fontWeight: 600, color: "#059669" }}>
                      {formatRupiah(aVal)}
                    </td>
                    <td
                      style={{
                        textAlign: "right",
                        fontWeight: 600,
                        color: variance >= 0 ? "#16a34a" : "#dc2626",
                      }}
                    >
                      {variance >= 0 ? "+" : ""}
                      {formatRupiah(variance)}
                    </td>
                    <td style={{ textAlign: "right", color: "#6d28d9" }}>{formatRupiah(r.collected)}</td>
                    <td>
                      <a href={`/pengajuan/${r.id}`} className="btn-text">
                        Detail &rarr;
                      </a>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
