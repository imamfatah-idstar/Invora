import "dotenv/config";
import { db } from "../src/db";
import { sql } from "drizzle-orm";

async function main() {
  console.log("Migrating dokumen table...");
  await db.execute(sql`
    ALTER TABLE dokumen 
    ADD COLUMN IF NOT EXISTS disetujui_oleh_user_id integer REFERENCES users(id),
    ADD COLUMN IF NOT EXISTS disetujui_pada text,
    ADD COLUMN IF NOT EXISTS catatan_checker text;
  `);

  const cols = await db.execute(sql`
    SELECT column_name, data_type, column_default, is_nullable
    FROM information_schema.columns
    WHERE table_name = 'dokumen'
    ORDER BY ordinal_position
  `);
  console.log("Columns after migration:", cols);
  process.exit(0);
}
main().catch((e) => {
  console.error("Migration error:", e);
  process.exit(1);
});
