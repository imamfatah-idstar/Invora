import { db } from "./index";
import {
  users, personel, rateCard, userXl, po,
  pemetaanPersonelPo, pengajuan, pengajuanDetail,
  konfirmasi, checkerReview,
} from "./schema";

// Skrip verifikasi manual — meniru core loop MVP 1:
// input data -> hitung -> konfirmasi petugas -> checker
// Data ini contoh (label jelas), BUKAN data nyata.
async function main() {
  // 1. Akun: satu Petugas, satu Checker (harus orang berbeda)
  const [petugas] = await db.insert(users).values({
    nama: "Contoh Petugas (uji)", email: "petugas.uji@contoh.local",
    passwordHash: "hash-contoh", role: "petugas",
  }).returning();
  const [checkerUser] = await db.insert(users).values({
    nama: "Contoh Checker (uji)", email: "checker.uji@contoh.local",
    passwordHash: "hash-contoh", role: "checker",
  }).returning();
  console.log("1. Users dibuat:", petugas.nama, "&", checkerUser.nama);

  // 2. Data referensi
  const [orang] = await db.insert(personel).values({ nama: "Contoh Personel (uji)" }).returning();
  const [rate] = await db.insert(rateCard).values({
    personelId: orang.id, nilaiRate: "10000000.00", berlakuDari: "2026-01-01",
  }).returning();
  const [xl] = await db.insert(userXl).values({ nama: "Contoh User XL (uji)" }).returning();
  const [poItem] = await db.insert(po).values({
    nomorPo: "PO-CONTOH-0001", namaProyek: "Proyek Contoh (uji)",
    nilaiItem: "100000000.00", saldoSebelumPpn: "100000000.00",
  }).returning();
  await db.insert(pemetaanPersonelPo).values({
    personelId: orang.id, poId: poItem.id, berlakuDari: "2026-01-01",
  });
  console.log("2. Data referensi (personel, rate, user XL, PO, pemetaan) tersimpan");

  // 3. Pengajuan + hitung (rate penuh, 22/22 hari kerja -> tagihan penuh)
  const [ajuan] = await db.insert(pengajuan).values({
    periode: "2026-01", poId: poItem.id, userXlId: xl.id, status: "draft",
  }).returning();
  await db.insert(pengajuanDetail).values({
    pengajuanId: ajuan.id, personelId: orang.id,
    hariKerjaDapatDitagihkan: 22, hariKerjaAcuanBulan: 22,
    nilaiRateDipakai: rate.nilaiRate, hasilHitung: "10000000.00",
  });
  console.log("3. Pengajuan + rincian hitung tersimpan, status:", ajuan.status);

  // 4. Konfirmasi petugas -> ubah status
  await db.insert(konfirmasi).values({
    pengajuanId: ajuan.id, userId: petugas.id, versiDikonfirmasi: ajuan.versi,
  });
  await db.update(pengajuan).set({ status: "menunggu_checker" }).where(eq_(ajuan.id));
  console.log("4. Konfirmasi petugas tersimpan, status diubah ke menunggu_checker");

  // 5. Checker memeriksa -> siap diajukan
  await db.insert(checkerReview).values({
    pengajuanId: ajuan.id, userId: checkerUser.id, hasil: "siap_diajukan",
  });
  await db.update(pengajuan).set({ status: "siap_diajukan" }).where(eq_(ajuan.id));
  console.log("5. Checker review tersimpan, status diubah ke siap_diajukan");

  const [final] = await db.select().from(pengajuan).where(eq_(ajuan.id));
  console.log("\nStatus akhir pengajuan:", final.status, "| versi:", final.versi);
}

import { eq } from "drizzle-orm";
import { pengajuan as pengajuanTable } from "./schema";
function eq_(id: number) {
  return eq(pengajuanTable.id, id);
}

main().then(() => {
  console.log("\nVERIFIKASI SUKSES: alur data core loop MVP 1 (input->hitung->konfirmasi->checker) berjalan.");
  process.exit(0);
}).catch((err) => {
  console.error("VERIFIKASI GAGAL:", err);
  process.exit(1);
});
