import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { db } from "@/db";
import { pengajuan, pengajuanDetail, personel, po, pemetaanPersonelPo } from "@/db/schema";
import { eq } from "drizzle-orm";
import { wajibRoleApi } from "@/lib/require-role-api";

// Download Excel rekonsiliasi invoice (bagian 48) — satu baris per
// personel+PO+PERIODE yang pernah diajukan (grain = pengajuan_detail),
// supaya status "sudah/belum diinvoice" akurat per bulan, bukan cuma per
// penempatan personel-PO. Dipakai untuk rekon Finance: mana yang sudah
// diinvoice (No Invoice terisi) dan mana yang belum.

function cariRentangSpk(
  daftarPemetaan: { personelId: number; poId: number; berlakuDari: string; berlakuSampai: string | null }[],
  personelId: number, poId: number, periode: string,
) {
  const kandidat = daftarPemetaan.filter((m) => m.personelId === personelId && m.poId === poId);
  if (kandidat.length === 0) return { mulai: null, berakhir: null };
  const periodeAwal = `${periode}-01`;
  const [tahun, bulan] = periode.split("-").map(Number);
  const periodeAkhir = new Date(Date.UTC(tahun, bulan, 0)).toISOString().slice(0, 10);
  const aktifSelamaPeriode = kandidat.filter(
    (m) => m.berlakuDari <= periodeAkhir && (m.berlakuSampai === null || m.berlakuSampai >= periodeAwal)
  );
  const sumber = aktifSelamaPeriode.length > 0 ? aktifSelamaPeriode : kandidat;
  sumber.sort((a, b) => b.berlakuDari.localeCompare(a.berlakuDari));
  return { mulai: sumber[0].berlakuDari, berakhir: sumber[0].berlakuSampai };
}

export async function GET() {
  const gagal = await wajibRoleApi(["petugas", "checker"]);
  if (gagal) return gagal;

  const baris = await db
    .select({
      namaPersonel: personel.nama,
      klien: po.klien,
      nomorPo: po.nomorPo,
      periode: pengajuan.periode,
      nilaiRateDipakai: pengajuanDetail.nilaiRateDipakai,
      tanggalSubmitInvoice: pengajuan.tanggalSubmitInvoice,
      nomorInvoice: pengajuan.nomorInvoice,
      personelId: personel.id,
      poId: po.id,
    })
    .from(pengajuanDetail)
    .innerJoin(pengajuan, eq(pengajuanDetail.pengajuanId, pengajuan.id))
    .innerJoin(personel, eq(pengajuanDetail.personelId, personel.id))
    .innerJoin(po, eq(pengajuan.poId, po.id));

  const daftarPemetaan = await db
    .select({ personelId: pemetaanPersonelPo.personelId, poId: pemetaanPersonelPo.poId, berlakuDari: pemetaanPersonelPo.berlakuDari, berlakuSampai: pemetaanPersonelPo.berlakuSampai })
    .from(pemetaanPersonelPo);

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Rekon Invoice");
  sheet.columns = [
    { header: "Nama Talent", key: "namaTalent", width: 28 },
    { header: "Nama Klien", key: "namaKlien", width: 30 },
    { header: "No PO", key: "noPo", width: 22 },
    { header: "Periode", key: "periode", width: 12 },
    { header: "Rate Card", key: "rateCard", width: 18 },
    { header: "Tgl Mulai SPK", key: "tglMulaiSpk", width: 14 },
    { header: "Tgl Berakhir SPK", key: "tglBerakhirSpk", width: 16 },
    { header: "Tgl Invoice", key: "tglInvoice", width: 14 },
    { header: "No Invoice", key: "noInvoice", width: 22 },
    { header: "Status", key: "status", width: 16 },
  ];
  sheet.getRow(1).font = { bold: true };

  for (const b of baris.sort((a, b) => a.namaPersonel.localeCompare(b.namaPersonel, "id") || a.periode.localeCompare(b.periode))) {
    const spk = cariRentangSpk(daftarPemetaan, b.personelId, b.poId, b.periode);
    sheet.addRow({
      namaTalent: b.namaPersonel,
      namaKlien: b.klien ?? "-",
      noPo: b.nomorPo,
      periode: b.periode,
      rateCard: Number(b.nilaiRateDipakai),
      tglMulaiSpk: spk.mulai ?? "-",
      tglBerakhirSpk: spk.berakhir ?? "masih berlaku",
      tglInvoice: b.tanggalSubmitInvoice ?? "-",
      noInvoice: b.nomorInvoice ?? "-",
      status: b.nomorInvoice ? "Sudah Diinvoice" : "Belum Diinvoice",
    });
  }
  sheet.getColumn("rateCard").numFmt = "#,##0.00";

  const buffer = await workbook.xlsx.writeBuffer();
  return new NextResponse(buffer as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="rekon-invoice-${new Date().toISOString().slice(0, 10)}.xlsx"`,
    },
  });
}
