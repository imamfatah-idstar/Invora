import { wajibRole } from "@/lib/require-role";
import { db } from "@/db";
import { pengajuan, po, userXl, dokumen } from "@/db/schema";
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
          <h1>Daftar Pengajuan</h1>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <a href="/dashboard/outstanding" className="btn">💰 Outstanding &amp; Aging</a>
            <a href="/api/rekon-invoice" className="btn">⬇ Download Rekon Invoice (.xlsx)</a>
            {userLogin.role === "petugas" && (
              <a href="/pengajuan/baru" className="btn btn-primary">+ Buat Pengajuan</a>
            )}
          </div>
        </div>

        {userLogin.role === "checker" && jumlahMenungguChecker > 0 && (
          <div className="alert alert-warning">
            🔔 Ada <b>{jumlahMenungguChecker}</b> pengajuan menunggu Anda periksa.
          </div>
        )}

        {pengajuanTanpaBast > 0 && (
          <div className="alert alert-warning">
            ⚠️ Ada <b>{pengajuanTanpaBast}</b> pengajuan siap/sedang diajukan yang <b>dokumen BAST-nya belum dibuat</b> (lihat penanda BAST di bawah).
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
                        <span className="badge badge-danger" style={{ marginLeft: 6, fontSize: 11 }} title="Dokumen BAST belum dibuat">
                          ⚠️ BAST
                        </span>
                      )}
                    </td>
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
