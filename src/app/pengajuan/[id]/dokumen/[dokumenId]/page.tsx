import { db } from "@/db";
import {
  dokumen, pengajuan, pengajuanDetail, personel, po, poLineItem, userXl,
  konfirmasi, checkerReview, users, lampiranPengajuan,
} from "@/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { notFound } from "next/navigation";
import Link from "next/link";
import TombolCetak from "./tombol-cetak";
import Logo from "@/components/logo";
import { LABEL_LAMPIRAN_BALANCE } from "@/lib/lampiran-label";
import { apakahKlienXl } from "@/lib/klien";
import BastNonXlView from "./bast-non-xl-view";

function formatRupiah(nilai: string) {
  return "Rp" + Number(nilai).toLocaleString("id-ID", { minimumFractionDigits: 2 });
}

const LABEL_JENIS: Record<string, string> = {
  CAC: "Dokumen CAC (Konfirmasi Pengajuan Invoicing)",
  BAST: "Berita Acara Serah Terima (BAST)",
};

export default async function HalamanDokumen({ params }: { params: Promise<{ id: string; dokumenId: string }> }) {
  const { id, dokumenId } = await params;
  const pengajuanId = Number(id);

  const [dok] = await db.select().from(dokumen).where(eq(dokumen.id, Number(dokumenId)));
  if (!dok || dok.pengajuanId !== pengajuanId) notFound();

  const [header] = await db
    .select({
      periode: pengajuan.periode, versi: pengajuan.versi,
      keteranganTahap: pengajuan.keteranganTahap,
      nomorPo: po.nomorPo, namaProyek: po.namaProyek, namaUserXl: userXl.nama,
      klien: po.klien,
    })
    .from(pengajuan)
    .innerJoin(po, eq(pengajuan.poId, po.id))
    .innerJoin(userXl, eq(pengajuan.userXlId, userXl.id))
    .where(eq(pengajuan.id, pengajuanId));
  if (!header) notFound();

  const isKlienXl = apakahKlienXl(header.klien);

  const [poRow] = await db.select({ pathFilePoAsli: po.pathFilePoAsli }).from(po).where(eq(po.nomorPo, header.nomorPo));
  const [lampiranBalance] = await db
    .select({ id: lampiranPengajuan.id })
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

  // Jika klien Non-XL dan dokumen adalah BAST, gunakan format BAST Non-XL khusus (1 halaman, klausul resmi 2 pihak)
  if (!isKlienXl && dok.jenis === "BAST") {
    return (
      <BastNonXlView
        pengajuanId={pengajuanId}
        dokumenId={dok.id}
        dokumenVersi={dok.versi}
        nomorPo={header.nomorPo}
        namaProyek={header.namaProyek}
        klien={header.klien}
        periode={header.periode}
        keteranganTahap={header.keteranganTahap}
        defaultPihakPertama={header.namaUserXl}
        defaultPihakKedua={konfirmasiTerakhir?.nama ?? "Aris Munandar"}
        rincian={rincian}
        total={total}
        dibuatPada={dok.dibuatPada}
      />
    );
  }

  return (
    <div className="doc-page">
      <div className="doc-toolbar no-print">
        <Link href={`/pengajuan/${pengajuanId}`} className="back-link">&larr; Detail Pengajuan</Link>
        <TombolCetak />
        <a href={`/api/pengajuan/${pengajuanId}/dokumen/${dok.id}/pdf`} target="_blank" className="btn btn-primary">
          Unduh PDF Gabungan{kelengkapanPdfLengkap ? " (3 hal.)" : ""}
        </a>
      </div>
      {!kelengkapanPdfLengkap && (
        <div className="alert alert-warning no-print">
          PDF gabungan akan tetap dibuat, tapi baru berisi halaman sertifikat saja —
          {!lampiranBalance && " belum ada lampiran berlabel \"" + LABEL_LAMPIRAN_BALANCE + "\" untuk halaman 2,"}
          {!poRow?.pathFilePoAsli && " belum ada Dokumen PO Asli untuk halaman 3."}
          {" "}Lengkapi dulu di kartu &quot;Kelengkapan Dokumen&quot; / Data Referensi · PO.
        </div>
      )}

      <div className="alert alert-warning no-print">
        <b>Draf internal.</b> Dokumen ini dibuat otomatis dari data pengajuan, mengikuti template resmi
        CAC/BAST yang sudah dikonfirmasi (lihat PROJECT_INSTRUCTIONS.md bagian 25). Statusnya tetap draf
        karena pengajuan RESMI ke XL masih lewat Get Approve CAC / COUPA secara manual (otomasi ke sana
        belum dibangun) — dokumen ini hanya bantuan pratinjau/cetak internal.
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
