import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import { db } from "@/db";
import { grRequestRiwayat } from "@/db/schema";
import { eq } from "drizzle-orm";
import { wajibRoleApi } from "@/lib/require-role-api";

// GET /api/pengajuan/[id]/gr-request/riwayat/[riwayatId] — unduh salinan
// file versi LAMA dari Riwayat Versi (bagian 36). Beda dari
// .../gr-request/file/[jenis] yang selalu mengambil file TERBARU.
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string; riwayatId: string }> }) {
  const gagal = await wajibRoleApi(["petugas", "checker"]);
  if (gagal) return gagal;
  const { id, riwayatId } = await params;
  const pengajuanId = Number(id);

  const [row] = await db.select().from(grRequestRiwayat).where(eq(grRequestRiwayat.id, Number(riwayatId)));
  if (!row || row.pengajuanId !== pengajuanId || !row.namaFile || !row.pathFile) {
    return NextResponse.json({ error: "File tidak ditemukan di riwayat." }, { status: 404 });
  }

  const subPath = row.pathFile.replace(/^[/\\]*uploads[/\\]*/, "");
  const buffer = await readFile(path.join(/*turbopackIgnore: true*/ process.cwd(), "uploads", subPath)).catch(() => null);
  if (!buffer) return NextResponse.json({ error: "File tidak ditemukan di server." }, { status: 404 });

  return new NextResponse(buffer as unknown as BodyInit, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${row.namaFile}"`,
    },
  });
}
