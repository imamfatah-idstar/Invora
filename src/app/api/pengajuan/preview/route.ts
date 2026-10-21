import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { po } from "@/db/schema";
import { eq } from "drizzle-orm";
import { wajibRoleApi } from "@/lib/require-role-api";
import { hitungSemuaPersonelUntukPo, terapkanAlokasiLintasPo, daftarPersonelTahap } from "@/lib/hitung-pengajuan";

export async function POST(request: NextRequest) {
  const gagal = await wajibRoleApi(["petugas"]);
  if (gagal) return gagal;

  const body = await request.json().catch(() => null);
  if (!body?.poId || !body?.periode) {
    return NextResponse.json({ error: "PO dan periode wajib diisi." }, { status: 400 });
  }

  const poId = Number(body.poId);
  const [poRow] = await db.select().from(po).where(eq(po.id, poId));
  if (!poRow) {
    return NextResponse.json({ error: "PO tidak ditemukan." }, { status: 404 });
  }

  // PO "tahap" (bagian 53): tidak ada hitung otomatis — kembalikan daftar
  // personel saja, nilai diisi manual oleh Petugas di form.
  if (poRow.jenisTagihan === "tahap") {
    const barisTahap = await daftarPersonelTahap(poId, body.periode);
    return NextResponse.json({ jenis: "tahap", baris: barisTahap });
  }

  const barisMentah = await hitungSemuaPersonelUntukPo(poId, body.periode);
  // Alokasi lintas-PO (bagian 35) — kalau personel sudah pernah ditagihkan
  // sebagian ke PO lain di periode yang sama, sisanya dihitung dan dibatasi
  // ke saldo PO ini yang tersisa (saldoSebelumPpn), sisanya lagi jadi
  // "belum tertagih di sini" untuk pengajuan berikutnya di PO lain.
  const baris = await terapkanAlokasiLintasPo(barisMentah, poId, body.periode, poRow.saldoSebelumPpn);

  // MVP 4: Cek apakah ada Deficiency GR (selisih GR) dari pengajuan sebelumnya
  // yang belum pernah diserap (one-time carry-over).
  const { cariSelisihGrMenggantung } = await import("@/lib/deficiency-gr-server");
  const selisihMenggantung = await cariSelisihGrMenggantung(poId);

  return NextResponse.json({ jenis: "bulanan", baris, selisihMenggantung });
}
