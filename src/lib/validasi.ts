// Validasi teks angka desimal (untuk nilai uang). Sengaja TIDAK membulatkan —
// hanya memastikan formatnya benar-benar angka, sesuai aturan "jangan
// menetapkan pembulatan diam-diam".
export function angkaDesimalValid(nilai: unknown): nilai is string {
  if (typeof nilai !== "string") return false;
  return /^\d+(\.\d{1,2})?$/.test(nilai.trim()) && Number(nilai) >= 0;
}

// Validasi teks tanggal "YYYY-MM-DD" (dari <input type="date">). null/"" dianggap
// valid (artinya field dikosongkan).
export function tanggalValidAtauKosong(nilai: unknown): nilai is string | null {
  if (nilai === null || nilai === undefined || nilai === "") return true;
  if (typeof nilai !== "string") return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(nilai)) return false;
  const d = new Date(nilai + "T00:00:00Z");
  return !isNaN(d.getTime());
}
