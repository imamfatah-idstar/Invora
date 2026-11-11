import { db } from "@/db";
import { pengajuan, userXl, po } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { wajibRole } from "@/lib/require-role";
import Topbar from "@/components/topbar";
import AnalisaDurasiClient, { BarisDurasi } from "./analisa-durasi-client";

function hariAntara(dariISO: string, sampaiISO: string) {
  const dari = new Date(dariISO + "T00:00:00Z").getTime();
  const sampai = new Date(sampaiISO + "T00:00:00Z").getTime();
  const selisih = Math.round((sampai - dari) / 86400000);
  return selisih >= 0 ? selisih : 0;
}

export default async function AnalisaDurasi() {
  const userLogin = await wajibRole(["petugas", "checker"]);

  const hariIniISO = new Date().toISOString().slice(0, 10);

  const rawRows = await db
    .select({
      id: pengajuan.id,
      periode: pengajuan.periode,
      status: pengajuan.status,
      nomorInvoice: pengajuan.nomorInvoice,
      nomorPo: po.nomorPo,
      namaProyek: po.namaProyek,
      klien: po.klien,
      namaUserXl: userXl.nama,
      tanggalSubmitCac: pengajuan.tanggalSubmitCac,
      tanggalCacApproved: pengajuan.tanggalCacApproved,
      tanggalRequestGr: pengajuan.tanggalRequestGr,
      tanggalGrDisetujui: pengajuan.tanggalGrDisetujui,
      tanggalSubmitInvoice: pengajuan.tanggalSubmitInvoice,
      tanggalApproveInvoice: pengajuan.tanggalApproveInvoice,
    })
    .from(pengajuan)
    .innerJoin(po, eq(pengajuan.poId, po.id))
    .innerJoin(userXl, eq(pengajuan.userXlId, userXl.id))
    .orderBy(desc(pengajuan.id));

  const daftar: BarisDurasi[] = rawRows.map((r) => {
    // 1. Durasi CAC ke GR / CAC Approval
    const titikAwalCac = r.tanggalSubmitCac;
    const titikSelesaiGr = r.tanggalGrDisetujui || r.tanggalCacApproved;
    const hariCacKeGr = titikAwalCac && titikSelesaiGr ? hariAntara(titikAwalCac, titikSelesaiGr) : null;

    // 2. Durasi dari GR Approval ke Submit Invoice (Kapan submit invoice)
    const titikAwalInvoice = titikSelesaiGr || titikAwalCac;
    const titikSubmitInvoice = r.tanggalSubmitInvoice;
    const hariGrKeInvoiceSubmit = titikAwalInvoice && titikSubmitInvoice ? hariAntara(titikAwalInvoice, titikSubmitInvoice) : null;

    // 3. Durasi dari Submit Invoice ke Approve Customer (Kapan diterima / approve customer)
    const titikApproveCustomer = r.tanggalApproveInvoice;
    const hariInvoiceKeCustomerApprove = titikSubmitInvoice && titikApproveCustomer ? hariAntara(titikSubmitInvoice, titikApproveCustomer) : null;

    // 4. Total lead time end-to-end
    const titikAwalTotal = titikAwalCac || titikSubmitInvoice;
    const hariTotal = titikAwalTotal && titikApproveCustomer ? hariAntara(titikAwalTotal, titikApproveCustomer) : null;

    // 5. Hari berjalan jika belum selesai
    const acuanHariBerjalan = titikSubmitInvoice || titikAwalCac;
    const hariBerjalan = acuanHariBerjalan ? hariAntara(acuanHariBerjalan, hariIniISO) : 0;

    // 6. Tahap & status tracking
    let tahapStatus: BarisDurasi["tahapStatus"] = "draft";
    let tahapLabel = "Draft";

    if (titikApproveCustomer) {
      tahapStatus = "completed";
      tahapLabel = "Customer Approved";
    } else if (titikSubmitInvoice) {
      tahapStatus = "waiting_customer";
      tahapLabel = "Waiting Customer Approval";
    } else if (titikSelesaiGr) {
      tahapStatus = "ready_invoice";
      tahapLabel = "GR Approved / Ready to Submit Invoice";
    } else if (titikAwalCac) {
      tahapStatus = "cac_in_review";
      tahapLabel = "CAC In Review";
    }

    return {
      id: r.id,
      periode: r.periode,
      nomorPo: r.nomorPo,
      namaProyek: r.namaProyek,
      klien: r.klien,
      namaUserXl: r.namaUserXl,
      nomorInvoice: r.nomorInvoice,
      statusPengajuan: r.status,
      tanggalSubmitCac: r.tanggalSubmitCac,
      tanggalCacApproved: r.tanggalCacApproved,
      tanggalRequestGr: r.tanggalRequestGr,
      tanggalGrDisetujui: r.tanggalGrDisetujui,
      tanggalSubmitInvoice: r.tanggalSubmitInvoice,
      tanggalApproveInvoice: r.tanggalApproveInvoice,
      hariCacKeGr,
      hariGrKeInvoiceSubmit,
      hariInvoiceKeCustomerApprove,
      hariTotal,
      hariBerjalan,
      tahapStatus,
      tahapLabel,
    };
  });

  return (
    <>
      <Topbar nama={userLogin.nama} role={userLogin.role} email={userLogin.email} roles={userLogin.roles} />
      <main className="page" style={{ maxWidth: 1200 }}>
        <a href="/dashboard" className="back-link">&larr; Dashboard</a>
        <h1>Process Duration Analytics &amp; Tracking: CAC &rarr; Invoice</h1>
        <p className="subtitle">
          Comprehensive lead-time tracking: <b>CAC Submission</b> &rarr; <b>GR Approval</b> &rarr; <b>Invoice Submission</b> &rarr; <b>Customer Acceptance / Approval</b>.
        </p>

        <AnalisaDurasiClient daftar={daftar} />
      </main>
    </>
  );
}
