import ExcelJS from "exceljs";
import { PDFDocument } from "pdf-lib";
import { sanitizeSpreadsheetString } from "./security-validators";

const MAX_PDF_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
const MAX_PDF_PAGES = 100;

/**
 * Helper penulisan baris Excel yang aman dari Formula Injection
 */
export function addSafeWorksheetRow(
  worksheet: ExcelJS.Worksheet,
  values: Array<string | number | Date | null | undefined>
) {
  const sanitizedValues = values.map((val) => {
    if (typeof val === "string") {
      return sanitizeSpreadsheetString(val);
    }
    return val ?? "";
  });

  const row = worksheet.addRow(sanitizedValues);
  return row;
}

/**
 * Memuat dokumen PDF dengan validasi ukuran, header magic bytes, dan batas halaman
 */
export async function loadPdfDocumentSafely(pdfBuffer: Uint8Array): Promise<PDFDocument> {
  if (pdfBuffer.byteLength > MAX_PDF_SIZE_BYTES) {
    throw new Error("Ukuran berkas PDF melebihi batas maksimum (10 MB).");
  }

  // Verifikasi Magic Bytes "%PDF-" (0x25 0x50 0x44 0x46 0x2D)
  const isPdfHeader =
    pdfBuffer.length >= 5 &&
    pdfBuffer[0] === 0x25 &&
    pdfBuffer[1] === 0x50 &&
    pdfBuffer[2] === 0x44 &&
    pdfBuffer[3] === 0x46 &&
    pdfBuffer[4] === 0x2d;

  if (!isPdfHeader) {
    throw new Error("Format berkas tidak valid. Berkas bukan dokumen PDF asli.");
  }

  const pdfDoc = await PDFDocument.load(pdfBuffer, {
    ignoreEncryption: false, // Tolak PDF terenkripsi yang tidak terduga
    throwOnInvalidObject: true,
  });

  if (pdfDoc.getPageCount() > MAX_PDF_PAGES) {
    throw new Error(`Jumlah halaman PDF melebihi batas maksimum (${MAX_PDF_PAGES} halaman).`);
  }

  return pdfDoc;
}

