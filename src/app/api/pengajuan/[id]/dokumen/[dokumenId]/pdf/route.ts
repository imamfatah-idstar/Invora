import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import { PDFDocument, StandardFonts, rgb, PageSizes } from "pdf-lib";
import { db } from "@/db";
import {
  dokumen, pengajuan, pengajuanDetail, personel, po, userXl,
  konfirmasi, checkerReview, users, lampiranPengajuan,
} from "@/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { wajibRoleApi } from "@/lib/require-role-api";
import { LABEL_LAMPIRAN_BALANCE } from "@/lib/lampiran-label";

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
  const bytes = await readFile(path.join(process.cwd(), pathRelatif));
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
      nomorPo: po.nomorPo, namaProyek: po.namaProyek, namaUserXl: userXl.nama,
      pathFilePoAsli: po.pathFilePoAsli,
    })
    .from(pengajuan)
    .innerJoin(po, eq(pengajuan.poId, po.id))
    .innerJoin(userXl, eq(pengajuan.userXlId, userXl.id))
    .where(eq(pengajuan.id, pengajuanId));
  if (!header) return NextResponse.json({ error: "Pengajuan tidak ditemukan." }, { status: 404 });

  const rincian = await db
    .select({
      namaPersonel: personel.nama,
      hariKerjaDapatDitagihkan: pengajuanDetail.hariKerjaDapatDitagihkan,
      hariKerjaAcuanBulan: pengajuanDetail.hariKerjaAcuanBulan,
      nilaiRateDipakai: pengajuanDetail.nilaiRateDipakai, hasilHitung: pengajuanDetail.hasilHitung,
    })
    .from(pengajuanDetail)
    .innerJoin(personel, eq(pengajuanDetail.personelId, personel.id))
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

  // ---- Halaman 1: sertifikat, digambar langsung dengan pdf-lib ----
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
    ["User XL", header.namaUserXl],
    ["Periode", header.periode],
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
    const narasi = `Dengan ini menyatakan bahwa jasa personel berikut telah dilaksanakan sesuai PO ${header.nomorPo} untuk proyek ${header.namaProyek} pada periode ${header.periode}, dan diserahterimakan sesuai rincian di bawah ini.`;
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
  const ttdLabel = ["Dibuat oleh (Petugas),", "Diperiksa oleh (Checker),", "Disetujui oleh (User XL),"];
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
