import { NextRequest, NextResponse } from "next/server";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { db } from "@/db";
import { pembayaran, pengajuan, users } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { wajibRoleApi } from "@/lib/require-role-api";
import { userSaatIni } from "@/lib/session-server";
import { catatAudit } from "@/lib/audit";
import Decimal from "decimal.js";

const DIR_UPLOAD = path.join(process.cwd(), "uploads", "pembayaran");
const UKURAN_MAKS = 20 * 1024 * 1024; // 20MB

// GET /api/pengajuan/[id]/pembayaran — Daftar pembayaran untuk pengajuan ini
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const gagal = await wajibRoleApi(["petugas", "checker", "admin"]);
  if (gagal) return gagal;
  const { id } = await params;
  const pengajuanId = Number(id);

  const daftar = await db
    .select({
      id: pembayaran.id,
      pengajuanId: pembayaran.pengajuanId,
      tanggalBayar: pembayaran.tanggalBayar,
      nominalDiterima: pembayaran.nominalDiterima,
      potonganPph23: pembayaran.potonganPph23,
      nomorBupotPph23: pembayaran.nomorBupotPph23,
      biayaAdminBank: pembayaran.biayaAdminBank,
      bankTujuan: pembayaran.bankTujuan,
      nomorReferensiBank: pembayaran.nomorReferensiBank,
      namaFileBukti: pembayaran.namaFileBukti,
      pathFileBukti: pembayaran.pathFileBukti,
      status: pembayaran.status,
      catatan: pembayaran.catatan,
      diinputPada: pembayaran.diinputPada,
      diinputOlehUserId: pembayaran.diinputOlehUserId,
      namaPenginput: users.nama,
      diverifikasiPada: pembayaran.diverifikasiPada,
      diverifikasiOlehUserId: pembayaran.diverifikasiOlehUserId,
      catatanChecker: pembayaran.catatanChecker,
    })
    .from(pembayaran)
    .innerJoin(users, eq(pembayaran.diinputOlehUserId, users.id))
    .where(eq(pembayaran.pengajuanId, pengajuanId))
    .orderBy(desc(pembayaran.id));

  return NextResponse.json({ pembayaran: daftar });
}

// POST /api/pengajuan/[id]/pembayaran — Input pelunasan baru oleh Petugas
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const gagal = await wajibRoleApi(["petugas", "admin"]);
  if (gagal) return gagal;
  const user = await userSaatIni();
  const { id } = await params;
  const pengajuanId = Number(id);

  const [row] = await db
    .select({ id: pengajuan.id, nomorInvoice: pengajuan.nomorInvoice })
    .from(pengajuan)
    .where(eq(pengajuan.id, pengajuanId));

  if (!row) {
    return NextResponse.json({ error: "Pengajuan tidak ditemukan." }, { status: 404 });
  }

  const form = await request.formData().catch(() => null);
  if (!form) {
    return NextResponse.json({ error: "Data form pembayaran tidak valid." }, { status: 400 });
  }

  const tanggalBayar = form.get("tanggalBayar");
  const nominalDiterima = form.get("nominalDiterima");
  const potonganPph23 = form.get("potonganPph23") || "0.00";
  const nomorBupotPph23 = form.get("nomorBupotPph23");
  const biayaAdminBank = form.get("biayaAdminBank") || "0.00";
  const bankTujuan = form.get("bankTujuan");
  const nomorReferensiBank = form.get("nomorReferensiBank");
  const catatan = form.get("catatan");
  const file = form.get("fileBukti");

  if (typeof tanggalBayar !== "string" || !tanggalBayar.trim()) {
    return NextResponse.json({ error: "Tanggal pembayaran wajib diisi (YYYY-MM-DD)." }, { status: 400 });
  }

  if (typeof nominalDiterima !== "string" || !nominalDiterima.trim() || Number(nominalDiterima) <= 0) {
    return NextResponse.json({ error: "Nominal pembayaran yang diterima wajib diisi dan lebih besar dari 0." }, { status: 400 });
  }

  if (typeof bankTujuan !== "string" || !bankTujuan.trim()) {
    return NextResponse.json({ error: "Rekening bank penampung/tujuan wajib dipilih." }, { status: 400 });
  }

  let namaFileDisimpan: string | null = null;
  let pathDisimpan: string | null = null;

  if (file instanceof File && file.size > 0) {
    if (file.size > UKURAN_MAKS) {
      return NextResponse.json({ error: "Ukuran bukti bayar maksimal 20MB." }, { status: 400 });
    }
    await mkdir(DIR_UPLOAD, { recursive: true });
    const ekstensi = path.extname(file.name);
    namaFileDisimpan = `PAY-${pengajuanId}-${Date.now()}${ekstensi}`;
    const fullPath = path.join(DIR_UPLOAD, namaFileDisimpan);
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(fullPath, buffer);
    pathDisimpan = path.join("uploads", "pembayaran", namaFileDisimpan);
  }

  const [baru] = await db
    .insert(pembayaran)
    .values({
      pengajuanId,
      tanggalBayar: tanggalBayar.trim(),
      nominalDiterima: new Decimal(nominalDiterima.trim()).toFixed(2),
      potonganPph23: new Decimal(String(potonganPph23).trim() || 0).toFixed(2),
      nomorBupotPph23: typeof nomorBupotPph23 === "string" ? nomorBupotPph23.trim() : null,
      biayaAdminBank: new Decimal(String(biayaAdminBank).trim() || 0).toFixed(2),
      bankTujuan: bankTujuan.trim(),
      nomorReferensiBank: typeof nomorReferensiBank === "string" ? nomorReferensiBank.trim() : null,
      namaFileBukti: file instanceof File ? file.name : null,
      pathFileBukti: pathDisimpan,
      status: "menunggu_verifikasi",
      catatan: typeof catatan === "string" ? catatan.trim() : null,
      diinputOlehUserId: user!.id,
    })
    .returning();

  await catatAudit({
    entitas: "pembayaran",
    entitasId: baru.id,
    userId: user!.id,
    perubahan: `Pencatatan pelunasan Rp ${nominalDiterima} (Bank: ${bankTujuan}) untuk invoice ${row.nomorInvoice || `#${pengajuanId}`}`,
  });

  return NextResponse.json(baru, { status: 201 });
}
