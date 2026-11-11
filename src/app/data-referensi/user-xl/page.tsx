import { db } from "@/db";
import { userXl, po } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import FormTambahUserXl from "./user-xl-form";
import FormImporUserXl from "./impor-user-xl-form";
import TabelUserXl from "./user-xl-table";

export default async function HalamanUserXl() {
  const daftarPo = await db
    .select({ id: po.id, nomorPo: po.nomorPo, namaProyek: po.namaProyek })
    .from(po)
    .orderBy(po.nomorPo);

  const daftar = await db
    .select({
      id: userXl.id,
      nama: userXl.nama,
      kontak: userXl.kontak,
      poId: userXl.poId,
      nomorPo: po.nomorPo,
      namaProyek: po.namaProyek,
    })
    .from(userXl)
    .leftJoin(po, eq(userXl.poId, po.id))
    .orderBy(desc(userXl.id));

  return (
    <div>
      <h1>User XL (Client Approvers)</h1>
      <p className="subtitle">Client decision-makers / approvers & designated PO — approvals are tracked internally.</p>
      <FormImporUserXl />
      <FormTambahUserXl daftarPo={daftarPo.map((p) => ({ id: p.id, label: `${p.nomorPo} — ${p.namaProyek}` }))} />
      <TabelUserXl daftar={daftar} />
    </div>
  );
}
