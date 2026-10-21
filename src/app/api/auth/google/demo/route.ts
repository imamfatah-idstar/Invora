import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { apakahEmailIdstarGroup, DOMAIN_DIIZINKAN } from "@/lib/google-auth";
import { buatSesi, hashKataSandi } from "@/lib/auth";
import { catatAudit } from "@/lib/audit";
import { randomBytes } from "crypto";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const nama = typeof body?.nama === "string" ? body.nama.trim() : "";

  if (!email) {
    return NextResponse.json({ error: "Email akun Google wajib diisi." }, { status: 400 });
  }

  // Validasi ketat domain @idstar.group
  if (!apakahEmailIdstarGroup(email)) {
    return NextResponse.json(
      {
        error: `Akses ditolak: Akun "${email}" bukan email resmi IDStar Group. Hanya akun berakhiran @${DOMAIN_DIIZINKAN} yang diizinkan masuk ke INVORA.`,
      },
      { status: 403 }
    );
  }

  let [user] = await db.select().from(users).where(eq(users.email, email));

  if (!user) {
    const randomPassword = randomBytes(16).toString("hex");
    const passwordHash = await hashKataSandi(randomPassword);

    const [newUser] = await db
      .insert(users)
      .values({
        nama: nama || email.split("@")[0].replace(".", " ").toUpperCase(),
        email: email,
        passwordHash: passwordHash,
        role: "petugas",
        aktif: true,
      })
      .returning();

    user = newUser;

    await catatAudit({
      entitas: "users",
      entitasId: user.id,
      userId: user.id,
      perubahan: `Pendaftaran otomatis akun IDStar baru: ${email} (role: petugas)`,
    });
  }

  if (!user.aktif) {
    return NextResponse.json({ error: "Akun Anda sedang dinonaktifkan oleh Administrator." }, { status: 403 });
  }

  const { token, kedaluwarsa } = await buatSesi(user.id);

  const response = NextResponse.json({
    ok: true,
    nama: user.nama,
    role: user.role,
    email: user.email,
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
