/**
 * Helper utilities for generating XLSMART official documents (BAST_PO.pdf and CAC_PO.pdf).
 */

const NAMA_HARI = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
const NAMA_BULAN_INDO = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];
const NAMA_BULAN_EN_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

const ANGKA_TERBILANG: Record<number, string> = {
  1: "Satu", 2: "Dua", 3: "Tiga", 4: "Empat", 5: "Lima",
  6: "Enam", 7: "Tujuh", 8: "Delapan", 9: "Sembilan", 10: "Sepuluh",
  11: "Sebelas", 12: "Dua Belas", 13: "Tiga Belas", 14: "Empat Belas", 15: "Lima Belas",
  16: "Enam Belas", 17: "Tujuh Belas", 18: "Delapan Belas", 19: "Sembilan Belas",
  20: "Dua Puluh", 21: "Dua Puluh Satu", 22: "Dua Puluh Dua", 23: "Dua Puluh Tiga",
  24: "Dua Puluh Empat", 25: "Dua Puluh Lima", 26: "Dua Puluh Enam", 27: "Dua Puluh Tujuh",
  28: "Dua Puluh Delapan", 29: "Dua Puluh Sembilan", 30: "Tiga Puluh", 31: "Tiga Puluh Satu",
};

export function angkaKeTerbilang(n: number): string {
  if (n <= 31 && ANGKA_TERBILANG[n]) return ANGKA_TERBILANG[n];
  if (n < 100) {
    const puluhan = Math.floor(n / 10);
    const sisa = n % 10;
    return `${ANGKA_TERBILANG[puluhan] || puluhan} Puluh ${sisa > 0 ? ANGKA_TERBILANG[sisa] : ""}`.trim();
  }
  return String(n);
}

export function tahunKeTerbilang(tahun: number): string {
  // e.g. 2026 -> "dua ribu dua puluh enam"
  const teksTahun: Record<number, string> = {
    2024: "dua ribu dua puluh empat",
    2025: "dua ribu dua puluh lima",
    2026: "dua ribu dua puluh enam",
    2027: "dua ribu dua puluh tujuh",
    2028: "dua ribu dua puluh delapan",
    2029: "dua ribu dua puluh sembilan",
    2030: "dua ribu tiga puluh",
  };
  return teksTahun[tahun] || `dua ribu ${angkaKeTerbilang(tahun % 100).toLowerCase()}`;
}

export function formatTanggalLengkapIndo(d: Date = new Date()) {
  const hari = NAMA_HARI[d.getDay()];
  const tglTerbilang = angkaKeTerbilang(d.getDate());
  const bulan = NAMA_BULAN_INDO[d.getMonth()];
  const tahunTerbilang = tahunKeTerbilang(d.getFullYear());

  return {
    hari,
    tglTerbilang,
    bulan,
    tahunTerbilang,
    fullStatement: `Pada hari ini ${hari}, tanggal ${tglTerbilang}, bulan ${bulan}, tahun ${tahunTerbilang}, kami yang bertandatangan di bawah ini :`,
  };
}

export function formatTanggalDokumen(d: Date = new Date()): string {
  // e.g. "4 Nov 2026"
  const tgl = d.getDate();
  const bln = NAMA_BULAN_EN_SHORT[d.getMonth()];
  const thn = d.getFullYear();
  return `${tgl} ${bln} ${thn}`;
}

export function formatPeriodeBulan(periode: string): { periodeFormatted: string; workCompletedDate: string } {
  // input e.g. "2025-08" or "2026-09"
  if (!periode || !periode.includes("-")) {
    return { periodeFormatted: periode || "-", workCompletedDate: "-" };
  }
  const [thnStr, blnStr] = periode.split("-");
  const thn = parseInt(thnStr, 10);
  const blnIndex = parseInt(blnStr, 10) - 1;

  const blnShort = NAMA_BULAN_EN_SHORT[blnIndex] || blnStr;
  const periodeFormatted = `${blnShort} ${thn}`;

  // Last day of month
  const lastDay = new Date(thn, blnIndex + 1, 0).getDate();
  const workCompletedDate = `${lastDay} ${blnShort} ${thn}`;

  return { periodeFormatted, workCompletedDate };
}

export function formatRupiahKoma(nilai: string | number): string {
  const num = typeof nilai === "string" ? parseFloat(nilai || "0") : nilai;
  return "Rp " + Math.round(num).toLocaleString("en-US");
}

export function formatHariTanggalIndo(d: Date = new Date()): string {
  const hari = NAMA_HARI[d.getDay()];
  const tgl = d.getDate();
  const bulan = NAMA_BULAN_INDO[d.getMonth()];
  const tahun = d.getFullYear();
  return `${hari} ${tgl} ${bulan} ${tahun}`;
}

export function formatTanggalSelesaiIndo(periode: string): string {
  if (!periode || !periode.includes("-")) return "-";
  const [thnStr, blnStr] = periode.split("-");
  const thn = parseInt(thnStr, 10);
  const blnIndex = parseInt(blnStr, 10) - 1;
  const lastDay = new Date(thn, blnIndex + 1, 0).getDate();
  const namaBulan = NAMA_BULAN_INDO[blnIndex] || blnStr;
  return `${lastDay}-${namaBulan}-${thn}`;
}

export function formatGrDate(d: Date = new Date()): string {
  const tgl = String(d.getDate()).padStart(2, "0");
  const bln = NAMA_BULAN_EN_SHORT[d.getMonth()] || "Oct";
  const thn = d.getFullYear();
  return `${tgl} ${bln} ${thn}`;
}

export function formatGrNominal(val: number | string): string {
  const num = typeof val === "string" ? parseFloat(val || "0") : val;
  return Math.round(num).toLocaleString("id-ID");
}

export function formatGrQty(val: number | string): string {
  const num = typeof val === "string" ? parseFloat(val || "0") : val;
  return num.toFixed(3).replace(".", ",");
}


