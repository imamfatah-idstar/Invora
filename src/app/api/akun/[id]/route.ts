import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { wajibRoleApi } from "@/lib/require-role-api";
import { userSaatIni } from "@/lib/session-server";
import { catatAudit } from "@/lib/audit";

const ROLE_VALID = ["admin", "petugas", "checker"];

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const gagal = await wajibRoleApi(["admin"]);
  if (gagal) return gagal;
  const user = await userSaatIni();
  const { id } = await params;
  const targetId = Number(id);

  if (targetId === user!.id) {
    return NextResponse.json({ error: "Tidak bisa mengubah akun sendiri lewat halaman ini — minta admin lain." }, { status: 400 });
  }

  const body = await request.json().catch(() => null);
  const perubahan: { role?: string; aktif?: boolean } = {};
  const catatan: string[] = [];

  if (body?.role !== undefined) {
    if (!ROLE_VALID.includes(body.role)) {
      return NextResponse.json({ error: "Peran tidak valid." }, { status: 400 });
    }
    perubahan.role = body.role;
    catatan.push(`peran -> ${body.role}`);
  }
  if (body?.aktif !== undefined) {
    if (typeof body.aktif !== "boolean") {
      return NextResponse.json({ error: "Status aktif tidak valid." }, { status: 400 });
    }
    perubahan.aktif = body.aktif;
    catatan.push(body.aktif ? "diaktifkan" : "dinonaktifkan");
  }

  if (Object.keys(perubahan).length === 0) {
    return NextResponse.json({ error: "Tidak ada perubahan dikirim." }, { status: 400 });
  }

  const [row] = await db.update(users).set(perubahan).where(eq(users.id, targetId)).returning();
  if (!row) {
    return NextResponse.json({ error: "Akun tidak ditemukan." }, { status: 404 });
  }

  await catatAudit({ entitas: "users", entitasId: row.id, perubahan: `Ubah akun "${row.email}": ${catatan.join(", ")}`, userId: user!.id });

  return NextResponse.json({ id: row.id, role: row.role, aktif: row.aktif });
}
