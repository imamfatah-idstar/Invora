import { wajibRole } from "@/lib/require-role";
import { db } from "@/db";
import { pengajuan, pengajuanDetail, po, userXl, checkerReview } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import Topbar from "@/components/topbar";
import FormEditPengajuan from "./edit-form";

export default async function HalamanEditPengajuan({ params }: { params: Promise<{ id: string }> }) {
  const userLogin = await wajibRole(["petugas"]);
  const { id } = await params;
  const pengajuanId = Number(id);

  const [header] = await db
    .select({
      id: pengajuan.id, periode: pengajuan.periode, status: pengajuan.status,
      poId: pengajuan.poId, nomorPo: po.nomorPo, namaProyek: po.namaProyek, namaUserXl: userXl.nama,
    })
    .from(pengajuan)
    .innerJoin(po, eq(pengajuan.poId, po.id))
    .innerJoin(userXl, eq(pengajuan.userXlId, userXl.id))
    .where(eq(pengajuan.id, pengajuanId));
  if (!header) notFound();

  // Hanya bisa diedit saat status "perlu_revisi" — di status lain arahkan balik ke halaman detail.
  if (header.status !== "perlu_revisi") {
    redirect(`/pengajuan/${pengajuanId}`);
  }

  const rincianSaatIni = await db
    .select({ personelId: pengajuanDetail.personelId })
    .from(pengajuanDetail)
    .where(eq(pengajuanDetail.pengajuanId, pengajuanId));

  const [alasanRevisi] = await db
    .select({ catatan: checkerReview.catatan, waktu: checkerReview.waktu })
    .from(checkerReview)
    .where(and(eq(checkerReview.pengajuanId, pengajuanId), eq(checkerReview.hasil, "perlu_revisi")))
    .orderBy(desc(checkerReview.waktu))
    .limit(1);

  return (
    <>
      <Topbar nama={userLogin.nama} role={userLogin.role} />
      <main className="page">
        <a href={`/pengajuan/${pengajuanId}`} className="back-link">&larr; Detail Pengajuan</a>
        <h1>Edit Pengajuan — {header.periode}</h1>
        <p className="subtitle">
          PO: <b>{header.nomorPo}</b> ({header.namaProyek}) &middot; User XL: <b>{header.namaUserXl}</b>
          &nbsp;— periode, PO dan User XL tidak bisa diubah, hanya pilihan personel.
        </p>

        {alasanRevisi?.catatan && (
          <div className="alert alert-warning">
            <b>Catatan revisi dari Checker:</b> {alasanRevisi.catatan}
          </div>
        )}

        <FormEditPengajuan
          pengajuanId={pengajuanId}
          poId={header.poId}
          periode={header.periode}
          personelIdsAwal={rincianSaatIni.map((r) => r.personelId)}
        />
      </main>
    </>
  );
}
