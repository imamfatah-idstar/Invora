import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { pemetaanPersonelPo } from "@/db/schema";
import { wajibRoleApi } from "@/lib/require-role-api";
import { userSaatIni } from "@/lib/session-server";
import { catatAudit } from "@/lib/audit";

export async function POST(request: NextRequest) {
  const gagal = await wajibRoleApi(["petugas"]);
  if (gagal) return gagal;
  const user = await userSaatIni();

  const body = await request.json().catch(() => null);
  if (!body?.personelId || !body?.poId) {
    return NextResponse.json({ error: "Personel dan PO wajib dipilih." }, { status: 400 });
  }
  if (!body?.berlakuDari) {
    return NextResponse.json({ error: "Tanggal berlaku dari wajib diisi." }, { status: 400 });
  }

  const [row] = await db.insert(pemetaanPersonelPo).values({
    personelId: Number(body.personelId),
    poId: Number(body.poId),
    poLineItemId: body.poLineItemId ? Number(body.poLineItemId) : null,
    berlakuDari: body.berlakuDari,
    berlakuSampai: body.berlakuSampai || null,
  }).returning();

  await catatAudit({ entitas: "pemetaan_personel_po", entitasId: row.id, perubahan: `Tambah pemetaan personelId=${row.personelId} ke poId=${row.poId}`, userId: user!.id });

  return NextResponse.json(row, { status: 201 });
}
