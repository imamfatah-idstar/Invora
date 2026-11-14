import { NextRequest, NextResponse } from "next/server";
import { checkDdosRateLimit, getClientIp, issueRecaptchaToken } from "@/lib/recaptcha";

export async function POST(request: NextRequest) {
  const ip = getClientIp(request.headers);
  const userAgent = request.headers.get("user-agent") || "unknown";

  const rate = checkDdosRateLimit(ip);
  if (!rate.allowed) {
    return NextResponse.json(
      { error: rate.reason || "Terlalu banyak permintaan. Coba lagi nanti." },
      {
        status: 429,
        headers: rate.retryAfterSec ? { "Retry-After": String(rate.retryAfterSec) } : undefined,
      }
    );
  }

  const body = await request.json().catch(() => ({}));
  // Honeypot anti-bot check
  if (body?.honeypot) {
    return NextResponse.json({ error: "Akses bot terdeteksi." }, { status: 403 });
  }

  const { token, expiresAt } = issueRecaptchaToken(ip, userAgent);

  return NextResponse.json({
    ok: true,
    token,
    expiresAt,
    requireExtraChallenge: Boolean(rate.requireExtraChallenge),
  });
}
