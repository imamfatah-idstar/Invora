import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { po } from "@/db/schema";
import { eq } from "drizzle-orm";
import { wajibRoleApi } from "@/lib/require-role-api";
import { userSaatIni } from "@/lib/session-server";
import { catatAudit } from "@/lib/audit";
import { parseCsvPo, parseXlsxPo } from "@/lib/po-impor";

const UKURAN_MAKS = 10 * 1024 * 1024; // 10MB

// POST /api/po/impor — impor massal PO dari file CSV/XLSX (bagian 38-39),
// alternatif dari isi manual satu-satu lewat FormTambahPo. Nomor PO yang
// belum ada -> ditambah baru. saldoSebelumPpn awal ikut kolom Outstanding/
// Saldo Sebelum PPN dari file kalau ada (format tracker PO, bagian 39 —
// supaya PO yang sudah terpakai sebagian/penuh tidak diimpor sebagai masih
// penuh); fallback ke nilaiItem penuh kalau file tidak punya kolom itu, sama
// seperti tambah manual. Nomor PO yang SUDAH ada -> nama proyek, tahun,
// nilai GR, dan tanggal PO-nya diperbarui dari file (sesuai keputusan
// pengguna), TAPI nilaiItem & saldoSebelumPpn TIDAK disentuh — dua field itu
// dirawat manual lewat saldo berjalan (lihat halaman Edit PO), menimpanya
// dari file bisa menghapus jejak saldo yang sudah dipakai pengajuan berjalan.
export async function POST(request: NextRequest) {
  const gagal = await wajibRoleApi(["petugas"]);
  if (gagal) return gagal;
  const user = await userSaatIni();

  const form = await request.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "Data form tidak valid." }, { status: 400 });

  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "File wajib diunggah." }, { status: 400 });
  if (file.size > UKURAN_MAKS) return NextResponse.json({ error: "Ukuran file maksimal 10MB." }, { status: 400 });

  const namaFile = file.name.toLowerCase();
  let hasilParse;
  try {
    if (namaFile.endsWith(".csv")) {
      hasilParse = parseCsvPo(await file.text());
    } else if (namaFile.endsWith(".xlsx")) {
      hasilParse = await parseXlsxPo(Buffer.from(await file.arrayBuffer()));
    } else {
      return NextResponse.json({ error: "Format file harus .csv atau .xlsx." }, { status: 400 });
    }
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? `Gagal membaca file: ${e.message}` : "Gagal membaca file." }, { status: 400 });
  }

  const { valid, gagal: barisGagal } = hasilParse;
  if (valid.length === 0 && barisGagal.length === 0) {
    return NextResponse.json({ error: "File tidak berisi baris data. Pastikan ada header (Nomor PO, Nama Proyek, Nilai Item, dst.) dan minimal 1 baris data." }, { status: 400 });
  }

  const tahunSekarang = new Date().getFullYear();
  const daftarPoAda = await db.select().from(po);
  const petaPo = new Map(daftarPoAda.map((p) => [p.nomorPo.trim().toLowerCase(), p]));

  let poBaru = 0, poDiperbarui = 0;
  const catatanGagal: string[] = barisGagal.map((g) => `Baris ${g.baris}: ${g.alasan}`);

  // Dedupe dalam file itu sendiri (kalau ada nomor PO berulang) — ambil baris
  // terakhir, sama seperti pola impor Integral.
  const perNomor = new Map<string, (typeof valid)[number]>();
  for (const b of valid) perNomor.set(b.nomorPo.trim().toLowerCase(), b);

  for (const [nomorLower, b] of perNomor) {
    const existing = petaPo.get(nomorLower);
    if (!existing) {
      const [baru] = await db.insert(po).values({
        nomorPo: b.nomorPo,
        namaProyek: b.namaProyek,
        tahun: b.tahun ?? tahunSekarang,
        nilaiItem: b.nilaiItem,
        // Kalau file punya kolom Outstanding/Saldo Sebelum PPN sendiri (format
        // tracker PO — lihat lib/po-impor.ts), pakai itu supaya PO yang sudah
        // terpakai sebagian/penuh saat diimpor TIDAK dianggap masih penuh.
        // Kalau file tidak punya kolom itu (format sederhana), fallback ke
        // nilaiItem penuh — sama seperti tambah manual.
        saldoSebelumPpn: b.saldoSebelumPpn ?? b.nilaiItem,
        nilaiGr: b.nilaiGr ?? "0.00",
        tanggalPo: b.tanggalPo,
      }).returning();
      petaPo.set(nomorLower, baru);
      poBaru++;
    } else {
      await db.update(po).set({
        namaProyek: b.namaProyek,
        tahun: b.tahun ?? existing.tahun,
        nilaiGr: b.nilaiGr ?? existing.nilaiGr,
        tanggalPo: b.tanggalPo ?? existing.tanggalPo,
      }).where(eq(po.id, existing.id));
      poDiperbarui++;
    }
  }

  await catatAudit({
    entitas: "po", entitasId: 0, userId: user!.id,
    perubahan: `Impor massal PO dari file "${file.name}": ${poBaru} PO baru, ${poDiperbarui} PO diperbarui, ${catatanGagal.length} baris dilewati (dari ${perNomor.size + barisGagal.length} baris data)`,
  });

  return NextResponse.json({
    ok: true,
    totalBarisData: perNomor.size + barisGagal.length,
    poBaru, poDiperbarui,
    dilewati: catatanGagal.length,
    catatanGagal: catatanGagal.slice(0, 20),
  });
}
