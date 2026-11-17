import { wajibRole } from "@/lib/require-role";
import Topbar from "@/components/topbar";
import { getDashboardArAnalytics } from "@/lib/ar-analytics";
import PlanVsActualView from "./plan-vs-actual-view";

export const metadata = {
  title: "Inv Plan vs Actual | INVORA",
  description: "Perbandingan rencana tagihan (Invoice Plan) vs realisasi invoice & pelunasan aktual",
};

export default async function HalamanPlanVsActual() {
  const user = await wajibRole(["petugas", "checker", "admin"]);
  const analytics = await getDashboardArAnalytics(30);

  return (
    <>
      <Topbar nama={user.nama} role={user.role} email={user.email} roles={user.roles} />
      <main className="page" style={{ maxWidth: 1300, margin: "0 auto", padding: "24px 20px" }}>
        <a href="/dashboard" className="back-link">
          &larr; Dashboard
        </a>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
          <div>
            <h1 style={{ margin: "4px 0 6px", fontSize: 24, fontWeight: 800 }}>
              Invoice Plan vs Actual
            </h1>
            <p className="subtitle" style={{ margin: 0, fontSize: 14 }}>
              Compare planned submission amounts against actual GR / issued invoices and verified client collections.
            </p>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <a href="/dashboard/outstanding" className="btn">
              💰 Outstanding &amp; Aging AR
            </a>
            <a href="/pengajuan" className="btn">
              📋 Submissions
            </a>
            <a href="/summary-po" className="btn">
              📊 PO Summary
            </a>
          </div>
        </div>

        <PlanVsActualView rows={analytics.planVsActual.rows} />
      </main>
    </>
  );
}
