import Decimal from "decimal.js";
import { db } from "@/db";
import { pembayaran, pengajuan, pengajuanDetail, po, userXl } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { AgingBucket, selisihHari, tambahHari } from "./aging";
import { formatDefaultNomorInvoice } from "./idstar-mail-template";

export type ArInvoiceRow = {
  id: number;
  periode: string;
  status: string;
  nomorInvoice: string;
  hasOfficialInvoice: boolean;
  nomorPo: string;
  namaProyek: string;
  klien: string;
  namaUserXl: string;
  tanggalAcuan: string;
  tanggalJatuhTempo: string;
  umurHari: number;
  hariTerlambat: number;
  bucket: AgingBucket;
  planDpp: number;
  planTotal: number;
  actualInvoicedDpp: number;
  actualInvoicedTotal: number;
  collected: number;
  outstanding: number;
  tarifPpn: number;
};

export type AgingBucketStats = {
  bucket: AgingBucket;
  label: string;
  count: number;
  nominal: number;
  percentage: number;
};

export type PlanVsActualPeriodRow = {
  periode: string;
  submissionCount: number;
  invoicedCount: number;
  planDpp: number;
  planTotal: number;
  actualDpp: number;
  actualTotal: number;
  collected: number;
  varianceDpp: number;
  varianceTotal: number;
  achievementPct: number;
};

export type PlanVsActualClientRow = {
  klien: string;
  submissionCount: number;
  invoicedCount: number;
  planDpp: number;
  planTotal: number;
  actualDpp: number;
  actualTotal: number;
  collected: number;
  outstanding: number;
  varianceTotal: number;
  achievementPct: number;
};

export type DashboardArAnalytics = {
  tanggalHariIni: string;
  outstandingAr: {
    totalInvoiced: number;
    totalCollected: number;
    totalOutstanding: number;
    outstandingCount: number;
    totalOverdue: number;
    overdueCount: number;
    dueSoonNominal: number;
    dueSoonCount: number;
    collectionRatePct: number;
    rataRataUmur: number;
    topOutstanding: ArInvoiceRow[];
  };
  agingAr: {
    buckets: AgingBucketStats[];
    totalOutstanding: number;
  };
  planVsActual: {
    totalPlanDpp: number;
    totalPlanTotal: number;
    totalActualDpp: number;
    totalActualTotal: number;
    totalCollected: number;
    varianceDpp: number;
    varianceTotal: number;
    achievementPct: number;
    byPeriod: PlanVsActualPeriodRow[];
    byClient: PlanVsActualClientRow[];
    rows: ArInvoiceRow[];
  };
};

export async function getDashboardArAnalytics(topHari: number = 30): Promise<DashboardArAnalytics> {
  const tanggalHariIni = new Date().toISOString().split("T")[0];

  const [allPengajuan, allDetails, allPayments] = await Promise.all([
    db
      .select({
        id: pengajuan.id,
        periode: pengajuan.periode,
        status: pengajuan.status,
        nomorInvoice: pengajuan.nomorInvoice,
        tanggalSubmitInvoice: pengajuan.tanggalSubmitInvoice,
        tanggalApproveInvoice: pengajuan.tanggalApproveInvoice,
        nilaiGrDisetujui: pengajuan.nilaiGrDisetujui,
        tarifPpn: pengajuan.tarifPpn,
        nomorFakturPajak: pengajuan.nomorFakturPajak,
        tanggalFakturPajak: pengajuan.tanggalFakturPajak,
        penyesuaianSelisihGrMasuk: pengajuan.penyesuaianSelisihGrMasuk,
        nomorPo: po.nomorPo,
        namaProyek: po.namaProyek,
        klien: po.klien,
        namaUserXl: userXl.nama,
      })
      .from(pengajuan)
      .innerJoin(po, eq(pengajuan.poId, po.id))
      .innerJoin(userXl, eq(pengajuan.userXlId, userXl.id))
      .orderBy(desc(pengajuan.id)),
    db
      .select({
        pengajuanId: pengajuanDetail.pengajuanId,
        hasilHitung: pengajuanDetail.hasilHitung,
      })
      .from(pengajuanDetail),
    db
      .select({
        pengajuanId: pembayaran.pengajuanId,
        nominalDiterima: pembayaran.nominalDiterima,
        potonganPph23: pembayaran.potonganPph23,
        biayaAdminBank: pembayaran.biayaAdminBank,
      })
      .from(pembayaran)
      .where(eq(pembayaran.status, "diverifikasi")),
  ]);

  // Aggregate detail totals per pengajuan
  const detailTotals = new Map<number, Decimal>();
  for (const d of allDetails) {
    const prev = detailTotals.get(d.pengajuanId) || new Decimal(0);
    detailTotals.set(d.pengajuanId, prev.plus(new Decimal(d.hasilHitung || 0)));
  }

  // Aggregate verified payments per pengajuan
  const paymentTotals = new Map<number, Decimal>();
  for (const pay of allPayments) {
    const prev = paymentTotals.get(pay.pengajuanId) || new Decimal(0);
    const rowSum = new Decimal(pay.nominalDiterima || 0)
      .plus(new Decimal(pay.potonganPph23 || 0))
      .plus(new Decimal(pay.biayaAdminBank || 0));
    paymentTotals.set(pay.pengajuanId, prev.plus(rowSum));
  }

  const rows: ArInvoiceRow[] = allPengajuan.map((p) => {
    const detailDec = detailTotals.get(p.id) || new Decimal(0);
    const adjDec = new Decimal(p.penyesuaianSelisihGrMasuk || 0);
    const planDppDec = detailDec.plus(adjDec);
    const tarifPpnNum = p.tarifPpn ? new Decimal(p.tarifPpn).toNumber() : 11;
    const planPpnDec = planDppDec.times(tarifPpnNum).dividedBy(100).round();
    const planTotalDec = planDppDec.plus(planPpnDec);

    const hasOfficialInvoice = Boolean(
      p.nomorInvoice ||
        p.tanggalSubmitInvoice ||
        p.tanggalApproveInvoice ||
        p.nomorFakturPajak ||
        (p.nilaiGrDisetujui && new Decimal(p.nilaiGrDisetujui).greaterThan(0))
    );

    let actualDppDec = new Decimal(0);
    if (p.nilaiGrDisetujui && new Decimal(p.nilaiGrDisetujui).greaterThan(0)) {
      actualDppDec = new Decimal(p.nilaiGrDisetujui);
    } else if (hasOfficialInvoice) {
      actualDppDec = planDppDec;
    }

    const actualPpnDec = actualDppDec.times(tarifPpnNum).dividedBy(100).round();
    const actualTotalDec = actualDppDec.plus(actualPpnDec);

    const collectedDec = paymentTotals.get(p.id) || new Decimal(0);
    const outstandingDec = hasOfficialInvoice
      ? Decimal.max(0, actualTotalDec.minus(collectedDec))
      : new Decimal(0);

    let tanggalAcuan = p.tanggalSubmitInvoice || p.tanggalApproveInvoice || p.tanggalFakturPajak;
    if (!tanggalAcuan && p.periode && p.periode.includes("-")) {
      const [tahun, bulan] = p.periode.split("-").map(Number);
      const blnDepan = bulan === 12 ? 1 : bulan + 1;
      const thnDepan = bulan === 12 ? tahun + 1 : tahun;
      tanggalAcuan = `${thnDepan}-${String(blnDepan).padStart(2, "0")}-01`;
    }
    if (!tanggalAcuan) {
      tanggalAcuan = tanggalHariIni;
    }

    const tanggalJatuhTempo = tambahHari(tanggalAcuan, topHari);
    const umurHari = Math.max(0, selisihHari(tanggalAcuan, tanggalHariIni));
    const hariTerlambat = selisihHari(tanggalJatuhTempo, tanggalHariIni);

    let bucket: AgingBucket = "0-30";
    if (umurHari <= 30) bucket = "0-30";
    else if (umurHari <= 60) bucket = "31-60";
    else if (umurHari <= 90) bucket = "61-90";
    else bucket = ">90";

    return {
      id: p.id,
      periode: p.periode,
      status: p.status,
      nomorInvoice: p.nomorInvoice || formatDefaultNomorInvoice(p.id, p.periode),
      hasOfficialInvoice,
      nomorPo: p.nomorPo,
      namaProyek: p.namaProyek,
      klien: p.klien || "XL Axiata",
      namaUserXl: p.namaUserXl,
      tanggalAcuan,
      tanggalJatuhTempo,
      umurHari,
      hariTerlambat,
      bucket,
      planDpp: planDppDec.toNumber(),
      planTotal: planTotalDec.toNumber(),
      actualInvoicedDpp: actualDppDec.toNumber(),
      actualInvoicedTotal: actualTotalDec.toNumber(),
      collected: collectedDec.toNumber(),
      outstanding: outstandingDec.toNumber(),
      tarifPpn: tarifPpnNum,
    };
  });

  // 1. Outstanding AR & 2. Aging AR
  const invoicedRows = rows.filter((r) => r.hasOfficialInvoice);
  const outstandingRows = invoicedRows.filter((r) => r.outstanding > 0);

  let totalInvoicedDec = new Decimal(0);
  let totalCollectedDec = new Decimal(0);
  let totalOutstandingDec = new Decimal(0);
  let totalOverdueDec = new Decimal(0);
  let overdueCount = 0;
  let dueSoonDec = new Decimal(0);
  let dueSoonCount = 0;
  let sumUmur = 0;

  const bucketMap: Record<AgingBucket, { count: number; nominal: Decimal }> = {
    "0-30": { count: 0, nominal: new Decimal(0) },
    "31-60": { count: 0, nominal: new Decimal(0) },
    "61-90": { count: 0, nominal: new Decimal(0) },
    ">90": { count: 0, nominal: new Decimal(0) },
  };

  for (const r of invoicedRows) {
    totalInvoicedDec = totalInvoicedDec.plus(r.actualInvoicedTotal);
    totalCollectedDec = totalCollectedDec.plus(r.collected);
  }

  for (const r of outstandingRows) {
    const outDec = new Decimal(r.outstanding);
    totalOutstandingDec = totalOutstandingDec.plus(outDec);
    sumUmur += r.umurHari;

    bucketMap[r.bucket].count += 1;
    bucketMap[r.bucket].nominal = bucketMap[r.bucket].nominal.plus(outDec);

    if (r.hariTerlambat > 0) {
      overdueCount += 1;
      totalOverdueDec = totalOverdueDec.plus(outDec);
    } else if (r.hariTerlambat >= -7) {
      dueSoonCount += 1;
      dueSoonDec = dueSoonDec.plus(outDec);
    }
  }

  const totalOutNum = totalOutstandingDec.toNumber();
  const totalInvNum = totalInvoicedDec.toNumber();
  const totalColNum = totalCollectedDec.toNumber();

  const bucketLabels: Record<AgingBucket, string> = {
    "0-30": "0 - 30 Days (Current)",
    "31-60": "31 - 60 Days",
    "61-90": "61 - 90 Days",
    ">90": "> 90 Days (Critical)",
  };

  const agingBuckets: AgingBucketStats[] = (["0-30", "31-60", "61-90", ">90"] as AgingBucket[]).map(
    (b) => {
      const nom = bucketMap[b].nominal.toNumber();
      return {
        bucket: b,
        label: bucketLabels[b],
        count: bucketMap[b].count,
        nominal: nom,
        percentage: totalOutNum > 0 ? Math.round((nom / totalOutNum) * 1000) / 10 : 0,
      };
    }
  );

  // 3. Inv Plan vs Actual
  let totalPlanDppDec = new Decimal(0);
  let totalPlanTotalDec = new Decimal(0);
  let totalActualDppDec = new Decimal(0);
  let totalActualTotalDec = new Decimal(0);
  let totalPlanCollectedDec = new Decimal(0);

  const periodAgg = new Map<
    string,
    {
      submissionCount: number;
      invoicedCount: number;
      planDpp: Decimal;
      planTotal: Decimal;
      actualDpp: Decimal;
      actualTotal: Decimal;
      collected: Decimal;
    }
  >();

  const clientAgg = new Map<
    string,
    {
      submissionCount: number;
      invoicedCount: number;
      planDpp: Decimal;
      planTotal: Decimal;
      actualDpp: Decimal;
      actualTotal: Decimal;
      collected: Decimal;
      outstanding: Decimal;
    }
  >();

  for (const r of rows) {
    totalPlanDppDec = totalPlanDppDec.plus(r.planDpp);
    totalPlanTotalDec = totalPlanTotalDec.plus(r.planTotal);
    totalActualDppDec = totalActualDppDec.plus(r.actualInvoicedDpp);
    totalActualTotalDec = totalActualTotalDec.plus(r.actualInvoicedTotal);
    totalPlanCollectedDec = totalPlanCollectedDec.plus(r.collected);

    const pEntry = periodAgg.get(r.periode) || {
      submissionCount: 0,
      invoicedCount: 0,
      planDpp: new Decimal(0),
      planTotal: new Decimal(0),
      actualDpp: new Decimal(0),
      actualTotal: new Decimal(0),
      collected: new Decimal(0),
    };
    pEntry.submissionCount += 1;
    if (r.hasOfficialInvoice) pEntry.invoicedCount += 1;
    pEntry.planDpp = pEntry.planDpp.plus(r.planDpp);
    pEntry.planTotal = pEntry.planTotal.plus(r.planTotal);
    pEntry.actualDpp = pEntry.actualDpp.plus(r.actualInvoicedDpp);
    pEntry.actualTotal = pEntry.actualTotal.plus(r.actualInvoicedTotal);
    pEntry.collected = pEntry.collected.plus(r.collected);
    periodAgg.set(r.periode, pEntry);

    const cEntry = clientAgg.get(r.klien) || {
      submissionCount: 0,
      invoicedCount: 0,
      planDpp: new Decimal(0),
      planTotal: new Decimal(0),
      actualDpp: new Decimal(0),
      actualTotal: new Decimal(0),
      collected: new Decimal(0),
      outstanding: new Decimal(0),
    };
    cEntry.submissionCount += 1;
    if (r.hasOfficialInvoice) cEntry.invoicedCount += 1;
    cEntry.planDpp = cEntry.planDpp.plus(r.planDpp);
    cEntry.planTotal = cEntry.planTotal.plus(r.planTotal);
    cEntry.actualDpp = cEntry.actualDpp.plus(r.actualInvoicedDpp);
    cEntry.actualTotal = cEntry.actualTotal.plus(r.actualInvoicedTotal);
    cEntry.collected = cEntry.collected.plus(r.collected);
    cEntry.outstanding = cEntry.outstanding.plus(r.outstanding);
    clientAgg.set(r.klien, cEntry);
  }

  const byPeriod: PlanVsActualPeriodRow[] = Array.from(periodAgg.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([periode, v]) => {
      const pTot = v.planTotal.toNumber();
      const aTot = v.actualTotal.toNumber();
      const pDpp = v.planDpp.toNumber();
      const aDpp = v.actualDpp.toNumber();
      return {
        periode,
        submissionCount: v.submissionCount,
        invoicedCount: v.invoicedCount,
        planDpp: pDpp,
        planTotal: pTot,
        actualDpp: aDpp,
        actualTotal: aTot,
        collected: v.collected.toNumber(),
        varianceDpp: aDpp - pDpp,
        varianceTotal: aTot - pTot,
        achievementPct: pTot > 0 ? Math.round((aTot / pTot) * 1000) / 10 : 0,
      };
    });

  const byClient: PlanVsActualClientRow[] = Array.from(clientAgg.entries())
    .sort(([, a], [, b]) => b.planTotal.toNumber() - a.planTotal.toNumber())
    .map(([klien, v]) => {
      const pTot = v.planTotal.toNumber();
      const aTot = v.actualTotal.toNumber();
      return {
        klien,
        submissionCount: v.submissionCount,
        invoicedCount: v.invoicedCount,
        planDpp: v.planDpp.toNumber(),
        planTotal: pTot,
        actualDpp: v.actualDpp.toNumber(),
        actualTotal: aTot,
        collected: v.collected.toNumber(),
        outstanding: v.outstanding.toNumber(),
        varianceTotal: aTot - pTot,
        achievementPct: pTot > 0 ? Math.round((aTot / pTot) * 1000) / 10 : 0,
      };
    });

  const totalPlanDpp = totalPlanDppDec.toNumber();
  const totalPlanTotal = totalPlanTotalDec.toNumber();
  const totalActualDpp = totalActualDppDec.toNumber();
  const totalActualTotal = totalActualTotalDec.toNumber();

  return {
    tanggalHariIni,
    outstandingAr: {
      totalInvoiced: totalInvNum,
      totalCollected: totalColNum,
      totalOutstanding: totalOutNum,
      outstandingCount: outstandingRows.length,
      totalOverdue: totalOverdueDec.toNumber(),
      overdueCount,
      dueSoonNominal: dueSoonDec.toNumber(),
      dueSoonCount,
      collectionRatePct: totalInvNum > 0 ? Math.round((totalColNum / totalInvNum) * 1000) / 10 : 0,
      rataRataUmur: outstandingRows.length > 0 ? Math.round(sumUmur / outstandingRows.length) : 0,
      topOutstanding: [...outstandingRows]
        .sort((a, b) => b.hariTerlambat - a.hariTerlambat || b.outstanding - a.outstanding)
        .slice(0, 6),
    },
    agingAr: {
      buckets: agingBuckets,
      totalOutstanding: totalOutNum,
    },
    planVsActual: {
      totalPlanDpp,
      totalPlanTotal,
      totalActualDpp,
      totalActualTotal,
      totalCollected: totalPlanCollectedDec.toNumber(),
      varianceDpp: totalActualDpp - totalPlanDpp,
      varianceTotal: totalActualTotal - totalPlanTotal,
      achievementPct: totalPlanTotal > 0 ? Math.round((totalActualTotal / totalPlanTotal) * 1000) / 10 : 0,
      byPeriod,
      byClient,
      rows,
    },
  };
}
