import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { pengajuan, konfirmasi, checkerReview } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { wajibRoleApi } from "@/lib/require-role-api";
import { userSaatIni } from "@/lib/session-server";
import { catatAudit } from "@/lib/audit";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const gagal = await wajibRoleApi(["checker"]);
  if (gagal) return gagal;
  const user = await userSaatIni();
  const { id } = await params;
  const pengajuanId = Number(id);

  const body = await request.json().catch(() => null);
  if (body?.hasil !== "siap_diajukan" && body?.hasil !== "perlu_revisi") {
    return NextResponse.json({ error: "Hasil pemeriksaan tidak valid." }, { status: 400 });
  }

  const [ajuan] = await db.select().from(pengajuan).where(eq(pengajuan.id, pengajuanId));
  if (!ajuan) {
    return NextResponse.json({ error: "Pengajuan tidak ditemukan." }, { status: 404 });
  }
  if (ajuan.status !== "menunggu_checker") {
    return NextResponse.json(
      { error: `Tidak bisa diperiksa — status saat ini "${ajuan.status}", harus "menunggu_checker".` },
      { status: 409 }
    );
  }

  // ATURAN INTI: Checker harus orang BERBEDA dari yang mengonfirmasi (Petugas).
  // Ditegakkan di server — bukan cuma disembunyikan di tampilan.
  const [konfirmasiTerakhir] = await db
    .select()
    .from(konfirmasi)
    .where(eq(konfirmasi.pengajuanId, pengajuanId))
    .orderBy(desc(konfirmasi.id));

  if (konfirmasiTerakhir && konfirmasiTerakhir.userId === user!.id) {
    return NextResponse.json(
      { error: "Ditolak: Checker harus orang yang berbeda dari Petugas yang mengonfirmasi pengajuan ini." },
      { status: 403 }
    );
  }

  await db.insert(checkerReview).values({
    pengajuanId,
    userId: user!.id,
    hasil: body.hasil,
    catatan: body.catatan || null,
  });

  // Kalau lolos (siap_diajukan), catat otomatis tanggal submit CAC = hari ini
  // — dipakai di kartu "Status Proses CAC -> Invoice" & dashboard analisa durasi.
  // Lihat PROJECT_INSTRUCTIONS.md bagian 26.
  const patch: Partial<typeof pengajuan.$inferInsert> = { status: body.hasil };
  if (body.hasil === "siap_diajukan") {
    patch.tanggalSubmitCac = new Date().toISOString().slice(0, 10);
  }
  await db.update(pengajuan).set(patch).where(eq(pengajuan.id, pengajuanId));

  await catatAudit({
    entitas: "pengajuan", entitasId: pengajuanId,
    perubahan: `Checker review: ${body.hasil}${body.catatan ? ` (catatan: ${body.catatan})` : ""}`,
    userId: user!.id,
  });

  return NextResponse.json({ ok: true });
}
