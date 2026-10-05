import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { po } from "@/db/schema";
import { eq } from "drizzle-orm";
import { wajibRoleApi } from "@/lib/require-role-api";
import { userSaatIni } from "@/lib/session-server";
import { catatAudit } from "@/lib/audit";
import { angkaDesimalValid, tanggalValidAtauKosong } from "@/lib/validasi";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const gagal = await wajibRoleApi(["petugas"]);
  if (gagal) return gagal;
  const user = await userSaatIni();
  const { id } = await params;
  const body = await request.json().catch(() => null);

  if (!body?.namaProyek || !String(body.namaProyek).trim()) {
    return NextResponse.json({ error: "Nama proyek wajib diisi." }, { status: 400 });
  }
  if (!angkaDesimalValid(body.saldoSebelumPpn)) {
    return NextResponse.json({ error: "Saldo harus berupa angka valid (maks 2 desimal)." }, { status: 400 });
  }
  if (!Number.isInteger(Number(body.tahun)) || Number(body.tahun) <= 0) {
    return NextResponse.json({ error: "Tahun PO wajib diisi angka tahun yang valid." }, { status: 400 });
  }
  if (!angkaDesimalValid(body.nilaiGr)) {
    return NextResponse.json({ error: "Nilai GR harus berupa angka valid (maks 2 desimal)." }, { status: 400 });
  }
  if (!tanggalValidAtauKosong(body.tanggalPo)) {
    return NextResponse.json({ error: "Tanggal PO tidak valid." }, { status: 400 });
  }

  if (body.jenisTagihan !== undefined && body.jenisTagihan !== "bulanan" && body.jenisTagihan !== "tahap") {
    return NextResponse.json({ error: "Jenis tagihan harus \"bulanan\" atau \"tahap\"." }, { status: 400 });
  }

  await db.update(po).set({
    namaProyek: String(body.namaProyek).trim(),
    saldoSebelumPpn: body.saldoSebelumPpn,
    tahun: Number(body.tahun),
    nilaiGr: body.nilaiGr,
    tanggalPo: body.tanggalPo || null,
    ...(body.jenisTagihan !== undefined ? { jenisTagihan: body.jenisTagihan } : {}),
    ...(body.klien !== undefined ? { klien: typeof body.klien === "string" && body.klien.trim() ? body.klien.trim() : null } : {}),
  }).where(eq(po.id, Number(id)));

  await catatAudit({
    entitas: "po", entitasId: Number(id),
    perubahan: `Ubah PO: nama="${body.namaProyek}", saldo=${body.saldoSebelumPpn}, tahun=${body.tahun}, nilaiGr=${body.nilaiGr}, klien=${body.klien ?? "(tidak diubah)"}, jenisTagihan=${body.jenisTagihan ?? "(tidak diubah)"}`,
    userId: user!.id,
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const gagal = await wajibRoleApi(["petugas"]);
  if (gagal) return gagal;
  const user = await userSaatIni();
  const { id } = await params;
  try {
    await db.delete(po).where(eq(po.id, Number(id)));
    await catatAudit({ entitas: "po", entitasId: Number(id), perubahan: "Hapus PO", userId: user!.id });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Tidak bisa dihapus — PO ini masih dipakai di pemetaan/pengajuan." }, { status: 409 });
  }
}
