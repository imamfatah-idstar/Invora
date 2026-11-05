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
        <h1>Data Management</h1>
        <p className="subtitle">
          Bulk reset staging/test data — to delete individually, use the Delete button in each
          Reference Data page (Personnel, PO, Rate Cards, Mappings) or check multiple rows and click
          &quot;Delete Selected&quot;. User accounts, Client Approvers, and Working Calendar are NEVER deleted from here.
        </p>
        <KelolaDataClient jumlahAwal={jumlah} />
      </main>
    </>
  );
}
