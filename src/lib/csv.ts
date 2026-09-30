// Parser CSV minimal (tanpa dependency tambahan) — cukup untuk file export dari
// Google Sheets: mendukung field berisi koma/baris baru kalau dibungkus tanda
// kutip ganda, dan "" sebagai escape kutip literal di dalam field.
export function parseCsv(teks: string): string[][] {
  const baris: string[][] = [];
  let kolom: string[] = [];
  let field = "";
  let dalamKutip = false;
  // Normalisasi CRLF -> LF supaya tidak perlu ditangani terpisah.
  const s = teks.replace(/\r\n/g, "\n");

  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (dalamKutip) {
      if (c === '"') {
        if (s[i + 1] === '"') { field += '"'; i++; } else { dalamKutip = false; }
      } else {
        field += c;
      }
      continue;
    }
    if (c === '"') { dalamKutip = true; continue; }
    if (c === ",") { kolom.push(field); field = ""; continue; }
    if (c === "\n") { kolom.push(field); baris.push(kolom); kolom = []; field = ""; continue; }
    field += c;
  }
  // Baris terakhir (tanpa newline penutup).
  if (field !== "" || kolom.length > 0) { kolom.push(field); baris.push(kolom); }

  return baris.filter((b) => !(b.length === 1 && b[0] === ""));
}

// Ubah daftar baris CSV (baris pertama = header) jadi array objek, dipetakan
// lewat nama header persis (case-sensitive) — cocok untuk file yang diunduh
// langsung dari Google Sheets tanpa diedit ulang.
export function csvKeObjek(baris: string[][]): Record<string, string>[] {
  if (baris.length === 0) return [];
  const header = baris[0];
  return baris.slice(1).map((b) => {
    const obj: Record<string, string> = {};
    header.forEach((h, i) => { obj[h.trim()] = (b[i] ?? "").trim(); });
    return obj;
  });
}
