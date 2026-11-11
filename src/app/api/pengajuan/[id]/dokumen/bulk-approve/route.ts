import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { dokumen, pengajuan } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";
import { wajibRoleApi } from "@/lib/require-role-api";
import { userSaatIni } from "@/lib/session-server";
import { catatAudit } from "@/lib/audit";

// POST /api/pengajuan/[id]/dokumen/bulk-approve
// Checker menyetujui seluruh dokumen (CAC, BAST, GR) yang belum disetujui
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const gagal = await wajibRoleApi(["checker", "admin"]);
  if (gagal) return gagal;
  const user = await userSaatIni();
  if (!user) {
    return NextResponse.json({ error: "Sesi tidak valid." }, { status: 401 });
  }

  const { id } = await params;
  const pengajuanId = Number(id);

  const [ajuan] = await db.select().from(pengajuan).where(eq(pengajuan.id, pengajuanId));
  if (!ajuan) {
    return NextResponse.json({ error: "Pengajuan tidak ditemukan." }, { status: 404 });
  }

  const daftarDok = await db
    .select()
    .from(dokumen)
    .where(eq(dokumen.pengajuanId, pengajuanId));

  const belumDisetujui = daftarDok.filter((d) => d.status !== "disetujui");
  if (belumDisetujui.length === 0) {
    return NextResponse.json({ message: "Semua dokumen sudah disetujui." }, { status: 200 });
  }

  const ids = belumDisetujui.map((d) => d.id);
  const waktu = new Date().toISOString();

  await db
    .update(dokumen)
    .set({
      status: "disetujui",
      disetujuiOlehUserId: user.id,
      disetujuiPada: waktu,
    })
    .where(inArray(dokumen.id, ids));

  const jenisList = belumDisetujui.map((d) => d.jenis).join(", ");
  await catatAudit({
    entitas: "pengajuan",
    entitasId: pengajuanId,
    perubahan: `Checker ${user.nama} menyetujui sekaligus dokumen (${jenisList})`,
    userId: user.id,
  });

  return NextResponse.json({
    ok: true,
    jumlahDisetujui: ids.length,
    jenisList,
  });
}

