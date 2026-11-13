import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { dokumen } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { wajibRoleApi } from "@/lib/require-role-api";
import { userSaatIni } from "@/lib/session-server";
import { catatAudit } from "@/lib/audit";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; dokumenId: string }> }
) {
  const gagal = await wajibRoleApi(["petugas", "checker", "admin"]);
  if (gagal) return gagal;
  const user = await userSaatIni();
  const { id, dokumenId } = await params;
  const pengajuanId = Number(id);
  const docId = Number(dokumenId);

  const [existing] = await db
    .select()
    .from(dokumen)
    .where(and(eq(dokumen.id, docId), eq(dokumen.pengajuanId, pengajuanId)));

  if (!existing) {
    return NextResponse.json({ error: "Dokumen tidak ditemukan." }, { status: 404 });
  }

  await db
    .delete(dokumen)
    .where(and(eq(dokumen.id, docId), eq(dokumen.pengajuanId, pengajuanId)));

  await catatAudit({
    entitas: "pengajuan",
    entitasId: pengajuanId,
    perubahan: `Hapus dokumen ${existing.jenis} (#${docId}, v${existing.versi}) dari sistem`,
    userId: user!.id,
  });

  return NextResponse.json({ ok: true });
}
