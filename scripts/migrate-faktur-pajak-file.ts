import "dotenv/config";
import { db } from "../src/db";
import { sql } from "drizzle-orm";

async function main() {
  console.log("Migrating pengajuan table for faktur pajak file...");
  await db.execute(sql`
    ALTER TABLE pengajuan 
    ADD COLUMN IF NOT EXISTS nama_file_faktur_pajak text,
    ADD COLUMN IF NOT EXISTS path_file_faktur_pajak text;
  `);
  console.log("Added nama_file_faktur_pajak & path_file_faktur_pajak to pengajuan.");

  const cols = await db.execute(sql`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_name = 'pengajuan' AND column_name LIKE '%faktur%'
    ORDER BY ordinal_position
  `);
  console.log("pengajuan faktur columns:", cols);
  process.exit(0);
}

main().catch((e) => {
  console.error("Migration error:", e);
  process.exit(1);
});

