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
  let selectedRoles: string[] = [];
  if (Array.isArray(body?.roles) && body.roles.length > 0) {
    selectedRoles = body.roles.filter((r: unknown) => typeof r === "string" && ROLE_VALID.includes(r));
  } else if (typeof body?.role === "string" && body.role.trim()) {
    selectedRoles = body.role
      .split(",")
      .map((r: string) => r.trim())
      .filter((r: string) => ROLE_VALID.includes(r));
  }

  if (selectedRoles.length === 0) {
    return NextResponse.json({ error: "Minimal satu peran (role) harus dipilih." }, { status: 400 });
  }

  const roleValue = Array.from(new Set(selectedRoles)).join(",");
  const statusAktif = typeof body?.aktif === "boolean" ? body.aktif : true;

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
    role: roleValue,
    aktif: statusAktif,
  }).returning();

  await catatAudit({ entitas: "users", entitasId: row.id, perubahan: `Daftarkan akun "${row.email}" peran=${row.role} aktif=${row.aktif}`, userId: user!.id });

  return NextResponse.json({ id: row.id, nama: row.nama, email: row.email, role: row.role, aktif: row.aktif }, { status: 201 });
}
