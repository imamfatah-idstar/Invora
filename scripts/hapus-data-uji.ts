// Skrip reset data uji (bagian 46-47) — HAPUS SEMUA data transaksi/contoh:
// personel, rate card, PO, pemetaan personel-PO, pengajuan + seluruh
// turunannya (dokumen CAC/BAST, GR Request, timesheet, konfirmasi, checker
// review). TIDAK menghapus: users (akun login), sessions, user_xl,
// kalender_kerja, audit_log.
//
// SENGAJA hanya bisa dijalankan lewat `npx tsx scripts/hapus-data-uji.ts --yes`
// (bukan npm script) supaya tidak ada yang tidak sengaja klik/jalanin tanpa
// baca dulu. Jalankan SETELAH backup manual (lihat pesan Claude).
//
// Urutan hapus WAJIB dari child ke parent (foreign key):
// gr_request_riwayat -> gr_request -> lampiran_pengajuan -> dokumen ->
// checker_review -> konfirmasi -> timesheet -> pengajuan_detail -> pengajuan
// -> pemetaan_personel_po -> po_line_item -> rate_card -> po -> personel.

import "dotenv/config";
import { db } from "../src/db";
import {
  grRequestRiwayat, grRequest, lampiranPengajuan, dokumen, checkerReview,
  konfirmasi, timesheet, pengajuanDetail, pengajuan, pemetaanPersonelPo,
  poLineItem, rateCard, po, personel,
} from "../src/db/schema";

async function hitungSemua() {
  const tabel = { grRequestRiwayat, grRequest, lampiranPengajuan, dokumen, checkerReview, konfirmasi, timesheet, pengajuanDetail, pengajuan, pemetaanPersonelPo, poLineItem, rateCard, po, personel };
  const hasil: Record<string, number> = {};
  for (const [nama, t] of Object.entries(tabel)) {
    hasil[nama] = (await db.select().from(t as never)).length;
  }
  return hasil;
}

async function main() {
  const konfirmasiFlag = process.argv.includes("--yes");

  console.log("Jumlah baris SEBELUM hapus:");
  console.log(await hitungSemua());

  if (!konfirmasiFlag) {
    console.log("\nDRY RUN — tidak ada yang dihapus. Jalankan lagi dengan --yes untuk benar-benar menghapus:");
    console.log("  npx tsx scripts/hapus-data-uji.ts --yes");
    process.exit(0);
  }

  console.log("\nMenghapus (child -> parent)...");
  await db.delete(grRequestRiwayat);
  await db.delete(grRequest);
  await db.delete(lampiranPengajuan);
  await db.delete(dokumen);
  await db.delete(checkerReview);
  await db.delete(konfirmasi);
  await db.delete(timesheet);
  await db.delete(pengajuanDetail);
  await db.delete(pengajuan);
  await db.delete(pemetaanPersonelPo);
  await db.delete(poLineItem);
  await db.delete(rateCard);
  await db.delete(po);
  await db.delete(personel);

  console.log("Selesai. Jumlah baris SESUDAH hapus:");
  console.log(await hitungSemua());
  console.log("\nTidak disentuh: users, sessions, user_xl, kalender_kerja, audit_log.");
  process.exit(0);
}

main().catch((e) => {
  console.error("Gagal:", e);
  process.exit(1);
});
