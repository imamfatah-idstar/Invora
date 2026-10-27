import "dotenv/config";
import ExcelJS from "exceljs";
import path from "path";
import { db } from "../src/db";
import {
  users, userXl, personel, rateCard, po, poLineItem, pemetaanPersonelPo,
  pengajuan, pengajuanDetail, konfirmasi, checkerReview, dokumen,
  pembayaran, reminderLog, grRequest, grRequestRiwayat, lampiranPengajuan,
  auditLog
} from "../src/db/schema";
import { eq } from "drizzle-orm";

function parseDateStr(val: any): string {
  if (!val) return new Date().toISOString().split("T")[0];
  if (val instanceof Date) return val.toISOString().split("T")[0];
  if (typeof val === "string") {
    if (val.includes("T")) return val.split("T")[0];
    return val.substring(0, 10);
  }
  return String(val);
}

function parseNum(val: any): number {
  if (val === null || val === undefined) return 0;
  if (typeof val === "number") return val;
  if (typeof val === "object" && "result" in val) return Number(val.result) || 0;
  const cleaned = String(val).replace(/[^0-9.-]+/g, "");
  return parseFloat(cleaned) || 0;
}

function cleanStr(val: any): string {
  if (val === null || val === undefined) return "";
  if (typeof val === "object" && "text" in val) return String(val.text).trim();
  return String(val).trim();
}

async function main() {
  console.log("==================================================================");
  console.log("   IMPORT DUMMY DATA.XLSX & SEED DATABASE INVORA (MVP 1 - MVP 5)   ");
  console.log("==================================================================\n");

  const filePath = path.join(process.cwd(), "Dummy Data.xlsx");
  console.log(`Membaca file: ${filePath}...`);
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);
  console.log("✓ File Excel berhasil dibaca.\n");

  // 1. Ambil akun petugas & checker
  const [petugasUser] = await db.select().from(users).where(eq(users.role, "petugas")).limit(1);
  const [checkerUser] = await db.select().from(users).where(eq(users.role, "checker")).limit(1);

  if (!petugasUser || !checkerUser) {
    console.error("Akun petugas atau checker belum ada di database.");
    process.exit(1);
  }
  console.log(`Menggunakan Petugas: ${petugasUser.nama} (ID: ${petugasUser.id})`);
  console.log(`Menggunakan Checker: ${checkerUser.nama} (ID: ${checkerUser.id})\n`);

  // 2. Bersihkan data dummy lama (child -> parent)
  console.log("-> 1. Membersihkan data transaksi & dummy lama...");
  await db.delete(reminderLog);
  await db.delete(pembayaran);
  await db.delete(grRequestRiwayat);
  await db.delete(grRequest);
  await db.delete(lampiranPengajuan);
  await db.delete(dokumen);
  await db.delete(checkerReview);
  await db.delete(konfirmasi);
  await db.delete(pengajuanDetail);
  await db.delete(pengajuan);
  await db.delete(pemetaanPersonelPo);
  await db.delete(poLineItem);
  await db.delete(rateCard);
  await db.delete(po);
  await db.delete(personel);
  console.log("✓ Data lama berhasil dibersihkan.\n");

  // 3. Impor PIC Klien (Sheet: PIC Klien) -> user_xl
  // Col 1: ID, Col 2: Nama PIC, Col 3: Jabatan & Perusahaan, Col 4: Kontak, Col 5: Kategori Jalur
  console.log("-> 2. Mengimpor PIC Klien...");
  const sPic = workbook.getWorksheet("PIC Klien");
  const userXlMap: Record<number, number> = {};
  const userXlList: Array<{ id: number; nama: string }> = [];

  if (sPic) {
    for (let r = 2; r <= sPic.rowCount; r++) {
      const row = sPic.getRow(r);
      const excelId = parseNum(row.getCell(1).value);
      const namaPic = cleanStr(row.getCell(2).value);
      const jabatanPerusahaan = cleanStr(row.getCell(3).value);
      const kontak = cleanStr(row.getCell(4).value);

      if (!namaPic) continue;

      const namaLengkap = jabatanPerusahaan ? `${namaPic} (${jabatanPerusahaan})` : namaPic;
      
      const existing = await db.select().from(userXl).where(eq(userXl.nama, namaLengkap)).limit(1);
      let uxId: number;
      if (existing.length > 0) {
        uxId = existing[0].id;
        await db.update(userXl).set({ kontak }).where(eq(userXl.id, uxId));
      } else {
        const [inserted] = await db.insert(userXl).values({
          nama: namaLengkap,
          kontak: kontak || "-",
        }).returning();
        uxId = inserted.id;
      }
      userXlMap[excelId] = uxId;
      userXlList.push({ id: uxId, nama: namaLengkap });
    }
  }
  console.log(`✓ ${userXlList.length} PIC Klien siap.\n`);

  // 4. Impor Personel & Rate Card (Sheet: Talenta IT & Rate Card & database)
  // Talenta IT: Col 1: Nama, Col 2: Role, Col 3: Penempatan
  // Rate Card: Col 1: id, Col 2: nama, Col 3: rate bulanan, Col 4: berlaku dari, Col 5: berlaku sampai
  // database: Col 1: NIK, Col 2: name, Col 3: email, Col 4: client_name, Col 5: Type, Col 6: position, Col 7: status_code, Col 8: Source, Col 9: placement_name, Col 10: spk_start_date, Col 11: spk_actual_end_date, Col 12: rate_card, Col 13: po_number, Col 14: spk_number
  console.log("-> 3. Mengimpor Personel & Rate Card...");
  const sTalenta = workbook.getWorksheet("Talenta IT");
  const sRate = workbook.getWorksheet("Rate Card");
  const sDb = workbook.getWorksheet("database");

  const dbMetaByName: Record<string, { nik: string; spk: string; placement: string; role: string; poNum: string; rate: number }> = {};
  if (sDb) {
    for (let r = 3; r <= sDb.rowCount; r++) {
      const row = sDb.getRow(r);
      const name = cleanStr(row.getCell(2).value);
      if (!name) continue;
      dbMetaByName[name] = {
        nik: cleanStr(row.getCell(1).value),
        spk: cleanStr(row.getCell(14).value),
        placement: cleanStr(row.getCell(9).value),
        role: cleanStr(row.getCell(6).value),
        poNum: cleanStr(row.getCell(13).value),
        rate: parseNum(row.getCell(12).value),
      };
    }
  }

  const rateCardByName: Record<string, { rate: number; berlakuDari: string; berlakuSampai: string }> = {};
  if (sRate) {
    for (let r = 2; r <= sRate.rowCount; r++) {
      const row = sRate.getRow(r);
      const nama = cleanStr(row.getCell(2).value);
      if (!nama) continue;
      rateCardByName[nama] = {
        rate: parseNum(row.getCell(3).value),
        berlakuDari: parseDateStr(row.getCell(4).value),
        berlakuSampai: parseDateStr(row.getCell(5).value),
      };
    }
  }

  const personelMap: Record<string, { id: number; nama: string; rate: string; role: string; placement: string; poNum: string }> = {};

  if (sTalenta) {
    for (let r = 2; r <= sTalenta.rowCount; r++) {
      const row = sTalenta.getRow(r);
      const nama = cleanStr(row.getCell(1).value);
      const role = cleanStr(row.getCell(2).value);
      const penempatan = cleanStr(row.getCell(3).value);

      if (!nama) continue;

      const meta = dbMetaByName[nama];
      const rateInfo = rateCardByName[nama];
      const nilaiRate = rateInfo?.rate ? rateInfo.rate.toFixed(2) : (meta?.rate ? meta.rate.toFixed(2) : "25000000.00");

      const [p] = await db.insert(personel).values({
        nama,
        status: "aktif",
        penempatan: penempatan || meta?.placement || null,
      }).returning();

      await db.insert(rateCard).values({
        personelId: p.id,
        nilaiRate,
        berlakuDari: rateInfo?.berlakuDari || "2026-01-01",
        berlakuSampai: rateInfo?.berlakuSampai || null,
      });

      personelMap[nama] = {
        id: p.id,
        nama,
        rate: nilaiRate,
        role: role || meta?.role || "IT Specialist",
        placement: penempatan || meta?.placement || "",
        poNum: meta?.poNum || "",
      };
    }
  }
  console.log(`✓ ${Object.keys(personelMap).length} Personel & Rate Card siap.\n`);

  // 5. Impor PO (Sheet: PO)
  // Col 1: nomor po, Col 2: nama proyek, Col 3: klien, Col 4: pagu po, Col 5: sisa pagu, Col 6: status
  console.log("-> 4. Mengimpor PO & PO Line Items...");
  const sPo = workbook.getWorksheet("PO");
  const poMap: Record<string, { id: number; nomorPo: string; klien: string; lineItemId: number }> = {};
  const seenPoNums = new Set<string>();

  if (sPo) {
    for (let r = 2; r <= sPo.rowCount; r++) {
      const row = sPo.getRow(r);
      let nomorPoRaw = cleanStr(row.getCell(1).value);
      const namaProyek = cleanStr(row.getCell(2).value);
      const klien = cleanStr(row.getCell(3).value);
      const paguPo = parseNum(row.getCell(4).value);
      const sisaPagu = parseNum(row.getCell(5).value);
      const statusStr = cleanStr(row.getCell(6).value).toLowerCase();

      if (!nomorPoRaw) continue;

      let nomorPo = nomorPoRaw;
      if (seenPoNums.has(nomorPo)) {
        nomorPo = `${nomorPoRaw}-${cleanStr(klien).replace(/[^a-zA-Z0-9]/g, "").slice(0, 6)}`;
      }
      seenPoNums.add(nomorPo);

      const nilaiGr = Math.max(0, paguPo - sisaPagu);
      const statusPo = statusStr === "selesai" ? "selesai" : "aktif";
      const jenisTagihan = "bulanan";

      const [insertedPo] = await db.insert(po).values({
        nomorPo,
        namaProyek: namaProyek || `Proyek ${klien}`,
        tahun: 2026,
        nilaiItem: paguPo.toFixed(2),
        saldoSebelumPpn: sisaPagu.toFixed(2),
        nilaiGr: nilaiGr.toFixed(2),
        klien,
        jenisTagihan,
        statusPo,
      }).returning();

      const [lineItem] = await db.insert(poLineItem).values({
        poId: insertedPo.id,
        nomorLine: 1,
        shortText: `SVC | ${namaProyek.slice(0, 80)}`,
        qty: 12,
        hargaSatuan: paguPo > 0 ? (paguPo / 12).toFixed(2) : "10000000.00",
      }).returning();

      poMap[nomorPo] = { id: insertedPo.id, nomorPo, klien, lineItemId: lineItem.id };
      if (nomorPo !== nomorPoRaw) {
        poMap[nomorPoRaw + "_" + klien] = poMap[nomorPo];
      }
    }
  }
  console.log(`✓ ${Object.keys(poMap).length} PO siap.\n`);

  // 6. Pemetaan Personel ke PO
  console.log("-> 5. Menghubungkan Pemetaan Personel ke PO...");
  let countPemetaan = 0;
  for (const p of Object.values(personelMap)) {
    let targetPo = poMap[p.poNum];
    if (!targetPo) {
      for (const [key, val] of Object.entries(poMap)) {
        if (key.startsWith(p.poNum) || (p.poNum && key.includes(p.poNum))) {
          targetPo = val;
          break;
        }
      }
    }

    if (targetPo) {
      await db.insert(pemetaanPersonelPo).values({
        personelId: p.id,
        poId: targetPo.id,
        poLineItemId: targetPo.lineItemId,
        berlakuDari: "2026-01-01",
        berlakuSampai: "2026-12-31",
      });
      countPemetaan++;
    }
  }
  console.log(`✓ ${countPemetaan} Pemetaan Personel ke PO aktif.\n`);

  // 7. Baca data Faktur Pajak, Aging, dan Pelunasan PPh 23
  // Penerbitan FP: Col 1: ref, Col 2: no invoice, Col 3: no faktur pajak djp, Col 4: tgl faktur, Col 5: dpp/gr, Col 6: ppn 11%, Col 7: total tagihan
  // Aging Piutang: Col 1: no invoice, Col 2: klien, Col 3: jatuh tempo, Col 4: total piutang, Col 5: umur, Col 6: bucket, Col 7: kolektibilitas
  // Pelunasan PPh 23: Col 1: ref, Col 2: tgl bayar, Col 3: total invoice, Col 4: PPh 23 (2%), Col 5: biaya bank, Col 6: masuk rekening, Col 7: status
  console.log("-> 6. Menyiapkan Data Faktur Pajak, Aging Piutang, dan Pelunasan PPh 23...");
  const sAging = workbook.getWorksheet("Aging Piutang");
  const sFp = workbook.getWorksheet("Penerbitan FP");
  const sPph = workbook.getWorksheet("Pelunasan PPh 23");

  const fpByRef: Record<number, { noInvoice: string; noFaktur: string; tglFaktur: string; dpp: number; ppn: number; total: number }> = {};
  if (sFp) {
    for (let r = 3; r <= sFp.rowCount; r++) {
      const row = sFp.getRow(r);
      const ref = parseNum(row.getCell(1).value);
      const noInvoice = cleanStr(row.getCell(2).value);
      const noFaktur = cleanStr(row.getCell(3).value);
      const tglFaktur = parseDateStr(row.getCell(4).value);
      const dpp = parseNum(row.getCell(5).value);
      const ppn = parseNum(row.getCell(6).value);
      const total = parseNum(row.getCell(7).value);
      if (ref) {
        fpByRef[ref] = { noInvoice, noFaktur, tglFaktur, dpp, ppn, total };
      }
    }
  }

  const agingByRef: Record<number, { noInvoice: string; klien: string; jatuhTempo: string; totalPiutang: number }> = {};
  if (sAging) {
    for (let r = 4; r <= sAging.rowCount; r++) {
      const row = sAging.getRow(r);
      const ref = r - 3;
      const noInvoice = cleanStr(row.getCell(1).value);
      const klien = cleanStr(row.getCell(2).value);
      const jatuhTempo = parseDateStr(row.getCell(3).value);
      const totalPiutang = parseNum(row.getCell(4).value);
      if (noInvoice) {
        agingByRef[ref] = { noInvoice, klien, jatuhTempo, totalPiutang };
      }
    }
  }

  const pphByRef: Record<number, { tglBayar: string; totalInvoice: number; pph23: number; biayaBank: number; masukRekening: number; status: string }> = {};
  if (sPph) {
    for (let r = 3; r <= sPph.rowCount; r++) {
      const row = sPph.getRow(r);
      const ref = parseNum(row.getCell(1).value);
      const tglBayar = parseDateStr(row.getCell(2).value);
      const totalInvoice = parseNum(row.getCell(3).value);
      const pph23 = parseNum(row.getCell(4).value);
      const biayaBank = parseNum(row.getCell(5).value);
      const masukRekening = parseNum(row.getCell(6).value);
      const status = cleanStr(row.getCell(7).value);
      if (ref) {
        pphByRef[ref] = { tglBayar, totalInvoice, pph23, biayaBank, masukRekening, status };
      }
    }
  }

  // Baca Prorata (Col 1: Ref, Col 2: Personel, Col 3: Hari Acuan, Col 4: Hadir, Col 5: Rate Card, Col 6: Hasil, Col 7: Metode)
  const sProrata = workbook.getWorksheet("Prorata");
  const prorataList: Array<{ nama: string; hariAcuan: number; hadir: number; rate: number; hasil: number }> = [];
  if (sProrata) {
    for (let r = 2; r <= sProrata.rowCount; r++) {
      const row = sProrata.getRow(r);
      const nama = cleanStr(row.getCell(2).value);
      const hariAcuan = parseNum(row.getCell(3).value) || 22;
      const hadir = parseNum(row.getCell(4).value) || 22;
      const rate = parseNum(row.getCell(5).value);
      const hasil = parseNum(row.getCell(6).value);
      if (nama) {
        prorataList.push({ nama, hariAcuan, hadir, rate, hasil });
      }
    }
  }

  // 8. Impor Pengajuan Invoicing (Sheet: Pengajuan Invoicing)
  // Col 1: id, Col 2: periode, Col 3: nomor po, Col 4: klien, Col 5: dpp tagihan, Col 6: selisih gr, Col 7: status
  console.log("-> 7. Mengimpor Pengajuan Invoicing, Detail Prorata, Faktur Pajak & Pelunasan...");
  const sPengajuan = workbook.getWorksheet("Pengajuan Invoicing");
  let pengajuanCount = 0;
  let pembayaranCount = 0;

  if (sPengajuan) {
    for (let r = 2; r <= sPengajuan.rowCount; r++) {
      const row = sPengajuan.getRow(r);
      const refId = parseNum(row.getCell(1).value);
      const periodeRaw = parseDateStr(row.getCell(2).value);
      const nomorPoRaw = cleanStr(row.getCell(3).value);
      const klienRaw = cleanStr(row.getCell(4).value);
      const dppTagihan = parseNum(row.getCell(5).value);
      const statusRaw = cleanStr(row.getCell(7).value).toLowerCase();

      if (!refId && !nomorPoRaw) continue;

      const idxRef = refId || (r - 1);
      const fpInfo = fpByRef[idxRef];
      const agingInfo = agingByRef[idxRef];
      const pphInfo = pphByRef[idxRef];
      const prorataItem = prorataList[idxRef - 1];

      const periode = periodeRaw.slice(0, 7) || "2026-09";

      let targetPo = poMap[nomorPoRaw];
      if (!targetPo) {
        for (const [key, val] of Object.entries(poMap)) {
          if (key.startsWith(nomorPoRaw) || key.includes(nomorPoRaw)) {
            targetPo = val;
            break;
          }
        }
      }
      if (!targetPo) {
        targetPo = Object.values(poMap)[0];
      }

      const userXlId = userXlList[(idxRef - 1) % userXlList.length]?.id || userXlList[0]?.id;

      const nomorInvoice = fpInfo?.noInvoice || agingInfo?.noInvoice || `INV-IDS/${idxRef}/2026`;
      const nomorFakturPajak = fpInfo?.noFaktur || `04002600${100000000 + idxRef}`;
      const tanggalFakturPajak = fpInfo?.tglFaktur || "2026-08-15";
      const tanggalSubmitInvoice = "2026-08-10";
      const tanggalApproveInvoice = "2026-08-15";
      const nilaiGrDisetujui = dppTagihan > 0 ? dppTagihan.toFixed(2) : (fpInfo?.dpp ? fpInfo.dpp.toFixed(2) : "50000000.00");

      const [ajuan] = await db.insert(pengajuan).values({
        periode,
        poId: targetPo.id,
        userXlId,
        status: "diajukan",
        versi: 1,
        nomorInvoice,
        nomorFakturPajak,
        tanggalFakturPajak,
        tanggalSubmitInvoice,
        tanggalApproveInvoice,
        nilaiGrDisetujui,
        selisihGr: "0.00",
        tarifPpn: "11.00",
        tanggalSubmitCac: "2026-08-01",
        tanggalCacApproved: "2026-08-05",
        tanggalRequestGr: "2026-08-06",
        tanggalGrDisetujui: "2026-08-08",
        nomorGrSlip: `GR-${idxRef}-2026`,
      }).returning();

      // Tambahkan Pengajuan Detail
      const pTalenta = prorataItem ? personelMap[prorataItem.nama] : Object.values(personelMap)[(idxRef - 1) % Object.values(personelMap).length];
      const pId = pTalenta ? pTalenta.id : Object.values(personelMap)[0]?.id;
      const rateDipakai = prorataItem?.rate ? prorataItem.rate.toFixed(2) : (pTalenta?.rate || "25000000.00");
      const hasilHitung = prorataItem?.hasil ? prorataItem.hasil.toFixed(2) : nilaiGrDisetujui;

      await db.insert(pengajuanDetail).values({
        pengajuanId: ajuan.id,
        personelId: pId,
        hariKerjaAcuanBulan: prorataItem?.hariAcuan || 22,
        hariKerjaDapatDitagihkan: prorataItem?.hadir || 22,
        nilaiRateDipakai: rateDipakai,
        hasilHitung: hasilHitung,
        nilaiPenuh: rateDipakai,
        poLineItemId: targetPo.lineItemId,
        sumberHitung: "timesheet",
      });

      // Konfirmasi, Review & Dokumen
      await db.insert(konfirmasi).values({
        pengajuanId: ajuan.id,
        userId: petugasUser.id,
        versiDikonfirmasi: 1,
      });

      await db.insert(checkerReview).values({
        pengajuanId: ajuan.id,
        userId: checkerUser.id,
        hasil: "siap_diajukan",
        catatan: "Dokumen CAC/BAST lengkap dan lolos verifikasi.",
      });

      const jenisDok = targetPo.klien.toLowerCase().includes("xl") ? "CAC" : "BAST";
      await db.insert(dokumen).values({
        pengajuanId: ajuan.id,
        jenis: jenisDok,
        versi: 1,
        status: "final",
      });

      pengajuanCount++;

      // Tambahkan Pembayaran / Pelunasan PPh 23 (MVP 5)
      if (pphInfo && pphInfo.masukRekening > 0) {
        const isDiverifikasi = pphInfo.status.toLowerCase().includes("diverifikasi") && !pphInfo.status.toLowerCase().includes("wait");
        const statusBayar = isDiverifikasi ? "diverifikasi" : "menunggu_verifikasi";

        await db.insert(pembayaran).values({
          pengajuanId: ajuan.id,
          tanggalBayar: pphInfo.tglBayar,
          nominalDiterima: pphInfo.masukRekening.toFixed(2),
          potonganPph23: pphInfo.pph23.toFixed(2),
          nomorBupotPph23: `BP-23-${1000 + idxRef}`,
          biayaAdminBank: pphInfo.biayaBank.toFixed(2),
          bankTujuan: "BCA PT IDStar Cipta Teknologi",
          nomorReferensiBank: `TRX-BCA-2026-${100000 + idxRef}`,
          status: statusBayar,
          catatan: `Pelunasan Invoice ${nomorInvoice} (${pphInfo.status})`,
          diinputOlehUserId: petugasUser.id,
          diverifikasiOlehUserId: isDiverifikasi ? checkerUser.id : null,
          diverifikasiPada: isDiverifikasi ? pphInfo.tglBayar : null,
        });

        pembayaranCount++;
      }
    }
  }

  console.log(`✓ ${pengajuanCount} Pengajuan & Dokumen berhasil dibuat.`);
  console.log(`✓ ${pembayaranCount} Catatan Pelunasan & PPh 23 (MVP 5) berhasil dicatat.\n`);

  // 9. Catat Audit Log
  await db.insert(auditLog).values({
    entitas: "sistem",
    entitasId: 1,
    userId: petugasUser.id,
    perubahan: "Impor komprehensif master data & transaksi dari Dummy Data.xlsx (MVP 1 - MVP 5)",
  });

  console.log("==================================================================");
  console.log("   DATA DUMMY BERHASIL DI-IMPORT & DATABASE SIAP DIGUNAKAN!        ");
  console.log("==================================================================");
  process.exit(0);
}

main().catch((err) => {
  console.error("Gagal melakukan impor data:", err);
  process.exit(1);
});
