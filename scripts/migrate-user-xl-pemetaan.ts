import "dotenv/config";
import { db } from "../src/db";
import { sql } from "drizzle-orm";

async function main() {
  console.log("Migrating user_xl and pemetaan_personel_po tables...");
  
  await db.execute(sql`
    ALTER TABLE user_xl 
    ADD COLUMN IF NOT EXISTS po_id integer REFERENCES po(id);
  `);
  console.log("Added po_id to user_xl.");

  await db.execute(sql`
    ALTER TABLE pemetaan_personel_po 
    ADD COLUMN IF NOT EXISTS user_xl_id integer REFERENCES user_xl(id);
  `);
  console.log("Added user_xl_id to pemetaan_personel_po.");

  const colsUserXl = await db.execute(sql`
    SELECT column_name, data_type, column_default, is_nullable
    FROM information_schema.columns
    WHERE table_name = 'user_xl'
    ORDER BY ordinal_position
  `);
  console.log("user_xl columns:", colsUserXl);

  const colsPemetaan = await db.execute(sql`
    SELECT column_name, data_type, column_default, is_nullable
    FROM information_schema.columns
    WHERE table_name = 'pemetaan_personel_po'
    ORDER BY ordinal_position
  `);
  console.log("pemetaan_personel_po columns:", colsPemetaan);

  process.exit(0);
}

main().catch((e) => {
  console.error("Migration error:", e);
  process.exit(1);
});

