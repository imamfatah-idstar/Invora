import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users, passwordResets } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { randomBytes } from "crypto";
import { kirimEmailResetPassword } from "@/lib/email-service";
import { catatAudit } from "@/lib/audit";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const emailRaw = body?.email;

  if (!emailRaw || typeof emailRaw !== "string" || !emailRaw.trim()) {
    return NextResponse.json({ error: "Alamat email wajib diisi." }, { status: 400 });
  }

  const email = emailRaw.trim().toLowerCase();

  // Cari user di database
  const [user] = await db.select().from(users).where(eq(users.email, email));

  // Demi keamanan, jika email tidak ditemukan atau nonaktif, berikan pesan umum atau pesan jelas
  if (!user || !user.aktif) {
    return NextResponse.json({
      error: `Akun dengan email "${email}" tidak ditemukan atau sedang dinonaktifkan.`,
    }, { status: 404 });
  }

  // Generate secure token 32 bytes (64 hex characters)
  const token = randomBytes(32).toString("hex");
  const kedaluwarsa = new Date(Date.now() + 60 * 60 * 1000); // 60 menit

  // Tandai token lama milik email ini sebagai sudah terpakai agar tidak menumpuk
  await db
    .update(passwordResets)
    .set({ sudahDipakai: true })
    .where(and(eq(passwordResets.email, email), eq(passwordResets.sudahDipakai, false)));

  // Simpan token baru
  await db.insert(passwordResets).values({
    email,
    token,
    kedaluwarsaPada: kedaluwarsa.toISOString(),
    sudahDipakai: false,
  });

  // Tentukan Base URL
  const origin = request.nextUrl.origin || process.env.NEXT_PUBLIC_APP_URL || "https://proses-invoicing-app.vercel.app";
  const resetUrl = `${origin}/reset-password?token=${token}`;

  // Kirim email
  const kirimRes = await kirimEmailResetPassword({
    email,
    nama: user.nama,
    resetUrl,
    token,
  });

  await catatAudit({
    entitas: "users",
    entitasId: user.id,
    userId: user.id,
    perubahan: `Permintaan reset kata sandi via email untuk "${email}".`,
  });

  return NextResponse.json({
    sukses: true,
    message: `Tautan untuk mengatur ulang kata sandi telah dikirimkan ke email ${email}.`,
    devPreviewUrl: kirimRes.devPreviewUrl,
  });
}

