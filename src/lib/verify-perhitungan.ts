import { db } from "@/db";
import { kalenderKerja } from "@/db/schema";
import { hitungProrata, PembagiNolError } from "@/lib/perhitungan";
import { hitungHariKerjaAcuanBulan } from "@/lib/kalender";
import { eq, gte, lte, and } from "drizzle-orm";

function cekSama(label: string, aktual: unknown, harapan: unknown) {
  const ok = String(aktual) === String(harapan);
  console.log(`${ok ? "LULUS" : "GAGAL"} - ${label}: aktual=${aktual}, harapan=${harapan}`);
  if (!ok) process.exitCode = 1;
}

async function main() {
  const hariAcuanJan2026 = await hitungHariKerjaAcuanBulan("2026-01");
  console.log(`Info: hari kerja acuan Januari 2026 (setelah kurangi Sabtu/Minggu + 1 libur nasional 1 Jan) = ${hariAcuanJan2026}`);

  // --- Uji 1: rate BULAN PENUH -> hasil harus = rate persis ---
  const uji1 = await hitungProrata({
    nilaiRate: "10000000.00",
    periode: "2026-01",
    personelBerlakuDari: "2026-01-01",
    personelBerlakuSampai: null,
  });
  cekSama("Uji 1 (bulan penuh) hariKerjaDapatDitagihkan == hariKerjaAcuanBulan", uji1.hariKerjaDapatDitagihkan, hariAcuanJan2026);
  cekSama("Uji 1 (bulan penuh) hasilHitung == rate persis", uji1.hasilHitung, "10000000");

  // --- Uji 2: JOIN pertengahan bulan, tanggal 15 Jan 2026 (cek hari apa) ---
  const hariJan15 = new Date(2026, 0, 15).getDay(); // 0=Minggu..6=Sabtu
  console.log(`Info: 15 Januari 2026 jatuh pada hari ke-${hariJan15} (0=Minggu)`);
  const uji2 = await hitungProrata({
    nilaiRate: "10000000.00",
    periode: "2026-01",
    personelBerlakuDari: "2026-01-15",
    personelBerlakuSampai: null,
  });
  console.log(`Info: Uji 2 (join 15 Jan) -> hariKerjaDapatDitagihkan=${uji2.hariKerjaDapatDitagihkan}, hasil=${uji2.hasilHitung}`);
  cekSama(
    "Uji 2: hasil TIDAK BOLEH sama dengan asumsi naif (17/31 hari kalender dari tanggal 15 ke akhir bulan)",
    uji2.hariKerjaDapatDitagihkan === 17, false // rentang 15-31 Jan = 17 hari KALENDER, tapi kita hitung HARI KERJA, jadi harus beda (kecuali kebetulan)
  );

  // --- Uji 3: RESIGN, aktif 1-15 Jan 2026 ---
  const uji3 = await hitungProrata({
    nilaiRate: "10000000.00",
    periode: "2026-01",
    personelBerlakuDari: "2026-01-01",
    personelBerlakuSampai: "2026-01-15",
  });
  console.log(`Info: Uji 3 (resign 15 Jan) -> hariKerjaDapatDitagihkan=${uji3.hariKerjaDapatDitagihkan}, hasil=${uji3.hasilHitung}`);
  cekSama("Uji 3: hari uji2 (join) + hari uji3 (resign, tanpa 15 dobel)", uji2.hariKerjaDapatDitagihkan + uji3.hariKerjaDapatDitagihkan - (await import("@/lib/kalender").then(m => m.apakahHariKerja("2026-01-15")) ? 1 : 0), hariAcuanJan2026);

  // --- Uji 4: PEMBAGI NOL — buat bulan Maret 2026 semua tanggal jadi "libur_nasional" ---
  const semuaTanggalMaret = Array.from({ length: 31 }, (_, i) => `2026-03-${String(i + 1).padStart(2, "0")}`);
  for (const t of semuaTanggalMaret) {
    await db.insert(kalenderKerja).values({ tanggal: t, tipe: "libur_nasional", keterangan: "UJI SEMENTARA - akan dihapus" });
  }
  let uji4Lempar = false;
  try {
    await hitungProrata({
      nilaiRate: "10000000.00", periode: "2026-03",
      personelBerlakuDari: "2026-03-01", personelBerlakuSampai: null,
    });
  } catch (e) {
    uji4Lempar = e instanceof PembagiNolError;
  }
  cekSama("Uji 4: pembagi nol DITOLAK (melempar PembagiNolError)", uji4Lempar, true);

  // Bersihkan data uji sementara
  for (const t of semuaTanggalMaret) {
    await db.delete(kalenderKerja).where(eq(kalenderKerja.tanggal, t));
  }
  console.log("Info: data kalender uji sementara (Maret 2026) sudah dibersihkan.");
}

main().then(() => {
  if (process.exitCode === 1) {
    console.log("\nADA UJI YANG GAGAL — lihat di atas.");
  } else {
    console.log("\nSEMUA UJI LULUS.");
  }
  process.exit(process.exitCode ?? 0);
}).catch((err) => {
  console.error("ERROR TAK TERDUGA:", err);
  process.exit(1);
});
