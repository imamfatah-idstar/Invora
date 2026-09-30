import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import { db } from "@/db";
import { grRequest } from "@/db/schema";
import { eq } from "drizzle-orm";
import { wajibRoleApi } from "@/lib/require-role-api";

// GET /api/pengajuan/[id]/gr-request/file/[jenis] — unduh salinan file GR
// Request yang tersimpan. jenis: "balikan" (file dari XL) atau "gabungan"
// (hasil gabung otomatis). Untuk sheet Vendor yang baru digenerate, pakai
// GET /api/pengajuan/[id]/gr-request langsung. Bagian 33-34.
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string; jenis: string }> }) {
  const gagal = await wajibRoleApi(["petugas", "checker"]);
  if (gagal) return gagal;
  const { id, jenis } = await params;
  const pengajuanId = Number(id);

  if (jenis !== "balikan" && jenis !== "gabungan") {
    return NextResponse.json({ error: "Jenis file tidak dikenali." }, { status: 400 });
  }

  const [row] = await db.select().from(grRequest).where(eq(grRequest.pengajuanId, pengajuanId));
  const namaFile = jenis === "balikan" ? row?.namaFileBalikanXl : row?.namaFileGabungan;
  const pathFile = jenis === "balikan" ? row?.pathFileBalikanXl : row?.pathFileGabungan;
  if (!row || !namaFile || !pathFile) {
    return NextResponse.json({ error: "File belum tersedia." }, { status: 404 });
  }

  const buffer = await readFile(path.join(process.cwd(), pathFile)).catch(() => null);
  if (!buffer) return NextResponse.json({ error: "File tidak ditemukan di server." }, { status: 404 });

  return new NextResponse(buffer as unknown as BodyInit, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${namaFile}"`,
    },
  });
}
