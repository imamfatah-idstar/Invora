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
      <h1>PO / Item</h1>
      <p className="subtitle">PO bersifat bundling — tidak mencantumkan personel. Saldo awal = nilai item saat dibuat. Tahun dan nilai GR dipakai di halaman Summary PO.</p>
      <FormImporPo />
      <FormTambahPo />
      <TabelPo daftar={daftar} />
    </div>
  );
}
