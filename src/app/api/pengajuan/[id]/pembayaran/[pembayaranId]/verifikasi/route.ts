import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { pembayaran, pengajuan } from "@/db/schema";
import { eq } from "drizzle-orm";
import { wajibRoleApi } from "@/lib/require-role-api";
import { userSaatIni } from "@/lib/session-server";
import { catatAudit } from "@/lib/audit";

// PATCH /api/pengajuan/[id]/pembayaran/[pembayaranId]/verifikasi
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; pembayaranId: string }> }
) {
  const gagal = await wajibRoleApi(["checker", "admin"]);
  if (gagal) return gagal;

  const user = await userSaatIni();
  const { id, pembayaranId } = await params;
  const pId = Number(pembayaranId);

  const [row] = await db
    .select()
    .from(pembayaran)
    .where(eq(pembayaran.id, pId));

  if (!row) {
    return NextResponse.json({ error: "Data pembayaran tidak ditemukan." }, { status: 404 });
  }

  // PENEGAKAN SEGREGATION OF DUTIES (MAKER-CHECKER):
  // Petugas pembuat data pembayaran DILARANG memverifikasi datanya sendiri
  if (row.diinputOlehUserId === user!.id) {
    return NextResponse.json(
      { error: "Pelanggaran Segregation of Duties: Anda tidak dapat memverifikasi pembayaran yang Anda input sendiri." },
      { status: 403 }
    );
  }

  const body = await request.json().catch(() => ({}));
  const { status, catatanChecker } = body;

  if (status !== "diverifikasi" && status !== "ditolak") {
    return NextResponse.json(
      { error: "Status verifikasi harus 'diverifikasi' atau 'ditolak'." },
      { status: 400 }
    );
  }

  const [updated] = await db
    .update(pembayaran)
    .set({
      status,
      catatanChecker: typeof catatanChecker === "string" ? catatanChecker.trim() : null,
      diverifikasiOlehUserId: user!.id,
      diverifikasiPada: new Date().toISOString().split("T")[0],
    })
    .where(eq(pembayaran.id, pId))
    .returning();

  await catatAudit({
    entitas: "pembayaran",
    entitasId: updated.id,
    userId: user!.id,
    perubahan: `Checker ${status === "diverifikasi" ? "menyetujui" : "menolak"} pelunasan pembayaran Rp ${updated.nominalDiterima} (Pengajuan #${id}). Catatan: ${catatanChecker || "-"}`,
  });

  return NextResponse.json(updated);
}
