import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import {
  grRequestRiwayat, grRequest, lampiranPengajuan, dokumen, checkerReview,
  konfirmasi, timesheet, pengajuanDetail, pengajuan, pemetaanPersonelPo,
  poLineItem, rateCard, po, personel,
} from "@/db/schema";
import { wajibRoleApi } from "@/lib/require-role-api";
import { userSaatIni } from "@/lib/session-server";
import { catatAudit } from "@/lib/audit";

// Halaman "Kelola Data" (bagian 48) — reset massal data uji/salah unggah,
// dipakai selama pengembangan/testing (bukan untuk data produksi nyata).
// Kategori dipilih supaya urutan hapus selalu aman terhadap foreign key
// (child dihapus sebelum parent) — lihat juga scripts/hapus-data-uji.ts
// (versi command-line dari logika yang sama, dibuat bagian 47).

type Kategori = "pengajuan" | "timesheet" | "personel" | "po" | "semua";

async function jumlahSemuaTabel() {
  const tabel = { personel, rateCard, po, poLineItem, pemetaanPersonelPo, pengajuan, pengajuanDetail, timesheet, dokumen, lampiranPengajuan, grRequest, grRequestRiwayat, konfirmasi, checkerReview };
  const hasil: Record<string, number> = {};
  for (const [nama, t] of Object.entries(tabel)) {
    hasil[nama] = (await db.select().from(t as never)).length;
  }
  return hasil;
}

export async function GET() {
  const gagal = await wajibRoleApi(["petugas", "admin"]);
  if (gagal) return gagal;
  return NextResponse.json(await jumlahSemuaTabel());
}

export async function POST(request: NextRequest) {
  const gagal = await wajibRoleApi(["petugas", "admin"]);
  if (gagal) return gagal;
  const user = await userSaatIni();

  const body = await request.json().catch(() => null);
  const kategori = body?.kategori as Kategori | undefined;
  if (!kategori) return NextResponse.json({ error: "Kategori wajib diisi." }, { status: 400 });

  try {
    switch (kategori) {
      case "pengajuan":
        // Aman berdiri sendiri — TIDAK menyentuh personel/PO/rate card/pemetaan/timesheet.
        await db.delete(grRequestRiwayat);
        await db.delete(grRequest);
        await db.delete(lampiranPengajuan);
        await db.delete(dokumen);
        await db.delete(checkerReview);
        await db.delete(konfirmasi);
        await db.delete(pengajuanDetail);
        await db.delete(pengajuan);
        break;

      case "timesheet":
        await db.delete(timesheet);
        break;

      case "personel":
        // Menghapus SEMUA personel otomatis butuh membersihkan semua yang
        // mereferensikan personel dulu — termasuk pengajuan_detail (baris
        // rincian pengajuan jadi kosong, header pengajuan TIDAK ikut
        // terhapus di kategori ini).
        await db.delete(timesheet);
        await db.delete(pemetaanPersonelPo);
        await db.delete(pengajuanDetail);
        await db.delete(rateCard);
        await db.delete(personel);
        break;

      case "po":
        // Kalau masih ada pengajuan yang mereferensikan PO ini, langkah
        // terakhir (hapus po) akan gagal dengan error FK — sengaja TIDAK
        // ikut menghapus pengajuan di sini (beda kategori, biar tidak
        // kehapus tanpa sadar). Hapus kategori "Pengajuan" dulu kalau perlu.
        await db.delete(poLineItem);
        await db.delete(pemetaanPersonelPo);
        await db.delete(timesheet);
        await db.delete(po);
        break;

      case "semua":
        await db.delete(grRequestRiwayat);
        await db.delete(grRequest);
        await db.delete(lampiranPengajuan);
        await db.delete(dokumen);
        await db.delete(checkerReview);
        await db.delete(konfirmasi);
        await db.delete(timesheet);
        await db.delete(pengajuanDetail);
        await db.delete(pengajuan);
        await db.delete(pemetaanPersonelPo);
        await db.delete(poLineItem);
        await db.delete(rateCard);
        await db.delete(po);
        await db.delete(personel);
        break;

      default:
        return NextResponse.json({ error: "Kategori tidak dikenali." }, { status: 400 });
    }
  } catch {
    return NextResponse.json({
      error: "Gagal menghapus — masih ada data lain yang mereferensikan kategori ini. Coba hapus kategori \"Pengajuan\" dulu (kalau ada), baru ulangi.",
    }, { status: 409 });
  }

  await catatAudit({
    entitas: "kelola_data", entitasId: 0, userId: user!.id,
    perubahan: `Hapus semua data kategori "${kategori}" lewat halaman Kelola Data`,
  });

  return NextResponse.json({ ok: true, sisa: await jumlahSemuaTabel() });
}
