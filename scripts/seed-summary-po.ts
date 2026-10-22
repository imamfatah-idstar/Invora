import "dotenv/config";
import { db } from "../src/db";
import { po, poLineItem } from "../src/db/schema";
import { eq } from "drizzle-orm";
import Decimal from "decimal.js";

interface LineItemData {
  nomorLine: number;
  shortText: string;
  qty: number;
  hargaSatuan: string;
}

interface PoData {
  nomorPo: string;
  namaProyek: string;
  tahun: number;
  nilaiItem: string;
  saldoSebelumPpn: string;
  nilaiGr: string;
  klien: string;
  jenisTagihan: "bulanan" | "tahap";
  statusPo: "aktif" | "selesai";
  tanggalPo: string;
  lines: LineItemData[];
}

const daftarPo2025: PoData[] = [
  {
    nomorPo: "PO-XL-2025-0199",
    namaProyek: "Digital Customer Touchpoint & MyXL Revamp 2025",
    tahun: 2025,
    nilaiItem: "650000000.00",
    saldoSebelumPpn: "0.00",
    nilaiGr: "650000000.00",
    klien: "PT XL Axiata Tbk",
    jenisTagihan: "bulanan",
    statusPo: "selesai",
    tanggalPo: "2025-01-15",
    lines: [
      { nomorLine: 1, shortText: "SVC | FullStack Specialist (XL)", qty: 12, hargaSatuan: "28500000.00" },
      { nomorLine: 2, shortText: "SVC | Cloud DevOps Lead", qty: 12, hargaSatuan: "25666666.67" },
    ],
  },
  {
    nomorPo: "PO-XL-2025-0310",
    namaProyek: "Enterprise Data Lake & Analytics Platform 2025",
    tahun: 2025,
    nilaiItem: "480000000.00",
    saldoSebelumPpn: "0.00",
    nilaiGr: "480000000.00",
    klien: "PT XL Axiata Tbk",
    jenisTagihan: "bulanan",
    statusPo: "selesai",
    tanggalPo: "2025-02-10",
    lines: [
      { nomorLine: 1, shortText: "SVC | Big Data Pipeline Engineer", qty: 12, hargaSatuan: "40000000.00" },
    ],
  },
  {
    nomorPo: "PO-BM-2025-KOPRA-08",
    namaProyek: "Wholesale Banking Kopra Cash Management 2025",
    tahun: 2025,
    nilaiItem: "960000000.00",
    saldoSebelumPpn: "0.00",
    nilaiGr: "960000000.00",
    klien: "PT Bank Mandiri (Persero) Tbk",
    jenisTagihan: "bulanan",
    statusPo: "selesai",
    tanggalPo: "2025-01-20",
    lines: [
      { nomorLine: 1, shortText: "SVC | Core Banking Senior Backend", qty: 12, hargaSatuan: "45000000.00" },
      { nomorLine: 2, shortText: "SVC | Financial Solution Architect", qty: 12, hargaSatuan: "35000000.00" },
    ],
  },
  {
    nomorPo: "PO-BCA-2025-API-01",
    namaProyek: "myBCA Open Banking API Gateway Security",
    tahun: 2025,
    nilaiItem: "720000000.00",
    saldoSebelumPpn: "0.00",
    nilaiGr: "720000000.00",
    klien: "PT Bank Central Asia Tbk",
    jenisTagihan: "tahap",
    statusPo: "selesai",
    tanggalPo: "2025-03-05",
    lines: [
      { nomorLine: 1, shortText: "SVC | API Gateway Security Hardening", qty: 1, hargaSatuan: "720000000.00" },
    ],
  },
  {
    nomorPo: "PO-TSEL-2025-BSS-09",
    namaProyek: "BSS & Revenue Assurance Architecture 2025",
    tahun: 2025,
    nilaiItem: "840000000.00",
    saldoSebelumPpn: "70000000.00",
    nilaiGr: "770000000.00",
    klien: "PT Telekomunikasi Selular",
    jenisTagihan: "bulanan",
    statusPo: "aktif",
    tanggalPo: "2025-04-12",
    lines: [
      { nomorLine: 1, shortText: "SVC | Lead Telecom System Architect", qty: 12, hargaSatuan: "40000000.00" },
      { nomorLine: 2, shortText: "SVC | Mobile Engineering Specialist", qty: 12, hargaSatuan: "30000000.00" },
    ],
  },
  {
    nomorPo: "PO-ASTRA-2025-DMS-04",
    namaProyek: "Dealer Management Cloud Platform 2025",
    tahun: 2025,
    nilaiItem: "540000000.00",
    saldoSebelumPpn: "0.00",
    nilaiGr: "540000000.00",
    klien: "PT Astra International Tbk",
    jenisTagihan: "bulanan",
    statusPo: "selesai",
    tanggalPo: "2025-02-18",
    lines: [
      { nomorLine: 1, shortText: "SVC | Fullstack ERP Engineer", qty: 12, hargaSatuan: "25000000.00" },
      { nomorLine: 2, shortText: "SVC | Cloud Infrastructure Lead", qty: 12, hargaSatuan: "20000000.00" },
    ],
  },
  {
    nomorPo: "PO-CIMB-2025-OCTO-06",
    namaProyek: "OCTO Mobile Security & Transaction Engine 2025",
    tahun: 2025,
    nilaiItem: "600000000.00",
    saldoSebelumPpn: "0.00",
    nilaiGr: "600000000.00",
    klien: "PT Bank CIMB Niaga Tbk",
    jenisTagihan: "bulanan",
    statusPo: "selesai",
    tanggalPo: "2025-05-10",
    lines: [
      { nomorLine: 1, shortText: "SVC | Principal Mobile Security Analyst", qty: 12, hargaSatuan: "50000000.00" },
    ],
  },
  {
    nomorPo: "PO-ISAT-2025-CRM-03",
    namaProyek: "Customer Lifecycle & Churn Prediction ML 2025",
    tahun: 2025,
    nilaiItem: "450000000.00",
    saldoSebelumPpn: "50000000.00",
    nilaiGr: "400000000.00",
    klien: "PT Indosat Tbk",
    jenisTagihan: "tahap",
    statusPo: "aktif",
    tanggalPo: "2025-06-01",
    lines: [
      { nomorLine: 1, shortText: "SVC | AI/ML Customer Model Implementation", qty: 1, hargaSatuan: "450000000.00" },
    ],
  },
];

const daftarPo2026Baru: PoData[] = [
  {
    nomorPo: "PO-CIMB-2026-BIZ-02",
    namaProyek: "BizChannel Corporate Banking Enhancement 2026",
    tahun: 2026,
    nilaiItem: "550000000.00",
    saldoSebelumPpn: "370000000.00",
    nilaiGr: "180000000.00",
    klien: "PT Bank CIMB Niaga Tbk",
    jenisTagihan: "bulanan",
    statusPo: "aktif",
    tanggalPo: "2026-02-01",
    lines: [
      { nomorLine: 1, shortText: "SVC | Corporate Banking Backend Lead", qty: 12, hargaSatuan: "30000000.00" },
      { nomorLine: 2, shortText: "SVC | QA Automation Specialist", qty: 12, hargaSatuan: "15833333.33" },
    ],
  },
  {
    nomorPo: "PO-ISAT-2026-CLD-01",
    namaProyek: "Multi-Cloud Infrastructure Automation 2026",
    tahun: 2026,
    nilaiItem: "480000000.00",
    saldoSebelumPpn: "360000000.00",
    nilaiGr: "120000000.00",
    klien: "PT Indosat Tbk",
    jenisTagihan: "bulanan",
    statusPo: "aktif",
    tanggalPo: "2026-03-01",
    lines: [
      { nomorLine: 1, shortText: "SVC | Kubernetes & Cloud Platform Engineer", qty: 12, hargaSatuan: "40000000.00" },
    ],
  },
  {
    nomorPo: "PO-BRI-2026-MOVI-05",
    namaProyek: "BRImo Microservices Resilience & Performance 2026",
    tahun: 2026,
    nilaiItem: "780000000.00",
    saldoSebelumPpn: "520000000.00",
    nilaiGr: "260000000.00",
    klien: "PT Bank Rakyat Indonesia (Persero) Tbk",
    jenisTagihan: "bulanan",
    statusPo: "aktif",
    tanggalPo: "2026-01-10",
    lines: [
      { nomorLine: 1, shortText: "SVC | High-Performance Go Engineer", qty: 12, hargaSatuan: "35000000.00" },
      { nomorLine: 2, shortText: "SVC | SRE Performance Specialist", qty: 12, hargaSatuan: "30000000.00" },
    ],
  },
];

async function seedPoList(daftar: PoData[], label: string) {
  console.log(`\n=== Memproses Data PO ${label} (${daftar.length} PO) ===`);
  let berhasil = 0;
  let dilewati = 0;

  for (const item of daftar) {
    const existing = await db.select().from(po).where(eq(po.nomorPo, item.nomorPo)).limit(1);

    if (existing.length > 0) {
      console.log(`[SKIP] PO ${item.nomorPo} sudah ada.`);
      dilewati++;
      continue;
    }

    const [insertedPo] = await db
      .insert(po)
      .values({
        nomorPo: item.nomorPo,
        namaProyek: item.namaProyek,
        tahun: item.tahun,
        nilaiItem: item.nilaiItem,
        saldoSebelumPpn: item.saldoSebelumPpn,
        nilaiGr: item.nilaiGr,
        klien: item.klien,
        jenisTagihan: item.jenisTagihan,
        statusPo: item.statusPo,
        tanggalPo: item.tanggalPo,
      })
      .returning();

    for (const line of item.lines) {
      await db.insert(poLineItem).values({
        poId: insertedPo.id,
        nomorLine: line.nomorLine,
        shortText: line.shortText,
        qty: line.qty,
        hargaSatuan: line.hargaSatuan,
      });
    }

    const saldo = new Decimal(item.nilaiItem).minus(item.nilaiGr).toNumber();
    console.log(
      `[OK] PO Ditambahkan: ${item.nomorPo} | ${item.klien} | Nilai: Rp ${Number(item.nilaiItem).toLocaleString("id-ID")} | GR: Rp ${Number(item.nilaiGr).toLocaleString("id-ID")} | Saldo: Rp ${saldo.toLocaleString("id-ID")}`
    );
    berhasil++;
  }

  console.log(`Selesai ${label}: ${berhasil} ditambahkan, ${dilewati} dilewati.`);
}

async function main() {
  console.log("=================================================");
  console.log("   SEED DATA DUMMY SUMMARY PO (TAHUN 2025 & 2026)");
  console.log("=================================================");

  await seedPoList(daftarPo2025, "Tahun 2025");
  await seedPoList(daftarPo2026Baru, "Tahun 2026 Tambahan");

  // Tampilkan Rekap Data Per Tahun
  const semuaPo = await db.select().from(po);
  const rekap2025 = semuaPo.filter((p) => p.tahun === 2025);
  const rekap2026 = semuaPo.filter((p) => p.tahun === 2026);

  const hitungTotal = (list: typeof semuaPo) => {
    const totalNilai = list.reduce((acc, p) => acc.plus(p.nilaiItem), new Decimal(0));
    const totalGr = list.reduce((acc, p) => acc.plus(p.nilaiGr), new Decimal(0));
    const totalSaldo = totalNilai.minus(totalGr);
    return {
      count: list.length,
      totalNilai: totalNilai.toNumber(),
      totalGr: totalGr.toNumber(),
      totalSaldo: totalSaldo.toNumber(),
    };
  };

  const stat2025 = hitungTotal(rekap2025);
  const stat2026 = hitungTotal(rekap2026);

  console.log("\n=================================================");
  console.log("   REKAPITULASI SUMMARY PO DI DATABASE");
  console.log("=================================================");
  console.log(`\n--- TAHUN 2025 (${stat2025.count} PO) ---`);
  console.log(`  Total Nilai PO : Rp ${stat2025.totalNilai.toLocaleString("id-ID")}`);
  console.log(`  Total GR       : Rp ${stat2025.totalGr.toLocaleString("id-ID")}`);
  console.log(`  Sisa Saldo     : Rp ${stat2025.totalSaldo.toLocaleString("id-ID")}`);

  console.log(`\n--- TAHUN 2026 (${stat2026.count} PO) ---`);
  console.log(`  Total Nilai PO : Rp ${stat2026.totalNilai.toLocaleString("id-ID")}`);
  console.log(`  Total GR       : Rp ${stat2026.totalGr.toLocaleString("id-ID")}`);
  console.log(`  Sisa Saldo     : Rp ${stat2026.totalSaldo.toLocaleString("id-ID")}`);
  console.log("=================================================\n");

  process.exit(0);
}

main().catch((err) => {
  console.error("Gagal menjalankan seeding Summary PO:", err);
  process.exit(1);
});
