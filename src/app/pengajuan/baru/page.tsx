import { wajibRole } from "@/lib/require-role";
import { db } from "@/db";
import { po, userXl } from "@/db/schema";
import FormBuatPengajuan from "./form";
import Topbar from "@/components/topbar";

export default async function HalamanBuatPengajuan() {
  const userLogin = await wajibRole(["petugas"]);

  const daftarPoMentah = await db.select().from(po);
  const daftarPo = [...daftarPoMentah].sort((a, b) =>
    a.nomorPo.localeCompare(b.nomorPo, "id", { numeric: true })
  );
  const daftarUserXl = await db.select().from(userXl);

  return (
    <>
      <Topbar nama={userLogin.nama} role={userLogin.role} email={userLogin.email} />
      <main className="page">
        <a href="/pengajuan" className="back-link">&larr; Submissions</a>
        <h1>Create Submission</h1>
        <p className="subtitle">
          Select PO, Client Approver, and period — the system automatically calculates prorata for each personnel mapped to this PO.
        </p>
        <FormBuatPengajuan
          daftarPo={daftarPo.map((p) => ({ id: p.id, label: `${p.nomorPo} — ${p.namaProyek}` }))}
          daftarUserXl={daftarUserXl.map((u) => ({ id: u.id, label: u.nama }))}
        />
      </main>
    </>
  );
}
