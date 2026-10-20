import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { pengajuan, grRequest, po } from "@/db/schema";
import { eq } from "drizzle-orm";
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
    .select({ id: pengajuan.id, klien: po.klien })
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
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "Tidak ada field yang dikirim." }, { status: 400 });
  }

  await db.update(pengajuan).set(patch).where(eq(pengajuan.id, pengajuanId));

  const ringkasan = Object.entries(patch).map(([k, v]) => `${k}=${v ?? "(kosong)"}`).join(", ");
  await catatAudit({
    entitas: "pengajuan", entitasId: pengajuanId, userId: user!.id,
    perubahan: `Ubah status proses CAC->Invoice: ${ringkasan}`,
  });

  return NextResponse.json({ ok: true });
}
