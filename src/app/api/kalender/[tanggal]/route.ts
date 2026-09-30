import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { kalenderKerja } from "@/db/schema";
import { eq } from "drizzle-orm";
import { wajibRoleApi } from "@/lib/require-role-api";
import { userSaatIni } from "@/lib/session-server";
import { catatAudit } from "@/lib/audit";

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ tanggal: string }> }) {
  const gagal = await wajibRoleApi(["petugas"]);
  if (gagal) return gagal;
  const user = await userSaatIni();
  const { tanggal } = await params;
  await db.delete(kalenderKerja).where(eq(kalenderKerja.tanggal, tanggal));
  await catatAudit({ entitas: "kalender_kerja", entitasId: 0, perubahan: `Hapus kalender ${tanggal}`, userId: user!.id });
  return NextResponse.json({ ok: true });
}
