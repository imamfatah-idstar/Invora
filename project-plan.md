# Project Plan — Financial Review Dashboard (IDStar / Drife / StarTechX)

_Terakhir diupdate: 20 Agustus 2026_

## 1. Tujuan Project

Dashboard finance review multi-company untuk 3 entitas grup:
- **IDStar** (PT IDStar Cipta Teknologi) — key: `idstar`
- **Drife** (PT Drife Solusi Integrasi / DSI) — key: `drift`
- **StarTechX** (PT STARTECHX INTERNASIONAL / STI) — key: `starttech`

Mencakup 4 section: Summary Cash Flow, Accounts Payable (AP), Accounts Receivable (AR), Tax Planning. Dropdown pilih company, tombol "Lihat Detail" ke laporan keuangan resmi per company, live-sync ke Google Sheets.

## 2. Arsitektur

Ada **2 project Apps Script terpisah** — sumber kebingungan paling sering selama development:

| Project | Nama | Isi | Fungsi |
|---|---|---|---|
| **Backend** | "Idstar Finacial Review" | `Code.gs` (COMPANY_CONFIG, getDashboardData, buildCashflowModule, dst) | API data — baca semua sheet, kembalikan JSON |
| **Frontend** | "Finance Review Dashboard" | `Codefrontend.gs` (doGet 12 baris) + `Dashboard.html` | Tampilan dashboard — dipanggil user, embed ke Google Sites |

**PENTING:** Frontend punya `CONFIG.APPS_SCRIPT_URL` yang harus persis menunjuk ke URL exec backend yang aktif. Ini berulang kali balik ke URL lama setiap kali file di-paste ulang — kalau ada section yang "tiba-tiba kosong lagi" padahal sebelumnya sudah benar, **cek baris ini duluan** sebelum debug hal lain.

- Sumber data: spreadsheet **"Data Nitia dan Riri"** (Google Drive, folder MAGANG HUB), dibaca backend via `SpreadsheetApp.openById()` (bukan `getActiveSpreadsheet()` — itu gagal total kalau dipanggil sebagai Web App).
- Deploy Google Sites (embed via URL) untuk akses management, dipetakan ke subdomain `idstar.group`.

## 3. Status per Section (per 20 Agustus 2026)

| Section | Status | Catatan |
|---|---|---|
| Summary Cash Flow | ✅ Berfungsi | Kadang sempat kosong sesaat lalu normal lagi setelah refresh — kemungkinan beban baca sheet, bukan bug tetap |
| AP (Accounts Payable) | ✅ Berfungsi | Budget vs Actual cuma tampil di IDStar (data sudah konsolidasi Drife & StarTechX di situ) |
| AR (Accounts Receivable) | ✅ Berfungsi | Termasuk Collection Target/Actual per company, PO Unreleased pipeline (khusus IDStar tab terpisah) |
| Tax Planning | ✅ Berfungsi | Per company, dari sheet "Tax Planning" |
| Invoice Plan & TS Tracker | ✅ Berfungsi (versi dasar) | Baca sheet "Achievement", posisi kolom tetap (bukan cari nama header) |
| Kolom **PO Unreleased** di tabel Invoice Plan | ❌ **Belum berhasil** | Lihat bagian 5 di bawah |

## 4. Bug Besar yang Sudah Diperbaiki

1. `getActiveSpreadsheet()` → `openById()` — akar masalah dashboard sempat kosong total berhari-hari.
2. Nama tab yang berubah (STX→STI, "Inv Plan"→"Achievement", dst) — backend perlu daftar nama alternatif per sheet supaya tahan rename.
3. Banyak angka hardcode/placeholder di kode awal (Tax Planning, AP Cash Out, AR StarTechX Collection) — sudah diganti baca live dari sheet.
4. Detail link "Lihat Detail Laporan" sempat salah arah ke sheet data mentah, bukan laporan resmi per company — sudah diperbaiki + dikunci supaya tidak ketimpa data live lagi.
5. Logo perusahaan sempat bikin file terlalu besar untuk di-paste (>360KB) → dikompres jadi ~175KB.

## 5. Open Item — PO Unreleased Column (belum selesai)

**Goal:** tambah 1 kolom di tabel "Invoice Plan & Timesheet Progress Tracker" menunjukkan total Rate Card talent yang belum ada PO Number-nya, per klien — datanya sudah ditambahkan tim langsung di sheet "Achievement".

**Yang sudah dicoba:**
- Hitung dari sheet Rate Card terpisah (match nama klien) — gagal karena struktur data & timing.
- Baca langsung kolom "PO Unreleased" di sheet Achievement via pencarian nama header (bukan posisi tetap) — **datanya sudah dikonfirmasi benar sampai level JSON mentah**, tapi tetap gagal muncul di dashboard live tanpa alasan yang berhasil ditemukan.
- Setelah berkali-kali gagal, **kolom ini di-rollback** — tabel Invoice Plan sekarang balik ke versi stabil tanpa PO Unreleased.

**Kalau mau dicoba lagi:** mulai dari pendekatan baru (bukan header-search), dan pertimbangkan screen-record proses testing supaya bisa dilihat detik-demi-detik apa yang terjadi saat deploy — debugging lewat screenshot bolak-balik kurang efektif untuk kasus ini.

## 6. Checklist Sebelum Lapor "Masih Error"

1. Sudah **Deploy → Manage deployments → New version** (bukan cuma Ctrl+S) — di project yang **benar** (frontend vs backend)?
2. `APPS_SCRIPT_URL` di `Dashboard.html` masih menunjuk ke URL backend yang aktif?
3. Sudah **Refresh** di dashboard (bukan cuma reload browser)?
4. Kalau masih gagal: buka Console (F12) dan screenshot **Endpoint URL** yang tertulis di log "Fetching Live Data" — ini paling cepat mengonfirmasi backend mana yang sebenarnya dipanggil.

## 7. Kontak & Kolaborator

- Original developer dashboard: imam.fatah@idstar.group
- Data spreadsheet dikelola: nitia.cahyaningrum@idstar.group, rihhadatul.syam@idstar.group
- Project ini dikerjakan oleh Kalla (IDStar, finance/operations)
