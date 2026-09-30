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
      <Topbar nama={userLogin.nama} role={userLogin.role} />
      <main className="page">
        <a href="/dashboard" className="back-link">&larr; Dashboard</a>
        <h1>Analisa Durasi Proses CAC &rarr; Invoice</h1>
        <p className="subtitle">
          Rata-rata jumlah hari dari <b>tanggal submit CAC</b> (Checker meloloskan) sampai
          <b> tanggal invoice disetujui</b> di COUPA, per User XL — pengajuan yang kedua tanggalnya
          belum lengkap tidak dihitung.
        </p>

        {dataChart.length === 0 ? (
          <div className="card" style={{ marginTop: 16 }}>
            <p className="subtitle" style={{ margin: 0 }}>
              Belum ada data — isi Tanggal Submit CAC (otomatis dari Checker) dan Tanggal Approve
              Invoice (manual) di kartu &quot;Status Proses CAC &rarr; Invoice&quot; pada detail pengajuan.
            </p>
          </div>
        ) : (
          <div className="card" style={{ marginTop: 16 }}>
            <h3 style={{ marginTop: 0, marginBottom: 16 }}>Rata-rata hari per User XL</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {dataChart.map((d) => (
                <div key={d.nama}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13.5, marginBottom: 4 }}>
                    <span style={{ color: "var(--color-text)" }}>{d.nama}</span>
                    <span style={{ color: "var(--color-text-muted)" }}>
                      <b style={{ color: "var(--color-text)" }}>{d.rataRata}</b> hari &middot; {d.jumlah} pengajuan
                    </span>
                  </div>
                  <div style={{ background: "var(--color-bg)", borderRadius: 4, height: 10, overflow: "hidden" }}>
                    <div
                      title={`${d.nama}: rata-rata ${d.rataRata} hari dari ${d.jumlah} pengajuan`}
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
              <thead><tr><th>Periode</th><th>PO</th><th>User XL</th><th>Submit CAC</th><th>Invoice Disetujui</th><th>Hari</th></tr></thead>
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
