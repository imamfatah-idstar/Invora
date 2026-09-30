import { db } from "@/db";
import { rateCard, personel } from "@/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import FormEditRateCard from "./edit-form";

export default async function EditRateCard({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [row] = await db
    .select({
      id: rateCard.id, nilaiRate: rateCard.nilaiRate,
      berlakuDari: rateCard.berlakuDari, berlakuSampai: rateCard.berlakuSampai,
      namaPersonel: personel.nama,
    })
    .from(rateCard).innerJoin(personel, eq(rateCard.personelId, personel.id))
    .where(eq(rateCard.id, Number(id)));
  if (!row) notFound();
  return (
    <div>
      <a href="/data-referensi/rate-card" className="back-link">&larr; Rate Card</a>
      <h1>Edit Rate Card</h1>
      <FormEditRateCard id={row.id} namaPersonel={row.namaPersonel} nilaiRateAwal={row.nilaiRate}
        berlakuDariAwal={row.berlakuDari} berlakuSampaiAwal={row.berlakuSampai ?? ""} />
    </div>
  );
}
