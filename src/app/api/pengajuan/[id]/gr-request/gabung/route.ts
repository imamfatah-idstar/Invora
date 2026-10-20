import { NextRequest, NextResponse } from "next/server";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import ExcelJS from "exceljs";
import { db } from "@/db";
import { grRequest, grRequestRiwayat } from "@/db/schema";
import { eq } from "drizzle-orm";
import { wajibRoleApi } from "@/lib/require-role-api";
import { userSaatIni } from "@/lib/session-server";
import { catatAudit } from "@/lib/audit";
import { siapkanDataVendor, tulisSheetVendor, namaFileGr, NAMA_SHEET_VENDOR } from "@/lib/gr-request-excel";

const DIR_UPLOAD = path.join(process.cwd(), "uploads", "gr-request");

// POST /api/pengajuan/[id]/gr-request/gabung — gabungkan otomatis: buka file
// balikan XL (sudah berisi sheet SOW & COVER terisi), segarkan ulang sheet
// "Excelsheet for Vendor" di dalamnya dengan data pengajuan TERBARU (supaya
// tidak basi kalau ada perubahan sejak file dikirim), sheet lain (SOW, COVER,
// dst.) dibiarkan apa adanya sesuai isian XL. Hasilnya 1 file utuh. Lihat
// bagian 33-34.
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const gagal = await wajibRoleApi(["petugas", "checker"]);
  if (gagal) return gagal;
  const user = await userSaatIni();
  const { id } = await params;
  const pengajuanId = Number(id);

  const [row] = await db.select().from(grRequest).where(eq(grRequest.pengajuanId, pengajuanId));
  if (!row || !row.pathFileBalikanXl) {
    return NextResponse.json({ error: "Unggah dulu file balikan dari XL sebelum menggabungkan." }, { status: 409 });
  }

  let data;
  try {
    data = await siapkanDataVendor(pengajuanId);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Gagal mengambil data pengajuan." }, { status: 409 });
  }

  const workbook = new ExcelJS.Workbook();
  try {
    const subPath = row.pathFileBalikanXl.replace(/^[/\\]*uploads[/\\]*/, "");
    await workbook.xlsx.readFile(path.join(/*turbopackIgnore: true*/ process.cwd(), "uploads", subPath));
  } catch {
    return NextResponse.json({ error: "File balikan XL tidak bisa dibaca — pastikan format .xlsx valid." }, { status: 400 });
  }

  let sheetVendor = workbook.getWorksheet(NAMA_SHEET_VENDOR);
  if (!sheetVendor) sheetVendor = workbook.addWorksheet(NAMA_SHEET_VENDOR);
  tulisSheetVendor(sheetVendor, data);

  const buffer = await workbook.xlsx.writeBuffer();
  const namaFile = namaFileGr(data.poRow.nomorPo, data.ajuan.periode, "gabungan");

  await mkdir(DIR_UPLOAD, { recursive: true });
  const namaFileDisimpan = `${pengajuanId}-gabungan-${Date.now()}.xlsx`;
  const pathDisimpan = path.join(DIR_UPLOAD, namaFileDisimpan);
  await writeFile(pathDisimpan, Buffer.from(buffer));

  const waktu = new Date().toISOString();
  const pathRelatif = path.join("uploads", "gr-request", namaFileDisimpan);

  await db.update(grRequest).set({
    namaFileGabungan: namaFile,
    pathFileGabungan: pathRelatif,
    digabungPada: waktu,
    // Gabungan baru = perlu dicek ulang.
    dicekOlehUserId: null,
    dicekPada: null,
    catatanCek: null,
  }).where(eq(grRequest.id, row.id));

  await catatAudit({
    entitas: "gr_request", entitasId: row.id, userId: user!.id,
    perubahan: `Gabungkan GR Request untuk pengajuan id=${pengajuanId}`,
  });
  // Riwayat versi (bagian 36) — file gabungan lama tetap ada, tidak dihapus.
  await db.insert(grRequestRiwayat).values({
    pengajuanId, langkah: "gabung",
    namaFile, pathFile: pathRelatif,
    waktu, olehUserId: user!.id,
  });

  return NextResponse.json({ ok: true, peringatan: data.peringatan });
}
