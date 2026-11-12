import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { personel, rateCard, po, pemetaanPersonelPo } from "@/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { wajibRoleApi } from "@/lib/require-role-api";
import { userSaatIni } from "@/lib/session-server";
import { catatAudit } from "@/lib/audit";
import { parseCsv, csvKeObjek } from "@/lib/csv";

const UKURAN_MAKS = 10 * 1024 * 1024; // 10MB

// Bagian 40-42: impor Integral sekarang mencakup SEMUA klien (bukan cuma
// personel berpenempatan XL seperti sebelumnya di bagian 26). Filter
// PLACEMENT_XL lama sudah dihapus. Yang membedakan proses XL vs non-XL
// bukan lagi difilter saat impor, tapi ditentukan lewat po.klien +
// apakahKlienXl() saat pengajuan/CAC/BAST diproses (lihat src/lib/klien.ts).

function hariSebelum(tanggalISO: string): string {
  const d = new Date(tanggalISO + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

// File Integral pakai format tanggal "DD/MM/YYYY" (mis. "01/08/2025") atau
// format ISO "YYYY-MM-DD" (mis. "2026-09-01") di kolom spk_start_date.
// Null/format tak dikenali -> null (pemanggil fallback ke hariIni).
function parseTanggalIntegral(nilai: string | undefined): string | null {
  if (!nilai) return null;
  const teks = nilai.trim();
  if (!teks) return null;

  // Format ISO / SQL: YYYY-MM-DD atau YYYY/MM/DD
  const mIso = teks.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (mIso) {
    const [, yyyy, mm, dd] = mIso;
    const d = new Date(Date.UTC(Number(yyyy), Number(mm) - 1, Number(dd)));
    if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  }

  // Format DD/MM/YYYY atau DD-MM-YYYY
  const m = teks.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
  if (m) {
    const [, dd, mm, yyyy] = m;
    const d = new Date(Date.UTC(Number(yyyy), Number(mm) - 1, Number(dd)));
    if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  }

  // Excel serial number jika ada
  if (/^\d+(\.\d+)?$/.test(teks) && Number(teks) > 20000 && Number(teks) < 80000) {
    const epoch = new Date(Date.UTC(1899, 11, 30));
    epoch.setUTCDate(epoch.getUTCDate() + Number(teks));
    return epoch.toISOString().slice(0, 10);
  }

  return null;
}

export async function POST(request: NextRequest) {
  const gagal = await wajibRoleApi(["petugas"]);
  if (gagal) return gagal;
  const user = await userSaatIni();

  const form = await request.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "Data form tidak valid." }, { status: 400 });

  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "File CSV wajib diunggah." }, { status: 400 });
  if (file.size > UKURAN_MAKS) return NextResponse.json({ error: "Ukuran file maksimal 10MB." }, { status: 400 });
  if (!file.name.toLowerCase().endsWith(".csv")) {
    return NextResponse.json({ error: "Format harus .csv — unduh sheet Integral lewat File > Download > Comma Separated Values (.csv)." }, { status: 400 });
  }

  const teksMentah = await file.text();
  // Hilangkan UTF-8 BOM jika ada
  const teks = teksMentah.replace(/^\uFEFF/, "");
  const semuaBaris = parseCsv(teks);

  // Cari baris header: lewati baris kosong / koma kosong di atas file
  let indeksHeader = -1;
  for (let i = 0; i < semuaBaris.length; i++) {
    const barisNorm = semuaBaris[i].map((c) => c.trim().toLowerCase());
    if (barisNorm.includes("name") || (barisNorm.includes("rate_card") && barisNorm.includes("po_number"))) {
      indeksHeader = i;
      break;
    }
  }

  // Fallback jika tidak ditemukan nama kolom kunci: cari baris pertama yang memiliki sel non-kosong
  if (indeksHeader === -1) {
    indeksHeader = semuaBaris.findIndex((b) => b.some((cell) => cell.trim() !== ""));
  }

  if (indeksHeader === -1 || semuaBaris.length - indeksHeader < 2) {
    return NextResponse.json({ error: "File CSV kosong atau tidak memiliki baris data yang valid." }, { status: 400 });
  }

  const baris = semuaBaris.slice(indeksHeader);
  const headerAsli = baris[0];
  const headerNorm = headerAsli.map((h) => h.trim().toLowerCase());

  // Petakan alias header umum agar toleran terhadap variasi penamaan
  const ALIAS_HEADER: Record<string, string> = {
    nik: "nik",
    name: "name",
    nama: "name",
    personel: "name",
    talent: "name",
    type: "type",
    tipe: "type",
    position: "position",
    posisi: "position",
    jabatan: "position",
    status_code: "status_code",
    status: "status_code",
    rate_card: "rate_card",
    ratecard: "rate_card",
    rate: "rate_card",
    placement_name: "placement_name",
    placement: "placement_name",
    penempatan: "placement_name",
    client_name: "client_name",
    client: "client_name",
    klien: "client_name",
    spk_start_date: "spk_start_date",
    start_date: "spk_start_date",
    spk_actual_end_date: "spk_actual_end_date",
    end_date: "spk_actual_end_date",
    po_number: "po_number",
    ponumber: "po_number",
    no_po: "po_number",
    nomor_po: "po_number",
    spk_number: "spk_number",
    no_spk: "spk_number",
    nomor_spk: "spk_number",
  };

  const headerTerstandar = headerNorm.map((h) => ALIAS_HEADER[h] ?? h);

  for (const kolomWajib of ["name", "rate_card", "placement_name", "client_name", "spk_start_date", "po_number"]) {
    if (!headerTerstandar.includes(kolomWajib)) {
      return NextResponse.json({
        error: `Kolom "${kolomWajib}" tidak ditemukan di file. Kolom yang terdeteksi: ${headerAsli.filter((h) => h.trim()).join(", ") || "(kosong)"}`,
      }, { status: 400 });
    }
  }

  const objek = csvKeObjek([headerTerstandar, ...baris.slice(1)]);

  // Dedupe per nama (ambil baris terakhir) — sheet Integral bisa berisi baris
  // ganda untuk orang yang sama dalam satu tab.
  const perNama = new Map<string, Record<string, string>>();
  for (const r of objek) {
    const nama = r.name?.trim();
    if (!nama) continue;
    perNama.set(nama.toLowerCase(), r);
  }

  const daftarPersonel = await db.select().from(personel);
  const petaPersonel = new Map(daftarPersonel.map((p) => [p.nama.trim().toLowerCase(), p]));

  const daftarPo = await db.select().from(po);
  const petaPo = new Map(daftarPo.map((p) => [p.nomorPo.trim().toLowerCase(), p]));

  const hariIni = new Date().toISOString().slice(0, 10);
  let personelBaru = 0, rateDiperbarui = 0, tidakBerubah = 0, dilewati = 0;
  let penempatanDiperbarui = 0, klienPoDiisi = 0, pemetaanDibuat = 0;
  const catatanDilewati: string[] = [];

  for (const [namaLower, r] of perNama) {
    const nama = r.name.trim();
    const rateMentah = (r.rate_card ?? "").replace(/[^0-9.]/g, "");
    if (!/^\d+(\.\d{1,2})?$/.test(rateMentah)) {
      dilewati++;
      catatanDilewati.push(`${nama} (rate_card tidak valid: "${r.rate_card}")`);
      continue;
    }

    const nik = r.nik?.trim() || null;
    const tipe = r.type?.trim() || null;
    const posisi = r.position?.trim() || null;
    const nomorSpk = r.spk_number?.trim() || null;
    const statusRaw = (r.status_code ?? "").trim().toLowerCase();
    const status = ["inactive", "nonaktif", "non-aktif", "tidak aktif"].includes(statusRaw) ? "nonaktif" : "aktif";
    const penempatan = r.placement_name?.trim() || null;
    const namaKlien = r.client_name?.trim() || null;
    const nomorPoBaris = r.po_number?.trim() || null;
    // spk_start_date = tanggal talent MULAI bekerja (bukan tanggal upload
    // dokumen) — dipakai sebagai berlakuDari rate card, supaya rate card
    // tidak "baru berlaku" sejak hari impor padahal talent sudah bekerja
    // sejak lebih awal (bug yang ditemukan bagian 40 poin 1).
    const spkStartDate = parseTanggalIntegral(r.spk_start_date) ?? hariIni;

    let existing = petaPersonel.get(namaLower);
    if (!existing) {
      const [baru] = await db.insert(personel).values({ nik, nama, tipe, posisi, status, penempatan, nomorSpk }).returning();
      await db.insert(rateCard).values({ personelId: baru.id, nilaiRate: rateMentah, berlakuDari: spkStartDate, berlakuSampai: null });
      petaPersonel.set(namaLower, baru);
      existing = baru;
      personelBaru++;
    } else {
      const perubahan: Partial<typeof personel.$inferInsert> = {};
      if (penempatan && existing.penempatan !== penempatan) perubahan.penempatan = penempatan;
      if (nik && existing.nik !== nik) perubahan.nik = nik;
      if (tipe && existing.tipe !== tipe) perubahan.tipe = tipe;
      if (posisi && existing.posisi !== posisi) perubahan.posisi = posisi;
      if (nomorSpk && existing.nomorSpk !== nomorSpk) perubahan.nomorSpk = nomorSpk;
      if (r.status_code && existing.status !== status) perubahan.status = status;

      if (Object.keys(perubahan).length > 0) {
        await db.update(personel).set(perubahan).where(eq(personel.id, existing.id));
        existing = { ...existing, ...perubahan };
        petaPersonel.set(namaLower, existing);
        penempatanDiperbarui++;
      }

      const [rateAktif] = await db
        .select()
        .from(rateCard)
        .where(and(eq(rateCard.personelId, existing.id), isNull(rateCard.berlakuSampai)))
        .orderBy(rateCard.id);

      if (!rateAktif) {
        await db.insert(rateCard).values({ personelId: existing.id, nilaiRate: rateMentah, berlakuDari: spkStartDate, berlakuSampai: null });
        rateDiperbarui++;
      } else if (Number(rateAktif.nilaiRate) !== Number(rateMentah)) {
        await db.update(rateCard).set({ berlakuSampai: hariSebelum(spkStartDate) }).where(eq(rateCard.id, rateAktif.id));
        await db.insert(rateCard).values({ personelId: existing.id, nilaiRate: rateMentah, berlakuDari: spkStartDate, berlakuSampai: null });
        rateDiperbarui++;
      } else {
        tidakBerubah++;
      }
    }

    // Auto-mapping personel <-> PO (bagian 40 poin 3) + isi po.klien (bagian
    // 40 poin 4, 42): cocokkan po_number di file Integral dengan po.nomorPo
    // yang sudah ada di sistem (PO diimpor terpisah lewat impor tracker PO).
    // TIDAK membuat PO baru di sini — hanya memetakan & melengkapi PO yang
    // sudah ada, supaya tidak dobel dengan alur impor PO tracker.
    if (nomorPoBaris) {
      const poMatch = petaPo.get(nomorPoBaris.toLowerCase());
      if (poMatch) {
        // Isi po.klien dari client_name HANYA kalau masih kosong, supaya
        // tidak menimpa koreksi manual yang mungkin sudah dilakukan Petugas.
        // client_name -> po.klien, BUKAN placement_name (lihat bagian 42).
        if (!poMatch.klien && namaKlien) {
          await db.update(po).set({ klien: namaKlien }).where(eq(po.id, poMatch.id));
          poMatch.klien = namaKlien;
          petaPo.set(nomorPoBaris.toLowerCase(), poMatch);
          klienPoDiisi++;
        }

        const [pemetaanAktif] = await db
          .select()
          .from(pemetaanPersonelPo)
          .where(and(
            eq(pemetaanPersonelPo.personelId, existing.id),
            eq(pemetaanPersonelPo.poId, poMatch.id),
            isNull(pemetaanPersonelPo.berlakuSampai),
          ));
        if (!pemetaanAktif) {
          await db.insert(pemetaanPersonelPo).values({
            personelId: existing.id,
            poId: poMatch.id,
            berlakuDari: spkStartDate,
            berlakuSampai: null,
          });
          pemetaanDibuat++;
        }
      }
    }
  }

  await catatAudit({
    entitas: "personel", entitasId: 0, userId: user!.id,
    perubahan: `Impor data Integral (semua klien, bagian 40-42): ${personelBaru} personel baru, ${rateDiperbarui} rate diperbarui, ${penempatanDiperbarui} penempatan diperbarui, ${klienPoDiisi} po.klien terisi, ${pemetaanDibuat} pemetaan personel-PO baru, ${tidakBerubah} tidak berubah, ${dilewati} dilewati (dari ${perNama.size} baris, file "${file.name}")`,
  });

  return NextResponse.json({
    ok: true,
    totalBarisFile: objek.length,
    totalDiproses: perNama.size,
    personelBaru, rateDiperbarui, penempatanDiperbarui, klienPoDiisi, pemetaanDibuat, tidakBerubah, dilewati,
    catatanDilewati: catatanDilewati.slice(0, 20),
  });
}
