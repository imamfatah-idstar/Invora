import { db } from "@/db";
import { userXl, po } from "@/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import FormEditUserXl from "./edit-form";

export default async function EditUserXl({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [row] = await db.select().from(userXl).where(eq(userXl.id, Number(id)));
  if (!row) notFound();

  const daftarPo = await db
    .select({ id: po.id, nomorPo: po.nomorPo, namaProyek: po.namaProyek })
    .from(po)
    .orderBy(po.nomorPo);

  return (
    <div>
      <a href="/data-referensi/user-xl" className="back-link">&larr; User XL</a>
      <h1>Edit User XL</h1>
      <FormEditUserXl
        id={row.id}
        namaAwal={row.nama}
        kontakAwal={row.kontak ?? ""}
        poIdAwal={row.poId}
        daftarPo={daftarPo.map((p) => ({ id: p.id, label: `${p.nomorPo} — ${p.namaProyek}` }))}
      />
    </div>
  );
}
