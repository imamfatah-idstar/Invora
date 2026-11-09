import { redirect } from "next/navigation";
import { userSaatIni } from "@/lib/session-server";
import PilihRoleClient from "./pilih-role-client";

export const metadata = {
  title: "Pilih Role — INVORA IDStar",
  description: "Pilih peran aktif untuk sesi login Anda",
};

export default async function PilihRolePage() {
  const user = await userSaatIni();

  if (!user) {
    redirect("/");
  }

  // Jika user hanya punya 1 role, tidak perlu pilih
  if (!user.roles || user.roles.length <= 1) {
    redirect("/dashboard");
  }

  return (
    <PilihRoleClient
      nama={user.nama}
      email={user.email}
      currentRole={user.role}
      roles={user.roles}
    />
  );
}

