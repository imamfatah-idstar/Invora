import { cookies } from "next/headers";
import { ambilUserDariSesi } from "@/lib/auth";

// Dipakai di server component/page untuk tahu siapa yang sedang login.
// Mengembalikan null kalau belum login atau sesi kedaluwarsa.
export async function userSaatIni() {
  const cookieStore = await cookies();
  const token = cookieStore.get("sesi_token")?.value;
  return ambilUserDariSesi(token);
}
