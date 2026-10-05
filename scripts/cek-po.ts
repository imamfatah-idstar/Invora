import "dotenv/config";
import { db } from "../src/db";
import { po, pemetaanPersonelPo, personel } from "../src/db/schema";

async function main() {
  const daftarPo = await db.select().from(po);
  console.log("=== Jumlah PO:", daftarPo.length, "===");
  for (const p of daftarPo.slice(0, 10)) {
    console.log(`nomorPo="${p.nomorPo}" klien="${p.klien}"`);
  }

  const daftarPemetaan = await db.select().from(pemetaanPersonelPo);
  console.log("\n=== Jumlah Pemetaan Personel-PO:", daftarPemetaan.length, "===");
  for (const pp of daftarPemetaan.slice(0, 10)) {
    console.log(JSON.stringify(pp));
  }

  const jumlahPersonel = (await db.select().from(personel)).length;
  console.log("\n=== Jumlah Personel:", jumlahPersonel, "===");

  process.exit(0);
}
main().catch((e) => { console.error("Gagal:", e); process.exit(1); });
