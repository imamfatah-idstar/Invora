import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { rateCard } from "@/db/schema";
import { wajibRoleApi } from "@/lib/require-role-api";
import { userSaatIni } from "@/lib/session-server";
import { catatAudit } from "@/lib/audit";
import { angkaDesimalValid } from "@/lib/validasi";

export async function POST(request: NextRequest) {
  const gagal = await wajibRoleApi(["petugas"]);
  if (gagal) return gagal;
  const user = await userSaatIni();

  const body = await request.json().catch(() => null);
  if (!body?.personelId || !Number.isInteger(Number(body.personelId))) {
    return NextResponse.json({ error: "Personel wajib dipilih." }, { status: 400 });
  }
  if (!angkaDesimalValid(body.nilaiRate)) {
    return NextResponse.json({ error: "Nilai rate harus berupa angka valid (maks 2 desimal)." }, { status: 400 });
  }
  if (!body?.berlakuDari) {
    return NextResponse.json({ error: "Tanggal berlaku dari wajib diisi." }, { status: 400 });
  }

  const [row] = await db.insert(rateCard).values({
    personelId: Number(body.personelId),
    nilaiRate: body.nilaiRate,
    berlakuDari: body.berlakuDari,
    berlakuSampai: body.berlakuSampai || null,
  }).returning();

  await catatAudit({ entitas: "rate_card", entitasId: row.id, perubahan: `Tambah rate card personelId=${row.personelId} nilai=${row.nilaiRate} berlakuDari=${row.berlakuDari}`, userId: user!.id });

  return NextResponse.json(row, { status: 201 });
}
