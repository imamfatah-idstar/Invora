import Topbar from "@/components/topbar";
import { db } from "@/db";
import { checkerReview, dokumen, grRequest, grRequestRiwayat, konfirmasi, lampiranPengajuan, pembayaran, pengajuan, pengajuanDetail, personel, po, poLineItem, users, userXl } from "@/db/schema";
import { tambahHari } from "@/lib/aging";
import { apakahKlienXl } from "@/lib/klien";
import { LABEL_LAMPIRAN_BALANCE } from "@/lib/lampiran-label";
import { wajibRole } from "@/lib/require-role";
import { desc, eq } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { notFound } from "next/navigation";
import FormChecker from "./checker-form";
import DaftarDokumenTable from "./daftar-dokumen-table";
import GrRequestPanel from "./gr-request-panel";
import InvoiceModal from "./invoice-modal";
import TombolKonfirmasi from "./konfirmasi-button";
import FormLampiran from "./lampiran-form";
import TombolHapusLampiran from "./lampiran-hapus-button";
import PembayaranPanel from "./pembayaran-panel";
import FormStatusProses from "./status-proses-form";
import TombolBuatDokumen from "./tombol-buat-dokumen";

const LABEL_STATUS: Record<string, string> = {
  draft: "Draft",
  menunggu_checker: "Pending Review",
  perlu_revisi: "Needs Revision",
  siap_diajukan: "Ready to Submit",
  diajukan: "Submitted",
};

const LABEL_JENIS_DOKUMEN: Record<string, string> = { CAC: "CAC", BAST: "BAST", GR: "GR (Good Receipt)" };

function formatRupiah(nilai: string) {
  return "Rp" + Number(nilai).toLocaleString("id-ID", { minimumFractionDigits: 2 });
}

export default async function DetailPengajuan({ params }: { params: Promise<{ id: string }> }) {
  const userLogin = await wajibRole(["petugas", "checker"]);
  const { id } = await params;

  const [header] = await db
    .select({
      id: pengajuan.id, periode: pengajuan.periode, status: pengajuan.status, versi: pengajuan.versi,
      nomorPo: po.nomorPo, namaProyek: po.namaProyek, namaUserXl: userXl.nama,
      kontakUserXl: userXl.kontak,
      namaFilePoAsli: po.namaFilePoAsli,
      klien: po.klien, jenisTagihan: po.jenisTagihan, keteranganTahap: pengajuan.keteranganTahap,
      tanggalSubmitCac: pengajuan.tanggalSubmitCac,
      tanggalCacApproved: pengajuan.tanggalCacApproved,
      tanggalRequestGr: pengajuan.tanggalRequestGr,
      tanggalGrDisetujui: pengajuan.tanggalGrDisetujui,
      tanggalSubmitInvoice: pengajuan.tanggalSubmitInvoice,
      tanggalApproveInvoice: pengajuan.tanggalApproveInvoice,
      nomorInvoice: pengajuan.nomorInvoice,
      approvalAlokasiUserXlPemberi: pengajuan.approvalAlokasiUserXlPemberi,
      approvalAlokasiTanggal: pengajuan.approvalAlokasiTanggal,
      approvalAlokasiReferensi: pengajuan.approvalAlokasiReferensi,
      nomorGrSlip: pengajuan.nomorGrSlip,
      nilaiGrDisetujui: pengajuan.nilaiGrDisetujui,
      selisihGr: pengajuan.selisihGr,
      penyesuaianSelisihGrMasuk: pengajuan.penyesuaianSelisihGrMasuk,
      nomorFakturPajak: pengajuan.nomorFakturPajak,
      tanggalFakturPajak: pengajuan.tanggalFakturPajak,
      namaFileFakturPajak: pengajuan.namaFileFakturPajak,
      pathFileFakturPajak: pengajuan.pathFileFakturPajak,
      tarifPpn: pengajuan.tarifPpn,
    })
    .from(pengajuan)
    .innerJoin(po, eq(pengajuan.poId, po.id))
    .innerJoin(userXl, eq(pengajuan.userXlId, userXl.id))
    .where(eq(pengajuan.id, Number(id)));
  if (!header) notFound();

  const userDiunggah = alias(users, "user_diunggah");
  const userDicek = alias(users, "user_dicek");
  const [grRequestRow] = await db
    .select({
      namaFileGenerate: grRequest.namaFileGenerate, digeneratePada: grRequest.digeneratePada,
      namaFileBalikanXl: grRequest.namaFileBalikanXl, diunggahBalikanPada: grRequest.diunggahBalikanPada,
      namaDiunggahBalikanOleh: userDiunggah.nama,
      namaFileGabungan: grRequest.namaFileGabungan, digabungPada: grRequest.digabungPada,
      dicekPada: grRequest.dicekPada, namaDicekOleh: userDicek.nama, catatanCek: grRequest.catatanCek,
    })
    .from(grRequest)
    .leftJoin(userDiunggah, eq(grRequest.diunggahBalikanOlehUserId, userDiunggah.id))
    .leftJoin(userDicek, eq(grRequest.dicekOlehUserId, userDicek.id))
    .where(eq(grRequest.pengajuanId, header.id));
  const dataGrRequest = grRequestRow ?? null;

  // Riwayat versi GR Request (bagian 36) — terbaru dulu.
  const riwayatGrRequest = await db
    .select({
      id: grRequestRiwayat.id, langkah: grRequestRiwayat.langkah,
      namaFile: grRequestRiwayat.namaFile, waktu: grRequestRiwayat.waktu,
      namaUser: users.nama, catatan: grRequestRiwayat.catatan,
    })
    .from(grRequestRiwayat)
    .leftJoin(users, eq(grRequestRiwayat.olehUserId, users.id))
    .where(eq(grRequestRiwayat.pengajuanId, header.id))
    .orderBy(desc(grRequestRiwayat.id));

  const rincian = await db
    .select({
      id: pengajuanDetail.id, namaPersonel: personel.nama,
      hariKerjaDapatDitagihkan: pengajuanDetail.hariKerjaDapatDitagihkan,
      hariKerjaAcuanBulan: pengajuanDetail.hariKerjaAcuanBulan,
      nilaiRateDipakai: pengajuanDetail.nilaiRateDipakai, hasilHitung: pengajuanDetail.hasilHitung,
      nilaiPenuh: pengajuanDetail.nilaiPenuh,
      sumberHitung: pengajuanDetail.sumberHitung,
      poLineItemId: pengajuanDetail.poLineItemId,
      nomorLine: poLineItem.nomorLine,
      deskripsiLine: poLineItem.shortText,
    })
    .from(pengajuanDetail)
    .innerJoin(personel, eq(pengajuanDetail.personelId, personel.id))
    .leftJoin(poLineItem, eq(pengajuanDetail.poLineItemId, poLineItem.id))
    .where(eq(pengajuanDetail.pengajuanId, header.id));

  const riwayatKonfirmasi = await db
    .select({ waktu: konfirmasi.waktu, versi: konfirmasi.versiDikonfirmasi, namaUser: users.nama })
    .from(konfirmasi).innerJoin(users, eq(konfirmasi.userId, users.id))
    .where(eq(konfirmasi.pengajuanId, header.id));

  const riwayatChecker = await db
    .select({ waktu: checkerReview.waktu, hasil: checkerReview.hasil, catatan: checkerReview.catatan, namaUser: users.nama })
    .from(checkerReview).innerJoin(users, eq(checkerReview.userId, users.id))
    .where(eq(checkerReview.pengajuanId, header.id));

  const userCheckerDok = alias(users, "user_checker_dok");
  const daftarDokumen = await db
    .select({
      id: dokumen.id,
      jenis: dokumen.jenis,
      versi: dokumen.versi,
      dibuatPada: dokumen.dibuatPada,
      status: dokumen.status,
      disetujuiPada: dokumen.disetujuiPada,
      disetujuiOlehUserId: dokumen.disetujuiOlehUserId,
      namaChecker: userCheckerDok.nama,
      catatanChecker: dokumen.catatanChecker,
    })
    .from(dokumen)
    .leftJoin(userCheckerDok, eq(dokumen.disetujuiOlehUserId, userCheckerDok.id))
    .where(eq(dokumen.pengajuanId, header.id));

  // Ambil daftar pembayaran pelunasan (MVP 5)
  const userBayar = alias(users, "user_bayar");
  const daftarPembayaran = await db
    .select({
      id: pembayaran.id,
      tanggalBayar: pembayaran.tanggalBayar,
      nominalDiterima: pembayaran.nominalDiterima,
      potonganPph23: pembayaran.potonganPph23,
      nomorBupotPph23: pembayaran.nomorBupotPph23,
      biayaAdminBank: pembayaran.biayaAdminBank,
      bankTujuan: pembayaran.bankTujuan,
      nomorReferensiBank: pembayaran.nomorReferensiBank,
      namaFileBukti: pembayaran.namaFileBukti,
      pathFileBukti: pembayaran.pathFileBukti,
      status: pembayaran.status,
      catatan: pembayaran.catatan,
      diinputPada: pembayaran.diinputPada,
      diinputOlehUserId: pembayaran.diinputOlehUserId,
      namaPenginput: userBayar.nama,
      diverifikasiPada: pembayaran.diverifikasiPada,
      catatanChecker: pembayaran.catatanChecker,
    })
    .from(pembayaran)
    .innerJoin(userBayar, eq(pembayaran.diinputOlehUserId, userBayar.id))
    .where(eq(pembayaran.pengajuanId, header.id))
    .orderBy(desc(pembayaran.id));

  const daftarLampiran = await db
    .select({ id: lampiranPengajuan.id, label: lampiranPengajuan.label, namaFile: lampiranPengajuan.namaFile, diunggahPada: lampiranPengajuan.diunggahPada })
    .from(lampiranPengajuan)
    .where(eq(lampiranPengajuan.pengajuanId, header.id))
    .orderBy(desc(lampiranPengajuan.id));

  const total = rincian.reduce((acc, r) => acc + Number(r.hasilHitung), 0);

  const isPetugas = userLogin.role === "petugas";
  const isChecker = userLogin.role === "checker";

  // Bagian 40-43: klien XL tetap lewat proses CAC seperti sekarang; klien
  // Non-XL TIDAK lewat CAC, tapi tetap wajib timesheet + BAST sebelum invoice
  // bisa diajukan. Deteksi HANYA dari po.klien (client_name), lihat src/lib/klien.ts.
  const isKlienXl = apakahKlienXl(header.klien);
  const isTagihanTahap = !!header.keteranganTahap || header.jenisTagihan === "tahap";
  const semuaPakaiTimesheet = rincian.length > 0 && rincian.every((r) => r.sumberHitung === "timesheet");

  const bisaKonfirmasi = isKlienXl && (header.status === "draft" || header.status === "perlu_revisi") && isPetugas;
  const bisaEdit = (header.status === "perlu_revisi" || header.status === "draft") && isPetugas;
  const bisaDicek = isKlienXl && header.status === "menunggu_checker" && isChecker;
  // Baik XL (CAC, BAST, GR) maupun Non-XL (BAST) langsung dapat membuat & mengelola dokumen sejak pengajuan dibuat
  const bisaBuatDokumen = isPetugas || isChecker;
  const bisaKelengkapan = isPetugas || isChecker;
  const cacDoc = daftarDokumen.find((d) => d.jenis === "CAC");
  const bastDoc = daftarDokumen.find((d) => d.jenis === "BAST");
  const grDoc = daftarDokumen.find((d) => d.jenis === "GR");
  const cacAda = !!cacDoc;
  const bastAda = !!bastDoc;
  const cacDisetujui = cacDoc?.status === "disetujui";
  const bastDisetujui = bastDoc?.status === "disetujui";
  const grDisetujui = grDoc?.status === "disetujui";
  const siapInvoice = isKlienXl
    ? (cacDisetujui && bastDisetujui && grDisetujui) || !!header.nomorInvoice
    : true;
  const lampiranBalanceAda = daftarLampiran.some((l) => l.label === LABEL_LAMPIRAN_BALANCE);
  const lampiranLain = daftarLampiran.filter((l) => l.label !== LABEL_LAMPIRAN_BALANCE);
  const poAsliAda = !!header.namaFilePoAsli;

  const dppTagihan = header.nilaiGrDisetujui ? Number(header.nilaiGrDisetujui) : total;
  const tarifPpnTagihan = header.tarifPpn ? Number(header.tarifPpn) : 11;
  const totalTagihanFinal = dppTagihan + (dppTagihan * tarifPpnTagihan) / 100;
  const totalTerbayarVerifikasi = daftarPembayaran
    .filter((p) => p.status === "diverifikasi")
    .reduce((acc, p) => acc + (Number(p.nominalDiterima) || 0) + (Number(p.potonganPph23) || 0) + (Number(p.biayaAdminBank) || 0), 0);

  const tanggalAcuanTagihan = header.tanggalSubmitInvoice || header.tanggalApproveInvoice || header.tanggalFakturPajak || `${header.periode}-28`;
  const tanggalJatuhTempoTagihan = tambahHari(tanggalAcuanTagihan, 30);

  return (
    <>
      <Topbar nama={userLogin.nama} role={userLogin.role} email={userLogin.email} roles={userLogin.roles} />
      <main className="page">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: 12 }}>
          <a href="/pengajuan" className="back-link" style={{ margin: 0 }}>&larr; Submissions</a>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            {siapInvoice ? (
              <InvoiceModal
                pengajuanId={header.id}
                nomorInvoice={header.nomorInvoice || `DRAF-INV-${header.id}`}
                nomorFakturPajak={header.nomorFakturPajak}
                tanggalFakturPajak={header.tanggalFakturPajak}
                namaFileFakturPajak={header.namaFileFakturPajak}
                pathFileFakturPajak={header.pathFileFakturPajak}
                nomorGrSlip={header.nomorGrSlip}
                nomorPo={header.nomorPo}
                klien={header.klien || "XL Axiata"}
                namaProyek={header.namaProyek}
                namaPic={header.namaUserXl}
                kontakPic={header.kontakUserXl}
                userEmail={userLogin.email}
                periode={header.periode}
                tanggalInvoice={tanggalAcuanTagihan}
                tanggalJatuhTempo={tanggalJatuhTempoTagihan}
                totalTagihan={totalTagihanFinal}
                dpp={header.nilaiGrDisetujui ? Number(header.nilaiGrDisetujui) : total}
                tarifPpn={header.tarifPpn ? Number(header.tarifPpn) : 11}
              />
            ) : (
              <a
                href="#dokumen-section"
                className="btn btn-secondary"
                style={{ fontSize: 13, display: "inline-flex", alignItems: "center", gap: 6 }}
                title="Untuk klien XL, selesaikan dan setujui dokumen CAC, BAST, dan GR terlebih dahulu sebelum menerbitkan Invoice"
              >
                📋 Tahap Dokumen XL: BAST, CAC &amp; GR ({[cacDisetujui && "CAC ✓", bastDisetujui && "BAST ✓", grDisetujui && "GR ✓"].filter(Boolean).length}/3 Disetujui)
              </a>
            )}
          </div>
        </div>
        <h1>Submission {header.periode} — {header.nomorPo}</h1>
        <p className="subtitle">
          Project: <b>{header.namaProyek}</b> &middot; Client Approver: <b>{header.namaUserXl}</b> &middot;
          Status: <span className={`badge badge-${header.status}`}>{LABEL_STATUS[header.status] ?? header.status}</span> &middot; Version: {header.versi}
          {header.klien && (
            <> &middot; Client: <b>{header.klien}</b>{" "}
              <span className={`badge ${isKlienXl ? "badge-siap_diajukan" : "badge-draft"}`}>
                {isKlienXl ? "XL — CAC Workflow" : "Non-XL — Direct Invoice"}
              </span>
            </>
          )}
          {header.keteranganTahap && (
            <> &middot; Milestone billing: <b>{header.keteranganTahap}</b></>
          )}
          {!bastAda && (header.status === "siap_diajukan" || header.status === "diajukan") && (
            <span className="badge badge-danger" style={{ marginLeft: 8 }} title="BAST document not yet created">
              ⚠️ BAST Not Created
            </span>
          )}
        </p>
        {(header.approvalAlokasiUserXlPemberi || header.approvalAlokasiTanggal || header.approvalAlokasiReferensi) && (
          <p className="subtitle">
            Cross-PO allocation approval (recorded): <b>{header.approvalAlokasiUserXlPemberi ?? "-"}</b>
            {header.approvalAlokasiTanggal && <> &middot; {header.approvalAlokasiTanggal}</>}
            {header.approvalAlokasiReferensi && <> &middot; ref: {header.approvalAlokasiReferensi}</>}
          </p>
        )}

        <div className="table-wrap">
          <table>
            <thead><tr>
              <th>Personnel</th><th>PO Line</th><th>Rate</th>
              <th>Billable Days / Target</th><th>Source</th><th>Calculated Amount</th>
            </tr></thead>
            <tbody>
              {rincian.map((r) => {
                const sebagian = r.nilaiPenuh && Number(r.nilaiPenuh) > Number(r.hasilHitung);
                return (
                <tr key={r.id}>
                  <td>{r.namaPersonel}</td>
                  <td>
                    {r.nomorLine ? (
                      <span className="badge badge-draft" title={r.deskripsiLine ?? ""}>
                        Line {r.nomorLine}
                      </span>
                    ) : (
                      <span style={{ color: "var(--color-text-muted)", fontSize: 12 }}>-</span>
                    )}
                  </td>
                  <td>{formatRupiah(r.nilaiRateDipakai)}</td>
                  <td>{r.sumberHitung === "manual" ? "-" : `${r.hariKerjaDapatDitagihkan} / ${r.hariKerjaAcuanBulan}`}</td>
                  <td>
                    <span className={`badge ${r.sumberHitung === "timesheet" ? "badge-siap_diajukan" : ""}`}>
                      {r.sumberHitung === "timesheet" ? "Timesheet" : r.sumberHitung === "manual" ? "Manual (milestone)" : "Calendar"}
                    </span>
                  </td>
                  <td>
                    {formatRupiah(r.hasilHitung)}
                    {sebagian && (
                      <div style={{ fontSize: 12, color: "var(--color-muted, #666)" }}>
                        partial of {formatRupiah(r.nilaiPenuh!)} — remainder billed to other PO
                      </div>
                    )}
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="card" style={{ display: "inline-block", padding: "10px 16px", fontSize: 15, marginTop: 12 }}>
          Total: <b>{formatRupiah(String(total))}</b>
        </p>

        {bisaEdit && (
          <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <a href={`/pengajuan/${header.id}/edit`} className="btn">Edit Line Items</a>
            <TombolKonfirmasi pengajuanId={header.id} />
          </div>
        )}
        {bisaKonfirmasi && !bisaEdit && (
          <div style={{ marginTop: 12 }}>
            <TombolKonfirmasi pengajuanId={header.id} />
          </div>
        )}
        {bisaDicek && (
          <div style={{ marginTop: 12 }}>
            <FormChecker pengajuanId={header.id} />
          </div>
        )}
        {!bisaKonfirmasi && !bisaDicek && !bisaBuatDokumen && header.status !== "siap_diajukan" && header.status !== "diajukan" && (
          <p className="subtitle" style={{ marginTop: 12 }}>
            No pending action for your role at this stage (Role: {userLogin.role}).
          </p>
        )}
        {header.status === "siap_diajukan" && (
          <div className="alert alert-success" style={{ marginTop: 12 }}>
            ✓ Reviewed by Checker and ready for submission.
          </div>
        )}

        {(bisaBuatDokumen || daftarDokumen.length > 0) && (
          <div id="dokumen-section" className="card" style={{ marginTop: 20 }}>
            <h3 style={{ marginTop: 0 }}>Documents: {isKlienXl ? "CAC / BAST / GR" : "BAST"}</h3>
            <p className="subtitle">
              {isKlienXl ? (
                <>Internal drafts based on this submission data following official CAC/BAST/GR formatting — submit to Get Approve CAC / COUPA for official approval.</>
              ) : (
                <>Non-XL client — formal BAST document with timesheets as billing support documentation.</>
              )}
            </p>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
              {bisaBuatDokumen && isKlienXl && <TombolBuatDokumen pengajuanId={header.id} jenis="CAC" />}
              {bisaBuatDokumen && <TombolBuatDokumen pengajuanId={header.id} jenis="BAST" />}
              {bisaBuatDokumen && isKlienXl && <TombolBuatDokumen pengajuanId={header.id} jenis="GR" />}
              {isKlienXl && (
                <a
                  href="https://www.getapprove.xlsmart.co.id/auth/login?nexturl=%252Fapproval-document%2523id%253Dcc5582a1-9e20-4926-865d-9e7d9c65b73c"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    backgroundColor: "#002d72",
                    borderColor: "#002d72",
                    color: "#ffffff",
                    fontWeight: 600,
                    textDecoration: "none",
                  }}
                  title="Redirect to official XL Get Approve Portal"
                >
                  <span>🚀 Redirect to official XL Get Approve Portal</span>
                  <span style={{ fontSize: 12 }}>↗</span>
                </a>
              )}
            </div>

            {daftarDokumen.filter((d) => isKlienXl || d.jenis === "BAST").length > 0 ? (
              <DaftarDokumenTable
                pengajuanId={header.id}
                initialDokumen={isKlienXl ? daftarDokumen : daftarDokumen.filter((d) => d.jenis === "BAST")}
                userRole={userLogin.role}
                userNama={userLogin.nama}
                isKlienXl={isKlienXl}
              />
            ) : (
              <div style={{ marginTop: 14, padding: "16px 20px", background: "var(--color-bg-alt, #f8fafc)", borderRadius: 8, border: "1px dashed var(--color-border, #e2e8f0)", textAlign: "center" }}>
                <p style={{ margin: "0 0 10px 0", color: "var(--muted, #64748b)", fontSize: 13.5 }}>
                  {isKlienXl ? "Belum ada dokumen CAC, BAST, atau GR yang dibuat." : "Belum ada dokumen BAST yang dibuat untuk pengajuan Non-XL ini."}
                </p>
                {bisaBuatDokumen && (
                  <TombolBuatDokumen pengajuanId={header.id} jenis="BAST" />
                )}
              </div>
            )}
          </div>
        )}

        {/* Bagian 45: GR Request cuma berlaku untuk klien XL (proses CAC/COUPA) —
            klien Non-XL skip total, tidak ditampilkan sama sekali.
            Dipindahkan tepat di bawah card Documents: CAC / BAST / GR */}
        {bisaKelengkapan && isKlienXl && (
          <GrRequestPanel pengajuanId={header.id} data={dataGrRequest} role={isChecker ? "checker" : "petugas"} riwayat={riwayatGrRequest} />
        )}

        {bisaKelengkapan && (
          <div className="card" style={{ marginTop: 20 }}>
            <h3 style={{ marginTop: 0 }}>
              {isKlienXl
                ? "Processing Milestones: CAC → Approved GR → Official Invoice"
                : "Processing Milestones: Official Invoice & Payment"}
            </h3>
            <p className="subtitle">
              {isKlienXl
                ? "End-to-end milestone tracking, official GR Slip recording, approved GR amount, automatic Deficiency GR calculation, and Tax Invoice & Official Invoice issuance."
                : "End-to-end milestone tracking, Tax Invoice & Official Invoice issuance, and payment settlement for Non-XL client."}
            </p>
            {header.penyesuaianSelisihGrMasuk && Number(header.penyesuaianSelisihGrMasuk) !== 0 && (
              <div className="alert alert-info" style={{ marginTop: 8, marginBottom: 12 }}>
                ℹ️ <b>GR Adjustment from Previous Period:</b> This submission includes a carry-over GR variance of{" "}
                <b>{Number(header.penyesuaianSelisihGrMasuk) > 0 ? "+" : ""}{formatRupiah(header.penyesuaianSelisihGrMasuk)}</b> accounted into the total billing.
              </div>
            )}
            <p style={{ margin: "0 0 4px", fontSize: 14 }}>
              {isKlienXl && (
                <>
                  CAC Submitted Date: <b>{header.tanggalSubmitCac ?? "Pending Checker Review"}</b>
                  {header.tanggalSubmitCac && header.tanggalApproveInvoice && (
                    <> &middot; total turnaround to approved invoice: <b>{Math.round((new Date(header.tanggalApproveInvoice + "T00:00:00Z").getTime() - new Date(header.tanggalSubmitCac + "T00:00:00Z").getTime()) / 86400000)} days</b></>
                  )}
                  {" "}&middot;{" "}
                </>
              )}
              {header.nomorInvoice && <>Invoice No.: <b>{header.nomorInvoice}</b> &middot; </>}
              {isKlienXl && header.nomorGrSlip && <>GR Slip: <b>{header.nomorGrSlip}</b> &middot; </>}
              {isKlienXl && header.nilaiGrDisetujui && <>Approved GR: <b>{formatRupiah(header.nilaiGrDisetujui)}</b></>}
              {!isKlienXl && <>Total Billing: <b>{formatRupiah(String(total))}</b></>}
            </p>
            <FormStatusProses
              pengajuanId={header.id}
              totalPengajuan={total}
              nomorInvoiceAwal={header.nomorInvoice}
              nomorGrSlipAwal={header.nomorGrSlip}
              nilaiGrDisetujuiAwal={header.nilaiGrDisetujui}
              nomorFakturPajakAwal={header.nomorFakturPajak}
              tanggalFakturPajakAwal={header.tanggalFakturPajak}
              tarifPpnAwal={header.tarifPpn}
              grRequestSudahDicek={!isKlienXl || !!dataGrRequest?.dicekPada}
              isKlienXl={isKlienXl}
              bastAda={bastAda}
              nilaiAwal={{
                tanggalCacApproved: header.tanggalCacApproved,
                tanggalRequestGr: header.tanggalRequestGr,
                tanggalGrDisetujui: header.tanggalGrDisetujui,
                tanggalSubmitInvoice: header.tanggalSubmitInvoice,
                tanggalApproveInvoice: header.tanggalApproveInvoice,
              }}
            />
          </div>
        )}

        {/* MVP 5: Modul Pencatatan Pelunasan Pembayaran (Payment Settlement) */}
        {bisaKelengkapan && (
          <PembayaranPanel
            pengajuanId={header.id}
            nomorInvoice={header.nomorInvoice}
            totalInvoice={(() => {
              const dpp = header.nilaiGrDisetujui ? Number(header.nilaiGrDisetujui) : total;
              const tarif = header.tarifPpn ? Number(header.tarifPpn) : 11;
              return dpp + (dpp * tarif) / 100;
            })()}
            dpp={header.nilaiGrDisetujui ? Number(header.nilaiGrDisetujui) : total}
            daftarPembayaranAwal={daftarPembayaran}
            userLogin={{ id: userLogin.id, nama: userLogin.nama, role: userLogin.role }}
          />
        )}

        {bisaKelengkapan && (
          <div className="card" style={{ marginTop: 20 }}>
            <h3 style={{ marginTop: 0 }}>
              {isKlienXl
                ? "Document Readiness Checklist — prior to submission to Get Approve"
                : "Document Readiness Checklist — Non-XL Billing Documents"}
            </h3>
            <p className="subtitle">
              {isKlienXl
                ? "Prepare all required billing documents here — CAC, BAST, PO tracking spreadsheets, and any client-specific attachments."
                : "Prepare all required formal billing documents — BAST 2-pihak, timesheets, and supporting attachments."}
            </p>
            <ul style={{ margin: "0 0 16px 0", paddingLeft: 18, fontSize: 14 }}>
              {isKlienXl ? (
                <li>
                  {cacAda ? "✓" : "○"} CAC Document {cacAda ? (cacDisetujui ? "— ✓ Approved by Checker" : "— created (Pending Checker Approval)") : "— not yet created"}
                </li>
              ) : isTagihanTahap ? (
                <li>✓ Milestone billing (manual) — timesheet not required {header.keteranganTahap ? `(${header.keteranganTahap})` : ""}</li>
              ) : (
                <li>{semuaPakaiTimesheet ? "✓" : "○"} Timesheets {semuaPakaiTimesheet ? "completed for all personnel" : "incomplete for some personnel (mandatory for Non-XL)"}</li>
              )}
              <li>
                {bastAda ? "✓" : "○"} BAST Document {bastAda ? (bastDisetujui ? "— ✓ Approved by Checker" : "— created (Pending Checker Approval)") : "— not yet created"}
                {!bastAda && <span className="badge badge-danger" style={{ marginLeft: 6, fontSize: 11 }}>Required</span>}
              </li>
              {isKlienXl && (
                <li>
                  {grDoc ? "✓" : "○"} GR Document (Good Receipt BAU) {grDoc ? (grDisetujui ? "— ✓ Approved by Checker" : "— created (Pending Checker Approval)") : "— not yet created"}
                </li>
              )}
              <li>{poAsliAda ? "✓" : "○"} Original PO Document — {poAsliAda ? header.namaFilePoAsli : <>not yet uploaded, <a href="/data-referensi/po">upload under Reference Data · PO / Line Items</a></>}</li>
              <li>{lampiranBalanceAda ? "✓" : "○"} PO Balance Attachment (tracking spreadsheet excerpt) {lampiranBalanceAda ? "uploaded" : "not yet uploaded"}</li>
              <li>
                {header.pathFileFakturPajak ? "✓" : "○"} Faktur Pajak Resmi (e-Faktur DJP){" "}
                {header.pathFileFakturPajak ? (
                  <>— <b>{header.namaFileFakturPajak || "uploaded"}</b> (auto-merged with Invoice)</>
                ) : (
                  <>— <span className="badge badge-warning" style={{ fontSize: 11 }}>Wajib Diunggah Saat Terbit Invoice</span></>
                )}
              </li>
              <li>{lampiranLain.length > 0 ? "✓" : "○"} Additional attachments (spreadsheets, supporting docs) — {lampiranLain.length} file(s) uploaded</li>
            </ul>
            <p className="subtitle" style={{ fontSize: 12, marginBottom: 4 }}>
              For the PO Balance attachment, label it exactly <b>&quot;{LABEL_LAMPIRAN_BALANCE}&quot;</b> to automatically append it as Page 2 in the merged CAC/BAST PDF.
            </p>
            <FormLampiran pengajuanId={header.id} labelSaran={LABEL_LAMPIRAN_BALANCE} />
            {daftarLampiran.length > 0 && (
              <div className="table-wrap" style={{ marginTop: 16 }}>
                <table>
                  <thead><tr><th>Label</th><th>File Name</th><th>Uploaded At</th><th></th></tr></thead>
                  <tbody>
                    {daftarLampiran.map((l) => (
                      <tr key={l.id}>
                        <td>{l.label}{l.label === LABEL_LAMPIRAN_BALANCE && " ✓"}</td>
                        <td>{l.namaFile}</td>
                        <td>{l.diunggahPada}</td>
                        <td><TombolHapusLampiran pengajuanId={header.id} lampiranId={l.id} konfirmasi={`Delete attachment "${l.label}"?`} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {(riwayatKonfirmasi.length > 0 || riwayatChecker.length > 0) && (
          <div className="card" style={{ marginTop: 24 }}>
            <h3 style={{ marginTop: 0 }}>Submission History &amp; Audit Trail</h3>
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13.5, color: "var(--color-text-muted)" }}>
              {riwayatKonfirmasi.map((k, i) => (
                <li key={`k${i}`}>Confirmed by <b>{k.namaUser}</b> (version {k.versi}) — {k.waktu}</li>
              ))}
              {riwayatChecker.map((c, i) => (
                <li key={`c${i}`}>
                  Reviewed by <b>{c.namaUser}</b> — result: <b>{LABEL_STATUS[c.hasil] ?? c.hasil}</b>
                  {c.catatan ? ` (note: ${c.catatan})` : ""} — {c.waktu}
                </li>
              ))}
            </ul>
          </div>
        )}
      </main>
    </>
  );
}
