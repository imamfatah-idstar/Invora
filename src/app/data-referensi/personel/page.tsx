import { db } from "@/db";
import { personel } from "@/db/schema";
import { desc } from "drizzle-orm";
import FormTambahPersonel from "./personel-form";
import FormImporIntegral from "./impor-integral-form";
import TabelPersonel from "./personel-table";

export default async function HalamanPersonel() {
  const daftar = await db.select().from(personel).orderBy(desc(personel.id));

  return (
    <div>
      <h1>Personel</h1>
      <p className="subtitle">Data contoh untuk pengembangan — bukan data nyata.</p>
      <FormImporIntegral />
      <FormTambahPersonel />
      <TabelPersonel daftar={daftar} />
    </div>
  );
}
