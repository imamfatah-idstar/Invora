// Deteksi klien XL vs non-XL (bagian 40-42) — dipakai untuk cabang alur CAC
// (khusus XL) vs collect timesheet+BAST tanpa CAC (non-XL), dan untuk
// menentukan format BAST yang dipakai.
//
// PENTING (bagian 42): fungsi ini HANYA boleh dipanggil dengan nilai `po.klien`
// (asal kolom "client_name" di file Invoice Plan Integral), TIDAK PERNAH
// dengan `personel.penempatan` (asal kolom "placement_name"). Ada klien
// non-XL dengan nama site/penempatan yang mengandung kata "XL" murni karena
// kebetulan lokasi kantornya — contoh nyata dari data Integral: klien
// "PT. LG Sinarmas Technology Solutions" berpenempatan di "XLsmart Office",
// dan klien "Tencent Cloud International Pte. Ltd" berpenempatan di
// "XLSmart Tower". Kalau fungsi ini dipanggil dengan placement_name, kedua
// klien itu akan salah terdeteksi sebagai klien XL.
export function apakahKlienXl(namaKlien: string | null | undefined): boolean {
  if (!namaKlien) return false;
  const bersih = namaKlien.trim().toLowerCase();
  return bersih.includes("xlsmart") || bersih.includes("xl smart");
}
