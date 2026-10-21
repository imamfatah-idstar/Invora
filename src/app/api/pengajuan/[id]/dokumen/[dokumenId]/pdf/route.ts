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
      nomorPo: po.nomorPo, namaProyek: po.namaProyek, namaUserXl: userXl.nama,
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
  const pihak1Nama = searchParams.get("pihak1Nama") || header.namaUserXl || "Bpk/Ibu PIC Klien";
  const pihak1Jabatan = searchParams.get("pihak1Jabatan") || "Project Manager / PIC";
  const pihak2Nama = searchParams.get("pihak2Nama") || "Aris Munandar";
  const pihak2Jabatan = searchParams.get("pihak2Jabatan") || "Account Director";
  const tglDokumen = searchParams.get("tgl") || "21 Oktober 2026";

  const rincian = await db
    .select({
      namaPersonel: personel.nama,
      hariKerjaDapatDitagihkan: pengajuanDetail.hariKerjaDapatDitagihkan,
      hariKerjaAcuanBulan: pengajuanDetail.hariKerjaAcuanBulan,
      nilaiRateDipakai: pengajuanDetail.nilaiRateDipakai, hasilHitung: pengajuanDetail.hasilHitung,
      nomorLine: poLineItem.nomorLine,
      deskripsiLine: poLineItem.deskripsi,
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

  // ---- BAST Khusus Non-XL (Format resmi 1 halaman, 2 pihak) ----
  if (!isKlienXl && dok.jenis === "BAST") {
    const bastPdf = await PDFDocument.create();
    const font = await bastPdf.embedFont(StandardFonts.Helvetica);
    const fontBold = await bastPdf.embedFont(StandardFonts.HelveticaBold);
    const halaman = bastPdf.addPage(PageSizes.A4);
    const { width: pw, height: ph } = halaman.getSize();
    const margin = 42;
    let y = ph - margin;

    function teksNonXl(isi: string, opsi: { x?: number; size?: number; bold?: boolean; warna?: [number, number, number] } = {}) {
      halaman.drawText(isi, {
        x: opsi.x ?? margin, y, size: opsi.size ?? 9.5,
        font: opsi.bold ? fontBold : font,
        color: opsi.warna ? rgb(...opsi.warna) : rgb(0.1, 0.1, 0.1),
      });
    }
    function barisNonXl(tinggi = 14) { y -= tinggi; }

    const namaKlienResmi = header.klien || "KLIEN MITRA";

    // Header Klien & IDStar
    teksNonXl(namaKlienResmi.toUpperCase(), { size: 12, bold: true });
    const idstarW = fontBold.widthOfTextAtSize("PT IDSTAR CIPTA TEKNOLOGI", 11);
    teksNonXl("PT IDSTAR CIPTA TEKNOLOGI", { x: pw - margin - idstarW, size: 11, bold: true, warna: [0.8, 0.1, 0.1] });
    barisNonXl(16);
    halaman.drawLine({ start: { x: margin, y }, end: { x: pw - margin, y }, thickness: 1.5, color: rgb(0.15, 0.15, 0.15) });
    barisNonXl(18);

    // Judul Dokumen
    const judul = "BERITA ACARA SERAH TERIMA PEKERJAAN";
    const judulW = fontBold.widthOfTextAtSize(judul, 13);
    teksNonXl(judul, { x: (pw - judulW) / 2, size: 13, bold: true });
    barisNonXl(14);
    const noBast = `Nomor: BAST/${header.nomorPo}/${header.periode}/${dok.id}`;
    const noBastW = font.widthOfTextAtSize(noBast, 9.5);
    teksNonXl(noBast, { x: (pw - noBastW) / 2, size: 9.5, bold: true, warna: [0.3, 0.3, 0.3] });
    barisNonXl(13);
    const poSub = `Purchase Order (PO): ${header.nomorPo} · Proyek: ${header.namaProyek}`;
    const poSubW = font.widthOfTextAtSize(poSub, 9);
    teksNonXl(poSub, { x: (pw - poSubW) / 2, size: 9, warna: [0.4, 0.4, 0.4] });
    barisNonXl(18);

    // Paragraf Pembuka
    teksNonXl(`Pada hari ini, tanggal ${tglDokumen}, yang bertanda tangan di bawah ini:`, { size: 9.5 });
    barisNonXl(14);

    // Identitas 2 Pihak
    const identitas: [string, string, string][] = [
      ["1.", "Nama", pihak1Nama],
      ["", "Jabatan", pihak1Jabatan],
      ["", "Perusahaan", `${namaKlienResmi} (selanjutnya disebut sebagai "PIHAK PERTAMA")`],
      ["", "", ""],
      ["2.", "Nama", pihak2Nama],
      ["", "Jabatan", pihak2Jabatan],
      ["", "Perusahaan", `PT IDstar Cipta Teknologi (selanjutnya disebut sebagai "PIHAK KEDUA")`],
    ];

    for (const [no, label, val] of identitas) {
      if (!label) { barisNonXl(6); continue; }
      if (no) teksNonXl(no, { x: margin, size: 9, bold: true });
      teksNonXl(label, { x: margin + 18, size: 9, warna: [0.4, 0.4, 0.4] });
      teksNonXl(":", { x: margin + 95, size: 9 });
      teksNonXl(val, { x: margin + 105, size: 9, bold: label === "Perusahaan" });
      barisNonXl(13);
    }
    barisNonXl(8);

    // Klausul Penyerahan
    const teksPekerjaan = header.keteranganTahap
      ? `tahap ${header.keteranganTahap}`
      : `periode layanan ${header.periode}`;
    const narasi = `PIHAK PERTAMA dan PIHAK KEDUA secara bersama-sama menerangkan bahwa PIHAK KEDUA telah menyelesaikan pekerjaan penyediaan jasa keahlian / konsultan untuk proyek ${header.namaProyek} pada ${teksPekerjaan} berdasarkan Purchase Order No. ${header.nomorPo}, dengan rincian serah terima sebagai berikut:`;

    const maxLebar = pw - margin * 2;
    const kata = narasi.split(" ");
    let baru = "";
    const lines: string[] = [];
    for (const k of kata) {
      const coba = baru ? `${baru} ${k}` : k;
      if (font.widthOfTextAtSize(coba, 9) > maxLebar) { lines.push(baru); baru = k; } else { baru = coba; }
    }
    if (baru) lines.push(baru);
    for (const l of lines) { teksNonXl(l, { size: 9 }); barisNonXl(12); }
    barisNonXl(8);

    // Tabel Penugasan
    const colX = [margin, margin + 22, margin + 180, margin + 340, pw - margin - 95];
    teksNonXl("No", { x: colX[0], size: 8.5, bold: true });
    teksNonXl("Nama Personel", { x: colX[1], size: 8.5, bold: true });
    teksNonXl("Posisi / PO Line", { x: colX[2], size: 8.5, bold: true });
    teksNonXl("Hari/Acuan", { x: colX[3], size: 8.5, bold: true });
    teksNonXl("Nilai Serah Terima", { x: colX[4], size: 8.5, bold: true });
    barisNonXl(4);
    halaman.drawLine({ start: { x: margin, y }, end: { x: pw - margin, y }, thickness: 1, color: rgb(0.2, 0.2, 0.2) });
    barisNonXl(12);

    rincian.forEach((r, idx) => {
      teksNonXl(String(idx + 1), { x: colX[0], size: 8.5 });
      teksNonXl(r.namaPersonel, { x: colX[1], size: 8.5, bold: true });
      const pos = r.nomorLine ? `Line ${r.nomorLine} ${r.deskripsiLine ? `(${r.deskripsiLine})` : ""}` : (header.namaProyek || "-");
      teksNonXl(pos.slice(0, 32), { x: colX[2], size: 8.5 });
      teksNonXl(r.hariKerjaAcuanBulan === 0 ? "-" : `${r.hariKerjaDapatDitagihkan}/${r.hariKerjaAcuanBulan}`, { x: colX[3], size: 8.5 });
      const valStr = formatRupiah(r.hasilHitung);
      const valW = fontBold.widthOfTextAtSize(valStr, 8.5);
      teksNonXl(valStr, { x: pw - margin - valW, size: 8.5, bold: true });
      barisNonXl(12);
    });
    barisNonXl(4);
    halaman.drawLine({ start: { x: margin, y }, end: { x: pw - margin, y }, thickness: 0.75, color: rgb(0.6, 0.6, 0.6) });
    barisNonXl(12);
    teksNonXl("Total Nilai Pekerjaan (Sebelum PPN):", { x: colX[1], size: 9, bold: true });
    const totStr = formatRupiah(String(total));
    const totW = fontBold.widthOfTextAtSize(totStr, 9.5);
    teksNonXl(totStr, { x: pw - margin - totW, size: 9.5, bold: true, warna: [0.8, 0.1, 0.1] });
    barisNonXl(16);

    // Klausul Penutup
    const penutup = `Pekerjaan tersebut telah diserahterimakan oleh PIHAK KEDUA dan diterima dengan baik serta lengkap oleh PIHAK PERTAMA. Berita Acara Serah Terima ini dibuat dalam rangkap yang cukup dan memiliki kekuatan hukum yang sah sebagai kelengkapan dokumen penagihan dan dasar pembayaran bagi PIHAK KEDUA.`;
    const kPenutup = penutup.split(" ");
    let bPenutup = "";
    const lPenutup: string[] = [];
    for (const kp of kPenutup) {
      const coba = bPenutup ? `${bPenutup} ${kp}` : kp;
      if (font.widthOfTextAtSize(coba, 9) > maxLebar) { lPenutup.push(bPenutup); bPenutup = kp; } else { bPenutup = coba; }
    }
    if (bPenutup) lPenutup.push(bPenutup);
    for (const lp of lPenutup) { teksNonXl(lp, { size: 9 }); barisNonXl(12); }
    barisNonXl(18);

    // Tanda Tangan 2 Pihak
    const ttdCol1 = margin + 30;
    const ttdCol2 = margin + 300;
    teksNonXl("PIHAK PERTAMA,", { x: ttdCol1, size: 9, warna: [0.4, 0.4, 0.4] });
    teksNonXl("PIHAK KEDUA,", { x: ttdCol2, size: 9, warna: [0.4, 0.4, 0.4] });
    barisNonXl(14);
    teksNonXl(namaKlienResmi, { x: ttdCol1, size: 9.5, bold: true });
    teksNonXl("PT IDstar Cipta Teknologi", { x: ttdCol2, size: 9.5, bold: true });
    barisNonXl(48);
    teksNonXl(pihak1Nama, { x: ttdCol1, size: 9.5, bold: true });
    teksNonXl(pihak2Nama, { x: ttdCol2, size: 9.5, bold: true });
    barisNonXl(12);
    teksNonXl(pihak1Jabatan, { x: ttdCol1, size: 8.5, warna: [0.4, 0.4, 0.4] });
    teksNonXl(pihak2Jabatan, { x: ttdCol2, size: 8.5, warna: [0.4, 0.4, 0.4] });
    barisNonXl(18);

    teksNonXl(`Dokumen resmi INVORA · IDStar Group — ${dok.dibuatPada} · dokumen #${dok.id}`, { size: 7.5, warna: [0.6, 0.6, 0.6] });

    const pdfBytes = await bastPdf.save();
    return new NextResponse(Buffer.from(pdfBytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="BAST-NonXL-${header.nomorPo}-${header.periode}.pdf"`,
      },
    });
  }

  // ---- Halaman 1: sertifikat CAC/BAST XL, digambar langsung dengan pdf-lib ----
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
