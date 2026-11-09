import { NextRequest, NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb, PageSizes } from "pdf-lib";
import fs from "fs";
import path from "path";
import Decimal from "decimal.js";
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

// --- HELPER FORMATTING & TANGGAL (ENGLISH REFERENCE FORMAT) ---
const SHORT_MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];

function parseDate(dateStr?: string | null): Date {
  if (!dateStr) return new Date();
  const parts = dateStr.split("-");
  if (parts.length === 3) {
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    const d = parseInt(parts[2], 10);
    return new Date(y, m, d);
  }
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? new Date() : d;
}

// Format: 9-Oct-26
function formatShortDate(d: Date): string {
  const day = d.getDate();
  const month = SHORT_MONTHS[d.getMonth()] || "Oct";
  const yearShort = String(d.getFullYear()).slice(-2);
  return `${day}-${month}-${yearShort}`;
}

// Format: 9 Oct 2026
function formatFullDate(d: Date): string {
  const day = d.getDate();
  const month = SHORT_MONTHS[d.getMonth()] || "Oct";
  const year = d.getFullYear();
  return `${day} ${month} ${year}`;
}

// Format: Sep - Oct 26
function formatPeriodeLabel(periodeStr: string): string {
  const parts = periodeStr.split("-");
  if (parts.length === 2) {
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    const prevM = (m + 11) % 12;
    const yearShort = String(y).slice(-2);
    return `${SHORT_MONTHS[prevM]} - ${SHORT_MONTHS[m]} ${yearShort}`;
  }
  return periodeStr;
}

function tambahHari(d: Date, days: number): Date {
  const res = new Date(d);
  res.setDate(res.getDate() + days);
  return res;
}

function formatNumber(val: Decimal | number | string): string {
  const d = new Decimal(val || 0);
  const rounded = d.round();
  const parts = rounded.toString().split(".");
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return parts.join(".");
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

  const { searchParams } = new URL(request.url);
  const isDownload = searchParams.get("download") === "true";
  const bankOption = (searchParams.get("bank") || "").toLowerCase(); // "cimb" | "bca" | "mandiri" | "all"

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

  // 3. Kalkulasi Finansial dengan Decimal.js (Presisi Tinggi)
  let totalRincian = new Decimal(0);
  for (const r of rincian) {
    totalRincian = totalRincian.plus(new Decimal(r.hasilHitung || 0));
  }
  const penyesuaianGr = new Decimal(header.penyesuaianSelisihGrMasuk || 0);
  const totalSetelahPenyesuaian = totalRincian.plus(penyesuaianGr);

  const dpp = header.nilaiGrDisetujui && new Decimal(header.nilaiGrDisetujui).greaterThan(0)
    ? new Decimal(header.nilaiGrDisetujui)
    : totalSetelahPenyesuaian;

  const tarifPpn = header.tarifPpn ? new Decimal(header.tarifPpn) : new Decimal(11);
  const nilaiPpn = dpp.times(tarifPpn).dividedBy(100).round();
  const grandTotal = dpp.plus(nilaiPpn);

  // 4. Tanggal & Jatuh Tempo
  const rawTanggal = header.tanggalSubmitInvoice || header.tanggalFakturPajak || `${header.periode}-25`;
  const tglInvoice = parseDate(rawTanggal);
  const tglJatuhTempo = tambahHari(tglInvoice, 14); // 14 hari standar

  const nomorInv = header.nomorInvoice || `${header.id}/INV-IDS/X/${tglInvoice.getFullYear()}`;

  // 5. Inisialisasi Dokumen PDF (A4 Portrait 595.92 x 842.88 pt)
  const pdfDoc = await PDFDocument.create();
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const page = pdfDoc.addPage(PageSizes.A4);
  const { width: pw, height: ph } = page.getSize();

  // Color Palette Resmi IDStar (sesuai sample invoice)
  const cBlack = rgb(0, 0, 0);
  const cTextDark = rgb(0.15, 0.16, 0.18);
  const cBorderLine = rgb(0.67, 0.71, 0.74);
  const cSeparatorLine = rgb(0.42, 0.44, 0.47);
  const cBoxBg = rgb(0.87, 0.89, 0.90);

  // --- 6. LOAD ASSETS (LOGO IDSTAR & IDS CAP.JPG) ---
  let logoImage = null;
  const logoPath = path.join(process.cwd(), "public", "idstar-logo-color.png");
  if (fs.existsSync(/*turbopackIgnore: true*/ logoPath)) {
    try {
      const logoBytes = fs.readFileSync(/*turbopackIgnore: true*/ logoPath);
      logoImage = await pdfDoc.embedPng(logoBytes);
    } catch {
      // ignore
    }
  }

  let capImage = null;
  const capPath = path.join(process.cwd(), "public", "ids-cap.jpg");
  if (fs.existsSync(/*turbopackIgnore: true*/ capPath)) {
    try {
      const capBytes = fs.readFileSync(/*turbopackIgnore: true*/ capPath);
      capImage = await pdfDoc.embedJpg(capBytes);
    } catch {
      // ignore
    }
  }

  // --- 7. HEADER SECTION (KOORDINAT 1:1) ---
  const leftX = 52.7;
  const rightX = 540.7;

  // Header Kiri
  page.drawText("PT. IDSTAR CIPTA TEKNOLOGI", {
    x: leftX,
    y: ph - 79.6,
    size: 10,
    font: fontBold,
    color: cBlack,
  });

  page.drawText("Office 8, Jl. Senopati No.8B Level 18A, Senayan, Kebayoran Baru, Jakarta Selatan,", {
    x: leftX,
    y: ph - 92.5,
    size: 7.2,
    font: fontRegular,
    color: cTextDark,
  });

  page.drawText("DKI Jakarta 12190", {
    x: leftX,
    y: ph - 103.5,
    size: 7.2,
    font: fontRegular,
    color: cTextDark,
  });

  // Judul INVOICE
  page.drawText("INVOICE", {
    x: 356.2,
    y: ph - 98.0,
    size: 15,
    font: fontBold,
    color: cBlack,
  });

  // Logo IDStar
  if (logoImage) {
    const targetW = 95;
    const targetH = targetW * (logoImage.height / logoImage.width);
    page.drawImage(logoImage, {
      x: 435.0,
      y: ph - 65.0 - targetH,
      width: targetW,
      height: targetH,
    });
  }

  // Garis Pembatas Header Horizontal
  const headerLineY = ph - 128.5;
  page.drawLine({
    start: { x: leftX, y: headerLineY },
    end: { x: rightX, y: headerLineY },
    thickness: 1,
    color: cSeparatorLine,
  });

  // --- 8. SOLD TO & METADATA SECTION ---
  // Sisi Kiri: SOLD TO
  page.drawText("SOLD TO :", {
    x: leftX,
    y: ph - 143.6,
    size: 8.5,
    font: fontBold,
    color: cBlack,
  });

  const namaKlien = header.klien || "PT Bank CIMB Niaga Tbk";
  page.drawText(namaKlien, {
    x: leftX,
    y: ph - 160.1,
    size: 8.5,
    font: fontBold,
    color: cBlack,
  });

  let alamatLine1 = "JL JEND. SUDIRMAN KAV 58 GRAHA NIAGA , SENAYAN, KEBAYORAN BARU,";
  let alamatLine2 = "JAKARTA SELATAN, DKI JAKARTA 12190";
  if (namaKlien.toLowerCase().includes("xl")) {
    alamatLine1 = "XL Axiata Tower, Jl. H. R. Rasuna Said Blok X-5 Kav. 11-12,";
    alamatLine2 = "Kuningan Timur, Setiabudi, Jakarta Selatan 12950";
  }

  page.drawText(alamatLine1, {
    x: leftX,
    y: ph - 174.4,
    size: 7.2,
    font: fontRegular,
    color: cTextDark,
  });

  page.drawText(alamatLine2, {
    x: leftX,
    y: ph - 187.0,
    size: 7.2,
    font: fontRegular,
    color: cTextDark,
  });

  // Sisi Kanan: Metadata Table (Invoice, PO Number, Date, Due Date, Currency)
  const metaRows = [
    { label: "Invoice", val: nomorInv, y: ph - 144.5 },
    { label: "PO Number", val: header.nomorPo || "-", y: ph - 159.4 },
    { label: "Date", val: formatShortDate(tglInvoice), y: ph - 173.1 },
    { label: "Due Date", val: formatShortDate(tglJatuhTempo), y: ph - 186.8 },
    { label: "Currency", val: "IDR", y: ph - 200.0 },
  ];

  metaRows.forEach((row) => {
    page.drawText(row.label, {
      x: 356.2,
      y: row.y,
      size: 8,
      font: fontRegular,
      color: cBlack,
    });
    page.drawText(row.val, {
      x: 422.1,
      y: row.y,
      size: 8,
      font: fontRegular,
      color: cBlack,
    });
  });

  // --- 9. TABEL RINCIAN ITEM ---
  const tableHeaderTopY = ph - 203.1;
  const tableHeaderBottomY = ph - 216.3;

  page.drawLine({
    start: { x: leftX, y: tableHeaderTopY },
    end: { x: rightX, y: tableHeaderTopY },
    thickness: 1,
    color: cBorderLine,
  });

  const colDescX = leftX;
  const colQtyRightX = 352.0;
  const colUnitPriceRightX = 450.0;
  const colAmountRightX = rightX;

  const thTextY = ph - 213.2;
  page.drawText("Description", {
    x: colDescX,
    y: thTextY,
    size: 8,
    font: fontBold,
    color: cBlack,
  });

  const qtyHdrW = fontBold.widthOfTextAtSize("Quantity", 8);
  page.drawText("Quantity", {
    x: colQtyRightX - qtyHdrW,
    y: thTextY,
    size: 8,
    font: fontBold,
    color: cBlack,
  });

  const upHdrW = fontBold.widthOfTextAtSize("Unit Price", 8);
  page.drawText("Unit Price", {
    x: colUnitPriceRightX - upHdrW,
    y: thTextY,
    size: 8,
    font: fontBold,
    color: cBlack,
  });

  const amtHdrW = fontBold.widthOfTextAtSize("Amount", 8);
  page.drawText("Amount", {
    x: colAmountRightX - amtHdrW,
    y: thTextY,
    size: 8,
    font: fontBold,
    color: cBlack,
  });

  page.drawLine({
    start: { x: leftX, y: tableHeaderBottomY },
    end: { x: rightX, y: tableHeaderBottomY },
    thickness: 1,
    color: cBorderLine,
  });

  // Baris Data Item
  let rowY = tableHeaderBottomY - 12.1;
  const periodeFormatted = formatPeriodeLabel(header.periode);
  const tahapLabel = header.keteranganTahap ? header.keteranganTahap : periodeFormatted;

  const drawTableRow = (desc1: string, desc2: string | null, qtyStr: string, unitPrice: Decimal, amount: Decimal) => {
    page.drawText(desc1, {
      x: colDescX,
      y: rowY,
      size: 7.8,
      font: fontRegular,
      color: cBlack,
    });

    if (desc2) {
      page.drawText(desc2, {
        x: colDescX + 160,
        y: rowY,
        size: 7.8,
        font: fontRegular,
        color: cBlack,
      });
    }

    const qw = fontRegular.widthOfTextAtSize(qtyStr, 7.8);
    page.drawText(qtyStr, {
      x: colQtyRightX - qw,
      y: rowY,
      size: 7.8,
      font: fontRegular,
      color: cBlack,
    });

    const upStr = formatNumber(unitPrice);
    const upw = fontRegular.widthOfTextAtSize(upStr, 7.8);
    page.drawText(upStr, {
      x: colUnitPriceRightX - upw,
      y: rowY,
      size: 7.8,
      font: fontRegular,
      color: cBlack,
    });

    const amtStr = formatNumber(amount);
    const amtw = fontRegular.widthOfTextAtSize(amtStr, 7.8);
    page.drawText(amtStr, {
      x: colAmountRightX - amtw,
      y: rowY,
      size: 7.8,
      font: fontRegular,
      color: cBlack,
    });

    rowY -= 12.1;
  };

  if (rincian.length > 0) {
    rincian.forEach((item) => {
      const itemAmount = new Decimal(item.hasilHitung || 0);
      drawTableRow(item.namaPersonel, tahapLabel, "1", itemAmount, itemAmount);
    });
  } else {
    drawTableRow(`Layanan IT - ${header.namaProyek}`, tahapLabel, "1", dpp, dpp);
  }

  if (!penyesuaianGr.isZero()) {
    drawTableRow("Penyesuaian Selisih Evaluasi GR", "", "1", penyesuaianGr, penyesuaianGr);
  }

  // Garis penutup bawah tabel
  rowY -= 2;
  page.drawLine({
    start: { x: leftX, y: rowY },
    end: { x: rightX, y: rowY },
    thickness: 0.8,
    color: cBorderLine,
  });

  // --- 10. SUMMARY BOX (SUBTOTAL, VAT, TOTAL) ---
  const summaryLabelX = 315.1;

  rowY -= 10.4;
  page.drawText("SUBTOTAL", {
    x: summaryLabelX,
    y: rowY,
    size: 8,
    font: fontRegular,
    color: cBlack,
  });
  const subtotalStr = formatNumber(dpp);
  const subw = fontRegular.widthOfTextAtSize(subtotalStr, 8);
  page.drawText(subtotalStr, {
    x: colAmountRightX - subw,
    y: rowY,
    size: 8,
    font: fontRegular,
    color: cBlack,
  });

  rowY -= 9.9;
  page.drawText("VAT", {
    x: summaryLabelX,
    y: rowY,
    size: 8,
    font: fontRegular,
    color: cBlack,
  });
  const vatStr = formatNumber(nilaiPpn);
  const vatw = fontRegular.widthOfTextAtSize(vatStr, 8);
  page.drawText(vatStr, {
    x: colAmountRightX - vatw,
    y: rowY,
    size: 8,
    font: fontRegular,
    color: cBlack,
  });

  rowY -= 9.9;
  page.drawText("TOTAL", {
    x: summaryLabelX,
    y: rowY,
    size: 8.5,
    font: fontBold,
    color: cBlack,
  });
  const totalStr = formatNumber(grandTotal);
  const totw = fontBold.widthOfTextAtSize(totalStr, 8.5);
  page.drawText(totalStr, {
    x: colAmountRightX - totw,
    y: rowY,
    size: 8.5,
    font: fontBold,
    color: cBlack,
  });

  rowY -= 4;
  page.drawLine({
    start: { x: leftX, y: rowY },
    end: { x: rightX, y: rowY },
    thickness: 0.8,
    color: cBorderLine,
  });

  // --- 11. SIGNATURE SECTION & IDS CAP.JPG (KIRI) ---
  page.drawText(`Jakarta, ${formatFullDate(tglInvoice)}`, {
    x: leftX,
    y: ph - 321.5,
    size: 8,
    font: fontRegular,
    color: cBlack,
  });

  page.drawText("PT IDSTAR CIPTA TEKNOLOGI", {
    x: leftX,
    y: ph - 336.7,
    size: 8,
    font: fontBold,
    color: cBlack,
  });

  // EMBED IDS CAP.JPG (Stempel Resmi IDStar)
  if (capImage) {
    const capWidth = 88.0;
    const capHeight = capWidth * (capImage.height / capImage.width); // ~40.8 pt
    page.drawImage(capImage, {
      x: leftX,
      y: ph - 390.3,
      width: capWidth,
      height: capHeight,
    });
  }

  page.drawLine({
    start: { x: 50.5, y: ph - 403.7 },
    end: { x: 215.7, y: ph - 403.7 },
    thickness: 0.5,
    color: cBlack,
  });

  page.drawText("This in an automatic generated invoice. No signature required", {
    x: leftX,
    y: ph - 412.0,
    size: 6.2,
    font: fontRegular,
    color: cTextDark,
  });

  // --- 12. BOX TRANSFER BANK (KANAN) ---
  let bankName = "CIMB NIAGA";
  let accNumber = "860008423300";
  let branchName = "KCP Tebet";
  let swiftCode = "BNIAIDJA";

  if (bankOption === "bca" || (!namaKlien.toLowerCase().includes("cimb") && bankOption !== "mandiri")) {
    bankName = "Bank Central Asia (BCA)";
    accNumber = "541-098-7711";
    branchName = "KCU Mega Kuningan Jakarta";
    swiftCode = "CENAIDJA";
  } else if (bankOption === "mandiri") {
    bankName = "Bank Mandiri";
    accNumber = "124-00-1122334-9";
    branchName = "KC Jakarta Bellagio Mansion";
    swiftCode = "BMRIIDJA";
  }

  const transferBoxX = 339.2;
  const transferBoxW = 185.0;
  const transferBoxH = 68.1;
  const transferBoxY = ph - 473.7;

  page.drawRectangle({
    x: transferBoxX,
    y: transferBoxY,
    width: transferBoxW,
    height: transferBoxH,
    color: cBoxBg,
  });

  let tbY = transferBoxY + transferBoxH - 12.0;
  page.drawText("Please Transfer your payment to:", {
    x: transferBoxX + 6.0,
    y: tbY,
    size: 6.8,
    font: fontBold,
    color: cBlack,
  });

  tbY -= 10.0;
  page.drawText("Beneficiary Name : PT IDSTAR CIPTA TEKNOLOGI", {
    x: transferBoxX + 6.0,
    y: tbY,
    size: 6.2,
    font: fontRegular,
    color: cTextDark,
  });

  tbY -= 9.0;
  page.drawText(`Bank : ${bankName}`, {
    x: transferBoxX + 6.0,
    y: tbY,
    size: 6.2,
    font: fontRegular,
    color: cTextDark,
  });

  tbY -= 9.0;
  page.drawText(`Account Number : ${accNumber}`, {
    x: transferBoxX + 6.0,
    y: tbY,
    size: 6.2,
    font: fontBold,
    color: cBlack,
  });

  tbY -= 9.0;
  page.drawText(`Branch : ${branchName}`, {
    x: transferBoxX + 6.0,
    y: tbY,
    size: 6.2,
    font: fontRegular,
    color: cTextDark,
  });

  tbY -= 9.0;
  page.drawText(`Swift Code : ${swiftCode}`, {
    x: transferBoxX + 6.0,
    y: tbY,
    size: 6.2,
    font: fontRegular,
    color: cTextDark,
  });

  // --- 13. BOX NOTES (FULL WIDTH DI BAGIAN BAWAH) ---
  const notesBoxX = 53.2;
  const notesBoxW = 467.7;
  const notesBoxH = 58.7;
  const notesBoxY = ph - 548.3;

  page.drawRectangle({
    x: notesBoxX,
    y: notesBoxY,
    width: notesBoxW,
    height: notesBoxH,
    color: cBoxBg,
  });

  let nbY = notesBoxY + notesBoxH - 11.0;
  page.drawText("Notes:", {
    x: notesBoxX + 6.0,
    y: nbY,
    size: 6.8,
    font: fontBold,
    color: cBlack,
  });

  const notesList = [
    "1. Payment with cheque will be considered paid if only the cheque can be cashed",
    "2. This invoice can act as a receipt if affixed with a stamp duty",
    "3. We receive in full amount as mentioned above and before due.",
    "4. This is an automatic generated invoice. No signature required",
  ];

  notesList.forEach((nText) => {
    nbY -= 9.0;
    page.drawText(nText, {
      x: notesBoxX + 6.0,
      y: nbY,
      size: 6.0,
      font: fontRegular,
      color: cTextDark,
    });
  });

  // --- 14. GENERATE DAN RETURN RESPONSE ---
  const pdfBytes = await pdfDoc.save();

  const namaFile = `Invoice-${nomorInv.replace(/[^a-zA-Z0-9_-]/g, "_")}.pdf`;
  const disposition = isDownload ? "attachment" : "inline";

  return new NextResponse(Buffer.from(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${disposition}; filename="${namaFile}"`,
      "Cache-Control": "no-store",
    },
  });
}
