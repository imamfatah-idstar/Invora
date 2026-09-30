import { NextRequest, NextResponse } from "next/server";
import { hapusSesi } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const token = request.cookies.get("sesi_token")?.value;
  await hapusSesi(token);

  const response = NextResponse.json({ ok: true });
  response.cookies.delete("sesi_token");
  return response;
}
