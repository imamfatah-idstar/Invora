import "dotenv/config";
import { db } from "../src/db";
import {
  users, personel, rateCard, userXl, po, poLineItem, pemetaanPersonelPo,
  pengajuan, pengajuanDetail, konfirmasi, checkerReview, dokumen, auditLog
} from "../src/db/schema";
import { eq } from "drizzle-orm";
import Decimal from "decimal.js";

async function main() {
  console.log("=================================================");
  console.log("   SEED DATA DUMMY BERVARIATIF INVORA (MVP 1 - 4)");
  console.log("=================================================\n");

  // 1. Ambil akun petugas & checker untuk referensi pembuatan data
  const [petugasUser] = await db.select().from(users).where(eq(users.role, "petugas")).limit(1);
  const [checkerUser] = await db.select().from(users).where(eq(users.role, "checker")).limit(1);

  if (!petugasUser || !checkerUser) {
    console.error("Akun petugas atau checker belum ada di database. Silakan jalankan migrasi awal terlebih dahulu.");
    process.exit(1);
  }

  console.log(`Menggunakan Petugas: ${petugasUser.nama} (ID: ${petugasUser.id})`);
  console.log(`Menggunakan Checker: ${checkerUser.nama} (ID: ${checkerUser.id})\n`);

  // 2. Tambah PIC Klien (User XL / Non-XL)
  console.log("-> 1. Menambahkan PIC Klien (XL & Non-XL)...");
  const dataUserXl = [
    { nama: "Hendra Setiawan (XL Axiata - Digital Delivery Lead)", kontak: "hendra.setiawan@xl.co.id / +628180900123" },
    { nama: "Dian Kusuma (Bank Mandiri - Enterprise Architecture)", kontak: "dian.kusuma@bankmandiri.co.id / +628118820394" },
    { nama: "Budi Raharjo (BCA - IT Procurement & Vendor Mgmt)", kontak: "budi_raharjo@bca.co.id / +628129933441" },
    { nama: "Maya Safitri (Telkomsel - Core Network Engineering)", kontak: "maya_safitri@telkomsel.co.id / +628111928374" },
    { nama: "Reza Pratama (Astra - Digital Transformation Office)", kontak: "reza.pratama@ai.astra.co.id / +628131029384" },
    { nama: "Amanda Putri (Shopee - Tech Lead Payments)", kontak: "amanda.putri@shopee.com / +628157722119" },
  ];

  const userXlInserted: Array<{ id: number; nama: string }> = [];
  for (const u of dataUserXl) {
    const existing = await db.select().from(userXl).where(eq(userXl.nama, u.nama)).limit(1);
    if (existing.length > 0) {
      userXlInserted.push(existing[0]);
    } else {
      const [inserted] = await db.insert(userXl).values(u).returning();
      userXlInserted.push(inserted);
    }
  }
  console.log(`✓ ${userXlInserted.length} PIC Klien siap.\n`);

  // 3. Tambah Personel & Rate Card
  console.log("-> 2. Menambahkan Master Personel & Rate Card...");
  const daftarTalenta = [
    { nama: "Dimas Arya Nugraha", penempatan: "Jakarta Selatan", rate: "28500000.00", role: "Senior Fullstack Developer" },
    { nama: "Siti Aisyah Nuraini", penempatan: "BSD Tangerang", rate: "32000000.00", role: "DevOps & Cloud Engineer" },
    { nama: "Fajar Ramadhan", penempatan: "Jakarta Pusat", rate: "22000000.00", role: "QA Automation Engineer" },
    { nama: "Putri Maharani", penempatan: "Bandung / Hybrid", rate: "25000000.00", role: "Lead UI/UX Designer" },
    { nama: "Kevin Jonathan", penempatan: "Jakarta Selatan", rate: "35000000.00", role: "Senior Data Engineer" },
    { nama: "Rian Hidayat", penempatan: "Jakarta Barat", rate: "30000000.00", role: "Scrum Master / Delivery Lead" },
    { nama: "Jessica Tanuwijaya", penempatan: "Jakarta Selatan", rate: "26000000.00", role: "Mobile Specialist (Flutter)" },
    { nama: "Muhammad Farhan", penempatan: "Jakarta Selatan", rate: "29000000.00", role: "Backend Golang Engineer" },
    { nama: "Nadya Eka Putri", penempatan: "Jakarta Pusat", rate: "24000000.00", role: "Business Solution Analyst" },
    { nama: "Bayu Pratama Kusuma", penempatan: "Remote", rate: "33000000.00", role: "DevSecOps Engineer" },
    { nama: "Ratna Wulandari", penempatan: "Jakarta Selatan", rate: "20000000.00", role: "Data Analyst & BI" },
    { nama: "Alvin Sanjaya", penempatan: "BSD Tangerang", rate: "24500000.00", role: "Frontend Next.js Developer" },
    { nama: "Tari Indah Sari", penempatan: "Jakarta Pusat", rate: "23000000.00", role: "System Integration Analyst" },
    { nama: "Yoga Prasetyo", penempatan: "Jakarta Pusat", rate: "38000000.00", role: "Principal Core Banking Architect" },
    { nama: "Clarissa Aurelia", penempatan: "Jakarta Selatan", rate: "36000000.00", role: "Technical Product Manager" },
  ];

  const personelInserted: Array<{ id: number; nama: string; rate: string }> = [];
  for (const t of daftarTalenta) {
    const existing = await db.select().from(personel).where(eq(personel.nama, t.nama)).limit(1);
    let pId: number;
    if (existing.length > 0) {
      pId = existing[0].id;
    } else {
      const [inserted] = await db.insert(personel).values({
        nama: t.nama,
        status: "aktif",
        penempatan: t.penempatan,
      }).returning();
      pId = inserted.id;

      await db.insert(rateCard).values({
        personelId: pId,
        nilaiRate: t.rate,
        berlakuDari: "2026-01-01",
        berlakuSampai: null,
      });
    }
    personelInserted.push({ id: pId, nama: t.nama, rate: t.rate });
  }
  console.log(`✓ ${personelInserted.length} Personel & Rate Card siap.\n`);

  // 4. Tambah PO Bervariasi
  console.log("-> 3. Menambahkan PO Bervariasi (XL vs Non-XL, Bulanan vs Tahap, Aktif vs Selesai)...");
  const daftarPoData = [
    {
      nomorPo: "PO-XL-2026-0891",
      namaProyek: "Digital Touchpoint & MyXL Revamp 2026",
      tahun: 2026,
      nilaiItem: "650000000.00",
      saldoSebelumPpn: "380000000.00",
      nilaiGr: "270000000.00",
      klien: "PT XL Axiata Tbk",
      jenisTagihan: "bulanan",
      statusPo: "aktif",
      lines: [
        { nomorLine: 1, shortText: "SVC | FullStack Lead Specialist", qty: 12, hargaSatuan: "28500000.00" },
        { nomorLine: 2, shortText: "SVC | Cloud DevOps Engineer", qty: 12, hargaSatuan: "32000000.00" },
        { nomorLine: 3, shortText: "SVC | QA Automation Specialist", qty: 12, hargaSatuan: "22000000.00" },
      ]
    },
    {
      nomorPo: "PO-XL-2026-0412",
      namaProyek: "Enterprise Data Lake & Analytics Platform",
      tahun: 2026,
      nilaiItem: "420000000.00",
      saldoSebelumPpn: "0.00",
      nilaiGr: "420000000.00",
      klien: "PT XL Axiata Tbk",
      jenisTagihan: "bulanan",
      statusPo: "selesai", // Closed PO
      lines: [
        { nomorLine: 1, shortText: "SVC | Big Data Pipeline Engineer", qty: 12, hargaSatuan: "35000000.00" },
      ]
    },
    {
      nomorPo: "PO-BM-2026-KORP-11",
      namaProyek: "Wholesale Banking Modernization",
      tahun: 2026,
      nilaiItem: "850000000.00",
      saldoSebelumPpn: "580000000.00",
      nilaiGr: "270000000.00",
      klien: "PT Bank Mandiri (Persero) Tbk",
      jenisTagihan: "bulanan",
      statusPo: "aktif",
      lines: [
        { nomorLine: 1, shortText: "SVC | Core Backend Architect", qty: 12, hargaSatuan: "38000000.00" },
        { nomorLine: 2, shortText: "SVC | Solution Analyst", qty: 12, hargaSatuan: "24000000.00" },
      ]
    },
    {
      nomorPo: "PO-BCA-2026-API-03",
      namaProyek: "Open Banking API Gateway & Security",
      tahun: 2026,
      nilaiItem: "350000000.00",
      saldoSebelumPpn: "175000000.00",
      nilaiGr: "175000000.00",
      klien: "PT Bank Central Asia Tbk",
      jenisTagihan: "tahap", // Milestone Termin
      statusPo: "aktif",
      lines: [
        { nomorLine: 1, shortText: "SVC | Security Hardening API Gateway", qty: 1, hargaSatuan: "350000000.00" },
      ]
    },
    {
      nomorPo: "PO-TSEL-2026-OMNI-07",
      namaProyek: "Omnichannel Customer Journey Orchestrator",
      tahun: 2026,
      nilaiItem: "720000000.00",
      saldoSebelumPpn: "480000000.00",
      nilaiGr: "240000000.00",
      klien: "PT Telekomunikasi Selular",
      jenisTagihan: "bulanan",
      statusPo: "aktif",
      lines: [
        { nomorLine: 1, shortText: "SVC | UI/UX Product Lead", qty: 12, hargaSatuan: "25000000.00" },
        { nomorLine: 2, shortText: "SVC | Mobile Flutter Specialist", qty: 12, hargaSatuan: "26000000.00" },
      ]
    },
    {
      nomorPo: "PO-SHP-2026-PAY-01",
      namaProyek: "Payment Reconciliation High-Throughput Engine",
      tahun: 2026,
      nilaiItem: "280000000.00",
      saldoSebelumPpn: "0.00",
      nilaiGr: "280000000.00",
      klien: "PT Shopee International Indonesia",
      jenisTagihan: "tahap",
      statusPo: "selesai", // Closed PO
      lines: [
        { nomorLine: 1, shortText: "SVC | Settlement Engine Integration", qty: 1, hargaSatuan: "280000000.00" },
      ]
    },
    {
      nomorPo: "PO-ASTRA-2026-DMS-05",
      namaProyek: "Dealer Management System Cloud Migration",
      tahun: 2026,
      nilaiItem: "500000000.00",
      saldoSebelumPpn: "500000000.00",
      nilaiGr: "0.00",
      klien: "PT Astra International Tbk",
      jenisTagihan: "bulanan",
      statusPo: "aktif",
      lines: [
        { nomorLine: 1, shortText: "SVC | Cloud Migration Architect", qty: 12, hargaSatuan: "33000000.00" },
        { nomorLine: 2, shortText: "SVC | Frontend Web Specialist", qty: 12, hargaSatuan: "24500000.00" },
      ]
    }
  ];

  const poInserted: Record<string, { id: number; nomorPo: string; klien: string; lines: Array<{ id: number; nomorLine: number; shortText: string }> }> = {};

  for (const p of daftarPoData) {
    const existing = await db.select().from(po).where(eq(po.nomorPo, p.nomorPo)).limit(1);
    let poId: number;
    if (existing.length > 0) {
      poId = existing[0].id;
      await db.update(po).set({
        namaProyek: p.namaProyek,
        tahun: p.tahun,
        nilaiItem: p.nilaiItem,
        saldoSebelumPpn: p.saldoSebelumPpn,
        nilaiGr: p.nilaiGr,
        klien: p.klien,
        jenisTagihan: p.jenisTagihan,
        statusPo: p.statusPo,
      }).where(eq(po.id, poId));
    } else {
      const [inserted] = await db.insert(po).values({
        nomorPo: p.nomorPo,
        namaProyek: p.namaProyek,
        tahun: p.tahun,
        nilaiItem: p.nilaiItem,
        saldoSebelumPpn: p.saldoSebelumPpn,
        nilaiGr: p.nilaiGr,
        klien: p.klien,
        jenisTagihan: p.jenisTagihan,
        statusPo: p.statusPo,
      }).returning();
      poId = inserted.id;
    }

    const linesInserted: Array<{ id: number; nomorLine: number; shortText: string }> = [];
    for (const l of p.lines) {
      const existingLine = await db.select().from(poLineItem).where(eq(poLineItem.poId, poId)).limit(1);
      // Insert jika belum ada
      const [insLine] = await db.insert(poLineItem).values({
        poId,
        nomorLine: l.nomorLine,
        shortText: l.shortText,
        qty: l.qty,
        hargaSatuan: l.hargaSatuan,
      }).returning();
      linesInserted.push({ id: insLine.id, nomorLine: insLine.nomorLine, shortText: insLine.shortText });
    }

    poInserted[p.nomorPo] = {
      id: poId,
      nomorPo: p.nomorPo,
      klien: p.klien,
      lines: linesInserted,
    };
  }
  console.log(`✓ 7 PO & PO Line Items berhasil dikonfigurasi.\n`);

  // 5. Pemetaan Personel ke PO
  console.log("-> 4. Menghubungkan Pemetaan Personel ke PO...");
  const pemetaanData = [
    // PO XL 0891
    { personelIdx: 0, poNomor: "PO-XL-2026-0891", lineIdx: 0 }, // Dimas Arya -> Fullstack
    { personelIdx: 1, poNomor: "PO-XL-2026-0891", lineIdx: 1 }, // Siti Aisyah -> DevOps
    { personelIdx: 2, poNomor: "PO-XL-2026-0891", lineIdx: 2 }, // Fajar Ramadhan -> QA
    // PO Bank Mandiri
    { personelIdx: 13, poNomor: "PO-BM-2026-KORP-11", lineIdx: 0 }, // Yoga Prasetyo -> Core Backend
    { personelIdx: 8, poNomor: "PO-BM-2026-KORP-11", lineIdx: 1 },  // Nadya Eka -> Solution Analyst
    // PO Bank BCA
    { personelIdx: 7, poNomor: "PO-BCA-2026-API-03", lineIdx: 0 },  // Muhammad Farhan
    // PO Telkomsel
    { personelIdx: 3, poNomor: "PO-TSEL-2026-OMNI-07", lineIdx: 0 }, // Putri Maharani -> UI/UX
    { personelIdx: 6, poNomor: "PO-TSEL-2026-OMNI-07", lineIdx: 1 }, // Jessica Tanuwijaya -> Flutter
    // PO Astra
    { personelIdx: 9, poNomor: "PO-ASTRA-2026-DMS-05", lineIdx: 0 }, // Bayu Pratama -> DevSecOps
    { personelIdx: 11, poNomor: "PO-ASTRA-2026-DMS-05", lineIdx: 1 }, // Alvin Sanjaya -> Frontend
  ];

  for (const m of pemetaanData) {
    const pTarget = personelInserted[m.personelIdx];
    const poTarget = poInserted[m.poNomor];
    const lineTarget = poTarget.lines[m.lineIdx];

    const exists = await db.select().from(pemetaanPersonelPo).where(
      eq(pemetaanPersonelPo.personelId, pTarget.id)
    ).limit(1);

    if (exists.length === 0) {
      await db.insert(pemetaanPersonelPo).values({
        personelId: pTarget.id,
        poId: poTarget.id,
        poLineItemId: lineTarget ? lineTarget.id : null,
        berlakuDari: "2026-01-01",
        berlakuSampai: "2026-12-31",
      });
    }
  }
  console.log("✓ Pemetaan Personel ke PO aktif.\n");

  // 6. Membuat Pengajuan Bervariatif (Berbagai Kasus Nyata)
  console.log("-> 5. Membuat Pengajuan Bervariatif (Siklus Lengkap & Kasus MVP 4)...");

  // Kasus 1: Klien XL (Januari 2026) - Realisasi GR Impas 100% Match, Invoice Resmi & Faktur Pajak Terbit
  const [ajuanXlJan] = await db.insert(pengajuan).values({
    periode: "2026-01",
    poId: poInserted["PO-XL-2026-0891"].id,
    userXlId: userXlInserted[0].id,
    status: "diajukan",
    versi: 1,
    tanggalSubmitCac: "2026-01-28",
    tanggalCacApproved: "2026-02-02",
    tanggalRequestGr: "2026-02-03",
    tanggalGrDisetujui: "2026-02-05",
    tanggalSubmitInvoice: "2026-02-08",
    tanggalApproveInvoice: "2026-02-14",
    nomorInvoice: "081/INV-IDS/I/2026",
    nomorGrSlip: "GR-XL-2026-01-0087",
    nilaiGrDisetujui: "82500000.00",
    selisihGr: "0.00", // Impas
    nomorFakturPajak: "010.002-26.88392011",
    tanggalFakturPajak: "2026-02-08",
    tarifPpn: "11.00",
  }).returning();

  // Rincian 3 personel
  await db.insert(pengajuanDetail).values([
    {
      pengajuanId: ajuanXlJan.id,
      personelId: personelInserted[0].id, // Dimas 28.5jt
      hariKerjaDapatDitagihkan: 21,
      hariKerjaAcuanBulan: 21,
      nilaiRateDipakai: "28500000.00",
      hasilHitung: "28500000.00",
      nilaiPenuh: "28500000.00",
      poLineItemId: poInserted["PO-XL-2026-0891"].lines[0]?.id,
      sumberHitung: "timesheet",
    },
    {
      pengajuanId: ajuanXlJan.id,
      personelId: personelInserted[1].id, // Siti Aisyah 32jt
      hariKerjaDapatDitagihkan: 21,
      hariKerjaAcuanBulan: 21,
      nilaiRateDipakai: "32000000.00",
      hasilHitung: "32000000.00",
      nilaiPenuh: "32000000.00",
      poLineItemId: poInserted["PO-XL-2026-0891"].lines[1]?.id,
      sumberHitung: "timesheet",
    },
    {
      pengajuanId: ajuanXlJan.id,
      personelId: personelInserted[2].id, // Fajar 22jt
      hariKerjaDapatDitagihkan: 21,
      hariKerjaAcuanBulan: 21,
      nilaiRateDipakai: "22000000.00",
      hasilHitung: "22000000.00",
      nilaiPenuh: "22000000.00",
      poLineItemId: poInserted["PO-XL-2026-0891"].lines[2]?.id,
      sumberHitung: "kalender",
    },
  ]);

  await db.insert(konfirmasi).values({ pengajuanId: ajuanXlJan.id, userId: petugasUser.id, versiDikonfirmasi: 1 });
  await db.insert(checkerReview).values({ pengajuanId: ajuanXlJan.id, userId: checkerUser.id, hasil: "siap_diajukan", catatan: "Data CAC & Timesheet lengkap dan valid." });
  await db.insert(dokumen).values({ pengajuanId: ajuanXlJan.id, jenis: "CAC", versi: 1, status: "final" });

  // Kasus 2: Klien XL (Februari 2026) - KEKURANGAN GR (Deficiency GR) yang akan di-carry over ke Maret!
  const [ajuanXlFeb] = await db.insert(pengajuan).values({
    periode: "2026-02",
    poId: poInserted["PO-XL-2026-0891"].id,
    userXlId: userXlInserted[0].id,
    status: "diajukan",
    versi: 1,
    tanggalSubmitCac: "2026-02-27",
    tanggalCacApproved: "2026-03-03",
    tanggalRequestGr: "2026-03-04",
    tanggalGrDisetujui: "2026-03-07",
    tanggalSubmitInvoice: "2026-03-09",
    tanggalApproveInvoice: "2026-03-15",
    nomorInvoice: "154/INV-IDS/II/2026",
    nomorGrSlip: "GR-XL-2026-02-0192",
    nilaiGrDisetujui: "81900000.00", // Selisih 600rb
    selisihGr: "600000.00", // KEKURANGAN GR (+Rp600.000)
    nomorFakturPajak: "010.002-26.88392150",
    tanggalFakturPajak: "2026-03-09",
    tarifPpn: "11.00",
  }).returning();

  await db.insert(pengajuanDetail).values([
    {
      pengajuanId: ajuanXlFeb.id,
      personelId: personelInserted[0].id,
      hariKerjaDapatDitagihkan: 20,
      hariKerjaAcuanBulan: 20,
      nilaiRateDipakai: "28500000.00",
      hasilHitung: "28500000.00",
      nilaiPenuh: "28500000.00",
      poLineItemId: poInserted["PO-XL-2026-0891"].lines[0]?.id,
      sumberHitung: "timesheet",
    },
    {
      pengajuanId: ajuanXlFeb.id,
      personelId: personelInserted[1].id,
      hariKerjaDapatDitagihkan: 20,
      hariKerjaAcuanBulan: 20,
      nilaiRateDipakai: "32000000.00",
      hasilHitung: "32000000.00",
      nilaiPenuh: "32000000.00",
      poLineItemId: poInserted["PO-XL-2026-0891"].lines[1]?.id,
      sumberHitung: "timesheet",
    },
    {
      pengajuanId: ajuanXlFeb.id,
      personelId: personelInserted[2].id,
      hariKerjaDapatDitagihkan: 20,
      hariKerjaAcuanBulan: 20,
      nilaiRateDipakai: "22000000.00",
      hasilHitung: "22000000.00",
      nilaiPenuh: "22000000.00",
      poLineItemId: poInserted["PO-XL-2026-0891"].lines[2]?.id,
      sumberHitung: "timesheet",
    },
  ]);

  // Kasus 3: Klien XL (Maret 2026) - MENYERAP SELISIH GR dari Februari (One-Time Carry Over Sempurna!)
  const [ajuanXlMar] = await db.insert(pengajuan).values({
    periode: "2026-03",
    poId: poInserted["PO-XL-2026-0891"].id,
    userXlId: userXlInserted[0].id,
    status: "diajukan",
    versi: 1,
    penyesuaianSelisihGrMasuk: "600000.00", // Membawa masuk selisih +600rb dari Februari
    tanggalSubmitCac: "2026-03-29",
    tanggalCacApproved: "2026-04-02",
    tanggalRequestGr: "2026-04-04",
    tanggalGrDisetujui: "2026-04-06",
    tanggalSubmitInvoice: "2026-04-08",
    tanggalApproveInvoice: "2026-04-12",
    nomorInvoice: "241/INV-IDS/III/2026",
    nomorGrSlip: "GR-XL-2026-03-0310",
    nilaiGrDisetujui: "83100000.00", // 82.5jt dasar + 600rb selisih = 83.1jt pas!
    selisihGr: "0.00",
    nomorFakturPajak: "010.002-26.88392301",
    tanggalFakturPajak: "2026-04-08",
    tarifPpn: "11.00",
  }).returning();

  // Kunci pengajuan Februari agar selisihnya terbukti tidak terbawa dua kali
  await db.update(pengajuan).set({ selisihGrDipakaiPadaPengajuanId: ajuanXlMar.id }).where(eq(pengajuan.id, ajuanXlFeb.id));

  await db.insert(pengajuanDetail).values([
    {
      pengajuanId: ajuanXlMar.id,
      personelId: personelInserted[0].id,
      hariKerjaDapatDitagihkan: 21,
      hariKerjaAcuanBulan: 21,
      nilaiRateDipakai: "28500000.00",
      hasilHitung: "28500000.00",
      nilaiPenuh: "28500000.00",
      poLineItemId: poInserted["PO-XL-2026-0891"].lines[0]?.id,
      sumberHitung: "timesheet",
    },
    {
      pengajuanId: ajuanXlMar.id,
      personelId: personelInserted[1].id,
      hariKerjaDapatDitagihkan: 21,
      hariKerjaAcuanBulan: 21,
      nilaiRateDipakai: "32000000.00",
      hasilHitung: "32000000.00",
      nilaiPenuh: "32000000.00",
      poLineItemId: poInserted["PO-XL-2026-0891"].lines[1]?.id,
      sumberHitung: "timesheet",
    },
    {
      pengajuanId: ajuanXlMar.id,
      personelId: personelInserted[2].id,
      hariKerjaDapatDitagihkan: 21,
      hariKerjaAcuanBulan: 21,
      nilaiRateDipakai: "22000000.00",
      hasilHitung: "22000000.00",
      nilaiPenuh: "22000000.00",
      poLineItemId: poInserted["PO-XL-2026-0891"].lines[2]?.id,
      sumberHitung: "timesheet",
    },
  ]);

  // Kasus 4: Klien Non-XL Bank Mandiri - Menggunakan Dokumen BAST 1-Halaman Formal (Siap Diajukan)
  const [ajuanMandiri] = await db.insert(pengajuan).values({
    periode: "2026-03",
    poId: poInserted["PO-BM-2026-KORP-11"].id,
    userXlId: userXlInserted[1].id,
    status: "siap_diajukan",
    versi: 1,
    tanggalSubmitCac: "2026-04-01",
  }).returning();

  await db.insert(pengajuanDetail).values([
    {
      pengajuanId: ajuanMandiri.id,
      personelId: personelInserted[13].id, // Yoga Prasetyo 38jt
      hariKerjaDapatDitagihkan: 21,
      hariKerjaAcuanBulan: 21,
      nilaiRateDipakai: "38000000.00",
      hasilHitung: "38000000.00",
      nilaiPenuh: "38000000.00",
      poLineItemId: poInserted["PO-BM-2026-KORP-11"].lines[0]?.id,
      sumberHitung: "timesheet",
    },
    {
      pengajuanId: ajuanMandiri.id,
      personelId: personelInserted[8].id, // Nadya Eka 24jt
      hariKerjaDapatDitagihkan: 21,
      hariKerjaAcuanBulan: 21,
      nilaiRateDipakai: "24000000.00",
      hasilHitung: "24000000.00",
      nilaiPenuh: "24000000.00",
      poLineItemId: poInserted["PO-BM-2026-KORP-11"].lines[1]?.id,
      sumberHitung: "timesheet",
    },
  ]);

  await db.insert(konfirmasi).values({ pengajuanId: ajuanMandiri.id, userId: petugasUser.id, versiDikonfirmasi: 1 });
  await db.insert(checkerReview).values({ pengajuanId: ajuanMandiri.id, userId: checkerUser.id, hasil: "siap_diajukan", catatan: "BAST Non-XL 1 halaman & timesheet lengkap." });
  await db.insert(dokumen).values({ pengajuanId: ajuanMandiri.id, jenis: "BAST", versi: 1, status: "final" });

  // Kasus 5: Klien Non-XL BCA - Model Tagihan TAHAP (Milestone Termin)
  const [ajuanBca] = await db.insert(pengajuan).values({
    periode: "2026-02",
    poId: poInserted["PO-BCA-2026-API-03"].id,
    userXlId: userXlInserted[2].id,
    status: "diajukan",
    versi: 1,
    keteranganTahap: "Tahap I (50%) - API Specification & Gateway Architecture",
    tanggalSubmitCac: "2026-02-25",
    tanggalGrDisetujui: "2026-03-02",
    tanggalSubmitInvoice: "2026-03-04",
    tanggalApproveInvoice: "2026-03-10",
    nomorInvoice: "189/INV-IDS/II/2026",
    nomorGrSlip: "BCA-GR-TERMIN-01",
    nilaiGrDisetujui: "175000000.00",
    selisihGr: "0.00",
    nomorFakturPajak: "010.002-26.77291044",
    tanggalFakturPajak: "2026-03-04",
    tarifPpn: "11.00",
  }).returning();

  await db.insert(pengajuanDetail).values({
    pengajuanId: ajuanBca.id,
    personelId: personelInserted[7].id,
    hariKerjaDapatDitagihkan: 0,
    hariKerjaAcuanBulan: 0,
    nilaiRateDipakai: "175000000.00",
    hasilHitung: "175000000.00",
    nilaiPenuh: "175000000.00",
    poLineItemId: poInserted["PO-BCA-2026-API-03"].lines[0]?.id,
    sumberHitung: "manual",
  });

  // Kasus 6: Klien Telkomsel - Menunggu Checker
  const [ajuanTsel] = await db.insert(pengajuan).values({
    periode: "2026-04",
    poId: poInserted["PO-TSEL-2026-OMNI-07"].id,
    userXlId: userXlInserted[3].id,
    status: "menunggu_checker",
    versi: 1,
  }).returning();

  await db.insert(pengajuanDetail).values([
    {
      pengajuanId: ajuanTsel.id,
      personelId: personelInserted[3].id, // Putri 25jt
      hariKerjaDapatDitagihkan: 21,
      hariKerjaAcuanBulan: 21,
      nilaiRateDipakai: "25000000.00",
      hasilHitung: "25000000.00",
      nilaiPenuh: "25000000.00",
      poLineItemId: poInserted["PO-TSEL-2026-OMNI-07"].lines[0]?.id,
      sumberHitung: "timesheet",
    },
    {
      pengajuanId: ajuanTsel.id,
      personelId: personelInserted[6].id, // Jessica 26jt
      hariKerjaDapatDitagihkan: 21,
      hariKerjaAcuanBulan: 21,
      nilaiRateDipakai: "26000000.00",
      hasilHitung: "26000000.00",
      nilaiPenuh: "26000000.00",
      poLineItemId: poInserted["PO-TSEL-2026-OMNI-07"].lines[1]?.id,
      sumberHitung: "timesheet",
    },
  ]);
  await db.insert(konfirmasi).values({ pengajuanId: ajuanTsel.id, userId: petugasUser.id, versiDikonfirmasi: 1 });

  // Kasus 7: Klien Astra - Masih Draf Baru Petugas
  const [ajuanAstra] = await db.insert(pengajuan).values({
    periode: "2026-04",
    poId: poInserted["PO-ASTRA-2026-DMS-05"].id,
    userXlId: userXlInserted[4].id,
    status: "draft",
    versi: 1,
  }).returning();

  await db.insert(pengajuanDetail).values([
    {
      pengajuanId: ajuanAstra.id,
      personelId: personelInserted[9].id, // Bayu Pratama 33jt
      hariKerjaDapatDitagihkan: 21,
      hariKerjaAcuanBulan: 21,
      nilaiRateDipakai: "33000000.00",
      hasilHitung: "33000000.00",
      nilaiPenuh: "33000000.00",
      poLineItemId: poInserted["PO-ASTRA-2026-DMS-05"].lines[0]?.id,
      sumberHitung: "timesheet",
    },
  ]);

  // Kasus 8: Klien XL - PERLU REVISI (Ada catatan dari Checker)
  const [ajuanRevisi] = await db.insert(pengajuan).values({
    periode: "2026-04",
    poId: poInserted["PO-XL-2026-0891"].id,
    userXlId: userXlInserted[0].id,
    status: "perlu_revisi",
    versi: 1,
  }).returning();

  await db.insert(pengajuanDetail).values([
    {
      pengajuanId: ajuanRevisi.id,
      personelId: personelInserted[2].id, // Fajar Ramadhan
      hariKerjaDapatDitagihkan: 21,
      hariKerjaAcuanBulan: 21,
      nilaiRateDipakai: "22000000.00",
      hasilHitung: "22000000.00",
      nilaiPenuh: "22000000.00",
      poLineItemId: poInserted["PO-XL-2026-0891"].lines[2]?.id,
      sumberHitung: "timesheet",
    },
  ]);

  await db.insert(konfirmasi).values({ pengajuanId: ajuanRevisi.id, userId: petugasUser.id, versiDikonfirmasi: 1 });
  await db.insert(checkerReview).values({
    pengajuanId: ajuanRevisi.id,
    userId: checkerUser.id,
    hasil: "perlu_revisi",
    catatan: "Mohon periksa kembali timesheet personel Fajar Ramadhan, ada 1 hari cuti bersama belum dipotongkan."
  });

  console.log("✓ Berbagai status pengajuan (draft, menunggu_checker, perlu_revisi, siap_diajukan, diajukan, realisasi GR, deficiency carry-over) berhasil dibuat.\n");

  // 7. Catat Audit Trail
  await db.insert(auditLog).values({
    entitas: "sistem",
    entitasId: 1,
    userId: petugasUser.id,
    perubahan: "Inisialisasi dataset pengujian komprehensif INVORA (MVP 1 - MVP 4)",
  });

  console.log("=================================================");
  console.log("   DATA DUMMY BERHASIL DIBUAT SECARA LENGKAP!    ");
  console.log("=================================================");
  process.exit(0);
}

main().catch((err) => {
  console.error("Gagal melakukan seeding data:", err);
  process.exit(1);
});
