import crypto from "crypto";

const RECAPTCHA_SECRET =
  process.env.RECAPTCHA_SECRET_KEY ||
  process.env.SESSION_SECRET ||
  "invora-idstar-recaptcha-anti-ddos-secret-2026";

const TOKEN_TTL_MS = 2 * 60 * 1000; // 2 menit (sesuai standar Google reCAPTCHA)

// Penyimpanan nonce sekali pakai (mencegah replay attack oleh bot DDoS)
const usedNonces = new Map<string, number>();

// Penyimpanan Rate Limiter per IP (Anti-DDoS & Brute-Force Protection)
type RateRecord = {
  requests: number[];
  failedLogins: number[];
  blockedUntil: number;
};
const ipRateMap = new Map<string, RateRecord>();

const DDOS_WINDOW_MS = 60 * 1000; // 1 menit
const DDOS_MAX_REQUESTS = 12; // Maks 12 request login per menit per IP
const BRUTE_WINDOW_MS = 5 * 60 * 1000; // 5 menit
const BRUTE_MAX_FAILS = 5; // Maks 5 kali salah password per 5 menit
const BLOCK_DURATION_MS = 60 * 1000; // Blokir sementara 60 detik jika terdeteksi banjir request

function cleanupMaps(now: number) {
  if (usedNonces.size > 2000) {
    for (const [nonce, exp] of usedNonces.entries()) {
      if (exp < now) usedNonces.delete(nonce);
    }
  }
  if (ipRateMap.size > 2000) {
    for (const [ip, rec] of ipRateMap.entries()) {
      if (rec.blockedUntil < now && rec.requests.length === 0 && rec.failedLogins.length === 0) {
        ipRateMap.delete(ip);
      }
    }
  }
}

export function getClientIp(headers: Headers): string {
  const xff = headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  const realIp = headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  return "127.0.0.1";
}

/**
 * Cek apakah IP pengirim terindikasi melakukan serangan DDoS / Brute-Force.
 */
export function checkDdosRateLimit(ip: string): {
  allowed: boolean;
  retryAfterSec?: number;
  reason?: string;
  requireExtraChallenge?: boolean;
} {
  const now = Date.now();
  cleanupMaps(now);

  let rec = ipRateMap.get(ip);
  if (!rec) {
    rec = { requests: [], failedLogins: [], blockedUntil: 0 };
    ipRateMap.set(ip, rec);
  }

  if (rec.blockedUntil > now) {
    const retryAfterSec = Math.ceil((rec.blockedUntil - now) / 1000);
    return {
      allowed: false,
      retryAfterSec,
      reason: `Terdeteksi aktivitas trafik tinggi (Anti-DDoS Protection). Silakan coba lagi dalam ${retryAfterSec} detik.`,
    };
  }

  rec.requests = rec.requests.filter((t) => now - t < DDOS_WINDOW_MS);
  rec.failedLogins = rec.failedLogins.filter((t) => now - t < BRUTE_WINDOW_MS);

  if (rec.requests.length >= DDOS_MAX_REQUESTS) {
    rec.blockedUntil = now + BLOCK_DURATION_MS;
    return {
      allowed: false,
      retryAfterSec: Math.ceil(BLOCK_DURATION_MS / 1000),
      reason: "Permintaan login terlalu cepat (DDoS Rate Limit Exceeded). Tunggu 60 detik.",
    };
  }

  if (rec.failedLogins.length >= BRUTE_MAX_FAILS) {
    rec.blockedUntil = now + BLOCK_DURATION_MS;
    return {
      allowed: false,
      retryAfterSec: Math.ceil(BLOCK_DURATION_MS / 1000),
      reason: "Terlalu banyak percobaan login gagal (Brute-Force Protection). Tunggu 60 detik.",
    };
  }

  rec.requests.push(now);

  return {
    allowed: true,
    requireExtraChallenge: rec.failedLogins.length >= 2 || rec.requests.length >= 5,
  };
}

export function recordFailedLogin(ip: string) {
  const now = Date.now();
  const rec = ipRateMap.get(ip) || { requests: [], failedLogins: [], blockedUntil: 0 };
  rec.failedLogins.push(now);
  ipRateMap.set(ip, rec);
}

export function clearFailedLogins(ip: string) {
  const rec = ipRateMap.get(ip);
  if (rec) {
    rec.failedLogins = [];
    rec.blockedUntil = 0;
  }
}

/**
 * Buat token reCAPTCHA bertanda tangan kriptografi HMAC-SHA256.
 */
export function issueRecaptchaToken(ip: string, userAgent: string): {
  token: string;
  expiresAt: number;
} {
  const now = Date.now();
  const expiresAt = now + TOKEN_TTL_MS;
  const nonce = crypto.randomBytes(12).toString("hex");
  const uaHash = crypto.createHash("sha256").update(userAgent || "unknown").digest("hex").slice(0, 12);
  const payload = `${nonce}.${expiresAt}.${ip}.${uaHash}`;
  const sig = crypto.createHmac("sha256", RECAPTCHA_SECRET).update(payload).digest("hex");
  return {
    token: `${payload}.${sig}`,
    expiresAt,
  };
}

/**
 * Verifikasi token reCAPTCHA (mendukung Google reCAPTCHA v2 API jika diset di ENV,
 * serta token kriptografi HMAC-SHA256 internal).
 */
export async function verifyRecaptchaToken(
  token: string | undefined | null,
  ip: string,
  userAgent: string
): Promise<{ valid: boolean; error?: string }> {
  if (!token || typeof token !== "string" || !token.trim()) {
    return {
      valid: false,
      error: "Silakan centang verifikasi keamanan reCAPTCHA ('Saya bukan robot') terlebih dahulu.",
    };
  }

  const trimmed = token.trim();

  // Jika menggunakan Google reCAPTCHA eksternal (bukan format internal 5 segmen)
  const parts = trimmed.split(".");
  if (parts.length !== 5 && process.env.RECAPTCHA_SECRET_KEY) {
    try {
      const form = new URLSearchParams();
      form.set("secret", process.env.RECAPTCHA_SECRET_KEY);
      form.set("response", trimmed);
      form.set("remoteip", ip);

      const res = await fetch("https://www.google.com/recaptcha/api/siteverify", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: form.toString(),
      });
      const data = await res.json();
      if (data.success) {
        return { valid: true };
      }
      return { valid: false, error: "Verifikasi Google reCAPTCHA tidak valid atau telah kedaluwarsa." };
    } catch {
      return { valid: false, error: "Gagal menghubungi server verifikasi reCAPTCHA." };
    }
  }

  if (parts.length !== 5) {
    return { valid: false, error: "Token keamanan reCAPTCHA tidak valid." };
  }

  const [nonce, expiresAtStr, tokenIp, tokenUaHash, sig] = parts;
  const expiresAt = Number(expiresAtStr);
  const now = Date.now();

  if (!nonce || isNaN(expiresAt) || now > expiresAt) {
    return {
      valid: false,
      error: "Sesi verifikasi reCAPTCHA telah kedaluwarsa. Silakan centang ulang 'Saya bukan robot'.",
    };
  }

  // Cek apakah nonce sudah pernah dipakai (Anti-Replay Attack)
  if (usedNonces.has(nonce)) {
    return {
      valid: false,
      error: "Token reCAPTCHA sudah digunakan. Silakan centang ulang verifikasi keamanan.",
    };
  }

  const expectedPayload = `${nonce}.${expiresAtStr}.${tokenIp}.${tokenUaHash}`;
  const expectedSig = crypto
    .createHmac("sha256", RECAPTCHA_SECRET)
    .update(expectedPayload)
    .digest("hex");

  const sigBuf = Buffer.from(sig);
  const expBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return { valid: false, error: "Tanda tangan kriptografi reCAPTCHA tidak valid." };
  }

  const currentUaHash = crypto
    .createHash("sha256")
    .update(userAgent || "unknown")
    .digest("hex")
    .slice(0, 12);
  if (tokenUaHash !== currentUaHash) {
    return { valid: false, error: "Identitas perangkat berubah. Silakan verifikasi ulang reCAPTCHA." };
  }

  // Tandai nonce sudah terpakai
  usedNonces.set(nonce, expiresAt);

  return { valid: true };
}
