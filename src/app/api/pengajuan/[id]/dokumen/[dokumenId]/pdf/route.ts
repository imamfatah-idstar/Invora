import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import { PDFDocument, StandardFonts, rgb, PageSizes } from "pdf-lib";
import { db } from "@/db";
import {
  dokumen, pengajuan, pengajuanDetail, personel, po, poLineItem, userXl,
  konfirmasi, checkerReview, users, lampiranPengajuan,
} from "@/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { wajibRoleApi } from "@/lib/require-role-api";
import { LABEL_LAMPIRAN_BALANCE } from "@/lib/lampiran-label";
import { apakahKlienXl } from "@/lib/klien";
import {
  formatTanggalLengkapIndo,
  formatTanggalDokumen,
  formatPeriodeBulan,
  formatRupiahKoma,
  formatHariTanggalIndo,
  formatTanggalSelesaiIndo,
} from "@/lib/xl-document-helpers";

const LABEL_JENIS: Record<string, string> = {
  CAC: "Dokumen CAC (Konfirmasi Pengajuan Invoicing)",
  BAST: "Berita Acara Serah Terima (BAST)",
};

function formatRupiah(nilai: string) {
  return "Rp" + Number(nilai).toLocaleString("id-ID", { minimumFractionDigits: 2 });
}

// Menempelkan satu file (PDF multi-halaman, atau gambar PNG/JPG) sebagai
// halaman tambahan ke dokumen PDF gabungan. File PDF: semua halamannya
// disalin apa adanya. File gambar: ditempatkan di tengah halaman A4.
async function tempelFile(gabungan: PDFDocument, pathRelatif: string) {
  const subPath = pathRelatif.replace(/^[/\\]*uploads[/\\]*/, "");
  const bytes = await readFile(path.join(/*turbopackIgnore: true*/ process.cwd(), "uploads", subPath));
  const ekstensi = path.extname(pathRelatif).toLowerCase();

  if (ekstensi === ".pdf") {
    const sumber = await PDFDocument.load(bytes);
    const halaman = await gabungan.copyPages(sumber, sumber.getPageIndices());
    halaman.forEach((h) => gabungan.addPage(h));
    return;
  }

  const gambar = ekstensi === ".png" ? await gabungan.embedPng(bytes) : await gabungan.embedJpg(bytes);
  const halaman = gabungan.addPage(PageSizes.A4);
  const { width: pw, height: ph } = halaman.getSize();
  const margin = 24;
  const maxW = pw - margin * 2;
  const maxH = ph - margin * 2;
  const skala = Math.min(maxW / gambar.width, maxH / gambar.height, 1);
  const w = gambar.width * skala;
  const h = gambar.height * skala;
  halaman.drawImage(gambar, { x: (pw - w) / 2, y: (ph - h) / 2, width: w, height: h });
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string; dokumenId: string }> }) {
  const gagal = await wajibRoleApi(["petugas", "checker"]);
  if (gagal) return gagal;
  const { id, dokumenId } = await params;
  const pengajuanId = Number(id);

  const [dok] = await db.select().from(dokumen).where(eq(dokumen.id, Number(dokumenId)));
  if (!dok || dok.pengajuanId !== pengajuanId) {
    return NextResponse.json({ error: "Dokumen tidak ditemukan." }, { status: 404 });
  }

  const [header] = await db
    .select({
      periode: pengajuan.periode, versi: pengajuan.versi,
      keteranganTahap: pengajuan.keteranganTahap,
      nilaiGrDisetujui: pengajuan.nilaiGrDisetujui,
      nomorPo: po.nomorPo, namaProyek: po.namaProyek, nilaiItem: po.nilaiItem,
      namaUserXl: userXl.nama, kontakUserXl: userXl.kontak,
      klien: po.klien,
      pathFilePoAsli: po.pathFilePoAsli,
    })
    .from(pengajuan)
    .innerJoin(po, eq(pengajuan.poId, po.id))
    .innerJoin(userXl, eq(pengajuan.userXlId, userXl.id))
    .where(eq(pengajuan.id, pengajuanId));
  if (!header) return NextResponse.json({ error: "Pengajuan tidak ditemukan." }, { status: 404 });

  const isKlienXl = apakahKlienXl(header.klien);

  const { searchParams } = new URL(request.url);
  const pihak1Nama = searchParams.get("pihak1Nama") || header.namaUserXl || (isKlienXl ? "Ratna Tri Wulandari" : "Bpk/Ibu PIC Klien");
  const pihak1Jabatan = searchParams.get("pihak1Jabatan") || header.kontakUserXl || (isKlienXl ? "GM Integration & AI Orchestration" : "Project Manager / PIC");
  const pihak2Nama = searchParams.get("pihak2Nama") || (isKlienXl ? "Dewi Ani Mulyakarti" : "Aris Munandar");
  const pihak2Jabatan = searchParams.get("pihak2Jabatan") || (isKlienXl ? "Finance Manager" : "Account Director");
  const pekerjaan = searchParams.get("pekerjaan") || "Jasa IT";
  const tglDokumen = searchParams.get("tgl") || formatTanggalDokumen();
  const termsPayment = searchParams.get("termsPayment") || "9 Months";
  const contractStatus = searchParams.get("contractStatus") || "Amend Signed";
  const projectLocation = searchParams.get("projectLocation") || "Headquarter";
  const locationSap = searchParams.get("locationSap") || "0010";
  const { periodeFormatted, workCompletedDate } = formatPeriodeBulan(header.periode);
  const workCompleted = searchParams.get("workCompleted") || workCompletedDate;

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

  const [lampiranBalance] = await db
    .select({ pathFile: lampiranPengajuan.pathFile })
    .from(lampiranPengajuan)
    .where(and(eq(lampiranPengajuan.pengajuanId, pengajuanId), eq(lampiranPengajuan.label, LABEL_LAMPIRAN_BALANCE)))
    .orderBy(desc(lampiranPengajuan.id)).limit(1);

  const total = rincian.reduce((acc, r) => acc + Number(r.hasilHitung), 0);

  // ---- BAST Khusus Non-XL (Format resmi mengikuti BAST_NonXL.pdf) ----
  if (!isKlienXl && dok.jenis === "BAST") {
    const bastPdf = await PDFDocument.create();
    const font = await bastPdf.embedFont(StandardFonts.Helvetica);
    const fontBold = await bastPdf.embedFont(StandardFonts.HelveticaBold);
    const fontOblique = await bastPdf.embedFont(StandardFonts.HelveticaOblique);
    const halaman = bastPdf.addPage(PageSizes.A4);
    const { width: pw, height: ph } = halaman.getSize();
    const margin = 48;
    const contentWidth = pw - margin * 2;
    let y = ph - 42;

    const isCimb = header.klien?.toUpperCase().includes("CIMB") || header.klien?.toUpperCase().includes("NIAGA");
    const pihak1NamaNonXl = searchParams.get("pihak1Nama") || (isCimb ? "Budi Oktaviyan Suryanto" : header.namaUserXl || "Budi Oktaviyan Suryanto");
    const pihak1JabatanNonXl = searchParams.get("pihak1Jabatan") || (isCimb ? "Application Development Head - Digital Onboarding & Experience" : header.kontakUserXl || "Application Development Head - Digital Onboarding & Experience");
    const pihak1PerusahaanNonXl = searchParams.get("pihak1Perusahaan") || (isCimb ? "PT. Bank CIMB Niaga Tbk" : (header.klien?.startsWith("PT") ? header.klien : `PT. ${header.klien || "Bank CIMB Niaga Tbk"}`));
    const pihak2NamaNonXl = searchParams.get("pihak2Nama") || "Indah Ananti Affandi";
    const pihak2JabatanNonXl = searchParams.get("pihak2Jabatan") || "Professional Services General Manager";
    const namaKodeProyekNonXl = searchParams.get("namaKodeProyek") || (header.namaProyek || "8116003125 - Rate Bodyshop - Perpanjangan lanjutan untuk project Octo Connect untuk Project Zolos");
    const pekerjaanTahapNonXl = searchParams.get("pekerjaanTahap") || (header.keteranganTahap ? `Tahap ${header.keteranganTahap}` : "Tahap III (5%)");
    const defaultTglSelesai = formatTanggalSelesaiIndo(header.periode) !== "-" ? formatTanggalSelesaiIndo(header.periode) : "30-September-2026";
    const tanggalSelesaiNonXl = searchParams.get("tanggalSelesai") || defaultTglSelesai;
    const tglDokumenNonXl = searchParams.get("tgl") || formatHariTanggalIndo();
    const tanggalTtdNonXl = searchParams.get("tanggalTtd") || "3 Nov 2026";

    // Load Logos & Signatures
    const cimbLogoPath = path.join(process.cwd(), "public", "cimb-niaga-logo.png");
    const idstarLogoPath = path.join(process.cwd(), "public", "idstar-logo-color.png");
    const ttdIndahPath = path.join(process.cwd(), "public", "ttd-indah.png");

    const [cimbBytes, idstarBytes, ttdIndahBytes] = await Promise.all([
      readFile(cimbLogoPath).catch(() => null),
      readFile(idstarLogoPath).catch(() => null),
      readFile(ttdIndahPath).catch(() => null),
    ]);

    // 1. Header Logos
    if (cimbBytes && isCimb) {
      const cimbImg = await bastPdf.embedJpg(cimbBytes).catch(async () => await bastPdf.embedPng(cimbBytes));
      halaman.drawImage(cimbImg, {
        x: margin,
        y: y - 26,
        width: 175,
        height: 27,
      });
    } else {
      halaman.drawText(pihak1PerusahaanNonXl.toUpperCase(), {
        x: margin,
        y: y - 18,
        size: 13,
        font: fontBold,
        color: rgb(0.1, 0.1, 0.1),
      });
    }

    if (idstarBytes) {
      const idstarImg = await bastPdf.embedPng(idstarBytes);
      halaman.drawImage(idstarImg, {
        x: pw - margin - 100,
        y: y - 34,
        width: 100,
        height: 42,
      });
    }

    y -= 54;

    // 2. Title & PO (Centered & Underlined)
    const judul = "BERITA ACARA SERAH TERIMA";
    const judulW = fontBold.widthOfTextAtSize(judul, 14);
    const judulX = (pw - judulW) / 2;
    halaman.drawText(judul, {
      x: judulX,
      y,
      size: 14,
      font: fontBold,
      color: rgb(0.08, 0.08, 0.08),
    });
    halaman.drawLine({
      start: { x: judulX, y: y - 2 },
      end: { x: judulX + judulW, y: y - 2 },
      thickness: 1.2,
      color: rgb(0.08, 0.08, 0.08),
    });

    y -= 18;
    const poStr = header.nomorPo;
    const poW = fontBold.widthOfTextAtSize(poStr, 11);
    const poX = (pw - poW) / 2;
    halaman.drawText(poStr, {
      x: poX,
      y,
      size: 11,
      font: fontBold,
      color: rgb(0.08, 0.08, 0.08),
    });
    halaman.drawLine({
      start: { x: poX, y: y - 2 },
      end: { x: poX + poW, y: y - 2 },
      thickness: 1,
      color: rgb(0.08, 0.08, 0.08),
    });

    y -= 30;

    // 3. Preamble
    const pembuka = `Pada hari ini, ${tglDokumenNonXl} yang bertanda tangan dibawah ini :`;
    halaman.drawText(pembuka, {
      x: margin,
      y,
      size: 9.5,
      font,
      color: rgb(0.1, 0.1, 0.1),
    });

    y -= 18;

    // 4. Pihak Pertama
    halaman.drawText("Nama", { x: margin, y, size: 9.5, font, color: rgb(0.1, 0.1, 0.1) });
    halaman.drawText(":", { x: margin + 65, y, size: 9.5, font, color: rgb(0.1, 0.1, 0.1) });
    halaman.drawText(pihak1NamaNonXl, { x: margin + 75, y, size: 9.5, font: fontBold, color: rgb(0.1, 0.1, 0.1) });

    y -= 14;
    halaman.drawText("Jabatan", { x: margin, y, size: 9.5, font, color: rgb(0.1, 0.1, 0.1) });
    halaman.drawText(":", { x: margin + 65, y, size: 9.5, font, color: rgb(0.1, 0.1, 0.1) });
    halaman.drawText(pihak1JabatanNonXl, { x: margin + 75, y, size: 9.5, font, color: rgb(0.1, 0.1, 0.1) });

    y -= 16;
    halaman.drawText(`Dalam hal ini bertindak untuk dan atas nama ${pihak1PerusahaanNonXl}, dan`, {
      x: margin, y, size: 9.5, font, color: rgb(0.1, 0.1, 0.1),
    });
    y -= 13;
    halaman.drawText("untuk selanjutnya disebut sebagai pihak ", {
      x: margin, y, size: 9.5, font, color: rgb(0.1, 0.1, 0.1),
    });
    halaman.drawText("PERTAMA", {
      x: margin + font.widthOfTextAtSize("untuk selanjutnya disebut sebagai pihak ", 9.5),
      y, size: 9.5, font: fontBold, color: rgb(0.1, 0.1, 0.1),
    });

    y -= 22;

    // 5. Pihak Kedua
    halaman.drawText("Nama", { x: margin, y, size: 9.5, font, color: rgb(0.1, 0.1, 0.1) });
    halaman.drawText(":", { x: margin + 65, y, size: 9.5, font, color: rgb(0.1, 0.1, 0.1) });
    halaman.drawText(pihak2NamaNonXl, { x: margin + 75, y, size: 9.5, font: fontBold, color: rgb(0.1, 0.1, 0.1) });

    y -= 14;
    halaman.drawText("Jabatan", { x: margin, y, size: 9.5, font, color: rgb(0.1, 0.1, 0.1) });
    halaman.drawText(":", { x: margin + 65, y, size: 9.5, font, color: rgb(0.1, 0.1, 0.1) });
    halaman.drawText(pihak2JabatanNonXl, { x: margin + 75, y, size: 9.5, font, color: rgb(0.1, 0.1, 0.1) });

    y -= 16;
    halaman.drawText("Dalam hal ini bertindak untuk dan atas nama PT. IDstar Cipta Teknologi, dan untuk", {
      x: margin, y, size: 9.5, font, color: rgb(0.1, 0.1, 0.1),
    });
    y -= 13;
    halaman.drawText("selanjutnya disebut sebagai pihak ", {
      x: margin, y, size: 9.5, font, color: rgb(0.1, 0.1, 0.1),
    });
    halaman.drawText("KEDUA", {
      x: margin + font.widthOfTextAtSize("selanjutnya disebut sebagai pihak ", 9.5),
      y, size: 9.5, font: fontBold, color: rgb(0.1, 0.1, 0.1),
    });

    y -= 24;

    // 6. Point 1 with Table
    halaman.drawText("1.  Berdasarkan dokumen-dokumen berikut :", {
      x: margin + 12, y, size: 9.5, font, color: rgb(0.1, 0.1, 0.1),
    });

    y -= 14;

    // Table coordinates
    const tblLeft = margin + 28;
    const tblW = contentWidth - 28;
    const col0W = 26;
    const col1W = 150;
    const col2W = tblW - col0W - col1W;

    const thH = 18;
    const rowH = 46;

    // Header border & text
    halaman.drawRectangle({
      x: tblLeft,
      y: y - thH,
      width: tblW,
      height: thH,
      borderColor: rgb(0.1, 0.1, 0.1),
      borderWidth: 0.8,
    });
    halaman.drawLine({ start: { x: tblLeft + col0W, y }, end: { x: tblLeft + col0W, y: y - thH }, thickness: 0.8, color: rgb(0.1, 0.1, 0.1) });
    halaman.drawLine({ start: { x: tblLeft + col0W + col1W, y }, end: { x: tblLeft + col0W + col1W, y: y - thH }, thickness: 0.8, color: rgb(0.1, 0.1, 0.1) });

    halaman.drawText("No", { x: tblLeft + 7, y: y - 12.5, size: 9, font: fontBold, color: rgb(0.1, 0.1, 0.1) });
    halaman.drawText("No PO", { x: tblLeft + col0W + 8, y: y - 12.5, size: 9, font: fontBold, color: rgb(0.1, 0.1, 0.1) });
    halaman.drawText("Nama / Kode Proyek", { x: tblLeft + col0W + col1W + 8, y: y - 12.5, size: 9, font: fontBold, color: rgb(0.1, 0.1, 0.1) });

    y -= thH;

    // Data Row
    halaman.drawRectangle({
      x: tblLeft,
      y: y - rowH,
      width: tblW,
      height: rowH,
      borderColor: rgb(0.1, 0.1, 0.1),
      borderWidth: 0.8,
    });
    halaman.drawLine({ start: { x: tblLeft + col0W, y }, end: { x: tblLeft + col0W, y: y - rowH }, thickness: 0.8, color: rgb(0.1, 0.1, 0.1) });
    halaman.drawLine({ start: { x: tblLeft + col0W + col1W, y }, end: { x: tblLeft + col0W + col1W, y: y - rowH }, thickness: 0.8, color: rgb(0.1, 0.1, 0.1) });

    halaman.drawText("1", { x: tblLeft + 10, y: y - 14, size: 9, font, color: rgb(0.1, 0.1, 0.1) });
    halaman.drawText(header.nomorPo, { x: tblLeft + col0W + 8, y: y - 14, size: 8.8, font: fontBold, color: rgb(0.1, 0.1, 0.1) });

    // Multi-line wrap for project name
    const maxProjectW = col2W - 16;
    const kataProyek = namaKodeProyekNonXl.split(" ");
    let barisProyek1 = "";
    let barisProyek2 = "";
    let barisProyek3 = "";
    for (const w of kataProyek) {
      if (!barisProyek2 && font.widthOfTextAtSize(`${barisProyek1} ${w}`.trim(), 8.8) <= maxProjectW) {
        barisProyek1 = `${barisProyek1} ${w}`.trim();
      } else if (!barisProyek3 && font.widthOfTextAtSize(`${barisProyek2} ${w}`.trim(), 8.8) <= maxProjectW) {
        barisProyek2 = `${barisProyek2} ${w}`.trim();
      } else {
        barisProyek3 = `${barisProyek3} ${w}`.trim();
      }
    }

    halaman.drawText(barisProyek1, { x: tblLeft + col0W + col1W + 8, y: y - 14, size: 8.8, font, color: rgb(0.1, 0.1, 0.1) });
    if (barisProyek2) {
      halaman.drawText(barisProyek2, { x: tblLeft + col0W + col1W + 8, y: y - 26, size: 8.8, font, color: rgb(0.1, 0.1, 0.1) });
    }
    if (barisProyek3) {
      halaman.drawText(barisProyek3, { x: tblLeft + col0W + col1W + 8, y: y - 38, size: 8.8, font, color: rgb(0.1, 0.1, 0.1) });
    }

    y -= rowH + 18;

    // 7. Point 2
    halaman.drawText(`2.  Pihak Pertama telah menyelesaikan pekerjaan ${pekerjaanTahapNonXl} sampai tanggal`, {
      x: margin + 12, y, size: 9.5, font, color: rgb(0.1, 0.1, 0.1),
    });
    y -= 13;
    const tglSelesaiW = font.widthOfTextAtSize(tanggalSelesaiNonXl, 9.5);
    const indent2 = margin + 28;
    halaman.drawText(tanggalSelesaiNonXl, {
      x: indent2, y, size: 9.5, font, color: rgb(0.1, 0.1, 0.1),
    });
    halaman.drawLine({
      start: { x: indent2, y: y - 1.5 },
      end: { x: indent2 + tglSelesaiW, y: y - 1.5 },
      thickness: 0.8,
      color: rgb(0.1, 0.1, 0.1),
    });
    halaman.drawText(" sudah selesai dilakukan.", {
      x: indent2 + tglSelesaiW, y, size: 9.5, font, color: rgb(0.1, 0.1, 0.1),
    });

    y -= 18;

    // 8. Point 3
    halaman.drawText("3.  Dokumen BAST ini merupakan dokumen kelengkapan dan syarat pembayaran", {
      x: margin + 12, y, size: 9.5, font, color: rgb(0.1, 0.1, 0.1),
    });
    y -= 13;
    halaman.drawText("untuk pihak KEDUA.", {
      x: margin + 28, y, size: 9.5, font, color: rgb(0.1, 0.1, 0.1),
    });

    y -= 22;

    // 9. Closing Statement
    halaman.drawText("Demikian Berita Acara ini dibuat dan ditandatangani oleh para pihak untuk", {
      x: margin, y, size: 9.5, font, color: rgb(0.1, 0.1, 0.1),
    });
    y -= 13;
    halaman.drawText("dipergunakan sebagaimana mestinya.", {
      x: margin, y, size: 9.5, font, color: rgb(0.1, 0.1, 0.1),
    });

    y -= 36;

    // 10. Signatures: 2 Columns
    const ttdCol1X = margin + 60;
    const ttdCol2X = pw - margin - 190;

    halaman.drawText("Pihak Pertama", { x: ttdCol1X + 18, y, size: 9.5, font, color: rgb(0.1, 0.1, 0.1) });
    halaman.drawText("Pihak Kedua", { x: ttdCol2X + 28, y, size: 9.5, font, color: rgb(0.1, 0.1, 0.1) });

    y -= 14;
    const p1CorpW = fontBold.widthOfTextAtSize(pihak1PerusahaanNonXl, 9.5);
    halaman.drawText(pihak1PerusahaanNonXl, { x: ttdCol1X + (100 - p1CorpW) / 2, y, size: 9.5, font: fontBold, color: rgb(0.1, 0.1, 0.1) });
    halaman.drawText("PT. IDstar Cipta Teknologi", { x: ttdCol2X, y, size: 9.5, font: fontBold, color: rgb(0.1, 0.1, 0.1) });

    // Signature marks space
    y -= 48;
    if (ttdIndahBytes) {
      const ttdImg = await bastPdf.embedPng(ttdIndahBytes);
      halaman.drawImage(ttdImg, {
        x: ttdCol2X + 15,
        y: y - 5,
        width: 80,
        height: 48,
      });
    }

    // Date on Pihak Pertama signature
    halaman.drawText(tanggalTtdNonXl, {
      x: ttdCol1X + 25,
      y: y + 10,
      size: 9.5,
      font: fontOblique,
      color: rgb(0.3, 0.3, 0.3),
    });

    y -= 16;
    halaman.drawText(pihak1NamaNonXl, { x: ttdCol1X + 8, y, size: 9.5, font: fontBold, color: rgb(0.1, 0.1, 0.1) });
    halaman.drawText(pihak2NamaNonXl, { x: ttdCol2X + 16, y, size: 9.5, font: fontBold, color: rgb(0.1, 0.1, 0.1) });

    y -= 13;
    const p1JabLines = pihak1JabatanNonXl.length > 38 ? [
      pihak1JabatanNonXl.slice(0, 38),
      pihak1JabatanNonXl.slice(38)
    ] : [pihak1JabatanNonXl];

    p1JabLines.forEach((jl, idx) => {
      halaman.drawText(jl.trim(), {
        x: ttdCol1X - 20,
        y: y - idx * 11,
        size: 8.5,
        font,
        color: rgb(0.2, 0.2, 0.2),
      });
    });

    halaman.drawText(pihak2JabatanNonXl, { x: ttdCol2X - 10, y, size: 8.5, font, color: rgb(0.2, 0.2, 0.2) });

    const pdfBytes = await bastPdf.save();
    return new NextResponse(Buffer.from(pdfBytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="BAST-NonXL-${header.nomorPo}-${header.periode}.pdf"`,
      },
    });
  }

  // Load official images if available
  const xlLogoPath = path.join(process.cwd(), "public", "xlsmart-logo.png");
  const idstarStampPath = path.join(process.cwd(), "public", "idstar-stamp.png");
  const [xlLogoBytes, idstarStampBytes] = await Promise.all([
    readFile(xlLogoPath).catch(() => null),
    readFile(idstarStampPath).catch(() => null),
  ]);

  // =========================================================================
  // 1. FORMAT BAST KHUSUS XL (MENGIKUTI BAST_PO.pdf)
  // =========================================================================
  if (isKlienXl && dok.jenis === "BAST") {
    const gabungan = await PDFDocument.create();
    const font = await gabungan.embedFont(StandardFonts.Helvetica);
    const fontBold = await gabungan.embedFont(StandardFonts.HelveticaBold);
    const idstarStampImg = idstarStampBytes ? await gabungan.embedPng(idstarStampBytes).catch(() => null) : null;

    const hal1 = gabungan.addPage(PageSizes.A4);
    const { width: pw, height: ph } = hal1.getSize();
    const marginX = 65;
    const tglInfo = formatTanggalLengkapIndo();
    const teksPeriodeFinal = header.keteranganTahap
      ? `${periodeFormatted} (${header.keteranganTahap})`
      : periodeFormatted;

    // Header Kiri
    let y = ph - 45;
    hal1.drawText("PT XLSMART Telecom Sejahtera Tbk", { x: marginX, y, size: 10.5, font: fontBold });
    y -= 14;
    hal1.drawText("XL Axiata Tower", { x: marginX, y, size: 9, font });
    y -= 12;
    hal1.drawText("Jl. HR Rasuna Said Blok X5 Kav.11-12", { x: marginX, y, size: 9, font });
    y -= 12;
    hal1.drawText("Kuningan Timur, Setiabudi, Jakarta Selatan", { x: marginX, y, size: 9, font });
    y -= 12;
    hal1.drawText("DKI Jakarta Raya 12950 Indonesia", { x: marginX, y, size: 9, font });

    // Judul Dokumen (Tengah)
    y -= 38;
    const judulBast = "BERITA ACARA SERAH TERIMA";
    const judulBastW = fontBold.widthOfTextAtSize(judulBast, 14);
    hal1.drawText(judulBast, { x: (pw - judulBastW) / 2, y, size: 14, font: fontBold });
    y -= 16;
    const dateOfCreation = `Date of Creation : ${tglDokumen}`;
    const docW = font.widthOfTextAtSize(dateOfCreation, 10);
    hal1.drawText(dateOfCreation, { x: (pw - docW) / 2, y, size: 10, font });

    // Paragraf Pembuka
    y -= 32;
    hal1.drawText(`Pada hari ini ${tglInfo.hari}, tanggal ${tglInfo.tglTerbilang}, bulan ${tglInfo.bulan}, tahun ${tglInfo.tahunTerbilang},`, {
      x: marginX, y, size: 9.5, font,
    });
    y -= 14;
    hal1.drawText("kami yang bertandatangan di bawah ini :", { x: marginX, y, size: 9.5, font });

    // Pihak 1 (XL)
    y -= 24;
    hal1.drawText("1.", { x: marginX + 15, y, size: 9.5, font: fontBold });
    hal1.drawText(pihak1Nama, { x: marginX + 35, y, size: 9.5, font: fontBold });
    hal1.drawText(`: ${pihak1Jabatan}`, { x: marginX + 185, y, size: 9.5, font });
    y -= 14;
    hal1.drawText("PT XL Smart Telecom Sejahtera Tbk", { x: marginX + 192, y, size: 9.5, font });
    y -= 13;
    hal1.drawText("Jalan HR Rasuna Said X5 Kav. 11-12, Kuningan", { x: marginX + 192, y, size: 9.5, font });
    y -= 13;
    hal1.drawText("Timur, Setiabudi, Jakarta Selatan, 12950", { x: marginX + 192, y, size: 9.5, font });

    // Pihak 2 (IDStar)
    y -= 20;
    hal1.drawText("2.", { x: marginX + 15, y, size: 9.5, font: fontBold });
    hal1.drawText(pihak2Nama, { x: marginX + 35, y, size: 9.5, font: fontBold });
    hal1.drawText(`: ${pihak2Jabatan} PT ID Star Teknologi`, { x: marginX + 185, y, size: 9.5, font });
    y -= 14;
    hal1.drawText("Wisma Staco Lt 7, Jalan Casablanca Kav. 18 Menteng", { x: marginX + 192, y, size: 9.5, font });
    y -= 13;
    hal1.drawText("Dalam Tebet, Jakarta Selatan 12870", { x: marginX + 192, y, size: 9.5, font });

    // Pemeriksaan Pekerjaan
    y -= 26;
    hal1.drawText("Telah melaksanakan pemeriksaan atas pelaksanaan dari :", { x: marginX, y, size: 9.5, font });
    y -= 18;
    hal1.drawText("Pekerjaan", { x: marginX, y, size: 9.5, font });
    hal1.drawText(`: ${pekerjaan}`, { x: marginX + 185, y, size: 9.5, font });
    y -= 14;
    hal1.drawText("No. PO", { x: marginX, y, size: 9.5, font });
    hal1.drawText(`: ${header.nomorPo}`, { x: marginX + 185, y, size: 9.5, font });

    // Pernyataan / Deklarasi
    y -= 26;
    hal1.drawText(`Dengan ini menyatakan dengan sebenarnya bahwa selama pelaksanaan periode ${teksPeriodeFinal}.`, {
      x: marginX, y, size: 9.5, font,
    });
    y -= 18;
    hal1.drawText("-", { x: marginX, y, size: 9.5, font });
    hal1.drawText("Supplier yang bersangkutan telah menyelesaikan pekerjaan sesuai dengan yang diisyaratkan", {
      x: marginX + 14, y, size: 9.5, font,
    });
    y -= 14;
    hal1.drawText("-", { x: marginX, y, size: 9.5, font });
    hal1.drawText("Selama masa pelaksanaan tidak pernah melakukan kelalaian", {
      x: marginX + 14, y, size: 9.5, font,
    });

    // Penutup
    y -= 24;
    hal1.drawText("Demikian Berita Acara ini dibuat dengan sebenarnya dan dalam rangkap 2 (dua)", {
      x: marginX, y, size: 9.5, font,
    });
    y -= 13;
    hal1.drawText("untuk dapat digunakan sebagaimana mestinya.", { x: marginX, y, size: 9.5, font });

    // Tanda Tangan Side-by-Side
    y -= 54;
    const ttdKiriX = marginX + 10;
    const ttdKananX = marginX + 270;
    hal1.drawText("PT IDStar Teknologi", { x: ttdKiriX, y, size: 10, font: fontBold });
    hal1.drawText("PT XLSMART Telecom Sejahtera Tbk", { x: ttdKananX, y, size: 10, font: fontBold });

    // Stampel IDStar
    if (idstarStampImg) {
      hal1.drawImage(idstarStampImg, {
        x: ttdKiriX,
        y: y - 48,
        width: 105,
        height: 33,
      });
    }

    y -= 62;
    hal1.drawText(pihak2Nama, { x: ttdKiriX, y, size: 9.5, font: fontBold });
    hal1.drawText(pihak1Nama, { x: ttdKananX, y, size: 9.5, font: fontBold });
    // Underline nama
    const p2W = fontBold.widthOfTextAtSize(pihak2Nama, 9.5);
    const p1W = fontBold.widthOfTextAtSize(pihak1Nama, 9.5);
    hal1.drawLine({ start: { x: ttdKiriX, y: y - 2 }, end: { x: ttdKiriX + p2W, y: y - 2 }, thickness: 0.75, color: rgb(0, 0, 0) });
    hal1.drawLine({ start: { x: ttdKananX, y: y - 2 }, end: { x: ttdKananX + p1W, y: y - 2 }, thickness: 0.75, color: rgb(0, 0, 0) });

    y -= 13;
    hal1.drawText(pihak2Jabatan, { x: ttdKiriX, y, size: 8.5, font });
    hal1.drawText(pihak1Jabatan, { x: ttdKananX, y, size: 8.5, font });

    // Footer
    hal1.drawText("Confidential and Proprietary to PT XLSMART Telecom Sejahtera Tbk", {
      x: marginX, y: 45, size: 7.5, font, color: rgb(0.35, 0.35, 0.35),
    });

    // Lampiran Balance PO (Halaman 2)
    if (lampiranBalance?.pathFile) {
      await tempelFile(gabungan, lampiranBalance.pathFile).catch(() => {});
    }

    // Dokumen PO Asli (Halaman 3+)
    if (header.pathFilePoAsli) {
      await tempelFile(gabungan, header.pathFilePoAsli).catch(() => {});
    }

    const pdfBytes = await gabungan.save();
    return new NextResponse(Buffer.from(pdfBytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="BAST-XL-${header.nomorPo}-${header.periode}.pdf"`,
      },
    });
  }

  // =========================================================================
  // 2. FORMAT CAC KHUSUS XL (MENGIKUTI CAC_PO.pdf)
  // =========================================================================
  if (isKlienXl && dok.jenis === "CAC") {
    const gabungan = await PDFDocument.create();
    const font = await gabungan.embedFont(StandardFonts.Helvetica);
    const fontBold = await gabungan.embedFont(StandardFonts.HelveticaBold);
    const xlLogoImg = xlLogoBytes ? await gabungan.embedPng(xlLogoBytes).catch(() => null) : null;
    const idstarStampImg = idstarStampBytes ? await gabungan.embedPng(idstarStampBytes).catch(() => null) : null;

    const hal1 = gabungan.addPage(PageSizes.A4);
    const { width: pw, height: ph } = hal1.getSize();
    const marginX = 70;
    let y = ph - 50;

    // Logo XLSMART di kanan atas
    if (xlLogoImg) {
      hal1.drawImage(xlLogoImg, {
        x: pw - marginX - 115,
        y: y - 10,
        width: 115,
        height: 26,
      });
    }

    // Judul Dokumen (Tengah)
    y -= 36;
    const judulCac = "COMMERCIAL ACCEPTANCE CERTIFICATE";
    const judulCacW = fontBold.widthOfTextAtSize(judulCac, 13.5);
    hal1.drawText(judulCac, { x: (pw - judulCacW) / 2, y, size: 13.5, font: fontBold });

    // Grid Metadata
    y -= 32;
    const xKey = marginX;
    const xVal = marginX + 165;
    const barisMeta: [string, string][] = [
      ["Date of Creation", `: ${tglDokumen}`],
      ["Supplier Name", ": PT. IDStar Cipta Teknologi"],
      ["Status of Acceptance", ": 100 %"],
      ["Project Name", `: ${header.namaProyek}`],
      ["Contract Status", `: ${contractStatus}`],
      ["Terms Payment", `: ${termsPayment}`],
      ["Purchase Order", `: ${header.nomorPo}`],
      ["Project Location", `: ${projectLocation}`],
      ["Functional Location in SAP", `: ${locationSap}`],
      ["Work Completed", `: ${workCompleted}`],
      ["PO Value", `: ${formatRupiahKoma(header.nilaiItem)}`],
      ["GR Value", `: ${formatRupiahKoma(header.nilaiGrDisetujui || total)}`],
      ["Type of Project", ": Services"],
      ["Delivery Date (for Material)", ":"],
      ["Receipt Date (for Material)", ":"],
    ];

    for (const [k, v] of barisMeta) {
      hal1.drawText(k, { x: xKey, y, size: 9, font });
      hal1.drawText(v, { x: xVal, y, size: 9, font });
      y -= 13.5;
    }

    // Certification Clause
    y -= 16;
    hal1.drawText("Certification:", { x: marginX, y, size: 9, font: fontBold });
    // Garis bawah Certification:
    const certW = fontBold.widthOfTextAtSize("Certification:", 9);
    hal1.drawLine({ start: { x: marginX, y: y - 1.5 }, end: { x: marginX + certW, y: y - 1.5 }, thickness: 0.75, color: rgb(0, 0, 0) });

    y -= 14;
    hal1.drawText("This is to certify that PT XLSMART Telecom Sejahtera Tbk has accepted the Product or Services", {
      x: marginX, y, size: 8.5, font,
    });
    y -= 11.5;
    hal1.drawText("as identified in Purchase Order referenced above.", {
      x: marginX, y, size: 8.5, font,
    });

    y -= 16;
    hal1.drawText("With the approval by both party, The Supplier entitle to issue invoice starting from the date of", {
      x: marginX, y, size: 8.5, font,
    });
    y -= 11.5;
    hal1.drawText("vendor approved date and PT XLSMART Telecom Sejahtera Tbk will release payment as stated", {
      x: marginX, y, size: 8.5, font,
    });
    y -= 11.5;
    hal1.drawText("in the Value of GR.", {
      x: marginX, y, size: 8.5, font,
    });

    // Dual Signatures matching CAC_PO.pdf
    y -= 42;
    const xLine = marginX + 230;

    // Supplier Signatory (Dewi Ani Mulyakarti)
    hal1.drawText(pihak2Nama, { x: marginX, y, size: 9, font: fontBold });
    hal1.drawText("_______________________________", { x: xLine, y, size: 9, font });
    // Embed Stamp above date
    if (idstarStampImg) {
      hal1.drawImage(idstarStampImg, {
        x: xLine + 40,
        y: y - 2,
        width: 80,
        height: 25,
      });
    }
    y -= 13;
    hal1.drawText(pihak2Jabatan, { x: marginX, y, size: 8.5, font });
    hal1.drawText(`Date: ${tglDokumen}`, { x: xLine, y, size: 8.5, font });

    // Client Signatory (Ratna Tri Wulandari)
    y -= 34;
    hal1.drawText(pihak1Nama, { x: marginX, y, size: 9, font: fontBold });
    hal1.drawText("_______________________________", { x: xLine, y, size: 9, font });
    y -= 13;
    hal1.drawText(pihak1Jabatan, { x: marginX, y, size: 8.5, font });
    hal1.drawText("Date:", { x: xLine, y, size: 8.5, font });

    // Footer
    hal1.drawText("Confidential and Proprietary to PT XL AXIATA Tbk.", {
      x: marginX, y: 48, size: 7.5, font, color: rgb(0.35, 0.35, 0.35),
    });
    hal1.drawText("This slip can be used as supporting document for invoice submission to XL.", {
      x: marginX, y: 38, size: 7.5, font, color: rgb(0.35, 0.35, 0.35),
    });

    // Lampiran Balance PO (Halaman 2)
    if (lampiranBalance?.pathFile) {
      await tempelFile(gabungan, lampiranBalance.pathFile).catch(() => {});
    }

    // Dokumen PO Asli (Halaman 3+)
    if (header.pathFilePoAsli) {
      await tempelFile(gabungan, header.pathFilePoAsli).catch(() => {});
    }

    const pdfBytes = await gabungan.save();
    return new NextResponse(Buffer.from(pdfBytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="CAC-XL-${header.nomorPo}-${header.periode}.pdf"`,
      },
    });
  }

  // =========================================================================
  // 3. FALLBACK / FORMAT STANDAR LAINNYA
  // =========================================================================
  const gabungan = await PDFDocument.create();
  const font = await gabungan.embedFont(StandardFonts.Helvetica);
  const fontBold = await gabungan.embedFont(StandardFonts.HelveticaBold);
  const halaman1 = gabungan.addPage(PageSizes.A4);
  const { width: pw } = halaman1.getSize();
  const margin = 40;
  let y = halaman1.getSize().height - margin;

  function teks(isi: string, opsi: { x?: number; size?: number; bold?: boolean; warna?: [number, number, number] } = {}) {
    halaman1.drawText(isi, {
      x: opsi.x ?? margin, y, size: opsi.size ?? 10,
      font: opsi.bold ? fontBold : font,
      color: opsi.warna ? rgb(...opsi.warna) : rgb(0, 0, 0),
    });
  }
  function baris(tinggi = 16) { y -= tinggi; }

  teks("IDStar Group", { size: 9, warna: [0.45, 0.45, 0.45] });
  baris(18);
  teks(LABEL_JENIS[dok.jenis] ?? dok.jenis, { size: 15, bold: true });
  baris(16);
  teks(`Status dokumen: DRAFT — versi pengajuan ${dok.versi}`, { size: 9, warna: [0.4, 0.4, 0.4] });
  baris(22);

  const infoBaris: [string, string][] = [
    ["Nomor PO", header.nomorPo],
    ["Nama Proyek", header.namaProyek],
    ...(header.klien ? [["Klien", header.klien] as [string, string]] : []),
    [isKlienXl ? "User XL" : "User Klien / PIC", header.namaUserXl],
    ["Periode", header.periode],
    ...(header.keteranganTahap ? [["Tagihan Tahap", header.keteranganTahap] as [string, string]] : []),
    ["Dikonfirmasi Petugas", konfirmasiTerakhir ? `${konfirmasiTerakhir.nama} — ${konfirmasiTerakhir.waktu}` : "-"],
    ["Diperiksa Checker", checkerTerakhir ? `${checkerTerakhir.nama} — ${checkerTerakhir.waktu}` : "-"],
  ];
  for (const [label, nilai] of infoBaris) {
    teks(label, { size: 10, warna: [0.35, 0.35, 0.35] });
    teks(nilai, { x: margin + 160, size: 10, bold: true });
    baris(16);
  }
  baris(6);

  if (dok.jenis === "BAST") {
    const narasi = `Dengan ini menyatakan bahwa jasa personel berikut telah dilaksanakan sesuai PO ${header.nomorPo} untuk proyek ${header.namaProyek} ${header.keteranganTahap ? `pada ${header.keteranganTahap} (periode ${header.periode})` : `pada periode ${header.periode}`}, dan diserahterimakan sesuai rincian di bawah ini.`;
    const maxLebar = pw - margin * 2;
    const kata = narasi.split(" ");
    let baru = "";
    const lines: string[] = [];
    for (const k of kata) {
      const coba = baru ? `${baru} ${k}` : k;
      if (font.widthOfTextAtSize(coba, 9.5) > maxLebar) { lines.push(baru); baru = k; } else { baru = coba; }
    }
    if (baru) lines.push(baru);
    for (const l of lines) { teks(l, { size: 9.5 }); baris(13); }
    baris(6);
  }

  const kolom = [margin, margin + 170, margin + 260, margin + 380];
  teks("Personel", { x: kolom[0], size: 9.5, bold: true });
  teks("Rate", { x: kolom[1], size: 9.5, bold: true });
  teks("Hari Ditagihkan/Acuan", { x: kolom[2], size: 9.5, bold: true });
  teks("Hasil Hitung", { x: kolom[3], size: 9.5, bold: true });
  baris(4);
  halaman1.drawLine({ start: { x: margin, y }, end: { x: pw - margin, y }, thickness: 0.75, color: rgb(0.7, 0.7, 0.7) });
  baris(14);

  for (const r of rincian) {
    teks(r.namaPersonel, { x: kolom[0], size: 9 });
    teks(formatRupiah(r.nilaiRateDipakai), { x: kolom[1], size: 9 });
    teks(r.hariKerjaAcuanBulan === 0 ? "-" : `${r.hariKerjaDapatDitagihkan} / ${r.hariKerjaAcuanBulan}`, { x: kolom[2], size: 9 });
    teks(formatRupiah(r.hasilHitung), { x: kolom[3], size: 9 });
    baris(14);
  }
  baris(4);
  halaman1.drawLine({ start: { x: margin, y }, end: { x: pw - margin, y }, thickness: 0.75, color: rgb(0.7, 0.7, 0.7) });
  baris(16);
  teks("Total", { x: kolom[2], size: 10, bold: true });
  teks(formatRupiah(String(total)), { x: kolom[3], size: 10, bold: true });
  baris(50);

  const ttdKolom = [margin, margin + 180, margin + 360];
  const ttdLabel = ["Dibuat oleh (Petugas),", "Diperiksa oleh (Checker),", `Disetujui oleh (${isKlienXl ? "User XL" : (header.klien || "Pihak Pertama")}),`];
  const ttdNama = [konfirmasiTerakhir?.nama ?? "________________", checkerTerakhir?.nama ?? "________________", header.namaUserXl];
  ttdLabel.forEach((l, i) => teks(l, { x: ttdKolom[i], size: 9 }));
  baris(45);
  ttdNama.forEach((n, i) => teks(n, { x: ttdKolom[i], size: 9.5, bold: true }));
  baris(24);
  teks(`Dibuat otomatis oleh Invora · IDStar Group — ${dok.dibuatPada} · dokumen #${dok.id}`, { size: 7.5, warna: [0.55, 0.55, 0.55] });

  // ---- Halaman 2: potongan Lampiran Balance PO (dari spreadsheet) ----
  if (lampiranBalance?.pathFile) {
    await tempelFile(gabungan, lampiranBalance.pathFile).catch(() => {});
  }

  // ---- Halaman 3+: dokumen PO asli (sekali unggah per PO, dipakai ulang) ----
  if (header.pathFilePoAsli) {
    await tempelFile(gabungan, header.pathFilePoAsli).catch(() => {});
  }

  const pdfBytes = await gabungan.save();
  return new NextResponse(Buffer.from(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${dok.jenis}-${header.nomorPo}-${header.periode}.pdf"`,
    },
  });
}
