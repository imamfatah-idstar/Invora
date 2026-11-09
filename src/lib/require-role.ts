import { redirect } from "next/navigation";
import { userSaatIni } from "@/lib/session-server";
import type { Role } from "@/lib/auth";
import { isAuthorizedForRole } from "@/lib/user-roles";

// Dipakai di awal setiap halaman/layout yang dibatasi role tertentu.
// Menolak DI SERVER sebelum konten dikirim ke browser.
export async function wajibRole(rolesDiizinkan: Role[]) {
  const user = await userSaatIni();
  if (!user) {
    redirect("/");
  }
  const allowed = rolesDiizinkan.includes(user.role as Role);
  if (!allowed) {
    redirect("/dashboard");
  }
  return user;
}
