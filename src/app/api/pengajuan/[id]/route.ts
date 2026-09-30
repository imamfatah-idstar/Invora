import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { pengajuan, pengajuanDetail, po } from "@/db/schema";
import { eq } from "drizzle-orm";
import Decimal from "decimal.js";
import { wajibRoleApi } from "@/lib/require-role-api";
import { userSaatIni } from "@/lib/session-server";
import { catatAudit } from "@/lib/audit";
import { hitungSemuaPersonelUntukPo, terapkanAlokasiLintasPo } from "@/lib/hitung-pengajuan";

// Edit rincian pengajuan (pilihan personel) — HANYA boleh saat status "perlu_revisi".
// Periode, PO, dan User XL tidak bisa diubah di sini (sesuai lingkup MVP 1: satu
// periode + satu PO + satu User XL per pengajuan). Perhitungan selalu dihitung
// ulang di server dari data rate card / kalender / pemetaan TERKINI, tidak
// percaya angka kiriman client. Setelah disimpan, status TETAP "perlu_revisi" —
// petugas harus menekan "Konfirmasi Pengajuan Ini" lagi secara terpisah supaya
// tetap ada jejak konfirmasi eksplisit untuk versi yang baru.
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const gagal = await wajibRoleApi(["petugas"]);
  if (gagal) return gagal;
  const user = await userSaatIni();
  const { id } = await params;
  const pengajuanId = Number(id);

  const [ajuan] = await db.select().from(pengajuan).where(eq(pengajuan.id, pengajuanId));
  if (!ajuan) {
    return NextResponse.json({ error: "Pengajuan tidak ditemukan." }, { status: 404 });
  }
  if (ajuan.status !== "perlu_revisi") {
    return NextResponse.json(
      { error: `Tidak bisa diedit — status saat ini "${ajuan.status}", harus "perlu_revisi".` },
      { status: 409 }
    );
  }

  const [poRow] = await db.select().from(po).where(eq(po.id, ajuan.poId));
  if (!poRow) {
    return NextResponse.json({ error: "PO pada pengajuan ini tidak ditemukan." }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const personelIds: number[] = Array.isArray(body?.personelIds) ? body.personelIds : [];

  const semuaBaris = await hitungSemuaPersonelUntukPo(ajuan.poId, ajuan.periode);
  // Alokasi lintas-PO (bagian 35) — pengajuan_detail milik pengajuan ini sendiri
  // sudah otomatis dikecualikan dari dedup karena masih di PO yang sama.
  const teralokasi = await terapkanAlokasiLintasPo(semuaBaris, ajuan.poId, ajuan.periode, poRow.saldoSebelumPpn);
  const dipilih = teralokasi.filter((b) => personelIds.includes(b.personelId));

  if (dipilih.length === 0) {
    return NextResponse.json({ error: "Pilih minimal 1 personel." }, { status: 400 });
  }
  const adaError = dipilih.find((b) => b.error);
  if (adaError) {
    return NextResponse.json(
      { error: `Tidak bisa disimpan — ${adaError.namaPersonel}: ${adaError.error}` },
      { status: 400 }
    );
  }
  const tidakBisaDitagih = dipilih.find(
    (b) => b.sudahLunasBulanIni || !b.akanDitagihkan || new Decimal(b.akanDitagihkan).lessThanOrEqualTo(0)
  );
  if (tidakBisaDitagih) {
    const alasan = tidakBisaDitagih.sudahLunasBulanIni
      ? "sudah lunas ditagihkan penuh di PO lain untuk periode ini"
      : "saldo PO ini sudah habis untuk menampung sisa tagihannya";
    return NextResponse.json(
      { error: `Tidak bisa disimpan — ${tidakBisaDitagih.namaPersonel} ${alasan}. Hapus centang personel ini dulu.` },
      { status: 400 }
    );
  }

  const totalPengajuan = dipilih.reduce(
    (total, b) => total.plus(new Decimal(b.akanDitagihkan!)),
    new Decimal(0)
  );
  const saldo = new Decimal(poRow.saldoSebelumPpn);
  if (totalPengajuan.greaterThan(saldo)) {
    return NextResponse.json(
      { error: `Total pengajuan (${totalPengajuan.toFixed(2)}) melebihi saldo PO sebelum PPN yang tersisa (${saldo.toFixed(2)}).` },
      { status: 409 }
    );
  }

  await db.delete(pengajuanDetail).where(eq(pengajuanDetail.pengajuanId, pengajuanId));
  for (const b of dipilih) {
    await db.insert(pengajuanDetail).values({
      pengajuanId,
      personelId: b.personelId,
      hariKerjaDapatDitagihkan: b.hariKerjaDapatDitagihkan!,
      hariKerjaAcuanBulan: b.hariKerjaAcuanBulan!,
      nilaiRateDipakai: b.nilaiRateDipakai!,
      hasilHitung: b.akanDitagihkan!,
      nilaiPenuh: b.nilaiPenuh,
      sumberHitung: b.sumberHitung,
    });
  }

  const versiBaru = ajuan.versi + 1;
  await db.update(pengajuan).set({ versi: versiBaru }).where(eq(pengajuan.id, pengajuanId));

  await catatAudit({
    entitas: "pengajuan", entitasId: pengajuanId,
    perubahan: `Revisi rincian (versi ${versiBaru}) total=${totalPengajuan.toFixed(2)} (${dipilih.length} personel) — status tetap perlu_revisi, menunggu konfirmasi ulang petugas`,
    userId: user!.id,
  });

  return NextResponse.json({ ok: true, versi: versiBaru });
}
