"use client";

import { useState, useEffect } from "react";
import { getGreetingName } from "@/lib/user-roles";
import type { DashboardArAnalytics } from "@/lib/ar-analytics";
import { formatRupiah } from "@/lib/aging";

export type MenuItem = {
  href: string;
  label: string;
  deskripsi: string;
  icon?: string;
};

type Props = {
  user: { nama: string; role: string; email?: string };
  menu: MenuItem[];
  arAnalytics: DashboardArAnalytics;
};

export default function DashboardView({ user, menu, arAnalytics }: Props) {
  const [buka, setBuka] = useState(true);
  const [activeTab, setActiveTab] = useState<"outstanding" | "aging" | "plan">("outstanding");

  // Ambil preferensi buka/tutup dari localStorage saat pertama kali dimuat
  useEffect(() => {
    try {
      const tersimpan = localStorage.getItem("invora_dashboard_sidebar");
      if (tersimpan !== null) {
        setBuka(tersimpan === "true");
      }
    } catch {}
  }, []);

  function toggleSidebar() {
    setBuka((prev) => {
      const baru = !prev;
      try {
        localStorage.setItem("invora_dashboard_sidebar", String(baru));
      } catch {}
      return baru;
    });
  }

  return (
    <div className="admin-shell">
      {/* Sidebar Navigasi yang bisa buka/tutup */}
      <nav className={`admin-sidebar ${buka ? "" : "collapsed"}`} aria-label="Sidebar Menu">
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "4px 8px 12px",
          borderBottom: "1px solid var(--color-border)",
          marginBottom: 10
        }}>
          <h3 style={{ margin: 0, padding: 0, fontSize: 12, fontWeight: 700 }}>Navigation</h3>
          <button
            type="button"
            onClick={toggleSidebar}
            title="Collapse sidebar"
            style={{
              background: "transparent",
              border: "1px solid var(--color-border)",
              borderRadius: 6,
              cursor: "pointer",
              padding: "4px 8px",
              fontSize: 12,
              display: "flex",
              alignItems: "center",
              gap: 4,
              color: "var(--color-text-muted)"
            }}
          >
            <span>◀</span>
            <span>Collapse</span>
          </button>
        </div>

        <ul className="admin-nav">
          {menu.map((m) => (
            <li key={m.href}>
              <a href={m.href}>
                {m.icon && <span style={{ fontSize: 16 }}>{m.icon}</span>}
                <span style={{ fontWeight: 500 }}>{m.label}</span>
              </a>
            </li>
          ))}
        </ul>
      </nav>

      {/* Konten Utama */}
      <main className="admin-content">
        {/* Tombol Toggle Buka/Tutup Sidebar di atas konten */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
          <button
            type="button"
            onClick={toggleSidebar}
            className="btn"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "7px 14px",
              fontSize: 13,
              fontWeight: 600,
              background: "var(--color-surface)",
              border: "1px solid var(--color-border)",
              borderRadius: 8,
              boxShadow: "var(--shadow-sm)",
              cursor: "pointer",
            }}
            title={buka ? "Collapse Sidebar" : "Expand Sidebar"}
          >
            <span style={{ fontSize: 15 }}>☰</span>
            <span>{buka ? "Hide Menu" : "Show Menu"}</span>
          </button>
        </div>

        <div style={{ marginBottom: 20 }}>
          <h1 style={{ fontSize: 24, fontWeight: 800, margin: "0 0 6px 0", color: "#111827" }}>
            Hai {getGreetingName(user.email, user.nama)}
          </h1>
          <p className="subtitle" style={{ margin: 0 }}>
            Welcome to <b>INVORA</b> (Invoice Operations &amp; Revenue Assurance) &middot; IDStar Group.
          </p>
        </div>

        {/* Executive Dashboard: 1. Outstanding AR | 2. Aging AR | 3. Inv Plan vs Actual */}
        <section
          className="card"
          style={{
            marginBottom: 24,
            padding: "18px 20px",
            borderRadius: 12,
            border: "1px solid var(--color-border)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 12,
              marginBottom: 16,
              paddingBottom: 12,
              borderBottom: "1px solid var(--color-border)",
            }}
          >
            <div>
              <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: "#0f172a" }}>
                📊 AR &amp; Invoicing Overview
              </h2>
              <p className="subtitle" style={{ margin: "2px 0 0", fontSize: 12.5 }}>
                Real-time summary as of {arAnalytics.tanggalHariIni} (Standard TOP: 30 days)
              </p>
            </div>

            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={() => setActiveTab("outstanding")}
                className={`btn ${activeTab === "outstanding" ? "btn-primary" : ""}`}
                style={{ fontSize: 12.5, padding: "6px 12px", fontWeight: 600 }}
              >
                1. Outstanding AR
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("aging")}
                className={`btn ${activeTab === "aging" ? "btn-primary" : ""}`}
                style={{ fontSize: 12.5, padding: "6px 12px", fontWeight: 600 }}
              >
                2. Aging AR
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("plan")}
                className={`btn ${activeTab === "plan" ? "btn-primary" : ""}`}
                style={{ fontSize: 12.5, padding: "6px 12px", fontWeight: 600 }}
              >
                3. Inv Plan vs Actual
              </button>
            </div>
          </div>

          {/* TAB 1: OUTSTANDING AR */}
          {activeTab === "outstanding" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(195px, 1fr))", gap: 12 }}>
                <div style={{ padding: "12px 14px", borderRadius: 8, background: "#fff7ed", border: "1px solid #fed7aa" }}>
                  <div style={{ fontSize: 11.5, fontWeight: 700, color: "#9a3412" }}>TOTAL OUTSTANDING AR</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: "#c2410c", marginTop: 4 }}>
                    {formatRupiah(arAnalytics.outstandingAr.totalOutstanding)}
                  </div>
                  <div style={{ fontSize: 11.5, color: "#7c2d12", marginTop: 2 }}>
                    {arAnalytics.outstandingAr.outstandingCount} unpaid invoice(s) &middot; Avg {arAnalytics.outstandingAr.rataRataUmur} days
                  </div>
                </div>

                <div style={{ padding: "12px 14px", borderRadius: 8, background: "#fef2f2", border: "1px solid #fecaca" }}>
                  <div style={{ fontSize: 11.5, fontWeight: 700, color: "#991b1b" }}>OVERDUE AR</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: "#dc2626", marginTop: 4 }}>
                    {formatRupiah(arAnalytics.outstandingAr.totalOverdue)}
                  </div>
                  <div style={{ fontSize: 11.5, color: "#7f1d1d", marginTop: 2 }}>
                    {arAnalytics.outstandingAr.overdueCount} invoice(s) past due
                  </div>
                </div>

                <div style={{ padding: "12px 14px", borderRadius: 8, background: "#fefce8", border: "1px solid #fde047" }}>
                  <div style={{ fontSize: 11.5, fontWeight: 700, color: "#854d0e" }}>DUE WITHIN 7 DAYS</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: "#a16207", marginTop: 4 }}>
                    {formatRupiah(arAnalytics.outstandingAr.dueSoonNominal)}
                  </div>
                  <div style={{ fontSize: 11.5, color: "#713f12", marginTop: 2 }}>
                    {arAnalytics.outstandingAr.dueSoonCount} invoice(s) due soon
                  </div>
                </div>

                <div style={{ padding: "12px 14px", borderRadius: 8, background: "#ecfdf5", border: "1px solid #a7f3d0" }}>
                  <div style={{ fontSize: 11.5, fontWeight: 700, color: "#065f46" }}>COLLECTED / PAID</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: "#059669", marginTop: 4 }}>
                    {formatRupiah(arAnalytics.outstandingAr.totalCollected)}
                  </div>
                  <div style={{ fontSize: 11.5, color: "#064e3b", marginTop: 2 }}>
                    Collection rate: <b>{arAnalytics.outstandingAr.collectionRatePct}%</b> of {formatRupiah(arAnalytics.outstandingAr.totalInvoiced)}
                  </div>
                </div>
              </div>

              {arAnalytics.outstandingAr.topOutstanding.length > 0 ? (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Invoice No.</th>
                        <th>Client</th>
                        <th>PO / Period</th>
                        <th>Due Date</th>
                        <th>Age / Overdue</th>
                        <th style={{ textAlign: "right" }}>Outstanding AR</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {arAnalytics.outstandingAr.topOutstanding.map((row) => (
                        <tr key={row.id}>
                          <td style={{ fontWeight: 600 }}>{row.nomorInvoice}</td>
                          <td>{row.klien}</td>
                          <td>
                            <div style={{ fontWeight: 600 }}>{row.nomorPo}</div>
                            <div style={{ fontSize: 11.5, color: "#64748b" }}>{row.periode}</div>
                          </td>
                          <td>{row.tanggalJatuhTempo}</td>
                          <td>
                            {row.hariTerlambat > 0 ? (
                              <span className="badge badge-danger">Overdue {row.hariTerlambat}d</span>
                            ) : (
                              <span className="badge badge-siap_diajukan">{row.umurHari}d (Current)</span>
                            )}
                          </td>
                          <td style={{ textAlign: "right", fontWeight: 700, color: "#c2410c" }}>
                            {formatRupiah(row.outstanding)}
                          </td>
                          <td>
                            <a href={`/pengajuan/${row.id}`} className="btn-text">
                              Detail &rarr;
                            </a>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="alert alert-success" style={{ margin: 0 }}>
                  ✓ All issued invoices have been paid in full (No Outstanding AR).
                </div>
              )}

              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <a href="/dashboard/outstanding" className="btn btn-primary" style={{ fontSize: 12.5 }}>
                  Open Full Outstanding &amp; Aging Schedule &rarr;
                </a>
              </div>
            </div>
          )}

          {/* TAB 2: AGING AR */}
          {activeTab === "aging" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
                {arAnalytics.agingAr.buckets.map((b) => {
                  const palette: Record<string, { bg: string; border: string; text: string; bar: string }> = {
                    "0-30": { bg: "#ecfdf5", border: "#a7f3d0", text: "#065f46", bar: "#10b981" },
                    "31-60": { bg: "#fefce8", border: "#fde047", text: "#854d0e", bar: "#eab308" },
                    "61-90": { bg: "#fff7ed", border: "#fed7aa", text: "#9a3412", bar: "#f97316" },
                    ">90": { bg: "#fef2f2", border: "#fecaca", text: "#991b1b", bar: "#ef4444" },
                  };
                  const pal = palette[b.bucket] || palette["0-30"];
                  return (
                    <div
                      key={b.bucket}
                      style={{
                        padding: "14px 16px",
                        borderRadius: 8,
                        background: pal.bg,
                        border: `1px solid ${pal.border}`,
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: pal.text }}>{b.label}</span>
                        <span style={{ fontSize: 11.5, fontWeight: 700, color: pal.text }}>{b.percentage}%</span>
                      </div>
                      <div style={{ fontSize: 20, fontWeight: 800, color: pal.text, marginTop: 6 }}>
                        {formatRupiah(b.nominal)}
                      </div>
                      <div style={{ fontSize: 11.5, color: pal.text, opacity: 0.85, marginTop: 2 }}>
                        {b.count} invoice(s)
                      </div>
                      <div style={{ marginTop: 8, height: 6, borderRadius: 4, background: "rgba(0,0,0,0.08)", overflow: "hidden" }}>
                        <div style={{ width: `${Math.min(100, b.percentage)}%`, height: "100%", background: pal.bar }} />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Stacked Aging Distribution Bar */}
              <div style={{ padding: "12px 14px", borderRadius: 8, background: "#f8fafc", border: "1px solid #e2e8f0" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, marginBottom: 8 }}>
                  <b>Aging AR Composition</b>
                  <span>
                    Total Outstanding: <b>{formatRupiah(arAnalytics.agingAr.totalOutstanding)}</b>
                  </span>
                </div>
                <div style={{ display: "flex", height: 14, borderRadius: 7, overflow: "hidden", background: "#e2e8f0" }}>
                  {arAnalytics.agingAr.buckets.map((b) => {
                    const colors: Record<string, string> = {
                      "0-30": "#10b981",
                      "31-60": "#eab308",
                      "61-90": "#f97316",
                      ">90": "#ef4444",
                    };
                    if (b.percentage <= 0) return null;
                    return (
                      <div
                        key={b.bucket}
                        title={`${b.label}: ${formatRupiah(b.nominal)} (${b.percentage}%)`}
                        style={{ width: `${b.percentage}%`, background: colors[b.bucket], height: "100%" }}
                      />
                    );
                  })}
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <a href="/dashboard/outstanding" className="btn btn-primary" style={{ fontSize: 12.5 }}>
                  View Detailed Aging Breakdown &rarr;
                </a>
              </div>
            </div>
          )}

          {/* TAB 3: INV PLAN VS ACTUAL */}
          {activeTab === "plan" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(195px, 1fr))", gap: 12 }}>
                <div style={{ padding: "12px 14px", borderRadius: 8, background: "#eff6ff", border: "1px solid #bfdbfe" }}>
                  <div style={{ fontSize: 11.5, fontWeight: 700, color: "#1e40af" }}>INVOICE PLAN (INCL. VAT)</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: "#1d4ed8", marginTop: 4 }}>
                    {formatRupiah(arAnalytics.planVsActual.totalPlanTotal)}
                  </div>
                  <div style={{ fontSize: 11.5, color: "#1e3a8a", marginTop: 2 }}>
                    DPP: {formatRupiah(arAnalytics.planVsActual.totalPlanDpp)}
                  </div>
                </div>

                <div style={{ padding: "12px 14px", borderRadius: 8, background: "#ecfdf5", border: "1px solid #a7f3d0" }}>
                  <div style={{ fontSize: 11.5, fontWeight: 700, color: "#065f46" }}>ACTUAL INVOICED</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: "#059669", marginTop: 4 }}>
                    {formatRupiah(arAnalytics.planVsActual.totalActualTotal)}
                  </div>
                  <div style={{ fontSize: 11.5, color: "#064e3b", marginTop: 2 }}>
                    Achievement: <b>{arAnalytics.planVsActual.achievementPct}%</b>
                  </div>
                </div>

                <div
                  style={{
                    padding: "12px 14px",
                    borderRadius: 8,
                    background: arAnalytics.planVsActual.varianceTotal >= 0 ? "#f0fdf4" : "#fef2f2",
                    border: `1px solid ${arAnalytics.planVsActual.varianceTotal >= 0 ? "#bbf7d0" : "#fecaca"}`,
                  }}
                >
                  <div
                    style={{
                      fontSize: 11.5,
                      fontWeight: 700,
                      color: arAnalytics.planVsActual.varianceTotal >= 0 ? "#166534" : "#991b1b",
                    }}
                  >
                    VARIANCE (ACTUAL - PLAN)
                  </div>
                  <div
                    style={{
                      fontSize: 20,
                      fontWeight: 800,
                      color: arAnalytics.planVsActual.varianceTotal >= 0 ? "#16a34a" : "#dc2626",
                      marginTop: 4,
                    }}
                  >
                    {arAnalytics.planVsActual.varianceTotal >= 0 ? "+" : ""}
                    {formatRupiah(arAnalytics.planVsActual.varianceTotal)}
                  </div>
                  <div style={{ fontSize: 11.5, color: "#475569", marginTop: 2 }}>
                    Across {arAnalytics.planVsActual.rows.length} submission(s)
                  </div>
                </div>

                <div style={{ padding: "12px 14px", borderRadius: 8, background: "#f5f3ff", border: "1px solid #ddd6fe" }}>
                  <div style={{ fontSize: 11.5, fontWeight: 700, color: "#5b21b6" }}>ACTUAL COLLECTED</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: "#6d28d9", marginTop: 4 }}>
                    {formatRupiah(arAnalytics.planVsActual.totalCollected)}
                  </div>
                  <div style={{ fontSize: 11.5, color: "#4c1d95", marginTop: 2 }}>
                    Verified client payments
                  </div>
                </div>
              </div>

              {arAnalytics.planVsActual.byPeriod.length > 0 && (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Period</th>
                        <th style={{ textAlign: "center" }}>Invoiced / Submissions</th>
                        <th style={{ textAlign: "right" }}>Inv Plan</th>
                        <th style={{ textAlign: "right" }}>Actual Invoiced</th>
                        <th style={{ textAlign: "right" }}>Variance</th>
                        <th style={{ textAlign: "right" }}>Achievement</th>
                        <th style={{ textAlign: "right" }}>Collected</th>
                      </tr>
                    </thead>
                    <tbody>
                      {arAnalytics.planVsActual.byPeriod.slice(-6).map((p) => (
                        <tr key={p.periode}>
                          <td style={{ fontWeight: 600 }}>{p.periode}</td>
                          <td style={{ textAlign: "center" }}>
                            {p.invoicedCount} / {p.submissionCount}
                          </td>
                          <td style={{ textAlign: "right" }}>{formatRupiah(p.planTotal)}</td>
                          <td style={{ textAlign: "right", fontWeight: 600, color: "#059669" }}>
                            {formatRupiah(p.actualTotal)}
                          </td>
                          <td
                            style={{
                              textAlign: "right",
                              fontWeight: 600,
                              color: p.varianceTotal >= 0 ? "#16a34a" : "#dc2626",
                            }}
                          >
                            {p.varianceTotal >= 0 ? "+" : ""}
                            {formatRupiah(p.varianceTotal)}
                          </td>
                          <td style={{ textAlign: "right", fontWeight: 700 }}>{p.achievementPct}%</td>
                          <td style={{ textAlign: "right", color: "#6d28d9", fontWeight: 600 }}>
                            {formatRupiah(p.collected)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <a href="/dashboard/plan-vs-actual" className="btn btn-primary" style={{ fontSize: 12.5 }}>
                  Open Full Inv Plan vs Actual Report &rarr;
                </a>
              </div>
            </div>
          )}
        </section>

        {/* Kartu Navigasi Utama */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: 16,
          marginTop: 8
        }}>
          {menu.map((m) => (
            <a
              key={m.href}
              href={m.href}
              className="card"
              style={{
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                padding: 20,
                borderRadius: 12,
                transition: "all 0.15s ease",
                border: "1px solid var(--color-border)"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "var(--color-primary)";
                e.currentTarget.style.boxShadow = "var(--shadow-md)";
                e.currentTarget.style.transform = "translateY(-2px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "var(--color-border)";
                e.currentTarget.style.boxShadow = "var(--shadow-sm)";
                e.currentTarget.style.transform = "none";
              }}
            >
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                  {m.icon && <span style={{ fontSize: 24 }}>{m.icon}</span>}
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#111827" }}>{m.label}</h3>
                </div>
                <p className="subtitle" style={{ marginBottom: 0, fontSize: 13, lineHeight: 1.5 }}>
                  {m.deskripsi}
                </p>
              </div>
              <div style={{
                marginTop: 18,
                fontSize: 13,
                fontWeight: 600,
                color: "var(--color-primary)",
                display: "flex",
                alignItems: "center",
                gap: 4
              }}>
                Open Module <span>&rarr;</span>
              </div>
            </a>
          ))}
        </div>
      </main>
    </div>
  );
}
