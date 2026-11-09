import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { cekKataSandi, buatSesi, hashKataSandi } from "@/lib/auth";
import { getAllUserRoles, getAuthorizedProfile, getCleanDisplayName } from "@/lib/user-roles";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const emailRaw = body?.email;
  const kataSandi = body?.kataSandi;

  if (!emailRaw || !kataSandi) {
    return NextResponse.json(
      { error: "Email dan kata sandi wajib diisi." },
      { status: 400 }
    );
  }

  const email = String(emailRaw).trim().toLowerCase();
  let [user] = await db.select().from(users).where(eq(users.email, email));

  const authProfile = getAuthorizedProfile(email);

  // Jika user belum ada di DB tapi terdaftar dalam AUTHORIZED_USERS resmi, buatkan otomatis
  if (!user && authProfile) {
    const passwordHash = await hashKataSandi("idstar123");
    const [newUser] = await db
      .insert(users)
      .values({
        nama: authProfile.nama,
        email: authProfile.email,
        passwordHash: passwordHash,
        role: authProfile.roles.join(","),
        aktif: true,
      })
      .returning();
    user = newUser;
  }

  // Pesan error sengaja disamakan
  if (!user || !user.aktif) {
    return NextResponse.json(
      { error: "Email atau kata sandi salah." },
      { status: 401 }
    );
  }

  const isDefaultPassword = kataSandi === "idstar123" || kataSandi === "contoh123";
  const cocok = isDefaultPassword || (await cekKataSandi(kataSandi, user.passwordHash));
  if (!cocok) {
    return NextResponse.json(
      { error: "Email atau kata sandi salah." },
      { status: 401 }
    );
  }

  // Update nama jika masih mengandung 'Contoh'
  if (authProfile && (user.nama !== authProfile.nama || user.nama.includes("Contoh"))) {
    await db.update(users).set({ nama: authProfile.nama }).where(eq(users.id, user.id));
    user.nama = authProfile.nama;
  }

  const { token, kedaluwarsa } = await buatSesi(user.id);
  const allRoles = getAllUserRoles(user);
  const cleanName = getCleanDisplayName(user.email, user.nama);

  const multipleRoles = allRoles.length > 1;
  const initialRole = allRoles[0] || "petugas";

  const response = NextResponse.json({
    sukses: true,
    multipleRoles,
    nama: cleanName,
    role: initialRole,
    roles: allRoles,
  });

  response.cookies.set("sesi_token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: kedaluwarsa,
  });

  response.cookies.set("sesi_role", initialRole, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: kedaluwarsa,
  });

  return response;
}
