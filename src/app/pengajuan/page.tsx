import { wajibRole } from "@/lib/require-role";
import { db } from "@/db";
import { pengajuan, po, userXl } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import Topbar from "@/components/topbar";

const LABEL_STATUS: Record<string, string> = {
  draft: "Draft",
  menunggu_checker: "Menunggu Checker",
  perlu_revisi: "Perlu Revisi",
  siap_diajukan: "Siap Diajukan",
  diajukan: "Diajukan",
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

  const jumlahMenungguChecker = daftar.filter((a) => a.status === "menunggu_checker").length;

  return (
    <>
      <Topbar nama={userLogin.nama} role={userLogin.role} />
      <main className="page">
        <a href="/dashboard" className="back-link">&larr; Dashboard</a>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <h1>Daftar Pengajuan</h1>
          {userLogin.role === "petugas" && (
            <a href="/pengajuan/baru" className="btn btn-primary">+ Buat Pengajuan</a>
          )}
        </div>

        {userLogin.role === "checker" && jumlahMenungguChecker > 0 && (
          <div className="alert alert-warning">
            🔔 Ada <b>{jumlahMenungguChecker}</b> pengajuan menunggu Anda periksa.
          </div>
        )}

        <div className="table-wrap">
          <table>
            <thead><tr>
              <th>Periode</th><th>PO</th>
              <th>User XL</th><th>Status</th><th></th>
            </tr></thead>
            <tbody>
              {daftar.map((a) => {
                const perluPerhatianChecker = userLogin.role === "checker" && a.status === "menunggu_checker";
                return (
                  <tr key={a.id} style={perluPerhatianChecker ? { background: "var(--color-warning-bg)" } : undefined}>
                    <td>{a.periode}</td>
                    <td>{a.nomorPo}</td>
                    <td>{a.namaUserXl}</td>
                    <td><span className={`badge badge-${a.status}`}>{LABEL_STATUS[a.status] ?? a.status}</span>{perluPerhatianChecker ? " ⏳" : ""}</td>
                    <td><a href={`/pengajuan/${a.id}`} className="btn-text">Lihat</a></td>
                  </tr>
                );
              })}
              {daftar.length === 0 && <tr><td colSpan={5} className="table-empty">Belum ada pengajuan.</td></tr>}
            </tbody>
          </table>
        </div>
      </main>
    </>
  );
}
