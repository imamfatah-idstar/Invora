import fs from "fs";
import Database from "better-sqlite3";

const sqlite = new Database("dev.db");

// Read DDL from drizzle migration
const ddlSql = fs.readFileSync("drizzle/0000_freezing_sleeper.sql", "utf-8");

// Tables in foreign key order
const TABLES_TO_MIGRATE = [
  "users",
  "personel",
  "rate_card",
  "user_xl",
  "po",
  "pemetaan_personel_po",
  "kalender_kerja",
  "pengajuan",
  "pengajuan_detail",
  "timesheet",
  "konfirmasi",
  "checker_review",
  "dokumen",
  "audit_log",
  "sessions",
];

const BOOLEAN_COLUMNS: Record<string, string[]> = {
  users: ["aktif"],
};

const DEFAULT_COLUMN_VALUES: Record<string, Record<string, any>> = {
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

function escapeSqlValue(val: any): string {
  if (val === null || val === undefined) return "NULL";
  if (typeof val === "boolean") return val ? "TRUE" : "FALSE";
  if (typeof val === "number") return String(val);
  return `'${String(val).replace(/'/g, "''")}'`;
}

let sqlOutput = `-- =========================================================================\n`;
sqlOutput += `-- MIGRATION DDL & DATA: SQLite (dev.db) -> Supabase (PostgreSQL)\n`;
sqlOutput += `-- Struktur 100% identik dengan src/db/schema.ts (19 tabel Invora)\n`;
sqlOutput += `-- =========================================================================\n\n`;

sqlOutput += `-- BAGIAN 1: PEMBUATAN STRUKTUR TABEL (DDL)\n`;
sqlOutput += ddlSql.replace(/--> statement-breakpoint\n?/g, "\n") + "\n\n";

sqlOutput += `-- =========================================================================\n`;
sqlOutput += `-- BAGIAN 2: MIGRASI DATA DARI DATABASE SAAT INI (dev.db)\n`;
sqlOutput += `-- =========================================================================\n\n`;

for (const table of TABLES_TO_MIGRATE) {
  let rows: Record<string, any>[] = [];
  try {
    rows = sqlite.prepare(`SELECT * FROM "${table}"`).all() as Record<string, any>[];
  } catch {
    continue;
  }

  if (rows.length === 0) {
    sqlOutput += `-- Tabel "${table}": 0 baris (dilewati)\n\n`;
    continue;
  }

  sqlOutput += `-- Data Tabel "${table}" (${rows.length} baris)\n`;
  const boolCols = BOOLEAN_COLUMNS[table] ?? [];
  const defaults = DEFAULT_COLUMN_VALUES[table] ?? {};

  for (const rawRow of rows) {
    const row = { ...defaults, ...rawRow };
    for (const b of boolCols) {
      if (b in row) row[b] = Boolean(row[b]);
    }

    const columns = Object.keys(row);
    const colList = columns.map((c) => `"${c}"`).join(", ");
    const valList = columns.map((c) => escapeSqlValue(row[c])).join(", ");

    sqlOutput += `INSERT INTO "${table}" (${colList}) VALUES (${valList}) ON CONFLICT DO NOTHING;\n`;
  }

  // Update serial sequence
  const sample = rows[0];
  if (sample && "id" in sample) {
    sqlOutput += `SELECT setval(pg_get_serial_sequence('"${table}"', 'id'), COALESCE((SELECT MAX("id") FROM "${table}"), 1));\n`;
  }
  sqlOutput += `\n`;
}

sqlOutput += `-- =========================================================================\n`;
sqlOutput += `-- SELESAI MIGRASI SUPABASE\n`;
sqlOutput += `-- =========================================================================\n`;

fs.writeFileSync("supabase_migration.sql", sqlOutput, "utf-8");
console.log("Berhasil membuat supabase_migration.sql (" + sqlOutput.length + " bytes)");
