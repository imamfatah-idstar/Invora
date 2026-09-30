import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { wajibRoleApi } from "@/lib/require-role-api";
import { userSaatIni } from "@/lib/session-server";
import { catatAudit } from "@/lib/audit";
import { hashKataSandi } from "@/lib/auth";

const ROLE_VALID = ["admin", "petugas", "checker"];
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DOMAIN_DIIZINKAN = "idstar.group";

export async function POST(request: NextRequest) {
  const gagal = await wajibRoleApi(["admin"]);
  if (gagal) return gagal;
  const user = await userSaatIni();

  const body = await request.json().catch(() => null);
  if (!body?.nama || typeof body.nama !== "string" || !body.nama.trim()) {
    return NextResponse.json({ error: "Nama wajib diisi." }, { status: 400 });
  }
  if (!body?.email || typeof body.email !== "string" || !EMAIL_REGEX.test(body.email.trim())) {
    return NextResponse.json({ error: "Email tidak valid." }, { status: 400 });
  }
  if (!body.email.trim().toLowerCase().endsWith(`@${DOMAIN_DIIZINKAN}`)) {
    return NextResponse.json({ error: `Email harus memakai domain @${DOMAIN_DIIZINKAN}.` }, { status: 400 });
  }
  if (!ROLE_VALID.includes(body.role)) {
    return NextResponse.json({ error: "Peran tidak valid." }, { status: 400 });
  }
  if (!body?.kataSandi || typeof body.kataSandi !== "string" || body.kataSandi.length < 8) {
    return NextResponse.json({ error: "Kata sandi minimal 8 karakter." }, { status: 400 });
  }

  const email = body.email.trim().toLowerCase();
  const [sudahAda] = await db.select().from(users).where(eq(users.email, email));
  if (sudahAda) {
    return NextResponse.json({ error: "Email ini sudah terdaftar." }, { status: 409 });
  }

  const passwordHash = await hashKataSandi(body.kataSandi);
  const [row] = await db.insert(users).values({
    nama: body.nama.trim(),
    email,
    passwordHash,
    role: body.role,
  }).returning();

  await catatAudit({ entitas: "users", entitasId: row.id, perubahan: `Daftarkan akun "${row.email}" peran=${row.role}`, userId: user!.id });

  return NextResponse.json({ id: row.id, nama: row.nama, email: row.email, role: row.role }, { status: 201 });
}
