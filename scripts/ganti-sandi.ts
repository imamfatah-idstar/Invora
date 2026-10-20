import "dotenv/config";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "../src/db";
import { users, sessions } from "../src/db/schema";

// Ganti kata sandi akun Invora lewat terminal.
// Cara pakai (dari folder proyek):  npx tsx scripts/ganti-sandi.ts
// Kata sandi diketik tersembunyi, tidak disimpan di file mana pun — hanya
// hash-nya yang masuk database. Sesi login akun tersebut ikut dihapus.

const PANJANG_MINIMAL = 10;

function tanya(pertanyaan: string, tersembunyi = false): Promise<string> {
  return new Promise((resolve) => {
    const stdin = process.stdin;
    process.stdout.write(pertanyaan);

    if (!tersembunyi || !stdin.isTTY) {
      stdin.resume();
      stdin.setEncoding("utf8");
      stdin.once("data", (d) => {
        stdin.pause();
        resolve(String(d).replace(/\r?\n$/, ""));
      });
      return;
    }

    // Mode tersembunyi: baca per tombol, jangan tampilkan apa pun.
    let isi = "";
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding("utf8");
    const saatTombol = (tombol: string) => {
      for (const ch of tombol) {
        if (ch === "\r" || ch === "\n") {
          stdin.setRawMode(false);
          stdin.pause();
          stdin.removeListener("data", saatTombol);
          process.stdout.write("\n");
          resolve(isi);
          return;
        }
        if (ch === "\u0003") { // Ctrl+C
          stdin.setRawMode(false);
          process.stdout.write("\nDibatalkan.\n");
          process.exit(1);
        }
        if (ch === "\u007f" || ch === "\b") isi = isi.slice(0, -1);
        else isi += ch;
      }
    };
    stdin.on("data", saatTombol);
  });
}

async function gantiSatuAkun(user: { id: number; email: string }) {
  console.log(`\n--- ${user.email} ---`);
  const baru = await tanya(`Kata sandi baru (min. ${PANJANG_MINIMAL} karakter, tidak tampil saat diketik): `, true);
  if (baru.length < PANJANG_MINIMAL) {
    console.log(`DILEWATI: kurang dari ${PANJANG_MINIMAL} karakter. Kata sandi TIDAK diubah.`);
    return false;
  }
  const ulang = await tanya("Ketik ulang: ", true);
  if (baru !== ulang) {
    console.log("DILEWATI: dua ketikan tidak sama. Kata sandi TIDAK diubah.");
    return false;
  }

  const hash = await bcrypt.hash(baru, 10);
  await db.update(users).set({ passwordHash: hash }).where(eq(users.id, user.id));
  await db.delete(sessions).where(eq(sessions.userId, user.id));
  console.log("BERHASIL: kata sandi diganti, sesi login lama dihapus.");
  return true;
}

async function main() {
  const daftar = await db
    .select({ id: users.id, email: users.email, role: users.role, aktif: users.aktif })
    .from(users)
    .orderBy(users.id);

  if (daftar.length === 0) {
    console.log("Tidak ada akun di tabel users.");
    process.exit(0);
  }

  console.log("Akun yang ada:");
  for (const u of daftar) {
    console.log(`  - ${u.email}  (role: ${u.role}${u.aktif ? "" : ", NONAKTIF"})`);
  }

  const pilihan = (await tanya('\nKetik email akun yang mau diganti, atau "semua": ')).trim().toLowerCase();
  const target = pilihan === "semua" ? daftar : daftar.filter((u) => u.email.toLowerCase() === pilihan);

  if (target.length === 0) {
    console.log(`Tidak ada akun dengan email "${pilihan}". Tidak ada yang diubah.`);
    process.exit(1);
  }

  let berhasil = 0;
  for (const u of target) {
    if (await gantiSatuAkun(u)) berhasil++;
  }

  console.log(`\nSelesai: ${berhasil} dari ${target.length} akun diganti.`);
  process.exit(berhasil === target.length ? 0 : 1);
}

main().catch((e) => {
  console.error("GAGAL:", e instanceof Error ? e.message : e);
  process.exit(1);
});
