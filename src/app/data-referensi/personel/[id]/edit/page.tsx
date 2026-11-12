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
      <FormEditPersonel
        id={row.id}
        nikAwal={row.nik ?? ""}
        namaAwal={row.nama}
        posisiAwal={row.posisi ?? ""}
        tipeAwal={row.tipe ?? ""}
        penempatanAwal={row.penempatan ?? ""}
        nomorSpkAwal={row.nomorSpk ?? ""}
        statusAwal={row.status}
      />
    </div>
  );
}
