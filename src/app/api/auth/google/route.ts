import { NextRequest, NextResponse } from "next/server";
import { buatOauthState, getGoogleOAuthUrl } from "@/lib/google-auth";

export async function GET(request: NextRequest) {
  const origin = request.nextUrl.origin;
  const redirectUri = `${origin}/api/auth/google/callback`;

  // Cek apakah Google Client ID & Secret sudah terpasang
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    const errorMsg = encodeURIComponent(
      "Fitur Login Google memerlukan konfigurasi GOOGLE_CLIENT_ID dan GOOGLE_CLIENT_SECRET di file .env / Vercel Environment Variables."
    );
    return NextResponse.redirect(`${origin}/?error=${errorMsg}`);
  }

  try {
    const state = buatOauthState();
    const googleAuthUrl = getGoogleOAuthUrl(redirectUri, state);

    const response = NextResponse.redirect(googleAuthUrl);

    // Simpan CSRF state di cookie terenkripsi/httpOnly selama 10 menit
    response.cookies.set("google_oauth_state", state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 10, // 10 menit
    });

    return response;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal menginisialisasi Google OAuth.";
    return NextResponse.redirect(`${origin}/?error=${encodeURIComponent(message)}`);
  }
}
