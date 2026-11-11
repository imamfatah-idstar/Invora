import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { dokumen, pengajuan, users } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { wajibRoleApi } from "@/lib/require-role-api";
import { userSaatIni } from "@/lib/session-server";
import { catatAudit } from "@/lib/audit";

// POST /api/pengajuan/[id]/dokumen/[dokumenId]/approve
// Checker menyetujui atau meminta revisi dokumen CAC / BAST / GR
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; dokumenId: string }> }
) {
  const gagal = await wajibRoleApi(["checker", "admin"]);
  if (gagal) return gagal;
  const user = await userSaatIni();
  if (!user) {
    return NextResponse.json({ error: "Sesi tidak valid." }, { status: 401 });
  }

  const { id, dokumenId } = await params;
  const pengajuanId = Number(id);
  const dokId = Number(dokumenId);

  const [ajuan] = await db.select().from(pengajuan).where(eq(pengajuan.id, pengajuanId));
  if (!ajuan) {
    return NextResponse.json({ error: "Pengajuan tidak ditemukan." }, { status: 404 });
  }

  const [dok] = await db
    .select()
    .from(dokumen)
    .where(and(eq(dokumen.id, dokId), eq(dokumen.pengajuanId, pengajuanId)));

  if (!dok) {
    return NextResponse.json({ error: "Dokumen tidak ditemukan." }, { status: 404 });
  }

  const body = await request.json().catch(() => ({}));
  const tindakan = body?.tindakan === "revisi" ? "perlu_revisi" : "disetujui";
  const catatan = typeof body?.catatan === "string" ? body.catatan.trim() : "";
  const waktu = new Date().toISOString();

  if (tindakan === "disetujui") {
    await db
      .update(dokumen)
      .set({
        status: "disetujui",
        disetujuiOlehUserId: user.id,
        disetujuiPada: waktu,
        catatanChecker: catatan || null,
      })
      .where(eq(dokumen.id, dok.id));

    await catatAudit({
      entitas: "pengajuan",
      entitasId: pengajuanId,
      perubahan: `Checker ${user.nama} menyetujui dokumen ${dok.jenis} (ID #${dok.id})`,
      userId: user.id,
    });
  } else {
    await db
      .update(dokumen)
      .set({
        status: "perlu_revisi",
        disetujuiOlehUserId: null,
        disetujuiPada: null,
        catatanChecker: catatan || "Perlu revisi oleh petugas",
      })
      .where(eq(dokumen.id, dok.id));

    await catatAudit({
      entitas: "pengajuan",
      entitasId: pengajuanId,
      perubahan: `Checker ${user.nama} meminta revisi dokumen ${dok.jenis} (ID #${dok.id}): ${catatan || "-"}`,
      userId: user.id,
    });
  }

  return NextResponse.json({
    ok: true,
    status: tindakan,
    disetujuiPada: tindakan === "disetujui" ? waktu : null,
    checkerNama: user.nama,
  });
}
