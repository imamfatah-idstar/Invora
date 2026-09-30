import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { poLineItem } from "@/db/schema";
import { eq } from "drizzle-orm";
import { wajibRoleApi } from "@/lib/require-role-api";
import { userSaatIni } from "@/lib/session-server";
import { catatAudit } from "@/lib/audit";
import { angkaDesimalValid } from "@/lib/validasi";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const gagal = await wajibRoleApi(["petugas"]);
  if (gagal) return gagal;
  const user = await userSaatIni();
  const { id } = await params;
  const body = await request.json().catch(() => null);

  if (!body?.shortText || !String(body.shortText).trim()) {
    return NextResponse.json({ error: "Short text (deskripsi baris) wajib diisi." }, { status: 400 });
  }
  if (!Number.isInteger(Number(body.nomorLine)) || Number(body.nomorLine) <= 0) {
    return NextResponse.json({ error: "PO Line wajib angka lebih dari 0." }, { status: 400 });
  }
  if (!Number.isInteger(Number(body.qty)) || Number(body.qty) <= 0) {
    return NextResponse.json({ error: "Qty wajib angka lebih dari 0." }, { status: 400 });
  }
  if (!angkaDesimalValid(body.hargaSatuan)) {
    return NextResponse.json({ error: "Price PO harus berupa angka valid (maks 2 desimal)." }, { status: 400 });
  }

  const [row] = await db.insert(poLineItem).values({
    poId: Number(id),
    nomorLine: Number(body.nomorLine),
    shortText: String(body.shortText).trim(),
    qty: Number(body.qty),
    hargaSatuan: body.hargaSatuan,
  }).returning();

  await catatAudit({
    entitas: "po_line_item", entitasId: row.id,
    perubahan: `Tambah PO line item poId=${id} line=${row.nomorLine} shortText="${row.shortText}"`,
    userId: user!.id,
  });

  return NextResponse.json(row, { status: 201 });
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const gagal = await wajibRoleApi(["petugas", "checker"]);
  if (gagal) return gagal;
  const { id } = await params;
  const daftar = await db.select().from(poLineItem).where(eq(poLineItem.poId, Number(id))).orderBy(poLineItem.nomorLine);
  return NextResponse.json(daftar);
}
