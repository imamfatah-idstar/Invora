import { db } from "@/db";
import { personel } from "@/db/schema";
import { desc } from "drizzle-orm";
import FormTambahPersonel from "./personel-form";
import FormImporIntegral from "./impor-integral-form";
import FormImporPersonelCsv from "./impor-personel-csv-form";
import TabelPersonel from "./personel-table";

export default async function HalamanPersonel() {
  const daftar = await db.select().from(personel).orderBy(desc(personel.id));

  return (
    <div>
      <h1>Personnel</h1>
      <p className="subtitle">Reference master data for project resources and billable personnel.</p>
      <FormImporPersonelCsv />
      <FormImporIntegral />
      <FormTambahPersonel />
      <TabelPersonel daftar={daftar} />
    </div>
  );
}
