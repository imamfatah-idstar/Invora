import { db } from "@/db";
import {
  dokumen, pengajuan, pengajuanDetail, personel, po, poLineItem, userXl,
  konfirmasi, checkerReview, users, lampiranPengajuan, grRequest,
} from "@/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { notFound } from "next/navigation";
import Link from "next/link";
import TombolCetak from "./tombol-cetak";
import Logo from "@/components/logo";
import { LABEL_LAMPIRAN_BALANCE } from "@/lib/lampiran-label";
import { apakahKlienXl } from "@/lib/klien";
import { wajibRole } from "@/lib/require-role";
import CheckerApprovalBar from "./checker-approval-bar";
import BastNonXlView from "./bast-non-xl-view";
import BastXlView from "./bast-xl-view";
import CacXlView from "./cac-xl-view";
import GrXlView from "./gr-xl-view";

function formatRupiah(nilai: string) {
  return "Rp" + Number(nilai).toLocaleString("id-ID", { minimumFractionDigits: 2 });
}

const LABEL_JENIS: Record<string, string> = {
  CAC: "Dokumen CAC (Konfirmasi Pengajuan Invoicing)",
  BAST: "Berita Acara Serah Terima (BAST)",
  GR: "Dokumen Good Receipt (BAU Approval)",
};

export default async function HalamanDokumen({ params }: { params: Promise<{ id: string; dokumenId: string }> }) {
  const userLogin = await wajibRole(["petugas", "checker"]);
  const { id, dokumenId } = await params;
  const pengajuanId = Number(id);

  const [dok] = await db.select().from(dokumen).where(eq(dokumen.id, Number(dokumenId)));
  if (!dok || dok.pengajuanId !== pengajuanId) notFound();

  const [userChecker] = dok.disetujuiOlehUserId
    ? await db.select({ nama: users.nama }).from(users).where(eq(users.id, dok.disetujuiOlehUserId)).limit(1)
    : [null];

  const approvalData = {
    status: dok.status,
    disetujuiPada: dok.disetujuiPada,
    namaChecker: userChecker?.nama ?? null,
    catatanChecker: dok.catatanChecker,
    userRole: userLogin.role,
    userNama: userLogin.nama,
  };

  const [header] = await db
    .select({
      periode: pengajuan.periode, versi: pengajuan.versi,
      keteranganTahap: pengajuan.keteranganTahap,
      nomorGrSlip: pengajuan.nomorGrSlip,
      nilaiGrDisetujui: pengajuan.nilaiGrDisetujui,
      nomorPo: po.nomorPo, namaProyek: po.namaProyek, nilaiItem: po.nilaiItem,
      namaUserXl: userXl.nama, kontakUserXl: userXl.kontak,
      klien: po.klien,
    })
    .from(pengajuan)
    .innerJoin(po, eq(pengajuan.poId, po.id))
    .innerJoin(userXl, eq(pengajuan.userXlId, userXl.id))
    .where(eq(pengajuan.id, pengajuanId));
  if (!header) notFound();

  const [grReq] = await db
    .select({
      namaFileGabungan: grRequest.namaFileGabungan,
      namaFileBalikanXl: grRequest.namaFileBalikanXl,
    })
    .from(grRequest)
    .where(eq(grRequest.pengajuanId, pengajuanId))
    .limit(1);

  const isKlienXl = apakahKlienXl(header.klien);

  const [poRow] = await db.select({ pathFilePoAsli: po.pathFilePoAsli }).from(po).where(eq(po.nomorPo, header.nomorPo));
  const [lampiranBalance] = await db
    .select({
      id: lampiranPengajuan.id,
      namaFile: lampiranPengajuan.namaFile,
      pathFile: lampiranPengajuan.pathFile,
    })
    .from(lampiranPengajuan)
    .where(and(eq(lampiranPengajuan.pengajuanId, pengajuanId), eq(lampiranPengajuan.label, LABEL_LAMPIRAN_BALANCE)))
    .limit(1);
  const kelengkapanPdfLengkap = !!poRow?.pathFilePoAsli && !!lampiranBalance;

  const rincian = await db
    .select({
      namaPersonel: personel.nama,
      hariKerjaDapatDitagihkan: pengajuanDetail.hariKerjaDapatDitagihkan,
      hariKerjaAcuanBulan: pengajuanDetail.hariKerjaAcuanBulan,
      nilaiRateDipakai: pengajuanDetail.nilaiRateDipakai, hasilHitung: pengajuanDetail.hasilHitung,
      nomorLine: poLineItem.nomorLine,
      deskripsiLine: poLineItem.shortText,
    })
    .from(pengajuanDetail)
    .innerJoin(personel, eq(pengajuanDetail.personelId, personel.id))
    .leftJoin(poLineItem, eq(pengajuanDetail.poLineItemId, poLineItem.id))
    .where(eq(pengajuanDetail.pengajuanId, pengajuanId));

  const [konfirmasiTerakhir] = await db
    .select({ waktu: konfirmasi.waktu, nama: users.nama })
    .from(konfirmasi).innerJoin(users, eq(konfirmasi.userId, users.id))
    .where(eq(konfirmasi.pengajuanId, pengajuanId))
    .orderBy(desc(konfirmasi.waktu)).limit(1);

  const [checkerTerakhir] = await db
    .select({ waktu: checkerReview.waktu, nama: users.nama })
    .from(checkerReview).innerJoin(users, eq(checkerReview.userId, users.id))
    .where(eq(checkerReview.pengajuanId, pengajuanId))
    .orderBy(desc(checkerReview.waktu)).limit(1);

  const total = rincian.reduce((acc, r) => acc + Number(r.hasilHitung), 0);

  // Jika klien XL dan dokumen adalah BAST, gunakan format BAST XL resmi (sesuai BAST_PO.pdf)
  if (isKlienXl && dok.jenis === "BAST") {
    return (
      <BastXlView
        pengajuanId={pengajuanId}
        dokumenId={dok.id}
        dokumenVersi={dok.versi}
        nomorPo={header.nomorPo}
        namaProyek={header.namaProyek}
        periode={header.periode}
        keteranganTahap={header.keteranganTahap}
        defaultUserXlNama={header.namaUserXl}
        defaultUserXlJabatan={header.kontakUserXl || "GM Integration & AI Orchestration"}
        defaultFinanceNama="Dewi Ani Mulyakarti"
        defaultFinanceJabatan="Finance Manager"
        defaultPekerjaan="Jasa IT"
        dibuatPada={dok.dibuatPada}
        approvalData={approvalData}
      />
    );
  }

  // Jika klien XL dan dokumen adalah CAC, gunakan format CAC XL resmi (sesuai contoh_cac.pdf)
  if (isKlienXl && dok.jenis === "CAC") {
    return (
      <CacXlView
        pengajuanId={pengajuanId}
        dokumenId={dok.id}
        dokumenVersi={dok.versi}
        nomorPo={header.nomorPo}
        namaProyek={header.namaProyek}
        periode={header.periode}
        poValue={header.nilaiItem}
        grValue={header.nilaiGrDisetujui || total}
        defaultUserXlNama={header.namaUserXl}
        defaultUserXlJabatan={header.kontakUserXl || "GM Integration Service & Ai Orchestration"}
        defaultFinanceNama="Dewi Ani Mulyakarti"
        defaultFinanceJabatan="Finance Manager"
        dibuatPada={dok.dibuatPada}
        approvalData={approvalData}
        lampiranBalance={
          lampiranBalance
            ? {
                id: lampiranBalance.id,
                namaFile: lampiranBalance.namaFile,
                url: `/api/pengajuan/${pengajuanId}/lampiran/${lampiranBalance.id}`,
              }
            : null
        }
      />
    );
  }

  // Jika klien XL dan dokumen adalah GR, gunakan format GR XL resmi (sesuai Good_Receipt.pdf)
  if (isKlienXl && dok.jenis === "GR") {
    return (
      <GrXlView
        pengajuanId={pengajuanId}
        dokumenId={dok.id}
        dokumenVersi={dok.versi}
        nomorPo={header.nomorPo}
        namaProyek={header.namaProyek}
        periode={header.periode}
        klien={header.klien || "XL Axiata"}
        nomorGrSlip={header.nomorGrSlip}
        nilaiGrDisetujui={header.nilaiGrDisetujui}
        rincian={rincian}
        dibuatPada={dok.dibuatPada}
        defaultSowDocument={grReq?.namaFileGabungan || grReq?.namaFileBalikanXl || "7a1a6279-d98e-4b17-ad0e-221bca5a4749.xlsx"}
        approvalData={approvalData}
      />
    );
  }

  // Jika klien Non-XL dan dokumen adalah BAST, gunakan format BAST Non-XL khusus (1 halaman, klausul resmi 2 pihak)
  if (!isKlienXl && dok.jenis === "BAST") {
    return (
      <BastNonXlView
        pengajuanId={pengajuanId}
        dokumenId={dok.id}
        dokumenVersi={dok.versi}
        nomorPo={header.nomorPo}
        namaProyek={header.namaProyek}
        klien={header.klien ?? "Klien"}
        periode={header.periode}
        keteranganTahap={header.keteranganTahap}
        defaultPihakPertama={header.namaUserXl}
        defaultPihakKedua={konfirmasiTerakhir?.nama ?? "Aris Munandar"}
        rincian={rincian}
        total={total}
        dibuatPada={dok.dibuatPada}
        approvalData={approvalData}
      />
    );
  }

  return (
    <div className="doc-page">
      <div className="doc-toolbar no-print">
        <Link href={`/pengajuan/${pengajuanId}`} className="back-link">&larr; Submission Details</Link>
        <TombolCetak />
        <a href={`/api/pengajuan/${pengajuanId}/dokumen/${dok.id}/pdf`} target="_blank" className="btn btn-primary">
          Download Merged PDF{kelengkapanPdfLengkap ? " (3 pages)" : ""}
        </a>
      </div>
      <CheckerApprovalBar
        pengajuanId={pengajuanId}
        dokumenId={dok.id}
        jenis={dok.jenis}
        statusAwal={dok.status}
        disetujuiPadaAwal={dok.disetujuiPada}
        namaCheckerAwal={userChecker?.nama}
        catatanCheckerAwal={dok.catatanChecker}
        userRole={userLogin.role}
        userNama={userLogin.nama}
      />
      {!kelengkapanPdfLengkap && (
        <div className="alert alert-warning no-print">
          Merged PDF will still be generated, but only contains the certificate page —
          {!lampiranBalance && " missing attachment labeled \"" + LABEL_LAMPIRAN_BALANCE + "\" for page 2,"}
          {!poRow?.pathFilePoAsli && " missing Original PO Document for page 3."}
          {" "}Please attach them first in &quot;Document Completeness&quot; / Reference Data · PO.
        </div>
      )}

      <div className="alert alert-warning no-print">
        <b>Internal Draft.</b> This document is automatically generated from submission data, following the confirmed
        official CAC/BAST template. The status remains draft because official submission to the client portal is performed manually —
        this document serves as internal preview/print assistance.
      </div>

      <div className="doc-sheet">
        <div className="doc-watermark">DRAFT</div>
        <div className="doc-header">
          <Logo variant="color" height={36} />
          <div className="doc-header-text">
            <h2>{LABEL_JENIS[dok.jenis] ?? dok.jenis}</h2>
            <p>Status dokumen: <b>DRAFT</b> — versi pengajuan {dok.versi}</p>
          </div>
        </div>

        <table className="doc-info">
          <tbody>
            <tr><td>Nomor PO</td><td>{header.nomorPo}</td></tr>
            <tr><td>Nama Proyek</td><td>{header.namaProyek}</td></tr>
            {header.klien && <tr><td>Klien</td><td>{header.klien}</td></tr>}
            <tr><td>{isKlienXl ? "User XL" : "User Klien / PIC"}</td><td>{header.namaUserXl}</td></tr>
            <tr><td>Periode</td><td>{header.periode}</td></tr>
            {header.keteranganTahap && <tr><td>Tagihan Tahap</td><td>{header.keteranganTahap}</td></tr>}
            <tr><td>Dikonfirmasi Petugas</td><td>{konfirmasiTerakhir ? `${konfirmasiTerakhir.nama} — ${konfirmasiTerakhir.waktu}` : "-"}</td></tr>
            <tr><td>Diperiksa Checker</td><td>{checkerTerakhir ? `${checkerTerakhir.nama} — ${checkerTerakhir.waktu}` : "-"}</td></tr>
          </tbody>
        </table>

        {dok.jenis === "BAST" && (
          <p className="doc-narasi">
            Dengan ini menyatakan bahwa jasa personel berikut telah dilaksanakan sesuai PO <b>{header.nomorPo}</b> untuk
            proyek <b>{header.namaProyek}</b> {header.keteranganTahap ? <>pada <b>{header.keteranganTahap}</b> (periode {header.periode})</> : <>pada periode <b>{header.periode}</b></>}, dan diserahterimakan sesuai rincian di bawah ini.
          </p>
        )}

        <table className="doc-tabel">
          <thead><tr>
            <th>Personel</th><th>Rate</th><th>Hari Ditagihkan / Acuan</th><th>Hasil Hitung</th>
          </tr></thead>
          <tbody>
            {rincian.map((r, i) => (
              <tr key={i}>
                <td>{r.namaPersonel}</td>
                <td>{formatRupiah(r.nilaiRateDipakai)}</td>
                <td>{r.hariKerjaAcuanBulan === 0 ? "-" : `${r.hariKerjaDapatDitagihkan} / ${r.hariKerjaAcuanBulan}`}</td>
                <td>{formatRupiah(r.hasilHitung)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr><td colSpan={3}><b>Total</b></td><td><b>{formatRupiah(String(total))}</b></td></tr>
          </tfoot>
        </table>

        <div className="doc-ttd">
          <div>
            <p>Dibuat oleh (Petugas),</p>
            <div className="doc-ttd-box"></div>
            <p>{konfirmasiTerakhir?.nama ?? "________________"}</p>
          </div>
          <div>
            <p>Diperiksa oleh (Checker),</p>
            <div className="doc-ttd-box"></div>
            <p>{checkerTerakhir?.nama ?? "________________"}</p>
          </div>
          <div>
            <p>Disetujui oleh ({isKlienXl ? "User XL" : (header.klien || "Pihak Pertama / Klien")}),</p>
            <div className="doc-ttd-box"></div>
            <p>{header.namaUserXl}</p>
          </div>
        </div>

        <p className="doc-footnote">Dibuat otomatis oleh Invora &middot; IDStar Group — {dok.dibuatPada} &middot; dokumen #{dok.id}</p>
      </div>
    </div>
  );
}
