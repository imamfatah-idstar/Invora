import { NextRequest, NextResponse } from "next/server";
import { eq, and, desc } from "drizzle-orm";
import { mkdir, writeFile, unlink } from "fs/promises";
import os from "os";
import path from "path";
import { db } from "@/db";
import { timesheet, pemetaanPersonelPo, personel, rateCard } from "@/db/schema";
import { wajibRoleApi } from "@/lib/require-role-api";
import { userSaatIni } from "@/lib/session-server";
import { catatAudit } from "@/lib/audit";
import { hitungHariKerjaAcuanBulan } from "@/lib/kalender";

const DIR_UPLOAD = path.join(process.cwd(), "uploads", "timesheet");
const EKSTENSI_DIIZINKAN = [".pdf", ".xlsx", ".xls", ".csv"];
const UKURAN_MAKS = 10 * 1024 * 1024; // 10MB

function angkaBulatValid(nilai: unknown): number | null {
  if (nilai === null || nilai === undefined || nilai === "") return null;
  const n = Number(nilai);
  if (!Number.isInteger(n) || n < 0) return null;
  return n;
}

async function simpanFileTimesheet(
  file: File,
  prefix: string
): Promise<{ namaAsli: string; pathRelatif: string } | { error: string }> {
  const ekstensi = path.extname(file.name).toLowerCase();
  if (!EKSTENSI_DIIZINKAN.includes(ekstensi)) {
    return { error: `Jenis file ${ekstensi || "?"} tidak didukung. Gunakan PDF, Excel, atau CSV.` };
  }
  if (file.size > UKURAN_MAKS) {
    return { error: "Ukuran file maksimal 10MB." };
  }

  const namaFileDisimpan = `${prefix}-${Date.now()}${ekstensi}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  try {
    await mkdir(DIR_UPLOAD, { recursive: true });
    await writeFile(path.join(DIR_UPLOAD, namaFileDisimpan), buffer);
  } catch {
    // Fallback ke /tmp jika environment serverless read-only (mis. Vercel)
    const tmpDir = path.join(os.tmpdir(), "uploads", "timesheet");
    await mkdir(tmpDir, { recursive: true });
    await writeFile(path.join(tmpDir, namaFileDisimpan), buffer);
  }

  return {
    namaAsli: file.name,
    pathRelatif: path.join("uploads", "timesheet", namaFileDisimpan),
  };
}

// GET /api/timesheet?personelId=&poId=&periode= — cek apakah sudah ada timesheet
// untuk kombinasi ini, atau jika personelId kosong, kembalikan semua personel
// di PO tersebut beserta data timesheet mereka pada periode terkait.
export async function GET(request: NextRequest) {
  const gagal = await wajibRoleApi(["petugas", "checker"]);
  if (gagal) return gagal;

  const { searchParams } = new URL(request.url);
  const personelId = Number(searchParams.get("personelId"));
  const poId = Number(searchParams.get("poId"));
  const periode = searchParams.get("periode");

  if (!poId || !periode) {
    return NextResponse.json({ error: "poId dan periode wajib diisi." }, { status: 400 });
  }

  if (personelId) {
    const baris = await db
      .select()
      .from(timesheet)
      .where(and(eq(timesheet.personelId, personelId), eq(timesheet.poId, poId), eq(timesheet.periode, periode)));

    return NextResponse.json({ timesheet: baris[0] ?? null });
  }

  // Jika personelId tidak dikirim: ambil daftar personel yang terpetakan ke PO ini
  const pemetaanPo = await db
    .select({
      personelId: pemetaanPersonelPo.personelId,
      namaPersonel: personel.nama,
      berlakuDari: pemetaanPersonelPo.berlakuDari,
      berlakuSampai: pemetaanPersonelPo.berlakuSampai,
    })
    .from(pemetaanPersonelPo)
    .innerJoin(personel, eq(pemetaanPersonelPo.personelId, personel.id))
    .where(eq(pemetaanPersonelPo.poId, poId));

  const timesheetAda = await db
    .select()
    .from(timesheet)
    .where(and(eq(timesheet.poId, poId), eq(timesheet.periode, periode)));

  const tsPerPersonel = new Map(timesheetAda.map((t) => [t.personelId, t]));

  // Ambil rate card terbaru tiap personel
  const semuaRate = await db
    .select({
      personelId: rateCard.personelId,
      nilaiRate: rateCard.nilaiRate,
    })
    .from(rateCard)
    .orderBy(desc(rateCard.berlakuDari));

  const ratePerPersonel = new Map<number, string>();
  for (const r of semuaRate) {
    if (!ratePerPersonel.has(r.personelId)) {
      ratePerPersonel.set(r.personelId, r.nilaiRate);
    }
  }

  // Dedupe personel di PO ini
  const personelUnik = new Map<number, { personelId: number; namaPersonel: string }>();
  for (const p of pemetaanPo) {
    personelUnik.set(p.personelId, { personelId: p.personelId, namaPersonel: p.namaPersonel });
  }
  // Tambahkan juga personel yang sudah punya timesheet di PO+periode ini walau belum ada di pemetaanPo
  for (const t of timesheetAda) {
    if (!personelUnik.has(t.personelId)) {
      const [pRow] = await db.select({ id: personel.id, nama: personel.nama }).from(personel).where(eq(personel.id, t.personelId));
      if (pRow) personelUnik.set(pRow.id, { personelId: pRow.id, namaPersonel: pRow.nama });
    }
  }

  let hariKerjaAcuanBulan = 21;
  try {
    const hk = await hitungHariKerjaAcuanBulan(periode);
    if (hk > 0) hariKerjaAcuanBulan = hk;
  } catch {
    hariKerjaAcuanBulan = 21;
  }

  const daftarPersonelPo = Array.from(personelUnik.values()).map((p) => {
    const ts = tsPerPersonel.get(p.personelId);
    return {
      personelId: p.personelId,
      namaPersonel: p.namaPersonel,
      nilaiRate: ratePerPersonel.get(p.personelId) ?? null,
      timesheet: ts
        ? {
            id: ts.id,
            totalHariKerja: ts.totalHariKerja,
            totalKehadiran: ts.totalKehadiran,
            tanggalTimesheet: ts.tanggalTimesheet,
            namaFile: ts.namaFile,
          }
        : null,
    };
  });

  return NextResponse.json({
    daftarPersonelPo,
    hariKerjaAcuanBulan,
  });
}

// POST /api/timesheet — unggah/simpan timesheet (satu personel ATAU banyak personel sekaligus).
export async function POST(request: NextRequest) {
  const gagal = await wajibRoleApi(["petugas"]);
  if (gagal) return gagal;
  const user = await userSaatIni();
  if (!user) return NextResponse.json({ error: "Belum login." }, { status: 401 });

  const form = await request.formData().catch(() => null);
  if (!form) {
    return NextResponse.json({ error: "Data form tidak valid." }, { status: 400 });
  }

  const poId = Number(form.get("poId"));
  const userXlId = Number(form.get("userXlId"));
  const periode = form.get("periode");
  const tanggalDefault = (form.get("tanggalTimesheet") as string) || new Date().toISOString().slice(0, 10);
  const fileRaw = form.get("file");
  const file = fileRaw instanceof File && fileRaw.size > 0 ? fileRaw : null;

  if (!poId || !userXlId || typeof periode !== "string" || !periode) {
    return NextResponse.json({ error: "poId, userXlId, dan periode wajib diisi." }, { status: 400 });
  }

  // Cek apakah mode bulk (items berupa JSON array) atau single personelId
  const itemsJson = form.get("items");
  type ItemInput = {
    personelId: number;
    totalHariKerja: number;
    totalKehadiran: number;
    tanggalTimesheet?: string;
  };
  let daftarInput: ItemInput[] = [];

  if (typeof itemsJson === "string" && itemsJson.trim()) {
    try {
      const parsed = JSON.parse(itemsJson);
      if (!Array.isArray(parsed) || parsed.length === 0) {
        return NextResponse.json({ error: "Pilih dan isi minimal 1 personel untuk disimpan timesheet-nya." }, { status: 400 });
      }
      for (const it of parsed) {
        const pid = Number(it.personelId);
        const hk = angkaBulatValid(it.totalHariKerja);
        const hadir = angkaBulatValid(it.totalKehadiran);
        if (!pid || hk === null || hadir === null) {
          return NextResponse.json({ error: "Total hari kerja dan kehadiran tiap personel wajib berupa angka bulat >= 0." }, { status: 400 });
        }
        if (hadir > hk) {
          return NextResponse.json({ error: "Total kehadiran tidak boleh lebih besar dari total hari kerja." }, { status: 400 });
        }
        daftarInput.push({
          personelId: pid,
          totalHariKerja: hk,
          totalKehadiran: hadir,
          tanggalTimesheet: it.tanggalTimesheet || tanggalDefault,
        });
      }
    } catch {
      return NextResponse.json({ error: "Format data personel timesheet tidak valid." }, { status: 400 });
    }
  } else {
    const personelId = Number(form.get("personelId"));
    const totalHariKerja = angkaBulatValid(form.get("totalHariKerja"));
    const totalKehadiran = angkaBulatValid(form.get("totalKehadiran"));
    if (!personelId) {
      return NextResponse.json({ error: "personelId wajib diisi." }, { status: 400 });
    }
    if (totalHariKerja === null || totalKehadiran === null) {
      return NextResponse.json({ error: "Total hari kerja dan total kehadiran wajib diisi angka bulat >= 0." }, { status: 400 });
    }
    if (totalKehadiran > totalHariKerja) {
      return NextResponse.json({ error: "Total kehadiran tidak boleh lebih besar dari total hari kerja." }, { status: 400 });
    }
    daftarInput = [
      {
        personelId,
        totalHariKerja,
        totalKehadiran,
        tanggalTimesheet: tanggalDefault,
      },
    ];
  }

  let infoFile: { namaAsli: string; pathRelatif: string } | null = null;
  if (file) {
    const hasilSimpan = await simpanFileTimesheet(file, `po${poId}-${periode}`);
    if ("error" in hasilSimpan) {
      return NextResponse.json({ error: hasilSimpan.error }, { status: 400 });
    }
    infoFile = hasilSimpan;
  }

  const idsTersimpan: number[] = [];

  for (const item of daftarInput) {
    const existing = await db
      .select({ id: timesheet.id, namaFile: timesheet.namaFile, pathFile: timesheet.pathFile })
      .from(timesheet)
      .where(and(eq(timesheet.personelId, item.personelId), eq(timesheet.poId, poId), eq(timesheet.periode, periode)));

    const namaFileFinal = infoFile?.namaAsli ?? existing[0]?.namaFile ?? "Input Workdays Timesheet";
    const pathFileFinal = infoFile?.pathRelatif ?? existing[0]?.pathFile ?? "manual-timesheet";

    let id: number;
    if (existing[0]) {
      await db
        .update(timesheet)
        .set({
          userXlId,
          totalHariKerja: item.totalHariKerja,
          totalKehadiran: item.totalKehadiran,
          tanggalTimesheet: item.tanggalTimesheet || tanggalDefault,
          namaFile: namaFileFinal,
          pathFile: pathFileFinal,
          diunggahOlehUserId: user.id,
        })
        .where(eq(timesheet.id, existing[0].id));
      id = existing[0].id;

      if (infoFile && existing[0].pathFile && existing[0].pathFile !== "manual-timesheet") {
        const subPath = existing[0].pathFile.replace(/^[/\\]*uploads[/\\]*/, "");
        const pathFileLama = path.join(/*turbopackIgnore: true*/ process.cwd(), "uploads", subPath);
        await unlink(pathFileLama).catch(() => {});
      }
    } else {
      const hasil = await db
        .insert(timesheet)
        .values({
          personelId: item.personelId,
          poId,
          userXlId,
          periode,
          totalHariKerja: item.totalHariKerja,
          totalKehadiran: item.totalKehadiran,
          tanggalTimesheet: item.tanggalTimesheet || tanggalDefault,
          namaFile: namaFileFinal,
          pathFile: pathFileFinal,
          diunggahOlehUserId: user.id,
        })
        .returning({ id: timesheet.id });
      id = hasil[0].id;
    }

    // Pastikan personel juga tercatat di pemetaan_personel_po pada PO ini jika belum ada
    const [adaPeta] = await db
      .select({ id: pemetaanPersonelPo.id })
      .from(pemetaanPersonelPo)
      .where(and(eq(pemetaanPersonelPo.poId, poId), eq(pemetaanPersonelPo.personelId, item.personelId)));

    if (!adaPeta) {
      await db.insert(pemetaanPersonelPo).values({
        personelId: item.personelId,
        poId,
        berlakuDari: `${periode}-01`,
        berlakuSampai: null,
        userXlId,
      });
    }

    idsTersimpan.push(id);
  }

  await catatAudit({
    entitas: "timesheet",
    entitasId: idsTersimpan[0] ?? 0,
    userId: user.id,
    perubahan: `Simpan timesheet periode ${periode} pada PO #${poId} untuk ${idsTersimpan.length} personel.`,
  });

  return NextResponse.json({ ok: true, id: idsTersimpan[0], count: idsTersimpan.length }, { status: 201 });
}
