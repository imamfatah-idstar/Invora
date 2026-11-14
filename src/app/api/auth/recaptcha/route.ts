import { NextRequest, NextResponse } from "next/server";
import { checkDdosRateLimit, getClientIp, GOOGLE_RECAPTCHA_SITE_KEY } from "@/lib/recaptcha";

export async function GET(request: NextRequest) {
  const ip = getClientIp(request.headers);
  const rate = checkDdosRateLimit(ip);
  if (!rate.allowed) {
    return NextResponse.json(
      { error: rate.reason || "Too many requests. Please try again later." },
      { status: 429 }
    );
  }
  return NextResponse.json({ ok: true, siteKey: GOOGLE_RECAPTCHA_SITE_KEY });
}
