import Decimal from "decimal.js";
import {
  hitungHariKerjaDalamRentang,
  hitungHariKerjaAcuanBulan,
  batasPeriode,
  irisanRentang,
} from "@/lib/kalender";

export class PembagiNolError extends Error {
  constructor() {
    super("Hari kerja acuan bulan = 0. Perhitungan ditolak (pembagi nol tidak diperbolehkan).");
    this.name = "PembagiNolError";
  }
}

export type HasilProrata = {
  hariKerjaDapatDitagihkan: number;
  hariKerjaAcuanBulan: number;
  hasilHitung: string; // teks, presisi penuh — TIDAK dibulatkan
};

/**
 * Rumus (sesuai BRD Lampiran A1 & keputusan tanggal aktif):
 *   nilai = rate card bulanan × hari kerja dapat ditagihkan ÷ hari kerja acuan bulan
 *
 * - Tanggal join/resign (di sini: masa berlaku pemetaan personel↔PO) INKLUSIF,
 *   dihitung dari irisan kalender kerja sungguhan — bukan ditebak dari angka tanggal.
 * - Pembagi nol DITOLAK (dilempar sebagai error), bukan dibiarkan jadi Infinity/NaN.
 * - Tidak ada pembulatan di sini — aturan pembulatan prorata belum final (lihat
 *   rencana teknis §10). hasilHitung dikembalikan presisi penuh sebagai teks.
 */
export async function hitungProrata(params: {
  nilaiRate: string;
  periode: string; // "YYYY-MM"
  personelBerlakuDari: string;
  personelBerlakuSampai: string | null;
}): Promise<HasilProrata> {
  const { awal: awalPeriode, akhir: akhirPeriode } = batasPeriode(params.periode);

  const hariKerjaAcuanBulan = await hitungHariKerjaAcuanBulan(params.periode);
  if (hariKerjaAcuanBulan === 0) {
    throw new PembagiNolError();
  }

  const rentangAktif = irisanRentang(
    { dari: awalPeriode, sampai: akhirPeriode },
    { dari: params.personelBerlakuDari, sampai: params.personelBerlakuSampai ?? akhirPeriode }
  );

  const hariKerjaDapatDitagihkan = rentangAktif
    ? await hitungHariKerjaDalamRentang(rentangAktif.dari, rentangAktif.sampai)
    : 0;

  const rate = new Decimal(params.nilaiRate);
  const hasil = rate
    .times(hariKerjaDapatDitagihkan)
    .dividedBy(hariKerjaAcuanBulan);

  return {
    hariKerjaDapatDitagihkan,
    hariKerjaAcuanBulan,
    hasilHitung: hasil.toString(),
  };
}
