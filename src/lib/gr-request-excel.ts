import { db } from "@/db";
import { pengajuan, pengajuanDetail, po, poLineItem } from "@/db/schema";
import { eq } from "drizzle-orm";
import ExcelJS from "exceljs";
import Decimal from "decimal.js";

// Nama vendor resmi IDStar — sama seperti yang tampil di footer aplikasi.
export const NAMA_VENDOR = "PT IDStar Cipta Teknologi";
export const NAMA_SHEET_VENDOR = "Excelsheet for Vendor";

const HEADER_KOLOM: Record<string, string> = {
  B: "PO Type", C: "WBS Element", D: "Purch.Doc.", E: "PO Line", F: "PO Date",
  G: "Vendor", H: "PO Desc.", I: "Short Text", J: "PO Qty", K: "Price PO",
  L: "PO Value", M: "% Proposed GR", N: "Value of Proposed GR", O: "Qty GR Process",
  P: "Value GR Process", Q: "GR Number", R: "GR Number COUPA", S: "GR POSTING DATE",
  T: "GR STATUS", U: "PERIODE GR", V: "Acceptance Date", W: "Remarks GR",
};
const KOLOM_URUT = ["B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W"];

// Ambil & hitung semua data yang dibutuhkan untuk mengisi sheet "Excelsheet for
// Vendor" dari satu pengajuan — dipakai baik saat generate pertama kali maupun
// saat menyegarkan ulang sheet Vendor di dalam file gabungan (bagian 33-34).
export async function siapkanDataVendor(pengajuanId: number) {
  const [ajuan] = await db.select().from(pengajuan).where(eq(pengajuan.id, pengajuanId));
  if (!ajuan) throw new Error("Pengajuan tidak ditemukan.");

  const [poRow] = await db.select().from(po).where(eq(po.id, ajuan.poId));
  if (!poRow) throw new Error("PO tidak ditemukan.");

  const daftarLine = await db.select().from(poLineItem).where(eq(poLineItem.poId, poRow.id)).orderBy(poLineItem.nomorLine);
  if (daftarLine.length === 0) {
    throw new Error("PO ini belum punya PO Line Item. Isi dulu di Data Referensi > PO > Edit.");
  }

  const detail = await db.select().from(pengajuanDetail).where(eq(pengajuanDetail.pengajuanId, pengajuanId));

  const totalPerLine = new Map<number, Decimal>();
  for (const d of detail) {
    if (d.poLineItemId == null) continue;
    const sebelumnya = totalPerLine.get(d.poLineItemId) ?? new Decimal(0);
    totalPerLine.set(d.poLineItemId, sebelumnya.plus(new Decimal(d.hasilHitung)));
  }
  const adaTanpaLine = detail.some((d) => d.poLineItemId == null);
  const tanggalRequestGr = ajuan.tanggalRequestGr ?? new Date().toISOString().slice(0, 10);

  const barisLine = daftarLine.map((line) => {
    const qty = line.qty;
    const harga = new Decimal(line.hargaSatuan);
    const poValue = harga.times(qty);
    const valueProposed = totalPerLine.get(line.id) ?? null;
    return { line, qty, harga, poValue, valueProposed };
  });

  const peringatan: string[] = [];
  const adaBarisTerisi = barisLine.some((b) => b.valueProposed && b.valueProposed.greaterThan(0));
  if (adaTanpaLine) peringatan.push("Ada personel di pengajuan ini yang belum dipetakan ke PO Line — nilainya tidak masuk ke %/Value Proposed GR. Cek Data Referensi > Pemetaan.");
  if (!poRow.tanggalPo) peringatan.push("PO Date kosong — isi Tanggal PO di Data Referensi > PO > Edit.");
  if (!ajuan.tanggalCacApproved) peringatan.push("Date approved CAC kosong — isi dulu di kartu Status Proses.");
  if (!adaBarisTerisi) peringatan.push("Tidak ada baris dengan %/Value Proposed GR terisi — pastikan personel di pengajuan ini sudah dipetakan ke PO Line yang benar.");

  return { ajuan, poRow, barisLine, tanggalRequestGr, peringatan };
}

export type DataVendor = Awaited<ReturnType<typeof siapkanDataVendor>>;

// Tulis/timpa sheet "Excelsheet for Vendor" pada sebuah worksheet ExcelJS
// dengan data terbaru. Dipakai untuk generate baru (workbook kosong) maupun
// menyegarkan sheet di dalam file balikan XL saat digabungkan.
export function tulisSheetVendor(sheet: ExcelJS.Worksheet, data: DataVendor) {
  sheet.columns = KOLOM_URUT.map((k) => ({ key: k, width: k === "H" || k === "I" ? 32 : 16 }));
  // Bersihkan isi lama (kalau sheet ini sudah ada, mis. dari file balikan XL)
  // supaya tidak menumpuk baris basi, tanpa mengganggu sheet lain.
  sheet.spliceRows(1, sheet.rowCount + 1);

  const baris4 = sheet.getRow(4);
  const baris5 = sheet.getRow(5);
  for (const k of KOLOM_URUT) {
    baris4.getCell(k).value = HEADER_KOLOM[k];
    baris4.getCell(k).font = { bold: true };
  }
  const instruksi: Record<string, string> = {
    B: "can be left blank", C: "can be left blank", D: "Number of po", E: "Line item to be requested",
    F: "Date of PO", G: "Vendor Name", H: "Decription of PO (in PO File)", J: "Qty PO (in PO File)",
    K: "Price PO (in PO file)", L: "PO Value (in PO File)", M: "% Proposed GR", N: "Amount Proposed GR",
    O: "can be left blank", P: "can be left blank", Q: "can be left blank", R: "can be left blank",
    S: "can be left blank", T: "Proposed Period for GR", U: "Date approved CAC", V: "can be left blank",
  };
  for (const [k, v] of Object.entries(instruksi)) baris5.getCell(k).value = v;
  for (const k of KOLOM_URUT) baris5.getCell(k).font = { italic: true, color: { argb: "FF808080" }, size: 10 };

  const { ajuan, poRow, barisLine, tanggalRequestGr } = data;
  let baris = 6;
  let totalQty = 0, totalHarga = new Decimal(0), totalPoValue = new Decimal(0), totalValueProposed = new Decimal(0);
  let adaBarisTerisi = false;

  for (const { line, qty, harga, poValue, valueProposed } of barisLine) {
    const row = sheet.getRow(baris);
    row.getCell("D").value = poRow.nomorPo;
    row.getCell("E").value = line.nomorLine;
    if (poRow.tanggalPo) row.getCell("F").value = new Date(poRow.tanggalPo + "T00:00:00Z");
    row.getCell("G").value = NAMA_VENDOR;
    row.getCell("H").value = poRow.namaProyek;
    row.getCell("I").value = line.shortText;
    row.getCell("J").value = qty;
    row.getCell("K").value = Number(harga);
    row.getCell("K").numFmt = "#,##0";
    row.getCell("L").value = Number(poValue);
    row.getCell("L").numFmt = "#,##0";

    if (valueProposed && valueProposed.greaterThan(0)) {
      const persen = valueProposed.dividedBy(poValue);
      row.getCell("M").value = Number(persen);
      row.getCell("M").numFmt = "0.00%";
      row.getCell("N").value = Number(valueProposed);
      row.getCell("N").numFmt = "#,##0";
      totalValueProposed = totalValueProposed.plus(valueProposed);
      adaBarisTerisi = true;
    }

    row.getCell("T").value = new Date(tanggalRequestGr + "T00:00:00Z");
    row.getCell("T").numFmt = "dd/mm/yyyy";
    if (ajuan.tanggalCacApproved) {
      row.getCell("U").value = new Date(ajuan.tanggalCacApproved + "T00:00:00Z");
      row.getCell("U").numFmt = "dd/mm/yyyy";
    }

    totalQty += qty;
    totalHarga = totalHarga.plus(harga);
    totalPoValue = totalPoValue.plus(poValue);
    baris++;
  }

  const barisTotal = sheet.getRow(baris);
  barisTotal.getCell("H").value = "Grand Total";
  barisTotal.getCell("H").font = { bold: true };
  barisTotal.getCell("J").value = totalQty;
  barisTotal.getCell("K").value = Number(totalHarga);
  barisTotal.getCell("K").numFmt = "#,##0";
  barisTotal.getCell("L").value = Number(totalPoValue);
  barisTotal.getCell("L").numFmt = "#,##0";
  if (adaBarisTerisi) {
    barisTotal.getCell("M").value = Number(totalValueProposed.dividedBy(totalPoValue));
    barisTotal.getCell("M").numFmt = "0.00%";
    barisTotal.getCell("N").value = Number(totalValueProposed);
    barisTotal.getCell("N").numFmt = "#,##0";
  }
  for (const k of ["H", "J", "K", "L", "M", "N"]) barisTotal.getCell(k).font = { bold: true };
}

// Generate workbook baru berisi HANYA sheet "Excelsheet for Vendor" (dipakai
// untuk file pertama yang dikirim ke tim XL).
export async function generateWorkbookVendor(pengajuanId: number) {
  const data = await siapkanDataVendor(pengajuanId);
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(NAMA_SHEET_VENDOR);
  tulisSheetVendor(sheet, data);
  return { workbook, data };
}

export function namaFileGr(nomorPo: string, periode: string, sufiks: string) {
  const aman = (s: string) => s.replace(/[^a-zA-Z0-9_-]/g, "_");
  return `GR_Request_${aman(nomorPo)}_${aman(periode)}_${sufiks}.xlsx`;
}
