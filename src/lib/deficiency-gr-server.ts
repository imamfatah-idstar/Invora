import { db } from "@/db";
import { pengajuan } from "@/db/schema";
import { eq, and, isNull, ne, sql } from "drizzle-orm";
import Decimal from "decimal.js";

/**
 * Mencari apakah ada pengajuan sebelumnya pada PO yang sama yang memiliki selisih GR menggantung
 * dan belum pernah diserap oleh pengajuan lain (one-time carry-over).
 */
export async function cariSelisihGrMenggantung(poId: number, pengajuanIdSekarang?: number) {
  const conditions = [
    eq(pengajuan.poId, poId),
    isNull(pengajuan.selisihGrDipakaiPadaPengajuanId),
    sql`${pengajuan.selisihGr} IS NOT NULL AND ${pengajuan.selisihGr} != '0.00' AND ${pengajuan.selisihGr} != '0'`,
  ];

  if (pengajuanIdSekarang) {
    conditions.push(ne(pengajuan.id, pengajuanIdSekarang));
  }

  const baris = await db
    .select({
      id: pengajuan.id,
      periode: pengajuan.periode,
      nomorInvoice: pengajuan.nomorInvoice,
      selisihGr: pengajuan.selisihGr,
    })
    .from(pengajuan)
    .where(and(...conditions))
    .limit(1);

  if (baris.length === 0) return null;

  const item = baris[0];
  const nominalDec = new Decimal(item.selisihGr!);
  return {
    sumberPengajuanId: item.id,
    periode: item.periode,
    nomorInvoice: item.nomorInvoice,
    nominal: nominalDec.toFixed(2),
    isKekurangan: nominalDec.greaterThan(0),
  };
}
