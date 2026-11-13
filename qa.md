# 📋 Daftar Pertanyaan & Jawaban (Q&A) Sistem INVORA
**INVORA — Invoice Operations & Revenue Assurance (PT IDStar Cipta Teknologi)**  
🌐 **Live URL:** [https://invora-iota.vercel.app/](https://invora-iota.vercel.app/)

Dokumen ini merangkum daftar kemungkinan pertanyaan (*Frequently Asked Questions* / pertanyaan presentasi, UAT, manajemen, operasional Finance, dan audit) beserta jawaban lengkapnya mengenai alur kerja, fitur, perhitungan, dan tata kelola sistem **INVORA**.

---

## Bagian 1: Gambaran Umum & Nilai Bisnis (Business Value)

### Q1: Apa itu sistem INVORA dan masalah utama apa yang diselesaikan?
**Jawaban:**  
**INVORA (Invoice Operations & Revenue Assurance)** adalah sistem enterprise internal PT IDStar Cipta Teknologi yang mengelola siklus hidup penagihan (*invoicing*) penempatan talenta IT secara *end-to-end*—mulai dari pengelolaan data referensi (Personel, Rate Card, PO, Pemetaan), perhitungan prorata hari kerja berbasis *timesheet*, verifikasi berjenjang (*Maker-Checker*), pembuatan dokumen resmi (**BAST, CAC, dan Good Receipt/GR**), rekonsiliasi selisih persetujuan (*Deficiency GR*), hingga penerbitan Faktur Pajak, Invoice Resmi, dan pencatatan pelunasan pembayaran.

Masalah utama yang diselesaikan meliputi:
1. **Kesalahan Hitung Prorata Manual (*Human Error*):** Digantikan oleh kalkulasi otomatis berbasis hari kerja *timesheet* dengan presisi desimal tinggi (`decimal.js`).
2. **Perbedaan Alur Klien XL vs Non-XL:** Sistem otomatis mendeteksi perusahaan klien (*Company*) dari PO dan mengarahkan ke alur **XL (CAC → BAST → GR → Invoice)** atau **Non-XL (BAST → Direct Invoice)**.
3. **Ketiadaan Pemisahan Wewenang (*Segregation of Duties*):** Ditegakkan melalui peran **Petugas (Maker)** dan **Checker (Approver)** di tingkat server.
4. **Selisih Nilai GR (*Deficiency GR*) yang Terlupakan atau Terklaim Ganda:** Dilacak otomatis dengan mekanisme *one-time carry-over* ke pengajuan periode berikutnya.
5. **Tagihan Melebihi Sisa Plafon PO (*Cross-PO*):** Sistem otomatis memotong tagihan sesuai sisa saldo PO aktif dan mencatat sisa tagihan yang perlu dialokasikan ke PO lain.

---

## Bagian 2: Hak Akses & Pemisahan Wewenang (RBAC & Maker-Checker)

### Q2: Siapa saja peran pengguna (Role) di dalam INVORA dan apa batasan wewenangnya?
**Jawaban:**  
Terdapat **3 peran utama** dengan pemisahan tugas (*Segregation of Duties*) yang ketat:
1. **Petugas (Input Data / Maker):**
   - Mengelola *Reference Data* (Personnel, Rate Card, User/Client Approver, PO, Personnel ↔ PO Mapping, Working Calendar).
   - Membuat pengajuan baru (*Create Submission*), mengunggah *timesheet*, men-generate dokumen BAST/CAC/GR, serta menginput nomor Faktur Pajak, Invoice, dan bukti pembayaran.
   - **Batasan:** Tidak dapat menyetujui (*approve*) pengajuan atau memverifikasi pembayaran sendiri.
2. **Checker (Pemeriksa / Approver):**
   - Memeriksa rincian pengajuan, menyetujui (*Approve*) atau mengembalikan pengajuan untuk revisi (*Needs Revision*).
   - Menyetujui dokumen CAC/BAST/GR, memvalidasi paket *GR Request* XL, dan memverifikasi bukti pelunasan pembayaran.
   - **Batasan:** Tidak dapat mengubah angka rate atau nominal tagihan secara langsung.
3. **Administrator (Super Admin):**
   - Mengelola akun pengguna, penetapan *multi-role*, aktivasi akun, dan memantau *audit trail*.
   - **Batasan:** Dipisahkan dari input transaksi operasional/finansial harian.

### Q3: Bagaimana jika satu staf memiliki lebih dari satu peran (misalnya Petugas sekaligus Checker/Admin)?
**Jawaban:**  
Saat login, pengguna dengan lebih dari satu peran akan diarahkan ke halaman **Select Role** (atau dapat berpindah peran aktif melalui menu di pojok kanan atas). Seluruh menu dan hak akses API akan mengikuti peran aktif yang sedang digunakan, dan setiap aksi tercatat di *Audit Log* lengkap dengan identitas pengguna.

---

## Bagian 3: Data Referensi & Impor Massal CSV (Reference Data)

### Q4: Apakah kita harus menginput data Personel, Rate Card, PO, dan Mapping satu per satu?
**Jawaban:**  
**Tidak harus.** Selain form input satuan, halaman **Reference Data → Personnel** menyediakan fitur **Impor CSV Personel Lengkap (Combined CSV)** yang memungkinkan pengguna mengunggah **1 file CSV gabungan** (dengan struktur kolom: `NIK, name, client_name, Type, position, status_code, placement_name, spk_start_date, spk_actual_end_date, rate_card, po_number, spk_number, User`).  
Dari satu file tersebut, sistem secara otomatis mengisi dan menghubungkan **5 tabel sekaligus**:
1. **Personnel** (termasuk NIK, Tipe, Posisi, Penempatan, Tanggal SPK, Nomor SPK)
2. **Rate Card**
3. **PO Master** (beserta Company/Klien)
4. **User (Client Approver)**
5. **Personnel ↔ PO Mapping**

### Q5: Apa yang terjadi jika pada Personnel ↔ PO Mapping kita memasukkan personel yang sudah pernah terdaftar sebelumnya?
**Jawaban:**  
Sistem menerapkan aturan **1 Personel tidak boleh duplikat (double) pada Personnel ↔ PO Mapping**. Apabila personel yang sama dimasukkan kembali (baik melalui form manual **Add / Update Mapping** maupun melalui **Impor CSV**), sistem **tidak akan membuat baris ganda**, melainkan otomatis **memperbarui (update)** data pemetaan personel tersebut (PO tujuan, PO Line, Client Approver, dan tanggal masa berlaku).

---

## Bagian 4: Pembuatan Pengajuan, Timesheet & Kalkulasi Prorata

### Q6: Bagaimana cara membuat pengajuan penagihan baru (Create Submission)?
**Jawaban:**  
Pada halaman **Create Submission (`/pengajuan/baru`)**:
1. Pilih **PO** atau **Company** (keduanya saling terhubung otomatis; memilih Company akan otomatis memilih PO milik perusahaan tersebut, dan sebaliknya).
2. Klik tombol **`📄 Masukkan Timesheet`** untuk membuka tabel seluruh personel pada PO tersebut.
3. Di dalam modal **Masukkan Timesheet**, petugas dapat:
   - Mengunggah file *timesheet* (`.pdf`, `.xlsx`, `.xls`, `.csv`) untuk masing-masing personel (jika ada 2 atau lebih personel, masing-masing memiliki kolom upload sendiri).
   - Mengisi **Attendance Days (Hadir)** dan **Total Workdays (Timesheet)** per personel.
   - Menghapus personel yang tidak ikut ditagihkan pada periode tersebut menggunakan tombol **`🗑️ Delete`** di kolom paling kanan setelah *Estimated Prorata*.
4. Klik **Simpan Timesheet & Hitung Prorata**, lalu klik **Save as Draft**.

### Q7: Bagaimana rumus perhitungan tagihan prorata di INVORA?
**Jawaban:**  
Sistem memprioritaskan hari kerja dari **Timesheet** dengan rumus:
$$\text{Nilai Tagihan Prorata} = \text{Rate Card Bulanan} \times \frac{\text{Attendance Days (Hadir)}}{\text{Total Workdays (Timesheet)}}$$
- Perhitungan dilakukan menggunakan pustaka `decimal.js` agar tidak terjadi selisih pembulatan (*floating-point error*).
- Jika personel belum memiliki input *timesheet*, sistem menggunakan hari kerja acuan dari **Working Calendar** (memperhitungkan tanggal efektif masuk/keluar SPK serta hari libur nasional & cuti bersama).
- Untuk PO bertipe **Milestone / Tahap (`tahap`)**, nominal tagihan diisi sesuai nilai persentase/tahapan proyek tanpa prorata harian.

---

## Bagian 5: Perbedaan Alur Klien XL vs Non-XL (BAST, CAC, GR, Invoice)

### Q8: Mengapa ada pengajuan yang diarahkan ke BAST, CAC, dan GR, sementara pengajuan lain langsung ke BAST & Direct Invoice?
**Jawaban:**  
Sistem membedakan alur secara otomatis berdasarkan **Company / Klien pada PO**:
1. **Alur Klien XL (`PT XLSMART SEJAHTERA` / XL Axiata):**
   - Ditandai dengan badge **`XL — BAST, CAC & GR`** (`XL — CAC Workflow`).
   - Saat pengajuan baru dibuat, sistem **otomatis men-generate draf dokumen `CAC`, `BAST`, dan `GR`**.
   - Tombol penerbitan **Invoice** di kanan atas **dikunci sementara** (menampilkan indikator `📋 Tahap Dokumen XL: BAST, CAC & GR (x/3 Disetujui)`) dan baru terbuka setelah dokumen **CAC, BAST, dan GR** disetujui (*Approved*).
   - Tersedia pula panel **GR Request (Paket Excel 3-Sheet: Vendor, SOW, COVER)** serta tombol pintas ke portal resmi **getApprove XL**.
2. **Alur Klien Non-XL (Bank BCA, Bank CIMB Niaga, Bank Muamalat, Bank Danamon, dll.):**
   - Ditandai dengan badge **`Non-XL — BAST & Direct Invoice`**.
   - Klien Non-XL tidak menggunakan proses CAC/COUPA XL, sehingga sistem otomatis membuat dokumen **BAST (2 Pihak)** dan langsung membuka tahapan penerbitan **Official Invoice & Faktur Pajak**.

---

## Bagian 6: Alokasi Lintas PO (Cross-PO) & Deficiency GR

### Q9: Bagaimana jika total tagihan personel bulan ini melebihi sisa saldo (plafon) PO yang sedang berjalan?
**Jawaban:**  
INVORA memiliki fitur **Alokasi Lintas PO (*Cross-PO Allocation*)**:
- Sistem mengecek sisa `saldoSebelumPpn` pada PO tersebut.
- Jika tagihan seorang personel (mis. Rp23.400.000) melebihi sisa saldo PO A (mis. tersisa Rp10.000.000), maka pada PO A personel tersebut hanya ditagihkan sebesar **Rp10.000.000 (parsial)**.
- Saat petugas membuat pengajuan berikutnya pada **PO B (PO penerus)** di periode yang sama, sistem otomatis mendeteksi bahwa personel tersebut sudah ditagihkan Rp10.000.000 di PO A dan otomatis menampilkan sisa yang perlu ditagihkan yaitu **Rp13.400.000** di PO B.
- Personel yang sudah tertagih penuh 100% di PO lain pada bulan yang sama otomatis ditandai *Sudah Lunas Bulan Ini* agar tidak terjadi penagihan ganda (*double billing*).

### Q10: Apa yang dimaksud dengan fitur Deficiency GR (Selisih GR) dan bagaimana cara kerjanya?
**Jawaban:**  
Pada klien XL, terkadang nilai **Approved GR** yang disetujui klien berbeda (lebih kecil atau lebih besar) dibandingkan nilai yang diajukan pada CAC.
- Ketika petugas menginput **Nilai GR Disetujui** di bagian *Processing Milestones*, sistem otomatis menghitung:
  $$\text{Selisih GR} = \text{Total Pengajuan Awal} - \text{Nilai GR Disetujui}$$
- Nilai selisih ini disimpan sebagai **Deficiency GR yang menggantung**.
- Saat petugas membuat pengajuan periode bulan berikutnya pada PO yang sama, sistem otomatis menarik selisih tersebut **tepat satu kali (*One-Time Carry-Over*)** sebagai penyesuaian tagihan dan mengunci pengajuan sumbernya agar tidak pernah terbawa dua kali.

---

## Bagian 7: Faktur Pajak, Invoice Resmi, & Pelunasan (Payment Settlement)

### Q11: Bagaimana proses penerbitan Faktur Pajak, cetak PDF Invoice, dan pengiriman ke klien?
**Jawaban:**  
1. Petugas menginput **Nomor Invoice**, **Nomor Faktur Pajak**, **Tarif PPN** (default 11%), serta mengunggah file PDF **Faktur Pajak**.
2. Melalui tombol **Edit Invoice / Print & Send Invoice**, petugas dapat:
   - Mencetak/mengunduh **PDF Invoice Resmi IDStar** lengkap dengan rincian DPP, PPN, Nomor PO, Nomor GR Slip, dan informasi rekening pembayaran.
   - Mengirimkan Invoice beserta lampiran langsung ke email PIC Klien melalui fitur **Send Invoice Email** yang terintegrasi di dalam aplikasi.

### Q12: Bagaimana cara mencatat pembayaran dari klien jika terdapat potongan PPh 23 atau biaya admin bank?
**Jawaban:**  
Pada panel **Payment Settlement (Pencatatan Pelunasan Pembayaran)**:
- Petugas menginput **Nominal Diterima di Rekening**, **Potongan PPh 23**, dan **Biaya Admin Bank**, serta mengunggah bukti transfer.
- Sistem menghitung total pelunasan efektif sebagai:
  $$\text{Total Terbayar} = \text{Nominal Diterima} + \text{Potongan PPh 23} + \text{Biaya Admin Bank}$$
- **Checker** kemudian melakukan verifikasi atas pencatatan pembayaran tersebut hingga status tagihan dinyatakan **Lunas (Verified)**.

