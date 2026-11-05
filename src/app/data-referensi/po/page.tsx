import { db } from "@/db";
import { po } from "@/db/schema";
import { desc } from "drizzle-orm";
import FormTambahPo from "./po-form";
import FormImporPo from "./impor-po-form";
import TabelPo from "./po-table";

export default async function HalamanPo() {
  const daftar = await db.select().from(po).orderBy(desc(po.id));
  return (
    <div>
      <h1>PO / Line Items</h1>
      <p className="subtitle">Bundled purchase orders without named personnel. Initial balance equals item value upon creation. Year and GR values feed into PO Summary.</p>
      <FormImporPo />
      <FormTambahPo />
      <TabelPo daftar={daftar} />
    </div>
  );
}
