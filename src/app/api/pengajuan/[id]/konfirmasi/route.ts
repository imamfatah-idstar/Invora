import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { pengajuan, konfirmasi } from "@/db/schema";
import { eq } from "drizzle-orm";
import { wajibRoleApi } from "@/lib/require-role-api";
import { userSaatIni } from "@/lib/session-server";
import { catatAudit } from "@/lib/audit";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const gagal = await wajibRoleApi(["petugas"]);
  if (gagal) return gagal;
  const user = await userSaatIni();
  const { id } = await params;
  const pengajuanId = Number(id);

  const [ajuan] = await db.select().from(pengajuan).where(eq(pengajuan.id, pengajuanId));
  if (!ajuan) {
    return NextResponse.json({ error: "Pengajuan tidak ditemukan." }, { status: 404 });
  }
  // Hanya boleh dikonfirmasi dari status draft ATAU perlu_revisi (setelah revisi, konfirmasi ulang).
  if (ajuan.status !== "draft" && ajuan.status !== "perlu_revisi") {
    return NextResponse.json(
      { error: `Tidak bisa dikonfirmasi — status saat ini "${ajuan.status}", harus "draft" atau "perlu_revisi".` },
      { status: 409 }
    );
  }

  await db.insert(konfirmasi).values({
    pengajuanId,
    userId: user!.id,
    versiDikonfirmasi: ajuan.versi,
  });

  await db.update(pengajuan).set({ status: "menunggu_checker" }).where(eq(pengajuan.id, pengajuanId));

  await catatAudit({
    entitas: "pengajuan", entitasId: pengajuanId,
    perubahan: `Konfirmasi petugas (versi ${ajuan.versi}) -> status: menunggu_checker`,
    userId: user!.id,
  });

  return NextResponse.json({ ok: true });
}
