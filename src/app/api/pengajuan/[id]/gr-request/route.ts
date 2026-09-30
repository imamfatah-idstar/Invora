import { NextRequest, NextResponse } from "next/server";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { db } from "@/db";
import { grRequest, grRequestRiwayat } from "@/db/schema";
import { eq } from "drizzle-orm";
import { wajibRoleApi } from "@/lib/require-role-api";
import { userSaatIni } from "@/lib/session-server";
import { catatAudit } from "@/lib/audit";
import { generateWorkbookVendor, namaFileGr } from "@/lib/gr-request-excel";

const DIR_UPLOAD = path.join(process.cwd(), "uploads", "gr-request");

// GET /api/pengajuan/[id]/gr-request — generate sheet "Excelsheet for Vendor"
// dari data pengajuan terbaru, simpan salinannya (dicatat di tabel gr_request
// sebagai langkah 1), lalu kirim file untuk diunduh. Lihat bagian 33-34.
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const gagal = await wajibRoleApi(["petugas", "checker"]);
  if (gagal) return gagal;
  const user = await userSaatIni();
  const { id } = await params;
  const pengajuanId = Number(id);

  let hasil;
  try {
    hasil = await generateWorkbookVendor(pengajuanId);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Gagal generate." }, { status: 409 });
  }
  const { workbook, data } = hasil;
  const buffer = await workbook.xlsx.writeBuffer();
  const namaFile = namaFileGr(data.poRow.nomorPo, data.ajuan.periode, "vendor");

  await mkdir(DIR_UPLOAD, { recursive: true });
  const namaFileDisimpan = `${pengajuanId}-generate-${Date.now()}.xlsx`;
  const pathDisimpan = path.join(DIR_UPLOAD, namaFileDisimpan);
  await writeFile(pathDisimpan, Buffer.from(buffer));

  const [sudahAda] = await db.select().from(grRequest).where(eq(grRequest.pengajuanId, pengajuanId));
  const nilaiUpdate = {
    namaFileGenerate: namaFile,
    pathFileGenerate: path.join("uploads", "gr-request", namaFileDisimpan),
    digeneratePada: new Date().toISOString(),
  };
  if (sudahAda) {
    await db.update(grRequest).set(nilaiUpdate).where(eq(grRequest.id, sudahAda.id));
  } else {
    await db.insert(grRequest).values({ pengajuanId, ...nilaiUpdate });
  }

  // Riwayat versi (bagian 36) — file generate lama TIDAK dihapus, tetap ada
  // di riwayat kalau sewaktu-waktu perlu dibandingkan.
  await db.insert(grRequestRiwayat).values({
    pengajuanId, langkah: "generate",
    namaFile: nilaiUpdate.namaFileGenerate, pathFile: nilaiUpdate.pathFileGenerate,
    waktu: nilaiUpdate.digeneratePada, olehUserId: user!.id,
  });
  await catatAudit({
    entitas: "gr_request", entitasId: sudahAda?.id ?? pengajuanId, userId: user!.id,
    perubahan: `Generate sheet Vendor GR Request untuk pengajuan id=${pengajuanId}`,
  });

  return new NextResponse(buffer as unknown as BodyInit, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${namaFile}"`,
      "X-Peringatan": encodeURIComponent(JSON.stringify(data.peringatan)),
    },
  });
}
