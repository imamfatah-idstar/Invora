import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { cekKataSandi, buatSesi } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const email = body?.email;
  const kataSandi = body?.kataSandi;

  if (!email || !kataSandi) {
    return NextResponse.json(
      { error: "Email dan kata sandi wajib diisi." },
      { status: 400 }
    );
  }

  const [user] = await db.select().from(users).where(eq(users.email, email));

  // Pesan error sengaja disamakan (email tidak ada vs kata sandi salah)
  // agar tidak membocorkan email mana yang terdaftar.
  if (!user || !user.aktif) {
    return NextResponse.json(
      { error: "Email atau kata sandi salah." },
      { status: 401 }
    );
  }

  const cocok = await cekKataSandi(kataSandi, user.passwordHash);
  if (!cocok) {
    return NextResponse.json(
      { error: "Email atau kata sandi salah." },
      { status: 401 }
    );
  }

  const { token, kedaluwarsa } = await buatSesi(user.id);

  const response = NextResponse.json({
    nama: user.nama,
    role: user.role,
  });
  response.cookies.set("sesi_token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: kedaluwarsa,
  });
  return response;
}
