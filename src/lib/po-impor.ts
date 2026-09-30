import ExcelJS from "exceljs";
import { parseCsv, csvKeObjek } from "@/lib/csv";
import { angkaDesimalValid, tanggalValidAtauKosong } from "@/lib/validasi";

// Impor massal PO dari file CSV/XLSX (bagian 38) — alternatif dari isi manual
// satu-satu lewat FormTambahPo. Header kolom fleksibel (tidak case-sensitive,
// boleh pakai nama field kode, label Indonesia di UI, ATAU format tracker PO
// resmi perusahaan — "No PO, Project Name, Year, Total, DPP, Total Consume,
// Outstanding, Date of Issued, ...") supaya tidak kaku kalau pengguna
// menyalin dari tracker yang sudah ada.
//
// Catatan mapping tracker → field aplikasi (dikonfirmasi bareng pengguna):
//   - DPP           -> nilaiItem        (nilai sebelum PPN; fallback ke Total
//                                        kalau DPP kosong, mis. PO "Unutilized")
//   - Outstanding   -> saldoSebelumPpn  (sisa yang masih bisa dipakai sekarang,
//                                        BUKAN nilai awal — supaya PO yang
//                                        sudah terpakai sebagian/penuh tidak
//                                        dianggap masih penuh saat diimpor)
//   - Total Consume -> nilaiGr
//   - Date of Issued -> tanggalPo
const ALIAS_HEADER: Record<string, string> = {
  "nomor po": "nomorPo", "nomorpo": "nomorPo", "no po": "nomorPo", "po": "nomorPo",

  "nama proyek": "namaProyek", "namaproyek": "namaProyek", "proyek": "namaProyek", "nama": "namaProyek",
  "project name": "namaProyek", "projectname": "namaProyek",

  "tahun": "tahun", "tahun po": "tahun", "year": "tahun",

  "nilai item": "nilaiItem", "nilaiitem": "nilaiItem", "nilai": "nilaiItem", "nilai po": "nilaiItem",
  // Format tracker: DPP = nilai sebelum PPN -> pemetaan langsung ke nilaiItem.
  "dpp": "nilaiItem",
  // "Total" di tracker adalah nilai termasuk PPN sebelum ada pemakaian; hanya
  // dipakai sebagai fallback nilaiItem kalau DPP kosong (lihat gabungkanNilaiItem).
  "total": "totalTracker",

  "nilai gr": "nilaiGr", "nilaigr": "nilaiGr",
  "total consume": "nilaiGr", "totalconsume": "nilaiGr",

  "saldo sebelum ppn": "saldoSebelumPpn", "saldosebelumppn": "saldoSebelumPpn", "saldo": "saldoSebelumPpn",
  "outstanding": "saldoSebelumPpn",

  "tanggal po": "tanggalPo", "tanggalpo": "tanggalPo", "tanggal": "tanggalPo",
  "date of issued": "tanggalPo", "dateofissued": "tanggalPo",
};

export type BarisPoDiimpor = {
  nomorPo: string;
  namaProyek: string;
  tahun: number | null; // null = pakai default tahun berjalan
  nilaiItem: string;
  nilaiGr: string | null; // null = pakai default "0.00" (hanya dipakai untuk PO baru)
  saldoSebelumPpn: string | null; // null = default sama dengan nilaiItem (PO dianggap masih penuh)
  tanggalPo: string | null;
};

export type BarisPoGagal = { baris: number; alasan: string };

export type HasilParsePo = {
  valid: BarisPoDiimpor[];
  gagal: BarisPoGagal[];
};

function normalisasiHeader(h: string): string {
  const bersih = h.trim().toLowerCase();
  return ALIAS_HEADER[bersih] ?? h.trim();
}

// Beberapa file (mis. hasil export tracker Excel) punya baris kosong di atas
// sebelum baris header sungguhan. Cari baris non-kosong pertama dan anggap
// itu header, alih-alih selalu memakai baris pertama secara membabi buta.
function cariIndeksHeader(barisRaw: unknown[][]): number {
  for (let i = 0; i < barisRaw.length; i++) {
    const adaIsi = barisRaw[i].some((v) => v !== null && v !== undefined && String(v).trim() !== "");
    if (adaIsi) return i;
  }
  return -1;
}

// Excel kadang mengembalikan tanggal sebagai objek Date (kalau sel diformat
// tanggal) atau sebagai teks — tangani dua-duanya jadi "YYYY-MM-DD".
function normalisasiTanggal(nilai: unknown): string | null {
  if (nilai === null || nilai === undefined || nilai === "") return null;
  if (nilai instanceof Date) return nilai.toISOString().slice(0, 10);
  const teks = String(nilai).trim();
  if (!teks) return null;
  // Excel serial date number (kalau sel numerik tapi bukan Date object).
  if (/^\d+(\.\d+)?$/.test(teks) && Number(teks) > 20000 && Number(teks) < 80000) {
    const epoch = new Date(Date.UTC(1899, 11, 30));
    epoch.setUTCDate(epoch.getUTCDate() + Number(teks));
    return epoch.toISOString().slice(0, 10);
  }
  return teks;
}

function bersihkanAngka(nilai: unknown): string {
  return String(nilai ?? "").trim().replace(/[^0-9.]/g, "");
}

function validasiBaris(objek: Record<string, unknown>, nomorBaris: number): BarisPoDiimpor | BarisPoGagal {
  const nomorPo = String(objek.nomorPo ?? "").trim();
  const namaProyek = String(objek.namaProyek ?? "").trim();
  if (!nomorPo) return { baris: nomorBaris, alasan: "Nomor PO kosong." };
  if (!namaProyek) return { baris: nomorBaris, alasan: `${nomorPo}: Nama Proyek kosong.` };

  // nilaiItem: pakai DPP kalau ada isinya; kalau kosong (mis. PO "Unutilized"
  // di tracker yang belum punya DPP), fallback ke kolom Total.
  const nilaiItemAdaIsi = objek.nilaiItem !== undefined && objek.nilaiItem !== null && String(objek.nilaiItem).trim() !== "";
  const sumberNilaiItem = nilaiItemAdaIsi ? objek.nilaiItem : objek.totalTracker;
  const nilaiItemMentah = bersihkanAngka(sumberNilaiItem);
  if (!angkaDesimalValid(nilaiItemMentah)) {
    return { baris: nomorBaris, alasan: `${nomorPo}: Nilai Item tidak valid ("${sumberNilaiItem}").` };
  }

  let tahun: number | null = null;
  if (objek.tahun !== undefined && objek.tahun !== null && String(objek.tahun).trim() !== "") {
    const t = Number(String(objek.tahun).trim());
    if (!Number.isInteger(t) || t <= 0) {
      return { baris: nomorBaris, alasan: `${nomorPo}: Tahun tidak valid ("${objek.tahun}").` };
    }
    tahun = t;
  }

  let nilaiGr: string | null = null;
  if (objek.nilaiGr !== undefined && objek.nilaiGr !== null && String(objek.nilaiGr).trim() !== "") {
    const g = bersihkanAngka(objek.nilaiGr);
    if (!angkaDesimalValid(g)) {
      return { baris: nomorBaris, alasan: `${nomorPo}: Nilai GR tidak valid ("${objek.nilaiGr}").` };
    }
    nilaiGr = g;
  }

  // saldoSebelumPpn: pakai Outstanding kalau ada; kalau tidak ada kolomnya
  // sama sekali, biarkan null (pemanggil akan default-kan ke nilaiItem penuh).
  let saldoSebelumPpn: string | null = null;
  if (objek.saldoSebelumPpn !== undefined && objek.saldoSebelumPpn !== null && String(objek.saldoSebelumPpn).trim() !== "") {
    const s = bersihkanAngka(objek.saldoSebelumPpn);
    if (!angkaDesimalValid(s)) {
      return { baris: nomorBaris, alasan: `${nomorPo}: Saldo Sebelum PPN tidak valid ("${objek.saldoSebelumPpn}").` };
    }
    saldoSebelumPpn = s;
  }

  const tanggalPo = normalisasiTanggal(objek.tanggalPo);
  if (!tanggalValidAtauKosong(tanggalPo)) {
    return { baris: nomorBaris, alasan: `${nomorPo}: Tanggal PO tidak valid ("${objek.tanggalPo}").` };
  }

  return { nomorPo, namaProyek, tahun, nilaiItem: nilaiItemMentah, nilaiGr, saldoSebelumPpn, tanggalPo };
}

export function parseCsvPo(teks: string): HasilParsePo {
  const semuaBaris = parseCsv(teks);
  const indeksHeader = cariIndeksHeader(semuaBaris);
  if (indeksHeader === -1 || semuaBaris.length - indeksHeader < 2) {
    return { valid: [], gagal: [{ baris: 0, alasan: "File kosong atau tidak terbaca." }] };
  }
  const headerAsli = semuaBaris[indeksHeader];
  const headerDinormalisasi = headerAsli.map(normalisasiHeader);
  const baris = semuaBaris.slice(indeksHeader);
  const objekList = csvKeObjek([headerDinormalisasi, ...baris.slice(1)]);

  const valid: BarisPoDiimpor[] = [];
  const gagal: BarisPoGagal[] = [];
  objekList.forEach((objek, i) => {
    // Lewati baris yang benar-benar kosong.
    const semuaKosong = Object.values(objek).every((v) => v === null || v === undefined || String(v).trim() === "");
    if (semuaKosong) return;
    // Nomor baris asli di file (1-based), memperhitungkan baris header yang digeser.
    const nomorBarisAsli = indeksHeader + i + 2;
    const hasil = validasiBaris(objek, nomorBarisAsli);
    if ("alasan" in hasil) gagal.push(hasil); else valid.push(hasil);
  });
  return { valid, gagal };
}

export async function parseXlsxPo(buffer: Buffer): Promise<HasilParsePo> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as unknown as ArrayBuffer);
  const sheet = workbook.worksheets[0];
  if (!sheet) return { valid: [], gagal: [{ baris: 0, alasan: "File Excel tidak punya sheet." }] };

  const barisRaw: unknown[][] = [];
  sheet.eachRow((row) => {
    const nilai: unknown[] = [];
    row.eachCell({ includeEmpty: true }, (cell) => { nilai.push(cell.value); });
    barisRaw.push(nilai);
  });

  const indeksHeader = cariIndeksHeader(barisRaw);
  if (indeksHeader === -1 || barisRaw.length - indeksHeader < 2) {
    return { valid: [], gagal: [{ baris: 0, alasan: "File kosong atau tidak terbaca." }] };
  }

  const header = barisRaw[indeksHeader].map((h) => normalisasiHeader(String(h ?? "")));
  const valid: BarisPoDiimpor[] = [];
  const gagal: BarisPoGagal[] = [];
  barisRaw.slice(indeksHeader + 1).forEach((barisNilai, i) => {
    // Lewati baris yang benar-benar kosong (sering muncul di akhir sheet Excel).
    if (barisNilai.every((v) => v === null || v === undefined || String(v).trim() === "")) return;
    const objek: Record<string, unknown> = {};
    header.forEach((h, idx) => { objek[h] = barisNilai[idx]; });
    const nomorBarisAsli = indeksHeader + i + 2;
    const hasil = validasiBaris(objek, nomorBarisAsli);
    if ("alasan" in hasil) gagal.push(hasil); else valid.push(hasil);
  });
  return { valid, gagal };
}
