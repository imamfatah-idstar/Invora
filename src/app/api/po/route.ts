import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { po } from "@/db/schema";
import { wajibRoleApi } from "@/lib/require-role-api";
import { userSaatIni } from "@/lib/session-server";
import { catatAudit } from "@/lib/audit";
import { angkaDesimalValid } from "@/lib/validasi";

export async function POST(request: NextRequest) {
  const gagal = await wajibRoleApi(["petugas"]);
  if (gagal) return gagal;
  const user = await userSaatIni();

  const body = await request.json().catch(() => null);
  if (!body?.nomorPo || !String(body.nomorPo).trim()) {
    return NextResponse.json({ error: "Nomor PO wajib diisi." }, { status: 400 });
  }
  if (!body?.namaProyek || !String(body.namaProyek).trim()) {
    return NextResponse.json({ error: "Nama proyek wajib diisi (harus mengikuti COUPA)." }, { status: 400 });
  }
  if (!angkaDesimalValid(body.nilaiItem)) {
    return NextResponse.json({ error: "Nilai item harus berupa angka valid (maks 2 desimal)." }, { status: 400 });
  }
  const tahunSekarang = new Date().getFullYear();
  const tahun = Number.isInteger(Number(body.tahun)) && Number(body.tahun) > 0 ? Number(body.tahun) : tahunSekarang;
  const nilaiGr = body.nilaiGr !== undefined && body.nilaiGr !== null && body.nilaiGr !== ""
    ? body.nilaiGr
    : "0.00";
  if (!angkaDesimalValid(nilaiGr)) {
    return NextResponse.json({ error: "Nilai GR harus berupa angka valid (maks 2 desimal)." }, { status: 400 });
  }

  const jenisTagihan = body.jenisTagihan === "tahap" ? "tahap" : "bulanan";
  const klien = typeof body.klien === "string" && body.klien.trim() ? body.klien.trim() : null;

  try {
    const [row] = await db.insert(po).values({
      nomorPo: String(body.nomorPo).trim(),
      namaProyek: String(body.namaProyek).trim(),
      tahun,
      nilaiItem: body.nilaiItem,
      saldoSebelumPpn: body.nilaiItem,
      nilaiGr,
      klien,
      jenisTagihan,
    }).returning();

    await catatAudit({ entitas: "po", entitasId: row.id, perubahan: `Tambah PO "${row.nomorPo}" tahun=${tahun} nilai=${row.nilaiItem} nilaiGr=${nilaiGr}`, userId: user!.id });

    return NextResponse.json(row, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Nomor PO sudah ada." }, { status: 409 });
  }
}
