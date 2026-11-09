import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users, passwordResets } from "@/db/schema";
import { eq } from "drizzle-orm";
import { hashKataSandi } from "@/lib/auth";
import { catatAudit } from "@/lib/audit";

// GET: Verifikasi apakah token masih berlaku
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.json({ valid: false, error: "Token tidak ditemukan." }, { status: 400 });
  }

  const [record] = await db
    .select()
    .from(passwordResets)
    .where(eq(passwordResets.token, token));

  if (!record || record.sudahDipakai) {
    return NextResponse.json({ valid: false, error: "Tautan reset kata sandi tidak valid atau sudah pernah digunakan." }, { status: 400 });
  }

  if (new Date(record.kedaluwarsaPada) < new Date()) {
    return NextResponse.json({ valid: false, error: "Tautan reset kata sandi telah kedaluwarsa (masa berlaku 60 menit)." }, { status: 400 });
  }

  return NextResponse.json({ valid: true, email: record.email });
}

// POST: Eksekusi ubah kata sandi
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const token = body?.token;
  const kataSandiBaru = body?.kataSandiBaru;
  const konfirmasiKataSandi = body?.konfirmasiKataSandi;

  if (!token || typeof token !== "string") {
    return NextResponse.json({ error: "Token reset kata sandi wajib disertakan." }, { status: 400 });
  }

  if (!kataSandiBaru || typeof kataSandiBaru !== "string" || kataSandiBaru.length < 8) {
    return NextResponse.json({ error: "Kata sandi baru minimal 8 karakter." }, { status: 400 });
  }

  if (kataSandiBaru !== konfirmasiKataSandi) {
    return NextResponse.json({ error: "Konfirmasi kata sandi tidak cocok." }, { status: 400 });
  }

  const [record] = await db
    .select()
    .from(passwordResets)
    .where(eq(passwordResets.token, token));

  if (!record || record.sudahDipakai) {
    return NextResponse.json({ error: "Tautan reset kata sandi tidak valid atau sudah pernah digunakan." }, { status: 400 });
  }

  if (new Date(record.kedaluwarsaPada) < new Date()) {
    return NextResponse.json({ error: "Tautan reset kata sandi telah kedaluwarsa. Silakan minta tautan baru." }, { status: 400 });
  }

  // Ambil data user
  const [user] = await db.select().from(users).where(eq(users.email, record.email));
  if (!user) {
    return NextResponse.json({ error: "Akun pengguna tidak ditemukan." }, { status: 404 });
  }

  const passwordHash = await hashKataSandi(kataSandiBaru);

  // Update password user
  await db
    .update(users)
    .set({ passwordHash })
    .where(eq(users.id, user.id));

  // Tandai token sudah digunakan
  await db
    .update(passwordResets)
    .set({ sudahDipakai: true })
    .where(eq(passwordResets.id, record.id));

  await catatAudit({
    entitas: "users",
    entitasId: user.id,
    userId: user.id,
    perubahan: `Kata sandi akun "${user.email}" berhasil diperbarui melalui tautan verifikasi email.`,
  });

  return NextResponse.json({
    sukses: true,
    message: "Kata sandi berhasil diatur ulang! Silakan masuk dengan kata sandi baru Anda.",
  });
}

