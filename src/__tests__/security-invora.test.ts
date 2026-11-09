import { describe, it, expect } from "vitest";
import {
  MonetaryAmountSchema,
  sanitizeSpreadsheetString,
  UpdateDeficiencyInputSchema,
} from "../lib/security-validators";
import { loadPdfDocumentSafely } from "../lib/secure-document";

describe("Audit Keamanan Otomatis - Invora Security Suite", () => {
  describe("1. Validasi Presisi Finansial (decimal.js & Zod)", () => {
    it("menerima nilai nominal positif yang valid hingga 2 desimal", () => {
      const result = MonetaryAmountSchema.safeParse("1500000.50");
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.toFixed(2)).toBe("1500000.50");
      }
    });

    it("menolak nilai negatif, nol, dan presisi lebih dari 2 desimal", () => {
      expect(MonetaryAmountSchema.safeParse("-50000").success).toBe(false);
      expect(MonetaryAmountSchema.safeParse("0").success).toBe(false);
      expect(MonetaryAmountSchema.safeParse("0.00").success).toBe(false);
      expect(MonetaryAmountSchema.safeParse("100.123").success).toBe(false);
      expect(MonetaryAmountSchema.safeParse("NaN").success).toBe(false);
      expect(MonetaryAmountSchema.safeParse("Infinity").success).toBe(false);
    });
  });

  describe("2. Mitigasi Formula Injection pada Ekspor Excel (exceljs)", () => {
    it("menambahkan prefiks kutip tunggal pada string yang diawali karakter formula", () => {
      expect(sanitizeSpreadsheetString("=SUM(A1:A10)")).toBe("'=SUM(A1:A10)");
      expect(sanitizeSpreadsheetString("+100-20")).toBe("'+100-20");
      expect(sanitizeSpreadsheetString("-100+20")).toBe("'-100+20");
      expect(sanitizeSpreadsheetString("@A1")).toBe("'@A1");
    });

    it("membiarkan teks deskripsi BAST normal tanpa perubahan", () => {
      const normalText = "Pengajuan BAST Pekerjaan Infrastruktur Tahap 1";
      expect(sanitizeSpreadsheetString(normalText)).toBe(normalText);
    });

    it("menyanitasi catatan secara otomatis melalui UpdateDeficiencyInputSchema", () => {
      const payload = {
        pengajuanId: "550e8400-e29b-41d4-a716-446655440000",
        klienId: "660e8400-e29b-41d4-a716-446655440111",
        nominalDefisiensi: "250000.00",
        catatan: "=1+1",
      };

      const parsed = UpdateDeficiencyInputSchema.safeParse(payload);
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.catatan).toBe("'=1+1");
      }
    });
  });

  describe("3. Keamanan Pemrosesan Dokumen PDF (pdf-lib)", () => {
    it("menolak berkas yang tidak memiliki header magic bytes %PDF-", async () => {
      const fakePdfBuffer = new TextEncoder().encode("<html>Bukan PDF</html>");
      await expect(loadPdfDocumentSafely(fakePdfBuffer)).rejects.toThrow(
        "Format berkas tidak valid"
      );
    });

    it("menolak berkas PDF yang melebihi batas ukuran 10 MB", async () => {
      const oversizedBuffer = new Uint8Array(10 * 1024 * 1024 + 1);
      await expect(loadPdfDocumentSafely(oversizedBuffer)).rejects.toThrow(
        "Ukuran berkas PDF melebihi batas maksimum"
      );
    });
  });
});

