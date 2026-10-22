import { NextRequest, NextResponse } from "next/server";
import { userSaatIni } from "@/lib/session-server";
import { db } from "@/db";
import { reminderLog, pengajuan, users } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { catatAudit } from "@/lib/audit";

export async function GET(
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

  try {
    const list = await db
      .select({
        id: reminderLog.id,
        pengajuanId: reminderLog.pengajuanId,
        tipeReminder: reminderLog.tipeReminder,
        emailPenerima: reminderLog.emailPenerima,
        namaPicPenerima: reminderLog.namaPicPenerima,
        subjek: reminderLog.subjek,
        pesanTeks: reminderLog.pesanTeks,
        metode: reminderLog.metode,
        statusKirim: reminderLog.statusKirim,
        dikirimPada: reminderLog.dikirimPada,
        pengirimNama: users.nama,
        pengirimRole: users.role,
      })
      .from(reminderLog)
      .innerJoin(users, eq(reminderLog.dikirimOlehUserId, users.id))
      .where(eq(reminderLog.pengajuanId, pengajuanId))
      .orderBy(desc(reminderLog.id));

    return NextResponse.json({ data: list });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal mengambil log reminder";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

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

  // Cek keberadaan pengajuan
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
      tipeReminder = "h-7",
      emailPenerima,
      namaPicPenerima,
      subjek,
      pesanTeks,
      metode = "mailto",
    } = body;

    if (!emailPenerima || !subjek || !pesanTeks) {
      return NextResponse.json(
        { error: "Email penerima, subjek, dan pesan wajib diisi" },
        { status: 400 }
      );
    }

    const [inserted] = await db
      .insert(reminderLog)
      .values({
        pengajuanId,
        tipeReminder,
        emailPenerima: emailPenerima.trim(),
        namaPicPenerima: namaPicPenerima?.trim() || null,
        subjek: subjek.trim(),
        pesanTeks,
        metode,
        statusKirim: "berhasil",
        dikirimOlehUserId: user.id,
      })
      .returning();

    // Catat ke audit log
    await catatAudit({
      entitas: "pengajuan",
      entitasId: pengajuanId,
      perubahan: `Kirim Email Pengingat Jatuh Tempo (${tipeReminder.toUpperCase()}) ke ${emailPenerima} via ${metode}`,
      userId: user.id,
    });

    return NextResponse.json({
      sukses: true,
      message: "Log pengingat jatuh tempo berhasil dicatat",
      data: inserted,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal mencatat reminder";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
