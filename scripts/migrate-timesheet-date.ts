import "dotenv/config";
import { db } from "../src/db";
import { sql } from "drizzle-orm";

async function main() {
  console.log("Migrating timesheet table for tanggal_timesheet...");
  await db.execute(sql`
    ALTER TABLE timesheet 
    ADD COLUMN IF NOT EXISTS tanggal_timesheet text;
  `);
  console.log("Added tanggal_timesheet to timesheet.");

  const cols = await db.execute(sql`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_name = 'timesheet'
    ORDER BY ordinal_position
  `);
  console.log("timesheet columns:", cols);
  process.exit(0);
}

main().catch((e) => {
  console.error("Migration error:", e);
  process.exit(1);
});
