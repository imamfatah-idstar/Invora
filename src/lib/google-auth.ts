import { randomBytes } from "crypto";

// Domain yang diizinkan untuk login ke INVORA
export const DOMAIN_DIIZINKAN = "idstar.group";

/**
 * Validasi apakah email berasal dari Google Workspace @idstar.group atau subdomain .idstar.group
 */
export function apakahEmailIdstarGroup(email: string | null | undefined): boolean {
  if (!email) return false;
  const cleanEmail = email.trim().toLowerCase();
  return (
    cleanEmail.endsWith(`@${DOMAIN_DIIZINKAN}`) ||
    cleanEmail.endsWith(`.${DOMAIN_DIIZINKAN}`)
  );
}

/**
 * Buat random CSRF state untuk keamanan OAuth flow
 */
export function buatOauthState(): string {
  return randomBytes(24).toString("hex");
}

/**
 * Mendapatkan URL otorisasi Google OAuth 2.0
 */
export function getGoogleOAuthUrl(redirectUri: string, state: string): string {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    throw new Error("GOOGLE_CLIENT_ID belum diatur di environment variables (.env).");
  }

  const rootUrl = "https://accounts.google.com/o/oauth2/v2/auth";
  const options = {
    redirect_uri: redirectUri,
    client_id: clientId,
    access_type: "offline",
    response_type: "code",
    prompt: "select_account",
    scope: [
      "https://www.googleapis.com/auth/userinfo.profile",
      "https://www.googleapis.com/auth/userinfo.email",
    ].join(" "),
    state,
    hd: DOMAIN_DIIZINKAN, // Google Workspace domain hint
  };

  const qs = new URLSearchParams(options);
  return `${rootUrl}?${qs.toString()}`;
}

export type GoogleTokenResponse = {
  access_token: string;
  expires_in: number;
  token_type: string;
  scope: string;
  id_token?: string;
  refresh_token?: string;
};

/**
 * Menukar authorization code dari Google menjadi access token
 */
export async function tukarGoogleCode(code: string, redirectUri: string): Promise<GoogleTokenResponse> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("GOOGLE_CLIENT_ID atau GOOGLE_CLIENT_SECRET belum diatur di .env.");
  }

  const values = {
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    grant_type: "authorization_code",
  };

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(values).toString(),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error_description || errorData.error || "Gagal menukar authorization code Google.");
  }

  return res.json();
}

export type GoogleUserProfile = {
  id: string;
  email: string;
  verified_email: boolean;
  name: string;
  given_name?: string;
  family_name?: string;
  picture?: string;
  hd?: string; // Hosted domain (mis. idstar.group)
};

/**
 * Mengambil profil pengguna Google menggunakan access token
 */
export async function ambilGoogleUserProfile(accessToken: string): Promise<GoogleUserProfile> {
  const res = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) {
    throw new Error("Gagal mengambil informasi profil akun Google.");
  }

  return res.json();
}
