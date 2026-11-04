import { NextRequest, NextResponse } from "next/server";
import { userSaatIni } from "@/lib/session-server";
import { db } from "@/db";
import { reminderLog, pengajuan } from "@/db/schema";
import { eq } from "drizzle-orm";
import { catatAudit } from "@/lib/audit";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await userSaatIni();
  if (!user) {
    return NextResponse.json({ error: "Sesi tidak valid / belum login" }, { status: 401 });
  }

  const { id } = await params;
  const pengajuanId = parseInt(id, 10);
  if (isNaN(pengajuanId)) {
    return NextResponse.json({ error: "ID pengajuan tidak valid" }, { status: 400 });
  }

  // Cek pengajuan
  const [dataPengajuan] = await db
    .select()
    .from(pengajuan)
    .where(eq(pengajuan.id, pengajuanId))
    .limit(1);

  if (!dataPengajuan) {
    return NextResponse.json({ error: "Pengajuan tidak ditemukan" }, { status: 404 });
  }

  try {
    const body = await request.json();
    const {
      emailPenerima,
      namaPicPenerima,
      subjek,
      pesanTeks,
      metode = "mailto",
    } = body;

    if (!emailPenerima || !subjek || !pesanTeks) {
      return NextResponse.json(
        { error: "Email penerima, subjek, dan pesan wajib diisi." },
        { status: 400 }
      );
    }

    const [inserted] = await db
      .insert(reminderLog)
      .values({
        pengajuanId,
        tipeReminder: "invoice_resmi",
        emailPenerima: emailPenerima.trim(),
        namaPicPenerima: namaPicPenerima?.trim() || null,
        subjek: subjek.trim(),
        pesanTeks,
        metode,
        statusKirim: "berhasil",
        dikirimOlehUserId: user.id,
      })
      .returning();

    // Catat ke audit log sistem
    await catatAudit({
      entitas: "pengajuan",
      entitasId: pengajuanId,
      perubahan: `Kirim Invoice Resmi (${dataPengajuan.nomorInvoice || `ID-${pengajuanId}`}) ke email personal ${emailPenerima.trim()} via ${metode}`,
      userId: user.id,
    });

    return NextResponse.json({
      sukses: true,
      message: `Invoice berhasil dikirim/dicatat ke email ${emailPenerima.trim()}`,
      data: inserted,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal memproses pengiriman invoice";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

