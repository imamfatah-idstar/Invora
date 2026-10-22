import { wajibRole } from "@/lib/require-role";
import { db } from "@/db";
import { pengajuan, po, userXl, pengajuanDetail, pembayaran } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import Topbar from "@/components/topbar";
import ForecastView from "./forecast-view";
import Decimal from "decimal.js";

export const metadata = {
  title: "Estimasi Jadwal Cair (Cash-in Forecasting) | INVORA",
  description: "Proyeksi arus kas masuk, jadwal pencairan invoice, dan simulasi skenario likuiditas",
};

export default async function HalamanCashInForecast() {
  const user = await wajibRole(["petugas", "checker", "admin"]);

  // Ambil semua pengajuan aktif (mulai dari draf, diajukan, sampai terbit invoice)
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
    .orderBy(desc(pengajuan.id));

  // Ambil total hitung detail per pengajuan untuk fallback jika nilaiGrDisetujui belum ada
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

  // Ambil pembayaran yang sudah diverifikasi (MVP 5)
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
        paymentsTotal[pay.pengajuanId] +=
          (parseFloat(pay.nominalDiterima || "0") || 0) +
          (parseFloat(pay.potonganPph23 || "0") || 0) +
          (parseFloat(pay.biayaAdminBank || "0") || 0);
      }
    }
  }

  const rawItems = daftarPengajuan.map((p) => ({
    id: p.id,
    periode: p.periode,
    status: p.status,
    nomorInvoice: p.nomorInvoice,
    tanggalSubmitInvoice: p.tanggalSubmitInvoice,
    tanggalApproveInvoice: p.tanggalApproveInvoice,
    nilaiGrDisetujui: p.nilaiGrDisetujui,
    totalHitungDetail: detailTotals[p.id] || 0,
    tarifPpn: p.tarifPpn,
    nomorFakturPajak: p.nomorFakturPajak,
    tanggalFakturPajak: p.tanggalFakturPajak,
    nomorPo: p.nomorPo,
    namaProyek: p.namaProyek,
    klien: p.klien,
    namaUserXl: p.namaUserXl,
    terbayar: paymentsTotal[p.id] || 0,
  }));

  return (
    <>
      <Topbar nama={user.nama} role={user.role} />
      <main className="page">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <a href="/dashboard" className="back-link" style={{ margin: 0 }}>
            &larr; Dashboard
          </a>
          <div style={{ display: "flex", gap: 10 }}>
            <a
              href="/dashboard/outstanding"
              className="btn"
              style={{ padding: "6px 14px", fontSize: 13, background: "#ffffff", border: "1px solid #cbd5e1" }}
            >
              💰 Buka Aging Schedule
            </a>
            <a
              href="/summary-po"
              className="btn"
              style={{ padding: "6px 14px", fontSize: 13, background: "#ffffff", border: "1px solid #cbd5e1" }}
            >
              📊 Summary PO
            </a>
          </div>
        </div>

        <div style={{ marginBottom: 20 }}>
          <h1 style={{ marginBottom: 4 }}>Estimasi Jadwal Cair Otomatis (Cash-in Forecasting)</h1>
          <p className="subtitle" style={{ margin: 0 }}>
            Proyeksi penerimaan kas masuk (*cash inflow*) berdasarkan Term of Payment (TOP), siklus persetujuan klien, dan penyesuaian hari kerja perbankan.
          </p>
        </div>

        <ForecastView rawItems={rawItems} />
      </main>
    </>
  );
}
