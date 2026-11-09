import { z } from "zod";
import Decimal from "decimal.js";

// Konfigurasi global Decimal untuk akuntansi yang konsisten
Decimal.set({
  precision: 28,
  rounding: Decimal.ROUND_HALF_UP,
});

/**
 * Validator nilai uang: wajib string numerik, positif (> 0),
 * maksimal 2 angka di belakang koma, dan bebas dari NaN/Infinity.
 */
export const MonetaryAmountSchema = z
  .string()
  .trim()
  .refine(
    (val) => {
      if (!/^\d+(\.\d{1,2})?$/.test(val)) return false;
      try {
        const d = new Decimal(val);
        return d.isFinite() && d.gt(0) && d.decimalPlaces() <= 2;
      } catch {
        return false;
      }
    },
    {
      message: "Nilai nominal harus berupa angka positif valid dengan maksimal 2 desimal.",
    }
  )
  .transform((val) => new Decimal(val));

/**
 * Sanitasi string untuk mencegah Formula Injection saat diekspor ke Excel
 */
export function sanitizeSpreadsheetString(input: string): string {
  const trimmed = input.trim();
  // Jika diawali dengan karakter kontrol formula (=, +, -, @, Tab, CR),
  // tambahkan tanda kutip tunggal di awal agar dibaca sebagai teks biasa.
  if (/^[=+\-@\t\r]/.test(trimmed)) {
    return `'${trimmed}`;
  }
  return trimmed;
}

export const UpdateDeficiencyInputSchema = z.object({
  pengajuanId: z.string().uuid("ID Pengajuan tidak valid"),
  klienId: z.string().uuid("ID Klien tidak valid"),
  nominalDefisiensi: MonetaryAmountSchema,
  catatan: z
    .string()
    .min(1, "Catatan wajib diisi")
    .max(500, "Catatan maksimal 500 karakter")
    .transform(sanitizeSpreadsheetString),
});

