import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import {
  apakahEmailIdstarGroup,
  tukarGoogleCode,
  ambilGoogleUserProfile,
  DOMAIN_DIIZINKAN,
} from "@/lib/google-auth";
import { buatSesi, hashKataSandi } from "@/lib/auth";
import { catatAudit } from "@/lib/audit";
import { randomBytes } from "crypto";

export async function GET(request: NextRequest) {
  const origin = request.nextUrl.origin;
  const redirectUri = `${origin}/api/auth/google/callback`;

  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const googleError = searchParams.get("error");

  // Jika Google mengembalikan error / user membatalkan
  if (googleError) {
    const errorMsg = encodeURIComponent("Proses masuk dengan Google dibatalkan atau ditolak.");
    return NextResponse.redirect(`${origin}/?error=${errorMsg}`);
  }

  if (!code || !state) {
    const errorMsg = encodeURIComponent("Parameter otorisasi Google tidak lengkap.");
    return NextResponse.redirect(`${origin}/?error=${errorMsg}`);
  }

  // Verifikasi CSRF State
  const savedState = request.cookies.get("google_oauth_state")?.value;
  if (!savedState || savedState !== state) {
    const errorMsg = encodeURIComponent("Validasi keamanan state gagal atau sesi telah kedaluwarsa. Silakan coba lagi.");
    return NextResponse.redirect(`${origin}/?error=${errorMsg}`);
  }

  try {
    // 1. Tukar authorization code menjadi token
    const tokenData = await tukarGoogleCode(code, redirectUri);

    // 2. Ambil data profil Google
    const profile = await ambilGoogleUserProfile(tokenData.access_token);
    const email = profile.email?.trim().toLowerCase();

    // 3. Validasi Ketat Domain: HANYA @idstar.group atau .idstar.group
    if (!apakahEmailIdstarGroup(email)) {
      const pesanTolak = encodeURIComponent(
        `Akses ditolak: Akun ${email || "Google"} bukan email resmi IDStar Group. Hanya akun dengan domain @${DOMAIN_DIIZINKAN} yang diizinkan masuk ke INVORA.`
      );
      const response = NextResponse.redirect(`${origin}/?error=${pesanTolak}`);
      response.cookies.delete("google_oauth_state");
      return response;
    }

    // 4. Cari atau Daftarkan User di Database (Just-In-Time Provisioning)
    let [user] = await db.select().from(users).where(eq(users.email, email));

    if (!user) {
      // Buat akun baru jika belum terdaftar
      const randomPassword = randomBytes(16).toString("hex");
      const passwordHash = await hashKataSandi(randomPassword);

      const [newUser] = await db
        .insert(users)
        .values({
          nama: profile.name || email.split("@")[0],
          email: email,
          passwordHash: passwordHash,
          role: "petugas", // Role default karyawan IDStar
          aktif: true,
        })
        .returning();

      user = newUser;

      await catatAudit({
        entitas: "users",
        entitasId: user.id,
        userId: user.id,
        perubahan: `Pendaftaran otomatis akun baru via Google SSO: ${email} (role: petugas)`,
      });
    }

    // Cek apakah akun aktif
    if (!user.aktif) {
      const errorMsg = encodeURIComponent("Akun IDStar Anda sedang dinonaktifkan. Silakan hubungi Super Admin.");
      const response = NextResponse.redirect(`${origin}/?error=${errorMsg}`);
      response.cookies.delete("google_oauth_state");
      return response;
    }

    // 5. Buat Sesi Login Resmi INVORA
    const { token, kedaluwarsa } = await buatSesi(user.id);

    await catatAudit({
      entitas: "auth",
      entitasId: user.id,
      userId: user.id,
      perubahan: `Berhasil masuk menggunakan Google Workspace SSO: ${email}`,
    });

    const response = NextResponse.redirect(`${origin}/dashboard`);

    // Set cookie sesi resmi INVORA
    response.cookies.set("sesi_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      expires: kedaluwarsa,
    });

    // Bersihkan cookie state
    response.cookies.delete("google_oauth_state");

    return response;
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Terjadi kesalahan saat memproses login Google.";
    const response = NextResponse.redirect(`${origin}/?error=${encodeURIComponent(errorMsg)}`);
    response.cookies.delete("google_oauth_state");
    return response;
  }
}
