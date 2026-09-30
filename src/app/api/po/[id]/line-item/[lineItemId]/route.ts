import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { poLineItem } from "@/db/schema";
import { eq } from "drizzle-orm";
import { wajibRoleApi } from "@/lib/require-role-api";
import { userSaatIni } from "@/lib/session-server";
import { catatAudit } from "@/lib/audit";

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string; lineItemId: string }> }) {
  const gagal = await wajibRoleApi(["petugas"]);
  if (gagal) return gagal;
  const user = await userSaatIni();
  const { lineItemId } = await params;
  try {
    await db.delete(poLineItem).where(eq(poLineItem.id, Number(lineItemId)));
    await catatAudit({ entitas: "po_line_item", entitasId: Number(lineItemId), perubahan: "Hapus PO line item", userId: user!.id });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Tidak bisa dihapus — line item ini masih dipakai di pemetaan personel." }, { status: 409 });
  }
}
