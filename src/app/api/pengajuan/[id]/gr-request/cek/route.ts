import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { grRequest, grRequestRiwayat } from "@/db/schema";
import { eq } from "drizzle-orm";
import { wajibRoleApi } from "@/lib/require-role-api";
import { userSaatIni } from "@/lib/session-server";
import { catatAudit } from "@/lib/audit";

// POST /api/pengajuan/[id]/gr-request/cek — Checker menandai file gabungan
// GR Request sudah dicek manual (SOW/COVER isian XL sesuai). Tercatat siapa
// & kapan, sesuai kebutuhan audit untuk presentasi ke leadership. Bagian 34.
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const gagal = await wajibRoleApi(["petugas", "checker"]);
  if (gagal) return gagal;
  const user = await userSaatIni();
  const { id } = await params;
  const pengajuanId = Number(id);

  let [row] = await db.select().from(grRequest).where(eq(grRequest.pengajuanId, pengajuanId));
  const body = await request.json().catch(() => ({}));
  const catatan = typeof body?.catatan === "string" ? body.catatan.trim() : "";

  const waktu = new Date().toISOString();

  if (!row) {
    const [inserted] = await db.insert(grRequest).values({
      pengajuanId,
      dicekOlehUserId: user!.id,
      dicekPada: waktu,
      catatanCek: catatan || null,
    }).returning();
    row = inserted;
  } else {
    await db.update(grRequest).set({
      dicekOlehUserId: user!.id,
      dicekPada: waktu,
      catatanCek: catatan || null,
    }).where(eq(grRequest.id, row.id));
  }

  await catatAudit({
    entitas: "gr_request", entitasId: row.id, userId: user!.id,
    perubahan: `Tandai GR Request sudah dicek untuk pengajuan id=${pengajuanId}`,
  });
  await db.insert(grRequestRiwayat).values({
    pengajuanId, langkah: "cek",
    namaFile: null, pathFile: null,
    waktu, olehUserId: user!.id, catatan: catatan || null,
  });

  return NextResponse.json({ ok: true });
}
