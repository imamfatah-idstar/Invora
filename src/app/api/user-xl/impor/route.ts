import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { userXl } from "@/db/schema";
import { eq } from "drizzle-orm";
import { wajibRoleApi } from "@/lib/require-role-api";
import { userSaatIni } from "@/lib/session-server";
import { catatAudit } from "@/lib/audit";
import { parseCsv, csvKeObjek } from "@/lib/csv";

const UKURAN_MAKS = 5 * 1024 * 1024; // 5MB

// Impor massal User XL (bagian 48) — alternatif dari isi manual satu-satu.
// Kolom fleksibel: "nama"/"name" wajib, "kontak"/"contact"/"email"/"telepon"/
// "phone" opsional. Dedupe per nama (baris terakhir menang), upsert: nama
// yang sudah ada kontaknya diperbarui, nama baru ditambahkan.
const ALIAS_HEADER: Record<string, string> = {
  "nama": "nama", "name": "nama",
  "kontak": "kontak", "contact": "kontak", "email": "kontak", "telepon": "kontak", "phone": "kontak", "no telepon": "kontak", "no hp": "kontak",
};

function normalisasiHeader(h: string): string {
  const bersih = h.trim().toLowerCase();
  return ALIAS_HEADER[bersih] ?? h.trim();
}

export async function POST(request: NextRequest) {
  const gagal = await wajibRoleApi(["petugas"]);
  if (gagal) return gagal;
  const user = await userSaatIni();

  const form = await request.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "Data form tidak valid." }, { status: 400 });

  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "File CSV wajib diunggah." }, { status: 400 });
  if (file.size > UKURAN_MAKS) return NextResponse.json({ error: "Ukuran file maksimal 5MB." }, { status: 400 });
  if (!file.name.toLowerCase().endsWith(".csv")) {
    return NextResponse.json({ error: "Format harus .csv." }, { status: 400 });
  }

  const teks = await file.text();
  const baris = parseCsv(teks);
  if (baris.length < 2) return NextResponse.json({ error: "File CSV kosong atau tidak terbaca." }, { status: 400 });

  const headerDinormalisasi = baris[0].map(normalisasiHeader);
  if (!headerDinormalisasi.includes("nama")) {
    return NextResponse.json({ error: `Kolom "nama" tidak ditemukan di file.` }, { status: 400 });
  }
  const objek = csvKeObjek([headerDinormalisasi, ...baris.slice(1)]);

  const perNama = new Map<string, Record<string, string>>();
  for (const r of objek) {
    const nama = r.nama?.trim();
    if (!nama) continue;
    perNama.set(nama.toLowerCase(), r);
  }

  const daftarAda = await db.select().from(userXl);
  const petaAda = new Map(daftarAda.map((u) => [u.nama.trim().toLowerCase(), u]));

  let userXlBaru = 0, kontakDiperbarui = 0, tidakBerubah = 0;

  for (const [namaLower, r] of perNama) {
    const nama = r.nama.trim();
    const kontak = r.kontak?.trim() || null;
    const existing = petaAda.get(namaLower);
    if (!existing) {
      await db.insert(userXl).values({ nama, kontak });
      userXlBaru++;
    } else if (kontak && existing.kontak !== kontak) {
      await db.update(userXl).set({ kontak }).where(eq(userXl.id, existing.id));
      kontakDiperbarui++;
    } else {
      tidakBerubah++;
    }
  }

  await catatAudit({
    entitas: "user_xl", entitasId: 0, userId: user!.id,
    perubahan: `Impor User XL: ${userXlBaru} baru, ${kontakDiperbarui} kontak diperbarui, ${tidakBerubah} tidak berubah (dari ${perNama.size} baris, file "${file.name}")`,
  });

  return NextResponse.json({ ok: true, totalDiproses: perNama.size, userXlBaru, kontakDiperbarui, tidakBerubah });
}
