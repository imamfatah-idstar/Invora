import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { kalenderKerja } from "@/db/schema";
import { wajibRoleApi } from "@/lib/require-role-api";
import { userSaatIni } from "@/lib/session-server";
import { catatAudit } from "@/lib/audit";

const TIPE_VALID = ["kerja", "libur_nasional", "cuti_bersama"];

export async function POST(request: NextRequest) {
  const gagal = await wajibRoleApi(["petugas"]);
  if (gagal) return gagal;
  const user = await userSaatIni();

  const body = await request.json().catch(() => null);
  if (!body?.tanggal || !/^\d{4}-\d{2}-\d{2}$/.test(body.tanggal)) {
    return NextResponse.json({ error: "Tanggal wajib diisi (format YYYY-MM-DD)." }, { status: 400 });
  }
  if (!TIPE_VALID.includes(body.tipe)) {
    return NextResponse.json({ error: "Tipe tidak valid." }, { status: 400 });
  }

  try {
    const [row] = await db.insert(kalenderKerja).values({
      tanggal: body.tanggal,
      tipe: body.tipe,
      keterangan: body.keterangan || null,
    }).returning();

    await catatAudit({ entitas: "kalender_kerja", entitasId: 0, perubahan: `Tambah kalender ${row.tanggal} tipe=${row.tipe}`, userId: user!.id });

    return NextResponse.json(row, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Tanggal ini sudah ada di kalender." }, { status: 409 });
  }
}
