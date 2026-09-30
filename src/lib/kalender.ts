import { db } from "@/db";
import { kalenderKerja } from "@/db/schema";
import { eq, and, gte, lte } from "drizzle-orm";

// Format tanggal konsisten YYYY-MM-DD (hindari masalah zona waktu Date bawaan JS).
function keString(tanggal: Date): string {
  const y = tanggal.getFullYear();
  const m = String(tanggal.getMonth() + 1).padStart(2, "0");
  const d = String(tanggal.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function dariString(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

// Apakah tanggal ini "hari kerja yang dapat ditagihkan"?
// Aturan: Sabtu/Minggu & libur_nasional/cuti_bersama DIKECUALIKAN,
// KECUALI ada entri kalender bertipe "kerja" yang meng-override-nya.
export async function apakahHariKerja(tanggalStr: string): Promise<boolean> {
  const [entri] = await db.select().from(kalenderKerja).where(eq(kalenderKerja.tanggal, tanggalStr));

  if (entri) {
    // Ada entri eksplisit di kalender — ikuti itu (bisa override akhir pekan jadi "kerja").
    return entri.tipe === "kerja";
  }

  // Tidak ada entri eksplisit -> default: Sabtu(6)/Minggu(0) libur, selain itu hari kerja.
  const hari = dariString(tanggalStr).getDay();
  return hari !== 0 && hari !== 6;
}

// Hitung jumlah hari kerja dalam rentang [dariStr, sampaiStr] — INKLUSIF kedua ujung.
export async function hitungHariKerjaDalamRentang(dariStr: string, sampaiStr: string): Promise<number> {
  const dari = dariString(dariStr);
  const sampai = dariString(sampaiStr);
  if (dari > sampai) return 0;

  let jumlah = 0;
  const cursor = new Date(dari);
  while (cursor <= sampai) {
    const s = keString(cursor);
    if (await apakahHariKerja(s)) jumlah++;
    cursor.setDate(cursor.getDate() + 1);
  }
  return jumlah;
}

// Hari kerja acuan SATU BULAN PENUH (dipakai sebagai pembagi rumus prorata).
// periode format "YYYY-MM".
export async function hitungHariKerjaAcuanBulan(periode: string): Promise<number> {
  const [tahun, bulan] = periode.split("-").map(Number);
  const awalBulan = keString(new Date(tahun, bulan - 1, 1));
  const akhirBulan = keString(new Date(tahun, bulan, 0)); // hari terakhir bulan (kalender sebenarnya)
  return hitungHariKerjaDalamRentang(awalBulan, akhirBulan);
}

// Batas awal/akhir satu periode bulan, dalam format YYYY-MM-DD.
export function batasPeriode(periode: string): { awal: string; akhir: string } {
  const [tahun, bulan] = periode.split("-").map(Number);
  return {
    awal: keString(new Date(tahun, bulan - 1, 1)),
    akhir: keString(new Date(tahun, bulan, 0)),
  };
}

// Irisan dua rentang tanggal (inklusif), null kalau tidak beririsan sama sekali.
export function irisanRentang(
  a: { dari: string; sampai: string },
  b: { dari: string; sampai: string }
): { dari: string; sampai: string } | null {
  const dari = a.dari > b.dari ? a.dari : b.dari;
  const sampai = a.sampai < b.sampai ? a.sampai : b.sampai;
  if (dari > sampai) return null;
  return { dari, sampai };
}
