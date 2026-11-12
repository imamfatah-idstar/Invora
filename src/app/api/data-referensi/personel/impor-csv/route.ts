import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { personel, rateCard, po, pemetaanPersonelPo, userXl } from "@/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { wajibRoleApi } from "@/lib/require-role-api";
import { userSaatIni } from "@/lib/session-server";
import { catatAudit } from "@/lib/audit";
import { parseCsv, csvKeObjek } from "@/lib/csv";

const UKURAN_MAKS = 10 * 1024 * 1024; // 10MB

function hariSebelum(tanggalISO: string): string {
  const d = new Date(tanggalISO + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

// Mendukung format tanggal "DD/MM/YYYY" (cth "31/12/2026" atau "18/05/2026")
// maupun ISO "YYYY-MM-DD" (cth "2025-11-12") seperti pada DummyData- Personel_Inv.csv.
function parseTanggalCsv(nilai: string | undefined): string | null {
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

function normalisasiStatusPersonel(statusCode: string | undefined): "aktif" | "nonaktif" {
  if (!statusCode) return "aktif";
  const s = statusCode.trim().toLowerCase();
  if (["inactive", "nonaktif", "non-aktif", "tidak aktif", "0", "false"].includes(s)) {
    return "nonaktif";
  }
  return "aktif";
}

const ALIAS_HEADER: Record<string, string> = {
  nik: "nik",
  no_induk: "nik",
  nomor_induk: "nik",
  name: "name",
  nama: "name",
  personel: "name",
  talent: "name",
  client_name: "client_name",
  client: "client_name",
  klien: "client_name",
  nama_klien: "client_name",
  type: "type",
  tipe: "type",
  position: "position",
  posisi: "position",
  jabatan: "position",
  role: "position",
  status_code: "status_code",
  status: "status_code",
  placement_name: "placement_name",
  placement: "placement_name",
  penempatan: "placement_name",
  spk_start_date: "spk_start_date",
  start_date: "spk_start_date",
  berlaku_dari: "spk_start_date",
  spk_actual_end_date: "spk_actual_end_date",
  end_date: "spk_actual_end_date",
  berlaku_sampai: "spk_actual_end_date",
  rate_card: "rate_card",
  ratecard: "rate_card",
  rate: "rate_card",
  nilai_rate: "rate_card",
  po_number: "po_number",
  ponumber: "po_number",
  no_po: "po_number",
  nomor_po: "po_number",
  po: "po_number",
  spk_number: "spk_number",
  spknumber: "spk_number",
  no_spk: "spk_number",
  nomor_spk: "spk_number",
  spk: "spk_number",
  user: "user",
  user_xl: "user",
  approver: "user",
  client_approver: "user",
  pic: "user",
};

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
    return NextResponse.json({ error: "Format file harus .csv." }, { status: 400 });
  }

  const teksMentah = await file.text();
  const teks = teksMentah.replace(/^\uFEFF/, "");
  const semuaBaris = parseCsv(teks);

  let indeksHeader = -1;
  for (let i = 0; i < semuaBaris.length; i++) {
    const barisNorm = semuaBaris[i].map((c) => c.trim().toLowerCase());
    if (barisNorm.includes("name") || barisNorm.includes("nama") || barisNorm.includes("nik")) {
      indeksHeader = i;
      break;
    }
  }

  if (indeksHeader === -1) {
    indeksHeader = semuaBaris.findIndex((b) => b.some((cell) => cell.trim() !== ""));
  }

  if (indeksHeader === -1 || semuaBaris.length - indeksHeader < 2) {
    return NextResponse.json({ error: "File CSV kosong atau tidak memiliki baris data yang valid." }, { status: 400 });
  }

  const baris = semuaBaris.slice(indeksHeader);
  const headerAsli = baris[0];
  const headerNorm = headerAsli.map((h) => h.trim().toLowerCase());
  const headerTerstandar = headerNorm.map((h) => ALIAS_HEADER[h] ?? h);

  if (!headerTerstandar.includes("name")) {
    return NextResponse.json({
      error: `Kolom "name" tidak ditemukan di file. Kolom yang terdeteksi: ${headerAsli.filter((h) => h.trim()).join(", ") || "(kosong)"}`,
    }, { status: 400 });
  }

  const objek = csvKeObjek([headerTerstandar, ...baris.slice(1)]);

  // Dedupe per nama (ambil baris terakhir jika ada duplikat nama di file)
  const perNama = new Map<string, Record<string, string>>();
  for (const r of objek) {
    const nama = r.name?.trim();
    if (!nama) continue;
    perNama.set(nama.toLowerCase(), r);
  }

  // Hitung estimasi nilai PO (akumulasi rate_card * 12 per po_number) untuk PO baru yang belum ada di tabel po
  const akumulasiRatePerPo = new Map<string, number>();
  for (const [, r] of perNama) {
    const nomorPoBaris = r.po_number?.trim();
    if (!nomorPoBaris) continue;
    const rateNum = Number((r.rate_card ?? "").replace(/[^0-9.]/g, "")) || 0;
    const key = nomorPoBaris.toLowerCase();
    akumulasiRatePerPo.set(key, (akumulasiRatePerPo.get(key) ?? 0) + rateNum * 12);
  }

  const daftarPersonel = await db.select().from(personel);
  const petaPersonel = new Map(daftarPersonel.map((p) => [p.nama.trim().toLowerCase(), p]));
  const petaPersonelNik = new Map(
    daftarPersonel.filter((p) => p.nik?.trim()).map((p) => [p.nik!.trim().toLowerCase(), p])
  );

  const daftarPo = await db.select().from(po);
  const petaPo = new Map(daftarPo.map((p) => [p.nomorPo.trim().toLowerCase(), p]));

  const daftarUserXl = await db.select().from(userXl);
  const petaUserXl = new Map(daftarUserXl.map((u) => [u.nama.trim().toLowerCase(), u]));

  const hariIni = new Date().toISOString().slice(0, 10);
  let personelBaru = 0;
  let personelDiperbarui = 0;
  let rateDiperbarui = 0;
  let poBaru = 0;
  let klienPoDiisi = 0;
  let userBaru = 0;
  let pemetaanDibuat = 0;
  let pemetaanDiperbarui = 0;
  let tidakBerubah = 0;
  let dilewati = 0;
  const catatanDilewati: string[] = [];

  for (const [namaLower, r] of perNama) {
    const nama = r.name.trim();
    const nik = r.nik?.trim() || null;
    const tipe = r.type?.trim() || null;
    const posisi = r.position?.trim() || null;
    const status = normalisasiStatusPersonel(r.status_code);
    const penempatan = r.placement_name?.trim() || null;
    const namaKlien = r.client_name?.trim() || null;
    const nomorPoBaris = r.po_number?.trim() || null;
    const nomorSpk = r.spk_number?.trim() || null;
    const namaUser = r.user?.trim() || null;

    const spkStartDate = parseTanggalCsv(r.spk_start_date) ?? hariIni;
    const spkEndDate = parseTanggalCsv(r.spk_actual_end_date);

    const rateMentah = (r.rate_card ?? "").replace(/[^0-9.]/g, "");
    const adaRateValid = rateMentah !== "" && /^\d+(\.\d{1,2})?$/.test(rateMentah);
    if (r.rate_card && r.rate_card.trim() !== "" && !adaRateValid) {
      dilewati++;
      catatanDilewati.push(`${nama} (rate_card tidak valid: "${r.rate_card}")`);
      continue;
    }

    // 1. Buat atau perbarui data Personel
    let existing = petaPersonel.get(namaLower) ?? (nik ? petaPersonelNik.get(nik.toLowerCase()) : undefined);
    if (!existing) {
      const [baru] = await db
        .insert(personel)
        .values({
          nik,
          nama,
          tipe,
          posisi,
          status,
          penempatan,
          nomorSpk,
        })
        .returning();
      petaPersonel.set(namaLower, baru);
      if (nik) petaPersonelNik.set(nik.toLowerCase(), baru);
      existing = baru;
      personelBaru++;
    } else {
      const perubahanPersonel: Partial<typeof personel.$inferInsert> = {};
      if (nik && existing.nik !== nik) perubahanPersonel.nik = nik;
      if (existing.nama !== nama) perubahanPersonel.nama = nama;
      if (tipe && existing.tipe !== tipe) perubahanPersonel.tipe = tipe;
      if (posisi && existing.posisi !== posisi) perubahanPersonel.posisi = posisi;
      if (r.status_code && existing.status !== status) perubahanPersonel.status = status;
      if (penempatan && existing.penempatan !== penempatan) perubahanPersonel.penempatan = penempatan;
      if (nomorSpk && existing.nomorSpk !== nomorSpk) perubahanPersonel.nomorSpk = nomorSpk;

      if (Object.keys(perubahanPersonel).length > 0) {
        await db.update(personel).set(perubahanPersonel).where(eq(personel.id, existing.id));
        existing = { ...existing, ...perubahanPersonel };
        petaPersonel.set(namaLower, existing);
        if (nik) petaPersonelNik.set(nik.toLowerCase(), existing);
        personelDiperbarui++;
      }
    }

    // 2. Buat atau perbarui Rate Card jika kolom rate_card tersedia
    if (adaRateValid) {
      const daftarRate = await db
        .select()
        .from(rateCard)
        .where(eq(rateCard.personelId, existing.id))
        .orderBy(rateCard.id);

      const rateAktif = daftarRate.find((rc) => rc.berlakuSampai === null) ?? daftarRate[daftarRate.length - 1];

      if (!rateAktif) {
        await db.insert(rateCard).values({
          personelId: existing.id,
          nilaiRate: rateMentah,
          berlakuDari: spkStartDate,
          berlakuSampai: spkEndDate,
        });
        rateDiperbarui++;
      } else if (Number(rateAktif.nilaiRate) !== Number(rateMentah)) {
        await db.update(rateCard).set({ berlakuSampai: hariSebelum(spkStartDate) }).where(eq(rateCard.id, rateAktif.id));
        await db.insert(rateCard).values({
          personelId: existing.id,
          nilaiRate: rateMentah,
          berlakuDari: spkStartDate,
          berlakuSampai: spkEndDate,
        });
        rateDiperbarui++;
      } else if (
        rateAktif.berlakuDari !== spkStartDate ||
        (spkEndDate !== null && rateAktif.berlakuSampai !== spkEndDate)
      ) {
        await db
          .update(rateCard)
          .set({
            berlakuDari: spkStartDate,
            berlakuSampai: spkEndDate ?? rateAktif.berlakuSampai,
          })
          .where(eq(rateCard.id, rateAktif.id));
        rateDiperbarui++;
      } else {
        tidakBerubah++;
      }
    }

    // 3. Pastikan PO tersedia (buat baru otomatis jika belum ada di tabel po)
    let poMatch = nomorPoBaris ? petaPo.get(nomorPoBaris.toLowerCase()) : undefined;
    if (nomorPoBaris) {
      if (!poMatch) {
        const estimasiPagu = akumulasiRatePerPo.get(nomorPoBaris.toLowerCase()) || (adaRateValid ? Number(rateMentah) * 12 : 0);
        const nilaiPoStr = estimasiPagu > 0 ? estimasiPagu.toFixed(2) : "0.00";
        const tahunPo = Number(spkStartDate.slice(0, 4)) || new Date().getFullYear();
        const namaProyekDefault = penempatan
          ? `${namaKlien ? namaKlien + " - " : ""}${penempatan}`
          : namaKlien
            ? `Proyek ${namaKlien}`
            : `PO ${nomorPoBaris}`;

        const [poBaruRow] = await db
          .insert(po)
          .values({
            nomorPo: nomorPoBaris,
            namaProyek: namaProyekDefault,
            tahun: tahunPo,
            nilaiItem: nilaiPoStr,
            saldoSebelumPpn: nilaiPoStr,
            nilaiGr: "0.00",
            klien: namaKlien,
            jenisTagihan: "bulanan",
            statusPo: "aktif",
          })
          .returning();
        poMatch = poBaruRow;
        petaPo.set(nomorPoBaris.toLowerCase(), poBaruRow);
        poBaru++;
      } else if (!poMatch.klien && namaKlien) {
        await db.update(po).set({ klien: namaKlien }).where(eq(po.id, poMatch.id));
        poMatch = { ...poMatch, klien: namaKlien };
        petaPo.set(nomorPoBaris.toLowerCase(), poMatch);
        klienPoDiisi++;
      }
    }

    // 4. Buat atau perbarui User (Client Approver) dari kolom "User"
    let userMatch = namaUser ? petaUserXl.get(namaUser.toLowerCase()) : undefined;
    if (namaUser) {
      if (!userMatch) {
        const [userBaruRow] = await db
          .insert(userXl)
          .values({
            nama: namaUser,
            kontak: null,
            poId: poMatch?.id ?? null,
          })
          .returning();
        userMatch = userBaruRow;
        petaUserXl.set(namaUser.toLowerCase(), userBaruRow);
        userBaru++;
      } else if (!userMatch.poId && poMatch) {
        await db.update(userXl).set({ poId: poMatch.id }).where(eq(userXl.id, userMatch.id));
        userMatch = { ...userMatch, poId: poMatch.id };
        petaUserXl.set(namaUser.toLowerCase(), userMatch);
      }
    }

    // 5. Buat atau perbarui Pemetaan Personel <-> PO
    if (poMatch) {
      const daftarPemetaan = await db
        .select()
        .from(pemetaanPersonelPo)
        .where(
          and(
            eq(pemetaanPersonelPo.personelId, existing.id),
            eq(pemetaanPersonelPo.poId, poMatch.id)
          )
        );

      const pemetaanAda = daftarPemetaan.find((m) => m.berlakuSampai === null) ?? daftarPemetaan[daftarPemetaan.length - 1];

      if (!pemetaanAda) {
        await db.insert(pemetaanPersonelPo).values({
          personelId: existing.id,
          poId: poMatch.id,
          berlakuDari: spkStartDate,
          berlakuSampai: spkEndDate,
          userXlId: userMatch?.id ?? null,
        });
        pemetaanDibuat++;
      } else {
        const perubahanPemetaan: Partial<typeof pemetaanPersonelPo.$inferInsert> = {};
        if (pemetaanAda.berlakuDari !== spkStartDate) perubahanPemetaan.berlakuDari = spkStartDate;
        if (spkEndDate !== null && pemetaanAda.berlakuSampai !== spkEndDate) perubahanPemetaan.berlakuSampai = spkEndDate;
        if (userMatch && pemetaanAda.userXlId !== userMatch.id) perubahanPemetaan.userXlId = userMatch.id;

        if (Object.keys(perubahanPemetaan).length > 0) {
          await db
            .update(pemetaanPersonelPo)
            .set(perubahanPemetaan)
            .where(eq(pemetaanPersonelPo.id, pemetaanAda.id));
          pemetaanDiperbarui++;
        }
      }
    }
  }

  await catatAudit({
    entitas: "personel",
    entitasId: 0,
    userId: user!.id,
    perubahan: `Impor CSV Personel Lengkap ("${file.name}"): ${personelBaru} personel baru, ${personelDiperbarui} personel diperbarui, ${rateDiperbarui} rate card, ${poBaru} PO baru, ${userBaru} User/Approver baru, ${pemetaanDibuat} pemetaan baru (${pemetaanDiperbarui} diperbarui), ${dilewati} dilewati`,
  });

  return NextResponse.json({
    ok: true,
    totalBarisFile: objek.length,
    totalDiproses: perNama.size,
    personelBaru,
    personelDiperbarui,
    rateDiperbarui,
    poBaru,
    klienPoDiisi,
    userBaru,
    pemetaanDibuat,
    pemetaanDiperbarui,
    tidakBerubah,
    dilewati,
    catatanDilewati: catatanDilewati.slice(0, 20),
  });
}

