import Decimal from "decimal.js";

export type AgingBucket = "0-30" | "31-60" | "61-90" | ">90";

export type InvoiceOutstandingItem = {
  id: number;
  nomorInvoice: string;
  nomorFakturPajak: string | null;
  tanggalFakturPajak: string | null;
  nomorPo: string;
  namaProyek: string;
  klien: string;
  periode: string;
  namaUserXl: string;
  tanggalSubmitInvoice: string | null;
  tanggalApproveInvoice: string | null;
  tanggalAcuan: string;
  dpp: number;
  tarifPpn: number;
  ppn: number;
  totalInvoice: number;
  terbayar: number;
  sisaPiutang: number;
  statusBayar: "unpaid" | "partial" | "paid";
  tanggalJatuhTempo: string;
  topHari: number;
  umurHari: number;
  hariTerlambat: number;
  bucket: AgingBucket;
  statusAging: "Lancar" | "Overdue Ringan" | "Overdue Sedang" | "Overdue Kritis" | "Lunas";
};

export type AgingSummary = {
  totalInvoiceCount: number;
  totalPiutang: number;
  totalOverdue: number;
  overdueCount: number;
  dueSoonCount: number; // jatuh tempo dalam 7 hari ke depan
  dueSoonNominal: number;
  rataRataUmur: number;
  buckets: {
    "0-30": { count: number; nominal: number; percentage: number };
    "31-60": { count: number; nominal: number; percentage: number };
    "61-90": { count: number; nominal: number; percentage: number };
    ">90": { count: number; nominal: number; percentage: number };
  };
};

/**
 * Menambahkan hari ke tanggal format YYYY-MM-DD
 */
export function tambahHari(tanggalIso: string, hari: number): string {
  const d = new Date(tanggalIso + "T00:00:00Z");
  d.setDate(d.getDate() + hari);
  return d.toISOString().split("T")[0];
}

/**
 * Menghitung selisih hari antara dua tanggal (B - A)
 */
export function selisihHari(dariIso: string, sampaiIso: string): number {
  const a = new Date(dariIso + "T00:00:00Z").getTime();
  const b = new Date(sampaiIso + "T00:00:00Z").getTime();
  return Math.round((b - a) / (1000 * 60 * 60 * 24));
}

/**
 * Format mata uang Rupiah
 */
export function formatRupiah(nilai: number | string): string {
  const n = typeof nilai === "string" ? parseFloat(nilai) || 0 : nilai;
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}

/**
 * Menghitung metrik aging piutang berdasarkan TOP (Term of Payment)
 */
export function hitungAgingItem(
  raw: {
    id: number;
    nomorInvoice: string;
    nomorFakturPajak?: string | null;
    tanggalFakturPajak?: string | null;
    nomorPo: string;
    namaProyek: string;
    klien?: string | null;
    periode: string;
    namaUserXl?: string | null;
    tanggalSubmitInvoice?: string | null;
    tanggalApproveInvoice?: string | null;
    nilaiGrDisetujui?: string | null;
    totalHitungDetail?: number;
    tarifPpn?: string | null;
    terbayar?: number;
  },
  topHari: number = 30,
  tanggalSekarangIso?: string
): InvoiceOutstandingItem {
  // Tanggal acuan perhitungan aging:
  // 1. Prioritas tanggalSubmitInvoice
  // 2. Atau tanggalApproveInvoice
  // 3. Atau tanggalFakturPajak
  // 4. Fallback ke awal bulan berikutnya dari periode
  let tanggalAcuan = raw.tanggalSubmitInvoice || raw.tanggalApproveInvoice || raw.tanggalFakturPajak;
  if (!tanggalAcuan) {
    const [tahun, bulan] = raw.periode.split("-").map(Number);
    const blnDepan = bulan === 12 ? 1 : bulan + 1;
    const thnDepan = bulan === 12 ? tahun + 1 : tahun;
    tanggalAcuan = `${thnDepan}-${String(blnDepan).padStart(2, "0")}-01`;
  }

  const hariIni = tanggalSekarangIso || new Date().toISOString().split("T")[0];
  const tanggalJatuhTempo = tambahHari(tanggalAcuan, topHari);
  const umurHari = Math.max(0, selisihHari(tanggalAcuan, hariIni));
  const hariTerlambat = selisihHari(tanggalJatuhTempo, hariIni);

  // Perhitungan DPP & PPN
  const dpp = raw.nilaiGrDisetujui
    ? new Decimal(raw.nilaiGrDisetujui).toNumber()
    : (raw.totalHitungDetail || 0);

  const tarifPpn = raw.tarifPpn ? new Decimal(raw.tarifPpn).toNumber() : 11;
  const ppn = new Decimal(dpp).times(tarifPpn).dividedBy(100).toDecimalPlaces(2).toNumber();
  const totalInvoice = new Decimal(dpp).plus(ppn).toNumber();
  const terbayar = raw.terbayar || 0;
  const sisaPiutang = Math.max(0, new Decimal(totalInvoice).minus(terbayar).toNumber());

  let bucket: AgingBucket = "0-30";
  if (umurHari <= 30) {
    bucket = "0-30";
  } else if (umurHari <= 60) {
    bucket = "31-60";
  } else if (umurHari <= 90) {
    bucket = "61-90";
  } else {
    bucket = ">90";
  }

  let statusAging: InvoiceOutstandingItem["statusAging"] = "Lancar";
  if (sisaPiutang <= 0) {
    statusAging = "Lunas";
  } else if (hariTerlambat <= 0) {
    statusAging = "Lancar";
  } else if (hariTerlambat <= 30) {
    statusAging = "Overdue Ringan";
  } else if (hariTerlambat <= 60) {
    statusAging = "Overdue Sedang";
  } else {
    statusAging = "Overdue Kritis";
  }

  const statusBayar: "unpaid" | "partial" | "paid" =
    sisaPiutang <= 0 ? "paid" : terbayar > 0 ? "partial" : "unpaid";

  return {
    id: raw.id,
    nomorInvoice: raw.nomorInvoice,
    nomorFakturPajak: raw.nomorFakturPajak || null,
    tanggalFakturPajak: raw.tanggalFakturPajak || null,
    nomorPo: raw.nomorPo,
    namaProyek: raw.namaProyek,
    klien: raw.klien || "XL Axiata (Default)",
    periode: raw.periode,
    namaUserXl: raw.namaUserXl || "-",
    tanggalSubmitInvoice: raw.tanggalSubmitInvoice || null,
    tanggalApproveInvoice: raw.tanggalApproveInvoice || null,
    tanggalAcuan,
    dpp,
    tarifPpn,
    ppn,
    totalInvoice,
    terbayar,
    sisaPiutang,
    statusBayar,
    tanggalJatuhTempo,
    topHari,
    umurHari,
    hariTerlambat,
    bucket,
    statusAging,
  };
}

/**
 * Menghitung ringkasan statistik Aging Schedule
 */
export function rekapAgingSummary(items: InvoiceOutstandingItem[]): AgingSummary {
  let totalPiutang = new Decimal(0);
  let totalOverdue = new Decimal(0);
  let overdueCount = 0;
  let dueSoonCount = 0;
  let dueSoonNominal = new Decimal(0);
  let totalUmur = 0;

  const buckets = {
    "0-30": { count: 0, nominal: new Decimal(0), percentage: 0 },
    "31-60": { count: 0, nominal: new Decimal(0), percentage: 0 },
    "61-90": { count: 0, nominal: new Decimal(0), percentage: 0 },
    ">90": { count: 0, nominal: new Decimal(0), percentage: 0 },
  };

  const outstandingItems = items.filter((i) => i.statusBayar !== "paid");

  for (const item of outstandingItems) {
    totalPiutang = totalPiutang.plus(item.sisaPiutang);
    totalUmur += item.umurHari;

    buckets[item.bucket].count += 1;
    buckets[item.bucket].nominal = buckets[item.bucket].nominal.plus(item.sisaPiutang);

    if (item.hariTerlambat > 0) {
      overdueCount += 1;
      totalOverdue = totalOverdue.plus(item.sisaPiutang);
    } else if (item.hariTerlambat >= -7) {
      // Jatuh tempo dalam 7 hari
      dueSoonCount += 1;
      dueSoonNominal = dueSoonNominal.plus(item.sisaPiutang);
    }
  }

  const totalPiutangNum = totalPiutang.toNumber();
  const rataRataUmur =
    outstandingItems.length > 0 ? Math.round(totalUmur / outstandingItems.length) : 0;

  // Hitung persentase
  const finalBuckets = {
    "0-30": {
      count: buckets["0-30"].count,
      nominal: buckets["0-30"].nominal.toNumber(),
      percentage: totalPiutangNum > 0 ? Math.round((buckets["0-30"].nominal.toNumber() / totalPiutangNum) * 100) : 0,
    },
    "31-60": {
      count: buckets["31-60"].count,
      nominal: buckets["31-60"].nominal.toNumber(),
      percentage: totalPiutangNum > 0 ? Math.round((buckets["31-60"].nominal.toNumber() / totalPiutangNum) * 100) : 0,
    },
    "61-90": {
      count: buckets["61-90"].count,
      nominal: buckets["61-90"].nominal.toNumber(),
      percentage: totalPiutangNum > 0 ? Math.round((buckets["61-90"].nominal.toNumber() / totalPiutangNum) * 100) : 0,
    },
    ">90": {
      count: buckets[">90"].count,
      nominal: buckets[">90"].nominal.toNumber(),
      percentage: totalPiutangNum > 0 ? Math.round((buckets[">90"].nominal.toNumber() / totalPiutangNum) * 100) : 0,
    },
  };

  return {
    totalInvoiceCount: outstandingItems.length,
    totalPiutang: totalPiutangNum,
    totalOverdue: totalOverdue.toNumber(),
    overdueCount,
    dueSoonCount,
    dueSoonNominal: dueSoonNominal.toNumber(),
    rataRataUmur,
    buckets: finalBuckets,
  };
}
