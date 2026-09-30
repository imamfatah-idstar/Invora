import { db } from "@/db";
import { po, poLineItem } from "@/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import FormEditPo from "./edit-form";
import FormDokumenAsli from "./dokumen-asli-form";
import FormPoLineItem from "./line-item-form";

export default async function EditPo({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [row] = await db.select().from(po).where(eq(po.id, Number(id)));
  if (!row) notFound();
  const daftarLine = await db.select().from(poLineItem).where(eq(poLineItem.poId, Number(id))).orderBy(poLineItem.nomorLine);
  return (
    <div>
      <a href="/data-referensi/po" className="back-link">&larr; PO</a>
      <h1>Edit PO</h1>
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "flex-start" }}>
        <FormEditPo id={row.id} nomorPo={row.nomorPo} namaProyekAwal={row.namaProyek} saldoAwal={row.saldoSebelumPpn} tahunAwal={row.tahun} nilaiGrAwal={row.nilaiGr} tanggalPoAwal={row.tanggalPo} />
        <FormDokumenAsli poId={row.id} namaFileAwal={row.namaFilePoAsli} />
      </div>
      <div style={{ marginTop: 16 }}>
        <FormPoLineItem poId={row.id} daftarAwal={daftarLine} />
      </div>
    </div>
  );
}
