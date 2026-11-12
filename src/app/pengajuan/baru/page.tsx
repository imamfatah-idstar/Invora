import { wajibRole } from "@/lib/require-role";
import { db } from "@/db";
import { po, userXl, personel, rateCard, poLineItem } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import FormBuatPengajuan from "./form";
import Topbar from "@/components/topbar";

export default async function HalamanBuatPengajuan() {
  const userLogin = await wajibRole(["petugas"]);

  const daftarPoMentah = await db.select().from(po);
  const daftarPo = [...daftarPoMentah].sort((a, b) =>
    a.nomorPo.localeCompare(b.nomorPo, "id", { numeric: true })
  );
  const daftarUserXl = await db.select().from(userXl);

  const daftarPersonelAktif = await db
    .select({
      id: personel.id,
      nama: personel.nama,
    })
    .from(personel)
    .where(eq(personel.status, "aktif"))
    .orderBy(personel.nama);

  const semuaRate = await db
    .select({
      personelId: rateCard.personelId,
      nilaiRate: rateCard.nilaiRate,
    })
    .from(rateCard)
    .orderBy(desc(rateCard.berlakuDari));

  const rateMap = new Map<number, string>();
  for (const r of semuaRate) {
    if (!rateMap.has(r.personelId)) {
      rateMap.set(r.personelId, r.nilaiRate);
    }
  }

  const daftarPoLineItem = await db
    .select({
      id: poLineItem.id,
      poId: poLineItem.poId,
      nomorLine: poLineItem.nomorLine,
      shortText: poLineItem.shortText,
      hargaSatuan: poLineItem.hargaSatuan,
    })
    .from(poLineItem)
    .orderBy(poLineItem.nomorLine);

  return (
    <>
      <Topbar nama={userLogin.nama} role={userLogin.role} email={userLogin.email} roles={userLogin.roles} />
      <main className="page">
        <a href="/pengajuan" className="back-link">&larr; Submissions</a>
        <h1>Create Submission</h1>
        <p className="subtitle">
          Select PO, Client Approver, and period — the system automatically calculates prorata for each personnel mapped to this PO.
        </p>
        <FormBuatPengajuan
          daftarPo={daftarPo.map((p) => ({
            id: p.id,
            label: `${p.nomorPo} — ${p.namaProyek}${p.klien ? ` [${p.klien}]` : ""}`,
            klien: p.klien,
          }))}
          daftarUserXl={daftarUserXl.map((u) => ({ id: u.id, label: u.nama, poId: u.poId }))}
          daftarPersonel={daftarPersonelAktif.map((p) => ({
            id: p.id,
            nama: p.nama,
            rateTerakhir: rateMap.get(p.id) || null,
          }))}
          daftarPoLineItem={daftarPoLineItem}
        />
      </main>
    </>
  );
}
