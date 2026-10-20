# Software Development Plan (SDP) — Proyek Invora
**Otomasi Proses Invoicing XL & Multi-Klien (Penyelesaian MVP 1 – MVP 5)**

* **Versi Dokumen:** 1.0 (Berdasarkan Review Progres 9 Oktober 2026 & Roadmap MVP v2.7)
* **Target Deployment:** Server Internal IDStar (`idstar.group`)
* **Database Utama:** Supabase (PostgreSQL)

---

## 1. Pendahuluan & Tujuan Proyek

### 1.1 Latar Belakang
Invora dibangun untuk menggantikan proses persiapan tagihan manual berbasis *spreadsheet* yang rawan kesalahan perhitungan prorata, duplikasi pemakaian saldo PO, keterlambatan pelacakan selisih *Good Receipt* (GR), serta tersebarnya riwayat revisi dokumen (CAC, BAST, dan GR Request).

### 1.2 Tujuan Sistem
1. **Sentralisasi Data Multiuser:** Menyediakan satu sumber kebenaran (*single source of truth*) untuk seluruh siklus *invoicing* dari perhitungan hari kerja hingga pembayaran.
2. **Otomasi Aturan Bisnis (BRD):** Menghitung tagihan prorata dan tahapan (*milestone*), memvalidasi saldo PO secara otomatis, serta melacak selisih GR (*Deficiency GR*).
3. **Kontrol Berlapis (*Maker-Checker*):** Menegakkan pemisahan tugas di tingkat server di mana **Petugas** (pembuat/pengonfirmasi) dan **Checker** (penyetuju) wajib merupakan pengguna yang berbeda.
4. **Otomasi Dokumen:** Menghasilkan dokumen resmi (PDF CAC/BAST 3 halaman, paket *workbook* 3 *sheet* GR Request XL, serta dokumen BAST Non-XL) lengkap dengan jejak audit dan riwayat versi.

---

## 2. Status Saat Ini (Baseline Oktober 2026)

| Tahapan / Jalur | Cakupan Utama | Status Saat Ini | Sisa Pekerjaan / Catatan |
| :--- | :--- | :--- | :--- |
| **MVP 1** | Hitung Prorata sampai CAC & BAST | **Selesai** | Perlu pengujian ulang *end-to-end* karena database saat ini kosong. |
| **MVP 2** | Alokasi Lintas-PO (*Cross-PO*) | **Selesai** | Perlu perbaikan *bug* kaitan *line item* PO saat revisi pengajuan. |
| **MVP 2b** | Fondasi Operasional (Timesheet, Summary PO, RBAC, Impor, Kelola Data, Rekon) | **Selesai** | Fitur Kelola Data, Rekon Invoice, dan impor User XL belum diuji di *browser*. |
| **MVP 3** | Paket Request GR (Bolak-balik Tim XL) | **Hampir Selesai** | Tersisa 1 *gap*: Tanggal *submit* CAC belum terhubung ke alur GR Request. |
| **MVP 4** | GR Aktual sampai Invoice | **Belum Mulai** | Menunggu stabilisasi pondasi MVP 1–3 selesai. |
| **MVP 5** | Outstanding sampai Payment | **Belum Mulai** | Tahap akhir setelah alur *invoicing* MVP 4 berjalan stabil. |
| **Jalur Paralel A** | Multi-Klien (Non-XL) | **Berjalan Sebagian** | Alur Non-XL & form *milestone* belum diuji; *reminder* & BAST Non-XL belum dibuat. |
| **Jalur Paralel B** | Infrastruktur Produksi | **Perencanaan Selesai** | Cloud storage, enkripsi kredensial, deploy server, & otomasi COUPA belum dibuat. |

---

## 3. Rencana Tahapan Penyelesaian (Fase 0 – Fase 4)

### Fase 0: Stabilisasi Pondasi & Perbaikan Kritis (Pra-MVP 4)
Sebelum menulis kode untuk fitur MVP 4, langkah-langkah berikut **wajib** diselesaikan untuk mencegah kerusakan integritas data pada tahap selanjutnya:

1. **Perbaikan Bug Revisi Pengajuan (Kritis):**
   * *Masalah:* Saat pengajuan direvisi, sistem kehilangan kaitan (*foreign key/reference*) ke *line item* PO terkait.
   * *Tindakan:* Perbaiki logika *update/revision handler* agar referensi `po_line_item_id` tetap dipertahankan atau dipetakan ulang secara akurat. Hal ini krusial agar perhitungan selisih GR di MVP 4 tidak salah.
2. **Penyelesaian Gap MVP 3:**
   * Hubungkan *field* **Tanggal Submit CAC** dari modul CAC/BAST ke dalam tabel dan tampilan alur **GR Request** serta *sheet* dokumen terkait.
3. **Sinkronisasi Skema & Backup Database Pertama:**
   * Pastikan seluruh *migration script* terbaru telah diterapkan di instance Supabase.
   * Buat mekanisme *backup* otomatis/terjadwal dan lakukan *backup* pertama segera setelah data contoh/awal dimasukkan.
4. **Penanganan Masalah Database "Tidur" (*Auto-Pause*):**
   * Implementasikan *scheduled ping* (*cron job / healthcheck endpoint*) sebagai solusi sementara, atau tingkatkan (*upgrade*) paket Supabase ke paket berbayar sesuai keputusan manajemen.
5. **Seeding Data & Uji Ulang End-to-End MVP 1–3:**
   * Isi database yang saat ini kosong dengan data contoh komprehensif (Master Personel, Rate Card, PO tunggal, PO berantai, Timesheet, User XL, dan Klien Non-XL).
   * Jalankan skenario pengujian penuh dari MVP 1 hingga MVP 3.

---

### Fase 1: Penyelesaian & Pengujian Jalur Multi-Klien (Non-XL)
Menyelesaikan fitur paralel untuk klien di luar XL yang tidak menggunakan alur CAC dan GR Request XL:

1. **Verifikasi Fitur yang Sudah Dibangun:**
   * Uji coba fitur deteksi otomatis klien XL vs Non-XL saat impor PO.
   * Uji coba *bypass* (pelewatan) tahap GR Request untuk klien Non-XL.
   * Uji coba form tagihan berbasis **Tahap (*Milestone*)** di *browser*.
2. **Pembangunan Fitur Sisa Non-XL:**
   * Bangun generator **Dokumen BAST Non-XL** sesuai format standar klien umum.
   * Bangun fitur **Reminder BAST** otomatis untuk mengingatkan Petugas terkait tagihan tahapan/bulanan Non-XL yang mendekati jatuh tempo penagihan.

---

### Fase 2: Pembangunan MVP 4 (GR Aktual sampai Invoice)
Fokus utama fase ini adalah rekonsiliasi antara pengajuan tagihan dengan persetujuan aktual dari XL (*Good Receipt*), pengelolaan selisihnya, dan penerbitan *Invoice*.

1. **Pencatatan GR Aktual:**
   * Antarmuka dan *endpoint* bagi Petugas untuk menginput atau mengimpor nilai dan nomor GR aktual yang disetujui oleh XL per *line item* pengajuan.
   * Validasi perubahan status pengajuan setelah GR aktual diverifikasi oleh Checker.
2. **Mesin Perhitungan *Deficiency GR* (Selisih GR):**
   * Sistem menghitung selisih secara otomatis dengan rumus:
     $$\text{Deficiency GR} = \text{Nilai Pengajuan} - \text{GR Disetujui}$$
   * **Aturan Bisnis Ketat:** Nilai $\text{Deficiency GR} > 0$ wajib ditandai dan **otomatis terbawa tepat satu kali** (*one-time carry-over*) ke periode pengajuan berikutnya untuk personel/PO terkait, lengkap dengan pengunci status agar tidak tertagih ganda atau terlewat.
3. **Manajemen Invoice, BAST Final, & Faktur Pajak:**
   * Pembuatan *record* Invoice resmi dengan aturan nilai dasar:
     $$\text{Nilai Invoice (Sebelum PPN)} = \text{GR Disetujui}$$
   * Perhitungan otomatis nilai PPN dan Total Tagihan ($\text{Total Invoice} = \text{GR Disetujui} + \text{PPN}$).
   * Pencatatan dan pengunggahan berkas Faktur Pajak serta dokumen BAST final yang telah ditandatangani.
4. **Kontrol Penyelesaian PO (*PO Closure Control*):**
   * Pelacakan realisasi PO secara menyeluruh: membandingkan Nilai Awal PO, Total Pengajuan, Total GR Disetujui, dan Sisa Saldo PO.
   * Mekanisme penutupan PO (*Close PO*) ketika seluruh *milestone* atau saldo telah terealisasi penuh dan tidak ada *Deficiency GR* yang menggantung.

---

### Fase 3: Pembangunan MVP 5 (Outstanding sampai Payment)
Menutup siklus pendapatan (*order-to-cash*) dengan memantau tagihan yang telah terbit hingga pembayaran diterima:

1. **Pelacakan *Outstanding Invoice* & *Aging Receivable*:**
   * Dashboard dan daftar pantau seluruh *invoice* yang telah dikirim ke klien namun belum lunas (*Unpaid / Partial*).
   * Perhitungan umur piutang (*Aging Schedule*: $0\text{--}30$ hari, $31\text{--}60$ hari, $61\text{--}90$ hari, $>90$ hari) berdasarkan tanggal terima *invoice* atau *Term of Payment* (TOP).
   * Sistem pengingat (*alert/notification*) untuk *invoice* yang mendekati atau melewati tanggal jatuh tempo.
2. **Pencatatan Pembayaran (*Payment Settlement*):**
   * Form pencatatan bukti bayar (Tanggal Bayar, Nominal Diterima, Potongan PPh/Biaya Bank jika ada, dan unggah bukti transfer).
   * Verifikasi pelunasan oleh Checker untuk mengubah status *invoice* menjadi **Paid / Closed**.
3. **Laporan Eksekutif & Rekonsiliasi Akhir:**
   * Ekspor laporan komprehensif dari PO $\rightarrow$ CAC/BAST $\rightarrow$ GR $\rightarrow$ Invoice $\rightarrow$ Payment dalam format `.xlsx` untuk kebutuhan tim Finance dan Manajemen.

---

### Fase 4: Infrastruktur Produksi & Deployment
Memindahkan Invora dari lingkungan lokal pengembang ke lingkungan produksi yang aman dan andal:

1. **Migrasi Penyimpanan File (*Cloud Object Storage*):**
   * Pindahkan penyimpanan berkas unggahan (PDF CAC/BAST, file Excel GR Request, bukti persetujuan WA/Email, Faktur Pajak) dari *local disk* laptop ke *Cloud Storage* (mis. Supabase Storage atau S3-compatible storage) agar persisten saat aplikasi di-deploy ke server.
2. **Keamanan & Enkripsi Kredensial:**
   * Implementasikan enkripsi untuk penyimpanan kredensial per-user di dalam database.
   * Pertahankan kebijakan keamanan database yang telah diterapkan pada 7 Oktober (penutupan akses API publik dan rotasi kata sandi).
3. **Deployment ke Server Produksi:**
   * Koordinasi dengan tim IT untuk penyediaan *environment* di server kantor IDStar dengan domain resmi `idstar.group` (termasuk konfigurasi SSL/HTTPS, *reverse proxy*, dan *environment variables*).
4. **Integrasi & Otomasi Lanjutan:**
   * Pembangunan modul otomasi integrasi ke sistem eksternal (**Get Approve / COUPA**) sesuai spesifikasi kredensial per-user.

---

## 4. Rencana Pengujian & Quality Assurance (QA Checklist)

Mengingat adanya fitur yang sudah dibangun namun belum teruji pada laporan 9 Oktober 2026, daftar pengujian berikut wajib lulus (Pass) sebelum *sign-off* setiap fase:

### 4.1 Daftar Uji Regresi & Fitur Tertunda (Wajib sebelum MVP 4)
- [ ] **Uji Rumus Prorata MVP 1:** Pastikan perhitungan $\text{Tagihan} = \text{Rate Card} \times \frac{\text{Hari Tertagih}}{\text{Hari Kerja Bulan Itu}}$ akurat serta mengecualikan hari libur nasional dan akhir pekan.
- [ ] **Uji Maker-Checker:** Pastikan server menolak (*HTTP 403 Forbidden*) jika akun yang sama mencoba melakukan konfirmasi Petugas sekaligus persetujuan Checker.
- [ ] **Uji Alokasi Lintas-PO (MVP 2):** Simulasikan tagihan $\text{Rp } 15.000.000$ pada $\text{PO A}$ bersaldo $\text{Rp } 10.000.000$ dan pastikan $\text{Rp } 5.000.000$ dialokasikan secara akurat ke $\text{PO B}$.
- [ ] **Uji Revisi Pengajuan:** Lakukan revisi pada pengajuan yang sudah memiliki kaitan *line item* PO, pastikan kaitan tidak hilang.
- [ ] **Uji Alur Dokumen CAC vs Non-XL:** Pastikan pengajuan klien XL menghasilkan dokumen CAC & masuk ke alur GR Request, sedangkan klien Non-XL langsung melewati GR Request (*end-to-end*).
- [ ] **Uji Form Tagihan Tahap (*Milestone*):** Uji pembuatan, pengeditan, dan validasi saldo untuk tagihan berbasis persentase/tahapan di *browser*.
- [ ] **Uji Modul Operasional (MVP 2b):** Uji fungsionalitas halaman **Kelola Data**, **Rekon Invoice (`.xlsx`)**, dan fitur **Impor User XL** secara langsung di *browser*.
- [ ] **Uji UI Tabel Master:** Verifikasi tampilan kolom final pada halaman **Personel & Rate Card**.

### 4.2 Daftar Uji Penerimaan MVP 4 & MVP 5 (UAT)
- [ ] **Uji One-Time Carry Over Deficiency GR:** Simulasikan pengajuan $\text{Rp } 20.000.000$ dengan GR Aktual $\text{Rp } 18.000.000$. Pastikan $\text{Deficiency GR} = \text{Rp } 2.000.000$ muncul otomatis pada pembuatan pengajuan bulan berikutnya dan tidak muncul lagi setelah ditagihkan.
- [ ] **Uji Konsistensi Nilai Invoice:** Pastikan nilai Invoice sebelum PPN terkunci sama dengan nilai GR yang disetujui.
- [ ] **Uji Siklus Pembayaran (MVP 5):** Pastikan perubahan status *Outstanding* ke *Paid* memperbarui *dashboard* piutang secara *real-time*.

---

## 5. Matriks Mitigasi Risiko

| ID | Risiko | Dampak | Status | Langkah Mitigasi dalam SDP |
| :--- | :--- | :--- | :--- | :--- |
| **R1** | Bug revisi pengajuan kehilangan kaitan *line item* PO | Perhitungan selisih GR di MVP 4 menjadi salah | **Terbuka** | Dijadikan *blocker* nomor 1 di **Fase 0**; dilarang memulai pengembangan MVP 4 sebelum *bug* ini tertutup. |
| **R2** | Database gratis otomatis "tidur" bila tidak dipakai | Aplikasi mati total sampai diaktifkan manual | **Terbuka** | Pasang *cron job ping* otomatis setiap 12 jam di **Fase 0** sambil menunggu persetujuan anggaran paket berbayar. |
| **R3** | Belum ada *backup* database | Kehilangan data permanen jika terjadi kegagalan sistem | **Terbuka** | Konfigurasi *automated daily dump* dan lakukan *backup* manual pertama sebelum pengujian ulang MVP 1–3. |
| **R4** | File unggahan masih tersimpan di laptop pengembang | File hilang/tidak terbawa saat aplikasi pindah ke server | **Terbuka** | Migrasi layanan penyimpanan berkas ke *Cloud Storage* sebelum proses *deployment* server produksi (**Fase 4**). |
| **R5** | Database bisa diakses publik lewat API | Kebocoran data sensitif tagihan dan personel | **Selesai (7 Okt)** | Akses publik telah ditutup (RLS aktif) dan seluruh *password* telah diganti. Tetap lakukan audit berkala. |

---

## 6. Estimasi Urutan Eksekusi (Timeline)

1. **Minggu 1 — Fase 0 (Stabilisasi & QA MVP 1–3):**
   * Perbaikan *bug* revisi *line item* PO & *gap* tanggal submit CAC di MVP 3.
   * Setup *backup* database & pencegah database tidur.
   * *Seeding* data contoh & penyelesaian seluruh pengujian tertunda di *browser*.
2. **Minggu 2–3 — Fase 2 (Pembangunan MVP 4 - Prioritas Utama Bisnis):**
   * Pengembangan modul GR Aktual, kalkulasi otomatis *Deficiency GR*, manajemen Invoice & Faktur Pajak, serta kontrol penutupan PO.
   * UAT MVP 4.
3. **Minggu 4 — Fase 1 (Penyelesaian Penuh Multi-Klien Non-XL):**
   * Pembangunan dokumen BAST Non-XL, *reminder* BAST, dan pengujian *end-to-end* skenario Non-XL.
4. **Minggu 5 — Fase 3 (Pembangunan MVP 5 - Outstanding sampai Payment):**
   * Pengembangan modul pelacakan *Outstanding Invoice*, *aging*, pencatatan pelunasan, dan pelaporan akhir.
5. **Minggu 6 — Fase 4 (Infrastruktur Produksi & Go-Live):**
   * Migrasi file ke *Cloud Storage*, enkripsi kredensial, deployment ke server `idstar.group` bersama tim IT, serta uji coba akhir di lingkungan produksi.