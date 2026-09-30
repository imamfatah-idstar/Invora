import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { userXl } from "@/db/schema";
import { wajibRoleApi } from "@/lib/require-role-api";
import { userSaatIni } from "@/lib/session-server";
import { catatAudit } from "@/lib/audit";

export async function POST(request: NextRequest) {
  const gagal = await wajibRoleApi(["petugas"]);
  if (gagal) return gagal;
  const user = await userSaatIni();

  const body = await request.json().catch(() => null);
  if (!body?.nama || !String(body.nama).trim()) {
    return NextResponse.json({ error: "Nama User XL wajib diisi." }, { status: 400 });
  }
  const [row] = await db.insert(userXl).values({
    nama: String(body.nama).trim(),
    kontak: body.kontak ? String(body.kontak).trim() : null,
  }).returning();

  await catatAudit({ entitas: "user_xl", entitasId: row.id, perubahan: `Tambah User XL "${row.nama}"`, userId: user!.id });

  return NextResponse.json(row, { status: 201 });
}
