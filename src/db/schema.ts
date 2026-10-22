import { pgTable, text, integer, boolean, serial } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// =========================================================================
// AKUN & AKSES
// =========================================================================

// role: "admin" | "petugas" | "checker" — dibatasi di kode aplikasi, bukan di DB.
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  nama: text("nama").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: text("role").notNull(), // admin | petugas | checker
  aktif: boolean("aktif").notNull().default(true),
  dibuatPada: text("dibuat_pada").notNull().default(sql`now()::text`),
});

// Sesi login — "tiket masuk" yang dicatat sendiri oleh aplikasi (bukan
// nitip ke Google/pihak ketiga), sesuai keputusan stack.
export const sessions = pgTable("sessions", {
  token: text("token").primaryKey(), // string acak, dikirim sebagai cookie
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  dibuatPada: text("dibuat_pada").notNull().default(sql`now()::text`),
  kedaluwarsaPada: text("kedaluwarsa_pada").notNull(),
});

// =========================================================================
// DATA REFERENSI (dikelola Petugas Pengajuan dan Konfirmasi — lihat bagian 18
// PROJECT_INSTRUCTIONS.md; Kalender Kerja tetap dikelola Administrator)
// =========================================================================

// Personel — data contoh, bukan data nyata (lihat batasan lingkungan proyek).
export const personel = pgTable("personel", {
  id: serial("id").primaryKey(),
  nama: text("nama").notNull(),
  status: text("status").notNull().default("aktif"), // aktif | nonaktif
  dibuatPada: text("dibuat_pada").notNull().default(sql`now()::text`),
  // Lokasi/site kerja talent, dari kolom "placement_name" di file Invoice Plan
  // Integral (bagian 40-42) — HANYA informasi/referensi lokasi, TIDAK PERNAH
  // dipakai untuk deteksi klien XL/non-XL (itu tugas po.klien, dari kolom
  // "client_name"). Contoh: "IDS-CIMB Bintaro". Null kalau belum pernah
  // diimpor dari Integral atau diisi manual satu-satu lewat form.
  penempatan: text("penempatan"),
});

// Rate card bulanan personel, dengan masa berlaku.
export const rateCard = pgTable("rate_card", {
  id: serial("id").primaryKey(),
  personelId: integer("personel_id")
    .notNull()
    .references(() => personel.id),
  nilaiRate: text("nilai_rate").notNull(), // disimpan sebagai teks, cth "10000000.00"
  berlakuDari: text("berlaku_dari").notNull(), // YYYY-MM-DD
  berlakuSampai: text("berlaku_sampai"), // null = masih berlaku
});

// User XL — pemberi keputusan/approval di luar aplikasi (dicatat internal).
export const userXl = pgTable("user_xl", {
  id: serial("id").primaryKey(),
  nama: text("nama").notNull(),
  kontak: text("kontak"),
});

// PO (Purchase Order) — bundling, tidak mencantumkan nama personel.
export const po = pgTable("po", {
  id: serial("id").primaryKey(),
  nomorPo: text("nomor_po").notNull().unique(),
  namaProyek: text("nama_proyek").notNull(), // wajib mengikuti nama di COUPA
  tahun: integer("tahun").notNull().default(2026), // tahun PO, dipakai untuk filter Summary PO
  nilaiItem: text("nilai_item").notNull(), // teks, sebelum PPN
  saldoSebelumPpn: text("saldo_sebelum_ppn").notNull(),
  // Nilai kumulatif yang sudah di-GR (Good Receipt) oleh XL. Diisi manual oleh
  // Petugas setelah GR disetujui di Get Approve CAC/COUPA (integrasi otomatis
  // belum ada di MVP ini). Saldo Summary PO = nilaiItem - nilaiGr.
  nilaiGr: text("nilai_gr").notNull().default("0.00"),
  // Scan/copy dokumen PO asli terbitan XL (halaman "PURCHASE ORDER" lengkap
  // dengan blok supplier/buyer & tabel item) — diunggah SEKALI per PO, lalu
  // dipakai ulang otomatis sebagai halaman terakhir di setiap CAC/BAST PDF
  // gabungan untuk PO ini. Lihat PROJECT_INSTRUCTIONS.md bagian 25.
  namaFilePoAsli: text("nama_file_po_asli"),
  pathFilePoAsli: text("path_file_po_asli"),
  // Tanggal PO (di dokumen PO asli) — dipakai untuk mengisi field "PO Date"
  // saat generate GR Request otomatis (bagian 33). Boleh kosong kalau belum diisi.
  tanggalPo: text("tanggal_po"), // "YYYY-MM-DD"
  // Nama klien resmi PO ini (bagian 40-42) — sumber TUNGGAL untuk deteksi
  // apakahKlienXl() DAN teks nama resmi klien di BAST Non-XL (satu field,
  // bukan dua — keputusan pengguna 30 Sept 2026, PROJECT_INSTRUCTIONS.md
  // bagian 41). Diisi otomatis dari kolom "client_name" file Invoice Plan
  // Integral kalau PO ini match lewat po_number (lihat impor-integral),
  // JANGAN PERNAH diisi dari "placement_name" (lihat bagian 42 — kasus
  // "XLsmart Office"/"XLSmart Tower" milik klien non-XL). Null kalau PO
  // diisi manual dan belum pernah kena auto-mapping dari Integral.
  klien: text("klien"),
  // Model penagihan PO ini (bagian 40): "bulanan" = prorata hari kerja
  // seperti pola XL yang sudah ada; "tahap" = milestone/persentase, nilai
  // tagihan diisi MANUAL oleh Petugas per pengajuan (keputusan bagian 41 —
  // tidak ada formula otomatis). Default "bulanan" supaya PO lama/XL yang
  // sudah ada tidak perlu diisi ulang.
  jenisTagihan: text("jenis_tagihan").notNull().default("bulanan"),
  // Status siklus hidup PO: "aktif" atau "selesai" (closing PO)
  statusPo: text("status_po").notNull().default("aktif"),
});

// Baris/line item PO — PO bersifat bundling banyak baris (per role/jenis
// layanan, mis. "SVC | FrontEnd", "SVC | Tester"), masing-masing punya qty &
// harga satuan sendiri. Dipakai untuk mengisi form GR Request per baris
// (kolom PO Line, Short Text, PO Qty, Price PO, PO Value) — lihat bagian 33.
export const poLineItem = pgTable("po_line_item", {
  id: serial("id").primaryKey(),
  poId: integer("po_id")
    .notNull()
    .references(() => po.id),
  nomorLine: integer("nomor_line").notNull(), // "PO Line" di form GR Request, cth 1, 2, 3
  shortText: text("short_text").notNull(), // deskripsi baris, cth "SVC | FrontEnd / Web FullStack"
  qty: integer("qty").notNull(),
  hargaSatuan: text("harga_satuan").notNull(), // teks, "Price PO" per unit
});

// Pemetaan personel ke PO, dengan masa berlaku (terpisah dari PO karena PO
// bersifat bundling dan tidak mencantumkan nama personel).
export const pemetaanPersonelPo = pgTable("pemetaan_personel_po", {
  id: serial("id").primaryKey(),
  personelId: integer("personel_id")
    .notNull()
    .references(() => personel.id),
  poId: integer("po_id")
    .notNull()
    .references(() => po.id),
  berlakuDari: text("berlaku_dari").notNull(),
  berlakuSampai: text("berlaku_sampai"),
  // PO Line yang jadi tempat billing personel ini dihitung (opsional — null
  // kalau PO belum dipecah jadi baris/line item). Dipakai untuk mengisi form
  // GR Request per baris secara otomatis (bagian 33): setiap pengajuan_detail
  // mewarisi poLineItemId dari sini saat pengajuan dibuat.
  poLineItemId: integer("po_line_item_id").references(() => poLineItem.id),
});

// Kalender kerja — dipakai untuk menghitung hari kerja acuan bulan & hari
// yang dapat ditagihkan. Satu baris per tanggal.
export const kalenderKerja = pgTable("kalender_kerja", {
  tanggal: text("tanggal").primaryKey(), // YYYY-MM-DD
  tipe: text("tipe").notNull(), // kerja | libur_nasional | cuti_bersama
  keterangan: text("keterangan"),
});

// =========================================================================
// PENGAJUAN
// =========================================================================

// Header pengajuan: satu periode + satu PO + satu user XL per pengajuan (MVP 1).
export const pengajuan = pgTable("pengajuan", {
  id: serial("id").primaryKey(),
  periode: text("periode").notNull(), // cth "2026-01" (Januari 2026)
  poId: integer("po_id")
    .notNull()
    .references(() => po.id),
  userXlId: integer("user_xl_id")
    .notNull()
    .references(() => userXl.id),
  status: text("status").notNull().default("draft"),
  // status: draft | menunggu_checker | perlu_revisi | siap_diajukan | diajukan
  versi: integer("versi").notNull().default(1),
  dibuatPada: text("dibuat_pada").notNull().default(sql`now()::text`),
  // Keterangan tahap/milestone untuk PO jenisTagihan="tahap" (bagian 53),
  // teks bebas diisi Petugas, mis. "Tahap I (50%)". Null untuk PO "bulanan".
  keteranganTahap: text("keterangan_tahap"),
  // Nomor GR Slip/ES Slip — diterbitkan XL sendiri setelah User XL memproses
  // Goods Receipt di SAP (format SAP4HANA: 6xxxxxxxxx-0000x-20yy), dikirim ke
  // Input Data lewat email/WA di luar aplikasi ini. Dicatat manual begitu
  // diterima, dipakai untuk mengisi field "GR Document Number" saat penagihan
  // ke COUPA. Kosong (null) berarti belum ada GR Slip untuk pengajuan ini.
  nomorGrSlip: text("nomor_gr_slip"),
  // Tanggal GR Slip di atas disetujui XL — MENENTUKAN bulan & tahun di nomor
  // invoice otomatis (bukan tanggal invoice dibuat, bukan periode kerja yang
  // ditagihkan: pekerjaan Februari yang GR-nya baru disetujui Juni tetap
  // pakai bulan Juni). Lihat PROJECT_INSTRUCTIONS.md bagian 23. Tanggal ini
  // JUGA dipakai sebagai "Tanggal GR Approved" di kartu Status Proses (bagian 26)
  // — satu tanggal yang sama, tidak digandakan jadi kolom terpisah.
  tanggalGrDisetujui: text("tanggal_gr_disetujui"), // "YYYY-MM-DD"

  // ====== Status proses CAC -> Invoice (bagian 26) ======
  // Timeline dari CAC disetujui Checker sampai invoice disetujui XL di COUPA.
  // Semua "YYYY-MM-DD", null = belum terjadi/belum dicatat.
  // 1. Diisi OTOMATIS oleh sistem saat Checker set hasil="siap_diajukan".
  tanggalSubmitCac: text("tanggal_submit_cac"),
  // 2-6. Diisi MANUAL oleh Input Data/Checker setelah proses di Get Approve/COUPA
  // berjalan (belum ada otomasi browser ke sana di MVP ini).
  tanggalCacApproved: text("tanggal_cac_approved"), // status approved CAC di Get Approve
  tanggalRequestGr: text("tanggal_request_gr"), // tanggal submit request GR di Get Approve
  // (tanggal GR approved -> pakai tanggalGrDisetujui di atas)
  tanggalSubmitInvoice: text("tanggal_submit_invoice"), // tanggal submit invoice di COUPA
  tanggalApproveInvoice: text("tanggal_approve_invoice"), // tanggal invoice disetujui XL di COUPA
  // Nomor invoice — INPUT MANUAL, bukan digenerate aplikasi. Nomor invoice
  // IDStar satu urutan bersama untuk SEMUA customer (bukan cuma XL), jadi
  // sumber penomorannya di luar aplikasi ini. Input Data mengetik nomor yang
  // sudah didapat dari sistem penomoran pusat perusahaan. Lihat
  // PROJECT_INSTRUCTIONS.md bagian 30 (menggantikan rencana invoiceCounter
  // otomatis di bagian 23, yang sudah dihapus dari skema ini).
  nomorInvoice: text("nomor_invoice"),

  // ====== Alokasi lintas-PO / "cross PO" (MVP 2, bagian 35) ======
  // Kalau pengajuan ini adalah bagian dari tagihan personel yang dipecah ke
  // beberapa PO (saldo PO sebelumnya tidak cukup), approval User XL untuk
  // pemecahan itu tetap terjadi di luar aplikasi (email/WhatsApp) — field ini
  // HANYA mencatat hasilnya secara internal, opsional, diisi Petugas kalau
  // relevan untuk pengajuan ini.
  approvalAlokasiUserXlPemberi: text("approval_alokasi_user_xl_pemberi"),
  approvalAlokasiTanggal: text("approval_alokasi_tanggal"), // "YYYY-MM-DD"
  approvalAlokasiReferensi: text("approval_alokasi_referensi"), // cth link/nomor chat WA atau subjek email

  // ====== MVP 4: GR Aktual, Deficiency GR, Invoice & Faktur Pajak ======
  // Nilai nominal GR aktual yang resmi disetujui klien (sebelum PPN)
  nilaiGrDisetujui: text("nilai_gr_disetujui"),
  // Selisih GR (Deficiency GR) = total tagihan pengajuan - nilaiGrDisetujui.
  // Positif = kekurangan GR (akan menambah pengajuan berikutnya)
  // Negatif = kelebihan GR (akan mengurangi pengajuan berikutnya)
  selisihGr: text("selisih_gr"),
  // ID pengajuan berikutnya yang menyerap selisih ini (menjamin one-time carry-over)
  selisihGrDipakaiPadaPengajuanId: integer("selisih_gr_dipakai_pada_pengajuan_id"),
  // Penyesuaian selisih GR dari pengajuan sebelumnya yang dibawa masuk ke pengajuan ini
  penyesuaianSelisihGrMasuk: text("penyesuaian_selisih_gr_masuk").notNull().default("0.00"),
  // Data Faktur Pajak Resmi
  nomorFakturPajak: text("nomor_faktur_pajak"),
  tanggalFakturPajak: text("tanggal_faktur_pajak"), // "YYYY-MM-DD"
  tarifPpn: text("tarif_ppn").notNull().default("11.00"), // persentase PPN (default 11, bisa 12)
});

// Rincian pengajuan per personel — hasil hitung prorata/rate penuh.
export const pengajuanDetail = pgTable("pengajuan_detail", {
  id: serial("id").primaryKey(),
  pengajuanId: integer("pengajuan_id")
    .notNull()
    .references(() => pengajuan.id),
  personelId: integer("personel_id")
    .notNull()
    .references(() => personel.id),
  hariKerjaDapatDitagihkan: integer("hari_kerja_dapat_ditagihkan").notNull(),
  hariKerjaAcuanBulan: integer("hari_kerja_acuan_bulan").notNull(),
  nilaiRateDipakai: text("nilai_rate_dipakai").notNull(), // snapshot rate saat hitung
  // Nominal yang BENAR-BENAR ditagihkan di PO pengajuan ini — bisa lebih
  // kecil dari nilaiPenuh kalau tagihan personel ini dipecah ke beberapa PO
  // (alokasi lintas-PO, bagian 35). Semua kode lain (PDF, GR Request, Summary
  // PO) memakai field ini apa adanya, jadi otomatis benar baik untuk tagihan
  // penuh maupun sebagian.
  hasilHitung: text("hasil_hitung").notNull(), // teks, hasil presisi penuh
  // Nilai tagihan PENUH personel ini untuk periode ini (rate x hari/hari),
  // SEBELUM dikurangi bagian yang sudah ditagihkan di PO lain. Snapshot
  // untuk jejak audit — null pada baris lama sebelum bagian 35 dibuat, di
  // situ hasilHitung = nilai penuh (belum pernah ada alokasi lintas-PO).
  nilaiPenuh: text("nilai_penuh"),
  // Snapshot poLineItemId dari pemetaan_personel_po saat pengajuan dibuat
  // (bagian 33) — dipakai untuk mengelompokkan "Value of Proposed GR" per
  // baris PO saat generate GR Request. Null kalau personel belum dipetakan
  // ke PO line tertentu.
  poLineItemId: integer("po_line_item_id").references(() => poLineItem.id),
  // Snapshot sumber hitung hari kerja saat pengajuan disimpan: "timesheet"
  // kalau ada timesheet yang diunggah untuk personel+PO+periode ini (dipakai
  // sebagai dasar hari kerja/kehadiran), atau "kalender" kalau dihitung dari
  // kalender kerja (default, saat belum ada timesheet). Sebelum kolom ini
  // ada, sumbernya tidak tersimpan — hanya kelihatan sesaat di layar
  // pratinjau "Buat Pengajuan", hilang begitu pengajuan disimpan.
  sumberHitung: text("sumber_hitung").notNull().default("kalender"), // "timesheet" | "kalender" | "manual" (tagihan tahap, bagian 53)
});

// =========================================================================
// TIMESHEET (dasar hari kehadiran yang dapat ditagihkan)
// =========================================================================

// Timesheet yang diunggah Petugas per personel, per PO, per periode — dari
// sumber Integral (di luar aplikasi). totalHariKerja = hari kerja acuan bulan
// menurut timesheet, totalKehadiran = hari hadir (WFO+WFH) yang dapat
// ditagihkan. Jika ada baris timesheet untuk kombinasi personel+PO+periode,
// angka ini MENGGANTIKAN hasil hitung kalender kerja (lihat hitung-pengajuan.ts).
// Unik per (personel, PO, periode) — dijaga di kode (upsert) dan di DB lewat
// unique index yang dibuat manual di migrasi (lihat skrip migrasi timesheet).
export const timesheet = pgTable("timesheet", {
  id: serial("id").primaryKey(),
  personelId: integer("personel_id")
    .notNull()
    .references(() => personel.id),
  poId: integer("po_id")
    .notNull()
    .references(() => po.id),
  userXlId: integer("user_xl_id")
    .notNull()
    .references(() => userXl.id),
  periode: text("periode").notNull(), // "YYYY-MM"
  totalHariKerja: integer("total_hari_kerja").notNull(),
  totalKehadiran: integer("total_kehadiran").notNull(),
  namaFile: text("nama_file").notNull(), // nama asli file yang diunggah
  pathFile: text("path_file").notNull(), // lokasi penyimpanan di uploads/timesheet/
  diunggahOlehUserId: integer("diunggah_oleh_user_id")
    .notNull()
    .references(() => users.id),
  diunggahPada: text("diunggah_pada").notNull().default(sql`now()::text`),
});

// =========================================================================
// ALUR PEMERIKSAAN
// =========================================================================

// Konfirmasi oleh Petugas Pengajuan dan Konfirmasi.
export const konfirmasi = pgTable("konfirmasi", {
  id: serial("id").primaryKey(),
  pengajuanId: integer("pengajuan_id")
    .notNull()
    .references(() => pengajuan.id),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  versiDikonfirmasi: integer("versi_dikonfirmasi").notNull(),
  waktu: text("waktu").notNull().default(sql`now()::text`),
});

// Pemeriksaan Checker — harus orang berbeda dari yang mengonfirmasi (dicek
// di kode aplikasi, bukan di skema).
export const checkerReview = pgTable("checker_review", {
  id: serial("id").primaryKey(),
  pengajuanId: integer("pengajuan_id")
    .notNull()
    .references(() => pengajuan.id),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  hasil: text("hasil").notNull(), // perlu_revisi | siap_diajukan
  catatan: text("catatan"),
  waktu: text("waktu").notNull().default(sql`now()::text`),
});

// =========================================================================
// DOKUMEN
// =========================================================================

export const dokumen = pgTable("dokumen", {
  id: serial("id").primaryKey(),
  pengajuanId: integer("pengajuan_id")
    .notNull()
    .references(() => pengajuan.id),
  jenis: text("jenis").notNull(), // CAC | BAST
  status: text("status").notNull().default("draft"), // draft | final
  versi: integer("versi").notNull().default(1),
  namaFile: text("nama_file"),
  dibuatPada: text("dibuat_pada").notNull().default(sql`now()::text`),
});

// Lampiran tambahan per pengajuan — file yang dibuat/diisi Input Data DI LUAR
// aplikasi ini (mis. spreadsheet tracking PO bulanan, dokumen pendukung lain
// sesuai kebutuhan) yang perlu diunggah ke sini dulu sebelum otomasi ke Get
// Approve/COUPA dijalankan (otomasi lampirkan file-file ini + CAC/BAST).
// Lihat PROJECT_INSTRUCTIONS.md bagian 22-23.
export const lampiranPengajuan = pgTable("lampiran_pengajuan", {
  id: serial("id").primaryKey(),
  pengajuanId: integer("pengajuan_id")
    .notNull()
    .references(() => pengajuan.id),
  label: text("label").notNull(), // cth "Spreadsheet Tracking PO", "Dokumen Pendukung Lainnya"
  namaFile: text("nama_file").notNull(),
  pathFile: text("path_file").notNull(),
  diunggahOlehUserId: integer("diunggah_oleh_user_id")
    .notNull()
    .references(() => users.id),
  diunggahPada: text("diunggah_pada").notNull().default(sql`now()::text`),
});

// =========================================================================
// GR REQUEST (bagian 33-34) — form Excel yang diajukan ke Get Approve untuk
// request Good Receipt. Alurnya bolak-balik dengan tim XL: Invora generate
// sheet "Excelsheet for Vendor" -> dikirim ke XL -> XL isi sheet SOW & COVER
// di file yang sama -> dikirim balik -> Invora gabungkan (pastikan sheet
// Vendor tetap sinkron dengan data terbaru) -> Checker konfirmasi sudah
// dicek sebelum lanjut ke tahap submit invoice. Satu baris per pengajuan.
// =========================================================================

export const grRequest = pgTable("gr_request", {
  id: serial("id").primaryKey(),
  pengajuanId: integer("pengajuan_id")
    .notNull()
    .references(() => pengajuan.id)
    .unique(),
  // Hasil generate sheet "Excelsheet for Vendor" (langkah 1, otomatis).
  namaFileGenerate: text("nama_file_generate"),
  pathFileGenerate: text("path_file_generate"),
  digeneratePada: text("digenerate_pada"),
  // File balikan dari tim XL — sudah berisi sheet SOW & COVER terisi (langkah 2).
  namaFileBalikanXl: text("nama_file_balikan_xl"),
  pathFileBalikanXl: text("path_file_balikan_xl"),
  diunggahBalikanPada: text("diunggah_balikan_pada"),
  diunggahBalikanOlehUserId: integer("diunggah_balikan_oleh_user_id").references(() => users.id),
  // Hasil gabung otomatis — file balikan XL dengan sheet Vendor disegarkan
  // ulang memakai data pengajuan terbaru (langkah 3).
  namaFileGabungan: text("nama_file_gabungan"),
  pathFileGabungan: text("path_file_gabungan"),
  digabungPada: text("digabung_pada"),
  // Konfirmasi cek manual tim sebelum lanjut ke tahap submit invoice (langkah 4).
  dicekOlehUserId: integer("dicek_oleh_user_id").references(() => users.id),
  dicekPada: text("dicek_pada"),
  catatanCek: text("catatan_cek"),
});

// Riwayat versi GR Request (bagian 36) — jejak APPEND-ONLY tiap kejadian di
// 4 langkah (generate/balikan/gabung/cek), beda dari `gr_request` di atas
// yang cuma simpan status TERBARU. Dipakai untuk audit "perubahan substansi
// SOW diperiksa terhadap cakupan approval XL" dari spec asli MVP 3 — supaya
// versi lama tetap bisa dilihat & diunduh, bukan tertimpa diam-diam.
export const grRequestRiwayat = pgTable("gr_request_riwayat", {
  id: serial("id").primaryKey(),
  pengajuanId: integer("pengajuan_id").notNull().references(() => pengajuan.id),
  // "generate" | "balikan" | "gabung" | "cek"
  langkah: text("langkah").notNull(),
  namaFile: text("nama_file"), // null untuk langkah "cek" (tidak ada file baru)
  pathFile: text("path_file"), // null untuk langkah "cek"
  waktu: text("waktu").notNull(),
  olehUserId: integer("oleh_user_id").references(() => users.id),
  catatan: text("catatan"), // dipakai langkah "cek" untuk catatanCek saat itu
});

// =========================================================================
// JEJAK AUDIT
// =========================================================================

export const auditLog = pgTable("audit_log", {
  id: serial("id").primaryKey(),
  entitas: text("entitas").notNull(), // nama tabel yang berubah, cth "pengajuan"
  entitasId: integer("entitas_id").notNull(),
  perubahan: text("perubahan").notNull(), // ringkasan perubahan (JSON teks)
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  waktu: text("waktu").notNull().default(sql`now()::text`),
});

// =========================================================================
// PEMBAYARAN & SETTLEMENT (MVP 5)
// =========================================================================

export const pembayaran = pgTable("pembayaran", {
  id: serial("id").primaryKey(),
  pengajuanId: integer("pengajuan_id")
    .notNull()
    .references(() => pengajuan.id),
  tanggalBayar: text("tanggal_bayar").notNull(), // "YYYY-MM-DD"
  nominalDiterima: text("nominal_diterima").notNull(), // nilai bersih masuk bank
  potonganPph23: text("potongan_pph23").notNull().default("0.00"), // potongan PPh 23 (2% dari DPP)
  nomorBupotPph23: text("nomor_bupot_pph23"), // nomor bukti potong PPh 23
  biayaAdminBank: text("biaya_admin_bank").notNull().default("0.00"), // biaya kliring/admin
  bankTujuan: text("bank_tujuan").notNull(), // cth "BCA PT IDStar Cipta Teknologi"
  nomorReferensiBank: text("nomor_referensi_bank"), // no slip/transaksi transfer
  namaFileBukti: text("nama_file_bukti"), // nama file bukti transfer
  pathFileBukti: text("path_file_bukti"), // path file di uploads/pembayaran/
  // status: "menunggu_verifikasi" | "diverifikasi" | "ditolak"
  status: text("status").notNull().default("menunggu_verifikasi"),
  catatan: text("catatan"),
  diinputOlehUserId: integer("diinput_oleh_user_id")
    .notNull()
    .references(() => users.id),
  diinputPada: text("diinput_pada").notNull().default(sql`now()::text`),
  diverifikasiOlehUserId: integer("diverifikasi_oleh_user_id").references(() => users.id),
  diverifikasiPada: text("diverifikasi_pada"),
  catatanChecker: text("catatan_checker"),
});

// =========================================================================
// LOG PENGINGAT JATUH TEMPO / EMAIL REMINDER (MVP 5 - Poin 4)
// =========================================================================

export const reminderLog = pgTable("reminder_log", {
  id: serial("id").primaryKey(),
  pengajuanId: integer("pengajuan_id")
    .notNull()
    .references(() => pengajuan.id),
  // tipe: "h-7" | "h-0" | "h+7" | "h+14" | "h+30" | "custom"
  tipeReminder: text("tipe_reminder").notNull(),
  emailPenerima: text("email_penerima").notNull(),
  namaPicPenerima: text("nama_pic_penerima"),
  subjek: text("subjek").notNull(),
  pesanTeks: text("pesan_teks").notNull(),
  // metode: "mailto" | "smtp" | "manual"
  metode: text("metode").notNull().default("mailto"),
  statusKirim: text("status_kirim").notNull().default("berhasil"),
  dikirimOlehUserId: integer("dikirim_oleh_user_id")
    .notNull()
    .references(() => users.id),
  dikirimPada: text("dikirim_pada").notNull().default(sql`now()::text`),
});

