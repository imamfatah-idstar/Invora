import { NextRequest, NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { mkdir, writeFile, unlink } from "fs/promises";
import path from "path";
import { db } from "@/db";
import { timesheet } from "@/db/schema";
import { wajibRoleApi } from "@/lib/require-role-api";
import { userSaatIni } from "@/lib/session-server";
import { catatAudit } from "@/lib/audit";

const DIR_UPLOAD = path.join(process.cwd(), "uploads", "timesheet");
const EKSTENSI_DIIZINKAN = [".pdf", ".xlsx", ".xls", ".csv"];
const UKURAN_MAKS = 10 * 1024 * 1024; // 10MB

function angkaBulatValid(nilai: FormDataEntryValue | null): number | null {
  if (nilai === null) return null;
  const n = Number(nilai);
  if (!Number.isInteger(n) || n < 0) return null;
  return n;
}

// GET /api/timesheet?personelId=&poId=&periode= — cek apakah sudah ada timesheet
// untuk kombinasi ini (dipakai form pengajuan untuk prefill / menampilkan status).
export async function GET(request: NextRequest) {
  const gagal = await wajibRoleApi(["petugas", "checker"]);
  if (gagal) return gagal;

  const { searchParams } = new URL(request.url);
  const personelId = Number(searchParams.get("personelId"));
  const poId = Number(searchParams.get("poId"));
  const periode = searchParams.get("periode");

  if (!personelId || !poId || !periode) {
    return NextResponse.json({ error: "personelId, poId, dan periode wajib diisi." }, { status: 400 });
  }

  const baris = await db
    .select()
    .from(timesheet)
    .where(and(eq(timesheet.personelId, personelId), eq(timesheet.poId, poId), eq(timesheet.periode, periode)));

  return NextResponse.json({ timesheet: baris[0] ?? null });
}

// POST /api/timesheet — unggah timesheet (file + angka) untuk satu personel,
// satu PO, satu periode. Unggah ulang untuk kombinasi yang sama MENIMPA baris
// lama (bukan menambah baris baru), supaya hitung-pengajuan.ts selalu memakai
// satu sumber angka per kombinasi.
export async function POST(request: NextRequest) {
  const gagal = await wajibRoleApi(["petugas"]);
  if (gagal) return gagal;
  const user = await userSaatIni();
  if (!user) return NextResponse.json({ error: "Belum login." }, { status: 401 });

  const form = await request.formData().catch(() => null);
  if (!form) {
    return NextResponse.json({ error: "Data form tidak valid." }, { status: 400 });
  }

  const personelId = Number(form.get("personelId"));
  const poId = Number(form.get("poId"));
  const userXlId = Number(form.get("userXlId"));
  const periode = form.get("periode");
  const totalHariKerja = angkaBulatValid(form.get("totalHariKerja"));
  const totalKehadiran = angkaBulatValid(form.get("totalKehadiran"));
  const file = form.get("file");

  if (!personelId || !poId || !userXlId || typeof periode !== "string" || !periode) {
    return NextResponse.json({ error: "personelId, poId, userXlId, dan periode wajib diisi." }, { status: 400 });
  }
  if (totalHariKerja === null || totalKehadiran === null) {
    return NextResponse.json({ error: "Total hari kerja dan total kehadiran wajib diisi angka bulat >= 0." }, { status: 400 });
  }
  if (totalKehadiran > totalHariKerja) {
    return NextResponse.json({ error: "Total kehadiran tidak boleh lebih besar dari total hari kerja." }, { status: 400 });
  }
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "File timesheet wajib diunggah." }, { status: 400 });
  }
  const ekstensi = path.extname(file.name).toLowerCase();
  if (!EKSTENSI_DIIZINKAN.includes(ekstensi)) {
    return NextResponse.json({ error: `Jenis file ${ekstensi || "?"} tidak didukung. Gunakan PDF, Excel, atau CSV.` }, { status: 400 });
  }
  if (file.size > UKURAN_MAKS) {
    return NextResponse.json({ error: "Ukuran file maksimal 10MB." }, { status: 400 });
  }

  await mkdir(DIR_UPLOAD, { recursive: true });
  const namaFileDisimpan = `${personelId}-${poId}-${periode}-${Date.now()}${ekstensi}`;
  const pathDisimpan = path.join(DIR_UPLOAD, namaFileDisimpan);
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(pathDisimpan, buffer);

  const existing = await db
    .select({ id: timesheet.id, pathFile: timesheet.pathFile })
    .from(timesheet)
    .where(and(eq(timesheet.personelId, personelId), eq(timesheet.poId, poId), eq(timesheet.periode, periode)));

  let id: number;
  if (existing[0]) {
    await db
      .update(timesheet)
      .set({
        userXlId, totalHariKerja, totalKehadiran,
        namaFile: file.name, pathFile: path.join("uploads", "timesheet", namaFileDisimpan),
        diunggahOlehUserId: user.id,
      })
      .where(eq(timesheet.id, existing[0].id));
    id = existing[0].id;
    // Hapus file lama supaya tidak menumpuk file yatim di uploads/timesheet/.
    const pathFileLama = path.join(process.cwd(), existing[0].pathFile);
    await unlink(pathFileLama).catch(() => {});
    await catatAudit({
      entitas: "timesheet", entitasId: id, userId: user.id,
      perubahan: `Timesheet diperbarui (periode ${periode}, hari kerja ${totalHariKerja}, kehadiran ${totalKehadiran}).`,
    });
  } else {
    const hasil = await db
      .insert(timesheet)
      .values({
        personelId, poId, userXlId, periode, totalHariKerja, totalKehadiran,
        namaFile: file.name, pathFile: path.join("uploads", "timesheet", namaFileDisimpan),
        diunggahOlehUserId: user.id,
      })
      .returning({ id: timesheet.id });
    id = hasil[0].id;
    await catatAudit({
      entitas: "timesheet", entitasId: id, userId: user.id,
      perubahan: `Timesheet diunggah (periode ${periode}, hari kerja ${totalHariKerja}, kehadiran ${totalKehadiran}).`,
    });
  }

  return NextResponse.json({ id }, { status: 201 });
}
