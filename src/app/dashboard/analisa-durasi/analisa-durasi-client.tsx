"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

export type BarisDurasi = {
  id: number;
  periode: string;
  nomorPo: string;
  namaProyek: string;
  klien: string | null;
  namaUserXl: string;
  nomorInvoice: string | null;
  statusPengajuan: string;
  tanggalSubmitCac: string | null;
  tanggalCacApproved: string | null;
  tanggalRequestGr: string | null;
  tanggalGrDisetujui: string | null;
  tanggalSubmitInvoice: string | null;
  tanggalApproveInvoice: string | null;
  hariCacKeGr: number | null;
  hariGrKeInvoiceSubmit: number | null;
  hariInvoiceKeCustomerApprove: number | null;
  hariTotal: number | null;
  hariBerjalan: number;
  tahapStatus: "completed" | "waiting_customer" | "ready_invoice" | "cac_in_review" | "draft";
  tahapLabel: string;
};

export default function AnalisaDurasiClient({ daftar }: { daftar: BarisDurasi[] }) {
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [pencarian, setPencarian] = useState("");

  const filteredDaftar = useMemo(() => {
    return daftar.filter((d) => {
      if (filterStatus === "completed" && d.tahapStatus !== "completed") return false;
      if (filterStatus === "waiting_customer" && d.tahapStatus !== "waiting_customer") return false;
      if (filterStatus === "ready_invoice" && d.tahapStatus !== "ready_invoice") return false;
      if (filterStatus === "in_progress" && (d.tahapStatus === "completed" || d.tahapStatus === "draft")) return false;

      if (!pencarian.trim()) return true;
      const q = pencarian.toLowerCase();
      return (
        d.nomorPo.toLowerCase().includes(q) ||
        d.namaProyek.toLowerCase().includes(q) ||
        d.namaUserXl.toLowerCase().includes(q) ||
        (d.nomorInvoice && d.nomorInvoice.toLowerCase().includes(q)) ||
        d.periode.includes(q)
      );
    });
  }, [daftar, filterStatus, pencarian]);

  // Statistik Ringkasan
  const totalTracked = daftar.length;
  const totalCompleted = daftar.filter((d) => d.tanggalApproveInvoice).length;
  const totalWaitingCustomer = daftar.filter((d) => d.tanggalSubmitInvoice && !d.tanggalApproveInvoice).length;
  const totalSubmitInvoice = daftar.filter((d) => d.tanggalSubmitInvoice).length;

  const validCustomerApproveDays = daftar
    .filter((d) => d.hariInvoiceKeCustomerApprove !== null)
    .map((d) => d.hariInvoiceKeCustomerApprove!);
  const avgCustomerApproveDays = validCustomerApproveDays.length > 0
    ? Math.round((validCustomerApproveDays.reduce((a, b) => a + b, 0) / validCustomerApproveDays.length) * 10) / 10
    : null;

  const validInvoiceSubmitDays = daftar
    .filter((d) => d.hariGrKeInvoiceSubmit !== null)
    .map((d) => d.hariGrKeInvoiceSubmit!);
  const avgInvoiceSubmitDays = validInvoiceSubmitDays.length > 0
    ? Math.round((validInvoiceSubmitDays.reduce((a, b) => a + b, 0) / validInvoiceSubmitDays.length) * 10) / 10
    : null;

  const validTotalDays = daftar
    .filter((d) => d.hariTotal !== null)
    .map((d) => d.hariTotal!);
  const avgTotalDays = validTotalDays.length > 0
    ? Math.round((validTotalDays.reduce((a, b) => a + b, 0) / validTotalDays.length) * 10) / 10
    : null;

  // Analisa per Client Approver (User XL)
  const perUserMap = new Map<string, { totalHariCustomer: number; countCustomer: number; totalHariEndToEnd: number; countTotal: number; totalSubmissions: number }>();
  for (const d of daftar) {
    const acc = perUserMap.get(d.namaUserXl) ?? { totalHariCustomer: 0, countCustomer: 0, totalHariEndToEnd: 0, countTotal: 0, totalSubmissions: 0 };
    acc.totalSubmissions += 1;
    if (d.hariInvoiceKeCustomerApprove !== null) {
      acc.totalHariCustomer += d.hariInvoiceKeCustomerApprove;
      acc.countCustomer += 1;
    }
    if (d.hariTotal !== null) {
      acc.totalHariEndToEnd += d.hariTotal;
      acc.countTotal += 1;
    }
    perUserMap.set(d.namaUserXl, acc);
  }

  const userStats = Array.from(perUserMap.entries()).map(([nama, v]) => ({
    nama,
    totalSubmissions: v.totalSubmissions,
    avgCustomerDays: v.countCustomer > 0 ? Math.round((v.totalHariCustomer / v.countCustomer) * 10) / 10 : null,
    avgTotalDays: v.countTotal > 0 ? Math.round((v.totalHariEndToEnd / v.countTotal) * 10) / 10 : null,
  })).sort((a, b) => (b.avgTotalDays ?? 0) - (a.avgTotalDays ?? 0));

  const maxChartDays = Math.max(1, ...userStats.map((u) => u.avgTotalDays ?? u.avgCustomerDays ?? 1));

  return (
    <div>
      {/* 5 KPI Metric Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14, marginTop: 16 }}>
        <div className="card" style={{ padding: 16, borderLeft: "4px solid #3b82f6" }}>
          <div style={{ fontSize: 12, color: "var(--muted)", textTransform: "uppercase", fontWeight: 600 }}>Total Tracked</div>
          <div style={{ fontSize: 26, fontWeight: 700, margin: "6px 0 2px 0" }}>{totalTracked}</div>
          <div style={{ fontSize: 12, color: "var(--muted)" }}>Submissions in pipeline</div>
        </div>

        <div className="card" style={{ padding: 16, borderLeft: "4px solid #10b981" }}>
          <div style={{ fontSize: 12, color: "var(--muted)", textTransform: "uppercase", fontWeight: 600 }}>Invoices Submitted</div>
          <div style={{ fontSize: 26, fontWeight: 700, margin: "6px 0 2px 0", color: "#047857" }}>{totalSubmitInvoice}</div>
          <div style={{ fontSize: 12, color: "var(--muted)" }}>
            Avg. prep: <b>{avgInvoiceSubmitDays !== null ? `${avgInvoiceSubmitDays} d` : "-"}</b>
          </div>
        </div>

        <div className="card" style={{ padding: 16, borderLeft: "4px solid #f59e0b" }}>
          <div style={{ fontSize: 12, color: "var(--muted)", textTransform: "uppercase", fontWeight: 600 }}>Waiting Customer Approval</div>
          <div style={{ fontSize: 26, fontWeight: 700, margin: "6px 0 2px 0", color: "#b45309" }}>{totalWaitingCustomer}</div>
          <div style={{ fontSize: 12, color: "var(--muted)" }}>Currently with customer</div>
        </div>

        <div className="card" style={{ padding: 16, borderLeft: "4px solid #059669" }}>
          <div style={{ fontSize: 12, color: "var(--muted)", textTransform: "uppercase", fontWeight: 600 }}>Customer Approved</div>
          <div style={{ fontSize: 26, fontWeight: 700, margin: "6px 0 2px 0", color: "#065f46" }}>{totalCompleted}</div>
          <div style={{ fontSize: 12, color: "var(--muted)" }}>
            Avg. customer review: <b>{avgCustomerApproveDays !== null ? `${avgCustomerApproveDays} d` : "-"}</b>
          </div>
        </div>

        <div className="card" style={{ padding: 16, borderLeft: "4px solid #6366f1" }}>
          <div style={{ fontSize: 12, color: "var(--muted)", textTransform: "uppercase", fontWeight: 600 }}>Avg. Total Lead Time</div>
          <div style={{ fontSize: 26, fontWeight: 700, margin: "6px 0 2px 0", color: "#4338ca" }}>
            {avgTotalDays !== null ? `${avgTotalDays} days` : "-"}
          </div>
          <div style={{ fontSize: 12, color: "var(--muted)" }}>CAC Submit ➔ Customer Approve</div>
        </div>
      </div>

      {/* Visual Chart: Turnaround & Customer Approval by Client Approver */}
      {userStats.length > 0 && (
        <div className="card" style={{ marginTop: 20, padding: 18 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <div>
              <h3 style={{ margin: "0 0 4px 0", fontSize: 15, fontWeight: 700 }}>
                📊 Turnaround Duration by Client Approver (User XL)
              </h3>
              <p style={{ margin: 0, fontSize: 12, color: "var(--muted)" }}>
                Comparing average days to customer approval and total lead time per client approver.
              </p>
            </div>
            <div style={{ display: "flex", gap: 14, fontSize: 12 }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                <span style={{ width: 12, height: 12, background: "#6366f1", borderRadius: 2 }} />
                <span>Total Lead Time (CAC ➔ Approval)</span>
              </span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                <span style={{ width: 12, height: 12, background: "#10b981", borderRadius: 2 }} />
                <span>Customer Review Time (Submit ➔ Approval)</span>
              </span>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {userStats.map((u) => (
              <div key={u.nama} style={{ borderBottom: "1px solid var(--color-border, #e2e8f0)", paddingBottom: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 5 }}>
                  <span style={{ fontWeight: 600 }}>{u.nama}</span>
                  <span style={{ color: "var(--muted)", fontSize: 12 }}>
                    {u.avgTotalDays !== null ? `Total Avg: ${u.avgTotalDays} d` : "No completed cycle"} &middot;{" "}
                    {u.avgCustomerDays !== null ? `Customer Avg: ${u.avgCustomerDays} d` : "Awaiting approval"} &middot;{" "}
                    <b>{u.totalSubmissions}</b> submission(s)
                  </span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {/* Total lead time bar */}
                  <div style={{ background: "var(--color-bg, #f1f5f9)", borderRadius: 4, height: 8, overflow: "hidden" }}>
                    <div
                      title={`Total Lead Time: ${u.avgTotalDays ?? 0} days`}
                      style={{
                        width: `${u.avgTotalDays ? Math.max(4, (u.avgTotalDays / maxChartDays) * 100) : 0}%`,
                        height: "100%",
                        background: "#6366f1",
                        borderRadius: 4,
                      }}
                    />
                  </div>
                  {/* Customer review bar */}
                  {u.avgCustomerDays !== null && (
                    <div style={{ background: "var(--color-bg, #f1f5f9)", borderRadius: 4, height: 6, overflow: "hidden" }}>
                      <div
                        title={`Customer Review: ${u.avgCustomerDays} days`}
                        style={{
                          width: `${Math.max(4, (u.avgCustomerDays / maxChartDays) * 100)}%`,
                          height: "100%",
                          background: "#10b981",
                          borderRadius: 4,
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filter Toolbar & Search */}
      <div className="toolbar" style={{ marginTop: 22, flexWrap: "wrap", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <button
            type="button"
            className={`btn btn-sm ${filterStatus === "all" ? "btn-primary" : "btn-secondary"}`}
            onClick={() => setFilterStatus("all")}
          >
            All ({daftar.length})
          </button>
          <button
            type="button"
            className={`btn btn-sm ${filterStatus === "waiting_customer" ? "btn-primary" : "btn-secondary"}`}
            onClick={() => setFilterStatus("waiting_customer")}
          >
            ⏳ Waiting Customer ({totalWaitingCustomer})
          </button>
          <button
            type="button"
            className={`btn btn-sm ${filterStatus === "completed" ? "btn-primary" : "btn-secondary"}`}
            onClick={() => setFilterStatus("completed")}
          >
            ✓ Customer Approved ({totalCompleted})
          </button>
          <button
            type="button"
            className={`btn btn-sm ${filterStatus === "in_progress" ? "btn-primary" : "btn-secondary"}`}
            onClick={() => setFilterStatus("in_progress")}
          >
            Active In-Progress
          </button>
        </div>

        <div style={{ minWidth: 260 }}>
          <input
            type="search"
            value={pencarian}
            onChange={(e) => setPencarian(e.target.value)}
            placeholder="Search PO, Project, User XL, Invoice..."
            style={{ width: "100%" }}
          />
        </div>
      </div>

      {/* Detailed Tracking Table */}
      <div className="table-wrap" style={{ marginTop: 12 }}>
        <table>
          <thead>
            <tr>
              <th>Period</th>
              <th>PO &amp; Proyek</th>
              <th>Invoice No.</th>
              <th>Client Approver</th>
              <th>1. CAC Submitted</th>
              <th>2. GR / CAC Approved</th>
              <th>3. Invoice Submitted</th>
              <th>4. Customer Approved</th>
              <th>Customer Review Time</th>
              <th>Total / Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredDaftar.map((r) => (
              <tr key={r.id}>
                <td>
                  <Link href={`/pengajuan/${r.id}`} style={{ fontWeight: 600, color: "var(--color-primary)" }}>
                    {r.periode}
                  </Link>
                </td>
                <td>
                  <div style={{ fontWeight: 600, fontFamily: "monospace" }}>{r.nomorPo}</div>
                  <div style={{ fontSize: 11, color: "var(--muted)", maxWidth: 180, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={r.namaProyek}>
                    {r.namaProyek}
                  </div>
                </td>
                <td>
                  {r.nomorInvoice ? (
                    <span className="badge badge-info" style={{ fontFamily: "monospace" }}>{r.nomorInvoice}</span>
                  ) : (
                    <span style={{ color: "var(--muted)", fontSize: 12 }}>Not set</span>
                  )}
                </td>
                <td>{r.namaUserXl}</td>
                <td>
                  {r.tanggalSubmitCac ? (
                    <span style={{ fontSize: 12, fontFamily: "monospace" }}>{r.tanggalSubmitCac}</span>
                  ) : (
                    <span style={{ color: "var(--muted)" }}>-</span>
                  )}
                </td>
                <td>
                  {r.tanggalGrDisetujui || r.tanggalCacApproved ? (
                    <div>
                      <span style={{ fontSize: 12, fontFamily: "monospace" }}>
                        {r.tanggalGrDisetujui || r.tanggalCacApproved}
                      </span>
                      {r.hariCacKeGr !== null && (
                        <div style={{ fontSize: 10, color: "var(--muted)" }}>+{r.hariCacKeGr} d from CAC</div>
                      )}
                    </div>
                  ) : (
                    <span style={{ color: "var(--muted)" }}>-</span>
                  )}
                </td>
                <td>
                  {r.tanggalSubmitInvoice ? (
                    <div>
                      <span className="badge badge-info" style={{ fontFamily: "monospace" }}>
                        {r.tanggalSubmitInvoice}
                      </span>
                      {r.hariGrKeInvoiceSubmit !== null && (
                        <div style={{ fontSize: 10, color: "var(--muted)" }}>+{r.hariGrKeInvoiceSubmit} d prep</div>
                      )}
                    </div>
                  ) : (
                    <span className="badge badge-warning" style={{ fontSize: 11 }}>
                      Pending Submit
                    </span>
                  )}
                </td>
                <td>
                  {r.tanggalApproveInvoice ? (
                    <span className="badge badge-success" style={{ fontFamily: "monospace" }}>
                      {r.tanggalApproveInvoice}
                    </span>
                  ) : r.tanggalSubmitInvoice ? (
                    <span className="badge badge-warning" style={{ fontSize: 11 }}>
                      ⏳ In Customer Review
                    </span>
                  ) : (
                    <span style={{ color: "var(--muted)" }}>-</span>
                  )}
                </td>
                <td>
                  {r.hariInvoiceKeCustomerApprove !== null ? (
                    <span style={{ fontWeight: 600, color: "#047857" }}>
                      {r.hariInvoiceKeCustomerApprove} days
                    </span>
                  ) : r.tanggalSubmitInvoice ? (
                    <span style={{ fontSize: 11, color: "#b45309" }}>
                      {r.hariBerjalan} days waiting
                    </span>
                  ) : (
                    <span style={{ color: "var(--muted)" }}>-</span>
                  )}
                </td>
                <td>
                  {r.tahapStatus === "completed" ? (
                    <div>
                      <span className="badge badge-success">Approved ✓</span>
                      <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>
                        Total: <b>{r.hariTotal} days</b>
                      </div>
                    </div>
                  ) : r.tahapStatus === "waiting_customer" ? (
                    <div>
                      <span className="badge badge-warning">Waiting Approval</span>
                      <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>
                        Elapsed: {r.hariBerjalan} d
                      </div>
                    </div>
                  ) : r.tahapStatus === "ready_invoice" ? (
                    <span className="badge badge-info">Ready to Submit Invoice</span>
                  ) : (
                    <span className="badge">{r.tahapLabel}</span>
                  )}
                </td>
              </tr>
            ))}
            {filteredDaftar.length === 0 && (
              <tr>
                <td colSpan={10} className="table-empty" style={{ padding: 24 }}>
                  No submission duration records match the selected filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
