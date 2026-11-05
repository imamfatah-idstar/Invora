import { wajibRole } from "@/lib/require-role";
import { db } from "@/db";
import { pengajuan, po, userXl, dokumen } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import Topbar from "@/components/topbar";

const LABEL_STATUS: Record<string, string> = {
  draft: "Draft",
  menunggu_checker: "Pending Review",
  perlu_revisi: "Needs Revision",
  siap_diajukan: "Ready to Submit",
  diajukan: "Submitted",
};

export default async function DaftarPengajuan() {
  const userLogin = await wajibRole(["petugas", "checker"]);

  const daftar = await db
    .select({
      id: pengajuan.id, periode: pengajuan.periode, status: pengajuan.status,
      nomorPo: po.nomorPo, namaUserXl: userXl.nama,
    })
    .from(pengajuan)
    .innerJoin(po, eq(pengajuan.poId, po.id))
    .innerJoin(userXl, eq(pengajuan.userXlId, userXl.id))
    .orderBy(desc(pengajuan.id));

  const daftarBast = await db
    .select({ pengajuanId: dokumen.pengajuanId })
    .from(dokumen)
    .where(eq(dokumen.jenis, "BAST"));
  const bastPengajuanSet = new Set(daftarBast.map((d) => d.pengajuanId));

  const jumlahMenungguChecker = daftar.filter((a) => a.status === "menunggu_checker").length;
  const pengajuanTanpaBast = daftar.filter(
    (a) => (a.status === "siap_diajukan" || a.status === "diajukan") && !bastPengajuanSet.has(a.id)
  ).length;

  return (
    <>
      <Topbar nama={userLogin.nama} role={userLogin.role} />
      <main className="page">
        <a href="/dashboard" className="back-link">&larr; Dashboard</a>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <h1>Invoicing Submissions</h1>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <a href="/dashboard/outstanding" className="btn">💰 Outstanding &amp; Aging</a>
            <a href="/api/rekon-invoice" className="btn">⬇ Download Invoice Recon (.xlsx)</a>
            {userLogin.role === "petugas" && (
              <a href="/pengajuan/baru" className="btn btn-primary">+ New Submission</a>
            )}
          </div>
        </div>

        {userLogin.role === "checker" && jumlahMenungguChecker > 0 && (
          <div className="alert alert-warning">
            🔔 There are <b>{jumlahMenungguChecker}</b> submission(s) pending your review.
          </div>
        )}

        {pengajuanTanpaBast > 0 && (
          <div className="alert alert-warning">
            ⚠️ There are <b>{pengajuanTanpaBast}</b> submission(s) ready/submitted without a generated BAST document.
          </div>
        )}

        <div className="table-wrap">
          <table>
            <thead><tr>
              <th>Period</th><th>PO No.</th>
              <th>Client Approver</th><th>Status</th><th></th>
            </tr></thead>
            <tbody>
              {daftar.map((a) => {
                const perluPerhatianChecker = userLogin.role === "checker" && a.status === "menunggu_checker";
                const bastKurang = (a.status === "siap_diajukan" || a.status === "diajukan") && !bastPengajuanSet.has(a.id);
                return (
                  <tr key={a.id} style={perluPerhatianChecker ? { background: "var(--color-warning-bg)" } : undefined}>
                    <td>{a.periode}</td>
                    <td>{a.nomorPo}</td>
                    <td>{a.namaUserXl}</td>
                    <td>
                      <span className={`badge badge-${a.status}`}>{LABEL_STATUS[a.status] ?? a.status}</span>
                      {perluPerhatianChecker ? " ⏳" : ""}
                      {bastKurang && (
                        <span className="badge badge-danger" style={{ marginLeft: 6, fontSize: 11 }} title="BAST document not yet created">
                          ⚠️ BAST
                        </span>
                      )}
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <a href={`/pengajuan/${a.id}`} className="btn-text">View</a>
                        <span style={{ color: "var(--color-border)" }}>&middot;</span>
                        <a
                          href={`/api/pengajuan/${a.id}/invoice/pdf`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn-text"
                          title="Print / Download PDF Invoice"
                          style={{ color: "#ea242a", fontWeight: 600 }}
                        >
                          📄 PDF
                        </a>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {daftar.length === 0 && <tr><td colSpan={5} className="table-empty">No submissions found.</td></tr>}
            </tbody>
          </table>
        </div>
      </main>
    </>
  );
}
