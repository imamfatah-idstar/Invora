import "dotenv/config";
import postgres from "postgres";

async function main() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error("DATABASE_URL tidak ditemukan di .env");
    process.exit(1);
  }

  const sql = postgres(dbUrl, { prepare: false, max: 1 });

  console.log("Menjalankan migrasi pembuatan tabel reminder_log...");

  await sql`
    CREATE TABLE IF NOT EXISTS reminder_log (
      id SERIAL PRIMARY KEY,
      pengajuan_id INTEGER NOT NULL REFERENCES pengajuan(id) ON DELETE CASCADE,
      tipe_reminder TEXT NOT NULL,
      email_penerima TEXT NOT NULL,
      nama_pic_penerima TEXT,
      subjek TEXT NOT NULL,
      pesan_teks TEXT NOT NULL,
      metode TEXT NOT NULL DEFAULT 'mailto',
      status_kirim TEXT NOT NULL DEFAULT 'berhasil',
      dikirim_oleh_user_id INTEGER NOT NULL REFERENCES users(id),
      dikirim_pada TEXT NOT NULL DEFAULT now()::text
    );
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS idx_reminder_log_pengajuan_id ON reminder_log(pengajuan_id);
  `;

  console.log("✓ Tabel reminder_log berhasil dibuat dengan indeks!");
  await sql.end();
  process.exit(0);
}

main().catch((err) => {
  console.error("Gagal migrasi:", err);
  process.exit(1);
});
