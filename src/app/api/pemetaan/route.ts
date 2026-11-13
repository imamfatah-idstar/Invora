import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { pemetaanPersonelPo } from "@/db/schema";
import { desc, eq, inArray } from "drizzle-orm";
import { wajibRoleApi } from "@/lib/require-role-api";
import { userSaatIni } from "@/lib/session-server";
import { catatAudit } from "@/lib/audit";

export async function POST(request: NextRequest) {
  const gagal = await wajibRoleApi(["petugas"]);
  if (gagal) return gagal;
  const user = await userSaatIni();

  const body = await request.json().catch(() => null);
  if (!body?.personelId || !body?.poId) {
    return NextResponse.json({ error: "Personel dan PO wajib dipilih." }, { status: 400 });
  }
  if (!body?.berlakuDari) {
    return NextResponse.json({ error: "Tanggal berlaku dari wajib diisi." }, { status: 400 });
  }

  const personelIdNum = Number(body.personelId);
  const poIdNum = Number(body.poId);
  const poLineItemIdVal = body.poLineItemId ? Number(body.poLineItemId) : null;
  const userXlIdVal = body.userXlId ? Number(body.userXlId) : null;
  const berlakuDariVal = body.berlakuDari;
  const berlakuSampaiVal = body.berlakuSampai || null;

  const existingList = await db
    .select()
    .from(pemetaanPersonelPo)
    .where(eq(pemetaanPersonelPo.personelId, personelIdNum))
    .orderBy(desc(pemetaanPersonelPo.id));

  if (existingList.length > 0) {
    const target = existingList[0];
    const [updated] = await db
      .update(pemetaanPersonelPo)
      .set({
        poId: poIdNum,
        poLineItemId: poLineItemIdVal,
        userXlId: userXlIdVal,
        berlakuDari: berlakuDariVal,
        berlakuSampai: berlakuSampaiVal,
      })
      .where(eq(pemetaanPersonelPo.id, target.id))
      .returning();

    if (existingList.length > 1) {
      const extraIds = existingList.slice(1).map((x) => x.id);
      await db.delete(pemetaanPersonelPo).where(inArray(pemetaanPersonelPo.id, extraIds));
    }

    await catatAudit({
      entitas: "pemetaan_personel_po",
      entitasId: updated.id,
      perubahan: `Perbarui pemetaan personelId=${updated.personelId} ke poId=${updated.poId}`,
      userId: user!.id,
    });

    return NextResponse.json({ ...updated, updated: true }, { status: 200 });
  }

  const [row] = await db
    .insert(pemetaanPersonelPo)
    .values({
      personelId: personelIdNum,
      poId: poIdNum,
      poLineItemId: poLineItemIdVal,
      userXlId: userXlIdVal,
      berlakuDari: berlakuDariVal,
      berlakuSampai: berlakuSampaiVal,
    })
    .returning();

  await catatAudit({
    entitas: "pemetaan_personel_po",
    entitasId: row.id,
    perubahan: `Tambah pemetaan personelId=${row.personelId} ke poId=${row.poId}`,
    userId: user!.id,
  });

  return NextResponse.json({ ...row, updated: false }, { status: 201 });
}
