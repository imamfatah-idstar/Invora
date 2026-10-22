import Decimal from "decimal.js";
import { formatRupiah, selisihHari, tambahHari } from "./aging";

export type ForecastConfidence = "tinggi" | "sedang" | "proyeksi";

export type ForecastTimeframe =
  | "overdue"
  | "minggu_1"
  | "minggu_2"
  | "bulan_ini"
  | "bulan_depan"
  | "mendatang";

export type CashInForecastItem = {
  id: number;
  nomorRef: string; // Nomor Invoice atau Nomor Pengajuan
  nomorInvoice: string | null;
  nomorFakturPajak: string | null;
  tanggalFakturPajak: string | null;
  nomorPo: string;
  namaProyek: string;
  klien: string;
  periode: string;
  namaUserXl: string;
  statusPengajuan: string;
  tanggalAcuan: string;
  dpp: number;
  tarifPpn: number;
  ppn: number;
  grossTotal: number;
  estimasiPph23: number; // 2% dari DPP
  netEstimasiKasMasuk: number; // grossTotal - estimasiPph23
  terbayar: number;
  sisaKasMasuk: number; // netEstimasiKasMasuk - terbayar
  tanggalEstimasiCair: string;
  topHari: number;
  bufferHari: number;
  hariMenujuCair: number; // selisih hari dari hari ini ke tanggal estimasi cair
  confidence: ForecastConfidence;
  timeframe: ForecastTimeframe;
  keteranganConfidence: string;
};

export type ForecastSummary = {
  totalItemCount: number;
  totalNetKasMasuk: number;
  totalImmediateInflow: number; // 7 hari ke depan
  totalMingguDepan: number; // 8 - 14 hari
  totalBulanIni: number;
  totalBulanDepan: number;
  totalOverdue: number;
  countOverdue: number;
  countImmediate: number;
  confidenceBreakdown: {
    tinggi: { count: number; nominal: number; persentase: number };
    sedang: { count: number; nominal: number; persentase: number };
    proyeksi: { count: number; nominal: number; persentase: number };
  };
  klienBreakdown: Array<{
    klien: string;
    count: number;
    nominal: number;
  }>;
};

/**
 * Menyesuaikan tanggal jika jatuh pada akhir pekan (Sabtu -> Senin, Minggu -> Senin)
 */
export function sesuaikanHariKerjaBank(tanggalIso: string): string {
  const d = new Date(tanggalIso + "T00:00:00Z");
  const day = d.getUTCDay(); // 0 = Minggu, 6 = Sabtu
  if (day === 6) {
    // Sabtu -> tambah 2 hari ke Senin
    d.setUTCDate(d.getUTCDate() + 2);
  } else if (day === 0) {
    // Minggu -> tambah 1 hari ke Senin
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return d.toISOString().split("T")[0];
}

/**
 * Menghitung forecast item per pengajuan
 */
export function hitungForecastItem(
  raw: {
    id: number;
    periode: string;
    status: string;
    nomorInvoice?: string | null;
    tanggalSubmitInvoice?: string | null;
    tanggalApproveInvoice?: string | null;
    nilaiGrDisetujui?: string | null;
    totalHitungDetail?: number;
    tarifPpn?: string | null;
    nomorFakturPajak?: string | null;
    tanggalFakturPajak?: string | null;
    nomorPo: string;
    namaProyek: string;
    klien?: string | null;
    namaUserXl?: string | null;
    terbayar?: number;
  },
  topHari: number = 30,
  bufferHari: number = 0,
  hariIniIso?: string
): CashInForecastItem {
  const hariIni = hariIniIso || new Date().toISOString().split("T")[0];

  // 1. Tanggal Acuan
  let tanggalAcuan = raw.tanggalSubmitInvoice || raw.tanggalApproveInvoice || raw.tanggalFakturPajak;
  let confidence: ForecastConfidence = "proyeksi";
  let keteranganConfidence = "Draf / Menunggu approval GR dari klien";

  if (raw.nomorInvoice && raw.nomorFakturPajak) {
    confidence = "tinggi";
    keteranganConfidence = "Invoice & Faktur Pajak resmi terbit (Tingkat kepastian >90%)";
  } else if (raw.nilaiGrDisetujui || raw.nomorInvoice) {
    confidence = "sedang";
    keteranganConfidence = "GR Disetujui / Invoice dalam proses administrasi (Tingkat kepastian ~75%)";
  }

  if (!tanggalAcuan) {
    // Proyeksi: Akhir bulan periode + 5 hari proses
    const [tahun, bulan] = raw.periode.split("-").map(Number);
    const akhirBulan = new Date(Date.UTC(tahun, bulan, 0)).getUTCDate();
    tanggalAcuan = `${tahun}-${String(bulan).padStart(2, "0")}-${String(akhirBulan).padStart(2, "0")}`;
  }

  // 2. Tanggal Estimasi Cair (Base + TOP + Buffer Keterlambatan Bank)
  const totalHariOffset = topHari + bufferHari;
  const tanggalTentatif = tambahHari(tanggalAcuan, totalHariOffset);
  const tanggalEstimasiCair = sesuaikanHariKerjaBank(tanggalTentatif);

  // 3. Kalkulasi Finansial
  const dpp = raw.nilaiGrDisetujui
    ? new Decimal(raw.nilaiGrDisetujui).toNumber()
    : raw.totalHitungDetail || 0;

  const tarifPpn = raw.tarifPpn ? new Decimal(raw.tarifPpn).toNumber() : 11;
  const ppn = new Decimal(dpp).times(tarifPpn).dividedBy(100).toDecimalPlaces(2).toNumber();
  const grossTotal = new Decimal(dpp).plus(ppn).toNumber();

  // PPh 23: 2% dari DPP
  const estimasiPph23 = new Decimal(dpp).times(0.02).toDecimalPlaces(2).toNumber();
  const netEstimasiKasMasuk = Math.max(0, new Decimal(grossTotal).minus(estimasiPph23).toNumber());

  const terbayar = raw.terbayar || 0;
  const sisaKasMasuk = Math.max(0, new Decimal(netEstimasiKasMasuk).minus(terbayar).toNumber());

  // 4. Timeframe Classification
  const hariMenujuCair = selisihHari(hariIni, tanggalEstimasiCair);
  let timeframe: ForecastTimeframe = "mendatang";

  const [thnHariIni, blnHariIni] = hariIni.split("-").map(Number);
  const [thnCair, blnCair] = tanggalEstimasiCair.split("-").map(Number);

  if (sisaKasMasuk <= 0) {
    timeframe = "mendatang";
  } else if (hariMenujuCair < 0) {
    timeframe = "overdue";
  } else if (hariMenujuCair <= 7) {
    timeframe = "minggu_1";
  } else if (hariMenujuCair <= 14) {
    timeframe = "minggu_2";
  } else if (thnHariIni === thnCair && blnHariIni === blnCair) {
    timeframe = "bulan_ini";
  } else {
    // Cek apakah bulan depan
    const selisihBulan = (thnCair - thnHariIni) * 12 + (blnCair - blnHariIni);
    if (selisihBulan === 1) {
      timeframe = "bulan_depan";
    } else {
      timeframe = "mendatang";
    }
  }

  const nomorRef = raw.nomorInvoice || `DRAF-INV-${raw.id} (${raw.periode})`;

  return {
    id: raw.id,
    nomorRef,
    nomorInvoice: raw.nomorInvoice || null,
    nomorFakturPajak: raw.nomorFakturPajak || null,
    tanggalFakturPajak: raw.tanggalFakturPajak || null,
    nomorPo: raw.nomorPo,
    namaProyek: raw.namaProyek,
    klien: raw.klien || "XL Axiata (Default)",
    periode: raw.periode,
    namaUserXl: raw.namaUserXl || "-",
    statusPengajuan: raw.status,
    tanggalAcuan,
    dpp,
    tarifPpn,
    ppn,
    grossTotal,
    estimasiPph23,
    netEstimasiKasMasuk,
    terbayar,
    sisaKasMasuk,
    tanggalEstimasiCair,
    topHari,
    bufferHari,
    hariMenujuCair,
    confidence,
    timeframe,
    keteranganConfidence,
  };
}

/**
 * Rekapitulasi agregat ringkasan Cash-in Forecasting
 */
export function rekapForecastSummary(
  items: CashInForecastItem[],
  hariIniIso?: string
): ForecastSummary {
  const hariIni = hariIniIso || new Date().toISOString().split("T")[0];
  const [thnHariIni, blnHariIni] = hariIni.split("-").map(Number);

  let totalNetKasMasuk = new Decimal(0);
  let totalImmediateInflow = new Decimal(0);
  let totalMingguDepan = new Decimal(0);
  let totalBulanIni = new Decimal(0);
  let totalBulanDepan = new Decimal(0);
  let totalOverdue = new Decimal(0);
  let countOverdue = 0;
  let countImmediate = 0;

  const confMap = {
    tinggi: { count: 0, nominal: new Decimal(0) },
    sedang: { count: 0, nominal: new Decimal(0) },
    proyeksi: { count: 0, nominal: new Decimal(0) },
  };

  const klienMap: Record<string, { count: number; nominal: Decimal }> = {};

  const activeItems = items.filter((i) => i.sisaKasMasuk > 0);

  for (const item of activeItems) {
    const sisa = new Decimal(item.sisaKasMasuk);
    totalNetKasMasuk = totalNetKasMasuk.plus(sisa);

    // Confidence
    confMap[item.confidence].count += 1;
    confMap[item.confidence].nominal = confMap[item.confidence].nominal.plus(sisa);

    // Klien Breakdown
    if (!klienMap[item.klien]) {
      klienMap[item.klien] = { count: 0, nominal: new Decimal(0) };
    }
    klienMap[item.klien].count += 1;
    klienMap[item.klien].nominal = klienMap[item.klien].nominal.plus(sisa);

    // Timeframe
    if (item.hariMenujuCair < 0) {
      countOverdue += 1;
      totalOverdue = totalOverdue.plus(sisa);
    } else {
      if (item.hariMenujuCair <= 7) {
        countImmediate += 1;
        totalImmediateInflow = totalImmediateInflow.plus(sisa);
      } else if (item.hariMenujuCair <= 14) {
        totalMingguDepan = totalMingguDepan.plus(sisa);
      }

      const [thnCair, blnCair] = item.tanggalEstimasiCair.split("-").map(Number);
      if (thnHariIni === thnCair && blnHariIni === blnCair) {
        totalBulanIni = totalBulanIni.plus(sisa);
      } else {
        const selisihBulan = (thnCair - thnHariIni) * 12 + (blnCair - blnHariIni);
        if (selisihBulan === 1) {
          totalBulanDepan = totalBulanDepan.plus(sisa);
        }
      }
    }
  }

  const grandTotal = totalNetKasMasuk.toNumber();

  const klienList = Object.entries(klienMap)
    .map(([klien, val]) => ({
      klien,
      count: val.count,
      nominal: val.nominal.toNumber(),
    }))
    .sort((a, b) => b.nominal - a.nominal);

  return {
    totalItemCount: activeItems.length,
    totalNetKasMasuk: grandTotal,
    totalImmediateInflow: totalImmediateInflow.toNumber(),
    totalMingguDepan: totalMingguDepan.toNumber(),
    totalBulanIni: totalBulanIni.toNumber(),
    totalBulanDepan: totalBulanDepan.toNumber(),
    totalOverdue: totalOverdue.toNumber(),
    countOverdue,
    countImmediate,
    confidenceBreakdown: {
      tinggi: {
        count: confMap.tinggi.count,
        nominal: confMap.tinggi.nominal.toNumber(),
        persentase: grandTotal > 0 ? Math.round((confMap.tinggi.nominal.toNumber() / grandTotal) * 100) : 0,
      },
      sedang: {
        count: confMap.sedang.count,
        nominal: confMap.sedang.nominal.toNumber(),
        persentase: grandTotal > 0 ? Math.round((confMap.sedang.nominal.toNumber() / grandTotal) * 100) : 0,
      },
      proyeksi: {
        count: confMap.proyeksi.count,
        nominal: confMap.proyeksi.nominal.toNumber(),
        persentase: grandTotal > 0 ? Math.round((confMap.proyeksi.nominal.toNumber() / grandTotal) * 100) : 0,
      },
    },
    klienBreakdown: klienList,
  };
}
