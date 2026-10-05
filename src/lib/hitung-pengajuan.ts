import { db } from "@/db";
import { pemetaanPersonelPo, personel, rateCard, timesheet, pengajuan, pengajuanDetail } from "@/db/schema";
import { eq, and, lte, or, gte, isNull, ne, inArray } from "drizzle-orm";
import Decimal from "decimal.js";
import { hitungProrata, PembagiNolError } from "@/lib/perhitungan";
import { batasPeriode } from "@/lib/kalender";
import { angkaDesimalValid } from "@/lib/validasi";

export type BarisHitung = {
  personelId: number;
  namaPersonel: string;
  nilaiRateDipakai: string | null;
  hariKerjaDapatDitagihkan: number | null;
  hariKerjaAcuanBulan: number | null;
  hasilHitung: string | null;
  error: string | null;
  // "timesheet" kalau angka hari kerja/kehadiran dari timesheet yang diunggah,
  // "kalender" kalau dari hitung kalender kerja (default, saat belum ada timesheet).
  sumberHitung: "timesheet" | "kalender";
  // Snapshot poLineItemId dari pemetaan_personel_po (bagian 33) — dibawa ke
  // pengajuan_detail saat pengajuan disimpan, dipakai untuk generate GR Request.
  poLineItemId: number | null;
};

// Hitung prorata semua personel yang terpetakan ke sebuah PO, untuk satu periode.
// Dipakai baik untuk PREVIEW (sebelum simpan) maupun saat SIMPAN (dihitung ulang
// di server, tidak percaya angka kiriman client).
//
// Kalau ada timesheet yang diunggah untuk kombinasi personel+PO+periode, angka
// totalHariKerja/totalKehadiran dari timesheet itu MENGGANTIKAN hasil hitung
// kalender kerja (hariKerjaAcuanBulan/hariKerjaDapatDitagihkan) — sesuai
// keputusan: timesheet jadi dasar hari kerja yang dapat ditagihkan.
export async function hitungSemuaPersonelUntukPo(poId: number, periode: string): Promise<BarisHitung[]> {
  const { awal, akhir } = batasPeriode(periode);

  const pemetaan = await db
    .select({
      personelId: pemetaanPersonelPo.personelId,
      berlakuDari: pemetaanPersonelPo.berlakuDari,
      berlakuSampai: pemetaanPersonelPo.berlakuSampai,
      namaPersonel: personel.nama,
      poLineItemId: pemetaanPersonelPo.poLineItemId,
    })
    .from(pemetaanPersonelPo)
    .innerJoin(personel, eq(pemetaanPersonelPo.personelId, personel.id))
    .where(
      and(
        eq(pemetaanPersonelPo.poId, poId),
        lte(pemetaanPersonelPo.berlakuDari, akhir),
        or(isNull(pemetaanPersonelPo.berlakuSampai), gte(pemetaanPersonelPo.berlakuSampai, awal))
      )
    );

  const hasil: BarisHitung[] = [];

  for (const p of pemetaan) {
    const rateAktif = await db
      .select()
      .from(rateCard)
      .where(
        and(
          eq(rateCard.personelId, p.personelId),
          lte(rateCard.berlakuDari, akhir),
          or(isNull(rateCard.berlakuSampai), gte(rateCard.berlakuSampai, awal))
        )
      )
      .orderBy(rateCard.berlakuDari);

    const rate = rateAktif[rateAktif.length - 1]; // rate paling baru yang berlaku

    if (!rate) {
      hasil.push({
        personelId: p.personelId, namaPersonel: p.namaPersonel,
        nilaiRateDipakai: null, hariKerjaDapatDitagihkan: null, hariKerjaAcuanBulan: null,
        hasilHitung: null, error: "Tidak ada rate card aktif untuk periode ini.", sumberHitung: "kalender",
        poLineItemId: p.poLineItemId,
      });
      continue;
    }

    // Cek dulu apakah ada timesheet untuk kombinasi personel+PO+periode ini.
    const timesheetBaris = await db
      .select()
      .from(timesheet)
      .where(and(eq(timesheet.personelId, p.personelId), eq(timesheet.poId, poId), eq(timesheet.periode, periode)));
    const ts = timesheetBaris[0];

    if (ts) {
      if (ts.totalHariKerja === 0) {
        hasil.push({
          personelId: p.personelId, namaPersonel: p.namaPersonel,
          nilaiRateDipakai: rate.nilaiRate, hariKerjaDapatDitagihkan: null, hariKerjaAcuanBulan: null,
          hasilHitung: null,
          error: "Total hari kerja pada timesheet = 0. Perhitungan ditolak (pembagi nol tidak diperbolehkan).",
          sumberHitung: "timesheet",
          poLineItemId: p.poLineItemId,
        });
        continue;
      }
      const hasilHitung = new Decimal(rate.nilaiRate)
        .times(ts.totalKehadiran)
        .dividedBy(ts.totalHariKerja)
        .toString();
      hasil.push({
        personelId: p.personelId, namaPersonel: p.namaPersonel,
        nilaiRateDipakai: rate.nilaiRate,
        hariKerjaDapatDitagihkan: ts.totalKehadiran,
        hariKerjaAcuanBulan: ts.totalHariKerja,
        hasilHitung, error: null, sumberHitung: "timesheet",
        poLineItemId: p.poLineItemId,
      });
      continue;
    }

    try {
      const r = await hitungProrata({
        nilaiRate: rate.nilaiRate,
        periode,
        personelBerlakuDari: p.berlakuDari,
        personelBerlakuSampai: p.berlakuSampai,
      });
      hasil.push({
        personelId: p.personelId, namaPersonel: p.namaPersonel,
        nilaiRateDipakai: rate.nilaiRate,
        hariKerjaDapatDitagihkan: r.hariKerjaDapatDitagihkan,
        hariKerjaAcuanBulan: r.hariKerjaAcuanBulan,
        hasilHitung: r.hasilHitung, error: null, sumberHitung: "kalender",
        poLineItemId: p.poLineItemId,
      });
    } catch (e) {
      hasil.push({
        personelId: p.personelId, namaPersonel: p.namaPersonel,
        nilaiRateDipakai: rate.nilaiRate, hariKerjaDapatDitagihkan: null, hariKerjaAcuanBulan: null,
        hasilHitung: null, error: e instanceof PembagiNolError ? e.message : "Gagal menghitung.",
        sumberHitung: "kalender",
        poLineItemId: p.poLineItemId,
      });
    }
  }

  return hasil;
}


// ====== Alokasi lintas-PO / "cross PO" (MVP 2, bagian 35) ======
// Kalau saldo PO tidak cukup untuk tagihan penuh seorang personel bulan itu,
// sisanya perlu ditagihkan di PO lain. Fungsi ini mengambil hasil hitung
// MENTAH (nilai penuh, dari hitungSemuaPersonelUntukPo di atas — TIDAK
// diubah, supaya tetap murni/dapat dipakai ulang) dan menerapkan:
// 1. Dedup — cek berapa dari nilai penuh personel ini yang SUDAH ditagihkan
//    di pengajuan lain untuk periode yang sama (PO berbeda), supaya tidak
//    dobel tagih.
// 2. Capping — dari sisa yang PERLU ditagih, berapa yang muat di sisa saldo
//    PO saat ini (dihitung berjalan/running, karena beberapa personel
//    berbagi kolam saldo yang sama). Sisa yang tidak muat TIDAK hilang —
//    tetap "perlu ditagih", tinggal menunggu pengajuan berikut ke PO lain.
export type BarisHitungDialokasikan = BarisHitung & {
  // Sama seperti hasilHitung mentah di atas — nilai tagihan PENUH personel
  // ini untuk periode ini, sebelum dikurangi bagian yang sudah ditagihkan
  // di PO lain.
  nilaiPenuh: string | null;
  // Berapa dari nilaiPenuh yang sudah ditagihkan di PENGAJUAN LAIN (PO
  // berbeda) untuk periode yang sama. "0" kalau belum ada sama sekali.
  sudahDialokasikanDiPoLain: string;
  // nilaiPenuh - sudahDialokasikanDiPoLain. "0" kalau sudah lunas bulan ini.
  sisaPerluDitagih: string | null;
  // min(sisaPerluDitagih, sisa saldo PO saat ini setelah personel-personel
  // sebelumnya di daftar ini). Inilah yang disimpan sebagai hasilHitung di
  // pengajuan_detail kalau personel ini dipilih. Null kalau error atau sudah
  // lunas bulan ini (tidak ada yang perlu ditagih).
  akanDitagihkan: string | null;
  // true kalau sisaPerluDitagih <= 0 — personel ini sudah tertagih penuh di
  // PO lain untuk periode ini, tidak boleh dipilih lagi di PO ini.
  sudahLunasBulanIni: boolean;
};

export async function terapkanAlokasiLintasPo(
  baris: BarisHitung[],
  poIdSaatIni: number,
  periode: string,
  saldoPoTersedia: string
): Promise<BarisHitungDialokasikan[]> {
  const personelIds = baris.filter((b) => !b.error && b.hasilHitung !== null).map((b) => b.personelId);

  const sudahDialokasikanMap = new Map<number, Decimal>();
  if (personelIds.length > 0) {
    const rows = await db
      .select({ personelId: pengajuanDetail.personelId, hasilHitung: pengajuanDetail.hasilHitung })
      .from(pengajuanDetail)
      .innerJoin(pengajuan, eq(pengajuanDetail.pengajuanId, pengajuan.id))
      .where(
        and(
          eq(pengajuan.periode, periode),
          ne(pengajuan.poId, poIdSaatIni),
          inArray(pengajuanDetail.personelId, personelIds)
        )
      );
    for (const r of rows) {
      const sebelumnya = sudahDialokasikanMap.get(r.personelId) ?? new Decimal(0);
      sudahDialokasikanMap.set(r.personelId, sebelumnya.plus(new Decimal(r.hasilHitung)));
    }
  }

  let saldoBerjalan = new Decimal(saldoPoTersedia);
  const hasil: BarisHitungDialokasikan[] = [];

  for (const b of baris) {
    if (b.error || b.hasilHitung === null) {
      hasil.push({ ...b, nilaiPenuh: null, sudahDialokasikanDiPoLain: "0", sisaPerluDitagih: null, akanDitagihkan: null, sudahLunasBulanIni: false });
      continue;
    }
    const nilaiPenuh = new Decimal(b.hasilHitung);
    const sudahDialokasikan = sudahDialokasikanMap.get(b.personelId) ?? new Decimal(0);
    const sisaPerluDitagih = nilaiPenuh.minus(sudahDialokasikan);

    if (sisaPerluDitagih.lessThanOrEqualTo(0)) {
      hasil.push({
        ...b, nilaiPenuh: nilaiPenuh.toString(), sudahDialokasikanDiPoLain: sudahDialokasikan.toString(),
        sisaPerluDitagih: "0", akanDitagihkan: null, sudahLunasBulanIni: true,
      });
      continue;
    }

    const akanDitagihkan = Decimal.min(sisaPerluDitagih, Decimal.max(saldoBerjalan, 0));
    if (akanDitagihkan.greaterThan(0)) saldoBerjalan = saldoBerjalan.minus(akanDitagihkan);
    hasil.push({
      ...b, nilaiPenuh: nilaiPenuh.toString(), sudahDialokasikanDiPoLain: sudahDialokasikan.toString(),
      sisaPerluDitagih: sisaPerluDitagih.toString(), akanDitagihkan: akanDitagihkan.toString(),
      sudahLunasBulanIni: false,
    });
  }

  return hasil;
}


// ====== Tagihan "tahap" / milestone (bagian 53) ======
// Untuk PO jenisTagihan = "tahap", nilai tagihan TIDAK dihitung otomatis
// (keputusan bagian 41) — Petugas mengetik nominal per personel. Fungsi ini
// hanya mengembalikan daftar personel yang terpetakan ke PO pada periode itu
// (plus rate card aktif sebagai snapshot opsional, bukan dasar hitung).
export type BarisTahap = {
  personelId: number;
  namaPersonel: string;
  poLineItemId: number | null;
  nilaiRateAcuan: string | null;
};

export async function daftarPersonelTahap(poId: number, periode: string): Promise<BarisTahap[]> {
  const { awal, akhir } = batasPeriode(periode);
  const pemetaan = await db
    .select({
      personelId: pemetaanPersonelPo.personelId,
      namaPersonel: personel.nama,
      poLineItemId: pemetaanPersonelPo.poLineItemId,
    })
    .from(pemetaanPersonelPo)
    .innerJoin(personel, eq(pemetaanPersonelPo.personelId, personel.id))
    .where(
      and(
        eq(pemetaanPersonelPo.poId, poId),
        lte(pemetaanPersonelPo.berlakuDari, akhir),
        or(isNull(pemetaanPersonelPo.berlakuSampai), gte(pemetaanPersonelPo.berlakuSampai, awal))
      )
    );
  const hasil: BarisTahap[] = [];
  for (const p of pemetaan) {
    const rate = await db
      .select()
      .from(rateCard)
      .where(
        and(
          eq(rateCard.personelId, p.personelId),
          lte(rateCard.berlakuDari, akhir),
          or(isNull(rateCard.berlakuSampai), gte(rateCard.berlakuSampai, awal))
        )
      )
      .orderBy(rateCard.berlakuDari);
    hasil.push({ ...p, nilaiRateAcuan: rate.length ? rate[rate.length - 1].nilaiRate : null });
  }
  return hasil;
}

// Validasi + normalisasi input manual tagihan tahap. Mengembalikan baris
// siap-insert atau pesan error. Dipakai POST (buat) dan PATCH (revisi).
export async function siapkanTagihanTahap(
  poId: number, periode: string, nilaiManual: unknown, saldoPo: string
): Promise<{ error: string } | { baris: { personelId: number; poLineItemId: number | null; nilaiRateAcuan: string; nilai: string }[]; total: Decimal }> {
  if (!nilaiManual || typeof nilaiManual !== "object") return { error: "Isi nilai tagihan minimal untuk 1 personel." };
  const tersedia = await daftarPersonelTahap(poId, periode);
  const peta = new Map(tersedia.map((t) => [t.personelId, t]));
  const baris: { personelId: number; poLineItemId: number | null; nilaiRateAcuan: string; nilai: string }[] = [];
  let total = new Decimal(0);
  for (const [k, v] of Object.entries(nilaiManual as Record<string, unknown>)) {
    const t = peta.get(Number(k));
    if (!t) return { error: "Ada personel yang tidak terpetakan ke PO ini pada periode tersebut." };
    if (!angkaDesimalValid(v)) return { error: `Nilai tagihan ${t.namaPersonel} harus angka valid (maks 2 desimal).` };
    const nilai = new Decimal(v.trim());
    if (nilai.lessThanOrEqualTo(0)) return { error: `Nilai tagihan ${t.namaPersonel} harus lebih dari 0.` };
    total = total.plus(nilai);
    baris.push({ personelId: t.personelId, poLineItemId: t.poLineItemId, nilaiRateAcuan: t.nilaiRateAcuan ?? "0.00", nilai: nilai.toFixed(2) });
  }
  if (baris.length === 0) return { error: "Isi nilai tagihan minimal untuk 1 personel." };
  if (total.greaterThan(new Decimal(saldoPo))) {
    return { error: `Total pengajuan (${total.toFixed(2)}) melebihi saldo PO sebelum PPN yang tersisa (${new Decimal(saldoPo).toFixed(2)}).` };
  }
  return { baris, total };
}
