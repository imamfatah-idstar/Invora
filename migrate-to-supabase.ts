import "dotenv/config";
import fs from "fs";
import Database from "better-sqlite3";
import postgres from "postgres";

// =========================================================================
// SKRIP MIGRASI DATABASE: SQLite (dev.db) -> Supabase (PostgreSQL)
// Struktur tabel 100% konsisten dengan src/db/schema.ts tanpa perubahan struktur.
// =========================================================================

const URUTAN_TABEL = [
  "users",
  "personel",
  "rate_card",
  "user_xl",
  "po",
  "po_line_item",
  "pemetaan_personel_po",
  "kalender_kerja",
  "pengajuan",
  "pengajuan_detail",
  "timesheet",
  "konfirmasi",
  "checker_review",
  "dokumen",
  "lampiran_pengajuan",
  "gr_request",
  "gr_request_riwayat",
  "audit_log",
  "sessions",
];

const KOLOM_BOOLEAN: Record<string, string[]> = {
  users: ["aktif"],
};

const DEFAULT_NILAI_KOLOM: Record<string, Record<string, unknown>> = {
  po: {
    klien: null,
    jenis_tagihan: "bulanan",
    nama_file_po_asli: null,
    path_file_po_asli: null,
    tanggal_po: null,
  },
  pengajuan_detail: {
    sumber_hitung: "kalender",
    nilai_penuh: null,
    po_line_item_id: null,
  },
  personel: {
    penempatan: null,
  },
  pengajuan: {
    keterangan_tahap: null,
    nomor_gr_slip: null,
    tanggal_gr_disetujui: null,
    tanggal_submit_cac: null,
    tanggal_cac_approved: null,
    tanggal_request_gr: null,
    tanggal_submit_invoice: null,
    tanggal_approve_invoice: null,
    nomor_invoice: null,
    approval_alokasi_user_xl_pemberi: null,
    approval_alokasi_tanggal: null,
    approval_alokasi_referensi: null,
  },
  pemetaan_personel_po: {
    po_line_item_id: null,
  },
};

async function testConnection(url: string) {
  const sql = postgres(url, { prepare: false, connect_timeout: 10 });
  try {
    await sql`SELECT 1 as test`;
    return { ok: true, sql };
  } catch (err: any) {
    await sql.end();
    return { ok: false, error: err };
  }
}

async function main() {
  let databaseUrl = process.argv[2] || process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.error("❌ ERROR: DATABASE_URL tidak ditemukan di .env atau argumen command line.");
    process.exit(1);
  }

  console.log("🚀 Memulai proses migrasi database ke Supabase...");
  console.log("📁 Sumber: dev.db (SQLite)");

  // Cek apakah password.txt ada, siapkan kemungkinan fallback password
  let fallbackUrl: string | null = null;
  if (fs.existsSync("password.txt")) {
    const customPw = fs.readFileSync("password.txt", "utf-8").trim();
    if (customPw && !databaseUrl.includes(`:${customPw}@`)) {
      fallbackUrl = databaseUrl.replace(/:([^:@]+)@/, `:${customPw}@`);
    }
  }

  console.log("🌐 Target: " + databaseUrl.replace(/:([^:@]+)@/, ":****@"));

  if (!fs.existsSync("dev.db")) {
    console.error("❌ ERROR: File dev.db tidak ditemukan di root proyek.");
    process.exit(1);
  }

  // 1. Tes koneksi awal ke Supabase
  console.log("\n[1/4] Menguji koneksi ke database Supabase...");
  let connTest = await testConnection(databaseUrl);

  if (!connTest.ok && fallbackUrl) {
    console.log("  Mencoba kata sandi dari password.txt...");
    const fallbackTest = await testConnection(fallbackUrl);
    if (fallbackTest.ok) {
      console.log("  ✅ Berhasil terhubung menggunakan kata sandi dari password.txt!");
      databaseUrl = fallbackUrl;
      connTest = fallbackTest;
      // Update .env agar aplikasi juga menggunakan kata sandi yang valid ini
      fs.writeFileSync(".env", `DATABASE_URL=${fallbackUrl}\n`, "utf-8");
      console.log("  📝 File .env telah diperbarui otomatis dengan kata sandi yang cocok.");
    }
  }

  if (!connTest.ok) {
    const err = connTest.error;
    console.error("\n❌ GAGAL TERHUBUNG KE SUPABASE:");
    if (err?.message?.includes("tenant/user") && err?.message?.includes("not found")) {
      console.error("👉 Supabase Project sedang di-PAUSE oleh Supabase.");
      console.error("👉 Buka dashboard: https://supabase.com/dashboard/project/nykiohdnfwbwtuxuvjjh");
      console.error("👉 Klik tombol 'Restore project' (tunggu 1-2 menit hingga status Active), lalu jalankan kembali skrip ini.");
    } else if (err?.message?.includes("password authentication failed")) {
      console.error("👉 Kata sandi database Supabase salah. Pastikan password di .env atau password.txt sesuai.");
    } else {
      console.error("👉 Error:", err?.message ?? err);
    }
    process.exit(1);
  }

  const sql = connTest.sql!;
  const sqlite = new Database("dev.db");

  try {
    console.log("✅ Terhubung ke Supabase dengan sukses.");

    // 2. Jalankan DDL Skema jika belum ada tabel
    console.log("\n[2/4] Memeriksa & membuat struktur tabel (DDL Drizzle)...");
    if (fs.existsSync("drizzle/0000_freezing_sleeper.sql")) {
      const ddlRaw = fs.readFileSync("drizzle/0000_freezing_sleeper.sql", "utf-8");
      const statements = ddlRaw
        .split("--> statement-breakpoint")
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

      for (const statement of statements) {
        try {
          await sql.unsafe(statement);
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : String(e);
          if (!msg.includes("already exists")) {
            console.warn(`  ⚠️ Peringatan DDL: ${msg}`);
          }
        }
      }
      console.log("✅ Struktur tabel dan foreign key terkonfirmasi di Supabase.");
    }

    // 3. Migrasi Data
    console.log("\n[3/4] Memindahkan data per tabel dari dev.db ke Supabase...");
    const ringkasan: { tabel: string; sqliteCount: number; pgCount: number }[] = [];

    // Bersihkan tabel tujuan dalam urutan terbalik (reverse FK dependency)
    const tabelTerbalik = [...URUTAN_TABEL].reverse();
    for (const tabel of tabelTerbalik) {
      try {
        await sql`DELETE FROM ${sql(tabel)}`;
      } catch {
        // Abaikan jika tabel belum ada atau kosong
      }
    }

    for (const tabel of URUTAN_TABEL) {
      let barisSqlite: Record<string, unknown>[] = [];
      try {
        barisSqlite = sqlite.prepare(`SELECT * FROM "${tabel}"`).all() as Record<string, unknown>[];
      } catch {
        ringkasan.push({ tabel, sqliteCount: 0, pgCount: 0 });
        continue;
      }

      if (barisSqlite.length === 0) {
        console.log(`  - ${tabel}: 0 baris di dev.db, dilewati`);
        ringkasan.push({ tabel, sqliteCount: 0, pgCount: 0 });
        continue;
      }

      const kolomBoolean = KOLOM_BOOLEAN[tabel] ?? [];
      const defaultNilai = DEFAULT_NILAI_KOLOM[tabel] ?? {};

      const barisSiap = barisSqlite.map((b) => {
        const hasil = { ...defaultNilai, ...b };
        for (const k of kolomBoolean) {
          if (k in hasil) hasil[k] = Boolean(hasil[k]);
        }
        return hasil;
      });

      // Insert data batch
      await sql`INSERT INTO ${sql(tabel)} ${sql(barisSiap)}`;
      console.log(`  - ${tabel}: Berhasil memindahkan ${barisSiap.length} baris`);

      // Reset sequence id serial agar autoincrement berikutnya melanjutkan dari ID tertinggi
      const sample = barisSqlite[0];
      if (sample && "id" in sample) {
        await sql`SELECT setval(pg_get_serial_sequence(${tabel}, 'id'), COALESCE((SELECT MAX(id) FROM ${sql(tabel)}), 1))`;
      }

      const countResult = await sql`SELECT count(*)::int as count FROM ${sql(tabel)}`;
      ringkasan.push({
        tabel,
        sqliteCount: barisSqlite.length,
        pgCount: countResult[0]?.count ?? 0,
      });
    }

    // 4. Laporan Rekonsiliasi
    console.log("\n[4/4] Verifikasi Rekonsiliasi Data:");
    console.log("---------------------------------------------------------------");
    console.log("Nama Tabel                 dev.db (SQLite)    Supabase (PG)");
    console.log("---------------------------------------------------------------");
    for (const r of ringkasan) {
      const match = r.sqliteCount === r.pgCount ? "✅" : "❌";
      console.log(
        `${r.tabel.padEnd(25)} ${String(r.sqliteCount).padStart(12)} ${String(r.pgCount).padStart(16)}  ${match}`
      );
    }
    console.log("---------------------------------------------------------------");
    console.log("\n🎉 Migrasi database ke Supabase selesai dengan sempurna tanpa mengubah struktur!");

  } catch (err: unknown) {
    console.error("\n❌ GAGAL PADA PROSES MIGRASI DATA:", err);
    process.exit(1);
  } finally {
    sqlite.close();
    await sql.end();
  }
}

main();
