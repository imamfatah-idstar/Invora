import { redirect } from "next/navigation";
import { userSaatIni } from "@/lib/session-server";
import type { Role } from "@/lib/auth";

// Dipakai di awal setiap halaman/layout yang dibatasi role tertentu.
// Menolak DI SERVER sebelum konten dikirim ke browser.
export async function wajibRole(rolesDiizinkan: Role[]) {
  const user = await userSaatIni();
  if (!user) {
    redirect("/");
  }
  if (!rolesDiizinkan.includes(user.role as Role)) {
    redirect("/dashboard");
  }
  return user;
}
