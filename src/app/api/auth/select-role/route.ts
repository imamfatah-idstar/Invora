import { NextRequest, NextResponse } from "next/server";
import { userSaatIni } from "@/lib/session-server";
import { getAllUserRoles, Role } from "@/lib/user-roles";

export async function POST(request: NextRequest) {
  const user = await userSaatIni();
  if (!user) {
    return NextResponse.json({ error: "Sesi login tidak ditemukan." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const requestedRole = body?.role as Role | undefined;

  if (!requestedRole || !["admin", "petugas", "checker"].includes(requestedRole)) {
    return NextResponse.json({ error: "Role yang dipilih tidak valid." }, { status: 400 });
  }

  const allRoles = getAllUserRoles(user);
  if (!allRoles.includes(requestedRole)) {
    return NextResponse.json(
      { error: "Akun Anda tidak memiliki hak akses untuk role ini." },
      { status: 403 }
    );
  }

  const response = NextResponse.json({
    sukses: true,
    activeRole: requestedRole,
    redirectUrl: "/dashboard",
  });

  // Set cookie sesi_role untuk 12 jam
  response.cookies.set("sesi_role", requestedRole, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 12 * 60 * 60,
  });

  return response;
}

