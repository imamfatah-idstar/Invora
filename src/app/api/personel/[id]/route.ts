import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { personel } from "@/db/schema";
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
    return NextResponse.json({ error: "Nama personel wajib diisi." }, { status: 400 });
  }

  await db.update(personel).set({
    nama: String(body.nama).trim(),
    status: body.status === "nonaktif" ? "nonaktif" : "aktif",
  }).where(eq(personel.id, Number(id)));

  await catatAudit({ entitas: "personel", entitasId: Number(id), perubahan: `Ubah personel menjadi nama="${body.nama}", status="${body.status}"`, userId: user!.id });

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const gagal = await wajibRoleApi(["petugas"]);
  if (gagal) return gagal;
  const user = await userSaatIni();

  const { id } = await params;
  try {
    await db.delete(personel).where(eq(personel.id, Number(id)));
    await catatAudit({ entitas: "personel", entitasId: Number(id), perubahan: "Hapus personel", userId: user!.id });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Tidak bisa dihapus — personel ini masih dipakai di data lain (rate card/pemetaan/pengajuan)." },
      { status: 409 }
    );
  }
}
