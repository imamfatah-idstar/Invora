import { db } from "@/db";
import { rateCard, personel } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import FormTambahRateCard from "./rate-card-form";
import TabelRateCard from "./rate-card-table";

export default async function HalamanRateCard() {
  const daftarPersonel = await db.select().from(personel);
  const daftar = await db
    .select({
      id: rateCard.id, nilaiRate: rateCard.nilaiRate,
      berlakuDari: rateCard.berlakuDari, berlakuSampai: rateCard.berlakuSampai,
      namaPersonel: personel.nama,
    })
    .from(rateCard)
    .innerJoin(personel, eq(rateCard.personelId, personel.id))
    .orderBy(desc(rateCard.id));

  return (
    <div>
      <h1>Rate Card</h1>
      <p className="subtitle">Rate bulanan personel beserta masa berlaku.</p>
      <FormTambahRateCard daftarPersonel={daftarPersonel.map((p) => ({ id: p.id, nama: p.nama }))} />
      <TabelRateCard daftar={daftar} />
    </div>
  );
}
