import { db } from "@/db";
import { pemetaanPersonelPo, personel, po, poLineItem, userXl } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import FormTambahPemetaan from "./pemetaan-form";
import TabelPemetaan from "./pemetaan-table";

export default async function HalamanPemetaan() {
  const daftarPersonel = await db.select().from(personel).orderBy(personel.nama);
  const daftarPo = await db.select().from(po).orderBy(po.nomorPo);
  const daftarLine = await db.select().from(poLineItem).orderBy(poLineItem.nomorLine);
  const daftarUserXl = await db.select().from(userXl).orderBy(userXl.nama);

  const daftar = await db
    .select({
      id: pemetaanPersonelPo.id,
      berlakuDari: pemetaanPersonelPo.berlakuDari,
      berlakuSampai: pemetaanPersonelPo.berlakuSampai,
      namaPersonel: personel.nama,
      nomorPo: po.nomorPo,
      poLineText: poLineItem.shortText,
      poLineNomor: poLineItem.nomorLine,
      userXlNama: userXl.nama,
    })
    .from(pemetaanPersonelPo)
    .innerJoin(personel, eq(pemetaanPersonelPo.personelId, personel.id))
    .innerJoin(po, eq(pemetaanPersonelPo.poId, po.id))
    .leftJoin(poLineItem, eq(pemetaanPersonelPo.poLineItemId, poLineItem.id))
    .leftJoin(userXl, eq(pemetaanPersonelPo.userXlId, userXl.id))
    .orderBy(desc(pemetaanPersonelPo.id));

  return (
    <div>
      <h1>Personnel &harr; PO Mapping</h1>
      <p className="subtitle">Bundled POs do not list resource names — mapping allocations and client approvers are maintained here.</p>
      <FormTambahPemetaan
        daftarPersonel={daftarPersonel.map((p) => ({ id: p.id, label: p.nama }))}
        daftarPo={daftarPo.map((p) => ({ id: p.id, label: p.nomorPo }))}
        daftarLine={daftarLine.map((l) => ({ id: l.id, poId: l.poId, label: `Line ${l.nomorLine} — ${l.shortText}` }))}
        daftarUserXl={daftarUserXl.map((u) => ({ id: u.id, label: u.nama }))}
      />
      <TabelPemetaan daftar={daftar} />
    </div>
  );
}
