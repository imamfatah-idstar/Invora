import { db } from "@/db";
import { userXl } from "@/db/schema";
import { desc } from "drizzle-orm";
import FormTambahUserXl from "./user-xl-form";
import TombolHapus from "./hapus-button";

export default async function HalamanUserXl() {
  const daftar = await db.select().from(userXl).orderBy(desc(userXl.id));
  return (
    <div>
      <h1>User XL</h1>
      <p className="subtitle">Pemberi keputusan/approval di luar aplikasi — keputusan dicatat internal.</p>
      <FormTambahUserXl />
      <div className="table-wrap">
        <table>
          <thead><tr><th>Nama</th><th>Kontak</th><th></th></tr></thead>
          <tbody>
            {daftar.map((u) => (
              <tr key={u.id}>
                <td>{u.nama}</td>
                <td>{u.kontak ?? "-"}</td>
                <td style={{ display: "flex", gap: 8 }}>
                  <a href={`/data-referensi/user-xl/${u.id}/edit`} className="btn-text">Edit</a>
                  <TombolHapus url={`/api/user-xl/${u.id}`} konfirmasi={`Hapus User XL "${u.nama}"?`} />
                </td>
              </tr>
            ))}
            {daftar.length === 0 && <tr><td colSpan={3} className="table-empty">Belum ada data.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
