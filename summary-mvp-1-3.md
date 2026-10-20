# Summary Review MVP 1–3: Invora (Proses Invoicing XL)

**Tanggal review:** 9 Oktober 2026
**Sumber:** `ROADMAP_MVP_v2.0.md` (v2.7, 5 Okt 2026), `PROJECT_INSTRUCTIONS.md` (sampai bagian 53), dicocokkan dengan kode dan riwayat git Invora.
**Tujuan:** acuan sebelum lanjut ke MVP 4, sekaligus bahan presentasi ke management (BRD sampai tahap yang sudah dibangun).

---

## 1. Executive Summary

- **MVP 1, MVP 2, MVP 2b, dan MVP 3 secara fungsi sudah dibangun.** Satu-satunya sisa gap MVP 3 kecil dan tidak menghalangi pemakaian.
- **Dari sisi pengujian, belum siap.** Database saat ini kosong (0 PO, 0 personel, 0 timesheet per 7 Okt 2026), dan beberapa fitur ditandai "dibangun, belum diuji". Alur penuh belum terbukti berjalan di database yang sekarang.
- **Ada 1 bug yang langsung berdampak ke MVP 4** (kaitan line item hilang saat revisi). Perbaiki sebelum mulai MVP 4.

---

## 2. Perjalanan proyek: dari BRD sampai sekarang

| Tanggal | Tonggak |
|---|---|
| Sebelum Sep 2026 | BRD Invoicing XL Smart v1.0 disetujui; cakupan MVP 1–5 disetujui (`MVP_LENGKAP_v1.0.md`) |
| 16 Sep | MVP 1 dibangun dan diuji lokal; peran Administrator dibatasi ke akun, data referensi, kalender |
| 17 Sep | Timesheet jadi dasar hari kerja; Summary PO; database pindah dari SQLite lokal ke Supabase; halaman Akun & Akses |
| 18 Sep | Pemetaan field Get Approve CAC/BAST & COUPA; PDF CAC/BAST 3 halaman; status proses CAC → Invoice; dashboard durasi; impor Integral; rebrand jadi **Invora** |
| 18–20 Sep | GR Request: generate Excel otomatis, alur bolak-balik dengan tim XL, gate Checker sebelum Nomor Invoice |
| 21 Sep | **MVP 2 (cross PO)** dibangun dan diuji |
| 22 Sep | Riwayat versi GR Request (penyempurnaan MVP 3) |
| 28–29 Sep | Impor massal PO (CSV/Excel, format tracker resmi); ditemukan risiko Supabase auto-pause |
| 30 Sep | Scope **Multi-Klien (Non-XL)** masuk dan sebagian dibangun; Kelola Data; download Rekon Invoice; impor User XL |
| 5 Okt | Form tagihan "tahap" (milestone) manual per personel |
| 7 Okt | Perbaikan keamanan Supabase: RLS aktif di 19 tabel, password database dan akun diganti |

---

## 3. Status per tahap

| Tahap | Scope | Status | Sisa |
|---|---|---|---|
| **MVP 1** | Hitung prorata → konfirmasi Petugas → Checker (beda orang, ditegakkan server) → CAC/BAST PDF 3 halaman; login, 3 role, jejak audit | **Selesai** | Tidak ada |
| **MVP 2** | Cross PO: kelebihan tagihan dilanjutkan ke PO berikutnya (dipilih manual oleh Petugas, bisa berantai >2 PO); approval User XL dicatat internal | **Selesai (21 Sep)** | Tidak ada |
| **MVP 2b — Fondasi Operasional** (di luar rencana v1.0) | Summary PO, timesheet sebagai dasar hari, Akun & Akses, impor Integral multi-klien, Kelola Data, Rekon Invoice, impor User XL | **Selesai** | Kelola Data, Rekon Invoice, impor User XL belum dicoba di browser |
| **MVP 3 — Paket Request GR** | Generate sheet Vendor → XL isi SOW/COVER → unggah balikan → gabung otomatis → **Checker wajib cek sebelum Nomor Invoice bisa diisi**; riwayat versi | **Hampir selesai** | `tanggalSubmitCac` belum terhubung ke alur GR Request |
| MVP 4 — GR Aktual s/d Invoice | GR aktual, Deficiency GR, invoice/BAST/faktur, kontrol penyelesaian PO | **Belum dikerjakan** | Tahap berikutnya |
| MVP 5 — Outstanding s/d Payment | Reminder email Senin 09.00 WIB ke Finance XL, pencatatan payment, jadwal bayar dari tanggal approval COUPA | **Belum dikerjakan** | Setelah MVP 4 |

**Jalur paralel:**

| Jalur | Status |
|---|---|
| Multi-Klien (Non-XL) | Impor & deteksi XL/Non-XL dibangun dan diuji; cabang CAC/GR Request Non-XL dibangun, belum diuji end-to-end; form tagihan "tahap" dibangun, belum diuji; **badge reminder BAST dan BAST Non-XL belum dibuat** |
| Infrastruktur Produksi | Arsitektur hosting & kredensial sudah diputuskan; penyimpanan file ke Supabase Storage, enkripsi kredensial, pilihan hosting, otomasi browser Get Approve/COUPA **belum** |

---

## 4. Temuan penting

### 4.1 Bug yang memengaruhi MVP 4 (paling kritis)

Saat pengajuan **bulanan** direvisi, `poLineItemId` tidak ikut tersalin ke rincian baru (bagian 53, catatan 2, belum diperbaiki). GR Request dibangun per line item, dan MVP 4 menghitung selisih GR di atas data itu. Pengajuan yang pernah direvisi berisiko kehilangan kaitan line item-nya, sehingga **Deficiency GR bisa salah hitung**.

### 4.2 Testing debt

| Fitur | Status uji |
|---|---|
| Cabang alur CAC vs Non-XL (bagian 44) | Belum diuji end-to-end |
| GR Request di-skip untuk Non-XL (bagian 45) | Belum diuji end-to-end |
| Kolom final per halaman (bagian 51) | Belum diuji |
| Form tagihan "tahap" (bagian 53) | Belum diuji di browser |
| Kelola Data, Rekon Invoice, impor User XL (bagian 48) | Baru dicek `tsc`, belum di browser |

Data uji sebelumnya sudah tidak ada di database, jadi pengujian MVP 1–3 perlu diulang dengan data dummy sebelum MVP 4 dibangun di atasnya.

### 4.3 Migrasi database mungkin tertunda

Bagian 53: kolom `pengajuan.keterangan_tahap` wajib di-push (`npx drizzle-kit push`). Belum ada catatan bahwa sudah dijalankan. Kalau belum, pembuatan pengajuan tahap akan error.

Catatan keamanan: menambah kolom tidak perlu menjalankan ulang SQL RLS, tapi **menambah tabel baru wajib** (lihat `claude/keamanan-supabase-rls.md`).

### 4.4 Dokumen tertinggal dari kondisi nyata

- Roadmap menyebut perubahan bagian 49–51 belum di-commit; git menunjukkan sudah (commit 5 Okt). Bagian 53 juga sudah ter-commit.
- Perbaikan keamanan 7 Okt belum tercatat di roadmap maupun instructions.
- Header `PROJECT_INSTRUCTIONS.md` masih v3.7 / 28 Sep, padahal isinya sampai 5 Okt.
- Skrip baru `scripts/ganti-sandi.ts` (7 Okt) belum di-commit.

### 4.5 Keputusan infrastruktur yang masih terbuka

- **Supabase auto-pause:** upgrade ke Pro atau ping terjadwal. Sudah pernah membuat aplikasi mati total (29 Sep).
- **Belum ada backup database sama sekali.** Makin penting begitu data asli masuk.
- File unggahan masih di folder lokal `uploads/`; wajib pindah ke Supabase Storage sebelum deploy.

---

## 5. Action Plan sebelum mulai MVP 4

| # | Tindakan | Alasan |
|---|---|---|
| 1 | **Perbaiki bug `poLineItemId` saat revisi pengajuan bulanan** | Langsung memengaruhi hitungan Deficiency GR |
| 2 | Pastikan `drizzle-kit push` untuk `keterangan_tahap` sudah jalan | Mencegah error saat membuat pengajuan tahap |
| 3 | **Uji regresi MVP 1–3 dengan data dummy**: impor PO → impor Integral → pengajuan bulanan + cross PO → GR Request → Nomor Invoice | Pondasi MVP 4 harus terbukti jalan |
| 4 | Buat backup pertama (`pg_dump` atau dashboard Supabase) | Belum ada salinan data |
| 5 | Perbarui roadmap & instructions (status commit, keamanan 7 Okt); commit `ganti-sandi.ts` | Satu acuan yang akurat |
| 6 | **Putuskan prioritas:** MVP 4, sisa Multi-Klien, atau Infrastruktur | Keputusan #4 di roadmap masih terbuka |

---

## 6. Gambaran MVP 4 (tahap berikutnya)

- Pencatatan **GR aktual** (berbeda dari GR usulan di MVP 3).
- **Deficiency GR** = pengajuan final − GR disetujui, dihitung otomatis dan diterapkan **tepat sekali** ke pengajuan berikutnya (bukan angka yang bisa diedit bebas).
- Pencatatan **invoice + BAST + faktur pajak**, dengan aturan invoice sebelum PPN = GR disetujui.
- **Kontrol penyelesaian PO:** total invoice sebelum PPN = nilai PO sebelum PPN.

Saat ini aplikasi baru mencatat `nomorInvoice`, `tanggalGrDisetujui`, `nomorGrSlip` secara manual; belum ada logika selisih otomatis maupun kontrol penyelesaian PO.
