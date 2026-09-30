import "dotenv/config";
import { defineConfig } from "drizzle-kit";

// Konfigurasi Drizzle: ke mana skema disimpan, ke mana migrasi ditulis,
// dan database mana yang dipakai. Sejak 17 September 2026: PostgreSQL
// (Supabase) — sebelumnya SQLite lokal untuk pengembangan awal.
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL belum diisi di .env.");
}

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
});
