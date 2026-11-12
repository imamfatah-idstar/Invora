import "dotenv/config";
import { db } from "../src/db";
import { sql } from "drizzle-orm";

async function main() {
  console.log("Migrating personel table to add nik, tipe, posisi, nomor_spk columns...");

  await db.execute(sql`
    ALTER TABLE personel
    ADD COLUMN IF NOT EXISTS nik text,
    ADD COLUMN IF NOT EXISTS tipe text,
    ADD COLUMN IF NOT EXISTS posisi text,
    ADD COLUMN IF NOT EXISTS nomor_spk text;
  `);

  console.log("✓ Columns added to personel table.");

  const cols = await db.execute(sql`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_name = 'personel'
    ORDER BY ordinal_position
  `);
  console.log("personel columns:", cols);

  process.exit(0);
}

main().catch((e) => {
  console.error("Migration error:", e);
  process.exit(1);
});

