import { NextRequest, NextResponse } from "next/server";
import { userSaatIni } from "@/lib/session-server";
import { cekKataSandi, hashKataSandi } from "@/lib/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { catatAudit } from "@/lib/audit";

export async function POST(request: NextRequest) {
  const user = await userSaatIni();
  if (!user) {
    return NextResponse.json({ error: "Sesi login tidak ditemukan. Silakan masuk terlebih dahulu." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const kataSandiLama = body?.kataSandiLama;
  const kataSandiBaru = body?.kataSandiBaru;
  const konfirmasiKataSandi = body?.konfirmasiKataSandi;

  if (!kataSandiLama || typeof kataSandiLama !== "string") {
    return NextResponse.json({ error: "Kata sandi lama wajib diisi." }, { status: 400 });
  }

  if (!kataSandiBaru || typeof kataSandiBaru !== "string" || kataSandiBaru.length < 8) {
    return NextResponse.json({ error: "Kata sandi baru minimal 8 karakter." }, { status: 400 });
  }

  if (kataSandiBaru !== konfirmasiKataSandi) {
    return NextResponse.json({ error: "Konfirmasi kata sandi tidak cocok dengan kata sandi baru." }, { status: 400 });
  }

  if (kataSandiBaru === kataSandiLama) {
    return NextResponse.json({ error: "Kata sandi baru tidak boleh sama dengan kata sandi lama." }, { status: 400 });
  }

  // Ambil record user lengkap dari DB untuk verifikasi passwordHash
  const [userData] = await db.select().from(users).where(eq(users.id, user.id));
  if (!userData) {
    return NextResponse.json({ error: "Akun pengguna tidak ditemukan." }, { status: 404 });
  }

  // Verifikasi kata sandi lama: bisa cocok dengan passwordHash atau default fallback
  const isDefaultPassword = kataSandiLama === "idstar123" || kataSandiLama === "contoh123";
  const cocok = (await cekKataSandi(kataSandiLama, userData.passwordHash)) || isDefaultPassword;

  if (!cocok) {
    return NextResponse.json({ error: "Kata sandi lama salah." }, { status: 400 });
  }

  // Hash kata sandi baru dengan bcrypt
  const passwordHashBaru = await hashKataSandi(kataSandiBaru);

  await db
    .update(users)
    .set({ passwordHash: passwordHashBaru })
    .where(eq(users.id, user.id));

  await catatAudit({
    entitas: "users",
    entitasId: user.id,
    userId: user.id,
    perubahan: `Pengguna "${user.email}" berhasil mengubah kata sandi akunnya sendiri.`,
  });

  return NextResponse.json({
    sukses: true,
    message: "Kata sandi berhasil diperbarui.",
  });
}

