import { db } from "@/db";
import { users } from "@/db/schema";
import { desc } from "drizzle-orm";
import { userSaatIni } from "@/lib/session-server";
import FormTambahAkun from "./akun-form";
import BarisAksiAkun from "./akun-row-actions";

export default async function HalamanAkun() {
  const [daftar, userSekarang] = await Promise.all([
    db.select().from(users).orderBy(desc(users.id)),
    userSaatIni(),
  ]);

  return (
    <div>
      <h1>Akun &amp; Akses</h1>
      <p className="subtitle">
        Daftarkan email yang boleh masuk aplikasi ini (wajib domain <b>@idstar.group</b>), tentukan siapa peran <b>Input Data</b>
        (buat &amp; konfirmasi pengajuan, kelola data referensi) dan siapa peran <b>Checker</b> (approve/reject pengajuan).
        Administrator tidak mengelola data finansial/operasional apa pun di sini — hanya akses, dan tidak melihat
        halaman Pengajuan atau Summary PO.
      </p>
      <FormTambahAkun />
      <div className="table-wrap">
        <table>
          <thead><tr><th>Nama</th><th>Email</th><th colSpan={2}>Peran &amp; Status</th></tr></thead>
          <tbody>
            {daftar.map((u) => (
              <tr key={u.id}>
                <td>{u.nama}</td>
                <td>{u.email}</td>
                <td colSpan={2}>
                  <BarisAksiAkun
                    id={u.id}
                    role={u.role}
                    aktif={u.aktif}
                    kuncSendiri={u.id === userSekarang?.id}
                  />
                </td>
              </tr>
            ))}
            {daftar.length === 0 && <tr><td colSpan={4} className="table-empty">Belum ada akun.</td></tr>}
          </tbody>
        </table>
      </div>
      <p className="subtitle" style={{ marginTop: 16 }}>
        💡 Akun tidak bisa dihapus permanen (dipakai sebagai jejak di log audit, pengajuan, dan riwayat lain) — nonaktifkan
        akun kalau seseorang tidak lagi berhak masuk. Akun nonaktif otomatis ditolak saat login, dan sesi yang sedang
        berjalan tetap berakhir sesuai masa berlakunya. Peran ditampilkan sebagai &quot;Input Data&quot; di layar (nilai
        di basis data tetap &quot;petugas&quot;, tidak diubah, supaya tidak perlu migrasi ulang catatan lama).
      </p>
    </div>
  );
}
