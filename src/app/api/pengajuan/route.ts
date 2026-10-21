import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { pengajuan, pengajuanDetail, po } from "@/db/schema";
import { eq } from "drizzle-orm";
import Decimal from "decimal.js";
import { wajibRoleApi } from "@/lib/require-role-api";
import { userSaatIni } from "@/lib/session-server";
import { catatAudit } from "@/lib/audit";
import { hitungSemuaPersonelUntukPo, terapkanAlokasiLintasPo, siapkanTagihanTahap } from "@/lib/hitung-pengajuan";

export async function POST(request: NextRequest) {
  const gagal = await wajibRoleApi(["petugas"]);
  if (gagal) return gagal;
  const user = await userSaatIni();

  const body = await request.json().catch(() => null);
  if (!body?.poId || !body?.userXlId || !body?.periode) {
    return NextResponse.json({ error: "PO, User XL, dan periode wajib diisi." }, { status: 400 });
  }

  const [poRow] = await db.select().from(po).where(eq(po.id, Number(body.poId)));
  if (!poRow) {
    return NextResponse.json({ error: "PO tidak ditemukan." }, { status: 404 });
  }

  // PO "tahap" (bagian 53): nilai tagihan diisi MANUAL per personel + keterangan
  // tahap (keputusan bagian 41). Tidak ada hitung prorata / alokasi lintas-PO.
  if (poRow.jenisTagihan === "tahap") {
    const keteranganTahap = typeof body.keteranganTahap === "string" ? body.keteranganTahap.trim() : "";
    if (!keteranganTahap) {
      return NextResponse.json({ error: "Keterangan tahap wajib diisi (mis. \"Tahap I (50%)\")." }, { status: 400 });
    }
    const siap = await siapkanTagihanTahap(Number(body.poId), body.periode, body.nilaiManual, poRow.saldoSebelumPpn);
    if ("error" in siap) return NextResponse.json({ error: siap.error }, { status: 400 });

    const [ajuanTahap] = await db.insert(pengajuan).values({
      periode: body.periode,
      poId: Number(body.poId),
      userXlId: Number(body.userXlId),
      status: "draft",
      keteranganTahap,
    }).returning();
    for (const b of siap.baris) {
      await db.insert(pengajuanDetail).values({
        pengajuanId: ajuanTahap.id,
        personelId: b.personelId,
        hariKerjaDapatDitagihkan: 0,
        hariKerjaAcuanBulan: 0,
        nilaiRateDipakai: b.nilaiRateAcuan,
        hasilHitung: b.nilai,
        nilaiPenuh: b.nilai,
        poLineItemId: b.poLineItemId,
        sumberHitung: "manual",
      });
    }
    await catatAudit({
      entitas: "pengajuan", entitasId: ajuanTahap.id,
      perubahan: `Buat pengajuan draft TAHAP "${keteranganTahap}" periode=${ajuanTahap.periode} po=${poRow.nomorPo} total=${siap.total.toFixed(2)} (${siap.baris.length} personel, nilai manual)`,
      userId: user!.id,
    });
    return NextResponse.json({ id: ajuanTahap.id }, { status: 201 });
  }

  const semuaBaris = await hitungSemuaPersonelUntukPo(Number(body.poId), body.periode);
  // Alokasi lintas-PO (bagian 35) — dihitung ulang di server, tidak percaya
  // angka akanDitagihkan kiriman client (kalau ada).
  const teralokasi = await terapkanAlokasiLintasPo(
    semuaBaris, Number(body.poId), body.periode, poRow.saldoSebelumPpn
  );
  const dipilih = teralokasi.filter((b) => (body.personelIds ?? []).includes(b.personelId));

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
  // Personel yang sudah lunas bulan ini (semua nilainya sudah tertagih di PO
  // lain) atau yang saldo PO ini sudah habis sehingga akanDitagihkan = 0
  // tidak boleh disertakan — minta petugas untuk deselect dulu.
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

  // MVP 4: Cek apakah ada Deficiency GR (selisih GR) dari pengajuan sebelumnya
  // yang belum pernah diserap (one-time carry-over).
  const { cariSelisihGrMenggantung } = await import("@/lib/deficiency-gr-server");
  const selisihMenggantung = await cariSelisihGrMenggantung(Number(body.poId));

  const [ajuan] = await db.insert(pengajuan).values({
    periode: body.periode,
    poId: Number(body.poId),
    userXlId: Number(body.userXlId),
    status: "draft",
    penyesuaianSelisihGrMasuk: selisihMenggantung ? selisihMenggantung.nominal : null,
    // Alokasi lintas-PO (bagian 35) — pencatatan internal opsional dari
    // approval User XL yang terjadi di luar aplikasi (email/WhatsApp).
    approvalAlokasiUserXlPemberi: body.approvalAlokasiUserXlPemberi || null,
    approvalAlokasiTanggal: body.approvalAlokasiTanggal || null,
    approvalAlokasiReferensi: body.approvalAlokasiReferensi || null,
  }).returning();

  // Kunci pengajuan sumber selisih agar tidak terbawa dua kali (one-time carry over)
  if (selisihMenggantung) {
    await db
      .update(pengajuan)
      .set({ selisihGrDipakaiPadaPengajuanId: ajuan.id })
      .where(eq(pengajuan.id, selisihMenggantung.sumberPengajuanId));
  }

  for (const b of dipilih) {
    await db.insert(pengajuanDetail).values({
      pengajuanId: ajuan.id,
      personelId: b.personelId,
      hariKerjaDapatDitagihkan: b.hariKerjaDapatDitagihkan!,
      hariKerjaAcuanBulan: b.hariKerjaAcuanBulan!,
      nilaiRateDipakai: b.nilaiRateDipakai!,
      hasilHitung: b.akanDitagihkan!,
      nilaiPenuh: b.nilaiPenuh,
      poLineItemId: b.poLineItemId,
      sumberHitung: b.sumberHitung,
    });
  }

  const ketCarryOver = selisihMenggantung
    ? ` + penyesuaian selisih GR dari pengajuan #${selisihMenggantung.sumberPengajuanId} sebesar Rp${selisihMenggantung.nominal}`
    : "";

  await catatAudit({
    entitas: "pengajuan", entitasId: ajuan.id,
    perubahan: `Buat pengajuan draft periode=${ajuan.periode} po=${poRow.nomorPo} total=${totalPengajuan.toFixed(2)} (${dipilih.length} personel)${ketCarryOver}`,
    userId: user!.id,
  });

  return NextResponse.json({ id: ajuan.id }, { status: 201 });
}
