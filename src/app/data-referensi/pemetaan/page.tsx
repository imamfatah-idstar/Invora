import { db } from "@/db";
import { pemetaanPersonelPo, personel, po, poLineItem } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import FormTambahPemetaan from "./pemetaan-form";
import TombolHapus from "./hapus-button";

export default async function HalamanPemetaan() {
  const daftarPersonel = await db.select().from(personel);
  const daftarPo = await db.select().from(po);
  const daftarLine = await db.select().from(poLineItem).orderBy(poLineItem.nomorLine);
  const daftar = await db
    .select({
      id: pemetaanPersonelPo.id, berlakuDari: pemetaanPersonelPo.berlakuDari, berlakuSampai: pemetaanPersonelPo.berlakuSampai,
      namaPersonel: personel.nama, nomorPo: po.nomorPo, poLineText: poLineItem.shortText, poLineNomor: poLineItem.nomorLine,
    })
    .from(pemetaanPersonelPo)
    .innerJoin(personel, eq(pemetaanPersonelPo.personelId, personel.id))
    .innerJoin(po, eq(pemetaanPersonelPo.poId, po.id))
    .leftJoin(poLineItem, eq(pemetaanPersonelPo.poLineItemId, poLineItem.id))
    .orderBy(desc(pemetaanPersonelPo.id));

  return (
    <div>
      <h1>Pemetaan Personel &harr; PO</h1>
      <p className="subtitle">PO bersifat bundling, tidak mencantumkan nama personel — pemetaan disimpan terpisah.</p>
      <FormTambahPemetaan
        daftarPersonel={daftarPersonel.map((p) => ({ id: p.id, label: p.nama }))}
        daftarPo={daftarPo.map((p) => ({ id: p.id, label: p.nomorPo }))}
        daftarLine={daftarLine.map((l) => ({ id: l.id, poId: l.poId, label: `Line ${l.nomorLine} — ${l.shortText}` }))}
      />
      <div className="table-wrap">
        <table>
          <thead><tr>
            <th>Personel</th><th>PO</th><th>PO Line</th>
            <th>Berlaku Dari</th><th>Berlaku Sampai</th><th></th>
          </tr></thead>
          <tbody>
            {daftar.map((m) => (
              <tr key={m.id}>
                <td>{m.namaPersonel}</td>
                <td>{m.nomorPo}</td>
                <td>{m.poLineText ? `Line ${m.poLineNomor} — ${m.poLineText}` : "-"}</td>
                <td>{m.berlakuDari}</td>
                <td>{m.berlakuSampai ?? "masih berlaku"}</td>
                <td><TombolHapus url={`/api/pemetaan/${m.id}`} konfirmasi="Hapus pemetaan ini?" /></td>
              </tr>
            ))}
            {daftar.length === 0 && <tr><td colSpan={6} className="table-empty">Belum ada data.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
