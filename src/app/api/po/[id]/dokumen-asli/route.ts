import { NextRequest, NextResponse } from "next/server";
import { mkdir, writeFile, unlink } from "fs/promises";
import path from "path";
import { db } from "@/db";
import { po } from "@/db/schema";
import { eq } from "drizzle-orm";
import { wajibRoleApi } from "@/lib/require-role-api";
import { userSaatIni } from "@/lib/session-server";
import { catatAudit } from "@/lib/audit";

const DIR_UPLOAD = path.join(process.cwd(), "uploads", "po-asli");
const UKURAN_MAKS = 30 * 1024 * 1024; // 30MB

// Dokumen PO asli — diunggah SEKALI per PO, dipakai ulang otomatis di setiap
// CAC/BAST PDF gabungan untuk PO ini. POST di sini mengganti file lama kalau
// sudah ada (satu file aktif per PO).
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const gagal = await wajibRoleApi(["petugas"]);
  if (gagal) return gagal;
  const user = await userSaatIni();
  const { id } = await params;
  const poId = Number(id);

  const [row] = await db.select().from(po).where(eq(po.id, poId));
  if (!row) return NextResponse.json({ error: "PO tidak ditemukan." }, { status: 404 });

  const form = await request.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "Data form tidak valid." }, { status: 400 });

  const file = form.get("file");
  if (!(file instanceof File))
    return NextResponse.json({ error: "File wajib diunggah." }, { status: 400 });
  if (file.size > UKURAN_MAKS)
    return NextResponse.json({ error: "Ukuran file maksimal 30MB." }, { status: 400 });

  const ekstensi = path.extname(file.name).toLowerCase();
  if (![".pdf", ".png", ".jpg", ".jpeg"].includes(ekstensi))
    return NextResponse.json({ error: "Format file harus PDF, PNG, atau JPG." }, { status: 400 });

  await mkdir(DIR_UPLOAD, { recursive: true });
  const namaFileDisimpan = `${poId}-${Date.now()}${ekstensi}`;
  const pathDisimpan = path.join(DIR_UPLOAD, namaFileDisimpan);
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(pathDisimpan, buffer);

  if (row.pathFilePoAsli) {
    const subPath = row.pathFilePoAsli.replace(/^[/\\]*uploads[/\\]*/, "");
    await unlink(path.join(/*turbopackIgnore: true*/ process.cwd(), "uploads", subPath)).catch(() => {});
  }

  await db.update(po).set({
    namaFilePoAsli: file.name,
    pathFilePoAsli: path.join("uploads", "po-asli", namaFileDisimpan),
  }).where(eq(po.id, poId));

  await catatAudit({
    entitas: "po", entitasId: poId, userId: user!.id,
    perubahan: `Unggah dokumen PO asli "${file.name}" untuk PO "${row.nomorPo}"`,
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const gagal = await wajibRoleApi(["petugas"]);
  if (gagal) return gagal;
  const user = await userSaatIni();
  const { id } = await params;
  const poId = Number(id);

  const [row] = await db.select().from(po).where(eq(po.id, poId));
  if (!row) return NextResponse.json({ error: "PO tidak ditemukan." }, { status: 404 });

  if (row.pathFilePoAsli) {
    const subPath = row.pathFilePoAsli.replace(/^[/\\]*uploads[/\\]*/, "");
    await unlink(path.join(/*turbopackIgnore: true*/ process.cwd(), "uploads", subPath)).catch(() => {});
  }

  await db.update(po).set({ namaFilePoAsli: null, pathFilePoAsli: null }).where(eq(po.id, poId));

  await catatAudit({
    entitas: "po", entitasId: poId, userId: user!.id,
    perubahan: `Hapus dokumen PO asli untuk PO "${row.nomorPo}"`,
  });

  return NextResponse.json({ ok: true });
}
