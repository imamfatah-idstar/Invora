import { NextRequest, NextResponse } from "next/server";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { db } from "@/db";
import { grRequest, grRequestRiwayat } from "@/db/schema";
import { eq } from "drizzle-orm";
import { wajibRoleApi } from "@/lib/require-role-api";
import { userSaatIni } from "@/lib/session-server";
import { catatAudit } from "@/lib/audit";

const DIR_UPLOAD = path.join(process.cwd(), "uploads", "gr-request");
const UKURAN_MAKS = 30 * 1024 * 1024; // 30MB

// POST /api/pengajuan/[id]/gr-request/balikan — unggah file balikan dari tim
// XL (sheet SOW & COVER sudah terisi). Mengganti file balikan lama kalau ada.
// Lihat bagian 33-34.
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const gagal = await wajibRoleApi(["petugas", "checker"]);
  if (gagal) return gagal;
  const user = await userSaatIni();
  const { id } = await params;
  const pengajuanId = Number(id);

  const [row] = await db.select().from(grRequest).where(eq(grRequest.pengajuanId, pengajuanId));
  if (!row) {
    return NextResponse.json({ error: "Generate dulu GR Request (sheet Vendor) sebelum unggah balikan XL." }, { status: 409 });
  }

  const form = await request.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "Data form tidak valid." }, { status: 400 });

  const file = form.get("file");
  if (!(file instanceof File))
    return NextResponse.json({ error: "File wajib diunggah." }, { status: 400 });
  if (file.size > UKURAN_MAKS)
    return NextResponse.json({ error: "Ukuran file maksimal 30MB." }, { status: 400 });

  const ekstensi = path.extname(file.name).toLowerCase();
  if (ekstensi !== ".xlsx")
    return NextResponse.json({ error: "Format file harus .xlsx." }, { status: 400 });

  await mkdir(DIR_UPLOAD, { recursive: true });
  const namaFileDisimpan = `${pengajuanId}-balikan-${Date.now()}${ekstensi}`;
  const pathDisimpan = path.join(DIR_UPLOAD, namaFileDisimpan);
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(pathDisimpan, buffer);

  // Riwayat versi (bagian 36) — file balikan & gabungan LAMA sengaja TIDAK
  // dihapus (beda dari perilaku sebelumnya), supaya tetap bisa diunduh lewat
  // Riwayat Versi kalau perlu dibandingkan dengan versi baru.

  const waktu = new Date().toISOString();
  const pathRelatif = path.join("uploads", "gr-request", namaFileDisimpan);

  await db.update(grRequest).set({
    namaFileBalikanXl: file.name,
    pathFileBalikanXl: pathRelatif,
    diunggahBalikanPada: waktu,
    diunggahBalikanOlehUserId: user!.id,
    namaFileGabungan: null,
    pathFileGabungan: null,
    digabungPada: null,
    // Balikan baru = perlu dicek ulang.
    dicekOlehUserId: null,
    dicekPada: null,
    catatanCek: null,
  }).where(eq(grRequest.id, row.id));

  await catatAudit({
    entitas: "gr_request", entitasId: row.id, userId: user!.id,
    perubahan: `Unggah balikan XL "${file.name}" untuk pengajuan id=${pengajuanId}`,
  });
  await db.insert(grRequestRiwayat).values({
    pengajuanId, langkah: "balikan",
    namaFile: file.name, pathFile: pathRelatif,
    waktu, olehUserId: user!.id,
  });

  return NextResponse.json({ ok: true });
}
