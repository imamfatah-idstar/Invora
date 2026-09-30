import { wajibRole } from "@/lib/require-role";
import Topbar from "@/components/topbar";
import KelolaDataClient from "./kelola-data-client";
import {
  personel, rateCard, po, poLineItem, pemetaanPersonelPo, pengajuan,
  pengajuanDetail, timesheet, dokumen, lampiranPengajuan, grRequest,
  grRequestRiwayat, konfirmasi, checkerReview,
} from "@/db/schema";
import { db } from "@/db";

// Halaman "Kelola Data" (bagian 48) — reset massal data uji/salah unggah.
// SENGAJA dibuat sebagai route mandiri (bukan di bawah /data-referensi atau
// /admin) supaya:
//  - role admin bisa akses HALAMAN INI SAJA tanpa dibuka aksesnya ke seluruh
//    Data Referensi (personel/PO/rate card operasional) — Administrator
//    tetap "hanya akses" sesuai keputusan PROJECT_INSTRUCTIONS.md bagian 20,
//    kelola-data ini pengecualian eksplisit yang diminta pengguna (bagian 48).
//  - role petugas (pengguna sehari-hari Data Referensi) tetap bisa akses.
export default async function HalamanKelolaData() {
  const user = await wajibRole(["petugas", "admin"]);

  const tabel = { personel, rateCard, po, poLineItem, pemetaanPersonelPo, pengajuan, pengajuanDetail, timesheet, dokumen, lampiranPengajuan, grRequest, grRequestRiwayat, konfirmasi, checkerReview };
  const jumlah: Record<string, number> = {};
  for (const [nama, t] of Object.entries(tabel)) {
    jumlah[nama] = (await db.select().from(t)).length;
  }

  return (
    <>
      <Topbar nama={user.nama} role={user.role} />
      <main className="page">
        <a href="/dashboard" className="back-link">&larr; Dashboard</a>
        <h1>Kelola Data</h1>
        <p className="subtitle">
          Reset massal data uji/salah unggah — untuk hapus satu-per-satu, gunakan tombol Hapus di halaman
          Data Referensi masing-masing (Personel, PO, Rate Card, Pemetaan) atau centang beberapa baris lalu
          &quot;Hapus Terpilih&quot;. Akun login, User XL, dan Kalender Kerja TIDAK pernah ikut terhapus dari sini.
        </p>
        <KelolaDataClient jumlahAwal={jumlah} />
      </main>
    </>
  );
}
