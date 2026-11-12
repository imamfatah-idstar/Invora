import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { personel } from "@/db/schema";
import { wajibRoleApi } from "@/lib/require-role-api";
import { userSaatIni } from "@/lib/session-server";
import { catatAudit } from "@/lib/audit";

export async function POST(request: NextRequest) {
  const gagal = await wajibRoleApi(["petugas"]);
  if (gagal) return gagal;
  const user = await userSaatIni();

  const body = await request.json().catch(() => null);
  if (!body?.nama || typeof body.nama !== "string" || !body.nama.trim()) {
    return NextResponse.json({ error: "Nama personel wajib diisi." }, { status: 400 });
  }

  const [row] = await db.insert(personel).values({
    nik: body.nik?.trim() || null,
    nama: body.nama.trim(),
    posisi: body.posisi?.trim() || null,
    tipe: body.tipe?.trim() || null,
    penempatan: body.penempatan?.trim() || null,
    nomorSpk: body.nomorSpk?.trim() || null,
    status: body.status === "nonaktif" ? "nonaktif" : "aktif",
  }).returning();

  await catatAudit({ entitas: "personel", entitasId: row.id, perubahan: `Tambah personel "${row.nama}"`, userId: user!.id });

  return NextResponse.json(row, { status: 201 });
}
