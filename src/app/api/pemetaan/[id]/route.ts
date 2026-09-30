import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { pemetaanPersonelPo } from "@/db/schema";
import { eq } from "drizzle-orm";
import { wajibRoleApi } from "@/lib/require-role-api";
import { userSaatIni } from "@/lib/session-server";
import { catatAudit } from "@/lib/audit";

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const gagal = await wajibRoleApi(["petugas"]);
  if (gagal) return gagal;
  const user = await userSaatIni();
  const { id } = await params;
  await db.delete(pemetaanPersonelPo).where(eq(pemetaanPersonelPo.id, Number(id)));
  await catatAudit({ entitas: "pemetaan_personel_po", entitasId: Number(id), perubahan: "Hapus pemetaan", userId: user!.id });
  return NextResponse.json({ ok: true });
}
