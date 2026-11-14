// Official Google reCAPTCHA v2 Keys (uses ENV if configured, falls back to Google's official standard v2 key)
export const GOOGLE_RECAPTCHA_SITE_KEY =
  process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY ||
  "6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI";

const GOOGLE_RECAPTCHA_SECRET_KEY =
  process.env.RECAPTCHA_SECRET_KEY ||
  "6LeIxAcTAAAAAGG-vFI1TnRWxMZNFuojJ4WifJWe";

// IP Rate Limiter Store (Anti-DDoS & Brute-Force Protection)
type RateRecord = {
  requests: number[];
  failedLogins: number[];
  blockedUntil: number;
};
const ipRateMap = new Map<string, RateRecord>();

const DDOS_WINDOW_MS = 60 * 1000; // 1 minute
const DDOS_MAX_REQUESTS = 12; // Max 12 login requests per minute per IP
const BRUTE_WINDOW_MS = 5 * 60 * 1000; // 5 minutes
const BRUTE_MAX_FAILS = 5; // Max 5 failed password attempts per 5 minutes
const BLOCK_DURATION_MS = 60 * 1000; // Temporary 60s block when rate limit exceeded

function cleanupMaps(now: number) {
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
 * Checks whether the client IP is exceeding DDoS or Brute-Force rate limits.
 */
export function checkDdosRateLimit(ip: string): {
  allowed: boolean;
  retryAfterSec?: number;
  reason?: string;
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
      reason: `High traffic detected (Anti-DDoS Protection). Please try again in ${retryAfterSec} seconds.`,
    };
  }

  rec.requests = rec.requests.filter((t) => now - t < DDOS_WINDOW_MS);
  rec.failedLogins = rec.failedLogins.filter((t) => now - t < BRUTE_WINDOW_MS);

  if (rec.requests.length >= DDOS_MAX_REQUESTS) {
    rec.blockedUntil = now + BLOCK_DURATION_MS;
    return {
      allowed: false,
      retryAfterSec: Math.ceil(BLOCK_DURATION_MS / 1000),
      reason: "Too many login requests (DDoS Rate Limit Exceeded). Please wait 60 seconds.",
    };
  }

  if (rec.failedLogins.length >= BRUTE_MAX_FAILS) {
    rec.blockedUntil = now + BLOCK_DURATION_MS;
    return {
      allowed: false,
      retryAfterSec: Math.ceil(BLOCK_DURATION_MS / 1000),
      reason: "Too many failed login attempts (Brute-Force Protection). Please wait 60 seconds.",
    };
  }

  rec.requests.push(now);

  return { allowed: true };
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
 * Verifies the official Google reCAPTCHA v2 token via https://www.google.com/recaptcha/api/siteverify
 */
export async function verifyRecaptchaToken(
  token: string | undefined | null,
  ip: string
): Promise<{ valid: boolean; error?: string }> {
  if (!token || typeof token !== "string" || !token.trim()) {
    return {
      valid: false,
      error: "Please complete the Google reCAPTCHA verification ('I'm not a robot') before signing in.",
    };
  }

  try {
    const form = new URLSearchParams();
    form.set("secret", GOOGLE_RECAPTCHA_SECRET_KEY);
    form.set("response", token.trim());
    if (ip && ip !== "127.0.0.1") {
      form.set("remoteip", ip);
    }

    const res = await fetch("https://www.google.com/recaptcha/api/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form.toString(),
    });

    const data = await res.json();
    if (data.success) {
      return { valid: true };
    }

    return {
      valid: false,
      error: "Google reCAPTCHA verification failed or expired. Please check 'I'm not a robot' again.",
    };
  } catch {
    return {
      valid: false,
      error: "Unable to reach Google reCAPTCHA verification server. Please try again.",
    };
  }
}
