import { wajibRole } from "@/lib/require-role";
import { db } from "@/db";
import { pengajuan, po, userXl, pengajuanDetail, pembayaran } from "@/db/schema";
import { eq, or, isNotNull, desc } from "drizzle-orm";
import Topbar from "@/components/topbar";
import OutstandingView from "./outstanding-view";
import Decimal from "decimal.js";

export const metadata = {
  title: "Monitoring Outstanding & Aging Schedule | INVORA",
  description: "Dashboard monitoring piutang invoice dan jadwal jatuh tempo klien",
};

export default async function HalamanOutstanding() {
  const user = await wajibRole(["petugas", "checker", "admin"]);

  // Ambil semua pengajuan yang sudah masuk tahap invoicing
  // (punya nomor invoice ATAU tanggal submit invoice ATAU tanggal approve invoice)
  const daftarPengajuan = await db
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
      nomorPo: po.nomorPo,
      namaProyek: po.namaProyek,
      klien: po.klien,
      namaUserXl: userXl.nama,
    })
    .from(pengajuan)
    .innerJoin(po, eq(pengajuan.poId, po.id))
    .innerJoin(userXl, eq(pengajuan.userXlId, userXl.id))
    .where(
      or(
        isNotNull(pengajuan.nomorInvoice),
        isNotNull(pengajuan.tanggalSubmitInvoice),
        isNotNull(pengajuan.tanggalApproveInvoice),
        isNotNull(pengajuan.nomorFakturPajak)
      )
    )
    .orderBy(desc(pengajuan.id));

  // Ambil total hitung detail untuk pengajuan yang nilaiGrDisetujui belum ada
  const pengajuanIds = daftarPengajuan.map((p) => p.id);
  const detailTotals: Record<number, number> = {};

  if (pengajuanIds.length > 0) {
    const details = await db
      .select({
        pengajuanId: pengajuanDetail.pengajuanId,
        hasilHitung: pengajuanDetail.hasilHitung,
      })
      .from(pengajuanDetail);

    for (const d of details) {
      if (!detailTotals[d.pengajuanId]) {
        detailTotals[d.pengajuanId] = 0;
      }
      try {
        detailTotals[d.pengajuanId] = new Decimal(detailTotals[d.pengajuanId])
          .plus(new Decimal(d.hasilHitung))
          .toNumber();
      } catch {
        detailTotals[d.pengajuanId] += parseFloat(d.hasilHitung) || 0;
      }
    }
  }

  // Ambil total pelunasan yang sudah diverifikasi (MVP 5)
  const paymentsTotal: Record<number, number> = {};
  if (pengajuanIds.length > 0) {
    const payments = await db
      .select({
        pengajuanId: pembayaran.pengajuanId,
        nominalDiterima: pembayaran.nominalDiterima,
        potonganPph23: pembayaran.potonganPph23,
        biayaAdminBank: pembayaran.biayaAdminBank,
        status: pembayaran.status,
      })
      .from(pembayaran)
      .where(eq(pembayaran.status, "diverifikasi"));

    for (const pay of payments) {
      if (!paymentsTotal[pay.pengajuanId]) {
        paymentsTotal[pay.pengajuanId] = 0;
      }
      try {
        const barisTotal = new Decimal(pay.nominalDiterima || 0)
          .plus(new Decimal(pay.potonganPph23 || 0))
          .plus(new Decimal(pay.biayaAdminBank || 0));
        paymentsTotal[pay.pengajuanId] = new Decimal(paymentsTotal[pay.pengajuanId])
          .plus(barisTotal)
          .toNumber();
      } catch {
        paymentsTotal[pay.pengajuanId] += parseFloat(pay.nominalDiterima) || 0;
      }
    }
  }

  const dataOlahan = daftarPengajuan.map((p) => {
    return {
      id: p.id,
      nomorInvoice: p.nomorInvoice || `DRAFT-INV-${p.id}`,
      nomorFakturPajak: p.nomorFakturPajak,
      tanggalFakturPajak: p.tanggalFakturPajak,
      nomorPo: p.nomorPo,
      namaProyek: p.namaProyek,
      klien: p.klien || "XL Axiata",
      periode: p.periode,
      namaUserXl: p.namaUserXl,
      tanggalSubmitInvoice: p.tanggalSubmitInvoice,
      tanggalApproveInvoice: p.tanggalApproveInvoice,
      nilaiGrDisetujui: p.nilaiGrDisetujui,
      totalHitungDetail: detailTotals[p.id] || 0,
      tarifPpn: p.tarifPpn || "11.00",
      terbayar: paymentsTotal[p.id] || 0,
    };
  });

  const tanggalHariIni = new Date().toISOString().split("T")[0];

  return (
    <>
      <Topbar nama={user.nama} role={user.role} />
      <main className="page" style={{ maxWidth: 1300, margin: "0 auto", padding: "24px 20px" }}>
        <a href="/dashboard" className="back-link">
          &larr; Dashboard
        </a>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
          <div>
            <h1 style={{ margin: "4px 0 6px", fontSize: 24, fontWeight: 800 }}>
              Monitoring Outstanding Invoice &amp; Aging Schedule
            </h1>
            <p className="subtitle" style={{ margin: 0, fontSize: 14 }}>
              Pantau status piutang berjalan, umur penagihan, jadwal jatuh tempo klien, dan peringatan dini keterlambatan pembayaran.
            </p>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <a href="/dashboard/forecast" className="btn btn-primary" style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span>📈</span>
              <span>Cash-in Forecasting</span>
            </a>
            <a href="/pengajuan" className="btn">
              📋 Pengajuan
            </a>
            <a href="/summary-po" className="btn">
              📊 Summary PO
            </a>
          </div>
        </div>

        <OutstandingView initialData={dataOlahan} tanggalHariIni={tanggalHariIni} />
      </main>
    </>
  );
}
