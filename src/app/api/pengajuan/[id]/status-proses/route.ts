import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { pengajuan, pengajuanDetail, grRequest, po } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import Decimal from "decimal.js";
import { wajibRoleApi } from "@/lib/require-role-api";
import { userSaatIni } from "@/lib/session-server";
import { catatAudit } from "@/lib/audit";
import { tanggalValidAtauKosong } from "@/lib/validasi";
import { apakahKlienXl } from "@/lib/klien";

// Field manual di kartu "Status Proses CAC -> Invoice". tanggalSubmitCac SENGAJA
// tidak ada di sini — itu diisi otomatis oleh sistem saat Checker meloloskan
// pengajuan (lihat /api/pengajuan/[id]/checker). Lihat PROJECT_INSTRUCTIONS.md
// bagian 26.
const FIELD_DIIZINKAN = [
  "tanggalCacApproved",
  "tanggalRequestGr",
  "tanggalGrDisetujui",
  "tanggalSubmitInvoice",
  "tanggalApproveInvoice",
] as const;

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const gagal = await wajibRoleApi(["petugas", "checker"]);
  if (gagal) return gagal;
  const user = await userSaatIni();
  const { id } = await params;
  const pengajuanId = Number(id);

  const [ajuan] = await db
    .select({ id: pengajuan.id, poId: pengajuan.poId, klien: po.klien })
    .from(pengajuan)
    .innerJoin(po, eq(pengajuan.poId, po.id))
    .where(eq(pengajuan.id, pengajuanId));
  if (!ajuan) return NextResponse.json({ error: "Pengajuan tidak ditemukan." }, { status: 404 });

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Data tidak valid." }, { status: 400 });
  }

  const patch: Record<string, string | null> = {};
  for (const field of FIELD_DIIZINKAN) {
    if (!(field in body)) continue;
    const nilai = body[field] === "" ? null : body[field];
    if (!tanggalValidAtauKosong(nilai)) {
      return NextResponse.json({ error: `Tanggal tidak valid untuk field "${field}".` }, { status: 400 });
    }
    patch[field] = nilai;
  }

  // nomorGrSlip: teks nomor dokumen GR resmi dari klien/COUPA
  if ("nomorGrSlip" in body) {
    const raw = typeof body.nomorGrSlip === "string" ? body.nomorGrSlip.trim() : "";
    patch.nomorGrSlip = raw === "" ? null : raw;
  }

  // nomorInvoice: teks manual (bukan tanggal) — sumber penomorannya di luar
  // aplikasi ini (satu urutan bersama semua customer). Lihat bagian 30.
  if ("nomorInvoice" in body) {
    const nilai = typeof body.nomorInvoice === "string" ? body.nomorInvoice.trim() : "";
    // Validasi bagian 34 & bagian 45: untuk klien XL, nomor invoice tidak boleh diisi sebelum GR Request
    // dikonfirmasi "sudah dicek" oleh Checker. Untuk klien Non-XL, GR Request di-skip total.
    if (nilai !== "") {
      const isKlienXl = apakahKlienXl(ajuan.klien);
      if (isKlienXl) {
        const [grRow] = await db.select({ dicekPada: grRequest.dicekPada }).from(grRequest).where(eq(grRequest.pengajuanId, pengajuanId));
        if (!grRow || !grRow.dicekPada) {
          return NextResponse.json(
            { error: "Nomor invoice belum bisa diisi — GR Request untuk pengajuan ini belum dikonfirmasi 'sudah dicek' oleh Checker." },
            { status: 409 }
          );
        }
      }
    }
    patch.nomorInvoice = nilai === "" ? null : nilai;
  }

  // MVP 4: Nilai GR Aktual yang disetujui klien & kalkulasi otomatis Deficiency GR
  if ("nilaiGrDisetujui" in body) {
    const raw = typeof body.nilaiGrDisetujui === "string" ? body.nilaiGrDisetujui.trim() : String(body.nilaiGrDisetujui ?? "");
    if (raw === "") {
      patch.nilaiGrDisetujui = null;
      patch.selisihGr = null;
    } else {
      const valNum = Number(raw.replace(/[^0-9.]/g, ""));
      if (isNaN(valNum) || valNum < 0) {
        return NextResponse.json({ error: "Nilai GR disetujui harus berupa angka positif." }, { status: 400 });
      }
      const grDec = new Decimal(valNum);
      patch.nilaiGrDisetujui = grDec.toFixed(2);

      // Hitung total pengajuan untuk menentukan Deficiency GR (Selisih)
      const detailList = await db
        .select({ hasilHitung: pengajuanDetail.hasilHitung })
        .from(pengajuanDetail)
        .where(eq(pengajuanDetail.pengajuanId, pengajuanId));
      const totalPengajuan = detailList.reduce(
        (acc, d) => acc.plus(new Decimal(d.hasilHitung)),
        new Decimal(0)
      );

      // Selisih = Total Pengajuan - Nilai GR Disetujui
      // Selisih > 0 : Kekurangan GR (akan menambah tagihan berikutnya)
      // Selisih < 0 : Kelebihan GR (akan mengurangi tagihan berikutnya)
      patch.selisihGr = totalPengajuan.minus(grDec).toFixed(2);
    }
  }

  // MVP 4: Faktur Pajak Resmi & Tarif PPN
  if ("nomorFakturPajak" in body) {
    const raw = typeof body.nomorFakturPajak === "string" ? body.nomorFakturPajak.trim() : "";
    patch.nomorFakturPajak = raw === "" ? null : raw;
  }
  if ("tanggalFakturPajak" in body) {
    const raw = body.tanggalFakturPajak === "" ? null : body.tanggalFakturPajak;
    if (!tanggalValidAtauKosong(raw)) {
      return NextResponse.json({ error: "Tanggal faktur pajak tidak valid." }, { status: 400 });
    }
    patch.tanggalFakturPajak = raw;
  }
  if ("tarifPpn" in body) {
    const raw = typeof body.tarifPpn === "string" ? body.tarifPpn.trim() : String(body.tarifPpn || "");
    patch.tarifPpn = raw || "11.00";
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "Tidak ada field yang dikirim." }, { status: 400 });
  }

  await db.update(pengajuan).set(patch).where(eq(pengajuan.id, pengajuanId));

  // MVP 4: Perbarui total kumulatif nilaiGr di tabel PO dan cek status penutupan PO (Closing PO)
  if (patch.nilaiGrDisetujui !== undefined) {
    const [poRow] = await db.select({ id: po.id, nilaiItem: po.nilaiItem }).from(po).where(eq(po.id, ajuan.poId));
    if (poRow) {
      const semuaGr = await db
        .select({ nilaiGrDisetujui: pengajuan.nilaiGrDisetujui })
        .from(pengajuan)
        .where(and(eq(pengajuan.poId, poRow.id), sql`${pengajuan.nilaiGrDisetujui} IS NOT NULL`));

      const totalGrKumulatif = semuaGr.reduce(
        (acc, g) => acc.plus(new Decimal(g.nilaiGrDisetujui!)),
        new Decimal(0)
      );

      // Cek apakah total realisasi GR sudah mencapai nilai pagu PO (Closing PO)
      const isClosed = totalGrKumulatif.greaterThanOrEqualTo(new Decimal(poRow.nilaiItem));
      await db.update(po).set({
        nilaiGr: totalGrKumulatif.toFixed(2),
        statusPo: isClosed ? "selesai" : "aktif",
      }).where(eq(po.id, poRow.id));
    }
  }

  const ringkasan = Object.entries(patch).map(([k, v]) => `${k}=${v ?? "(kosong)"}`).join(", ");
  await catatAudit({
    entitas: "pengajuan", entitasId: pengajuanId, userId: user!.id,
    perubahan: `Ubah status proses & data GR/Invoice MVP 4: ${ringkasan}`,
  });

  return NextResponse.json({ ok: true, patch });
}
