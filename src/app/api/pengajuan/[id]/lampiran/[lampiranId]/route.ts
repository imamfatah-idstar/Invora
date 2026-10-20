import { NextRequest, NextResponse } from "next/server";
import { unlink } from "fs/promises";
import path from "path";
import { db } from "@/db";
import { lampiranPengajuan } from "@/db/schema";
import { eq } from "drizzle-orm";
import { wajibRoleApi } from "@/lib/require-role-api";
import { userSaatIni } from "@/lib/session-server";
import { catatAudit } from "@/lib/audit";

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string; lampiranId: string }> }) {
  const gagal = await wajibRoleApi(["petugas", "checker"]);
  if (gagal) return gagal;
  const user = await userSaatIni();
  const { lampiranId } = await params;

  const [row] = await db.select().from(lampiranPengajuan).where(eq(lampiranPengajuan.id, Number(lampiranId)));
  if (!row) {
    return NextResponse.json({ error: "Lampiran tidak ditemukan." }, { status: 404 });
  }

  await db.delete(lampiranPengajuan).where(eq(lampiranPengajuan.id, row.id));
  const subPath = row.pathFile.replace(/^[/\\]*uploads[/\\]*/, "");
  await unlink(path.join(/*turbopackIgnore: true*/ process.cwd(), "uploads", subPath)).catch(() => {});

  await catatAudit({
    entitas: "lampiran_pengajuan", entitasId: row.id, userId: user!.id,
    perubahan: `Hapus lampiran "${row.label}" (${row.namaFile}) dari pengajuan #${row.pengajuanId}`,
  });

  return NextResponse.json({ ok: true });
}
