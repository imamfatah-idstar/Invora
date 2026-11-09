import { db } from "@/db";
import { pengajuan, userXl, po } from "@/db/schema";
import { eq, isNotNull, and } from "drizzle-orm";
import { wajibRole } from "@/lib/require-role";
import Topbar from "@/components/topbar";

function hariAntara(dariISO: string, sampaiISO: string) {
  const dari = new Date(dariISO + "T00:00:00Z").getTime();
  const sampai = new Date(sampaiISO + "T00:00:00Z").getTime();
  return Math.round((sampai - dari) / 86400000);
}

export default async function AnalisaDurasi() {
  const userLogin = await wajibRole(["petugas", "checker"]);

  const baris = await db
    .select({
      id: pengajuan.id, periode: pengajuan.periode,
      nomorPo: po.nomorPo, namaUserXl: userXl.nama,
      tanggalSubmitCac: pengajuan.tanggalSubmitCac,
      tanggalApproveInvoice: pengajuan.tanggalApproveInvoice,
    })
    .from(pengajuan)
    .innerJoin(po, eq(pengajuan.poId, po.id))
    .innerJoin(userXl, eq(pengajuan.userXlId, userXl.id))
    .where(and(isNotNull(pengajuan.tanggalSubmitCac), isNotNull(pengajuan.tanggalApproveInvoice)));

  const rincian = baris.map((b) => ({
    ...b,
    hari: hariAntara(b.tanggalSubmitCac!, b.tanggalApproveInvoice!),
  }));

  // Rata-rata hari proses (submit CAC -> invoice disetujui) per User XL —
  // dipakai untuk menganalisa User XL mana yang prosesnya paling lama/cepat.
  // Lihat PROJECT_INSTRUCTIONS.md bagian 26.
  const perUser = new Map<string, { total: number; jumlah: number }>();
  for (const r of rincian) {
    const acc = perUser.get(r.namaUserXl) ?? { total: 0, jumlah: 0 };
    acc.total += r.hari; acc.jumlah += 1;
    perUser.set(r.namaUserXl, acc);
  }
  const dataChart = Array.from(perUser.entries())
    .map(([nama, v]) => ({ nama, rataRata: Math.round((v.total / v.jumlah) * 10) / 10, jumlah: v.jumlah }))
    .sort((a, b) => b.rataRata - a.rataRata);

  const maxHari = Math.max(1, ...dataChart.map((d) => d.rataRata));

  return (
    <>
      <Topbar nama={userLogin.nama} role={userLogin.role} email={userLogin.email} roles={userLogin.roles} />
      <main className="page">
        <a href="/dashboard" className="back-link">&larr; Dashboard</a>
        <h1>Process Duration Analytics: CAC &rarr; Invoice</h1>
        <p className="subtitle">
          Average turnaround time in days from <b>CAC submission date</b> (Checker approval) until
          <b> invoice approval date</b> in COUPA, grouped by Client Approver — submissions missing either date are excluded.
        </p>

        {dataChart.length === 0 ? (
          <div className="card" style={{ marginTop: 16 }}>
            <p className="subtitle" style={{ margin: 0 }}>
              No data available yet — please ensure CAC Submission Date and Invoice Approval Date are recorded in submission details.
            </p>
          </div>
        ) : (
          <div className="card" style={{ marginTop: 16 }}>
            <h3 style={{ marginTop: 0, marginBottom: 16 }}>Average Days by Client Approver</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {dataChart.map((d) => (
                <div key={d.nama}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13.5, marginBottom: 4 }}>
                    <span style={{ color: "var(--color-text)" }}>{d.nama}</span>
                    <span style={{ color: "var(--color-text-muted)" }}>
                      <b style={{ color: "var(--color-text)" }}>{d.rataRata}</b> days &middot; {d.jumlah} submission(s)
                    </span>
                  </div>
                  <div style={{ background: "var(--color-bg)", borderRadius: 4, height: 10, overflow: "hidden" }}>
                    <div
                      title={`${d.nama}: average ${d.rataRata} days across ${d.jumlah} submission(s)`}
                      style={{
                        width: `${Math.max(3, (d.rataRata / maxHari) * 100)}%`,
                        height: "100%",
                        background: "var(--color-primary)",
                        borderRadius: 4,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {rincian.length > 0 && (
          <div className="table-wrap" style={{ marginTop: 20 }}>
            <table>
              <thead><tr><th>Period</th><th>PO No.</th><th>Client Approver</th><th>CAC Submitted</th><th>Invoice Approved</th><th>Days</th></tr></thead>
              <tbody>
                {rincian.sort((a, b) => b.hari - a.hari).map((r) => (
                  <tr key={r.id}>
                    <td>{r.periode}</td>
                    <td>{r.nomorPo}</td>
                    <td>{r.namaUserXl}</td>
                    <td>{r.tanggalSubmitCac}</td>
                    <td>{r.tanggalApproveInvoice}</td>
                    <td>{r.hari}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </>
  );
}
