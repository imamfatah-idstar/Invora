import { db } from "./index";
import { users } from "./schema";
import { hashKataSandi } from "@/lib/auth";

// Akun CONTOH untuk uji coba login — bukan akun produksi.
// Kata sandi contoh: "contoh123" untuk ketiganya.
async function main() {
  const kataSandiHash = await hashKataSandi("contoh123");

  const daftarAkunContoh = [
    { nama: "Admin Contoh", email: "admin@contoh.local", role: "admin" as const },
    { nama: "Petugas Contoh", email: "petugas@contoh.local", role: "petugas" as const },
    { nama: "Checker Contoh", email: "checker@contoh.local", role: "checker" as const },
  ];

  for (const akun of daftarAkunContoh) {
    await db.insert(users).values({
      nama: akun.nama,
      email: akun.email,
      passwordHash: kataSandiHash,
      role: akun.role,
    });
    console.log(`Dibuat: ${akun.email} (role: ${akun.role})`);
  }
}

main().then(() => {
  console.log("\nSelesai. Kata sandi untuk semua akun contoh: contoh123");
  process.exit(0);
}).catch((err) => {
  console.error("GAGAL:", err.message);
  process.exit(1);
});
