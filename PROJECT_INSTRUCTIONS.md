# Project Instruction
# Proses Invoicing di Customer XL

**Versi instruksi:** 3.7  
**Pembaruan:** 28 September 2026  
**Status:** MVP 1 sudah dibangun dan diuji secara lokal. Dua kekurangan MVP 1 (impor timesheet dan kolom pendukung Summary PO) sudah dibangun dan diuji. Warna utama tampilan diganti merah IDStar, ditambah footer alamat kantor di semua halaman. Halaman Summary PO (poin 1 di bagian 14) sudah dibangun dan diuji. Data terpusat sudah dipindah dari SQLite lokal ke Supabase (PostgreSQL) — lihat bagian 19. Peran Administrator disempurnakan jadi benar-benar terpisah dari data operasional/finansial, dengan halaman Akun & Akses baru (email wajib domain @idstar.group) — lihat bagian 20 dan 21 (memperbarui bagian 12, 17, dan 18). Cakupan teknis integrasi Get Approve CAC/BAST dan COUPA (poin 2-3 di bagian 14) sudah dipetakan detail per field — lihat bagian 22 (Get Approve) dan 23 (COUPA). Skema data pendukungnya (Nomor GR Slip, Tanggal GR Disetujui, penomoran invoice) dan halaman "Kelengkapan Dokumen" (siapkan CAC/BAST/lampiran tambahan sebelum otomasi) sudah dibangun dan di-push ke Supabase — lihat bagian 24. Otomasi browser ke Get Approve/COUPA itu sendiri BELUM DIBANGUN. Format PDF gabungan CAC/BAST (3 halaman, pakai pdf-lib) sudah dibangun — lihat bagian 25. Status proses CAC->Invoice, dashboard analisa durasi per User XL, dan impor data personel dari Integral sudah dibangun — lihat bagian 26. Aplikasi di-rebrand jadi "Invora" dengan font Plus Jakarta Sans — lihat bagian 27. Halaman login dapat background animasi skyline kota (panel merah 20% kiri + gedung pencakar langit berlatar langit biru) — lihat bagian 28-29. Persiapan otomasi (kredensial per-user, enkripsi, model eksekusi) dan konfirmasi hosting tanpa IT dipetakan di bagian 30 dan 32. Nomor invoice jadi input manual (bukan otomatis) — bagian 31. Form GR Request (Excel) sekarang digenerate otomatis dari data PO Line Item + pengajuan — bagian 33. Alur lengkapnya bolak-balik dengan tim XL (generate -> kirim -> XL isi SOW/COVER -> unggah balikan -> gabung otomatis -> Checker konfirmasi cek) — bagian 34. Konfirmasi cek Checker sekarang jadi GATE WAJIB: Nomor Invoice terkunci sampai GR Request dikonfirmasi dicek (lihat update di akhir bagian 34). MVP 2 "cross PO" (tagihan personel yang saldo PO-nya habis di tengah bulan, dipecah ke PO berikutnya) sudah dibangun dan diuji — lihat bagian 35. Riwayat versi GR Request (sisa gap kecil MVP 3) sudah ditambahkan — lihat bagian 36. Label "template CAC/BAST belum divalidasi Administrator" di dokumen cetak sudah diluruskan (keliru, Administrator tidak pernah punya wewenang itu) — lihat bagian 37. Halaman PO/Item sekarang bisa impor massal dari file CSV/Excel, selain isi manual satu-satu — lihat bagian 38. Lihat juga bagian 25-38.

## 1 Tujuan dan peran
Bantu pengguna melanjutkan proyek otomatisasi proses invoicing XL Smart sebagai analis bisnis dan pendamping implementasi. Gunakan bahasa Indonesia yang jelas, ringkas, dan mudah dipahami tim operasional. Jelaskan pilihan teknis melalui dampak pada pekerjaan, biaya dan pemeliharaan.

Tujuan solusi adalah aplikasi web multiuser yang dapat diakses melalui internet, dengan data terpusat, untuk mengotomatisasi spreadsheet, perhitungan tagihan, dan penyiapan dokumen. Fungsi utama tidak boleh mensyaratkan biaya langganan perangkat lunak. Pisahkan biaya tersebut dari biaya pengembangan, server, domain dan pemeliharaan.

## 2 Acuan dan status
- Baca `PROJECT_KNOWLEDGE.md` untuk ringkasan keputusan dan detail terbuka.
- Gunakan `PROJECT_SOURCE.md` untuk menelusuri sumber, salinan, dan status validasi.
- Baca `BRD_Invoicing_XL_Smart_v1.0.md` sebagai baseline kebutuhan yang telah disetujui pengguna.
- Gunakan `Catatan_keputusan.md` untuk konteks diskusi; catatan tersebut berasal dari tahap draft dan harus dibaca bersama status persetujuan terbaru.
- Word dan PDF v0.1 adalah arsip bahan review. Markdown v1.0 adalah acuan kelanjutan terbaru.
- Tiga flowchart tersedia sebagai gambar dalam folder yang sama dan ditautkan dari BRD.
- Keputusan terbaru pengguna mengatasi versi sebelumnya. Jika terjadi konflik, jelaskan bagian yang terdampak dan perbarui catatan keputusan.
- Persetujuan BRD tidak menetapkan jawaban untuk detail yang masih terbuka dan tidak berarti aplikasi sudah dibangun, diuji, atau diluncurkan.
- **Pembaruan 16 September 2026:** pernyataan "belum ada pembangunan aplikasi" pada bagian-bagian di bawah ini sudah tidak berlaku untuk MVP 1 — lihat bagian 12. Pernyataan itu tetap berlaku untuk MVP 2–5 yang belum dikerjakan.

## 3 Ruang lingkup tahap awal
1. Impor timesheet hasil unduhan Integral dan data PO yang disiapkan petugas.
2. Data personel, rate card beserta masa berlaku, user XL, proyek, dan pemetaan PO.
3. Kalender kerja, tanggal aktif, cuti, sakit, dan perhitungan prorata.
4. Konfirmasi internal melalui aplikasi beserta riwayatnya.
5. Alokasi tagihan ke PO, pemeriksaan saldo, pengajuan tambahan, dan kontrol duplikasi.
6. Pembuatan CAC, BAST, dan workbook request GR lengkap dengan Excelsheet for Vendor, SOW, serta COVER; pemeriksaan lampiran sesuai user XL dan pencatatan konfirmasi SOW.
7. Pencatatan approval, GR aktual, penyesuaian selisih, invoice, dan rekonsiliasi PO.
8. Hak akses, riwayat perubahan, versi dokumen, pencadangan dan pemulihan.

Petugas tetap mengajukan dokumen resmi melalui Get Approve CAC dan COUPA. Integrasi langsung, pengiriman WhatsApp/email otomatis, penerbitan invoice/faktur pajak otomatis, pembayaran, akuntansi, penggajian, perubahan PO, portal user XL dan aplikasi mobile native berada di luar tahap awal.

## 4 Aturan bisnis yang harus dipertahankan

### Rate card dan prorata
- Rate card bulanan masing-masing personel menjadi dasar tagihan.
- Prorata memakai hari kerja aktual. Sabtu, Minggu dan libur nasional dikecualikan. Cuti bersama bersifat tentatif sesuai keputusan yang dicatat.
- Rumus: rate card bulanan × hari kerja yang dapat ditagihkan ÷ hari kerja aktual bulan tersebut.
- Rentang aktif mengikuti tanggal join/resign; tanggal join dan resign ikut dihitung jika merupakan hari kerja yang dapat ditagihkan.
- Cuti mandiri dan sakit maksimal dua hari per kejadian tentatif dapat ditagihkan atau tidak.
- Sakit lebih dari dua hari per kejadian wajib surat keterangan serta keputusan user XL; tim internal mencatat hasil dan mengonfirmasi melalui aplikasi.
- Hindari pengurangan dua kali atas hari nonkerja. Pembagi nol menghalangi perhitungan.

### Konfirmasi internal
- Setiap prorata wajib mendapat konfirmasi eksplisit melalui aplikasi sebelum finalisasi; simpan draft bukan konfirmasi.
- Pengguna berwenang yang menyiapkan dokumen boleh mengonfirmasinya sendiri. Jangan menambahkan kewajiban pemeriksa yang berbeda.
- Keputusan tentatif yang belum selesai menghalangi finalisasi.
- Catat akun, waktu dan versi perhitungan. Perubahan data yang memengaruhi hasil mewajibkan konfirmasi ulang.
- Konfirmasi bisnis ini adalah fitur aplikasi; jangan menjadikannya alasan meminta izin untuk pekerjaan penyusunan dokumen atau rancangan yang sudah diminta pengguna.

### PO bundling dan pengajuan tambahan
- PO tidak mencantumkan nama personel; pemetaan disimpan terpisah dengan masa berlaku.
- Pengajuan per PO per bulan dapat lebih dari satu, termasuk setelah pengajuan awal menjadi invoice. Gunakan urutan seperti Januari, Januari 1, Januari 2.
- Periode layanan tetap sama walaupun pengajuan tambahan dibuat kemudian. Dokumen sebelumnya tidak diubah.
- Satu tagihan personel dapat dibagi ke beberapa PO. Contoh Rp15 juta = Rp6 juta PO asal + Rp9 juta PO tujuan.
- Proyek dan nomor PO boleh berbeda. Jika user XL sama, diperlukan persetujuan user terkait; jika berbeda, diperlukan persetujuan user XL sebelumnya.
- Tim internal mencatat keputusan WhatsApp/email beserta pemberi keputusan, tanggal, hasil dan bukti/referensi lalu mengonfirmasi di aplikasi.
- Total alokasi sama dengan tagihan; setiap PO harus cukup setelah pengajuan aktif diperhitungkan.
- Pembagian PO tidak mengubah rate card atau hari kerja. Cegah penggunaan ulang alokasi, bukan sekadar melarang personel muncul pada beberapa PO.

### Selisih GR dan invoice
- Selisih = pengajuan final − GR aktual disetujui.
- Pengajuan berikut = tagihan dasar berikut + selisih yang belum digunakan.
- Kekurangan GR menambah pengajuan berikut; kelebihan GR menguranginya.
- Contoh Rp10.000.000 diajukan, GR Rp9.999.994: +Rp6 pada pengajuan berikut. Jika dasar berikut Rp10.000.000 maka pengajuan Rp10.000.006.
- Hitung selisih baru dari pengajuan final yang sudah mencakup penyesuaian sebelumnya. Jangan membawa selisih lama dua kali.
- Selisih boleh dipindahkan ke PO berikut ketika PO asal habis, mengikuti ketentuan persetujuan perpindahan PO dan pemeriksaan saldo tujuan.
- Invoice sebelum PPN harus sama persis dengan GR disetujui. Selisih tidak ditambahkan pada invoice atas GR tersebut.
- Pada penyelesaian PO, total invoice sebelum PPN sama dengan nilai PO sebelum PPN. PPN terpisah dan tidak mengurangi saldo PO.
- Pisahkan tagihan dasar, alokasi, pengajuan aktif, GR, invoice dan saldo selisih. Jangan mengurangi saldo dua kali ketika pengajuan aktif menjadi realisasi GR.

### Dokumen
- Satu template standar untuk masing-masing CAC, BAST dan request GR, berlaku bagi seluruh user XL.
- Workbook request GR wajib memuat ketiga sheet: **Excelsheet for Vendor**, **SOW**, dan **COVER**.
- SOW harus dikonfirmasi terlebih dahulu oleh user XL dan dilampirkan sebagai sheet dalam workbook request GR.
- Finalisasi paket GR harus memeriksa kelengkapan ketiga sheet dan adanya konfirmasi user XL atas SOW. Konfirmasi internal prorata/alokasi tidak menggantikan konfirmasi SOW.
- Jawaban SOW mengikuti proyek yang dikonfirmasi; jangan menyalin jawaban contoh sebagai default.
- COVER tetap wajib. Data perusahaan, tanggal, penandatangan dan formula harus valid sebelum finalisasi; jangan menghapus sheet untuk menghindari kesalahan contoh.
- Cara mencatat bukti konfirmasi SOW masih perlu dirinci. Jangan menambahkan kewajiban user XL login ke aplikasi.
- Form CAC dan BAST wajib pada pengajuannya. Tambahan dapat berupa timesheet PDF, PO PDF, CAC Excel, dan task delivery PDF sesuai user.
- Jangan menebak kolom template yang belum diterima. Gunakan contoh asli sebelum memfinalkan pemetaan atau generator dokumen.
- Simpan versi template dan dokumen agar pembaruan tidak mengubah histori.
- **Pembaruan 16 September 2026:** struktur template CAC/BAST asli sudah diperiksa dari contoh nyata (PO 8000135708). Lihat bagian 13 untuk field dan struktur yang ditemukan. CAC dan BAST adalah dua dokumen Word terpisah, bukan satu file; paket lengkap juga menyertakan halaman ringkasan Excel dan copy PO.

## 5 Cara melanjutkan pekerjaan
- Jangan mengulang pertanyaan yang sudah dijawab. Ajukan hanya detail yang memengaruhi hasil langkah aktif.
- Kerjakan bagian yang sudah jelas sambil menunggu detail yang belum tersedia.
- Bedakan kebutuhan disetujui, keputusan implementasi, dan asumsi sementara. Jangan memasukkan asumsi sebagai aturan penagihan final.
- Hubungkan fitur dan skenario uji ke kriteria SC-01 sampai SC-12 dalam BRD.
- Jika diminta perubahan, jelaskan dampaknya pada alur, nilai, data, dokumen dan pengujian; catat versi baru.
- Gunakan data contoh untuk demonstrasi dan tandai sebagai contoh. Jangan mengarang tarif, nominal biaya, waktu penghematan, SLA, atau persetujuan nyata.
- Sebelum memilih teknologi, periksa infrastruktur dan kebutuhan operasional. Jangan menjanjikan hosting atau operasi bebas biaya.
- Sajikan hasil sebagai dokumen, daftar fitur, alur, model data atau rancangan yang dapat diperiksa sesuai permintaan. Jangan menganggap penyusunan instruksi ini sebagai perintah langsung membangun atau menerbitkan aplikasi.
- **Pembaruan 16 September 2026:** ketentuan di atas soal "jangan menganggap sebagai perintah membangun aplikasi" berlaku untuk penyusunan dokumen kebutuhan. Untuk MVP 1, pengguna sudah secara eksplisit meminta pembangunan aplikasi bertahap, dan aplikasi tersebut sudah dibangun serta diuji lokal — lihat bagian 12.

## 6 Detail yang belum ditetapkan
1. CAC, BAST dan spreadsheet April PO 8000155885 serta request GR Agustus PO 8000168078 sudah diterima. Timesheet sumber, bukti GR aktual dan invoice terkait masih diperlukan untuk validasi menyeluruh.
2. Presisi angka serta aturan pembulatan pada perhitungan awal.
3. Definisi durasi satu kejadian sakit, termasuk lintas bulan. Tanggal join/resign sudah ditetapkan inklusif pada hari kerja yang dapat ditagihkan.
4. Waktu pencadangan/pelepasan saldo pengajuan aktif.
5. Pembatalan atau koreksi GR/invoice dan dampaknya pada penyesuaian.
6. Hubungan satu invoice dengan satu atau beberapa referensi GR; baru kesamaan nilainya yang dikonfirmasi.
7. Jumlah pengguna, volume, target kinerja, baseline waktu/biaya dan anggaran.
8. Server, domain, kebijakan penyimpanan dan penanggung jawab operasional.
9. Pemetaan kolom T:W pada template GR, data COVER yang benar, serta cara pencatatan bukti konfirmasi SOW.

## 7 Tahapan berikut yang disarankan
1. Lanjutkan pemeriksaan contoh yang sudah diterima dan selesaikan ketidaksesuaian kolom, formula, serta data master yang dicatat dalam review referensi.
2. Susun kebutuhan fungsional, daftar layar, model data dan aturan validasi.
3. Susun prioritas fitur tahap pertama beserta dependensi dan rencana kerja.
4. Siapkan skenario uji penerimaan, terutama prorata, sakit, alokasi, pengajuan tambahan, pembulatan dan rekonsiliasi.
5. Lanjutkan implementasi sesuai arahan pengguna dengan bukti pengujian dan dokumentasi.

## 8 Keluaran dan penyelesaian
- Simpan hasil di folder proyek dengan nama dan versi yang jelas.
- Perbarui indeks README dan catatan keputusan bila terdapat perubahan yang relevan.
- Laporkan apa yang selesai, apa yang diuji, dan detail yang masih terbuka secara singkat.
- Instruksi ini disiapkan sebagai file yang dapat digunakan dalam pengaturan proyek; keberadaan file tidak berarti pengaturan Project di aplikasi sudah diperbarui.

## 9 Klarifikasi referensi April

Baca `referensi_april/Review_Awal_April.md` sebagai temuan sumber dan klarifikasi, tanpa menganggap formula contoh selalu benar.
- Deficiency GR Rp552.262 pada contoh adalah selisih GR sebelumnya; pertahankan referensi GR asal dan penggunaan tepat sekali.
- Rumus 19/21 digunakan untuk alokasi ke PO lain karena kekurangan saldo PO asal. Pisahkan alokasi berbasis hari dari prorata akibat join/resign atau ketidakhadiran. Jangan otomatis mengurangi total tagihan personel.
- Nama proyek Excel wajib mengikuti COUPA. Jangan menentukan nama yang benar dari perbedaan CAC dan Excel; verifikasi COUPA sebelum koreksi.
- Selisih Rp0,10, aturan pembulatan, bukti GR sumber dan rincian alokasi pada PO tujuan masih perlu diperiksa.

## 10 Pemeriksaan sebelum finalisasi request GR

- Ketiga sheet wajib ada dan terisi sesuai kebutuhan.
- SOW sudah dikonfirmasi user XL untuk proyek terkait.
- Nilai usulan GR, PO dan line item konsisten antar-sheet.
- COVER menggunakan data valid dan tidak memuat referensi formula rusak.
- Konfirmasi internal yang diwajibkan untuk prorata dan alokasi telah selesai.
- Riwayat dokumen dan konfirmasi dapat ditelusuri.

Perubahan substansi SOW setelah konfirmasi harus ditandai untuk pemeriksaan apakah konfirmasi yang tercatat masih mencakup versi tersebut; jangan menyatakan versi yang berubah otomatis telah disetujui.

## 11 Penempatan wajib di server kantor

Keputusan terbaru pengguna: aplikasi, basis data, dokumen dan data proyek harus berada pada server/infrastruktur kantor. Web app harus dapat diakses dari luar kantor dan memakai domain idstar.group. Ketentuan ini menggantikan rekomendasi lama yang masih membuka opsi hosting eksternal. Jangan mengunggah aplikasi atau data produksi ke hosting eksternal tanpa perubahan instruksi pengguna. Subdomain invoicing.idstar.group hanya usulan, belum alamat aktif atau keputusan final. Akses luar kantor langsung melalui HTTPS tanpa kewajiban VPN. Spesifikasi server, sistem operasi, subdomain/sertifikat, autentikasi serta pencadangan ditetapkan bersama IT. Jangan menyamakan akses dari luar kantor dengan akses tanpa login. Jangan mengubah jaringan, DNS, atau membuka akses server hanya berdasarkan pembaruan dokumen ini.

**Status 16 September 2026:** MVP 1 saat ini masih berjalan lokal di komputer pengguna (`npm run dev`), belum dipindahkan ke server kantor. Ketentuan di atas tetap berlaku sebagai tujuan akhir penempatan produksi.

## Konfirmasi akses HTTPS langsung

Pengguna mengonfirmasi akses dari luar kantor langsung melalui HTTPS, tanpa kewajiban VPN. Aplikasi, basis data dan dokumen tetap berada di server kantor dan memakai domain idstar.group. Akses tetap memerlukan login serta hak akses; HTTPS tidak menggantikan autentikasi. Nama subdomain, sertifikat dan pengaturan jaringan ditetapkan bersama IT. Database dan penyimpanan dokumen tidak disediakan sebagai akses publik langsung; pengguna mengaksesnya melalui aplikasi sesuai kewenangan. Pembaruan ini merupakan keputusan rancangan, bukan bukti server atau domain sudah dikonfigurasi.

## Klarifikasi tanggal aktif dan selisih GR

Keputusan pengguna:
- Tanggal join dan tanggal resign sama-sama inklusif: ikut dihitung sebagai hari yang ditagihkan apabila merupakan hari kerja yang dapat ditagihkan. Sabtu, Minggu dan libur nasional tetap dikecualikan; keputusan tentatif yang relevan tetap berlaku.
- Hitung irisan rentang aktif personel dengan periode tagihan dan kalender kerja. Jangan menyimpulkan jumlah hari tagihan hanya dari angka tanggal join. Contoh 7/22 × rate card berlaku jika hasil hitung kalender memang tujuh hari tagihan dari 22 hari kerja bulan tersebut.
- Deficiency GR mengikuti hasil pembulatan/realisasi tim GR, tidak boleh diubah secara manual sebagai penyesuaian bebas. Selisih ditelusuri dari nilai pengajuan dan GR aktual.
- Selisih diperhitungkan pada pengajuan berikut selama PO masih memiliki saldo yang dapat diinvoice; jika PO habis, diteruskan ke PO berikut dengan approval user XL.
- Ketentuan tersebut belum menetapkan presisi dan pembulatan hasil prorata aplikasi. Aturan ini tetap perlu diputuskan terpisah, termasuk perlakuan pecahan Rp0,10 pada contoh.

Tanggal join/resign inklusif sudah diputuskan dan tidak perlu ditanyakan ulang. Tidak ada pembangunan aplikasi yang dimulai oleh pembaruan ini. Prorata ini sudah diimplementasikan dan diuji di MVP 1 — lihat bagian 12.

## Pembaruan role dan rencana MVP

Keputusan terbaru: tiga role operasional adalah Administrator, Petugas Pengajuan dan Konfirmasi (satu orang), serta Checker (orang berbeda) sebelum paket dieksekusi ke XL. Ketentuan ini menggantikan rancangan lama yang menganggap checker opsional dan role Pemantau tersendiri. Pembuat tetap boleh mengonfirmasi perhitungannya, tetapi tidak menggantikan pemeriksaan checker. User XL tetap memberi persetujuan di luar aplikasi.

Pengguna menyetujui cakupan MVP 2 dan meminta rencana dilengkapi. Lihat [RENCANA_MVP.md](RENCANA_MVP.md) untuk MVP 1–5, batas cakupan, pemeriksaan manual, dependensi dan detail terbuka. MVP 3–5 masih usulan lanjutan untuk review. Belum ada pembangunan aplikasi. Detail pencadangan saldo, pembulatan prorata dan alur koreksi belum dianggap selesai hanya karena cakupan MVP 2 disetujui.

**Pembaruan peran Administrator, 16 September 2026:** lihat bagian 12 — Administrator kini dibatasi ke kelola akun, data referensi dan kalender kerja saja, tidak lagi ikut konfirmasi petugas maupun approve checker.

## Revisi cakupan MVP 5 dan persetujuan MVP 3 serta 4

Pengguna menyetujui MVP 3 dan 4. MVP 5 adalah reminder outstanding melalui email ke tim Finance XL, memuat nomor invoice, nomor PO dan amount harus dibayarkan, diikuti pencatatan payment sampai kewajiban invoice selesai. Tidak mencakup penggajian. Ini memperluas scope lama yang mengecualikan reminder email dan pelacakan pembayaran; hanya pelacakan penerimaan, bukan eksekusi transfer atau akuntansi.

Tanggal approval invoice di COUPA adalah pemicu jadwal. Approval sebelum tanggal 15 dibayar tanggal 15 bulan berikutnya. Approval tanggal 16–30 dibayar tanggal 30/31 atau akhir bulan; bulan pembayaran kelompok kedua perlu dikonfirmasi. Jatuh tempo pertengahan bulan pada Sabtu/Minggu/libur mundur ke hari kerja berikutnya. Approval tepat tanggal 15/31 belum diputuskan. Jatuh tempo akhir bulan pada Sabtu/Minggu/libur dimajukan ke hari kerja sebelumnya.

Alamat penerima/pengirim, pemicu dan frekuensi reminder, dasar amount payment (PPN/potongan), bukti pembayaran dan pembayaran parsial belum ditetapkan. Tidak ada email yang dikirim atau aplikasi dibangun. Lihat RENCANA_MVP.md revisi terbaru. Kebutuhan impor, cuti/sakit dan kesiapan operasional tetap dipertahankan; penempatan tahap pendukungnya belum final.

## Klarifikasi pergeseran hari pembayaran

Pengguna mengonfirmasi dua aturan berbeda:
- Jatuh tempo pertengahan bulan (tanggal 15) pada Sabtu, Minggu atau hari libur: mundur ke hari kerja berikutnya.
- Jatuh tempo akhir bulan pada Sabtu, Minggu atau hari libur: maju ke hari kerja sebelumnya.

Jika terdapat beberapa hari nonkerja berurutan, telusuri sampai hari kerja pertama sesuai arah masing-masing. Simpan tanggal jatuh tempo dasar dan tanggal hasil penyesuaian secara terpisah agar dapat dijelaskan. Kalender libur yang dipakai masih perlu ditetapkan. Kelompok approval tepat tanggal 15, cakupan tanggal 31, serta bulan pembayaran untuk kelompok approval 16–akhir bulan masih perlu dikonfirmasi; klarifikasi ini tidak menetapkan ketiganya.

## Aturan final jadwal pembayaran XL

Dikonfirmasi pengguna:

| Approval invoice di COUPA | Tanggal pembayaran dasar | Penyesuaian hari nonkerja |
| --- | --- | --- |
| Tanggal 1–15, termasuk tanggal 15 | Tanggal 15 bulan berikutnya | Jika Sabtu/Minggu/libur, mundur ke hari kerja berikutnya |
| Tanggal 16–hari terakhir bulan, termasuk tanggal 30/31 | Hari terakhir bulan berikutnya | Jika Sabtu/Minggu/libur, maju ke hari kerja sebelumnya |

Hitung bulan berikutnya dahulu menggunakan kalender sebenarnya, termasuk pergantian tahun dan Februari 28/29 hari. Setelah itu sesuaikan hari nonkerja dengan arah pada tabel. Jika libur berurutan, lanjutkan sampai hari kerja. Tanggal approval COUPA, tanggal pembayaran dasar dan tanggal pembayaran setelah penyesuaian disimpan terpisah.

Aturan ini menggantikan pertanyaan/status terbuka sebelumnya mengenai approval tepat tanggal 15, tanggal 31 dan bulan pembayaran kelompok kedua. Kalender libur, frekuensi reminder, penerima email, dasar nominal outstanding dan penanganan payment tetap perlu dirinci. Jadwal pembayaran bukan bukti payment; invoice hanya ditutup setelah penerimaan pembayaran direkonsiliasi.

## Reminder Senin dan pembaruan pembayaran oleh Finance

Keputusan pengguna:
- Reminder outstanding dikirim setiap Senin dari alamat email collection.
- Contoh screenshot menampilkan `'collection@idstar.co.id' via Finance IDstar Group <finance@idstar.group>`. Identitas collection adalah acuan pengguna; konfigurasi From, Sender/via, Reply-To serta izin pengiriman perlu diverifikasi IT. Jangan menyimpulkan alamat finance@idstar.group adalah penerima XL.
- Finance memperbarui pembayaran di aplikasi setelah pembayaran diterima. Sistem menggunakan saldo terbaru setelah pembaruan tersebut untuk email berikutnya.
- Data invoice/PO dan nominal outstanding dihitung ulang dari catatan pembayaran tersimpan ketika pengiriman diproses, bukan memakai daftar statis dari minggu sebelumnya.
- Invoice lunas dikeluarkan dari daftar outstanding; jika pembayaran sebagian didukung, hanya saldo yang belum terbayar dicantumkan. Detail alokasi dan dasar amount tetap perlu dikonfirmasi.

Usulan kontrol implementasi: snapshot isi email, waktu pengambilan saldo, penerima, status kirim serta referensi pembayaran dicatat; cegah kirim ganda akibat retry. Jika pembayaran berubah setelah checker memeriksa draft, nominal draft diperbarui dan mekanisme pemeriksaan versi terbaru ditetapkan sebelum mengaktifkan pengiriman. Pembaruan setelah email terkirim tidak dapat mengubah email lama; akan tercermin pada pengiriman berikutnya.

Detail terbuka: jam dan zona waktu pengiriman Senin, penerima Finance XL/CC, perlakuan Senin libur, daftar outstanding sebelum/sesudah jatuh tempo, aturan checker untuk pengiriman mingguan, serta akun/role Finance yang boleh memperbarui payment. Jangan otomatis menambahkan role baru atau memberi semua akun hak mencatat pembayaran.

Ini adalah spesifikasi fitur MVP 5, bukan permintaan membuat automation yang berjalan sekarang. Tidak ada email dikirim atau jadwal aktif dibuat pada tahap perencanaan.

## Klarifikasi pelaksana payment dan penerima reminder

- User dengan role Petugas Pengajuan dan Konfirmasi juga memperbarui pembayaran. Tidak diperlukan role Finance tersendiri untuk fungsi ini.
- Penerima reminder adalah Finance XL; alamat email akan diberikan pengguna sebelum aplikasi dibangun. Jangan menebak alamat penerima atau CC.
- Pengguna menjawab OK untuk usulan zona waktu WIB. Reminder dijadwalkan setiap Senin dengan zona waktu Asia/Jakarta; jam pengiriman telah ditetapkan setiap Senin pukul 09.00 WIB.
- Ketentuan saldo terbaru dan pengeluaran invoice lunas dari reminder tetap berlaku. Checker tetap berperan sebelum komunikasi ke XL sesuai rancangan; mekanisme persetujuan mingguan belum dirinci.
- Tahap saat ini tetap perencanaan. Tidak ada pembangunan, automation aktif atau email terkirim.

## Jadwal reminder yang ditetapkan

Reminder outstanding dikirim setiap Senin pukul 09.00 WIB (Asia/Jakarta), sesuai keputusan pengguna. Jadwal ini menggantikan status sebelumnya bahwa jam belum ditentukan. Saldo dihitung dari pembaruan payment oleh Petugas Pengajuan dan Konfirmasi sebelum pengiriman. Alamat Finance XL masih menunggu informasi pengguna. Perlakuan Senin yang jatuh pada hari libur dan mekanisme checker mingguan belum ditetapkan. Ini spesifikasi aplikasi pada tahap perencanaan; belum ada jadwal aktif atau email terkirim.

## Konsolidasi MVP disetujui

Pengguna menyetujui cakupan MVP 1–5. Gunakan [MVP_LENGKAP_v1.0.md](MVP_LENGKAP_v1.0.md) sebagai acuan tahap terbaru. Pernyataan lama bahwa MVP 3–5 belum disetujui atau MVP 5 berfokus pada impor tidak berlaku. Detail konfigurasi terbuka tetap tercatat. Persetujuan ini untuk rencana, bukan instruksi membangun aplikasi atau mengaktifkan email.

## 12 Status pembangunan MVP 1 dan pembatasan peran Administrator (16 September 2026)

Pembaruan ini menggantikan pernyataan di bagian lain dokumen ini, serta di `PROJECT_KNOWLEDGE.md` dan `PROJECT_SOURCE.md`, bahwa "belum ada pembangunan aplikasi". Pernyataan itu masih berlaku untuk MVP 2–5; untuk MVP 1, aplikasi sudah dibangun dan diuji secara lokal di komputer pengguna, memakai Next.js, Drizzle ORM dan SQLite sebagai basis data pengembangan (bukan server kantor). Kode aplikasi disimpan pada folder tersendiri di komputer pengguna, terpisah dari folder dokumen sumber ini. Data yang dipakai untuk pengujian adalah data contoh/sintetis yang ditandai jelas, bukan data personel nyata.

**Cakupan yang sudah berfungsi dan diuji secara manual** (pengujian dengan permintaan langsung ke server, bukan hanya melihat tampilan):
- Kelola data referensi: Personel, Rate Card (dengan masa berlaku), PO, User XL, Pemetaan Personel↔PO, Kalender Kerja.
- Mesin hitung prorata sesuai bagian 4: rate card × hari kerja dapat ditagihkan ÷ hari kerja acuan bulan; tanggal join/resign inklusif jika hari kerja; Sabtu/Minggu/libur nasional dikecualikan; pembagi nol ditolak (tidak dihitung diam-diam).
- Login dan tiga role (Administrator, Petugas Pengajuan dan Konfirmasi, Checker); sesi login disimpan sendiri oleh aplikasi, tidak dititipkan ke pihak ketiga.
- Alur status pengajuan: Draft → Konfirmasi Petugas → Menunggu Checker → Siap Diajukan, dengan jalur Perlu Revisi → edit rincian → konfirmasi ulang.
- Checker wajib orang berbeda dari yang mengonfirmasi — ditegakkan di server, sudah diuji: percobaan checker menyetujui pengajuan yang ia konfirmasi sendiri ditolak oleh server (bukan hanya disembunyikan di tampilan).
- Pemeriksaan saldo PO sebelum pengajuan disimpan; pengajuan yang melebihi saldo ditolak, sudah diuji dengan kasus nyata.
- Draf dokumen CAC dan BAST per pengajuan — lihat bagian 13 untuk status dan batasannya.
- Jejak audit tercatat untuk setiap tambah/ubah/hapus/transisi status.

**Pembatasan peran Administrator:** sebelumnya Administrator memiliki akses yang sama dengan Petugas (konfirmasi) dan Checker (approve/reject) untuk kemudahan pengujian teknis. Pengguna meminta ini dibatasi sesuai BRD bagian peran ("Administrator: Mengelola akun, akses, kalender kerja, data referensi, dan template"). Sejak pembaruan ini, Administrator hanya bisa mengelola akun, data referensi dan kalender kerja; tidak bisa lagi membuat pengajuan, konfirmasi petugas, approve/reject checker, atau membuat dokumen CAC/BAST. Administrator tetap bisa melihat daftar dan detail pengajuan tanpa tombol aksi. Perubahan ini sudah diuji: percobaan Administrator melakukan aksi tersebut ditolak oleh server dengan kode 403.

**Belum dibangun pada MVP 1**, tetap sesuai batas lingkup awal bagian 3: impor timesheet, cuti/sakit tentatif, alokasi lintas-PO, pengajuan tambahan, Deficiency GR, request GR (Excelsheet for Vendor/SOW/COVER), invoice, reminder outstanding, dan pencatatan payment. Ini tetap menjadi cakupan MVP berikutnya sesuai `MVP_LENGKAP_v1.0.md`; belum ada pembangunan untuk bagian-bagian ini.

**Belum dilakukan:** pemindahan ke server kantor (masih berjalan lokal via `npm run dev` di komputer pengguna), dan penggantian draf dokumen CAC/BAST dengan template resmi tervalidasi Administrator.

## 13 Temuan struktur template CAC/BAST asli — referensi untuk MVP berikutnya (16 September 2026)

Pengguna menunjukkan folder Google Drive berisi paket dokumen nyata (PO 8000135708, beberapa periode). Ini adalah **temuan struktur untuk perencanaan MVP berikutnya, bukan pembangunan MVP 1**. Temuan dicatat tanpa menyalin nilai personel/finansial asli ke aplikasi atau basis data lokal.

Paket dokumen ternyata terdiri dari **empat bagian terpisah**, bukan satu dokumen:
1. **CAC** (dokumen Word/Google Doc tersendiri) — field: Date of Creation, Supplier Name, Status of Acceptance, Project Name, Contract Status, Terms Payment, Purchase Order, Project Location, Functional Location in SAP, Work Completed, PO Value, GR Value, Type of Project, tanda tangan Finance Manager IDStar dan pihak XL (dengan jabatan masing-masing).
2. **BAST** (dokumen Word tersendiri, terpisah dari CAC) — kop surat PT XLSMART Telecom Sejahtera Tbk, narasi tanggal lengkap dalam kalimat ("pada hari ini ... tanggal ... bulan ... tahun ..."), identitas dua pihak penandatangan (nama, jabatan, alamat perusahaan masing-masing), pernyataan pekerjaan (jenis pekerjaan, No. PO, periode bulan), dua pernyataan baku, tanda tangan dua pihak.
3. **Halaman ringkasan Excel** — PO Value, Done GR (akumulasi sampai bulan lalu), saldo bulan lalu, usage bulan berjalan, saldo akhir (ending balance) bulan berjalan, % completion, dan rincian pemakaian per personel (nama, rate/jumlah) yang dijumlah menjadi total usage bulan itu.
4. **Copy PO** — belum diperiksa; belum ada contoh filenya di folder yang ditunjukkan pengguna.

**Field yang belum ada di skema aplikasi MVP 1** dan perlu ditambahkan untuk MVP berikutnya bila CAC/BAST hendak dibuat otomatis dari aplikasi: Status Acceptance, Contract Status, Terms Payment, Functional Location SAP, jabatan dan alamat resmi penandatangan (Finance Manager IDStar dan pihak XL), serta riwayat saldo PO per bulan (saldo awal dan akhir per periode — aplikasi MVP 1 saat ini hanya menyimpan satu angka saldo PO berjalan, bukan riwayat per bulan).

Ini murni catatan kebutuhan untuk desain skema dan generator dokumen MVP berikutnya. Belum ada perubahan kode dari temuan ini, dan belum ada nilai personel/finansial asli yang disalin ke mana pun di luar folder Drive pengguna sendiri.

## 14 Tambahan cakupan MVP 2 — Summary PO, integrasi Get Approve CAC & COUPA (16 September 2026)

Pengguna meminta empat hal berikut dimasukkan ke cakupan **MVP 2** (bukan MVP 1, aplikasi tidak diubah oleh catatan ini):

1. **Halaman Summary PO.** Menampilkan untuk setiap PO: nomor PO, nama proyek, nilai PO, nilai yang sudah di-GR (kumulatif), dan saldo PO (= nilai PO − nilai yang sudah di-GR). Halaman ini muncul untuk ketiga role — Administrator, Petugas Pengajuan dan Konfirmasi, serta Checker — sebagai halaman ringkasan/lihat saja, bukan halaman transaksi. Ini berbeda dari field "saldo PO" yang sudah ada di MVP 1 (satu angka saldo berjalan per PO): Summary PO butuh dua angka terpisah yang eksplisit (nilai di-GR dan saldo), bukan cuma saldo akhir.
2. **Integrasi ke Get Approve CAC dan COUPA** — kedua sistem milik XL. Pengajuan resmi (CAC, BAST, request GR, invoice) pada akhirnya terhubung ke kedua sistem ini, bukan hanya draf/PDF yang diunduh manual seperti di MVP 1.
3. **Autentikasi terpisah per sistem.** Setiap kali aplikasi terhubung ke Get Approve CAC atau COUPA, tetap wajib memasukkan username dan password sebagai verifikasi — bukan single sign-on otomatis tanpa verifikasi ulang. Detail teknis integrasi (API resmi vs otomasi browser, penyimpanan kredensial, siapa yang berwenang menyambungkan) belum ditentukan; ini baru keputusan bahwa verifikasi kredensial tetap wajib setiap kali connect.
4. **Filter/tombol tahun di halaman Summary PO.** Karena aplikasi akan terus dipakai selama kerja sama dengan XL berlanjut (multi-tahun), Summary PO perlu bisa difilter per tahun, bukan hanya menampilkan data tahun berjalan.

Keempat hal ini adalah **catatan cakupan untuk direncanakan di MVP 2**, sejalan dengan `MVP_LENGKAP_v1.0.md` yang sudah disetujui pengguna sebelumnya (mencakup integrasi Get Approve CAC dan COUPA secara umum, tanpa rincian Summary PO dan verifikasi kredensial per-koneksi — dua hal ini baru dirinci hari ini). Belum ada pembangunan untuk keempat poin ini; sesi berikutnya (besok) melanjutkan dari sini.


## 15 Timesheet sebagai dasar hari kehadiran, dan kolom pendukung Summary PO (17 September 2026)

Pengguna meminta dua kekurangan MVP 1 diselesaikan sebelum melanjutkan MVP 2 (Summary PO, integrasi Get Approve CAC/COUPA). Keduanya sudah **dibangun dan diuji** di aplikasi lokal (bukan sekadar rencana):

**1. Upload timesheet per personel.** Di halaman Buat Pengajuan, setiap baris personel punya tombol "Upload Timesheet" (jadi "Ganti Timesheet" kalau sudah ada). Formulirnya minta: file timesheet asli (PDF/Excel/CSV, sesuai contoh dari Integral yang ditunjukkan pengguna — kolom Total WFO, Total Working Days WFH, Total Holidays, Total Leaves, dst.), Total Hari Kerja, dan Total Kehadiran (angka, diisi manual oleh Petugas — aplikasi belum mem-parse angka dari file secara otomatis). Data disimpan per kombinasi personel + PO + periode; unggah ulang untuk kombinasi yang sama menimpa data lama (bukan menambah baris baru), termasuk menghapus file lama supaya tidak menumpuk.

**2. Timesheet menjadi dasar hari kerja dapat ditagihkan.** Sesuai jawaban pengguna, kalau ada timesheet untuk kombinasi personel+PO+periode, angka Total Hari Kerja dan Total Kehadiran dari timesheet **menggantikan** hasil hitung kalender kerja (bukan cuma lampiran referensi) — dipakai langsung di rumus prorata (rate × Total Kehadiran ÷ Total Hari Kerja). Kalau belum ada timesheet untuk kombinasi itu, aplikasi tetap pakai hitung kalender kerja seperti MVP 1 (tidak ada perubahan perilaku lama). Pratinjau di halaman Buat Pengajuan menampilkan label "Timesheet" atau "Kalender" di setiap baris supaya Petugas tahu sumber angkanya. Perhitungan dihitung ulang di server saat disimpan (bukan percaya angka dari layar), konsisten dengan prinsip MVP 1.

**3. "User" pada permintaan pengguna dikonfirmasi = User XL** (pemberi keputusan/approval di luar aplikasi, entitas yang sudah ada sejak MVP 1), dicatat sebagai field terpisah di tiap baris timesheet.

**Sudah diuji secara manual** (permintaan langsung ke server): unggah timesheet dan hasil hitung berubah sesuai timesheet; unggah ulang menimpa data lama dan menghapus file lama; Checker ditolak (403) saat mencoba unggah — hanya Administrator dan Petugas yang boleh; jenis file di luar PDF/Excel/CSV ditolak; Total Kehadiran lebih besar dari Total Hari Kerja ditolak; permintaan tanpa login ditolak (401); pengajuan yang disimpan menyimpan hasil hitung berbasis timesheet dengan benar di basis data.

**Kolom pendukung Summary PO** (bagian 14 poin 1) — dua kolom baru ditambahkan ke data PO yang sudah ada: tahun PO (dipakai untuk filter Summary PO nanti) dan nilai GR kumulatif (diisi manual oleh Administrator setelah GR disetujui di Get Approve CAC/COUPA — integrasi otomatis belum ada). Saldo Summary PO nanti dihitung sebagai nilai PO − nilai GR, terpisah dari field "saldo PO" yang sudah ada di MVP 1 (yang tetap dipakai untuk pemeriksaan sebelum pengajuan disimpan, tidak diubah). Ini baru perubahan data (kolom di basis data); halaman Summary PO itu sendiri, form input nilai GR di Administrator, dan filter tahun **belum dibangun** — menyusul sebagai lanjutan MVP 2.

**Belum dibangun dari catatan ini:** parsing otomatis angka dari file timesheet (Petugas tetap isi manual), halaman/menu khusus untuk melihat daftar timesheet yang sudah diunggah (saat ini hanya terlihat lewat status "Timesheet"/"Kalender" di pratinjau Buat Pengajuan), dan tiga sisa cakupan MVP 2 di bagian 14 (halaman Summary PO, integrasi Get Approve CAC/COUPA, verifikasi kredensial per koneksi).


## 16 Warna merah IDStar dan alamat kantor di footer (17 September 2026)

Pengguna meminta dua penyesuaian tampilan, sudah **dibangun dan diuji**:

**1. Warna utama diganti merah IDStar.** Sebelumnya warna utama aplikasi (topbar, tombol utama, aksen) memakai navy biru (`#0b3d66`). Diganti merah resmi IDStar `#ea242a` — diambil langsung dari warna huruf "ID" pada file logo resmi (`idstar-logo-color.png`), bukan tebakan. Warna gelap untuk hover (`#a8191e`) dan warna terang untuk badge/focus ring (`#fdeded`) diturunkan dari merah ini. Area konten (latar putih/abu-abu muda di belakang tabel dan form) sengaja **tidak** ikut diganti merah — pengguna memilih opsi ini secara eksplisit dari 3 pilihan cakupan yang ditawarkan, supaya tabel dan form tetap mudah dibaca.

**2. Footer alamat kantor di semua halaman.** Ditambahkan komponen Footer baru (logo IDStar + alamat "PT IDStar Cipta Teknologi — The Bellagio Mansion, Jl. Mega Kuningan Timur II No. Kav. E6-1 Ground floor, RT.5/RW.2, Kuningan, Kuningan Tim., Kecamatan Setiabudi, Kota Jakarta Selatan, DKI Jakarta 12950") di root layout aplikasi, sehingga tampil otomatis di **semua** halaman (login, dashboard, data referensi, pengajuan) tanpa perlu diubah satu per satu. Footer ini disembunyikan otomatis saat dokumen CAC/BAST dicetak (`@media print`), supaya tidak mengganggu tata letak dokumen resmi yang sudah punya footnote sendiri.

**3. Logo di pojok kiri atas.** Sudah ada di semua halaman yang login (topbar) dan di dokumen CAC/BAST (kop dokumen). Halaman login sebelumnya hanya menaruh logo di tengah kartu — ditambahkan logo kecil di pojok kiri atas layar supaya konsisten dengan halaman lain.

**Sudah diuji secara manual:** warna `#ea242a` terkonfirmasi muncul di CSS yang benar-benar disajikan server (bukan cuma di kode sumber); alamat kantor terkonfirmasi tampil di halaman login (sebelum login) dan dashboard/admin (setelah login, baik role Petugas maupun Admin).

**Catatan teknis:** saat pengujian sempat muncul error 500 karena file journal SQLite (`dev.db-journal`) tertinggal dari sesi server sebelumnya yang dimatikan paksa — bukan akibat perubahan warna/footer ini. Sudah diperbaiki dengan langkah yang sama seperti sebelumnya (hapus file journal, minta izin hapus untuk folder Documents di awal sesi kalau belum ada).


## 17 Halaman Summary PO dibangun (17 September 2026)

Poin 1 dari bagian 14 (Summary PO) sudah **dibangun dan diuji** — tiga poin lain di bagian 14 (integrasi Get Approve CAC/COUPA, verifikasi kredensial per koneksi) belum, tetap cakupan lanjutan MVP 2.

**Halaman `/summary-po`** — bisa diakses ketiga role (Administrator, Petugas Pengajuan dan Konfirmasi, Checker) sebagai halaman lihat-saja, ada tautan kartu di Dashboard untuk semua role. Menampilkan tabel per PO: nomor PO, nama proyek, nilai PO, nilai yang sudah di-GR, dan saldo PO (= nilai PO − nilai GR), plus baris total di bagian bawah tabel. Ada filter tahun berbentuk tombol di atas tabel (tahun dengan data terbaru dipilih otomatis saat halaman dibuka) — sesuai permintaan pengguna karena aplikasi dipakai lintas tahun kerja sama dengan XL.

**Input nilai GR** — form tambah PO di Data Referensi &middot; PO/Item sekarang juga minta Tahun PO (default tahun berjalan). Form edit PO menambahkan field Tahun PO dan Nilai Sudah di-GR (Administrator-only, sama seperti field PO lainnya). Nilai GR tetap diisi manual (integrasi otomatis ke Get Approve CAC/COUPA belum ada), dengan keterangan di form bahwa nilai ini dipakai untuk saldo di Summary PO — tidak memengaruhi field "saldo PO" yang sudah ada sejak MVP 1 (dipakai untuk pemeriksaan sebelum pengajuan disimpan, sengaja dibiarkan terpisah, lihat bagian 15).

**Sudah diuji secara manual:** PO baru dengan tahun berbeda muncul di filter tahun yang benar; saldo per PO terhitung benar (nilai PO − nilai GR) untuk dua tahun berbeda sekaligus baris total; Petugas dan Checker bisa membuka halaman (lihat-saja) tapi ditolak (403) saat mencoba menambah/mengubah PO lewat API — hanya Administrator yang boleh; akses tanpa login dialihkan ke halaman login; validasi tahun dan nilai GR tidak valid ditolak (400) di server.


## 18 Data referensi dipindah dari Administrator ke Petugas Pengajuan dan Konfirmasi (17 September 2026)

Pengguna meninjau halaman Summary PO dan menyimpulkan pembagian peran di bagian 12 kurang tepat: **peran Administrator sebelumnya sama cakupannya dengan peran input data** (mengelola Personel, Rate Card, PO/Item, User XL, Pemetaan Personel↔PO), padahal seharusnya berbeda. Ini **memperbarui** keputusan di bagian 12 (bukan menambah), sudah **dibangun dan diuji**:

**Pembagian baru:**
- **Petugas Pengajuan dan Konfirmasi** — sekarang mengelola SEMUA data referensi operasional: Personel, Rate Card, PO/Item (termasuk nilai GR untuk Summary PO), User XL, Pemetaan Personel↔PO. Ditambah fungsi lama: buat & konfirmasi pengajuan.
- **Administrator** — sekarang HANYA mengelola Kalender Kerja (bukan data finansial) dan akun/akses (menu akun belum ada UI-nya, masih lewat skrip `seed-users.ts`). Administrator TIDAK BISA lagi membuka atau mengubah Personel, Rate Card, PO/Item, User XL, maupun Pemetaan.
- **Checker** — tidak berubah, tetap hanya approve/reject pengajuan.

**Perubahan teknis:** halaman data referensi dipindah dari `/admin/personel`, `/admin/rate-card`, `/admin/po`, `/admin/user-xl`, `/admin/pemetaan` ke `/data-referensi/...` (URL lama sekarang 404 — sengaja, supaya tidak ada jejak akses lama yang membingungkan), dengan pembatasan role `petugas` di server (redirect ke `/dashboard` kalau bukan Petugas, sama seperti pola pembatasan role lain di aplikasi ini). API di baliknya (`/api/personel`, `/api/rate-card`, `/api/po`, `/api/user-xl`, `/api/pemetaan`, termasuk sub-route `[id]`) diubah dari `wajibRoleApi(["admin"])` menjadi `wajibRoleApi(["petugas"])`. Menu Kalender Kerja (`/admin/kalender`, `/api/kalender`) TIDAK diubah — tetap Administrator-only. Kartu di Dashboard disesuaikan: "Data Referensi" sekarang muncul untuk Petugas (bukan Admin), kartu baru "Administrasi" muncul untuk Admin (isinya Kalender Kerja).

**Sudah diuji secara manual:** Administrator ditolak (redirect) saat membuka `/data-referensi/personel` dan ditolak (403) saat POST ke `/api/po`; Petugas bisa membuka halaman data referensi (200) dan berhasil POST ke `/api/po` (201); Petugas ditolak dari `/admin/kalender` dan `/api/kalender` (403); Administrator tetap bisa mengelola Kalender Kerja seperti biasa; URL lama `/admin/personel` mengembalikan 404; kartu Dashboard tampil sesuai role masing-masing.

**Belum dibangun:** halaman/menu untuk Administrator mengelola akun pengguna (masih lewat skrip, bukan UI) — di luar cakupan permintaan hari ini.


## 19 Data terpusat dipindah dari SQLite lokal ke Supabase (PostgreSQL) (17 September 2026)

Pengguna meminta seluruh data dipindah dari SQLite lokal (`dev.db`, hanya bisa diakses di komputer pengguna) ke Supabase (PostgreSQL terkelola, bisa diakses lewat internet) — prasyarat supaya aplikasi bisa dipakai multiuser lewat internet sesuai tujuan proyek (bagian 1). Sudah **dibangun dan diuji**, termasuk pemindahan data contoh yang sudah ada (bukan mulai dari kosong).

**Perubahan teknis:** skema Drizzle (`src/db/schema.ts`) ditulis ulang dari dialek SQLite ke PostgreSQL (tipe kolom menyesuaikan, struktur tabel dan nama kolom tidak berubah). Koneksi database (`src/db/index.ts`, `drizzle.config.ts`) memakai `DATABASE_URL` dari file `.env` (tidak dimasukkan ke Git, sesuai praktik penyimpanan rahasia). Skrip migrasi sekali-pakai (`migrate-to-supabase.ts`) memindahkan seluruh isi `dev.db` ke Supabase tabel demi tabel, termasuk mengatur ulang penomoran ID otomatis supaya data baru yang ditambah setelah migrasi tidak bentrok ID dengan data lama.

**Catatan penting — koneksi Supabase pakai Session Pooler, bukan direct connection.** Connection string "direct connection" bawaan Supabase (`db.<project-ref>.supabase.co`) hanya bisa diakses lewat IPv6, dan gagal (`ENOTFOUND`) di jaringan yang belum mendukung IPv6. Solusinya pakai connection string **Session pooler** (`aws-0-<region>.pooler.supabase.com`, dengan format nama pengguna `postgres.<project-ref>`) yang kompatibel IPv4. Kalau nanti perlu ganti kata sandi database atau pindah region Supabase, connection string baru harus diambil dalam bentuk pooler ini juga.

**Sudah diuji secara manual:** `npx drizzle-kit push` berhasil menerapkan skema ke Supabase ("Changes applied"); skrip migrasi berhasil memindahkan seluruh data contoh dengan jumlah baris yang cocok untuk setiap tabel (users 3, personel 1, rate_card 1, user_xl 1, po 1, pemetaan_personel_po 1, kalender_kerja 1, pengajuan 5, pengajuan_detail 5, konfirmasi 5, checker_review 4, dokumen 5, audit_log 20 — tabel timesheet kosong, dilewati); login, dashboard, Pengajuan, dan Summary PO sudah dicoba manual oleh pengguna setelah migrasi dan berjalan normal dengan data dari Supabase (bukan lagi dari `dev.db`).

**Belum dibereskan:** file `migrate-to-supabase.ts` dan `dev.db` (basis data SQLite lama) masih ada di folder proyek sebagai cadangan sejarah — aman dihapus kapan saja karena sudah tidak dipakai aplikasi yang berjalan, tapi sengaja belum dihapus supaya ada jejak kalau perlu dicek ulang.


## 20 Peran Administrator disempurnakan — benar-benar terpisah dari data operasional, dan halaman Akun & Akses baru (17 September 2026)

Setelah mencoba aplikasi hasil bagian 18, pengguna menilai pemisahan peran waktu itu masih belum tuntas: Kalender Kerja masih di bawah Administrator (padahal itu data operasional, bukan akses), dan belum ada cara mendaftarkan akun/menentukan peran selain lewat skrip teknis (`seed-users.ts`). Permintaan eksplisit pengguna: *"Admin hanya mengatur akses, mendaftarkan email, siapa yg bisa input data, siapa yg approval. Betul-betul sebagai pemegang admin untuk akses, tidak ada hubungannya dengan finance."* Ini **memperbarui** bagian 12 dan bagian 18 (bukan menambah cakupan baru), sudah **dibangun dan diuji**:

**Pembagian peran final:**
- **Administrator** — HANYA mengatur akun & akses: mendaftarkan email baru, menentukan peran (Input Data / Checker / Admin), mengaktifkan/menonaktifkan akun. Tidak lagi memegang Kalender Kerja atau data apa pun yang bersinggungan dengan finance/operasional.
- **Input Data** (nilai di basis data tetap `"petugas"` — lihat catatan teknis di bawah) — mengelola SEMUA data referensi operasional: Personel, Rate Card, PO/Item (termasuk nilai GR), User XL, Pemetaan Personel↔PO, dan sekarang juga Kalender Kerja. Ditambah fungsi lama: buat & konfirmasi pengajuan.
- **Checker** — tidak berubah, tetap hanya approve/reject pengajuan.

**Halaman baru: Akun & Akses (`/admin/akun`, Administrator-only).** Di sini Administrator bisa: mendaftarkan akun baru (nama, email, peran, kata sandi awal — minimal 8 karakter), mengubah peran akun yang sudah ada, dan mengaktifkan/menonaktifkan akun (akun nonaktif otomatis ditolak saat login, memakai pemeriksaan yang sudah ada sejak MVP 1). Tidak ada hapus permanen — akun dipakai sebagai jejak di log audit, pengajuan, dan riwayat lain yang tidak boleh kehilangan rujukannya; menonaktifkan akun sudah cukup untuk mencabut akses. Administrator tidak bisa mengubah akunnya sendiri lewat halaman ini (mencegah dirinya sendiri terkunci dari sistem tanpa sengaja) — perubahan itu perlu dilakukan lewat akun Administrator lain.

**Kalender Kerja pindah ke Input Data.** Halaman pindah dari `/admin/kalender` ke `/data-referensi/kalender` (URL lama sekarang 404). API di baliknya (`/api/kalender`, termasuk sub-route `[tanggal]`) diubah dari `wajibRoleApi(["admin"])` menjadi `wajibRoleApi(["petugas"])`.

**Catatan teknis — nilai peran di basis data TIDAK diganti, hanya label di layar.** Nilai kolom `role` di tabel `users` (`"admin"`, `"petugas"`, `"checker"`) sengaja dibiarkan seperti semula supaya tidak perlu migrasi berisiko di banyak tabel (audit log, sesi, dll. yang menyimpan/menyinggung nilai ini). Yang berubah hanya TAMPILANNYA: helper baru `src/lib/role-label.ts` memetakan `"petugas"` → tampil sebagai **"Input Data"** di badge topbar, halaman Akun & Akses, dan tempat lain yang menampilkan peran ke pengguna. Kartu Dashboard juga disesuaikan: kartu "Data Referensi" (untuk Input Data) sekarang menyebut Kalender Kerja juga; kartu Administrator berganti nama jadi "Akun & Akses" dan mengarah ke `/admin/akun`.

**Sudah diuji secara statis (pemeriksaan tipe TypeScript `tsc --noEmit` bersih, tanpa error)** — pengujian manual di server pengguna (login sebagai masing-masing peran, coba akses `/admin/akun` dan `/data-referensi/kalender` dari peran yang salah, coba daftar akun baru, ubah peran, nonaktifkan akun lalu coba login dengan akun itu) **menyusul dilakukan pengguna sendiri**, karena sesi ini sudah tidak bisa menjalankan `npm run dev` untuk proyek ini secara langsung (lihat catatan lingkungan kerja — instalasi paket sebelumnya sempat mencampur biner Linux ke `node_modules` yang seharusnya khusus macOS, sudah diperbaiki dengan instalasi ulang bersih dari Terminal pengguna sendiri).

**Belum dibangun dari catatan ini:** ubah kata sandi akun sendiri (ganti kata sandi masih lewat database langsung/skrip, belum ada UI "lupa kata sandi" atau "ganti kata sandi"), dan sisa cakupan MVP 2 di bagian 14 (integrasi Get Approve CAC/COUPA, verifikasi kredensial per koneksi).


## 21 Administrator dikeluarkan total dari Pengajuan & Summary PO, dan email akun dibatasi domain @idstar.group (17 September 2026)

Setelah meninjau hasil bagian 20, pengguna menajamkan lagi cakupan Administrator: *"untuk di akun admin hanya untuk buat akses, tapi fitur Pengajuan dan Summary PO tidak perlu ada di situ."* Ini **memperbarui** bagian 17 dan 20 (dulu ketiga role, termasuk Administrator, bisa membuka Summary PO sebagai halaman lihat-saja — sekarang tidak lagi). Sudah **dibangun** (pemeriksaan tipe TypeScript `tsc --noEmit` dan ESLint bersih dari error/warning baru; pengujian manual login per peran menyusul dilakukan pengguna sendiri):

**1. Administrator tidak lagi bisa membuka Pengajuan maupun Summary PO.** Kartu "Pengajuan" dan "Summary PO" di Dashboard sekarang hanya muncul untuk peran Input Data dan Checker (tidak muncul sama sekali untuk Admin). Pembatasan juga ditegakkan di server (bukan cuma disembunyikan di tampilan) — `wajibRole`/`wajibRoleApi` di `/pengajuan`, `/pengajuan/[id]`, `/summary-po`, dan API `/api/timesheet` (GET status timesheet, POST unggah timesheet) diubah dari mengizinkan Administrator menjadi hanya Input Data dan/atau Checker sesuai kebutuhan masing-masing halaman. Kalau Administrator mencoba akses langsung lewat URL, akan dialihkan ke Dashboard (halaman) atau ditolak 403 (API) — sama seperti pola pembatasan role lain di aplikasi ini.

**2. Email akun baru wajib domain resmi perusahaan.** Form "Daftarkan Akun" di halaman Akun & Akses dan API di baliknya (`POST /api/akun`) sekarang menolak email yang bukan `@idstar.group` — baik di form (validasi HTML) maupun di server (validasi sesungguhnya, jadi tidak bisa dilewati dengan permintaan langsung ke API). Akun yang sudah terlanjur terdaftar dengan email di luar domain ini (kalau ada dari data contoh/migrasi sebelumnya) TIDAK terpengaruh — pembatasan ini hanya berlaku untuk pendaftaran akun BARU, bukan pembersihan data lama.

**Cakupan final Administrator sekarang:** benar-benar hanya mengelola akun & akses (daftar email @idstar.group, tentukan peran, aktifkan/nonaktifkan) — tidak melihat, apalagi mengubah, data Pengajuan, Summary PO, Kalender Kerja, maupun data referensi lain apa pun.

**Belum dibangun dari catatan ini:** pembersihan/migrasi akun contoh lama yang emailnya bukan `@idstar.group` (`admin@contoh.local` dkk dari `seed-users.ts`) — kalau perlu, akun contoh ini sebaiknya dinonaktifkan lewat halaman Akun & Akses begitu akun asli `@idstar.group` sudah didaftarkan.


## 22 Pemetaan detail integrasi Get Approve CAC/BAST — otomasi browser (18 September 2026)

Lanjutan bagian 14 poin 2 & 3 (integrasi Get Approve CAC/COUPA, verifikasi kredensial). Sesi ini memetakan detail teknis untuk **Get Approve** (sistem CAC/BAST milik XL) sampai ke level field formulir — **BELUM DIBANGUN**, ini catatan spesifikasi hasil diskusi dan pengecekan langsung ke `https://getapprove.xlsmart.co.id` (halaman login saja, tanpa kredensial apa pun) plus dua contoh dokumen CAC/BAST nyata yang dikirim pengguna. COUPA menyusul dipetakan terpisah sebelum pembangunan dimulai.

**Keputusan arsitektur (dari pengguna):**
1. **Cara integrasi:** otomasi browser (Playwright) yang mengisi form Get Approve secara otomatis — BUKAN API resmi (belum dipastikan tersedia dari XL).
2. **Yang berwenang menghubungkan akun Get Approve/COUPA:** peran Input Data dan Checker (bukan Administrator — konsisten dengan pemisahan di bagian 20-21).
3. **Penyimpanan kredensial:** disimpan terenkripsi di aplikasi (kunci enkripsi terpisah dari kode/database, idealnya lewat environment variable, belum diimplementasi).
4. **Approval Matrix** (langkah kedua setelah Document Form, sebelum submit final) **SENGAJA TIDAK diotomasi** — pengguna memutuskan ini tetap diisi manual oleh Input Data/Checker sebagai titik pemeriksaan terakhir sebelum dokumen benar-benar terkirim ke approver XL. Otomasi berhenti setelah Document Form terisi + lampiran terunggah + klik "Next"; sisanya (pilih approver, submit final) dilakukan manusia.
5. **Kalau otomasi gagal** (misal Get Approve ubah tampilan): ditampilkan sebagai status "Gagal" di halaman aplikasi ke Input Data — bukan notifikasi email terpisah.

**Alur Get Approve:** Login (`/auth/login`) → pilih **"Sign in as external user"** (bukan SSO Microsoft — itu untuk staf internal XL) → isi Email + Password → halaman "Approval Document" → tombol **Request Approval** → modal "Select Document Category" (Main Document Category = "BAU Approval" tetap, Category = "Customer Acceptance Certificate" untuk CAC atau "Berita Acara Serah Terima" untuk BAST) → Submit → **Document Form** (field beda antara CAC dan BAST, lihat tabel di bawah) → isi form + upload lampiran → **Next** → tab **Approval Matrix** (diisi manual, tidak diotomasi) → submit final (manual).

**Pemetaan field Document Form — CAC ("Customer Acceptance Certificate"):**

| Field Get Approve | Cara isi |
|---|---|
| Document Name | Otomatis: `PO <no PO> <bulan singkat> <tahun 2 digit>_<nama proyek>_<nama User XL> IDS` (pola dari contoh dokumen CAC/BAST nyata) — **field ini tetap bisa diedit manual** oleh Input Data sebelum lanjut |
| Date of Creation | Otomatis, tanggal hari ini |
| Supplier Name (dropdown) | Selalu pilih **"PT IDStar Cipta Teknologi"** |
| Status of Acceptance | Selalu **"100%"** |
| Project Name | Otomatis dari nama proyek PO (`po.namaProyek`) |
| Contract Status (dropdown) | Selalu **"Amend Signed"** (dikonfirmasi dari teks persis di dokumen CAC asli) |
| Terms Payment | Selalu **"9 Months"** |
| Purchase Order | Otomatis dari nomor PO (`po.nomorPo`) — **belum dipastikan** apakah field ini kotak teks biasa atau autocomplete/dropdown; perlu dicek saat uji coba pertama dengan akun nyata |
| Project Location | Selalu **"Headquarter"** (dikonfirmasi dari teks persis di dokumen CAC asli, BUKAN "Headoffice") |
| Functional Location | Selalu **"0010"** |
| Work Completed Date | Tanggal akhir bulan dari periode pengajuan (mis. periode April → 30 April tahun tsb.) |
| Currency (dropdown) | Selalu **"IDR"** |
| PO Value | Otomatis dari `po.nilaiItem` (nilai PO penuh) |
| GR Value | Otomatis dari **total nilai tagihan pengajuan yang sedang diajukan saat ini** (BUKAN field "Nilai GR" kumulatif di Summary PO — itu angka terpisah) |
| Type of Project (dropdown) | Selalu **"Services"** |
| Delivery Date, Receipt Date, Remarks | Dikosongkan (tidak wajib) |
| Is project completed according to agreed SLA? | Selalu pilih **"Yes"** |
| Supporting Document (upload, wajib) | **Upload manual** oleh Input Data — file PDF CAC yang sudah dibuat aplikasi ini |
| Due Date | Dikosongkan |
| Reminder Schedule | **Days = 1, Hours = 0** |

**Pemetaan field Document Form — BAST ("Berita Acara Serah Terima"), field BEDA dari CAC:**

| Field Get Approve | Cara isi |
|---|---|
| Document Name | Sama seperti CAC (pola otomatis, bisa diedit manual) |
| Employee Department/Division | Selalu **"Finance"** |
| Vendor Name (dropdown, ada fallback "type your vendor name" kalau tidak ketemu di daftar) | Selalu pilih **"PT IDStar Cipta Teknologi"**; kalau tidak ada di dropdown, baru ketik manual di kotak fallback |
| PO Number | Otomatis dari `po.nomorPo` (sama seperti "Purchase Order" di CAC) |
| PO Date | Tanggal akhir bulan periode pengajuan (SAMA seperti Work Completed Date di CAC — data tanggal terbit PO asli tidak tersimpan di aplikasi ini, jadi dipakai logika yang sama demi konsistensi, bukan tanggal PO sesungguhnya) |
| Currency (pilihan radio: Others/USD/MYR/IDR) | Selalu pilih **"IDR"** |
| PO Value | Otomatis dari `po.nilaiItem` (sama seperti CAC) |
| GR Value | Otomatis dari total nilai tagihan pengajuan saat ini (sama seperti CAC) |
| Remarks | Dikosongkan |
| Proof of Acceptance (upload, opsional — foto/dokumen pendukung seperti tax slip/bukti kirim) | Dikosongkan kecuali Input Data perlu lampirkan sesuatu secara manual |
| **Main Document** (upload, WAJIB, .docx/.pdf, maks 30MB) | **Upload manual** — file PDF BAST yang sudah dibuat aplikasi ini (padanan "Supporting Document" wajib di form CAC) |
| Supporting Document (upload tambahan, opsional, bisa lebih dari satu lewat tombol "+") | Dikosongkan kecuali diperlukan |
| Due Date | Dikosongkan |
| Reminder Schedule | Days = 1, Hours = 0 |

**Catatan khusus BAST:** ada peringatan di form — *"If GR value is more than IDR 500 million, BAST must be signed at minimum by Group Head level"* — ini aturan approval XL sendiri (bukan sesuatu yang perlu ditangani aplikasi kita), relevan untuk pengaturan Approval Matrix manual nanti.

**Belum dibangun/belum dipastikan dari catatan ini:**
- Pemetaan COUPA (sistem approval kedua) — belum dimulai.
- Struktur teknis penyimpanan kredensial terenkripsi (kunci enkripsi, tabel baru untuk kredensial per user Get Approve/COUPA).
- Halaman/tombol pemicu otomasi di aplikasi kita, dan tampilan status (Berhasil/Gagal/Sedang diproses).
- Apakah field "Purchase Order" di CAC berupa kotak teks atau autocomplete — perlu diuji dengan akses nyata.
- Perilaku Get Approve setelah beberapa kali gagal login (captcha dsb.) — belum teruji karena belum ada kredensial uji coba.


## 23 Pemetaan detail integrasi COUPA — dan kesenjangan data baru yang ditemukan (18 September 2026)

Lanjutan bagian 22, memetakan sistem kedua: **COUPA** (Coupa Supplier Portal, `supplier.coupahost.com`), berdasarkan panduan resmi XL "Tata Cara Penagihan PO — Integrated by COUPA" yang dikirim pengguna plus satu screenshot form nyata. **BELUM DIBANGUN** — beda dari Get Approve, COUPA butuh data baru yang sekarang belum ditangkap aplikasi sama sekali, jadi pemetaan ini sekaligus menemukan perubahan skema data yang diperlukan sebelum otomasi bisa jalan.

**Aturan bisnis penting (dari panduan resmi XL) yang HARUS ditegakkan aplikasi sebelum mencoba COUPA:**
- **COUPA hanya berlaku untuk PO dengan awalan nomor "8000xxx".** PO dengan awalan "45-xxxxx" atau "52-xxxx" TIDAK lewat COUPA — penagihan untuk PO jenis itu wajib lewat email manual ke `LoketInvoice@xl.co.id`. Aplikasi harus mengecek awalan nomor PO dulu sebelum menjalankan otomasi COUPA; kalau bukan awalan 8000, otomasi dibatalkan dan Input Data diarahkan kirim manual lewat email.
- **1 GR# + 1 PO# hanya boleh 1 kali penagihan** — tidak boleh submit dobel untuk GR Slip yang sama.
- **Maksimal penyerahan penagihan = 3 bulan dari tanggal GR Slip/ES Slip diterbitkan** — lewat dari itu berisiko ditolak XL.
- Faktur Pajak (e-faktur, PDF ber-QR Code) wajib dilampirkan di field "Image Scan" kalau menagihkan PPN; kalau tidak menagihkan PPN, field itu tetap wajib diisi dengan invoice/dokumen pendukung lain (tidak boleh kosong).

**Alur COUPA:** Login (`supplier.coupahost.com/sessions/new`, pakai email yang terdaftar di XL — beda akun dari Get Approve) → tab **Orders** → cari nomor PO → klik ikon koin kuning "Action" → **Create Invoice from PO** → isi form (General Info + Lines + Total Taxes) → **Calculate** (cek ulang total) → **Submit**.

**Pemetaan field form "Create Invoice":**

| Field | Cara isi |
|---|---|
| Invoice # (maks. 20 karakter) | **Otomatis** — format `{nomor urut}/INV-IDS/{bulan romawi}/{tahun}`, mengikuti **tanggal GR disetujui** (bukan tanggal invoice dibuat, bukan periode kerja yang ditagihkan — pekerjaan Februari yang baru disetujui GR-nya di Juni tetap pakai romawi Juni). Nomor urut **reset ke 1 setiap awal tahun baru**, mengikuti tahun GR disetujui. |
| Invoice Date | Otomatis, tanggal hari ini (Coupa sudah auto-isi ini, memenuhi aturan "< 7 hari dari tanggal penagihan") |
| Payment Term, Currency, Status | Readonly, terisi otomatis dari PO oleh Coupa sendiri — tidak perlu disentuh |
| Image Scan / Scanned Invoice/Faktur Pajak (wajib) | **Upload manual** — Faktur Pajak PDF (kalau menagihkan PPN) atau dokumen invoice/pendukung lain (kalau tidak) |
| Supplier Note, Attachments, Discount Amount, Payment Order Reference | Dikosongkan (tidak wajib) |
| Payment Milestone (dropdown) | **Selalu dikosongkan/skip** — PO bulanan IDStar-XL tidak pakai skema milestone DP/GR |
| Agree with Disclaimer (checkbox, wajib) | **Otomatis dicentang** — disclaimer standar XL, sama setiap kali |
| Invoice Type (PT XL Axiata) | **Dikosongkan** — sesuai keterangan resmi, hanya berlaku untuk invoice RE dan Non-PO VAS |
| Lines → Qty | Otomatis, dari jumlah yang ditagihkan di pengajuan |
| Lines → **GR Document Number** (wajib) | **Field baru diperlukan** — lihat kesenjangan data di bawah |
| Total Taxes → Tax % | Sesuai tarif pajak yang berlaku (perlu dipastikan nilainya saat implementasi — belum ditentukan di sesi ini) |
| Shipping, Handling, Misc | Dikosongkan (tidak wajib) |

**Kesenjangan data baru yang ditemukan — WAJIB ditambahkan ke skema sebelum otomasi COUPA bisa dibangun:**
1. **Nomor GR Slip/ES Slip** — nomor yang diterbitkan XL sendiri (bukan data kita) setelah User XL memproses Goods Receipt di SAP, format SAP4HANA: `6xxxxxxxxx-0000x-20yy` (10 digit nomor GR + 5 digit nomor line item PO + tahun GR dibuat). Pengguna memutuskan: **tambahkan field baru** di data Konfirmasi/Pengajuan supaya Input Data mencatat nomor ini begitu diterima dari User XL (lewat email/WA, di luar aplikasi) — bukan diketik ulang manual setiap kali submit ke COUPA.
2. **Tanggal GR Disetujui** — perlu dicatat berbarengan dengan Nomor GR Slip (poin 1), karena tanggal ini yang menentukan bulan+tahun di nomor invoice otomatis (lihat tabel di atas) — bukan tanggal submit maupun periode kerja.
3. **Tarif pajak (Tax %) yang berlaku** — belum ditentukan angkanya di sesi ini, perlu dipastikan saat implementasi (kemungkinan PPN 11% standar, tapi perlu dikonfirmasi, bukan diasumsikan).

**Belum dibangun/belum dipastikan dari catatan ini:**
- ~~Perubahan skema database untuk field Nomor GR Slip + Tanggal GR Disetujui, dan mekanisme penomoran invoice (counter per tahun) di aplikasi.~~ **Sudah ditambahkan di kode** (`pengajuan.nomorGrSlip`, `pengajuan.tanggalGrDisetujui`, tabel baru `invoice_counter`) — menunggu di-`push` ke Supabase oleh pengguna (18 September 2026). Belum ada UI untuk mengisi field ini.
- Pengecekan otomatis awalan nomor PO (8000 vs 45-/52-) sebelum menjalankan otomasi.
- Nilai pasti Tax % yang dipakai saat submit.
- Struktur teknis penyimpanan kredensial COUPA (akun ini terpisah dari akun Get Approve — kemungkinan perlu 2 slot kredensial berbeda per user Input Data/Checker).


## 24 Skema data pendukung Get Approve/COUPA, dan halaman Kelengkapan Dokumen (18 September 2026)

Langkah pertama pembangunan nyata dari cakupan bagian 22-23 (sebelumnya baru pemetaan/spesifikasi) — sudah **dibangun** (`tsc --noEmit` dan ESLint bersih dari error/warning baru; skema sudah di-`push` ke Supabase oleh pengguna, "Changes applied"). Pengujian manual UI menyusul dilakukan pengguna sendiri.

**1. Skema baru untuk COUPA (lihat bagian 23):**
- `pengajuan.nomorGrSlip` dan `pengajuan.tanggalGrDisetujui` — dicatat manual oleh Input Data begitu XL kirim nomor GR Slip/ES Slip (lewat email/WA, di luar aplikasi). Belum ada form untuk mengisi field ini — baru kolom di basis data.
- Tabel baru `invoice_counter` (`tahun`, `urutTerakhir`) — dasar mekanisme penomoran invoice `{urut}/INV-IDS/{bulan romawi}/{tahun}` yang reset tiap tahun. Belum ada logika generate nomor invoice yang memakainya — baru struktur tabelnya.

**2. Halaman "Kelengkapan Dokumen"** — bagian baru di halaman detail Pengajuan (`/pengajuan/[id]`), muncul untuk status "Siap Diajukan"/"Diajukan", bisa diakses Input Data DAN Checker (bukan cuma Input Data — konsisten dengan keputusan bahwa kedua peran ini yang berwenang menyambungkan ke Get Approve/COUPA, lihat bagian 22). Menampilkan checklist: CAC sudah dibuat atau belum, BAST sudah dibuat atau belum, dan daftar **lampiran tambahan** yang sudah diunggah (spreadsheet tracking PO, dokumen pendukung lain sesuai kebutuhan — file yang dibuat/diisi Input Data DI LUAR aplikasi ini, bukan digenerate aplikasi). Ada form unggah (label bebas + file, maks. 30MB) dan tombol hapus per lampiran. Tabel baru `lampiran_pengajuan` menyimpan file-file ini (path fisik di `uploads/lampiran/`, mirip pola penyimpanan timesheet).

**Alasan halaman ini dibuat:** pengguna menjelaskan bahwa sebelum otomasi ke Get Approve bisa jalan, semua lampiran yang perlu di-attach (CAC, BAST, spreadsheet, dokumen pendukung lain) harus sudah disiapkan lebih dulu di aplikasi — otomasi nanti tinggal mengambil file-file yang sudah siap ini, bukan menunggu diunggah di tengah proses otomasi berjalan.

**Belum dibangun dari catatan ini:**
- Tombol/pemicu "Mulai Otomasi ke Get Approve/COUPA" itu sendiri — halaman ini baru tempat MENYIAPKAN lampirannya, belum ada yang memakainya.
- Form untuk mengisi Nomor GR Slip + Tanggal GR Disetujui.
- Logika generate nomor invoice otomatis yang memakai tabel `invoice_counter`.
- Penyimpanan kredensial terenkripsi untuk akun Get Approve/COUPA.
- Validasi "wajib lengkap dulu" — saat ini halaman Kelengkapan Dokumen hanya menampilkan status, belum ada penegahan (mis. tombol otomasi disabled kalau CAC/BAST belum ada) karena tombol otomasinya sendiri belum ada.

## 25 Format PDF gabungan CAC/BAST — 3 halaman sesuai contoh dokumen resmi (18 September 2026)

Pengguna berbagi contoh CAC/BAST yang sudah pernah diajukan ke XL (PDF asli): formatnya terdiri dari
3 halaman — (1) sertifikat CAC/BAST itu sendiri, (2) halaman "Lampiran" berisi tabel balance PO
(PO Value/Done GR/Last PO Balance/Usage/%Completion) yang merupakan screenshot dari spreadsheet
tracking eksternal, (3) scan/copy dokumen PO asli terbitan XL. Pengguna minta dokumen yang dibuat
aplikasi ini disamakan formatnya.

**Keputusan (dikonfirmasi pengguna):**
- Halaman 3 (PO asli): diunggah **sekali per PO** di Data Referensi · PO/Item, otomatis dipakai ulang
  di setiap CAC/BAST untuk PO itu (bukan input ulang tiap kali).
- Halaman 2 (Lampiran balance): **tidak dihitung otomatis** oleh aplikasi (datanya ada di spreadsheet
  eksternal yang dikelola manual di luar sistem) — Input Data mengunggah potongan gambar/PDF halaman
  itu dari spreadsheet, dengan label lampiran persis `"Lampiran Balance PO"` (konstanta
  `LABEL_LAMPIRAN_BALANCE` di `src/lib/lampiran-label.ts`), dan aplikasi otomatis mengenali &
  menempelnya sebagai halaman 2.
- Cara gabung PDF: **generate otomatis 1 file PDF utuh** (bukan cetak-browser manual lalu unggah
  balik) — dipilih pengguna karena lebih rapi dan tidak perlu langkah manual tambahan. Halaman 1
  digambar langsung memakai library `pdf-lib` (bukan lagi cetak dari halaman HTML lewat browser),
  lalu halaman 2 (Lampiran Balance PO) dan halaman 3+ (PO Asli) ditempel dari file yang sudah
  diunggah — mendukung file sumber berupa PDF (semua halaman disalin) atau gambar PNG/JPG
  (ditempatkan di satu halaman A4).

**Dibangun:**
- Skema: `po.namaFilePoAsli` + `po.pathFilePoAsli` (dokumen PO asli, sekali unggah per PO).
- `src/lib/lampiran-label.ts` — konstanta label reserved `LABEL_LAMPIRAN_BALANCE = "Lampiran Balance PO"`.
- `POST/DELETE /api/po/[id]/dokumen-asli` — unggah/hapus dokumen PO asli (role: petugas), ganti file
  lama otomatis kalau upload ulang.
- UI unggah PO asli di halaman Edit PO (`src/app/data-referensi/po/[id]/edit/dokumen-asli-form.tsx`).
- Kartu "Kelengkapan Dokumen" di detail pengajuan: baris checklist terpisah untuk Dokumen PO Asli dan
  Lampiran Balance PO (selain lampiran tambahan lain yang sudah ada), plus tombol cepat untuk mengisi
  label "Lampiran Balance PO" di form unggah lampiran.
- `GET /api/pengajuan/[id]/dokumen/[dokumenId]/pdf` — generate PDF gabungan (role: petugas, checker).
  Kalau lampiran/PO asli belum lengkap, PDF tetap dibuat (hanya berisi halaman yang tersedia) dan
  halaman dokumen menampilkan peringatan bagian mana yang belum lengkap.
- Tombol "Unduh PDF Gabungan" di halaman dokumen CAC/BAST (`.../dokumen/[dokumenId]`), di samping
  tombol cetak lama (tombol cetak/print browser tetap ada sebagai alternatif pratinjau cepat).
- Dependency baru: `pdf-lib` (ditambahkan ke `package.json`, sudah `npm install` — lihat langkah
  drizzle-kit push di bawah untuk migrasi skema).

**Belum dibangun (lanjutan dari bagian 22-24):**
- Otomasi browser ke Get Approve/COUPA itu sendiri.
- Form input `nomorGrSlip` + `tanggalGrDisetujui` di UI pengajuan.
- Logika generate nomor invoice otomatis dari `invoice_counter`.
- Penyimpanan kredensial terenkripsi Get Approve/COUPA.
- Validasi gating otomatis (tombol mulai otomasi baru aktif kalau semua kelengkapan checklist ✓).

## 26 Status proses CAC -> Invoice, dashboard analisa durasi, dan impor data Integral (18 September 2026)

**A. Timeline status manual/otomatis per pengajuan**

Kartu baru "Status Proses CAC -> Invoice" di detail pengajuan (kondisi tampil sama dengan kartu
Kelengkapan Dokumen: status `siap_diajukan`/`diajukan`, role Petugas/Checker):
1. Tanggal Submit CAC — **otomatis**, diisi sistem saat Checker set hasil `siap_diajukan`
   (`src/app/api/pengajuan/[id]/checker/route.ts`).
2. Tanggal CAC Approved (status approved di Get Approve) — manual.
3. Tanggal Request GR (tanggal submit request GR di Get Approve) — manual.
4. Tanggal GR Approved — **memakai field `tanggalGrDisetujui` yang sudah ada** (bagian 23/24), bukan
   kolom baru — sekarang punya form input-nya (sebelumnya cuma ada skema, belum ada UI).
5. Tanggal Submit Invoice (COUPA) — manual.
6. Tanggal Approve Invoice (COUPA) — manual.

Field 2, 3, 5, 6 baru: `tanggalCacApproved`, `tanggalRequestGr`, `tanggalSubmitInvoice`,
`tanggalApproveInvoice` di tabel `pengajuan`. Diedit lewat `PATCH /api/pengajuan/[id]/status-proses`
(role petugas/checker) — `tanggalSubmitCac` sengaja TIDAK ada di endpoint ini karena cuma diisi
otomatis oleh sistem.

**B. Dashboard analisa durasi (halaman baru `/dashboard/analisa-durasi`)**

Grafik bar horizontal rata-rata jumlah hari dari Tanggal Submit CAC sampai Tanggal Approve Invoice,
dikelompokkan **per User XL** (bukan per Petugas/Input Data) — dipakai untuk melihat User XL mana
yang proses approval-nya paling lama, sesuai permintaan pengguna. Pengajuan yang salah satu dari
kedua tanggal itu belum diisi tidak dihitung. Ada juga tabel rincian per pengajuan di bawah grafik.
Kartu link ditambahkan di halaman Dashboard utama untuk role selain admin.

**C. Impor data Integral ke Data Referensi · Personel**

Pengguna berbagi link sheet "Invoice Plan From INTEGRALS Data"
(`docs.google.com/spreadsheets/d/1gJvDsFuJlAzkxbOl2Gm0IBBWW_rbdmm8_IBRs3Jatvg`) — sumber data
personel/rate card yang selama ini diisi manual, rawan human error. Kolom sheet: NIK, name, email,
client_name, Type, position, status_code, Source, placement_name, spk_start_date,
spk_actual_end_date, rate_card, po_number, spk_number. Ditemukan: penempatan XL Smart Sejahtera
ditandai `placement_name = "IDS-XL"` (client_name = "PT XLSMART Telecom Sejahtera. Tbk").

**Cara kerja (dikonfirmasi mengikuti pola rate history yang sudah ada di skema, tidak perlu
konfirmasi ulang ke pengguna):**
- Tidak ada integrasi API Google Sheets langsung di aplikasi (belum ada infrastruktur kredensial
  untuk itu) — Input Data mengunduh sheet sebagai **.csv** (File > Download > CSV), lalu unggah di
  kartu baru "Impor dari Data Integral" di halaman Data Referensi · Personel.
- Baris difilter otomatis: hanya `placement_name = "IDS-XL"`. Hanya kolom `name` dan `rate_card`
  yang dipakai — kolom lain diabaikan sesuai permintaan pengguna.
- Personel baru (nama belum ada, dicocokkan case-insensitive) -> ditambahkan + rate card awal
  (`berlakuDari` = tanggal impor).
- Personel sudah ada, rate berubah -> rate card lama ditutup (`berlakuSampai` = H-1 tanggal impor),
  rate card baru dibuat mulai tanggal impor (riwayat rate tetap tersimpan, konsisten dengan
  mekanisme Rate Card yang sudah ada).
- Personel sudah ada, rate sama -> tidak ada perubahan.
- Baris dengan `rate_card` tidak valid (bukan angka) -> dilewati, dicatat di ringkasan hasil impor.
- Endpoint: `POST /api/data-referensi/personel/impor-integral` (role petugas). Parser CSV custom
  tanpa dependency tambahan: `src/lib/csv.ts`.

**Belum dibangun (lanjutan dari bagian 22-24):**
- Otomasi browser ke Get Approve/COUPA itu sendiri (field tanggal di atas masih diisi manual sampai
  otomasi ada).
- Form input `nomorGrSlip` di UI pengajuan (tanggalnya sekarang sudah ada UI-nya, nomornya belum).
- Logika generate nomor invoice otomatis dari `invoice_counter`.
- Penyimpanan kredensial terenkripsi Get Approve/COUPA.
- Validasi gating otomatis (tombol mulai otomasi baru aktif kalau semua kelengkapan checklist ✓).

## 27 Rebranding aplikasi jadi "Invora" + font baru + alamat footer 2 baris (18 September 2026)

Pengguna sudah tidak sreg dengan nama "Get Invoice XL" — minta usulan nama yang lebih menjual &
gampang diingat. Setelah beberapa putaran diskusi (sempat dicoba nama Korea juga), disepakati:

**Nama produk: Invora** — dari "Invo" (Invoice) + "-ora" (kesan "era baru", seperti di kata
"aurora"). Artinya: era baru proses invoicing — dari manual (isi form berulang di Get Approve/COUPA)
jadi satu alur otomatis dari ujung ke ujung. Nama sengaja TIDAK dikunci ke "XL" supaya tetap relevan
kalau nanti dipakai untuk proses invoicing ke klien lain juga.

Diganti di semua tempat yang sebelumnya menampilkan "Get Invoice XL"/"Proses Invoicing XL":
`src/app/layout.tsx` (title & meta description), `src/app/login/page.tsx` (h1),
`src/components/topbar.tsx`, footnote dokumen CAC/BAST
(`src/app/pengajuan/[id]/dokumen/[dokumenId]/page.tsx` dan versi PDF-nya
`src/app/api/pengajuan/[id]/dokumen/[dokumenId]/pdf/route.ts`).

Nama folder proyek (`proses-invoicing-app`) dan `package.json` sengaja TIDAK diubah — itu cuma nama
internal untuk development, tidak tampil ke pengguna aplikasi.

**Font:** diganti dari Inter ke **Plus Jakarta Sans** (Google Font, lewat `next/font/google`) di
`src/app/layout.tsx` — kesannya lebih modern & punya karakter dibanding Inter yang cukup generik.
Sekalian dibetulkan: sebelumnya CSS variable font dari `next/font` (`--font-inter`) sudah dideklarasi
di `<html>` tapi tidak pernah benar-benar disambungkan ke `--font-sans` di `globals.css` (yang
kebetulan tetap jalan karena fallback nama font "Inter" juga otomatis terdaftar oleh Next.js) —
sekarang `--font-sans` di `globals.css` eksplisit memakai `var(--font-jakarta)`.

**Alamat footer** (`src/components/footer.tsx`) dipecah jadi 2 baris terpisah (masing-masing dalam
`<div>` sendiri) sesuai permintaan, dari sebelumnya satu paragraf mengalir.

## 28 Background animasi halaman login (18 September 2026)

Pengguna minta background animasi untuk halaman login: gedung bertingkat, orang-orang bekerja,
invoice yang berujung jadi penerimaan uang/cash. Disiapkan 4 usulan sebagai preview HTML terpisah
(dikirim sebagai file, bukan bagian dari kode aplikasi): (1) Skyline Pulse — kota malam, invoice
terbang jadi koin, (2) Office Windows — grid jendela kantor ramai dengan figur "mengetik", (3)
Conveyor Flow — invoice di ban berjalan lewat gerbang approval jadi uang, (4) Particle City — gaya
abstrak/premium, partikel & confetti emas.

**Dipilih: Office Windows**, tapi warna diganti dari versi gelap (preview awal) ke **versi terang**
supaya tidak dominan/mengganggu keterbacaan halaman login.

**Dibangun** (murni CSS/JS, tanpa dependency animasi eksternal, jadi tidak menambah bundle size
berarti):
- `src/components/login-background.tsx` — client component, generate grid 12x7 sel "jendela kantor"
  secara acak (index a-`Math.random()`, dibangun sekali lewat `useEffect`); sebagian sel "menyala"
  berisi figur kecil dengan animasi "mengetik", sesekali kertas invoice meluncur ke atas. Ada tray
  kas di pojok kanan bawah dengan batang yang tumbuh berulang (menggambarkan tagihan terkumpul).
- CSS di `src/app/globals.css` (namespace `.login-bg-*`): background gradient terang
  (`#fff8ec → #f5f7fa → #ffffff`), grid jendela dipudarkan di area tengah lewat `mask-image`
  radial-gradient supaya tidak "ramai" di belakang kartu login. Warna aksen tetap pakai
  `--color-primary`/`--color-accent` (brand IDStar). `@media (prefers-reduced-motion: reduce)`
  mematikan animasi untuk pengguna yang mengaktifkan pengaturan itu di OS.
- `src/app/login/page.tsx` — background lama (gradient merah solid) diganti `<LoginBackground />`,
  logo pojok kiri atas diganti ke varian warna (sebelumnya varian putih, tidak kebaca lagi di
  background terang).

Tidak perlu `drizzle-kit push` (tidak menyentuh database) — cukup restart `npm run dev`.

## 29 Login: panel merah 20% kiri + background diganti ke Skyline Pulse tanpa teks (18 September 2026)

Revisi dari bagian 28. Perubahan yang diminta:
1. Panel warna merah brand di sisi kiri, kira-kira **20% lebar layar**.
2. Hapus semua teks di background (sebelumnya ada label "Tagihan terkumpul" di versi Office Windows).
3. Ganti pilihan animasi dari Office Windows ke **Skyline Pulse**.
4. Gedungnya diminta benar-benar terlihat seperti gedung pencakar langit kota besar (New York/Indonesia),
   bukan kotak-kotak polos.

**Dibangun:**
- `src/app/login/page.tsx` — layout diubah jadi 2 kolom: `<aside>` kiri lebar `20%` (min 160px)
  warna `var(--color-primary)` berisi logo varian putih, sisanya (kanan, `flex: 1`) berisi
  `<LoginBackground />` + kartu login di tengah.
- `src/components/login-background.tsx` — ditulis ulang total: bangun 2 layer gedung (belakang —
  lebih pendek/pudar/blur tipis untuk kedalaman; depan — lebih tinggi, detail atap & jendela).
  Atap gedung diacak antar 4 gaya (`datar`, `antena` dengan lampu beacon berkedip merah, `bertingkat`
  bergaya setback/art-deco, `lancip`/pointed) supaya siluetnya bervariasi seperti skyline kota
  sungguhan, bukan blok seragam. Jendela sebagian "menyala" dengan animasi kedip acak. Satu invoice
  terbang melengkung lalu berubah jadi koin emas yang jatuh — diulang terus, tanpa teks apa pun.
- `src/app/globals.css` — CSS "Office Windows" (bagian 28) DIGANTI TOTAL dengan CSS "Skyline Pulse"
  (namespace `.login-bg-*` dipakai ulang). Jalur terbang invoice pakai `left`/`bottom` dalam % relatif
  ke area background sendiri (bukan `vw`) — supaya jalurnya tetap pas walau area ini cuma ~80% lebar
  layar (sisa dari panel merah 20%), bukan lebar viewport penuh.

**Revisi tambahan sama hari:** warna langit diganti dari gelap (malam) ke **biru muda** (gradasi
`#6fb8ea → #a8d8f5 → #dcf0fb`) supaya siluet gedung & jendela yang menyala lebih terlihat kontras.
Warna gedung disesuaikan (depan lebih gelap `#1c2740` untuk kontras, belakang jadi abu-kebiruan
`#6f8fae` untuk kesan kabut jarak jauh khas siang hari).

Tidak perlu `drizzle-kit push` (tidak menyentuh database) — cukup restart `npm run dev`.

## 30 Persiapan otomasi Get Approve/COUPA — keputusan arsitektur sebelum mulai coding (18 September 2026)

Sebelum otomasi browser ke Get Approve/COUPA mulai dibangun, dibahas dulu apa saja yang perlu
disiapkan. Keputusan yang dikonfirmasi pengguna:

**1. Nomor invoice TIDAK bisa digenerate otomatis oleh aplikasi ini** — nomor invoice satu urutan
bersama untuk SEMUA customer IDStar (bukan cuma XL), jadi sumber kebenarannya ada di luar aplikasi
ini. `invoice_counter` (skema bagian 23/24, belum dipakai di kode) TIDAK JADI dipakai untuk generate
otomatis — diganti jadi **field input manual**: Input Data mengetik nomor invoice yang sudah didapat
dari sistem penomoran pusat perusahaan, aplikasi cuma menyimpan & (opsional) validasi formatnya.
Field UI-nya belum dibangun — ini task berikutnya, kecil.

**2. Kredensial Get Approve/COUPA disimpan PER USER, bukan satu akun robot bersama.** Setiap
Input Data/Checker punya kolom kredensial (email+password Get Approve, email+password COUPA)
tersimpan terenkripsi di profil akun Invora-nya sendiri. Saat otomasi dijalankan, script login
sebagai user yang memicunya, pakai kredensial milik user itu. Kalau orangnya resign: Admin
menonaktifkan akun Invora-nya (fungsi Admin di halaman Akun & Akses jadi krusial di sini) —
kredensial lama otomatis tidak terpakai, Input Data pengganti tinggal isi kredensialnya sendiri.
Ini konsisten dengan keputusan awal (bagian 22): "yang berwenang menyambungkan ke Get Approve/COUPA:
Input Data & Checker."

**3. Kunci enkripsi kredensial** — disimpan terpisah dari database (di sisi server aplikasi, bukan
di tabel manapun), supaya kalau database bocor, kunci untuk membuka kredensial tidak ikut bocor.
Perlu rencana backup kunci ini (kalau hilang, semua kredensial tersimpan tidak bisa dibaca lagi dan
harus diisi ulang oleh tiap user) — detail teknisnya disiapkan saat implementasi, tidak perlu
tindakan dari pengguna.

**4. Cek akses jaringan server ke Get Approve/COUPA** — TIDAK BISA dites dari lingkungan
pengembangan (baik cloud sandbox Claude maupun `device_bash` di Mac pengguna — dua-duanya sudah
dicoba dan terbukti dibatasi jaringannya, jadi tidak mewakili server produksi). Begitu server
hosting produksi ditentukan, tim IT/hosting perlu menjalankan dari server itu:
`curl -I https://getapprove.xlsmart.co.id` dan `curl -I https://supplier.coupahost.com` — respons
HTTP apa pun berarti tidak diblokir; timeout/connection refused berarti diblokir dan perlu dibuka.
Ini prasyarat WAJIB sebelum otomasi bisa dites di lingkungan nyata.

**5. Batas otomatis vs manual dikonfirmasi ulang:** Approval Matrix di Get Approve tetap manual
(sesuai bagian 22). Tidak ada verifikasi 2 langkah (2FA) di Get Approve maupun COUPA — tapi
eksekusi otomasi TETAP dipicu manual oleh Input Data/Checker yang sedang login di Invora (klik
tombol "mulai otomasi"), BUKAN dijadwalkan/berjalan sendiri tanpa pengawasan (bukan cron job).
Selalu ada manusia yang mengawasi tiap kali proses masuk ke Get Approve/COUPA berjalan.

**Prasyarat yang masih menghambat mulai coding otomasi (belum ada dari pengguna):**
- Field nomor invoice manual — task kecil, bisa dikerjakan kapan saja (belum dikerjakan).
- Konfirmasi server hosting produksi + hasil tes `curl` di atas.
- Kredensial Get Approve/COUPA sungguhan (minimal 1 akun uji) untuk mulai development/testing
  otomasi — idealnya di lingkungan sandbox/staging supaya uji coba pertama tidak langsung kena
  sistem produksi XL.

## 31 Nomor invoice jadi input manual (tabel invoiceCounter dihapus) (18 September 2026)

Menindaklanjuti keputusan bagian 30 poin 1. Dibangun:
- **Skema:** tabel `invoiceCounter` (dibuat di bagian 23/24, tidak pernah dipakai di kode manapun)
  **DIHAPUS** dari `src/db/schema.ts`. Field baru `pengajuan.nomorInvoice` (text, manual, nullable).
- `PATCH /api/pengajuan/[id]/status-proses` — diperluas menerima `nomorInvoice` (teks bebas, di-trim,
  string kosong disimpan sebagai null), terpisah dari validasi field tanggal yang sudah ada.
- UI: field teks "Nomor Invoice" ditambahkan di kartu "Status Proses CAC -> Invoice"
  (`src/app/pengajuan/[id]/status-proses-form.tsx`), dengan keterangan bahwa ini input manual karena
  penomoran satu urutan bersama semua customer IDStar. Nomor yang tersimpan juga ditampilkan di baris
  ringkasan status proses pada detail pengajuan.

**Perlu `npx drizzle-kit push`** — ada perubahan skema (kolom baru `nomor_invoice`, tabel
`invoice_counter` dihapus).

## 32 Rencana hosting produksi — otomasi Get Approve/COUPA TANPA perlu IT internal (18 September 2026)

Pengguna belum bisa menghubungi tim IT untuk konfirmasi akses jaringan server (bagian 30 poin 4), dan
menanyakan apakah otomasi tetap bisa jalan tanpa campur tangan IT — penting karena proyek ini akan
dipresentasikan sebagai alat bantu tim finance.

**Jawaban: BISA**, dengan syarat aplikasi di-hosting di **platform cloud eksternal** (Vercel, Railway,
Render, VPS, dsb) — BUKAN di server internal IDStar. Server cloud seperti ini punya akses internet
keluar yang biasanya tidak dibatasi kebijakan firewall korporat (beda dari server internal
perusahaan), jadi kemungkinan besar tidak diblokir mengakses `getapprove.xlsmart.co.id` maupun
`supplier.coupahost.com` tanpa perlu IT membuka apa pun. Ini juga konsisten dengan keputusan
sebelumnya memakai Supabase (database cloud) — bukan server database internal — yang juga tidak
memerlukan IT.

**Risiko teknis yang perlu diantisipasi sebelum deploy ke hosting cloud (BUKAN soal IT, soal
arsitektur penyimpanan file):**
- Semua fitur upload di aplikasi ini (dokumen CAC/BAST, lampiran, PO asli, timesheet) saat ini
  menyimpan file ke folder lokal (`uploads/`) di server. Banyak platform cloud modern (terutama yang
  serverless seperti Vercel) punya filesystem yang TIDAK permanen — file yang diunggah bisa hilang
  saat aplikasi di-redeploy/restart. **Ini harus diselesaikan sebelum go-live**: pindahkan
  penyimpanan file ke object storage cloud (misalnya Supabase Storage, karena sudah pakai Supabase
  untuk database — jadi tidak perlu tambah vendor baru). Belum dikerjakan.
- Perlu ada yang punya wewenang mendaftar & bayar layanan hosting (biaya kecil, bukan keputusan
  teknis IT, tapi tetap perlu persetujuan — mirip Supabase).
- Kalau IDStar punya kebijakan wajib semua aplikasi bisnis lewat infrastruktur yang disetujui IT
  (alasan kepatuhan/organisasi, bukan teknis), itu di luar kendali teknis dan tetap perlu dicek
  belakangan — tapi secara TEKNIS, tidak ada keharusan.
- Domain custom (misal `invora.idstar.group`) itu OPSIONAL dan baru perlu IT (untuk atur DNS) —
  tanpa itu aplikasi tetap bisa jalan penuh di subdomain bawaan platform hosting (misal
  `invora.vercel.app`).

**Belum diputuskan:** platform hosting cloud mana yang dipakai — jadi task berikutnya kalau mau
lanjut ke tahap deploy produksi.

---

## Bagian 33 — Form GR Request otomatis (generate Excel dari data pengajuan)

Sebelum proses GR (Good Receipt) dijalankan XL, IDStar wajib mengajukan **request GR ke Get
Approve** dengan melampirkan form Excel "Good Receipt Request" berisi data PO per baris (line item),
qty, harga, dan persentase nilai yang diajukan untuk GR. Contoh file referensi dari user: 3 sheet
("Excelsheet for Vendor", "SOW", "COVER") — **hanya sheet "Excelsheet for Vendor" yang digenerate
otomatis oleh Invora** (SOW = klasifikasi aset, COVER = surat konfirmasi closing, di luar cakupan
ini).

**Temuan penting:** PO ke XL selalu terdiri dari beberapa **PO Line** (per role/jenis layanan, cth
Line 1 "SVC | FrontEnd", Line 2 "SVC | Tester"), masing-masing dengan qty & harga satuan sendiri —
bukan satu nilai bundel seperti asumsi awal. Ini butuh perubahan struktur data.

**Perubahan skema:**
- `po.tanggalPo` (opsional) — tanggal PO, diisi di halaman Edit PO.
- Tabel baru `po_line_item` (poId, nomorLine, shortText, qty, hargaSatuan) — dikelola di halaman
  Edit PO, bagian "PO Line Item" (tambah/hapus baris).
- `pemetaan_personel_po.poLineItemId` (opsional) — saat memetakan personel ke PO (Data Referensi >
  Pemetaan), Petugas juga memilih PO Line tempat billing personel itu dihitung.
- `pengajuan_detail.poLineItemId` — snapshot otomatis dari pemetaan di atas, saat pengajuan dibuat.

**Cara kerja generate:** di halaman detail pengajuan (kartu Status Proses), tombol "Unduh GR Request
(Excel)" memanggil `GET /api/pengajuan/[id]/gr-request`. Untuk setiap PO Line milik PO tersebut:
PO Qty/Price/PO Value diambil dari `po_line_item`; **Value of Proposed GR** = jumlah `hasilHitung`
personel di pengajuan ini yang poLineItemId-nya cocok dengan line tersebut; **% Proposed GR** =
Value of Proposed GR dibagi PO Value line itu. Line tanpa personel di pengajuan ini tetap muncul di
file (sesuai contoh asli) tapi kolom %/Value dikosongkan. "Date approved CAC" = tanggalCacApproved.
"Proposed Period for GR" = tanggalRequestGr (atau tanggal hari ini kalau belum diisi). Field yang
menurut instruksi form XL "can be left blank" (PO Type, WBS Element, GR Number, GR Posting Date,
dst.) sengaja tidak diisi — itu wewenang XL.

**Library:** `exceljs` (baru ditambahkan) — dipakai karena `pdf-lib` tidak bisa menulis format
`.xlsx` asli; file dibangun terprogram (bukan dari template biner) supaya struktur & rumus persis
mengikuti kolom form asli XL.

**Peringatan otomatis** ditampilkan (lewat header response) kalau: ada personel di pengajuan belum
dipetakan ke PO Line, PO Date kosong, tanggal CAC approved kosong, atau tidak ada baris dengan
%/Value terisi sama sekali.

**Belum dikerjakan / batasan:** sheet SOW dan COVER tidak digenerate (tetap manual di luar aplikasi
kalau dibutuhkan); PO Line Item harus diisi manual sekali per PO sebelum fitur ini bisa dipakai untuk
PO tersebut — kalau kosong, generate akan ditolak dengan pesan error yang mengarahkan ke halaman Edit
PO.

---

## Bagian 34 — Alur bolak-balik GR Request dengan tim XL (generate → upload balikan → gabung → cek manual)

Menyempurnakan bagian 33 setelah klarifikasi user: seluruh file (Vendor + SOW + COVER) memang harus
diajukan ke Get Approve, tapi **sheet SOW (dan COVER) diisi oleh tim XL sendiri**, bukan IDStar. Jadi
alurnya bukan sekali generate-lalu-submit, tapi 4 langkah dengan tim XL di tengah:

1. **Generate** — Invora buat sheet "Excelsheet for Vendor" dari data pengajuan, disimpan otomatis
   (tabel baru `gr_request`) dan bisa diunduh berulang kali (isinya selalu mengikuti data terbaru).
2. **Kirim ke XL** (di luar aplikasi, lewat email/WA seperti biasa) — tim XL isi sheet SOW & COVER di
   file yang sama, kirim balik.
3. **Unggah balikan** — Input Data/Checker unggah file balikan itu di Invora.
4. **Gabungkan otomatis** — Invora buka file balikan tsb, **menyegarkan ulang** sheet "Excelsheet for
   Vendor" di dalamnya memakai data pengajuan terkini (jaga-jaga kalau ada perubahan sejak file
   dikirim), sheet SOW/COVER isian XL dibiarkan apa adanya. Hasilnya 1 file utuh siap diajukan.
5. **Konfirmasi cek manual** — Checker menandai file gabungan sudah dicek (tercatat siapa & kapan,
   boleh tambah catatan) sebelum lanjut ke tahap submit invoice. Ini TIDAK memblokir langkah
   berikutnya secara otomatis (belum ada gate/paksaan) — sifatnya pencatatan untuk audit, sesuai
   permintaan user ("perlu konfirmasi tercatat, bukan sekadar informal").

**Skema baru:** tabel `gr_request` (1 baris per pengajuan) — menyimpan path/nama file di tiap
langkah (generate, balikan XL, gabungan), siapa yang unggah balikan, dan siapa+kapan yang konfirmasi
cek. Mengunggah balikan baru otomatis mengosongkan status gabungan & cek lama (supaya tidak ada yang
salah kira file lama masih berlaku).

**UI:** kartu baru "GR Request (Excel) — untuk Get Approve" di halaman detail pengajuan, menggantikan
tombol unduh tunggal dari bagian 33. Menampilkan status tiap langkah + tombol aksinya. Konfirmasi
"Sudah Dicek" hanya bisa ditekan role **Checker** (pemisahan tugas dari Petugas yang menyiapkan,
konsisten dengan pola checker-review yang sudah ada).

**Perlu `npx drizzle-kit push`** sebelum tabel `gr_request` bisa dipakai.

**Update — validasi wajib (permintaan user setelah bagian 34 ditulis):** field Nomor Invoice di kartu
Status Proses sekarang TERKUNCI (disabled di form + ditolak di API) selama `gr_request.dicekPada`
pengajuan itu masih kosong. Jadi langkah 5 (konfirmasi Checker) sekarang JADI GATE WAJIB, bukan
sekadar catatan audit seperti versi awal bagian 34 — Input Data tidak bisa mengisi nomor invoice
sebelum Checker menandai GR Request sudah dicek. Pesan error/label di form menjelaskan alasannya.
Field lain di Status Proses (tanggal submit/approve invoice) SENGAJA TIDAK digembok — keputusan
eksplisit user, tanggal submit/approve invoice tetap bebas diisi kapan pun tanpa syarat GR Request
dicek.

---

## Bagian 35 — Alokasi lintas-PO / "cross PO" (MVP 2) (21 September 2026)

Kasus: saldo sebuah PO habis di tengah tagihan bulan berjalan. Contoh dari user: sisa saldo PO 10 juta,
sementara ratecard yang harus ditagihkan bulan itu 15 juta — maka 10 juta ditagihkan ke PO ini, dan
sisa 5 juta ditagihkan lewat pengajuan terpisah ke PO berikutnya (bisa berantai ke PO ketiga dst kalau
masih kurang).

**Keputusan desain — tanpa restrukturisasi besar:** `pengajuan` TETAP 1 PO per record (tidak diubah
jadi bisa multi-PO), supaya CAC/BAST, GR Request, dan Summary PO — yang semuanya asumsi 1 PO per
pengajuan — tidak perlu ditulis ulang. Cross-PO diwujudkan sebagai **beberapa pengajuan terpisah**
(satu per PO) untuk personel+periode yang sama, di mana `pengajuanDetail.hasilHitung` menyimpan porsi
(bukan selalu nilai penuh). Semua kode konsumen hilir memakai `hasilHitung` apa adanya — otomatis benar
baik untuk tagihan penuh maupun sebagian, tanpa perlu diubah.

**Cara kerja (fungsi `terapkanAlokasiLintasPo` di `hitung-pengajuan.ts`):**
1. Untuk tiap personel di pratinjau, cari total yang SUDAH ditagihkan ke personel itu di periode yang
   sama tapi PO lain (`pengajuanDetail` join `pengajuan`, filter periode sama + PO beda).
2. `sisaPerluDitagih` = nilai penuh bulan itu − yang sudah ditagihkan di PO lain.
3. Jalankan saldo PO ini (`po.saldoSebelumPpn`) sebagai kolam berjalan, dibagi ke personel-personel
   secara berurutan: `akanDitagihkan` = min(sisaPerluDitagih, sisa saldo berjalan). Kalau sisa saldo
   sudah 0, personel berikutnya `akanDitagihkan` = 0 (tidak bisa dipilih).
4. Personel yang `sisaPerluDitagih` sudah 0 (sudah lunas ditagihkan penuh di PO lain) ditandai
   `sudahLunasBulanIni` — tidak bisa dipilih lagi, supaya tidak dobel tagih.

**Pemilihan PO tujuan pemecahan — manual oleh Petugas.** Bukan otomatis dipilihkan sistem: Petugas yang
melihat sisa belum tertagih lalu membuat pengajuan baru secara manual di PO lain yang sesuai. Bisa
berantai ke PO ketiga dst kalau PO kedua juga tidak cukup — mekanismenya sama persis (dedup lintas
semua PO di periode yang sama, bukan cuma 2 PO).

**Approval pemecahan tagihan — di luar aplikasi.** Sesuai pola pengajuan yang sudah ada, approval User
XL untuk pemecahan ke PO lain terjadi lewat email/WhatsApp seperti biasa, BUKAN alur approval hidup di
Invora. Invora hanya mencatat hasilnya secara internal (opsional): 3 field baru di `pengajuan` —
`approvalAlokasiUserXlPemberi`, `approvalAlokasiTanggal`, `approvalAlokasiReferensi` — diisi Petugas
kalau relevan untuk pengajuan itu, ditampilkan di halaman detail.

**Skema baru:**
- `pengajuan.approvalAlokasiUserXlPemberi` / `.approvalAlokasiTanggal` / `.approvalAlokasiReferensi` —
  catatan approval eksternal, semuanya opsional (nullable).
- `pengajuanDetail.nilaiPenuh` — snapshot nilai tagihan PENUH personel itu untuk periode itu (sebelum
  dikurangi porsi yang sudah ditagihkan di PO lain), untuk jejak audit. `hasilHitung` tetap kolom yang
  dipakai semua kode lain, isinya bisa lebih kecil dari `nilaiPenuh` kalau dipecah. Baris lama (sebelum
  bagian 35) punya `nilaiPenuh` kosong (null) — untuk baris itu `hasilHitung` = nilai penuh (belum
  pernah ada alokasi lintas-PO saat itu).

**Perubahan alur pakai:** halaman "Buat Pengajuan" dan "Edit Rincian" sekarang menampilkan kolom Nilai
Penuh / Sudah di PO Lain / Akan Ditagihkan (PO ini) per personel. Personel yang sudah lunas di PO lain
atau yang saldo PO ini sudah habis untuknya otomatis tidak bisa dicentang. Kalau ada personel yang
tagihannya dipecah, muncul catatan opsional untuk isi approval eksternal (User XL, tanggal, referensi).
Validasi di server (route POST/PATCH pengajuan) menghitung ulang alokasi dari nol — tidak percaya angka
kiriman client — dan menolak simpan kalau ada personel terpilih yang ternyata sudah lunas atau saldo PO
sudah habis untuknya (Petugas diminta hapus centang personel itu).

**Perlu `npx drizzle-kit push`** sebelum kolom baru (`pengajuan.approvalAlokasi*`,
`pengajuanDetail.nilaiPenuh`) bisa dipakai.

---

## Bagian 36 — Riwayat Versi GR Request (penyempurnaan MVP 3) (22 September 2026)

Menutup salah satu dari 2 sisa gap kecil MVP 3 (lihat `ROADMAP_MVP_v2.0.md`): spec asli minta "riwayat versi;
perubahan substansi SOW diperiksa terhadap cakupan approval XL", tapi tabel `gr_request` (bagian 33-34) cuma
menyimpan status TERBARU per pengajuan — tiap kali generate/unggah balikan/gabung ulang, versi sebelumnya
tertimpa tanpa jejak.

**Perubahan:**
- Tabel baru `gr_request_riwayat` — APPEND-ONLY, 1 baris per kejadian di tiap langkah (generate/balikan/
  gabung/cek), simpan nama file, path file (null untuk langkah "cek"), waktu, siapa yang melakukan, dan
  catatan (dipakai langkah "cek" untuk menyimpan catatanCek saat itu). `gr_request` (tabel lama) TIDAK
  diubah — tetap dipakai apa adanya untuk status TERBARU & gate Nomor Invoice (bagian 34), supaya tidak ada
  perubahan perilaku di alur yang sudah berjalan.
- File balikan XL & file gabungan yang lama **tidak lagi dihapus otomatis** saat ada balikan/gabungan baru
  (sebelumnya dihapus diam-diam) — sekarang tetap tersimpan di server supaya bisa diunduh lagi lewat Riwayat
  Versi kalau perlu dibandingkan dengan versi terbaru.
- Endpoint baru `GET /api/pengajuan/[id]/gr-request/riwayat/[riwayatId]` untuk mengunduh salinan file versi
  lama tertentu (beda dari `.../gr-request/file/[jenis]` yang selalu ambil file TERBARU).
- UI: kartu GR Request di halaman detail pengajuan sekarang punya bagian tambahan "Riwayat Versi" di bawah
  4 langkah — tabel berisi langkah, nama file (atau catatan untuk langkah cek), waktu, siapa, dan tombol
  Unduh per baris (kalau ada file).

**Perlu `npx drizzle-kit push`** sebelum tabel `gr_request_riwayat` bisa dipakai.

---

## Bagian 37 — Koreksi label "belum divalidasi Administrator" di dokumen CAC/BAST (22 September 2026)

Saat uji data dummy, pengguna menemukan label di halaman cetak CAC/BAST: *"Template CAC/BAST resmi belum
divalidasi Administrator... (lihat BRD §Administrator: 'Satu template aktif per jenis CAC, BAST')."*
Pertanyaan pengguna tepat: *"kenapa masih perlu ada validasi dari administrator ya? bukannya administrator
hanya untuk akses saja?"*

**Ini memang keliru — dikoreksi.** Label itu peninggalan draf BRD awal, sebelum cakupan Administrator
ditegaskan di bagian 20-21 (Administrator HANYA akun & akses, tidak ada hubungan sama sekali dengan
finance/operasional/template dokumen). Tidak pernah ada fitur "validasi template oleh Administrator" yang
dibangun di aplikasi ini — label itu murni teks statis yang lupa diperbarui setelah keputusan bagian 20-21,
dan setelah bagian 25 (format PDF gabungan CAC/BAST 3 halaman) yang sudah dibangun mengikuti dokumen resmi
yang dikonfirmasi pengguna sendiri.

**Perubahan:** teks di 3 tempat (halaman cetak dokumen, kartu "Dokumen CAC/BAST" di detail pengajuan,
komentar kode terkait) diganti — tidak lagi menyebut "belum divalidasi Administrator". Alasan dokumen tetap
berstatus draf diluruskan jadi yang sebenarnya: bukan soal validasi template, tapi karena pengajuan RESMI ke
XL masih lewat Get Approve CAC / COUPA secara manual (otomasi ke sana belum dibangun, lihat bagian 22-23,
30, 32) — dokumen ini cuma bantuan pratinjau/cetak internal, template-nya sendiri sudah sesuai dokumen
resmi.

Tidak ada perubahan skema atau perilaku sistem — murni koreksi teks/dokumentasi, tidak perlu `drizzle-kit
push`.

---

## Bagian 38 — Impor massal PO dari CSV/Excel (28 September 2026)

Permintaan pengguna: *"untuk PO kasih satu button untuk bisa upload list dokumen PO sehingga tidak input
manual satu persatu, jadi selain ada button untuk bisa upload list PO, juga bisa isi manual."* Sudah
**dibangun dan lolos verifikasi tipe (`tsc --noEmit`) dan ESLint**, mengikuti pola yang sama dengan "Impor
dari Data Integral" di halaman Personel (bagian 26).

**Halaman PO/Item sekarang punya 2 cara isi data, berdampingan:**
1. **Impor Daftar PO (CSV/Excel)** — kartu baru di atas form manual, bisa dibuka/tutup. Terima file
   `.csv` atau `.xlsx`. Kolom yang dibaca (nama header fleksibel, tidak case-sensitive): **Nomor PO**,
   **Nama Proyek** (wajib), **Nilai Item** (wajib), Tahun, Nilai GR, Tanggal PO (opsional).
2. **Form manual** (tidak berubah) — tetap ada untuk tambah PO satu-satu seperti biasa.

**Aturan nomor PO duplikat (dikonfirmasi pengguna):** kalau Nomor PO di file SUDAH ada di database, data
proyek/tahun/nilai GR/tanggal PO-nya **diperbarui** dari file. Kalau **belum ada**, ditambah sebagai PO
baru (nilai item sekaligus jadi saldo awal, sama seperti tambah manual). **Satu pengecualian penting:**
`nilaiItem` dan `saldoSebelumPpn` PO yang SUDAH ADA **tidak pernah ditimpa** oleh impor — dua field itu
memang tidak bisa diubah lewat form Edit PO manual juga (saldo dirawat berjalan secara manual seiring
pemakaian), jadi menimpanya diam-diam dari file berisiko menghapus jejak saldo yang sudah terpakai
pengajuan yang sedang berjalan.

**Baris gagal dilaporkan, bukan menggagalkan seluruh impor** — tiap baris divalidasi sendiri-sendiri
(Nomor PO/Nama Proyek kosong, Nilai Item bukan angka valid, dst.); baris yang gagal dilewati dan
disebutkan di ringkasan hasil, baris yang valid tetap diproses.

**Skema:** tidak ada perubahan skema — tabel `po` dipakai apa adanya, jadi **tidak perlu `drizzle-kit
push`** untuk fitur ini.


---

## Bagian 39 — Perbaikan impor PO format tracker, dropdown pencarian + sortase, dan jejak sumber hitung timesheet (29 September 2026)

Empat perbaikan/penyempurnaan kecil dalam satu sesi, semua sudah **dibangun dan lolos verifikasi tipe
(`tsc --noEmit`)** — poin 3 (jejak sumber hitung) **belum aktif di database**, lihat catatan wajib di
bawah.

**1. Impor PO (bagian 38) sekarang kenal format tracker PO resmi perusahaan.** Pengguna mencoba impor
file tracker asli (kolom *No PO, Project Name, Year, Total, DPP, Total Consume, Outstanding, Date of
Issued, ...*) dan semua baris gagal. Dua penyebab, sudah diperbaiki di `src/lib/po-impor.ts`:
- **Baris kosong di atas header** — file tracker punya 2 baris kosong sebelum baris header sungguhan;
  importer sekarang mencari baris non-kosong pertama sebagai header, bukan selalu baris pertama.
- **Nama kolom tracker belum dikenali** — ditambahkan alias: *Project Name* → Nama Proyek, *Year* →
  Tahun, *DPP* → Nilai Item (fallback ke *Total* kalau DPP kosong, terjadi pada PO berstatus
  "Unutilized" yang belum ada nilai DPP-nya), *Total Consume* → Nilai GR, *Outstanding* → **Saldo
  Sebelum PPN** (field baru ditambahkan ke `BarisPoDiimpor`), *Date of Issued* → Tanggal PO.
- **Bug tambahan ditemukan & diperbaiki saat sesi ini juga:** `api/po/impor/route.ts` untuk PO baru
  selalu menulis `saldoSebelumPpn = nilaiItem` (penuh), **mengabaikan** kolom Outstanding yang sudah
  benar dibaca parser di atas — jadi PO yang sudah terpakai sebagian (mis. Outstanding jauh lebih kecil
  dari DPP) tetap tercatat seolah masih penuh saat diimpor. Sekarang PO baru pakai
  `saldoSebelumPpn = Outstanding` dari file kalau ada kolomnya, fallback ke nilaiItem penuh kalau tidak
  (format CSV sederhana, sesuai perilaku bagian 38 yang lama). **Aturan PO yang SUDAH ada di database
  tidak berubah** — nilaiItem & saldoSebelumPpn tetap tidak pernah ditimpa impor (lihat bagian 38).

**2. Dropdown pencarian nama (ComboSelect) + sortase tabel** — permintaan pengguna: daftar nama
Personel yang panjang susah dicari lewat dropdown native (scroll manual), dan tabel-tabel data susah
dicari urutannya.
- Komponen baru `src/components/combo-select.tsx` — dropdown dengan kolom cari di atas daftar opsi,
  filter langsung saat mengetik. Dipasang di field **Personel** pada form **Pemetaan Personel↔PO**,
  **Rate Card**, dan field **PO** pada **Buat Pengajuan** (yang terakhir juga diurutkan dari nomor PO
  terkecil, pakai `localeCompare(..., { numeric: true })`).
- Tabel **List PO**, **List Personel**, **Rate Card**, dan **Summary PO** sekarang punya header yang
  bisa diklik untuk urutkan (▲/▼), lewat komponen tabel client-side baru per halaman (`po-table.tsx`,
  `personel-table.tsx`, `rate-card-table.tsx`, `summary-po-table.tsx`). Tidak ada perubahan skema.

**3. Sumber hitung (timesheet vs kalender) sekarang tersimpan permanen di `pengajuan_detail`.**
Ditemukan lewat laporan pengguna: sudah upload timesheet, tapi halaman detail Pengajuan tetap
menunjukkan hasil dari kalender kerja. Akar masalahnya BUKAN salah hitung — `hitungSemuaPersonelUntukPo`
di `lib/hitung-pengajuan.ts` sudah benar memprioritaskan timesheet kalau ada — tapi field `sumberHitung`
hasil hitung itu **cuma dipakai sesaat di layar pratinjau "Buat Pengajuan"** (badge Timesheet/Kalender),
lalu **tidak pernah disimpan** saat pengajuan di-submit. Begitu halaman detail dibuka lagi, tidak ada
cara tahu sumbernya apa.

- **Skema:** kolom baru `sumber_hitung` (text, not null, default `'kalender'`) di tabel
  `pengajuan_detail`.
- Disimpan saat pengajuan dibuat (`api/pengajuan/route.ts`) maupun direvisi (`api/pengajuan/[id]/route.ts`).
- Halaman detail Pengajuan (`/pengajuan/[id]`) sekarang menampilkan kolom **Sumber** (badge
  Timesheet/Kalender) di tabel rincian, sama seperti layar pratinjau.
- **Keterbatasan:** pengajuan yang SUDAH tersimpan sebelum kolom ini ada (termasuk semua data sampai
  28 September 2026) tidak bisa "diketahui ulang" sumbernya — informasinya memang sudah hilang sejak
  awal sebelum kolom ini dibuat, akan tampil default "Kalender" setelah migrasi meski aslinya mungkin
  dari timesheet.

**⚠️ WAJIB `drizzle-kit push` sebelum poin 3 di atas bisa dipakai** — beda dari poin 1-2 (tidak ada
perubahan skema), poin 3 menambah kolom baru. Sesi kerja ini **tidak bisa menjalankan migrasi sendiri**
(lingkungan kerja Claude tidak bisa menjangkau host database Supabase — DNS/koneksi diblokir di
sandboxnya), jadi kolom `sumber_hitung` **belum ada di database sungguhan** sampai pengguna menjalankan
`npx drizzle-kit push` di terminal sendiri. Sebelum itu dijalankan, submit pengajuan baru akan **error**
(kolom belum ada).

---

## Bagian 40 — Spesifikasi klien Non-XL (multi-klien, di luar CAC/COUPA): impor, penempatan, jenis invoice, dan BAST beda format (30 September 2026)

**BELUM DIBANGUN — ini catatan spesifikasi hasil diskusi**, sebelum pembangunan dimulai (pola yang sama
seperti bagian 22-23 dulu). Dipicu feedback pengguna setelah mencoba dummy MVP 1: *"Tgl bekerja talent
dimulai dari tgl SPK yg ada di invoice plan integral... Project ini diberinama Get Invoice [nama Project
claude.ai, BUKAN rename aplikasi — aplikasi tetap "Invora"]... penempatan... ada pilihan untuk pembuatan
invoice, kalau XL pakai CAC, non-XL tidak ada proses CAC tapi ada collect timesheet dan BAST... reminder
BAST... format BAST beda lagi..."* — lalu dikonfirmasi lewat 2 putaran tanya-jawab dan 1 contoh dokumen
BAST non-XL nyata (PDF, klien CIMB Niaga, personel "Alamsyah Putra", PO `CN/PO/20260918001002`).

**Konteks penting:** cakupan aplikasi ini sebelumnya **cuma untuk klien XL** (`PT XLSMART Telecom
Sejahtera. Tbk`) — nama folder proyek pun "Proses Invoicing di Customer XL". Bagian ini memperluas
cakupan ke **multi-klien**, karena data Integral (lihat contoh file "Invoice Plan From INTEGRALS Data —
August 2026.csv") ternyata berisi banyak klien lain: PT Bank CIMB Niaga, BCA Finance/Bank Digital BCA,
IFG Life/BPUI, BPJS Kesehatan, Tencent Cloud, Indosat, Indomarco, dll. — bukan cuma XL.

### 1. Impor Integral (bagian 26) — tanggal SPK jadi Berlaku Dari rate card

**Masalah yang mau dihindari:** `berlakuDari` rate card hasil Impor Integral saat ini dipakai tanggal
**hari file diimpor** (`hariIni`), bukan tanggal talent benar-benar mulai bekerja. Ini penyebab langsung
error "Tidak ada rate card aktif untuk periode ini" yang ditemukan pengguna 29 September 2026 (lihat
laporan bug sesi sebelumnya) — kalau talent diimpor belakangan tapi mau ditagih untuk periode sebelum
tanggal impor, rate card-nya dianggap belum berlaku.

**Perbaikan:** kolom `spk_start_date` di file Integral (format `DD/MM/YYYY`, cth `01/08/2025`) dipakai
sebagai `berlakuDari` rate card — bukan `hariIni` lagi. Berlaku baik untuk personel baru maupun rate baru
personel lama (dua tempat di `impor-integral/route.ts` yang sekarang pakai `hariIni`).

### 2. Impor Integral — tangkap penempatan (`placement_name`) + auto-mapping ke PO lewat `po_number`

File Integral juga punya kolom `placement_name` (cth "IDS-CIMB Bintaro", "IDS-XL", "Bank Digital BCA -
Plaza Mutiara") dan `po_number` (cth "8000148729", "CN/PO/20260918001002") — satu baris = satu talent
ditempatkan di satu PO tertentu, bukan sekadar nama+rate seperti yang ditangkap sekarang.

**Perbaikan:**
- **Skema:** kolom baru `penempatan` (text, nullable) di tabel `personel` — disimpan buat referensi/
  ditampilkan, bukan dipakai untuk logika mapping.
- **Auto-mapping ke PO:** untuk tiap baris file, cari PO di database dengan `nomorPo = po_number`. Kalau
  ketemu **dan** belum ada baris `pemetaan_personel_po` aktif untuk kombinasi personel+PO itu, buat
  otomatis (`berlakuDari = spk_start_date`, `poLineItemId = null`). Kalau nomor PO di file **belum ada**
  di database (PO-nya belum diimpor/dibuat), **lewati mapping-nya saja** (bukan gagal total) — dicatat di
  ringkasan hasil impor sebagai "X baris tidak bisa di-mapping otomatis, PO belum terdaftar", supaya
  Petugas bisa petakan manual lewat halaman Pemetaan seperti biasa setelah PO-nya ditambahkan.
- Ini **tidak menggantikan** halaman Pemetaan Personel↔PO manual — cuma otomatisasi kasus normal (talent
  sudah punya PO yang jelas di data Integral), edit/tambah manual tetap bisa dipakai.

### 3. Klien per PO + deteksi otomatis jenis invoice (CAC vs Non-CAC)

**Keputusan pengguna:** deteksi otomatis dari nama klien, bukan pilihan manual.

**Skema:** kolom baru `klien` (text, notNull, default `""`) di tabel `po`. Field ini **terpisah dari**
`namaProyek` yang sudah ada (namaProyek tetap bebas teks sesuai penamaan di COUPA/tracker; `klien` khusus
buat menentukan alur proses). Diisi manual saat tambah/edit PO, dan lewat impor massal PO (bagian 38-39
— kalau file impor tracker punya kolom nama klien, tangkap juga; kalau tidak ada, kosong dulu, diisi
manual belakangan).

**Aturan deteksi (dipakai di banyak tempat — jadi satu fungsi util `apakahKlienXl(klien: string)`):**
klien mengandung teks "XLSMART" atau "XL Smart" (tidak case-sensitive, meniru kode placement Integral
`IDS-XL` yang sudah dipakai bagian 26) → **CAC** (proses XL, sama seperti sekarang — Get Approve CAC,
format BAST XL 3-halaman dari bagian 25). Selain itu → **Non-CAC**: skip proses Get Approve CAC, tapi
**tetap wajib** ada timesheet (sudah ada, bagian 26 — dipakai apa adanya) dan BAST (format baru, lihat
poin 5) sebelum invoice bisa dibuat.

**Dampak ke halaman Kelengkapan Dokumen (bagian 24):** checklist-nya perlu bercabang — PO ber-klien XL
tampil checklist CAC+BAST seperti sekarang; PO non-XL tampil checklist Timesheet+BAST tanpa item CAC.

### 4. Pola penagihan Non-CAC: CAMPURAN — bulanan ATAU per-tahap/milestone, tergantung kontrak

**Ini bagian paling besar dampaknya ke model data**, dikonfirmasi eksplisit oleh pengguna: klien Non-CAC
**tidak seragam** — sebagian tetap bulanan seperti pola XL sekarang (periode YYYY-MM + prorata hari
kerja), sebagian per-tahap/milestone dengan persentase penyelesaian (contoh nyata: BAST CIMB Niaga
"Tahap I (50%) sampai tanggal 17-September-2026", bukan "periode Agustus 2026").

**Konsekuensi desain (draf, PERLU DIKONFIRMASI SEBELUM CODING — lihat pertanyaan di bagian bawah dokumen
ini):** `pengajuan` sekarang cuma punya `periode` (text, format `YYYY-MM`, notNull). Kemungkinan besar
butuh field baru yang **opsional/bercabang**:
- Tambah kolom `jenisTagihan` (`"bulanan"` | `"tahap"`) di `po` (mengikuti kontrak, ditentukan sekali
  per PO, bukan per pengajuan) — konsisten dengan `klien`/`jenisInvoice` yang juga di level PO.
- Untuk PO `jenisTagihan = "tahap"`: `pengajuan.periode` tidak relevan lagi sebagai "bulan kalender" —
  perlu field pengganti/tambahan: nomor tahap (integer), persentase (decimal), tanggal selesai tahap
  (text tanggal) — TAPI perhitungan prorata hari kerja & rate card (`hitung-pengajuan.ts`) yang ada
  sekarang seluruhnya berbasis "hari kerja dalam periode kalender". Pola tahap/milestone kemungkinan
  butuh cara hitung BEDA TOTAL (bukan prorata harian, tapi nilai tetap × persentase tahap) — ini bukan
  sekadar tambah kolom, tapi cabang logika hitung baru.

### 5. Reminder BAST belum dibuat — badge di dalam aplikasi

**Keputusan pengguna:** cukup badge/notifikasi visual di halaman terkait (bukan email). Kalau invoice PO
(XL maupun non-XL) mau di-submit tapi dokumen BAST untuk pengajuan itu belum ada (dicek dari tabel
`dokumen` jenis BAST, atau tabel baru untuk BAST non-XL — lihat poin 5), tampilkan badge peringatan di
halaman detail Pengajuan dan/atau daftar Pengajuan. Tidak perlu jadwal/cron — cukup dihitung tiap halaman
dibuka (`SELECT` biasa, sama pola dengan checklist Kelengkapan Dokumen bagian 24).

### 6. Format BAST Non-XL — 1 halaman, per-personel, field manual

Dari contoh dokumen nyata (BAST CIMB Niaga, PDF terlampir) — **beda total** dari BAST XL 3-halaman
gabungan (bagian 25, per-PO bundling banyak personel dalam 1 dokumen):

- **1 halaman, per PERSONEL** (bukan per-PO/bundling) — beda dari BAST XL yang bundling semua personel
  di 1 PO dalam satu dokumen line-item.
- **Header:** logo klien (kiri) + logo IDstar (kanan) — logo klien **beda-beda per klien**, tidak ada di
  data sekarang, mungkin perlu field upload logo per klien atau field `klien` cukup teks tanpa logo
  dulu (versi awal tanpa logo, ditambah kalau perlu).
- **Judul:** "BERITA ACARA SERAH TERIMA" + nomor PO di bawahnya.
- **Paragraf pembuka:** tanggal (hari + tanggal lengkap), lalu 2 pihak:
  - **Pihak Pertama** (klien): Nama, Jabatan, "bertindak untuk dan atas nama [nama klien]"
  - **Pihak Kedua** (IDstar): Nama, Jabatan, "bertindak untuk dan atas nama PT. IDstar Cipta Teknologi"
  - **Keputusan pengguna: kedua field ini diisi MANUAL tiap generate BAST** — tidak disimpan sebagai
    data tetap per klien/PO. Artinya perlu 4 field input (nama+jabatan Pihak Pertama, nama+jabatan Pihak
    Kedua) di form generate BAST non-XL, mirip pola input manual approval alokasi lintas-PO (bagian 35).
  - **Kolom baru:** butuh field `namaKlienResmi` (nama badan hukum lengkap klien untuk teks kontrak,
    cth "PT. Bank CIMB Niaga Tbk" — beda dari `klien` di poin 2 yang dipakai buat deteksi CAC/non-CAC,
    kemungkinan sama isinya tapi perlu ditentukan apakah 1 field cukup atau perlu 2 field terpisah).
- **Tabel dokumen rujukan:** No, No PO, Nama/Kode Proyek — di contoh isinya "[kode internal] - [Posisi] -
  an. [Nama Personel]" (bukan daftar banyak baris seperti BAST XL, cuma 1 baris untuk 1 personel).
- **Badan:** "[Pihak Pertama] telah menyelesaikan pekerjaan **[Tahap/Periode]** sampai tanggal **[tanggal]**
  sudah selesai dilakukan." — teks "Tahap I (50%)" di contoh ini **bervariasi tergantung pola penagihan**
  (lihat poin 4 — kalau PO-nya bulanan, kemungkinan teksnya jadi "periode [bulan] [tahun]" bukan "Tahap
  I (50%)").
- **Penutup:** kalimat baku "Dokumen BAST ini merupakan dokumen kelengkapan dan syarat pembayaran untuk
  pihak KEDUA" + tanda tangan 2 kolom (Pihak Pertama | Pihak Kedua), masing-masing nama perusahaan di
  atas kolom, nama+jabatan penandatangan di bawah (kosong buat tanda tangan basah/materai, sama seperti
  BAST XL).

**Pertanyaan terbuka, PERLU DIJAWAB PENGGUNA sebelum bagian 4 & 6 mulai dibangun** (poin 1, 2, 3, 5 di
atas sudah cukup jelas untuk langsung dibangun):
1. Untuk PO `jenisTagihan = "tahap"` — perhitungan nilai tagihan per tahap itu manual diisi Petugas
   (nilai tetap per tahap, cth 50% dari nilai PO), atau ada rumus otomatis dari data yang sudah ada?
2. Apakah field `klien` (buat deteksi CAC/non-CAC otomatis) sama dengan `namaKlienResmi` (buat teks
   kontrak di BAST), atau memang perlu 2 field terpisah karena beda kebutuhan (satu buat matching logic,
   satu buat teks legal resmi)?
3. Logo klien di BAST non-XL — perlu, atau versi awal tanpa logo dulu (cukup nama klien sebagai teks)?

**Skema baru ringkasan (draf, belum final sampai pertanyaan di atas dijawab):**
- `personel.penempatan` (text, nullable)
- `po.klien` (text, notNull default `""`)
- `po.jenisTagihan` (text, notNull default `"bulanan"`) — `"bulanan"` | `"tahap"`
- Tabel/field baru untuk BAST non-XL (nama tabel & kolom lengkap menyusul setelah pertanyaan di atas
  dijawab) — kemungkinan `bast_non_xl` terpisah dari `dokumen` (yang sekarang khusus CAC/BAST XL),
  menyimpan: pengajuanId, namaPihakPertama, jabatanPihakPertama, namaPihakKedua, jabatanPihakKedua,
  teksTahapOrPeriode, tanggalSelesai, namaFileGenerate.

---

## Bagian 41 — Keputusan 3 pertanyaan terbuka Bagian 40 (30 September 2026) — BELUM DIBANGUN

Pengguna menjawab 3 pertanyaan terbuka yang tersisa dari Bagian 40, sehingga seluruh spesifikasi
scope Multi-Klien (Non-XL) sekarang **lengkap dan siap dibangun** (belum ada satu baris kode pun
ditulis untuk scope ini):

1. **Kalkulasi tagihan PO `jenisTagihan = "tahap"` (milestone %) — MANUAL oleh Petugas.**
   Tidak ada formula otomatis (nilai PO × persentase, dst.). Petugas mengetik langsung nilai tagihan
   untuk tahap tersebut saat membuat pengajuan (mis. "Tahap I (50%) = Rp 25.000.000"), sama seperti
   Petugas mengisi nominal manual di alur lain. Implikasi desain: form pengajuan untuk PO tipe "tahap"
   perlu input nilai manual + keterangan tahap (teks bebas, mis. "Tahap I", "Tahap II — 50%"), BUKAN
   field persentase yang dikalikan otomatis dari nilai PO. Ini menyederhanakan implementasi dibanding
   opsi otomatis — tidak perlu skema pembagian tahap per PO/kontrak.

2. **Field `klien` (deteksi CAC/non-CAC) = SATU FIELD, dipakai juga sebagai nama resmi di teks BAST.**
   Tidak ada field terpisah "nama klien resmi". Konsekuensi: nilai `po.klien` harus diisi dengan format
   resmi lengkap sejak awal (mis. "PT XLSMART Telecom Sejahtera Tbk", bukan cuma "XL"), karena field yang
   sama dipakai `apakahKlienXl()` (deteksi substring "XLSMART"/"XL Smart") DAN langsung disalin ke teks
   legal/kontrak BAST. Perlu dipastikan saat isi/impor data PO, nilai `klien` konsisten formatnya per
   klien (typo/variasi penulisan bisa bikin deteksi XL vs non-XL salah, atau nama di BAST tidak resmi).

3. **BAST Non-XL v1 — TEKS SAJA, tanpa logo klien.** Tidak perlu tempat penyimpanan logo per klien untuk
   sekarang. Format dokumen ikut spesifikasi teks yang sudah didesain dari contoh BAST CIMB Niaga di
   Bagian 40. Logo bisa ditambahkan belakangan sebagai peningkatan v2 kalau diperlukan.

**Sequencing pembangunan:** pengguna memilih **menunggu semua pertanyaan terjawab dulu** sebelum mulai
menulis kode apa pun untuk scope ini (bukan mulai duluan dari bagian yang sudah jelas). Dengan jawaban di
atas, seluruh scope Bagian 40 sekarang tidak punya lagi pertanyaan terbuka — pembangunan bisa dimulai
kapan saja pengguna memberi konfirmasi jalan.

**Urutan pembangunan yang disarankan (belum dieksekusi, menunggu konfirmasi pengguna):**
1. Impor Integral: pakai `spk_start_date` untuk rate card `berlakuDari` (perbaikan bug + fondasi) +
   capture `placement_name` ke `personel.penempatan` + auto-mapping `pemetaan_personel_po` via `po_number`.
2. Tambah kolom `po.klien` + `po.jenisTagihan` ke skema, fungsi `apakahKlienXl()`, dan wiring ke alur
   Kelengkapan Dokumen (CAC hanya untuk klien XL).
3. Form pengajuan untuk PO `jenisTagihan = "tahap"` — input manual nilai tagihan + keterangan tahap.
4. Badge reminder BAST di dalam aplikasi (item yang sudah jelas sejak Bagian 40, tidak berubah).
5. Generate BAST Non-XL (format teks, field Pihak Pertama/Kedua isi manual tiap kali) — dikerjakan
   terakhir karena paling bergantung ke semua keputusan di atas.

Setelah dibangun, tiap poin akan didokumentasikan lagi sebagai bagian tersendiri (menyusul pola bagian
24-26 dkk.) dan skema baru (`po.klien`, `po.jenisTagihan`, `personel.penempatan`) akan butuh
`drizzle-kit push` lagi oleh pengguna — akan diingatkan eksplisit saat itu tiba.

---

## Bagian 42 — Klarifikasi kritis: `client_name` vs `placement_name` di file Integral (30 September 2026) — BELUM DIBANGUN

Sebelum mulai membangun Bagian 40-41, pengguna meminta konfirmasi ulang makna "penempatan" — apakah itu
sama dengan nama klien yang dipakai untuk membedakan proses invoice XL vs non-XL. Setelah dicek langsung
ke file contoh yang diunggah pengguna (`Invoice_Plan_From_INTEGRALS_Data_-_August_2026.csv`), ditemukan
**dua kolom yang berbeda dan TIDAK boleh tertukar**:

| Kolom di file Integral | Contoh isi | Dipakai untuk |
| --- | --- | --- |
| `client_name` | "PT XLSMART Telecom Sejahtera. Tbk", "PT Bank CIMB Niaga Tbk", "PT. LG Sinarmas Technology Solutions" | **`po.klien`** — sumber tunggal deteksi `apakahKlienXl()` DAN teks nama resmi di BAST (sesuai keputusan Bagian 41 poin 2: satu field) |
| `placement_name` | "IDS-XL", "IDS-CIMB Bintaro", "IDS-CIMB Synergy Building", **"XLsmart Office"**, **"XLSmart Tower"** | **`personel.penempatan`** — cuma info lokasi/site kerja talent, TIDAK dipakai untuk deteksi klien |

**Bukti kenapa ini krusial (ditemukan langsung di data contoh):** ada baris dengan `client_name` =
"PT. LG Sinarmas Technology Solutions" tapi `placement_name` = "XLsmart Office"; dan `client_name` =
"Tencent Cloud International Pte. Ltd" dengan `placement_name` = "XLSmart Tower". Kedua klien ini
**bukan XL** (harus lewat proses non-XL, tanpa CAC) — tapi nama penempatannya mengandung kata "XL"
karena lokasi kantornya kebetulan di gedung XLSmart. **Kalau `apakahKlienXl()` salah membaca
`placement_name` alih-alih `client_name`, kedua klien ini akan salah terdeteksi sebagai klien XL** —
bug yang bisa lolos tanpa disadari karena kelihatan "masuk akal" dari nama lokasinya.

**Aturan final untuk implementasi (mengunci Bagian 40 poin 2 & 4):**
- Saat impor Integral: `client_name` → ditulis ke **`po.klien`** (dan/atau field klien di level yang
  relevan — PO atau pemetaan personel, tergantung struktur final), dipakai SATU-SATUNYA sumber untuk
  `apakahKlienXl()` dan teks resmi BAST.
- `placement_name` → ditulis ke **`personel.penempatan`**, murni informasi/referensi, **tidak pernah**
  dipakai untuk logika CAC/non-CAC atau BAST.
- `apakahKlienXl()` HARUS membaca dari `po.klien` (asal `client_name`), tidak boleh membaca dari
  `personel.penempatan` (asal `placement_name`) dengan alasan/cara apa pun.

Belum ada kode yang ditulis — ini murni klarifikasi/pengunci spesifikasi sebelum pembangunan Bagian 40-41
dimulai, supaya bug seperti contoh LG Sinarmas / Tencent Cloud di atas tidak lolos ke produksi.

---

## Bagian 43 — Impor Integral multi-klien + auto-mapping PO + deteksi XL/non-XL (30 September 2026) — SUDAH DIBANGUN, BELUM DIUJI, ⚠️ WAJIB `drizzle-kit push`

Bagian pertama dari scope Multi-Klien (Non-XL) yang sudah jelas (Bagian 40 poin 1-2-3-4) sudah dibangun
di kode, mengikuti aturan `client_name` vs `placement_name` yang dikunci di Bagian 42:

1. **Skema baru** (`src/db/schema.ts`): `personel.penempatan` (teks, lokasi/site kerja — dari
   `placement_name`), `po.klien` (teks, nama klien resmi — dari `client_name`, sumber tunggal deteksi
   XL/non-XL), `po.jenisTagihan` (teks, default `"bulanan"`, opsi `"tahap"`).
2. **`src/lib/klien.ts` (baru)** — fungsi `apakahKlienXl(namaKlien)` mendeteksi klien XL dari `po.klien`
   (substring "xlsmart"/"xl smart", case-insensitive). Sengaja HANYA menerima `po.klien`, tidak pernah
   `personel.penempatan` — dikomentari eksplisit di kode kenapa (kasus LG Sinarmas/Tencent Cloud, lihat
   Bagian 42).
3. **`src/app/api/data-referensi/personel/impor-integral/route.ts` — dirombak total:**
   - Filter `placement_name === "IDS-XL"` (khusus XL, dari bagian 26) **dihapus** — sekarang memproses
     SEMUA baris/klien di file Integral, bukan cuma XL.
   - `berlakuDari` rate card (baik personel baru maupun rate berubah) sekarang pakai **`spk_start_date`**
     dari file (diparse dari format `DD/MM/YYYY` ke `YYYY-MM-DD`), bukan tanggal hari impor — inilah
     perbaikan bug rate-card-tidak-kebaca (Bagian 40 poin 1) yang sekaligus jadi fondasi seluruh Bagian 43.
     Fallback ke hari ini kalau format tanggal di file tidak dikenali.
   - `placement_name` ikut disimpan ke `personel.penempatan` saat personel dibuat/diperbarui.
   - **Auto-mapping personel↔PO**: `po_number` di tiap baris dicocokkan ke `po.nomorPo` yang SUDAH ADA
     di sistem (PO diimpor terpisah lewat impor tracker PO, bagian 38-39) — TIDAK membuat PO baru. Kalau
     cocok dan belum ada pemetaan aktif untuk personel+PO itu, `pemetaan_personel_po` baru otomatis
     dibuat (`berlakuDari` = `spk_start_date`).
   - **`po.klien` otomatis terisi** dari `client_name` saat PO match ditemukan — HANYA kalau `po.klien`
     masih kosong (supaya tidak menimpa koreksi manual Petugas).
   - Kolom wajib di file sekarang: `name, rate_card, placement_name, client_name, spk_start_date,
     po_number` (sebelumnya cuma `name, rate_card, placement_name`).
   - Ringkasan hasil impor bertambah field: `penempatanDiperbarui`, `klienPoDiisi`, `pemetaanDibuat`.
4. **`src/app/data-referensi/personel/impor-integral-form.tsx`** — teks penjelasan & ringkasan hasil
   diperbarui mengikuti perubahan di atas (tidak lagi bilang "hanya IDS-XL").

**Sudah dicek:** `npx tsc --noEmit` di seluruh project — **tidak ada error**.

**⚠️ BELUM diuji end-to-end** (belum bisa dites di sesi ini — sandbox tidak bisa konek Supabase, lihat
catatan lama di bagian keamanan data) — **PENGGUNA WAJIB TEST manual** setelah `drizzle-kit push` jalan:
1. Jalankan `npx drizzle-kit push` di terminal lokal (kolom `penempatan`, `klien`, `jenis_tagihan` baru
   belum ada di database Supabase — akan error kalau dipakai sebelum ini dijalankan).
2. Coba impor ulang file Invoice Plan Integral (boleh file yang sama seperti contoh yang diunggah
   sebelumnya) dan cek: personel non-XL (mis. CIMB Niaga, BCA Finance) ikut masuk (sebelumnya diabaikan
   karena bukan IDS-XL); kolom `penempatan` di halaman Data Referensi > Personel terisi; kalau PO dengan
   nomor yang cocok sudah ada di sistem, cek `po.klien` ikut terisi otomatis dan tidak salah ketuker
   antara klien satu dengan lainnya.

**Belum dikerjakan (menyusul, bagian 40 poin 2 lanjutan + 5 + 6):** wiring `apakahKlienXl()` ke alur
Kelengkapan Dokumen (CAC hanya untuk klien XL), form input manual tagihan "tahap", badge reminder BAST,
generate BAST Non-XL.

---

## Bagian 44 — Wiring deteksi klien XL/Non-XL ke alur CAC & Kelengkapan Dokumen (30 September 2026) — SUDAH DIBANGUN, BELUM DIUJI

Lanjutan Bagian 43 — item 2 dari urutan pembangunan Multi-Klien (Non-XL). Menyambungkan `po.klien` +
`apakahKlienXl()` (yang sudah ada sejak Bagian 43) ke halaman detail pengajuan
(`src/app/pengajuan/[id]/page.tsx`):

1. **Badge klien** ditambah di subjudul halaman pengajuan: nama klien + badge "XL — proses CAC" atau
   "Non-XL — tanpa CAC", supaya Petugas/Checker langsung tahu alur mana yang berlaku tanpa harus buka
   Data Referensi PO.
2. **Bagian "Dokumen CAC/BAST"**: kalau klien XL, tombol "Buat CAC" dan "Buat BAST" tetap muncul
   berdua seperti sebelumnya. Kalau klien **Non-XL, tombol "Buat CAC" disembunyikan** — hanya tombol
   BAST yang tampil, dengan catatan bahwa format BAST khusus Non-XL menyusul di bagian terpisah
   (belum dibangun — masih pakai format sementara/format XL untuk sekarang).
3. **Checklist "Kelengkapan Dokumen"**: kalau klien XL, item pertama tetap "Dokumen CAC sudah/belum
   dibuat" seperti sebelumnya. Kalau **Non-XL, item itu diganti jadi "Timesheet sudah/belum jadi dasar
   hitung semua personel"** (dicek dari `pengajuan_detail.sumber_hitung` — semua baris personel di
   pengajuan itu harus `"timesheet"`, bukan `"kalender"`) — sesuai permintaan pengguna: "invoice non xl
   tidak ada proses cac, tp ada proses collect timesheet dan bast jg harus masuk pada saat provide
   invoice". Item "Dokumen BAST" tetap wajib untuk kedua jenis klien.

**Belum diubah/di luar scope wiring ini** (sengaja tidak disentuh, mengikuti Bagian 40 yang cuma
menyebut CAC vs timesheet+BAST, bukan GR Request): panel GR Request & Status Proses CAC→Invoice tetap
tampil sama untuk XL maupun Non-XL — kalau nanti ternyata alur GR Request juga perlu beda untuk Non-XL,
ini perlu diklarifikasi lagi ke pengguna.

**Sudah dicek:** `npx tsc --noEmit` — tidak ada error.

**⚠️ BELUM diuji** (sandbox tidak bisa konek Supabase) — perlu ditest pengguna: buka pengajuan dengan PO
yang `klien`-nya sudah terisi non-XL (hasil Bagian 43) dan pastikan tombol CAC hilang + checklist
timesheet muncul, sementara pengajuan PO klien XL tetap seperti biasa (CAC muncul, checklist CAC seperti
sebelumnya) — regresi nol untuk alur XL yang sudah ada adalah syarat wajib.

**Belum dikerjakan (menyusul):** form input manual tagihan "tahap" (poin 3 di urutan pembangunan), badge
reminder BAST (poin 4), generate BAST Non-XL format sendiri (poin 5).

---

## Bagian 45 — GR Request di-skip total untuk klien Non-XL (30 September 2026) — SUDAH DIBANGUN, BELUM DIUJI

Konfirmasi pengguna: panel **GR Request** (workbook 3 sheet Vendor+SOW+COVER, bagian 33) **hanya berlaku
untuk klien XL** — untuk klien Non-XL, bagian ini **di-skip total**, tidak ditampilkan sama sekali (bukan
cuma disembunyikan sebagian atau ditandai opsional).

**Perubahan:** `src/app/pengajuan/[id]/page.tsx` — kondisi render `<GrRequestPanel />` ditambah
`isKlienXl` (sebelumnya cuma `bisaKelengkapan`). Untuk pengajuan dengan `po.klien` terdeteksi Non-XL,
seluruh panel GR Request (form generate workbook, riwayat versi, status cek) tidak muncul di halaman
detail pengajuan.

**Sudah dicek:** `npx tsc --noEmit` — tidak ada error.

**⚠️ Catatan yang perlu diperhatikan pengguna (belum diubah, di luar instruksi eksplisit sesi ini):**
panel **"Status Proses CAC → Invoice"** (`FormStatusProses`) — yang tetap tampil untuk kedua jenis
klien — masih punya field **"Tanggal Request GR"** dan **"Tanggal GR Disetujui"**, yang secara logika
adalah bagian dari proses GR yang sekarang di-skip untuk Non-XL. Belum diubah karena instruksi pengguna
sejauh ini spesifik ke "bagian GR Request" (panel workbook), bukan field tanggal GR di form status
proses. Kalau untuk klien Non-XL field-field ini juga harus disembunyikan/tidak relevan, perlu
dikonfirmasi terpisah sebelum diubah — supaya tidak salah asumsi mengubah alur invoice XL yang sudah
berjalan.

**⚠️ BELUM diuji** (sandbox tidak bisa konek Supabase) — perlu ditest pengguna: pengajuan klien Non-XL
tidak lagi menampilkan panel GR Request sama sekali; pengajuan klien XL tetap menampilkan seperti biasa
(regresi nol).

**Update 30 September 2026:** pengguna memutuskan field "Tanggal Request GR"/"Tanggal GR Disetujui" di
panel Status Proses **dibiarkan tampil apa adanya** untuk kedua jenis klien, tidak perlu disembunyikan
untuk Non-XL sekarang. Tidak ada perubahan kode dari catatan di atas.

---

## Bagian 46 — `drizzle-kit push` untuk kolom multi-klien berhasil (30 September 2026)

Pengguna konfirmasi `npx drizzle-kit push` sudah dijalankan di terminal lokal — output: "Pulling schema
from database... ✓" dan "Changes applied ✓". Kolom `personel.penempatan`, `po.klien`, `po.jenis_tagihan`
(Bagian 43) sekarang resmi ada di database Supabase, siap dipakai.

**Checkpoint git:** commit `47abd38` ("Checkpoint awal...") dibuat SEBELUM push ini — jadi titik kembali
kode tetap valid kalau nanti perlu rollback skema, meskipun database sudah berubah (rollback skema DB itu
sendiri perlu langkah terpisah, commit ini cuma menjamin kode-nya).

**Langkah berikutnya:** pengguna perlu test manual (checklist di Bagian 43 & 44 & 45) sebelum lanjut ke
item 3 (form input manual tagihan "tahap").

---

## Bagian 47 — Kolom Penempatan & Klien belum tampil di tabel + reset data uji (30 September 2026)

**Bug ditemukan pengguna dari screenshot:** halaman Data Referensi > Personel tidak menampilkan kolom
"Penempatan" (padahal datanya sudah tersimpan sejak Bagian 43), dan halaman PO tidak menampilkan kolom
"Klien"/badge XL-Non-XL — keduanya cuma masalah tampilan (kolom di skema & data sudah benar, tabelnya
belum diupdate untuk menampilkan). **Sudah diperbaiki:**
- `src/app/data-referensi/personel/personel-table.tsx` — tambah kolom "Penempatan" (sortable).
- `src/app/data-referensi/po/po-table.tsx` — tambah kolom "Klien" (sortable) + badge "XL"/"Non-XL" pakai
  `apakahKlienXl()`.
- `npx tsc --noEmit` — tidak ada error.

**Rate Card yang di screenshot pengguna (personel "Budi Santoso (uji)", semua `berlakuDari` = tanggal
sama) adalah DATA LAMA** — dibuat sebelum Bagian 43 (masih pakai `hariIni`, bukan `spk_start_date`).
Bukan bug baru — memang belum bisa kelihatan bedanya sampai data lama dibersihkan dan diimpor ulang.

**Keputusan pengguna:** reset total data uji sebelum lanjut testing — personel, rate card, PO, pemetaan
personel-PO, pengajuan + seluruh turunannya (dokumen, GR Request, timesheet, konfirmasi, checker
review) dihapus. Akun login (`users`), `user_xl`, `kalender_kerja` TIDAK dihapus. Backup manual dilakukan
dulu sebelum hapus (permintaan pengguna, karena belum ada backup otomatis — lihat risiko di
`ROADMAP_MVP_v2.0.md`).

**Skrip baru: `scripts/hapus-data-uji.ts`** — hapus semua tabel transaksi/contoh sesuai urutan foreign
key yang benar (child ke parent). Defaultnya DRY RUN (cuma tampilkan jumlah baris, tidak menghapus apa
pun) kecuali dijalankan dengan flag `--yes`. Dijalankan pengguna sendiri di terminal lokal (sandbox
Claude tidak bisa konek Supabase).

---

## Bagian 48 — Kelola Data (hapus massal/manual), Download Rekon Invoice, sortase menyeluruh, impor User XL (30 September 2026) — SUDAH DIBANGUN, BELUM DIUJI

4 permintaan baru pengguna sebelum lanjut ke item 3 (form tagihan "tahap"). Keputusan yang dikonfirmasi
lewat pertanyaan klarifikasi: halaman Kelola Data bisa diakses **Petugas & Admin**; hapus manual pakai
**checkbox pilih banyak + "Hapus Terpilih"**; file rekon grain **per pengajuan/periode**; format **Excel
(.xlsx)**.

**1. Halaman "Kelola Data" (baru) — `src/app/kelola-data/`**
- Route MANDIRI (bukan di bawah `/data-referensi` atau `/admin`) — supaya admin bisa akses HALAMAN INI
  SAJA tanpa dibuka aksesnya ke seluruh Data Referensi, tetap konsisten dengan keputusan bagian 20
  ("Administrator hanya akses, tidak ada hubungannya dengan finance"). `wajibRole(["petugas", "admin"])`.
  Link ditambahkan di Dashboard untuk kedua role.
- 5 kategori "Hapus Semua" dengan urutan hapus aman terhadap foreign key: **Pengajuan** (+dokumen/GR
  Request/timesheet-review, aman berdiri sendiri), **Timesheet** (aman berdiri sendiri), **Personel+Rate
  Card+Pemetaan** (⚠️ turut mengosongkan rincian pengajuan yang memakai personel manapun — header
  pengajuan TIDAK ikut terhapus, cuma jadi kosong/Rp0 — didokumentasikan jelas di UI), **PO+Line
  Item+Pemetaan** (gagal dengan pesan jelas kalau masih ada Pengajuan yang memakainya — user diarahkan
  hapus kategori Pengajuan dulu), **RESET TOTAL** (butuh mengetik "HAPUS" dulu sebagai konfirmasi
  tambahan, kategori paling berbahaya).
- `POST /api/kelola-data` — body `{kategori}`, hapus sesuai urutan FK-safe (logika sama seperti
  `scripts/hapus-data-uji.ts` bagian 47), tercatat di audit log.
- Checkbox + tombol **"Hapus Terpilih"** (komponen baru `src/components/hapus-terpilih.tsx`, dipakai di
  tabel Personel/PO/Rate Card/Pemetaan) — untuk hapus banyak baris sekaligus kalau salah unggah, TANPA
  endpoint massal baru: memanggil endpoint DELETE per-baris yang SUDAH ADA satu-satu, jadi otomatis
  mewarisi pengecekan FK yang sudah ada (409 kalau masih dipakai) — baris yang gagal dilaporkan, yang
  berhasil tetap terhapus.

**2. Download Rekon Invoice (.xlsx) — `GET /api/rekon-invoice`**
- Tombol "⬇ Download Rekon Invoice (.xlsx)" di halaman Daftar Pengajuan.
- Grain: satu baris = satu personel + PO + PERIODE (dari `pengajuan_detail`), supaya status
  sudah/belum-diinvoice akurat per bulan.
- Kolom: Nama Talent, Nama Klien (`po.klien`), No PO, Periode, Rate Card (`nilaiRateDipakai` — snapshot,
  bukan rate aktif sekarang), Tgl Mulai SPK & Tgl Berakhir SPK (dicari dari `pemetaan_personel_po` yang
  aktif selama periode itu, fallback ke pemetaan terbaru kalau tidak ketemu yang persis aktif), Tgl
  Invoice (`tanggalSubmitInvoice`), No Invoice (`nomorInvoice`), dan kolom tambahan **Status** ("Sudah
  Diinvoice"/"Belum Diinvoice", turunan dari ada-tidaknya No Invoice) — supaya langsung bisa difilter di
  Excel untuk rekon. Role: petugas & checker.

**3. Sortase menyeluruh (celah yang belum tertutup dari bagian 39)**
- Halaman **Pemetaan Personel↔PO**: sebelumnya tabel statis tanpa sort — sekarang `pemetaan-table.tsx`
  (baru) sortable + checkbox, field PO di form pemetaan diganti jadi `ComboSelect` (sebelumnya `<select>`
  polos).
- Halaman **User XL**: sebelumnya tabel statis tanpa sort — sekarang `user-xl-table.tsx` (baru) sortable
  + checkbox.
- (Kolom Penempatan & Klien yang sempat kelupaan tampil di tabel Personel/PO sudah diperbaiki di bagian
  47 sebelumnya.)

**4. Impor massal User XL — `POST /api/user-xl/impor`**
- Form baru `FormImporUserXl` di halaman User XL — upload CSV kolom `nama` (wajib) + `kontak`/`email`/
  `telepon`/`no hp` (opsional, alias fleksibel). Dedupe per nama; nama baru ditambahkan, nama yang sudah
  ada kontaknya diperbarui kalau berbeda.

**Sudah dicek:** `npx tsc --noEmit` — tidak ada error di semua file baru/diubah.

**Catatan teknis (bukan bug baru dari sesi ini):** `npx eslint` menandai pola "Cannot create components
during render" (komponen `Th` dideklarasikan di dalam fungsi tabel) di SEMUA tabel sortable, termasuk
yang lama seperti `summary-po-table.tsx` (dari bagian 39, belum pernah diubah sesi ini) — jadi ini
kebiasaan pola lama di codebase, bukan sesuatu yang baru rusak. Tidak memengaruhi `tsc`/build, cuma lint
warning. Kalau mau dirapikan, ini pekerjaan terpisah yang menyentuh semua tabel sortable sekaligus.

**⚠️ BELUM diuji sama sekali** (sandbox tidak bisa konek Supabase) — semua fitur di bagian ini baru,
perlu ditest end-to-end oleh pengguna sebelum dipakai untuk data yang penting: terutama tombol "Hapus
Semua" per kategori dan "Hapus Terpilih" (disarankan test dengan data yang memang boleh hilang dulu,
JANGAN langsung dipakai di atas data yang masih dibutuhkan tanpa backup).

---

## Bagian 49 — Dashboard jadi sidebar "Daftar Isi" + kolom Penempatan di Rate Card (30 September 2026)

- **Dashboard** (`src/app/dashboard/page.tsx`) — grid kartu menu dipindah jadi sidebar kiri ("Daftar
  Isi", pola sama seperti sidebar Data Referensi/Admin/Kelola Data), permintaan pengguna. Kartu dengan
  deskripsi tetap ada di konten utama untuk konteks, sidebar untuk navigasi cepat.
- **Rate Card** — tambah kolom "Penempatan" (dari `personel.penempatan`) di tabel, supaya langsung
  kelihatan di mana talent ditempatkan tanpa harus buka halaman Personel terpisah.
- Pengguna sudah reset data lama lewat halaman Kelola Data (bagian 48) — dikonfirmasi tabel
  Personel/Rate Card kosong ("Belum ada Personel"). Reset pertama berhasil.

**Sudah dicek:** `npx tsc --noEmit` — tidak ada error.

**⚠️ BELUM diuji di browser** — perlu direfresh & dicek pengguna.

---

## Bagian 50 — Koreksi: Rate Card tampilkan "Klien" (bukan "Penempatan") (30 September 2026)

Koreksi dari pengguna: kolom yang diminta di Rate Card bukan "Penempatan" (itu alamat/site kerja) tapi
**Klien** (nama resmi klien, `po.klien`) — supaya langsung kelihatan talent ini ditagihkan ke klien mana.

**Perubahan:** `src/app/data-referensi/rate-card/page.tsx` — kolom "Penempatan" diganti "Klien", diambil
dari `pemetaan_personel_po` yang masih aktif (`berlaku_sampai IS NULL`) untuk personel itu, join ke
`po.klien`. Kalau satu personel punya lebih dari satu PO/klien aktif sekaligus (alokasi lintas-PO,
bagian 35), digabung dengan koma. Kalau personel belum ada pemetaan aktif ke PO manapun, tampil "-".

**Sudah dicek:** `npx tsc --noEmit` — tidak ada error.

**⚠️ BELUM diuji di browser.**

## Bagian 51 — Finalisasi kolom per halaman: Personel, Rate Card, Rekon Plan vs Actual (30 September 2026) — SUDAH DIBANGUN, BELUM DIUJI

Pengguna konfirmasi spesifikasi final kolom apa saja yang terisi dari impor Integral, per halaman:

1. **Personel**: hanya Nama Talent & Status. Kolom "Penempatan" **dihapus dari tampilan tabel**
   (datanya tetap tersimpan di `personel.penempatan`, cuma tidak lagi ditampilkan di Data Referensi →
   Personel, karena tidak diperlukan di halaman ini).
2. **Rate Card**: Nama Talent, **Nama Klien**, **No PO** (baru — terisi HANYA kalau PO sudah diimpor
   ke Data Referensi → PO, lihat catatan di bawah), Rate Card, Tgl Berlaku Dari, Tgl Berlaku Sampai.
3. **Rekon Plan vs Actual** (fitur "Download Rekon Invoice" dari Bagian 48): Nama Talent, Nama Klien,
   No PO, Periode/bulan kerja, Rate Card, No Invoice — sudah tercakup di export `.xlsx` yang ada
   (ditambah kolom pendukung: tgl SPK, tgl invoice, status). Kolom No Invoice/tgl invoice ini memang
   baru terisi setelah proses pengajuan sampai tahap invoice — sesuai desain awal, tidak ada perubahan.

**Perubahan kode:**
- `src/app/data-referensi/personel/personel-table.tsx` — kolom "Penempatan" dihapus dari tabel & sort.
- `src/app/data-referensi/rate-card/page.tsx` — tambah `noPoPerPersonel` (map personelId → daftar
  `po.nomorPo`, dari `pemetaan_personel_po` yang masih aktif, sama seperti map `klienPerPersonel`).
- `src/app/data-referensi/rate-card/rate-card-table.tsx` — tambah kolom "No PO" (sortable) setelah
  kolom "Klien".

**Penyebab kolom Klien/No PO kosong yang dilaporkan pengguna:** kolom ini butuh 2 langkah — (1) baris
PO dengan `nomorPo` yang cocok harus sudah ada di tabel `po` (via impor PO Tracker di Data Referensi →
PO), baru (2) pemetaan personel↔PO otomatis terbentuk saat impor Integral dan `po.klien` ikut terisi.
Kalau setelah reset data pengguna baru impor file Integral (Personel) tapi **belum** impor file PO
Tracker, kolom Klien & No PO di Rate Card akan tetap kosong walau Penempatan di Personel sudah benar
(karena Penempatan langsung dari `placement_name`, tidak butuh data PO). **Belum dikonfirmasi ke
pengguna apakah PO Tracker sudah diimpor** — kalau belum, itu langkah berikutnya sebelum data Rate
Card lengkap.

**Sudah dicek:** `npx tsc --noEmit -p tsconfig.json` — tidak ada error.

**✅ SUDAH diuji di browser oleh pengguna (30 September 2026) — dikonfirmasi OK.** PO Tracker sudah
diimpor, Integral diimpor ulang, dan kolom Klien + No PO di Rate Card sudah terisi dengan benar.
Personel & Rate Card sekarang menampilkan data sesuai spesifikasi final (Bagian 51).

**Status Supabase:** tidak ada perubahan skema (kolom tabel) di Bagian 51 — hanya query/tampilan di
halaman Personel & Rate Card, jadi **tidak perlu `drizzle-kit push`**. Skema database di Supabase masih
sama seperti setelah `drizzle-kit push` di Bagian 46 (kolom `personel.penempatan`, `po.klien`,
`po.jenis_tagihan`).

**⚠️ BELUM di-commit ke git** (bersama sisa perubahan Bagian 49-50 yang juga belum di-commit) —
dilanjutkan sesi berikutnya.

## Bagian 52 — Jeda sesi (30 September 2026)

Pengguna konfirmasi semua sudah OK untuk hari ini, dilanjutkan besok. Status Supabase: tidak ada
migrasi tertunda (lihat catatan Bagian 51 di atas — kolom database terakhir yang butuh
`drizzle-kit push` sudah dijalankan sukses di Bagian 46).

**Yang masih pending untuk sesi berikutnya:**
1. **Commit git** untuk perubahan Bagian 49-51 yang belum di-commit: sidebar dashboard "Daftar Isi",
   kolom Rate Card (Klien + No PO), kolom Personel (Penempatan dihapus dari tampilan).
2. Update `ROADMAP_MVP_v2.0.md` supaya mencerminkan progres Bagian 43-51 (baru konsisten sampai
   Bagian 41-43).
3. Lanjutkan urutan build utama dari Bagian 40 yang masih tertunda: item 3 (form input manual
   tagihan "tahap"), item 5/6 (badge reminder BAST, generate BAST Non-XL format teks).
4. Test end-to-end fitur Bagian 48 yang belum dicoba: Kelola Data (hapus massal/manual), download
   Rekon Invoice, impor User XL — baru dicek `tsc --noEmit`, belum dicoba langsung di browser.
5. Skrip diagnostik `scripts/cek-po.ts` masih ada di project (aman, read-only) — bisa dihapus kalau
   sudah tidak diperlukan, atau dibiarkan untuk cek cepat kapan pun.

## Bagian 53 — Form tagihan "tahap" (milestone) manual per personel (5 Oktober 2026) — SUDAH DIBANGUN, BELUM DIUJI, ⚠️ WAJIB `drizzle-kit push`

Melaksanakan keputusan Bagian 41 poin 1 (tahap = MANUAL oleh Petugas). Jawaban pengguna sesi ini:
nilai diisi **per personel**; field Jenis Tagihan + Klien **ditambahkan ke form PO**.

**Skema baru (butuh `npx drizzle-kit push`):** `pengajuan.keterangan_tahap` (text, nullable).
`pengajuan_detail.sumber_hitung` kini juga bernilai `"manual"` (kolom sudah ada, tidak perlu push).

**Alur:** PO `jenisTagihan = "tahap"` → di Buat Pengajuan, setelah pilih PO+periode, "Hitung Pratinjau"
menampilkan daftar personel terpetakan (rate card hanya acuan) + kolom input nominal per personel +
isian **Keterangan tahap** (mis. "Tahap I (50%)", wajib). Nominal kosong = personel tidak ditagih.
Server memvalidasi: angka valid >0, personel memang terpetakan, total ≤ `saldoSebelumPpn` PO.
Tidak ada prorata, tidak ada alokasi lintas-PO untuk tahap. Detail disimpan dengan hari kerja 0/0,
`sumberHitung="manual"`, `nilaiPenuh = hasilHitung = nominal`. Revisi (status perlu_revisi) juga didukung.

**Perubahan kode:** `schema.ts`; `lib/hitung-pengajuan.ts` (`daftarPersonelTahap`, `siapkanTagihanTahap`);
`api/pengajuan/route.ts` + `[id]/route.ts` + `preview/route.ts` (cabang tahap, preview kini
mengembalikan `{jenis, baris}`); komponen baru `components/input-tagihan-tahap.tsx`; `pengajuan/baru/form.tsx`;
`pengajuan/[id]/edit/{page,edit-form}.tsx`; detail pengajuan (badge "Manual (tahap)", hari "-", keterangan
tahap di subtitle); dokumen CAC page+PDF (hari "-" bila acuan 0); form tambah/edit PO + `api/po` (field
Klien & Jenis tagihan).

**Catatan/risiko:** (1) checklist Non-XL "Timesheet lengkap" memeriksa `sumberHitung === "timesheet"` —
untuk pengajuan tahap itu tidak pernah terpenuhi; perlu keputusan apakah tahap dikecualikan.
(2) Ditemukan: PATCH revisi pengajuan **bulanan** tidak menyalin `poLineItemId` ke rincian baru (bug lama,
belum diperbaiki). (3) Belum ada BAST Non-XL yang memakai `keteranganTahap`.

**Sudah dicek:** `npx tsc --noEmit` bersih. ⚠️ Belum diuji di browser, belum di-commit.
