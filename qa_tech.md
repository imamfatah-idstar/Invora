# ⚙️ Daftar Pertanyaan & Jawaban Teknis / Teknologi (Technical Q&A) — INVORA
**INVORA — Invoice Operations & Revenue Assurance (PT IDStar Cipta Teknologi)**  
🌐 **Live Production URL:** [https://invora-iota.vercel.app/](https://invora-iota.vercel.app/)

Dokumen ini berisi daftar pertanyaan dan jawaban mendalam dari sisi **arsitektur perangkat lunak, pemilihan teknologi (*tech stack*), desain database, algoritma perhitungan finansial, keamanan siber, pemrosesan dokumen (PDF/Excel/CSV), hingga *deployment* CI/CD**.

---

## 1. Arsitektur Sistem & Pemilihan Tech Stack

### Q1: Apa saja *tech stack* utama yang digunakan untuk membangun INVORA dan mengapa dipilih?
**Jawaban:**  
INVORA dibangun dengan arsitektur *modern full-stack TypeScript* yang berfokus pada keamanan tipe data (*type-safety*), kecepatan *rendering*, dan keandalan transaksi finansial:
- **Framework Utama:** **Next.js 16.4 (App Router)** dengan **React 19.2** — memadukan *React Server Components (RSC)* untuk *query* data langsung di sisi server dengan *Client Components* interaktif pada form kalkulasi dan modal.
- **Bahasa Pemrograman:** **TypeScript 5.x** (*strict mode*) — menjamin konsistensi kontrak data dari skema database hingga komponen UI dan API.
- **Database & ORM:** **PostgreSQL (Supabase)** yang diakses melalui **Drizzle ORM (`0.45.2`)** dan driver **`postgres` (`postgres.js` `3.4.9`)** — memberikan performa *query* SQL tingkat rendah tanpa *overhead* berat serta *type inference* otomatis.
- **Mesin Aritmatika Finansial:** **`decimal.js` (`10.6.0`)** — menangani seluruh operasi mata uang Rupiah, prorata hari kerja, PPN, dan alokasi lintas PO dengan presisi *arbitrary-precision decimal*.
- **Generator Dokumen:** **`pdf-lib` (`1.17.1`)** untuk pembangkitan PDF sisi server dan **`exceljs` (`4.4.0`)** untuk pembuatan & *merging* paket Excel *GR Request* multi-sheet (`.xlsx`).
- **Autentikasi & Email:** **`bcryptjs` (`3.0.3`)** untuk *hashing* kredensial, Google OAuth 2.0, serta **`nodemailer` (`10.4.0`)** untuk pengiriman Invoice via SMTP.
- **Testing & Validasi:** **`vitest` (`5.1.0`)** untuk pengujian unit logika bisnis dan **`zod` (`4.6.7`)** untuk validasi skema.

### Q2: Mengapa menggunakan arsitektur Next.js App Router (Server Components + Route Handlers) dibandingkan memisahkan *frontend* SPA dan *backend* REST tradisional?
**Jawaban:**  
1. **Zero-Latency Data Fetching di Server:** Halaman seperti Dashboard, Daftar Pengajuan (`/pengajuan`), dan Detail Pengajuan (`/pengajuan/[id]`) dirender sebagai *Server Components* yang langsung mengeksekusi *query* Drizzle ORM ke PostgreSQL tanpa mengekspos kredensial database ke *browser*.
2. **Enforced Server-Side Security:** Pemeriksaan sesi dan otorisasi peran (`wajibRole` pada halaman dan `wajibRoleApi` pada `/api/**`) dijalankan langsung di server sebelum HTML atau JSON dikirim ke klien.
3. **Single Deployment Unit di Vercel:** *Frontend* dan seluruh API *endpoint* (`/api/pengajuan`, `/api/timesheet`, `/api/pemetaan`, dll.) ter-deploy secara atomik sebagai *Serverless Functions* di Vercel setiap kali ada *push* ke branch `main`.

---

## 2. Database, Drizzle ORM & Desain Skema Data

### Q3: Mengapa memilih Drizzle ORM dibandingkan Prisma atau ORM lainnya?
**Jawaban:**  
1. **Serverless & Cold-Start Friendly:** Drizzle ORM murni berbasis TypeScript/JavaScript tanpa *binary engine* Rust tambahan, sehingga waktu *cold-start* pada *Vercel Serverless Functions* jauh lebih cepat dan hemat memori.
2. **SQL-Like & Predictable Queries:** Sintaks Drizzle (`db.select().from(pengajuan).innerJoin(...)`) memetakan 1:1 ke query SQL standar sehingga tidak menghasilkan *N+1 query problem* tersembunyi.
3. **Tipe Kolom `numeric(18, 2)` Presisi Tinggi:** Kolom finansial seperti `nilaiRate`, `hasilHitung`, `nilaiItem`, `saldoSebelumPpn`, dan `nilaiGrDisetujui` disimpan sebagai tipe PostgreSQL `NUMERIC` dan dikembalikan sebagai `string` ke aplikasi untuk langsung diproses oleh `decimal.js` tanpa kehilangan presisi.

### Q4: Bagaimana struktur relasi tabel utama di database PostgreSQL INVORA?
**Jawaban:**  
Skema database didefinisikan secara terpusat di `src/db/schema.ts`:
- **`users`**: Menyimpan akun pengguna internal, *hash* password, status aktif, dan daftar peran (`roles`: `admin`, `petugas`, `checker`).
- **`personel`**: Menyimpan master talenta (`nik`, `nama`, `tipe`, `posisi`, `status`, `penempatanKlien`, `tanggalMulaiSpk`, `tanggalAkhirSpk`, `nomorSpk`).
- **`rate_card`**: Menyimpan histori tarif bulanan per personel (`personelId`, `nilaiRate`, `berlakuDari`, `berlakuSampai`).
- **`po` & `po_line_item`**: Menyimpan master *Purchase Order* (`nomorPo`, `namaProyek`, `klien`/Company, `nilaiItem`, `saldoSebelumPpn`, `jenisTagihan`, `statusPo`) beserta rincian *line item*-nya.
- **`user_xl`**: Menyimpan master *Client Approver / PIC Klien* yang terhubung ke `poId`.
- **`pemetaan_personel_po`**: Menghubungkan `personelId` dengan `poId`, `poLineItemId`, dan `userXlId` (dengan logika *idempotent upsert* per `personelId` agar tidak pernah duplikat).
- **`timesheet`**: Menyimpan realisasi hari kerja (`totalHariKerja`, `totalKehadiran`, `tanggalTimesheet`, `namaFile`, `pathFile`) per `(personelId, poId, periode)`.
- **`pengajuan` & `pengajuan_detail`**: Menyimpan *header* pengajuan tagihan (status *state machine*, nomor Invoice, Faktur Pajak, GR Slip, nilai GR disetujui, serta *carry-over Deficiency GR*) dan baris rincian per personel.
- **`dokumen`**: Menyimpan siklus hidup dokumen resmi (`CAC`, `BAST`, `GR`), versi, status approval Checker, dan catatan revisi.
- **`pembayaran` & `audit_log`**: Menyimpan pencatatan pelunasan (termasuk potongan PPh 23 & biaya admin bank) serta jejak audit komprehensif untuk setiap mutasi data.

---

## 3. Presisi Finansial & Algoritma Mesin Hitung

### Q5: Mengapa sistem tidak menggunakan tipe `number` bawaan JavaScript untuk menghitung tagihan?
**Jawaban:**  
Tipe `number` standar JavaScript menggunakan representasi biner *IEEE 754 floating-point* yang menyebabkan galat pembulatan pada pembagian pecahan (contoh klasik: `0.1 + 0.2 === 0.30000000000000004`, atau saat menghitung prorata `Rp17.765.435 * 19 / 21`).  
Di dalam sistem penagihan korporat, selisih 1 Rupiah pun dapat menyebabkan penolakan Faktur Pajak atau gagal rekonsiliasi dengan sistem SAP/COUPA klien. Oleh karena itu, seluruh modul kalkulasi (`src/lib/hitung-pengajuan.ts`) menggunakan **`Decimal` dari `decimal.js`** dan pembulatan eksplisit `.toFixed(2)` pada hasil akhir.

### Q6: Bagaimana algoritma perhitungan prorata, Alokasi Lintas PO (*Cross-PO*), dan *Deficiency GR* bekerja di sisi server?
**Jawaban:**  
1. **Resolusi Sumber Hari Kerja (`hitungSemuaPersonelUntukPo`):**
   - Sistem mengecek apakah personel memiliki entri di tabel `timesheet` untuk `(poId, periode)`.
   - Jika ada, `sumberHitung = "timesheet"` dan nilai dihitung dengan `new Decimal(rate).times(totalKehadiran).dividedBy(totalHariKerja)`.
   - Jika belum ada, sistem menghitung irisan hari kerja aktif antara masa berlaku SPK/pemetaan personel dengan kalender bulan tersebut dikurangi hari libur nasional/cuti bersama (`kalender_kerja`).
2. **Alokasi Lintas PO (`terapkanAlokasiLintasPo`):**
   - Server menghitung ulang di sisi *backend* (tidak pernah mempercayai angka kiriman *client* mentah).
   - Untuk setiap personel pada periode `YYYY-MM`, sistem menjumlahkan berapa nominal yang sudah ditagihkan pada PO lain di bulan yang sama (`sudahDialokasikanDiPoLain`), lalu membatasi tagihan pada PO saat ini sebesar `min(sisaPerluDitagih, sisaSaldoPo)`.
3. **One-Time Carry-Over Deficiency GR (`cariSelisihGrMenggantung`):**
   - Saat nilai GR yang disetujui klien (`nilaiGrDisetujui`) berbeda dari total pengajuan awal, selisihnya disimpan di kolom `selisihGr`.
   - Ketika pengajuan baru dibuat pada PO yang sama, fungsi `cariSelisihGrMenggantung(poId)` mencari pengajuan terdahulu yang memiliki `selisihGr != 0` dan `selisihGrDipakaiPadaPengajuanId IS NULL`.
   - Begitu ditarik ke pengajuan baru (`penyesuaianSelisihGrMasuk`), pengajuan lama langsung dikunci dengan mengisi `selisihGrDipakaiPadaPengajuanId = ajuanBaru.id` dalam satu alur transaksi sehingga **mustahil terklaim dua kali**.

---

## 4. Keamanan, Autentikasi & Enforced RBAC

### Q7: Bagaimana sistem mengamankan sesi pengguna dan menegakkan *Segregation of Duties* (Maker-Checker)?
**Jawaban:**  
1. **Autentikasi Berlapis:**
   - Mendukung login email/password (di-hash dengan `bcryptjs`) serta **Google OAuth 2.0** (`/api/auth/google`).
   - Diterapkan validasi domain email korporat (`@idstar.group`) dan pengecekan status akun aktif di database pada setiap *request*.
2. **Server-Side Role Middleware (`src/lib/require-role.ts` & `src/lib/require-role-api.ts`):**
   - Setiap halaman *Server Component* memanggil `await wajibRole([...])` dan setiap *API Route Handler* memanggil `await wajibRoleApi([...])`.
   - Sebagai contoh, endpoint `POST /api/pengajuan` dikunci hanya untuk peran `petugas` (*Maker*), sedangkan endpoint `POST /api/pengajuan/[id]/checker` dan `/dokumen/[dokumenId]/approve` dikunci hanya untuk peran `checker` (*Approver*).
3. **Audit Trail Imutabel (`catatAudit`):**
   - Setiap aksi pembuatan, perubahan, penghapusan dokumen, impor CSV, hingga persetujuan Checker dicatat ke tabel `audit_log` beserta `userId`, `entitas`, `entitasId`, `perubahan`, dan `waktu`.

---

## 5. Pemrosesan File (CSV Importer, PDF Engine & Excel Multi-Sheet)

### Q8: Bagaimana cara kerja *Combined CSV Importer* pada halaman Personnel hingga mampu mengisi 5 tabel sekaligus tanpa duplikasi?
**Jawaban:**  
Endpoint `POST /api/data-referensi/personel/impor-csv` (`src/app/api/data-referensi/personel/impor-csv/route.ts`) bekerja dengan tahapan berikut:
1. **Normalisasi & Parsing CSV:** Menghapus karakter *UTF-8 BOM* (`\uFEFF`), mem-parsing CSV sesuai standar kuotasi RFC-4180 (`parseCsv`), dan memetakan alias nama kolom secara *case-insensitive*.
2. **Pre-Aggregation Pagu PO:** Menghitung akumulasi `rate_card * 12` per `po_number` sebagai estimasi pagu awal apabila PO belum pernah terdaftar.
3. **Idempotent Upsert Berurutan:**
   - **Tabel `personel`:** Mencocokkan berdasarkan nama (`case-insensitive`); jika belum ada di-insert, jika sudah ada di-update (`nik`, `tipe`, `posisi`, `penempatanKlien`, `tanggalMulaiSpk`, `tanggalAkhirSpk`, `nomorSpk`).
   - **Tabel `rate_card`:** Mengecek rate terakhir personel; hanya membuat/memperbarui rate jika nilainya berubah.
   - **Tabel `po`:** Mencocokkan `nomorPo`; jika belum ada dibuat baru beserta kolom `klien` (`Company`).
   - **Tabel `user_xl`:** Mencocokkan nama *User/Approver* dan menautkannya ke `po.id`.
   - **Tabel `pemetaan_personel_po`:** Mengecek berdasarkan `personelId`; jika personel sudah memiliki pemetaan, baris yang ada langsung di-update (`poId`, `berlakuDari`, `berlakuSampai`, `userXlId`) dan baris duplikat (jika ada) dibersihkan otomatis.

### Q9: Bagaimana mekanisme pembuatan dokumen BAST, CAC, GR, dan PDF Invoice di dalam aplikasi?
**Jawaban:**  
1. **Auto-Provisioning Dokumen Saat Pengajuan Dibuat:**
   - Di dalam `POST /api/pengajuan`, fungsi `buatDokumenAwalPengajuan` memeriksa `apakahKlienXl(poRow.klien)` (`src/lib/klien.ts`).
   - Jika klien adalah **XL**, sistem otomatis meng-insert 3 baris dokumen (`CAC`, `BAST`, `GR`) berstatus `draft`. Jika **Non-XL**, sistem otomatis meng-insert dokumen `BAST`.
2. **Gatekeeping Invoice untuk Klien XL:**
   - Pada `src/app/pengajuan/[id]/page.tsx`, variabel `siapInvoice` mengecek apakah ketiga dokumen (`CAC`, `BAST`, `GR`) sudah berstatus `disetujui`. Sebelum ketiganya disetujui, komponen `<InvoiceModal />` dikunci dan digantikan oleh tombol navigasi ke seksi dokumen.
3. **Render Dokumen & PDF Generator:**
   - Dokumen CAC XL (`cac-xl-view.tsx`), BAST XL (`bast-xl-view.tsx`), GR XL (`gr-xl-view.tsx`), dan BAST Non-XL (`bast-non-xl-view.tsx`) dirender secara presisi mengikuti tata letak dokumen resmi perusahaan, sementara endpoint `/api/pengajuan/[id]/invoice/pdf` dan `/dokumen/[dokumenId]/pdf` men-generate berkas PDF siap unduh/kirim menggunakan `pdf-lib`.

---

## 6. Deployment, Skalabilitas & Penanganan File di Cloud

### Q10: Bagaimana alur *deployment* ke Vercel dan bagaimana penanganan unggahan file (*timesheet* / lampiran) pada lingkungan *serverless*?
**Jawaban:**  
1. **Continuous Deployment (GitHub → Vercel):**
   - Repositori GitHub (`imamfatah-idstar/Invora`) terhubung langsung ke proyek Vercel (`invora-iota.vercel.app`). Setiap *commit* ke branch `main` otomatis menjalankan *build* produksi (`next build`), validasi TypeScript, dan mempublikasikan pembaruan tanpa *downtime*.
2. **Resilient File Handling di Serverless (`src/app/api/timesheet/route.ts`):**
   - Pada lingkungan *serverless* seperti Vercel di mana *filesystem* bersifat *ephemeral* (`/tmp` atau *read-only* di luar direktori sementara), fungsi penyimpanan file (`simpanFileTimesheet`) dilengkapi *graceful fallback* sehingga metadata unggahan dan perhitungan *workdays* di database PostgreSQL tetap tersimpan 100% tanpa menyebabkan *error 500*.

