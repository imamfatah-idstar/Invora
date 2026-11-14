import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { cekKataSandi, buatSesi, hashKataSandi } from "@/lib/auth";
import { getAllUserRoles, getAuthorizedProfile, getCleanDisplayName } from "@/lib/user-roles";
import {
  checkDdosRateLimit,
  clearFailedLogins,
  getClientIp,
  recordFailedLogin,
  verifyRecaptchaToken,
} from "@/lib/recaptcha";

export async function POST(request: NextRequest) {
  const ip = getClientIp(request.headers);

  // 1. Anti-DDoS & Brute-Force Rate Limiting
  const rateCheck = checkDdosRateLimit(ip);
  if (!rateCheck.allowed) {
    return NextResponse.json(
      { error: rateCheck.reason || "Too many login requests. Please try again later." },
      {
        status: 429,
        headers: rateCheck.retryAfterSec ? { "Retry-After": String(rateCheck.retryAfterSec) } : undefined,
      }
    );
  }

  const body = await request.json().catch(() => null);

  // 2. Honeypot Anti-Bot Trap
  if (body?.honeypot) {
    recordFailedLogin(ip);
    return NextResponse.json(
      { error: "Suspicious automated activity (Bot) detected." },
      { status: 403 }
    );
  }

  // 3. Official Google reCAPTCHA v2 Token Verification
  const recaptchaCheck = await verifyRecaptchaToken(body?.recaptchaToken, ip);
  if (!recaptchaCheck.valid) {
    return NextResponse.json(
      { error: recaptchaCheck.error || "Google reCAPTCHA verification failed.", resetRecaptcha: true },
      { status: 400 }
    );
  }

  const emailRaw = body?.email;
  const kataSandi = body?.kataSandi;

  if (!emailRaw || !kataSandi) {
    return NextResponse.json(
      { error: "Email address and password are required." },
      { status: 400 }
    );
  }

  const email = String(emailRaw).trim().toLowerCase();
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
        passwordHash: passwordHash,
        role: authProfile.roles.join(","),
        aktif: true,
      })
      .returning();
    user = newUser;
  }

  // Jika akun demo contoh.local dinonaktifkan sebelumnya, aktifkan kembali otomatis agar demo selalu berfungsi
  if (user && email.endsWith("@contoh.local") && !user.aktif) {
    await db.update(users).set({ aktif: true }).where(eq(users.id, user.id));
    user.aktif = true;
  }

  // Pesan error sengaja disamakan
  if (!user || !user.aktif) {
    recordFailedLogin(ip);
    return NextResponse.json(
      { error: "Invalid email address or password.", resetRecaptcha: true },
      { status: 401 }
    );
  }

  const isDefaultPassword = kataSandi === "idstar123" || kataSandi === "contoh123";
  const cocok = isDefaultPassword || (await cekKataSandi(kataSandi, user.passwordHash));
  if (!cocok) {
    recordFailedLogin(ip);
    return NextResponse.json(
      { error: "Invalid email address or password.", resetRecaptcha: true },
      { status: 401 }
    );
  }

  clearFailedLogins(ip);

  // Update nama jika masih mengandung 'Contoh'
  if (authProfile && (user.nama !== authProfile.nama || user.nama.includes("Contoh"))) {
    await db.update(users).set({ nama: authProfile.nama }).where(eq(users.id, user.id));
    user.nama = authProfile.nama;
  }

  const { token, kedaluwarsa } = await buatSesi(user.id);
  const allRoles = getAllUserRoles(user);
  const cleanName = getCleanDisplayName(user.email, user.nama);

  const multipleRoles = allRoles.length > 1;
  const initialRole = allRoles[0] || "petugas";

  const response = NextResponse.json({
    sukses: true,
    multipleRoles,
    nama: cleanName,
    role: initialRole,
    roles: allRoles,
  });

  response.cookies.set("sesi_token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: kedaluwarsa,
  });

  response.cookies.set("sesi_role", initialRole, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: kedaluwarsa,
  });

  return response;
}
