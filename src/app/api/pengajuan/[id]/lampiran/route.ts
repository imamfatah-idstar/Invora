import { NextRequest, NextResponse } from "next/server";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { db } from "@/db";
import { lampiranPengajuan, pengajuan } from "@/db/schema";
import { eq } from "drizzle-orm";
import { wajibRoleApi } from "@/lib/require-role-api";
import { userSaatIni } from "@/lib/session-server";
import { catatAudit } from "@/lib/audit";

const DIR_UPLOAD = path.join(process.cwd(), "uploads", "lampiran");
const UKURAN_MAKS = 30 * 1024 * 1024; // 30MB, sama dengan batas Get Approve/COUPA

// GET /api/pengajuan/[id]/lampiran — daftar lampiran tambahan pengajuan ini.
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const gagal = await wajibRoleApi(["petugas", "checker"]);
  if (gagal) return gagal;
  const { id } = await params;

  const daftar = await db
    .select()
    .from(lampiranPengajuan)
    .where(eq(lampiranPengajuan.pengajuanId, Number(id)));

  return NextResponse.json({ lampiran: daftar });
}

// POST /api/pengajuan/[id]/lampiran — unggah satu lampiran tambahan (mis.
// spreadsheet tracking PO, dokumen pendukung lain) — bisa diunggah lebih dari
// satu kali untuk pengajuan yang sama (tidak menimpa, setiap unggahan jadi
// baris baru — berbeda dari timesheet yang unik per kombinasi).
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const gagal = await wajibRoleApi(["petugas", "checker"]);
  if (gagal) return gagal;
  const user = await userSaatIni();
  const { id } = await params;
  const pengajuanId = Number(id);

  const [row] = await db.select({ id: pengajuan.id }).from(pengajuan).where(eq(pengajuan.id, pengajuanId));
  if (!row) {
    return NextResponse.json({ error: "Pengajuan tidak ditemukan." }, { status: 404 });
  }

  const form = await request.formData().catch(() => null);
  if (!form) {
    return NextResponse.json({ error: "Data form tidak valid." }, { status: 400 });
  }

  const label = form.get("label");
  const file = form.get("file");

  if (typeof label !== "string" || !label.trim()) {
    return NextResponse.json({ error: "Label lampiran wajib diisi (mis. \"Spreadsheet Tracking PO\")." }, { status: 400 });
  }
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "File wajib diunggah." }, { status: 400 });
  }
  if (file.size > UKURAN_MAKS) {
    return NextResponse.json({ error: "Ukuran file maksimal 30MB." }, { status: 400 });
  }

  await mkdir(DIR_UPLOAD, { recursive: true });
  const ekstensi = path.extname(file.name);
  const namaFileDisimpan = `${pengajuanId}-${Date.now()}${ekstensi}`;
  const pathDisimpan = path.join(DIR_UPLOAD, namaFileDisimpan);
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(pathDisimpan, buffer);

  const [hasil] = await db
    .insert(lampiranPengajuan)
    .values({
      pengajuanId,
      label: label.trim(),
      namaFile: file.name,
      pathFile: path.join("uploads", "lampiran", namaFileDisimpan),
      diunggahOlehUserId: user!.id,
    })
    .returning();

  await catatAudit({
    entitas: "lampiran_pengajuan", entitasId: hasil.id, userId: user!.id,
    perubahan: `Unggah lampiran "${label.trim()}" (${file.name}) untuk pengajuan #${pengajuanId}`,
  });

  return NextResponse.json(hasil, { status: 201 });
}
