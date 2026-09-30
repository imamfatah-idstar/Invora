import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { rateCard } from "@/db/schema";
import { eq } from "drizzle-orm";
import { wajibRoleApi } from "@/lib/require-role-api";
import { userSaatIni } from "@/lib/session-server";
import { catatAudit } from "@/lib/audit";
import { angkaDesimalValid } from "@/lib/validasi";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const gagal = await wajibRoleApi(["petugas"]);
  if (gagal) return gagal;
  const user = await userSaatIni();
  const { id } = await params;
  const body = await request.json().catch(() => null);

  if (!angkaDesimalValid(body?.nilaiRate)) {
    return NextResponse.json({ error: "Nilai rate harus berupa angka valid." }, { status: 400 });
  }
  if (!body?.berlakuDari) {
    return NextResponse.json({ error: "Tanggal berlaku dari wajib diisi." }, { status: 400 });
  }

  await db.update(rateCard).set({
    nilaiRate: body.nilaiRate,
    berlakuDari: body.berlakuDari,
    berlakuSampai: body.berlakuSampai || null,
  }).where(eq(rateCard.id, Number(id)));

  await catatAudit({ entitas: "rate_card", entitasId: Number(id), perubahan: `Ubah rate card: nilai=${body.nilaiRate}, berlakuDari=${body.berlakuDari}, berlakuSampai=${body.berlakuSampai || "-"}`, userId: user!.id });

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const gagal = await wajibRoleApi(["petugas"]);
  if (gagal) return gagal;
  const user = await userSaatIni();
  const { id } = await params;
  try {
    await db.delete(rateCard).where(eq(rateCard.id, Number(id)));
    await catatAudit({ entitas: "rate_card", entitasId: Number(id), perubahan: "Hapus rate card", userId: user!.id });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Tidak bisa dihapus — rate card ini masih dipakai." }, { status: 409 });
  }
}
