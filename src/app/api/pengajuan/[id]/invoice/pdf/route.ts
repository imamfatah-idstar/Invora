import { NextRequest, NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb, PageSizes } from "pdf-lib";
import { db } from "@/db";
import {
  pengajuan,
  pengajuanDetail,
  personel,
  po,
  poLineItem,
  userXl,
} from "@/db/schema";
import { eq } from "drizzle-orm";
import { wajibRoleApi } from "@/lib/require-role-api";
import { terbilang } from "@/lib/terbilang";

function formatRp(val: number): string {
  return "Rp" + Math.round(val).toLocaleString("id-ID");
}

function formatTanggalIndo(dateStr?: string | null): string {
  if (!dateStr) {
    const now = new Date();
    return `${now.getDate()} ${NAMA_BULAN[now.getMonth()]} ${now.getFullYear()}`;
  }
  const parts = dateStr.split("-");
  if (parts.length === 3) {
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    const d = parseInt(parts[2], 10);
    return `${d} ${NAMA_BULAN[m] || ""} ${y}`;
  }
  return dateStr;
}

const NAMA_BULAN = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember"
];

function tambahHariStr(dateStr: string, hari: number): string {
  const d = new Date(dateStr + "T00:00:00Z");
  if (isNaN(d.getTime())) return dateStr;
  d.setDate(d.getDate() + hari);
  return d.toISOString().split("T")[0];
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const gagal = await wajibRoleApi(["petugas", "checker", "admin"]);
  if (gagal) return gagal;

  const { id } = await params;
  const pengajuanId = Number(id);
  if (isNaN(pengajuanId)) {
    return NextResponse.json({ error: "ID pengajuan tidak valid." }, { status: 400 });
  }

  // 1. Ambil data pengajuan, PO, dan klien
  const [header] = await db
    .select({
      id: pengajuan.id,
      periode: pengajuan.periode,
      versi: pengajuan.versi,
      status: pengajuan.status,
      nomorInvoice: pengajuan.nomorInvoice,
      nomorGrSlip: pengajuan.nomorGrSlip,
      nilaiGrDisetujui: pengajuan.nilaiGrDisetujui,
      nomorFakturPajak: pengajuan.nomorFakturPajak,
      tanggalFakturPajak: pengajuan.tanggalFakturPajak,
      tarifPpn: pengajuan.tarifPpn,
      tanggalSubmitInvoice: pengajuan.tanggalSubmitInvoice,
      tanggalApproveInvoice: pengajuan.tanggalApproveInvoice,
      penyesuaianSelisihGrMasuk: pengajuan.penyesuaianSelisihGrMasuk,
      keteranganTahap: pengajuan.keteranganTahap,
      nomorPo: po.nomorPo,
      namaProyek: po.namaProyek,
      klien: po.klien,
      namaUserXl: userXl.nama,
      kontakUserXl: userXl.kontak,
    })
    .from(pengajuan)
    .innerJoin(po, eq(pengajuan.poId, po.id))
    .innerJoin(userXl, eq(pengajuan.userXlId, userXl.id))
    .where(eq(pengajuan.id, pengajuanId));

  if (!header) {
    return NextResponse.json({ error: "Data pengajuan tidak ditemukan." }, { status: 404 });
  }

  // 2. Ambil rincian line item
  const rincian = await db
    .select({
      namaPersonel: personel.nama,
      hariKerjaDapatDitagihkan: pengajuanDetail.hariKerjaDapatDitagihkan,
      hariKerjaAcuanBulan: pengajuanDetail.hariKerjaAcuanBulan,
      nilaiRateDipakai: pengajuanDetail.nilaiRateDipakai,
      hasilHitung: pengajuanDetail.hasilHitung,
      nomorLine: poLineItem.nomorLine,
      deskripsiLine: poLineItem.shortText,
    })
    .from(pengajuanDetail)
    .innerJoin(personel, eq(pengajuanDetail.personelId, personel.id))
    .leftJoin(poLineItem, eq(pengajuanDetail.poLineItemId, poLineItem.id))
    .where(eq(pengajuanDetail.pengajuanId, pengajuanId));

  // 3. Kalkulasi Nilai Finansial
  const totalRincian = rincian.reduce((acc, r) => acc + Number(r.hasilHitung || 0), 0);
  const penyesuaianGr = Number(header.penyesuaianSelisihGrMasuk || 0);
  const totalSetelahPenyesuaian = totalRincian + penyesuaianGr;

  const dpp = header.nilaiGrDisetujui && Number(header.nilaiGrDisetujui) > 0
    ? Number(header.nilaiGrDisetujui)
    : totalSetelahPenyesuaian;

  const tarifPpn = header.tarifPpn ? Number(header.tarifPpn) : 11;
  const nilaiPpn = Math.round((dpp * tarifPpn) / 100);
  const grandTotal = dpp + nilaiPpn;

  const tanggalAcuan = header.tanggalSubmitInvoice || header.tanggalFakturPajak || `${header.periode}-25`;
  const tanggalInvoiceFormatted = formatTanggalIndo(tanggalAcuan);
  const tanggalJatuhTempoStr = tambahHariStr(tanggalAcuan, 30);
  const tanggalJatuhTempoFormatted = formatTanggalIndo(tanggalJatuhTempoStr);

  const nomorInv = header.nomorInvoice || `INV/${header.periode.replace("-", "/")}/${String(header.id).padStart(4, "0")}`;
  const terbilangTeks = terbilang(grandTotal);

  // 4. Render PDF dengan pdf-lib
  const pdfDoc = await PDFDocument.create();
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontOblique = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

  const page = pdfDoc.addPage(PageSizes.A4);
  const { width: pw, height: ph } = page.getSize();
  const margin = 36;
  const contentWidth = pw - margin * 2; // ~523 pt

  // Colors
  const cRed = rgb(0.918, 0.141, 0.165);       // IDStar Primary Red
  const cDark = rgb(0.12, 0.14, 0.18);        // Main Text
  const cMuted = rgb(0.42, 0.46, 0.52);       // Secondary Text
  const cBorder = rgb(0.85, 0.88, 0.92);      // Card Borders
  const cBgLight = rgb(0.965, 0.975, 0.985);  // Card Backgrounds
  const cHeaderBg = rgb(0.09, 0.12, 0.18);    // Table Header Dark

  // Top Accent Banner
  page.drawRectangle({
    x: 0,
    y: ph - 6,
    width: pw,
    height: 6,
    color: cRed,
  });

  let curY = ph - 38;

  // --- Header Kiri: Nama & Info Perusahaan ---
  page.drawText("PT IDSTAR CIPTA TEKNOLOGI", {
    x: margin,
    y: curY,
    size: 14.5,
    font: fontBold,
    color: cRed,
  });

  curY -= 13;
  page.drawText("IT Professional Services & Managed Solutions", {
    x: margin,
    y: curY,
    size: 8,
    font: fontRegular,
    color: cMuted,
  });

  curY -= 11;
  page.drawText("The Bellagio Mansion, Ground Floor, Mega Kuningan, Jakarta Selatan 12950", {
    x: margin,
    y: curY,
    size: 7.5,
    font: fontRegular,
    color: cDark,
  });

  curY -= 10;
  page.drawText("Telp: +62 21 576-0888  |  Email: finance@idstar.group  |  www.idstar.co.id", {
    x: margin,
    y: curY,
    size: 7.5,
    font: fontRegular,
    color: cDark,
  });

  // --- Header Kanan: Judul Invoice ---
  const invoiceJudul = "INVOICE";
  const wInvJudul = fontBold.widthOfTextAtSize(invoiceJudul, 24);
  page.drawText(invoiceJudul, {
    x: pw - margin - wInvJudul,
    y: ph - 42,
    size: 24,
    font: fontBold,
    color: cDark,
  });

  const subJudul = "FAKTUR PENAGIHAN RESMI";
  const wSubJudul = fontBold.widthOfTextAtSize(subJudul, 8);
  page.drawText(subJudul, {
    x: pw - margin - wSubJudul,
    y: ph - 55,
    size: 8,
    font: fontBold,
    color: cMuted,
  });

  curY -= 12;
  page.drawLine({
    start: { x: margin, y: curY },
    end: { x: pw - margin, y: curY },
    thickness: 1,
    color: cBorder,
  });

  curY -= 14;

  // --- 2 Kotak Info: BILL TO (Kiri) & INVOICE DETAILS (Kanan) ---
  const boxHeight = 78;
  const colWidth = (contentWidth - 14) / 2; // ~254 pt
  const colLeftX = margin;
  const colRightX = margin + colWidth + 14;
  const boxTopY = curY;

  // Box Kiri - DITUJUKAN KEPADA (BILL TO)
  page.drawRectangle({
    x: colLeftX,
    y: boxTopY - boxHeight,
    width: colWidth,
    height: boxHeight,
    color: cBgLight,
    borderColor: cBorder,
    borderWidth: 0.8,
  });

  page.drawText("DITUJUKAN KEPADA (BILL TO):", {
    x: colLeftX + 10,
    y: boxTopY - 14,
    size: 7.5,
    font: fontBold,
    color: cRed,
  });

  page.drawText((header.klien || "PT XL Axiata Tbk").toUpperCase(), {
    x: colLeftX + 10,
    y: boxTopY - 28,
    size: 9.5,
    font: fontBold,
    color: cDark,
  });

  page.drawText(`Attn / PIC : ${header.namaUserXl || "-"}${header.kontakUserXl ? ` (${header.kontakUserXl})` : ""}`, {
    x: colLeftX + 10,
    y: boxTopY - 42,
    size: 8,
    font: fontRegular,
    color: cDark,
  });

  page.drawText(`Proyek      : ${header.namaProyek}`, {
    x: colLeftX + 10,
    y: boxTopY - 55,
    size: 8,
    font: fontRegular,
    color: cDark,
  });

  page.drawText(`Periode    : ${header.periode}${header.keteranganTahap ? ` (${header.keteranganTahap})` : ""}`, {
    x: colLeftX + 10,
    y: boxTopY - 68,
    size: 8,
    font: fontRegular,
    color: cDark,
  });

  // Box Kanan - RINCIAN DOKUMEN & PO
  page.drawRectangle({
    x: colRightX,
    y: boxTopY - boxHeight,
    width: colWidth,
    height: boxHeight,
    color: cBgLight,
    borderColor: cBorder,
    borderWidth: 0.8,
  });

  page.drawText("INFORMASI PENAGIHAN:", {
    x: colRightX + 10,
    y: boxTopY - 14,
    size: 7.5,
    font: fontBold,
    color: cRed,
  });

  const renderInfoRow = (label: string, val: string, yPos: number, isBoldVal = false) => {
    page.drawText(label, { x: colRightX + 10, y: yPos, size: 8, font: fontRegular, color: cMuted });
    page.drawText(`: ${val}`, {
      x: colRightX + 75,
      y: yPos,
      size: 8,
      font: isBoldVal ? fontBold : fontRegular,
      color: isBoldVal ? cDark : cDark,
    });
  };

  renderInfoRow("No. Invoice", nomorInv, boxTopY - 28, true);
  renderInfoRow("Tgl Invoice", tanggalInvoiceFormatted, boxTopY - 40);
  renderInfoRow("Jatuh Tempo", tanggalJatuhTempoFormatted, boxTopY - 52, true);
  renderInfoRow("No. PO", header.nomorPo, boxTopY - 64, true);

  if (header.nomorFakturPajak) {
    renderInfoRow("Faktur Pajak", header.nomorFakturPajak, boxTopY - 74);
  } else if (header.nomorGrSlip) {
    renderInfoRow("No. GR Slip", header.nomorGrSlip, boxTopY - 74);
  }

  curY = boxTopY - boxHeight - 16;

  // --- TABEL RINCIAN TAGIHAN (ITEMIZED BILLING) ---
  const thHeight = 18;
  const colDef = [
    { label: "NO", w: 24, align: "center" as const },
    { label: "DESKRIPSI PEKERJAAN / TALENTA", w: 195, align: "left" as const },
    { label: "LINE PO", w: 55, align: "center" as const },
    { label: "HARI KERJA", w: 65, align: "center" as const },
    { label: "RATE BULANAN", w: 85, align: "right" as const },
    { label: "JUMLAH (RP)", w: 99, align: "right" as const },
  ];

  // Header Background
  page.drawRectangle({
    x: margin,
    y: curY - thHeight,
    width: contentWidth,
    height: thHeight,
    color: cHeaderBg,
  });

  // Teks Header Tabel
  let thX = margin;
  colDef.forEach((col) => {
    let tx = thX + 4;
    const txtW = fontBold.widthOfTextAtSize(col.label, 7.5);
    if (col.align === "center") {
      tx = thX + (col.w - txtW) / 2;
    } else if (col.align === "right") {
      tx = thX + col.w - txtW - 6;
    }
    page.drawText(col.label, {
      x: tx,
      y: curY - 12.5,
      size: 7.5,
      font: fontBold,
      color: rgb(1, 1, 1),
    });
    thX += col.w;
  });

  curY -= thHeight;

  // Baris-baris Data
  const rowHeight = 22;
  rincian.forEach((item, idx) => {
    const isEven = idx % 2 === 1;
    if (isEven) {
      page.drawRectangle({
        x: margin,
        y: curY - rowHeight,
        width: contentWidth,
        height: rowHeight,
        color: rgb(0.98, 0.985, 0.99),
      });
    }

    // Border bawah baris
    page.drawLine({
      start: { x: margin, y: curY - rowHeight },
      end: { x: pw - margin, y: curY - rowHeight },
      thickness: 0.5,
      color: cBorder,
    });

    let rowX = margin;

    // 1. No
    const noStr = String(idx + 1);
    page.drawText(noStr, {
      x: rowX + (colDef[0].w - fontRegular.widthOfTextAtSize(noStr, 8)) / 2,
      y: curY - 14,
      size: 8,
      font: fontRegular,
      color: cDark,
    });
    rowX += colDef[0].w;

    // 2. Deskripsi / Talenta
    const namaTalenta = item.namaPersonel.toUpperCase();
    page.drawText(namaTalenta, {
      x: rowX + 6,
      y: curY - 11,
      size: 8,
      font: fontBold,
      color: cDark,
    });
    const subDesc = item.deskripsiLine ? item.deskripsiLine.slice(0, 38) : `Layanan Profesional IT - ${header.namaProyek}`;
    page.drawText(subDesc, {
      x: rowX + 6,
      y: curY - 19,
      size: 6.8,
      font: fontRegular,
      color: cMuted,
    });
    rowX += colDef[1].w;

    // 3. Line PO
    const lineStr = item.nomorLine ? `Line ${item.nomorLine}` : "-";
    page.drawText(lineStr, {
      x: rowX + (colDef[2].w - fontRegular.widthOfTextAtSize(lineStr, 7.5)) / 2,
      y: curY - 14,
      size: 7.5,
      font: fontRegular,
      color: cDark,
    });
    rowX += colDef[2].w;

    // 4. Hari Kerja
    const hariStr = `${item.hariKerjaDapatDitagihkan} / ${item.hariKerjaAcuanBulan} hr`;
    page.drawText(hariStr, {
      x: rowX + (colDef[3].w - fontRegular.widthOfTextAtSize(hariStr, 7.5)) / 2,
      y: curY - 14,
      size: 7.5,
      font: fontRegular,
      color: cDark,
    });
    rowX += colDef[3].w;

    // 5. Rate Bulanan
    const rateStr = formatRp(Number(item.nilaiRateDipakai || 0));
    page.drawText(rateStr, {
      x: rowX + colDef[4].w - fontRegular.widthOfTextAtSize(rateStr, 7.5) - 6,
      y: curY - 14,
      size: 7.5,
      font: fontRegular,
      color: cDark,
    });
    rowX += colDef[4].w;

    // 6. Jumlah Hasil Hitung
    const hitungStr = formatRp(Number(item.hasilHitung || 0));
    page.drawText(hitungStr, {
      x: rowX + colDef[5].w - fontBold.widthOfTextAtSize(hitungStr, 8) - 6,
      y: curY - 14,
      size: 8,
      font: fontBold,
      color: cDark,
    });

    curY -= rowHeight;
  });

  // Baris Penyesuaian Selisih GR (jika ada carry-over)
  if (penyesuaianGr !== 0) {
    page.drawRectangle({
      x: margin,
      y: curY - rowHeight,
      width: contentWidth,
      height: rowHeight,
      color: rgb(0.99, 0.96, 0.96),
    });
    page.drawLine({
      start: { x: margin, y: curY - rowHeight },
      end: { x: pw - margin, y: curY - rowHeight },
      thickness: 0.5,
      color: cBorder,
    });

    page.drawText("Penyesuaian Selisih Evaluasi GR (Carry-over Periode Sebelumnya)", {
      x: margin + 30,
      y: curY - 14,
      size: 8,
      font: fontBold,
      color: penyesuaianGr > 0 ? rgb(0.1, 0.5, 0.2) : cRed,
    });

    const selisihStr = (penyesuaianGr > 0 ? "+" : "") + formatRp(penyesuaianGr);
    page.drawText(selisihStr, {
      x: pw - margin - fontBold.widthOfTextAtSize(selisihStr, 8) - 6,
      y: curY - 14,
      size: 8,
      font: fontBold,
      color: penyesuaianGr > 0 ? rgb(0.1, 0.5, 0.2) : cRed,
    });

    curY -= rowHeight;
  }

  curY -= 12;

  // --- KOTAK TERBILANG (Kiri) & SUMMARY TOTAL (Kanan) ---
  const summaryBoxW = 215;
  const summaryLeftX = pw - margin - summaryBoxW;
  const terbilangW = contentWidth - summaryBoxW - 14;

  // Kotak Terbilang (Kiri)
  page.drawRectangle({
    x: margin,
    y: curY - 54,
    width: terbilangW,
    height: 54,
    color: cBgLight,
    borderColor: cBorder,
    borderWidth: 0.8,
  });

  page.drawText("TERBILANG / AMOUNT IN WORDS:", {
    x: margin + 8,
    y: curY - 12,
    size: 7,
    font: fontBold,
    color: cMuted,
  });

  // Teks terbilang (bungkus jika panjang)
  const maxTerbilangW = terbilangW - 16;
  let baris1 = terbilangTeks;
  let baris2 = "";
  if (fontOblique.widthOfTextAtSize(terbilangTeks, 8) > maxTerbilangW) {
    const kata = terbilangTeks.split(" ");
    let temp = "";
    while (kata.length > 0 && fontOblique.widthOfTextAtSize(temp + kata[0] + " ", 8) < maxTerbilangW) {
      temp += kata.shift() + " ";
    }
    baris1 = temp.trim();
    baris2 = kata.join(" ");
  }

  page.drawText(`"# ${baris1}`, {
    x: margin + 8,
    y: curY - 26,
    size: 8,
    font: fontOblique,
    color: cDark,
  });
  if (baris2) {
    page.drawText(`${baris2} #"`, {
      x: margin + 8,
      y: curY - 38,
      size: 8,
      font: fontOblique,
      color: cDark,
    });
  } else {
    page.drawText('#"', {
      x: margin + 8 + fontOblique.widthOfTextAtSize(`"# ${baris1} `, 8),
      y: curY - 26,
      size: 8,
      font: fontOblique,
      color: cDark,
    });
  }

  // Summary Finansial (Kanan)
  const drawSummaryRow = (label: string, valStr: string, yPos: number, isGrandTotal = false) => {
    page.drawText(label, {
      x: summaryLeftX + 6,
      y: yPos,
      size: isGrandTotal ? 8.5 : 8,
      font: isGrandTotal ? fontBold : fontRegular,
      color: isGrandTotal ? cDark : cMuted,
    });
    const valW = (isGrandTotal ? fontBold : fontRegular).widthOfTextAtSize(valStr, isGrandTotal ? 10 : 8);
    page.drawText(valStr, {
      x: pw - margin - valW - 6,
      y: yPos,
      size: isGrandTotal ? 10 : 8,
      font: isGrandTotal ? fontBold : fontRegular,
      color: isGrandTotal ? cRed : cDark,
    });
  };

  drawSummaryRow("Subtotal DPP", formatRp(dpp), curY - 12);
  drawSummaryRow(`PPN (${tarifPpn}%)`, formatRp(nilaiPpn), curY - 26);

  page.drawLine({
    start: { x: summaryLeftX, y: curY - 33 },
    end: { x: pw - margin, y: curY - 33 },
    thickness: 1,
    color: cDark,
  });

  drawSummaryRow("TOTAL TAGIHAN", formatRp(grandTotal), curY - 47, true);

  curY -= 68;

  // --- REKENING PEMBAYARAN & TANDA TANGAN OTORISASI ---
  const bottomBoxH = 92;
  const rekWidth = contentWidth - 190;
  const signWidth = 176;
  const signX = pw - margin - signWidth;

  // Kotak Rekening Pembayaran Resmi
  page.drawRectangle({
    x: margin,
    y: curY - bottomBoxH,
    width: rekWidth,
    height: bottomBoxH,
    color: rgb(0.99, 0.995, 1),
    borderColor: cBorder,
    borderWidth: 0.8,
  });

  page.drawText("INFORMASI REKENING PEMBAYARAN RESMI:", {
    x: margin + 10,
    y: curY - 14,
    size: 7.5,
    font: fontBold,
    color: cRed,
  });

  page.drawText("1. Bank Central Asia (BCA)", { x: margin + 10, y: curY - 28, size: 8, font: fontBold, color: cDark });
  page.drawText("No. Rek: 541-098-7711  |  KCU Mega Kuningan Jakarta", { x: margin + 20, y: curY - 39, size: 7.5, font: fontRegular, color: cDark });

  page.drawText("2. Bank Mandiri", { x: margin + 10, y: curY - 52, size: 8, font: fontBold, color: cDark });
  page.drawText("No. Rek: 124-00-1122334-9  |  KC Jakarta Bellagio Mansion", { x: margin + 20, y: curY - 63, size: 7.5, font: fontRegular, color: cDark });

  page.drawText("Atas Nama: PT IDSTAR CIPTA TEKNOLOGI", { x: margin + 10, y: curY - 76, size: 8, font: fontBold, color: cDark });
  page.drawText("* Cantumkan No. Invoice pada berita transfer & kirim bukti transfer ke finance@idstar.group", {
    x: margin + 10,
    y: curY - 86,
    size: 6.8,
    font: fontOblique,
    color: cMuted,
  });

  // Kotak Otorisasi & Cap Digital
  page.drawRectangle({
    x: signX,
    y: curY - bottomBoxH,
    width: signWidth,
    height: bottomBoxH,
    color: cBgLight,
    borderColor: cBorder,
    borderWidth: 0.8,
  });

  page.drawText("Jakarta, " + tanggalInvoiceFormatted, {
    x: signX + 10,
    y: curY - 14,
    size: 7.5,
    font: fontRegular,
    color: cDark,
  });

  page.drawText("PT IDSTAR CIPTA TEKNOLOGI", {
    x: signX + 10,
    y: curY - 26,
    size: 8,
    font: fontBold,
    color: cDark,
  });

  // Stamp Box Digital Verification
  page.drawRectangle({
    x: signX + 14,
    y: curY - 68,
    width: signWidth - 28,
    height: 32,
    borderColor: cRed,
    borderWidth: 1,
    color: rgb(1, 0.97, 0.97),
  });

  const stampLine1 = "IDSTAR VERIFIED INVOICE";
  const stampLine2 = `INVORA-AUTH #${header.id}-${header.periode}`;
  page.drawText(stampLine1, {
    x: signX + 14 + (signWidth - 28 - fontBold.widthOfTextAtSize(stampLine1, 7.5)) / 2,
    y: curY - 51,
    size: 7.5,
    font: fontBold,
    color: cRed,
  });
  page.drawText(stampLine2, {
    x: signX + 14 + (signWidth - 28 - fontRegular.widthOfTextAtSize(stampLine2, 6.8)) / 2,
    y: curY - 62,
    size: 6.8,
    font: fontRegular,
    color: cMuted,
  });

  page.drawText("Finance & Treasury Department", {
    x: signX + 10,
    y: curY - 83,
    size: 7.5,
    font: fontBold,
    color: cDark,
  });

  // --- FOOTER RESMI ---
  page.drawText(
    "Dokumen ini diterbitkan secara otomatis dan sah melalui Sistem INVORA (Invoice Operations & Revenue Assurance) PT IDStar Cipta Teknologi.",
    {
      x: margin,
      y: 18,
      size: 6.8,
      font: fontRegular,
      color: cMuted,
    }
  );

  const pdfBytes = await pdfDoc.save();

  const namaFile = `Invoice-${nomorInv.replace(/[^a-zA-Z0-9_-]/g, "_")}.pdf`;

  return new NextResponse(Buffer.from(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${namaFile}"`,
      "Cache-Control": "no-store",
    },
  });
}
