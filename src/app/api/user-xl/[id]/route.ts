import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { userXl } from "@/db/schema";
import { eq } from "drizzle-orm";
import { wajibRoleApi } from "@/lib/require-role-api";
import { userSaatIni } from "@/lib/session-server";
import { catatAudit } from "@/lib/audit";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const gagal = await wajibRoleApi(["petugas"]);
  if (gagal) return gagal;
  const user = await userSaatIni();
  const { id } = await params;
  const body = await request.json().catch(() => null);
  if (!body?.nama || !String(body.nama).trim()) {
    return NextResponse.json({ error: "Nama User XL wajib diisi." }, { status: 400 });
  }
  await db.update(userXl).set({
    nama: String(body.nama).trim(),
    kontak: body.kontak ? String(body.kontak).trim() : null,
  }).where(eq(userXl.id, Number(id)));

  await catatAudit({ entitas: "user_xl", entitasId: Number(id), perubahan: `Ubah User XL menjadi nama="${body.nama}"`, userId: user!.id });

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const gagal = await wajibRoleApi(["petugas"]);
  if (gagal) return gagal;
  const user = await userSaatIni();
  const { id } = await params;
  try {
    await db.delete(userXl).where(eq(userXl.id, Number(id)));
    await catatAudit({ entitas: "user_xl", entitasId: Number(id), perubahan: "Hapus User XL", userId: user!.id });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Tidak bisa dihapus — User XL ini masih dipakai di pengajuan." }, { status: 409 });
  }
}
