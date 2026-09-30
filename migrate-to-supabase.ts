import "dotenv/config";
import Database from "better-sqlite3";
import postgres from "postgres";

// Migrasi data dari dev.db (SQLite lokal) ke Supabase (PostgreSQL).
// Urutan tabel WAJIB mengikuti urutan ini (dependensi foreign key).
// Tabel "sessions" SENGAJA dilewati — token sesi lama tidak relevan lagi,
// semua akun tinggal login ulang di database baru.
const URUTAN_TABEL = [
  "users",
  "personel",
  "rate_card",
  "user_xl",
  "po",
  "pemetaan_personel_po",
  "kalender_kerja",
  "pengajuan",
  "pengajuan_detail",
  "timesheet",
  "konfirmasi",
  "checker_review",
  "dokumen",
  "audit_log",
];

const KOLOM_BOOLEAN: Record<string, string[]> = {
  users: ["aktif"],
};

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL belum diisi di .env.");
  }

  const sqlite = new Database("dev.db");
  const sql = postgres(process.env.DATABASE_URL, { prepare: false });

  try {
    for (const tabel of URUTAN_TABEL) {
      const baris = sqlite.prepare(`SELECT * FROM ${tabel}`).all() as Record<string, unknown>[];
      if (baris.length === 0) {
        console.log(`${tabel}: kosong, dilewati`);
        continue;
      }

      const kolomBoolean = KOLOM_BOOLEAN[tabel] ?? [];
      const barisSiap = baris.map((b) => {
        const hasil = { ...b };
        for (const k of kolomBoolean) {
          if (k in hasil) hasil[k] = Boolean(hasil[k]);
        }
        return hasil;
      });

      // Hapus dulu isi tabel tujuan (idempotent — aman dijalankan ulang saat
      // masih tahap uji coba), baru insert data dari SQLite.
      await sql`DELETE FROM ${sql(tabel)}`;
      await sql`INSERT INTO ${sql(tabel)} ${sql(barisSiap)}`;
      console.log(`${tabel}: ${barisSiap.length} baris dipindah`);

      // Set ulang sequence kolom id (serial) supaya insert berikutnya dari
      // aplikasi lanjut dari id tertinggi, bukan mulai dari 1 lagi.
      const punyaId = baris[0] && "id" in baris[0];
      if (punyaId) {
        await sql`SELECT setval(pg_get_serial_sequence(${tabel}, 'id'), COALESCE((SELECT MAX(id) FROM ${sql(tabel)}), 1))`;
      }
    }
    console.log("\nMigrasi selesai.");
  } finally {
    sqlite.close();
    await sql.end();
  }
}

main().catch((err) => {
  console.error("GAGAL:", err);
  process.exit(1);
});
