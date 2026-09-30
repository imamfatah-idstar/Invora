import { db } from "@/db";
import { personel } from "@/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import FormEditPersonel from "./edit-form";

export default async function EditPersonel({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [row] = await db.select().from(personel).where(eq(personel.id, Number(id)));
  if (!row) notFound();
  return (
    <div>
      <a href="/data-referensi/personel" className="back-link">&larr; Personel</a>
      <h1>Edit Personel</h1>
      <FormEditPersonel id={row.id} namaAwal={row.nama} statusAwal={row.status} />
    </div>
  );
}
