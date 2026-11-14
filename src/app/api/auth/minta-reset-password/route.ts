import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users, passwordResets } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { randomBytes } from "crypto";
import { kirimEmailResetPassword } from "@/lib/email-service";
import { catatAudit } from "@/lib/audit";
import { getAuthorizedProfile } from "@/lib/user-roles";
import { hashKataSandi } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const emailRaw = body?.email;

  if (!emailRaw || typeof emailRaw !== "string" || !emailRaw.trim()) {
    return NextResponse.json({ error: "Email address is required." }, { status: 400 });
  }

  const email = emailRaw.trim().toLowerCase();

  // Cari user di database
  let [user] = await db.select().from(users).where(eq(users.email, email));
  const authProfile = getAuthorizedProfile(email);

  // Jika user belum ada di DB tapi terdaftar dalam AUTHORIZED_USERS resmi, buatkan otomatis
  if (!user && authProfile) {
    const isDemo = email.endsWith("@contoh.local");
    const passwordHash = await hashKataSandi(isDemo ? "contoh123" : "idstar123");
    const [newUser] = await db
      .insert(users)
      .values({
        nama: authProfile.nama,
        email: authProfile.email,
        passwordHash,
        role: authProfile.roles.join(","),
        aktif: true,
      })
      .returning();
    user = newUser;
  }

  if (!user || !user.aktif) {
    return NextResponse.json(
      {
        error: `No active account found with email "${email}".`,
      },
      { status: 404 }
    );
  }

  // Generate secure token 32 bytes (64 hex characters)
  const token = randomBytes(32).toString("hex");
  const kedaluwarsa = new Date(Date.now() + 60 * 60 * 1000); // 60 minutes

  // Invalidate previous unused tokens for this email
  await db
    .update(passwordResets)
    .set({ sudahDipakai: true })
    .where(and(eq(passwordResets.email, email), eq(passwordResets.sudahDipakai, false)));

  // Save new token
  await db.insert(passwordResets).values({
    email,
    token,
    kedaluwarsaPada: kedaluwarsa.toISOString(),
    sudahDipakai: false,
  });

  // Base URL
  const origin =
    request.nextUrl.origin ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "https://invora-iota.vercel.app";
  const resetUrl = `${origin}/reset-password?token=${token}`;

  // Send email via SMTP (or return preview URL if SMTP is not yet configured)
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
    perubahan: `Password reset requested via email for "${email}".`,
  });

  return NextResponse.json({
    sukses: true,
    email,
    nama: user.nama,
    message: `A password reset link has been sent to ${email}.`,
    resetUrl,
    devPreviewUrl: kirimRes.devPreviewUrl,
    smtpSent: !kirimRes.devPreviewUrl,
  });
}
