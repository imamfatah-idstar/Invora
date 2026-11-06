import "dotenv/config";
import fs from "fs";
import path from "path";
import { db } from "../src/db";
import {
  users,
  sessions,
  personel,
  rateCard,
  userXl,
  po,
  poLineItem,
  pemetaanPersonelPo,
  kalenderKerja,
  pengajuan,
  pengajuanDetail,
  timesheet,
  konfirmasi,
  checkerReview,
  dokumen,
  lampiranPengajuan,
  grRequest,
  grRequestRiwayat,
  auditLog,
  pembayaran,
  reminderLog,
} from "../src/db/schema";

async function runBackup() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupDir = path.join(process.cwd(), "backups", `backup-${timestamp}`);

  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  console.log(`Starting backup of database to: ${backupDir}...`);

  const tables = {
    users,
    sessions,
    personel,
    rateCard,
    userXl,
    po,
    poLineItem,
    pemetaanPersonelPo,
    kalenderKerja,
    pengajuan,
    pengajuanDetail,
    timesheet,
    konfirmasi,
    checkerReview,
    dokumen,
    lampiranPengajuan,
    grRequest,
    grRequestRiwayat,
    auditLog,
    pembayaran,
    reminderLog,
  };

  const summary: Record<string, number> = {};
  const fullBackup: Record<string, unknown[]> = {};

  for (const [tableName, tableObj] of Object.entries(tables)) {
    try {
      const rows = await db.select().from(tableObj as never);
      summary[tableName] = rows.length;
      fullBackup[tableName] = rows;

      // Write individual table JSON
      fs.writeFileSync(
        path.join(backupDir, `${tableName}.json`),
        JSON.stringify(rows, null, 2),
        "utf-8"
      );
      console.log(`✓ Backed up ${tableName}: ${rows.length} rows`);
    } catch (err) {
      console.error(`✗ Error backing up ${tableName}:`, err);
      summary[tableName] = -1;
    }
  }

  // Write complete full dump
  fs.writeFileSync(
    path.join(backupDir, "all-data.json"),
    JSON.stringify(fullBackup, null, 2),
    "utf-8"
  );

  // Write metadata summary
  const metadata = {
    timestamp: new Date().toISOString(),
    backupDir,
    totalTables: Object.keys(tables).length,
    rowCounts: summary,
  };

  fs.writeFileSync(
    path.join(backupDir, "metadata.json"),
    JSON.stringify(metadata, null, 2),
    "utf-8"
  );

  // Also create a latest symlink or copy to backups/latest.json
  fs.writeFileSync(
    path.join(process.cwd(), "backups", "latest-all-data.json"),
    JSON.stringify(fullBackup, null, 2),
    "utf-8"
  );

  console.log("\n=================================");
  console.log("BACKUP COMPLETED SUCCESSFULLY!");
  console.log("Location:", backupDir);
  console.log("Summary:", summary);
  console.log("=================================");

  process.exit(0);
}

runBackup().catch((e) => {
  console.error("Backup failed:", e);
  process.exit(1);
});

