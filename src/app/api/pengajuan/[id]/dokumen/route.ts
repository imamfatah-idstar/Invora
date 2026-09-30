import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { pengajuan, dokumen } from "@/db/schema";
import { eq } from "drizzle-orm";
import { wajibRoleApi } from "@/lib/require-role-api";
import { userSaatIni } from "@/lib/session-server";
import { catatAudit } from "@/lib/audit";

// Membuat catatan dokumen CAC/BAST untuk sebuah pengajuan.
// PENTING: template CAC/BAST yang dipakai sudah sesuai dokumen resmi (lihat
// PROJECT_INSTRUCTIONS.md bagian 25) — Administrator TIDAK memvalidasi
// template ini, perannya murni akun & akses (bagian 20-21), tidak ada
// hubungannya dengan finance/operasional. Status dokumen tetap SELALU
// "draft" bukan karena template belum divalidasi, tapi karena pengajuan
// RESMI ke XL masih lewat Get Approve CAC / COUPA secara manual (otomasi ke
// sana belum dibangun) — dokumen ini bukan pengganti proses itu. Halaman
// cetaknya menampilkan label ini dengan jelas, tidak disembunyikan.
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
  if (ajuan.status !== "siap_diajukan" && ajuan.status !== "diajukan") {
    return NextResponse.json(
      { error: `Dokumen hanya bisa dibuat setelah disetujui Checker (status "siap_diajukan"), status saat ini "${ajuan.status}".` },
      { status: 409 }
    );
  }

  const body = await request.json().catch(() => null);
  const jenis = body?.jenis;
  if (jenis !== "CAC" && jenis !== "BAST") {
    return NextResponse.json({ error: 'jenis wajib "CAC" atau "BAST".' }, { status: 400 });
  }

  const [dok] = await db.insert(dokumen).values({
    pengajuanId,
    jenis,
    status: "draft",
    versi: ajuan.versi,
  }).returning();

  await catatAudit({
    entitas: "pengajuan", entitasId: pengajuanId,
    perubahan: `Buat dokumen ${jenis} (draft, versi ${ajuan.versi})`,
    userId: user!.id,
  });

  return NextResponse.json({ id: dok.id }, { status: 201 });
}
