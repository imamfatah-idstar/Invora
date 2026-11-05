import "dotenv/config";
import fs from "fs";
import path from "path";
import { db } from "../src/db";
import {
  users,
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

async function runRestore() {
  const targetDir = process.argv[2] || path.join(process.cwd(), "backups", "latest-all-data.json");
  console.log(`Restoring database from: ${targetDir}...`);

  let backupData: Record<string, any[]>;
  if (targetDir.endsWith(".json")) {
    backupData = JSON.parse(fs.readFileSync(targetDir, "utf-8"));
  } else {
    const allDataPath = path.join(targetDir, "all-data.json");
    backupData = JSON.parse(fs.readFileSync(allDataPath, "utf-8"));
  }

  // Restore order (parent first)
  const insertOrder = [
    { name: "users", table: users },
    { name: "userXl", table: userXl },
    { name: "kalenderKerja", table: kalenderKerja },
    { name: "personel", table: personel },
    { name: "rateCard", table: rateCard },
    { name: "po", table: po },
    { name: "poLineItem", table: poLineItem },
    { name: "pemetaanPersonelPo", table: pemetaanPersonelPo },
    { name: "pengajuan", table: pengajuan },
    { name: "pengajuanDetail", table: pengajuanDetail },
    { name: "timesheet", table: timesheet },
    { name: "konfirmasi", table: konfirmasi },
    { name: "checkerReview", table: checkerReview },
    { name: "dokumen", table: dokumen },
    { name: "lampiranPengajuan", table: lampiranPengajuan },
    { name: "grRequest", table: grRequest },
    { name: "grRequestRiwayat", table: grRequestRiwayat },
    { name: "auditLog", table: auditLog },
    { name: "pembayaran", table: pembayaran },
    { name: "reminderLog", table: reminderLog },
  ];

  for (const item of insertOrder) {
    const rows = backupData[item.name];
    if (rows && rows.length > 0) {
      try {
        await db.insert(item.table as any).values(rows).onConflictDoNothing();
        console.log(`✓ Restored ${item.name}: ${rows.length} rows`);
      } catch (err) {
        console.error(`✗ Error restoring ${item.name}:`, err);
      }
    }
  }

  console.log("\nRestore process completed!");
  process.exit(0);
}

runRestore().catch((e) => {
  console.error("Restore failed:", e);
  process.exit(1);
});
