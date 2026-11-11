import { NextRequest, NextResponse } from "next/server";
import { mkdir, writeFile, unlink } from "fs/promises";
import path from "path";
import { db } from "@/db";
import { pengajuan, lampiranPengajuan } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { wajibRoleApi } from "@/lib/require-role-api";
import { userSaatIni } from "@/lib/session-server";
import { catatAudit } from "@/lib/audit";

const DIR_UPLOAD = path.join(process.cwd(), "uploads", "faktur-pajak");
const UKURAN_MAKS = 30 * 1024 * 1024; // 30MB
const LABEL_FAKTUR_PAJAK = "Faktur Pajak Resmi";

// POST /api/pengajuan/[id]/faktur-pajak — unggah berkas faktur pajak resmi (PDF/gambar)
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const gagal = await wajibRoleApi(["petugas", "checker", "admin"]);
  if (gagal) return gagal;
  const user = await userSaatIni();
  const { id } = await params;
  const pengajuanId = Number(id);

  const [row] = await db
    .select({
      id: pengajuan.id,
      pathFileFakturPajak: pengajuan.pathFileFakturPajak,
      namaFileFakturPajak: pengajuan.namaFileFakturPajak,
    })
    .from(pengajuan)
    .where(eq(pengajuan.id, pengajuanId));

  if (!row) {
    return NextResponse.json({ error: "Pengajuan tidak ditemukan." }, { status: 404 });
  }

  const form = await request.formData().catch(() => null);
  if (!form) {
    return NextResponse.json({ error: "Data form tidak valid." }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "File Faktur Pajak wajib diunggah." }, { status: 400 });
  }
  if (file.size > UKURAN_MAKS) {
    return NextResponse.json({ error: "Ukuran file maksimal 30MB." }, { status: 400 });
  }

  const ekstensi = path.extname(file.name).toLowerCase();
  const diizinkan = [".pdf", ".jpg", ".jpeg", ".png"];
  if (!diizinkan.includes(ekstensi)) {
    return NextResponse.json(
      { error: "Format file harus PDF, JPG, atau PNG." },
      { status: 400 }
    );
  }

  // Hapus berkas lama jika ada
  if (row.pathFileFakturPajak) {
    const subPathOld = row.pathFileFakturPajak.replace(/^[/\\]*uploads[/\\]*/, "");
    await unlink(path.join(process.cwd(), "uploads", subPathOld)).catch(() => {});
  }

  await mkdir(DIR_UPLOAD, { recursive: true });
  const namaFileDisimpan = `fp-${pengajuanId}-${Date.now()}${ekstensi}`;
  const pathDisimpan = path.join(DIR_UPLOAD, namaFileDisimpan);
  const pathRelatif = path.join("uploads", "faktur-pajak", namaFileDisimpan);

  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(pathDisimpan, buffer);

  // Update pengajuan
  await db
    .update(pengajuan)
    .set({
      namaFileFakturPajak: file.name,
      pathFileFakturPajak: pathRelatif,
    })
    .where(eq(pengajuan.id, pengajuanId));

  // Simpan atau update juga di lampiranPengajuan agar otomatis terlihat di kelengkapan dokumen
  const existingLampiran = await db
    .select()
    .from(lampiranPengajuan)
    .where(and(eq(lampiranPengajuan.pengajuanId, pengajuanId), eq(lampiranPengajuan.label, LABEL_FAKTUR_PAJAK)));

  for (const l of existingLampiran) {
    await db.delete(lampiranPengajuan).where(eq(lampiranPengajuan.id, l.id)).catch(() => {});
  }

  await db.insert(lampiranPengajuan).values({
    pengajuanId,
    label: LABEL_FAKTUR_PAJAK,
    namaFile: file.name,
    pathFile: pathRelatif,
    diunggahOlehUserId: user!.id,
  });

  await catatAudit({
    entitas: "pengajuan",
    entitasId: pengajuanId,
    userId: user!.id,
    perubahan: `Unggah berkas Faktur Pajak Resmi (${file.name}) untuk pengajuan #${pengajuanId}`,
  });

  return NextResponse.json({
    ok: true,
    namaFile: file.name,
    pathFile: pathRelatif,
  });
}

// DELETE /api/pengajuan/[id]/faktur-pajak — hapus berkas faktur pajak
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const gagal = await wajibRoleApi(["petugas", "checker", "admin"]);
  if (gagal) return gagal;
  const user = await userSaatIni();
  const { id } = await params;
  const pengajuanId = Number(id);

  const [row] = await db
    .select({
      id: pengajuan.id,
      pathFileFakturPajak: pengajuan.pathFileFakturPajak,
      namaFileFakturPajak: pengajuan.namaFileFakturPajak,
    })
    .from(pengajuan)
    .where(eq(pengajuan.id, pengajuanId));

  if (!row) {
    return NextResponse.json({ error: "Pengajuan tidak ditemukan." }, { status: 404 });
  }

  if (row.pathFileFakturPajak) {
    const subPathOld = row.pathFileFakturPajak.replace(/^[/\\]*uploads[/\\]*/, "");
    await unlink(path.join(process.cwd(), "uploads", subPathOld)).catch(() => {});
  }

  await db
    .update(pengajuan)
    .set({
      namaFileFakturPajak: null,
      pathFileFakturPajak: null,
    })
    .where(eq(pengajuan.id, pengajuanId));

  // Hapus dari lampiran
  await db
    .delete(lampiranPengajuan)
    .where(and(eq(lampiranPengajuan.pengajuanId, pengajuanId), eq(lampiranPengajuan.label, LABEL_FAKTUR_PAJAK)))
    .catch(() => {});

  await catatAudit({
    entitas: "pengajuan",
    entitasId: pengajuanId,
    userId: user!.id,
    perubahan: `Hapus berkas Faktur Pajak Resmi untuk pengajuan #${pengajuanId}`,
  });

  return NextResponse.json({ ok: true });
}

