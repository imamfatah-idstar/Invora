import { NextResponse } from "next/server";
import { userSaatIni } from "@/lib/session-server";
import type { Role } from "@/lib/auth";
import { isAuthorizedForRole } from "@/lib/user-roles";

// Versi untuk API route: mengembalikan NextResponse error kalau tidak lolos,
// atau null kalau boleh lanjut. Dipakai di awal setiap handler API yang
// membatasi role tertentu.
export async function wajibRoleApi(rolesDiizinkan: Role[]): Promise<NextResponse | null> {
  const user = await userSaatIni();
  if (!user) {
    return NextResponse.json({ error: "Belum login." }, { status: 401 });
  }
  const allowed = rolesDiizinkan.includes(user.role as Role);
  if (!allowed) {
    return NextResponse.json({ error: "Tidak berwenang untuk aksi ini." }, { status: 403 });
  }
  return null;
}
